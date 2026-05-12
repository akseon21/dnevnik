"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceClient, hasServiceRole } from "@/lib/supabase";

const AUTH_COOKIE = "admin_auth";

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions для админки.
// Авторизация: пароль из process.env.ADMIN_PASSWORD, хранится в httpOnly-cookie.
// Мутации: через service-role клиент Supabase (обходит RLS). Если ключи не заданы
// — мутации возвращают понятную ошибку (UI это отражает).
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
    available_cash: number;
    sort_order: number;
  }[];
  tickers: { symbol: string; price: number; change_24h: number }[];
  openPositions: {
    id: string;
    participant_id: string;
    side: string;
    instrument: string;
    lot: number;
    unrealized_pnl: number;
  }[];
  watchlist: {
    id: string;
    instrument: string;
    note: string;
    participant_names: string[];
  }[];
};

export async function getAdminData(): Promise<AdminData | null> {
  if (!(await isAuthed())) return null;
  if (!hasServiceRole()) return null;
  const db = getServiceClient();
  const [metaRes, pRes, tRes, posRes, wRes] = await Promise.all([
    db
      .from("competition_meta")
      .select("id, title, start_date, end_date, note")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("participants")
      .select("id, name, color, available_cash, sort_order")
      .order("sort_order", { ascending: true }),
    db.from("tickers").select("symbol, price, change_24h").order("symbol"),
    db
      .from("positions")
      .select("id, participant_id, side, instrument, lot, unrealized_pnl")
      .eq("status", "open")
      .order("opened_at", { ascending: false }),
    db
      .from("watchlist")
      .select("id, instrument, note, participant_names")
      .order("created_at", { ascending: true }),
  ]);
  return {
    meta: (metaRes.data as AdminData["meta"]) ?? null,
    participants: (pRes.data as AdminData["participants"]) ?? [],
    tickers: (tRes.data as AdminData["tickers"]) ?? [],
    openPositions: (posRes.data as AdminData["openPositions"]) ?? [],
    watchlist: wRes.error ? [] : ((wRes.data as AdminData["watchlist"]) ?? []),
  };
}

const numField = (fd: FormData, key: string): number => Number(fd.get(key) ?? 0) || 0;
const strField = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

/** Нормализует "2026-05-13T10:00" из <input type="datetime-local"> в ISO. */
function toIso(v: string): string {
  if (!v) return new Date().toISOString();
  // datetime-local не несёт зону — трактуем как UTC для предсказуемости.
  const d = new Date(v.length === 16 ? v + ":00Z" : v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── balance_points ───────────────────────────────────────────────────────────
export async function addBalancePoint(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const participant_id = strField(formData, "participant_id");
    const ts = toIso(strField(formData, "ts"));
    const value = numField(formData, "value");
    if (!participant_id) return { ok: false, error: "Не выбран участник" };
    const { error } = await db
      .from("balance_points")
      .upsert({ participant_id, ts, value }, { onConflict: "participant_id,ts" });
    return error ? { ok: false, error: error.message } : ok("Точка баланса добавлена");
  });
}

// ── positions ────────────────────────────────────────────────────────────────
export async function addPosition(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const participant_id = strField(formData, "participant_id");
    const side = strField(formData, "side") as "LONG" | "SHORT";
    const instrument = strField(formData, "instrument");
    const lot = numField(formData, "lot");
    const exit_plan = strField(formData, "exit_plan");
    const unrealized_pnl = numField(formData, "unrealized_pnl");
    const status = strField(formData, "status") as "open" | "closed";
    if (!participant_id || !instrument)
      return { ok: false, error: "Участник и инструмент обязательны" };
    const { error } = await db.from("positions").insert({
      participant_id,
      side,
      instrument,
      lot,
      exit_plan,
      unrealized_pnl,
      status,
      closed_at: status === "closed" ? new Date().toISOString() : null,
    });
    return error ? { ok: false, error: error.message } : ok("Позиция добавлена");
  });
}

export async function closePosition(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    const pnl = formData.get("unrealized_pnl");
    if (!id) return { ok: false, error: "Нет id позиции" };
    const patch: Record<string, unknown> = {
      status: "closed",
      closed_at: new Date().toISOString(),
    };
    if (pnl != null && pnl !== "") patch.unrealized_pnl = Number(pnl) || 0;
    const { error } = await db.from("positions").update(patch).eq("id", id);
    return error ? { ok: false, error: error.message } : ok("Позиция закрыта");
  });
}

// ── participants ─────────────────────────────────────────────────────────────
export async function upsertParticipant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    const name = strField(formData, "name");
    const color = strField(formData, "color") || "#22d3ee";
    const available_cash = numField(formData, "available_cash");
    const sort_order = numField(formData, "sort_order");
    if (!name) return { ok: false, error: "Имя обязательно" };
    const row = { name, color, available_cash, sort_order };
    const { error } = id
      ? await db.from("participants").update(row).eq("id", id)
      : await db.from("participants").insert(row);
    return error
      ? { ok: false, error: error.message }
      : ok(id ? "Участник обновлён" : "Участник добавлен");
  });
}

// ── tickers ──────────────────────────────────────────────────────────────────
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

// ── competition_meta ─────────────────────────────────────────────────────────
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

// ── watchlist ────────────────────────────────────────────────────────────────
export async function addWatchlistItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const instrument = strField(formData, "instrument").toUpperCase();
    const note = strField(formData, "note");
    const participant_names = strField(formData, "participant_names")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!instrument) return { ok: false, error: "Инструмент обязателен" };
    const { error } = await db
      .from("watchlist")
      .insert({ instrument, note, participant_names });
    return error ? { ok: false, error: error.message } : ok(`${instrument} добавлен в список наблюдения`);
  });
}

export async function deleteWatchlistItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id записи" };
    const { error } = await db.from("watchlist").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : ok("Запись удалена из списка наблюдения");
  });
}
