import { fromTwelveData, toTwelveData } from "@/lib/pnl";

// ─────────────────────────────────────────────────────────────────────────────
// /api/prices?symbols=XAUUSD,EURUSD,...
//
// Возвращает текущие рыночные цены инструментов из TwelveData (free tier).
// Используется на клиенте для live-расчёта нереализованного PnL открытых
// позиций (см. app/components/LivePnLProvider.tsx + lib/pnl.ts).
//
// Контракт ответа:
//   { prices: { "XAUUSD": 4637.5, "EURUSD": 1.0915 },
//     fetchedAt: "2026-05-13T10:42:00Z",
//     source: "twelvedata" | "cache" | "static",
//     stale: boolean,    // true если ответили из кеша при ошибке апстрима
//     error?: string     // подробности ошибки (если stale=true)
//   }
//
// Кеш: in-memory Map ~30 сек. При ошибке/rate-limit — отдаём последний удачный
// кеш (даже если он старше 30 сек) с флагом stale: true.
//
// Лимиты TwelveData free: 8 req/min, 800 req/day. При polling раз в 2 минуты
// батчем по 6-8 парам = 1 req / 2 min = 720 req/day → проходит. Frontend
// настраивает интервал через NEXT_PUBLIC_PRICES_REFRESH_MS (см. README).
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic"; // не кешировать на уровне Next route

const FETCH_TIMEOUT_MS = 6000;
const FRESH_CACHE_MS = 30_000; // 30 сек — внутри окна ответ из кеша моментально

type CacheEntry = {
  prices: Record<string, number>;
  fetchedAt: number; // ms epoch
  symbolsKey: string; // отсортированный набор символов — кешируем по ключу запроса
};

// In-memory кеш. Жив пока жив serverless-инстанс (на Vercel — до нескольких минут
// между холодными стартами; этого более чем достаточно).
const cache = new Map<string, CacheEntry>();

function normalizeSymbols(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const s = part.trim().toUpperCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

type TdSingle = { symbol?: string; price?: string | number; code?: number; message?: string };
type TdResponse =
  | TdSingle
  | Record<string, TdSingle>
  | { code?: number; message?: string; status?: string };

/** Тянем все цены одним батч-запросом TwelveData. */
async function fetchFromTwelveData(
  symbols: string[],
  apiKey: string,
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const tdSymbols = symbols.map(toTwelveData).join(",");
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
    tdSymbols,
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`twelvedata http ${res.status}`);
  }
  const data = (await res.json()) as TdResponse;

  // TwelveData при ошибке (например лимит) отдаёт {code:..., message:..., status:"error"}
  const top = data as { code?: number; message?: string; status?: string };
  if (top.status === "error" || (typeof top.code === "number" && top.code >= 400)) {
    throw new Error(`twelvedata error: ${top.message ?? "unknown"}`);
  }

  const out: Record<string, number> = {};

  // Случай 1: один символ → объект {price: "..."}
  if ("price" in (data as TdSingle)) {
    const single = data as TdSingle;
    const p = parsePrice(single.price);
    if (p != null && symbols.length === 1) out[symbols[0]] = p;
    return out;
  }

  // Случай 2: несколько символов → {"XAU/USD": {price:...}, "EUR/USD": {price:...}}
  for (const [tdKey, val] of Object.entries(data as Record<string, TdSingle>)) {
    const ourSym = fromTwelveData(tdKey);
    if (!val || typeof val !== "object") continue;
    if ((val as { code?: number }).code != null && (val as { code?: number }).code !== 200) continue;
    const p = parsePrice(val.price);
    if (p != null) out[ourSym] = p;
  }
  return out;
}

function parsePrice(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbols = normalizeSymbols(url.searchParams.get("symbols"));

  if (symbols.length === 0) {
    return Response.json({
      prices: {},
      fetchedAt: new Date().toISOString(),
      source: "static" as const,
      stale: false,
    });
  }

  const apiKey = process.env.TWELVEDATA_API_KEY?.trim();
  const symbolsKey = [...symbols].sort().join(",");
  const now = Date.now();
  const cached = cache.get(symbolsKey);
  const cacheFresh = cached && now - cached.fetchedAt < FRESH_CACHE_MS;

  // 1) Свежий кеш — отдаём моментально, не дёргаем апстрим
  if (cached && cacheFresh) {
    return Response.json({
      prices: cached.prices,
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
      source: "cache" as const,
      stale: false,
    });
  }

  // 2) Нет ключа TwelveData — отдаём пустые цены (live-режим выключен)
  if (!apiKey) {
    return Response.json({
      prices: {},
      fetchedAt: new Date().toISOString(),
      source: "static" as const,
      stale: false,
      error: "TWELVEDATA_API_KEY is not set",
    });
  }

  // 3) Идём в TwelveData; на ошибку — деградируем на старый кеш если он есть
  try {
    const prices = await fetchFromTwelveData(symbols, apiKey);
    cache.set(symbolsKey, { prices, fetchedAt: now, symbolsKey });
    return Response.json({
      prices,
      fetchedAt: new Date(now).toISOString(),
      source: "twelvedata" as const,
      stale: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (cached) {
      return Response.json({
        prices: cached.prices,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        source: "cache" as const,
        stale: true,
        error: message,
      });
    }
    return Response.json(
      {
        prices: {},
        fetchedAt: new Date().toISOString(),
        source: "static" as const,
        stale: true,
        error: message,
      },
      { status: 200 }, // не валим запрос: клиент сам покажет «нет данных»
    );
  }
}
