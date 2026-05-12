"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceClient, hasServiceRole } from "@/lib/supabase";

const AUTH_COOKIE = "admin_auth";

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions для админки (v6 — trade-centric).
// Авторизация: пароль из process.env.ADMIN_PASSWORD в httpOnly-cookie.
// Мутации: через service-role клиент Supabase (обходит RLS). guarded() проверяет
// авторизацию + наличие service-role ключа, на успехе делает revalidatePath("/").
//
// Сделко-центричный поток:
//   • upsertParticipant — имя / цвет / starting_deposit / порядок
//   • openTrade   — INSERT position status='open', unrealized_pnl=0, margin задаётся
//   • updateTradePnl — UPDATE unrealized_pnl открытой позиции
//   • closeTrade  — UPDATE status='closed', realized_pnl, closed_at
//   • upsertTicker / upsertMeta — как раньше
// Точки баланса руками больше НЕ вводятся — timeline выводится из закрытых сделок.
// ─────────────────────────────────────────────────────────────────────────────

export async function isAuthed(): Promise<boolean> {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) return false;
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value === pwd;
}

export async function login(formData: FormData): Promise<void> {
  const pwd = process.env.ADMIN_PASSWORD;
  const submitted = String(formData.get("password") ?? "");
  if (!pwd) redirect("/admin?error=unconfigured");
  if (submitted !== pwd) redirect("/admin?error=bad");
  const store = await cookies();
  store.set(AUTH_COOKIE, pwd, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  redirect("/admin");
}

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function guarded(
  fn: (db: ReturnType<typeof getServiceClient>) => Promise<ActionResult>,
): Promise<ActionResult> {
  if (!(await isAuthed())) return { ok: false, error: "Не авторизовано" };
  if (!hasServiceRole())
    return {
      ok: false,
      error: "БД не подключена — задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    };
  try {
    const result = await fn(getServiceClient());
    if (result.ok) revalidatePath("/");
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const ok = (message: string): ActionResult => ({ ok: true, message });

// ── чтение для форм админки (с реальными id) ─────────────────────────────────
export type AdminData = {
  meta: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    note: string;
  } | null;
  participants: {
    id: string;
    name: string;
    color: string;
    starting_deposit: number;
    sort_order: number;
  }[];
  tickers: { symbol: string; price: number; change_24h: number }[];
  openPositions: {
    id: string;
    participant_id: string;
    side: string;
    instrument: string;
    lot: number;
    margin: number;
    unrealized_pnl: number;
  }[];
};

export async function getAdminData(): Promise<AdminData | null> {
  if (!(await isAuthed())) return null;
  if (!hasServiceRole()) return null;
  const db = getServiceClient();
  const [metaRes, pRes, tRes, posRes] = await Promise.all([
    db
      .from("competition_meta")
      .select("id, title, start_date, end_date, note")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("participants")
      .select("id, name, color, starting_deposit, sort_order")
      .order("sort_order", { ascending: true }),
    db.from("tickers").select("symbol, price, change_24h").order("symbol"),
    db
      .from("positions")
      .select("id, participant_id, side, instrument, lot, margin, unrealized_pnl")
      .eq("status", "open")
      .order("opened_at", { ascending: false }),
  ]);
  return {
    meta: (metaRes.data as AdminData["meta"]) ?? null,
    participants: (pRes.data as AdminData["participants"]) ?? [],
    tickers: (tRes.data as AdminData["tickers"]) ?? [],
    openPositions: (posRes.data as AdminData["openPositions"]) ?? [],
  };
}

const numField = (fd: FormData, key: string): number => Number(fd.get(key) ?? 0) || 0;
const strField = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

/** Нормализует "2026-05-13T10:00" из <input type="datetime-local"> в ISO. Пусто → now. */
function toIso(v: string): string {
  if (!v) return new Date().toISOString();
  // datetime-local не несёт зону — трактуем как UTC для предсказуемости.
  const d = new Date(v.length === 16 ? v + ":00Z" : v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── открыть сделку ───────────────────────────────────────────────────────────
export async function openTrade(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const participant_id = strField(formData, "participant_id");
    const side = (strField(formData, "side") || "LONG") as "LONG" | "SHORT";
    const instrument = strField(formData, "instrument").toUpperCase();
    const lot = numField(formData, "lot");
    const margin = numField(formData, "margin");
    const exit_plan = strField(formData, "exit_plan");
    const opened_at = toIso(strField(formData, "opened_at"));
    if (!participant_id || !instrument)
      return { ok: false, error: "Участник и инструмент обязательны" };
    const { error } = await db.from("positions").insert({
      participant_id,
      side,
      instrument,
      lot,
      margin,
      exit_plan,
      unrealized_pnl: 0,
      realized_pnl: null,
      status: "open",
      opened_at,
      closed_at: null,
    });
    return error ? { ok: false, error: error.message } : ok(`Сделка открыта: ${side} ${instrument}`);
  });
}

// ── обновить плавающий PnL открытой сделки ───────────────────────────────────
export async function updateTradePnl(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id позиции" };
    const unrealized_pnl = numField(formData, "unrealized_pnl");
    const { error } = await db
      .from("positions")
      .update({ unrealized_pnl })
      .eq("id", id)
      .eq("status", "open");
    return error ? { ok: false, error: error.message } : ok("Плавающий PnL обновлён");
  });
}

// ── закрыть сделку ───────────────────────────────────────────────────────────
export async function closeTrade(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id позиции" };
    const realized_pnl = numField(formData, "realized_pnl");
    const closed_at = toIso(strField(formData, "closed_at"));
    const { error } = await db
      .from("positions")
      .update({ status: "closed", realized_pnl, closed_at, unrealized_pnl: 0 })
      .eq("id", id);
    return error ? { ok: false, error: error.message } : ok("Сделка закрыта");
  });
}

// ── участники ────────────────────────────────────────────────────────────────
export async function upsertParticipant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    const name = strField(formData, "name");
    const color = strField(formData, "color") || "#22d3ee";
    const starting_deposit = numField(formData, "starting_deposit");
    const sort_order = numField(formData, "sort_order");
    if (!name) return { ok: false, error: "Имя обязательно" };
    const row = { name, color, starting_deposit, sort_order };
    const { error } = id
      ? await db.from("participants").update(row).eq("id", id)
      : await db.from("participants").insert(row);
    return error
      ? { ok: false, error: error.message }
      : ok(id ? "Участник обновлён" : "Участник добавлен");
  });
}

// ── тикеры ───────────────────────────────────────────────────────────────────
export async function upsertTicker(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const symbol = strField(formData, "symbol").toUpperCase();
    const price = numField(formData, "price");
    const change_24h = numField(formData, "change_24h");
    if (!symbol) return { ok: false, error: "Символ обязателен" };
    const { error } = await db
      .from("tickers")
      .upsert(
        { symbol, price, change_24h, updated_at: new Date().toISOString() },
        { onConflict: "symbol" },
      );
    return error ? { ok: false, error: error.message } : ok(`Тикер ${symbol} обновлён`);
  });
}

// ── метаданные соревнования ──────────────────────────────────────────────────
export async function upsertMeta(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    const title = strField(formData, "title");
    const start_date = strField(formData, "start_date");
    const end_date = strField(formData, "end_date");
    const note = strField(formData, "note");
    if (!title || !start_date || !end_date)
      return { ok: false, error: "Название и даты обязательны" };
    const row = { title, start_date, end_date, note, updated_at: new Date().toISOString() };
    const { error } = id
      ? await db.from("competition_meta").update(row).eq("id", id)
      : await db.from("competition_meta").insert(row);
    return error ? { ok: false, error: error.message } : ok("Параметры соревнования сохранены");
  });
}
