"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceClient, hasServiceRole } from "@/lib/supabase";

const AUTH_COOKIE = "admin_auth";

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions для админки (v7 — полное редактирование участников и сделок).
// Авторизация: пароль из process.env.ADMIN_PASSWORD в httpOnly-cookie.
// Мутации: через service-role клиент Supabase (обходит RLS). guarded() проверяет
// авторизацию + наличие service-role ключа, на успехе делает revalidatePath("/").
//
// Сделко-центричная модель:
//   • участники: имя / цвет / avatar_url / starting_deposit / sort_order — upsert + delete
//     (positions имеют ON DELETE CASCADE из 0001 → удаление участника каскадно сносит сделки;
//      на всякий случай server action и сам удаляет сделки перед участником — миграция не нужна)
//   • openTrade  — INSERT position status='open', unrealized_pnl=0, margin задаётся
//   • updateTrade — UPDATE параметров любой сделки (открытой или закрытой)
//   • updateTradePnl — UPDATE unrealized_pnl открытой позиции (быстрая правка плавающего PnL)
//   • closeTrade — UPDATE status='closed', realized_pnl, closed_at
//   • deleteTrade — DELETE позиции
//   • upsertTicker / upsertMeta — как раньше
// Точки баланса руками не вводятся — timeline выводится из закрытых сделок.
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

// ── чтение для форм админки (с реальными id + вычисленные величины) ───────────
export type AdminPositionRow = {
  id: string;
  participant_id: string;
  side: "LONG" | "SHORT";
  instrument: string;
  lot: number;
  margin: number;
  exit_plan: string;
  unrealized_pnl: number;
  realized_pnl: number | null;
  status: "open" | "closed";
  opened_at: string | null;
  closed_at: string | null;
  // v9.1 — цена входа: если задана, нереализ. PnL пересчитывается live из текущей
  // рыночной цены TwelveData. Если null — fallback на ручной unrealized_pnl ниже.
  entry_price: number | null;
};

export type AdminParticipantRow = {
  id: string;
  name: string;
  color: string;
  avatar_url: string | null;
  starting_deposit: number;
  sort_order: number;
  // вычисленные из сделок (для отображения эффекта в админке)
  balance: number;
  equity: number;
  available_cash: number;
  change_pct: number;
  open_count: number;
  closed_count: number;
};

export type AdminData = {
  meta: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    note: string;
  } | null;
  participants: AdminParticipantRow[];
  tickers: { symbol: string; price: number; change_24h: number }[];
  positions: AdminPositionRow[]; // все сделки (открытые + закрытые)
  lastUpdated: string | null; // ISO — самое позднее updated_at среди meta/tickers
};

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function nOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function getAdminData(): Promise<AdminData | null> {
  if (!(await isAuthed())) return null;
  if (!hasServiceRole()) return null;
  const db = getServiceClient();
  const [metaRes, pRes, tRes, posRes] = await Promise.all([
    db
      .from("competition_meta")
      .select("id, title, start_date, end_date, note, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("participants")
      .select("id, name, color, avatar_url, starting_deposit, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    db
      .from("tickers")
      .select("symbol, price, change_24h, updated_at")
      .order("symbol"),
    db
      .from("positions")
      .select(
        "id, participant_id, side, instrument, lot, margin, exit_plan, unrealized_pnl, realized_pnl, status, opened_at, closed_at",
      )
      .order("opened_at", { ascending: false }),
  ]);

  type RawMeta = {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    note: string | null;
    updated_at: string | null;
  } | null;
  type RawTicker = {
    symbol: string;
    price: unknown;
    change_24h: unknown;
    updated_at: string | null;
  };
  type RawParticipant = {
    id: string;
    name: string;
    color: string;
    avatar_url: string | null;
    starting_deposit: unknown;
    sort_order: unknown;
  };
  type RawPosition = {
    id: string;
    participant_id: string;
    side: "LONG" | "SHORT";
    instrument: string;
    lot: unknown;
    margin: unknown;
    exit_plan: string | null;
    unrealized_pnl: unknown;
    realized_pnl: unknown;
    status: "open" | "closed";
    opened_at: string | null;
    closed_at: string | null;
  };

  const rawMeta = (metaRes.data as RawMeta) ?? null;
  const rawTickers = ((tRes.data ?? []) as RawTicker[]) ?? [];
  const rawParticipants = ((pRes.data ?? []) as RawParticipant[]) ?? [];
  const rawPositions = ((posRes.data ?? []) as RawPosition[]) ?? [];

  // v9.1 — entry_price тянем отдельным best-effort запросом: если колонки ещё
  // нет в БД (миграция 0004 не прогнана) — пропускаем без шума, форма просто
  // покажет пустое поле, а сохранение не запишет колонку (отдельная защита в
  // openTrade/updateTrade — try/catch при INSERT/UPDATE).
  const entryByPosId = new Map<string, number | null>();
  try {
    const epRes = await db.from("positions").select("id, entry_price");
    if (!epRes.error && Array.isArray(epRes.data)) {
      for (const r of epRes.data as { id: string; entry_price: unknown }[]) {
        entryByPosId.set(r.id, nOrNull(r.entry_price));
      }
    }
  } catch {
    // колонки ещё нет — пропускаем
  }

  const positions: AdminPositionRow[] = rawPositions.map((q) => ({
    id: q.id,
    participant_id: q.participant_id,
    side: q.side,
    instrument: q.instrument,
    lot: n(q.lot),
    margin: n(q.margin),
    exit_plan: q.exit_plan ?? "",
    unrealized_pnl: n(q.unrealized_pnl),
    realized_pnl: nOrNull(q.realized_pnl),
    status: q.status,
    opened_at: q.opened_at,
    closed_at: q.closed_at,
    entry_price: entryByPosId.has(q.id) ? entryByPosId.get(q.id) ?? null : null,
  }));

  const participants: AdminParticipantRow[] = rawParticipants.map((p) => {
    const own = positions.filter((q) => q.participant_id === p.id);
    const closed = own.filter((q) => q.status === "closed");
    const open = own.filter((q) => q.status === "open");
    const startDeposit = n(p.starting_deposit);
    const realizedSum = closed.reduce((s, q) => s + (q.realized_pnl ?? 0), 0);
    const unrealizedSum = open.reduce((s, q) => s + q.unrealized_pnl, 0);
    const marginSum = open.reduce((s, q) => s + q.margin, 0);
    const balance = startDeposit + realizedSum;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      avatar_url: p.avatar_url,
      starting_deposit: startDeposit,
      sort_order: n(p.sort_order),
      balance,
      equity: balance + unrealizedSum,
      available_cash: balance - marginSum,
      change_pct: startDeposit > 0 ? ((balance - startDeposit) / startDeposit) * 100 : 0,
      open_count: open.length,
      closed_count: closed.length,
    };
  });

  const tickers = rawTickers.map((t) => ({
    symbol: t.symbol,
    price: n(t.price),
    change_24h: n(t.change_24h),
  }));

  const updatedTimes = [
    rawMeta?.updated_at,
    ...rawTickers.map((t) => t.updated_at),
  ].filter((x): x is string => Boolean(x));
  const lastUpdated =
    updatedTimes.length > 0
      ? updatedTimes.reduce((a, b) => (a > b ? a : b))
      : null;

  return {
    meta: rawMeta
      ? {
          id: rawMeta.id,
          title: rawMeta.title,
          start_date: rawMeta.start_date,
          end_date: rawMeta.end_date,
          note: rawMeta.note ?? "",
        }
      : null,
    participants,
    tickers,
    positions,
    lastUpdated,
  };
}

const numField = (fd: FormData, key: string): number => Number(fd.get(key) ?? 0) || 0;
const strField = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();
const numFieldOrNull = (fd: FormData, key: string): number | null => {
  const raw = fd.get(key);
  if (raw == null || String(raw).trim() === "") return null;
  const x = Number(raw);
  return Number.isFinite(x) ? x : null;
};

/** Нормализует "2026-05-13T10:00" из <input type="datetime-local"> в ISO. Пусто → null. */
function toIsoOrNull(v: string): string | null {
  if (!v) return null;
  const d = new Date(v.length === 16 ? v + ":00Z" : v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Как toIsoOrNull, но пусто → now. */
function toIso(v: string): string {
  return toIsoOrNull(v) ?? new Date().toISOString();
}

/** Распознаём postgres-ошибку «такой колонки в таблице нет» (entry_price без миграции 0004). */
function isMissingEntryPriceError(msg: string | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes("entry_price") && (m.includes("does not exist") || m.includes("column"));
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
    const entry_price = numFieldOrNull(formData, "entry_price");
    if (!participant_id || !instrument)
      return { ok: false, error: "Участник и инструмент обязательны" };
    const base = {
      participant_id,
      side,
      instrument,
      lot,
      margin,
      exit_plan,
      unrealized_pnl: 0,
      realized_pnl: null,
      status: "open" as const,
      opened_at,
      closed_at: null,
    };
    let { error } = await db.from("positions").insert({ ...base, entry_price });
    // graceful: если миграция 0004 ещё не прогнана — пишем без entry_price
    if (error && isMissingEntryPriceError(error.message)) {
      ({ error } = await db.from("positions").insert(base));
    }
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

// ── редактировать параметры любой сделки (открытой или закрытой) ──────────────
export async function updateTrade(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id позиции" };
    const status = (strField(formData, "status") || "open") as "open" | "closed";
    const side = (strField(formData, "side") || "LONG") as "LONG" | "SHORT";
    const instrument = strField(formData, "instrument").toUpperCase();
    const lot = numField(formData, "lot");
    const margin = numField(formData, "margin");
    const exit_plan = strField(formData, "exit_plan");
    const opened_at = toIso(strField(formData, "opened_at"));
    const entry_price = numFieldOrNull(formData, "entry_price");
    if (!instrument) return { ok: false, error: "Инструмент обязателен" };

    const base = { side, instrument, lot, margin, exit_plan, opened_at };

    /** UPDATE с entry_price; при отсутствии колонки (0004 не прогнана) — повтор без неё. */
    async function updateRow(extra: Record<string, unknown>): Promise<{ error: { message: string } | null }> {
      let res = await db
        .from("positions")
        .update({ ...base, ...extra, entry_price })
        .eq("id", id);
      if (res.error && isMissingEntryPriceError(res.error.message)) {
        res = await db.from("positions").update({ ...base, ...extra }).eq("id", id);
      }
      return { error: res.error ? { message: res.error.message } : null };
    }

    if (status === "closed") {
      const realized_pnl = numFieldOrNull(formData, "realized_pnl");
      if (realized_pnl == null)
        return { ok: false, error: "Для закрытой сделки укажите итоговый результат" };
      const closed_at = toIso(strField(formData, "closed_at"));
      const { error } = await updateRow({
        status: "closed",
        realized_pnl,
        closed_at,
        unrealized_pnl: 0,
      });
      return error ? { ok: false, error: error.message } : ok("Сделка обновлена");
    }

    // open: позволяем поправить и плавающий PnL
    const unrealized_pnl = numField(formData, "unrealized_pnl");
    const { error } = await updateRow({
      status: "open",
      unrealized_pnl,
      realized_pnl: null,
      closed_at: null,
    });
    return error ? { ok: false, error: error.message } : ok("Сделка обновлена");
  });
}

// ── удалить сделку ───────────────────────────────────────────────────────────
export async function deleteTrade(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id позиции" };
    const { error } = await db.from("positions").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : ok("Сделка удалена");
  });
}

// ── участники: добавить / редактировать ──────────────────────────────────────
export async function upsertParticipant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    const name = strField(formData, "name");
    const color = strField(formData, "color") || "#22d3ee";
    const avatarRaw = strField(formData, "avatar_url");
    const avatar_url = avatarRaw === "" ? null : avatarRaw;
    const starting_deposit = numField(formData, "starting_deposit");
    const sort_order = numField(formData, "sort_order");
    if (!name) return { ok: false, error: "Имя обязательно" };
    const row = { name, color, avatar_url, starting_deposit, sort_order };
    const { error } = id
      ? await db.from("participants").update(row).eq("id", id)
      : await db.from("participants").insert(row);
    return error
      ? { ok: false, error: error.message }
      : ok(id ? "Участник обновлён" : "Участник добавлен");
  });
}

// ── удалить участника (вместе с его сделками) ────────────────────────────────
export async function deleteParticipant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async (db) => {
    const id = strField(formData, "id");
    if (!id) return { ok: false, error: "Нет id участника" };
    // positions имеют ON DELETE CASCADE (миграция 0001), но удалим явно — на случай
    // если каскад на этой БД не настроен. balance_points тоже каскадятся.
    const posDel = await db.from("positions").delete().eq("participant_id", id);
    if (posDel.error) return { ok: false, error: posDel.error.message };
    await db.from("balance_points").delete().eq("participant_id", id);
    const { error } = await db.from("participants").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : ok("Участник удалён");
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
