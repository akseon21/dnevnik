import { getCompetitionData } from "@/lib/db";
import type { Ticker } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// /api/tickers — live-цены инструментов (best-effort, без API-ключа).
//
// Источники:
//   • BTCUSD            → CoinGecko (simple/price, +24h change)            — надёжно
//   • EURUSD/GBPUSD/USDJPY → Frankfurter (reference rates от ЕЦБ, раз в день) — надёжно
//   • XAUUSD/XAGUSD     → goldprice.org (без ключа)                         — нестабильно
//
// Любой недоступный источник игнорируется → для его тикеров берётся значение из
// БД (через getCompetitionData()). Если все источники легли — отдаём ровно
// БД-значения, ничего не падает. Ответ кешируется на 5 минут (revalidate).
// Клиент опрашивает этот route каждые 60 сек и обновляет верхнюю строку.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 300;

type LiveTicker = Ticker & { live: boolean };

const FETCH_TIMEOUT_MS = 4000;

async function fetchJson(
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", ...extraHeaders },
      // апстримы кешируются на 5 мин — синхронно с route segment revalidate.
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

// goldprice.org возвращает Forbidden без браузероподобных заголовков.
const BROWSERLIKE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://goldprice.org/",
  Origin: "https://goldprice.org",
};

function asNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** BTCUSD из CoinGecko. */
async function fetchCrypto(): Promise<Record<string, Partial<LiveTicker>>> {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
  );
  const out: Record<string, Partial<LiveTicker>> = {};
  if (data && typeof data === "object") {
    const btc = (data as Record<string, unknown>)["bitcoin"];
    if (btc && typeof btc === "object") {
      const price = asNum((btc as Record<string, unknown>)["usd"]);
      const ch = asNum((btc as Record<string, unknown>)["usd_24h_change"]);
      if (price != null) out["BTCUSD"] = { price, change24h: ch ?? 0, live: true };
    }
  }
  return out;
}

/** EURUSD / GBPUSD / USDJPY из Frankfurter (USD-база). */
async function fetchFx(): Promise<Record<string, Partial<LiveTicker>>> {
  const data = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY");
  const out: Record<string, Partial<LiveTicker>> = {};
  if (data && typeof data === "object") {
    const rates = (data as Record<string, unknown>)["rates"];
    if (rates && typeof rates === "object") {
      const r = rates as Record<string, unknown>;
      const eur = asNum(r["EUR"]); // USD→EUR; EURUSD = 1/eur
      const gbp = asNum(r["GBP"]); // USD→GBP; GBPUSD = 1/gbp
      const jpy = asNum(r["JPY"]); // USD→JPY = USDJPY напрямую
      if (eur && eur > 0) out["EURUSD"] = { price: round(1 / eur, 4), change24h: 0, live: true };
      if (gbp && gbp > 0) out["GBPUSD"] = { price: round(1 / gbp, 4), change24h: 0, live: true };
      if (jpy && jpy > 0) out["USDJPY"] = { price: round(jpy, 3), change24h: 0, live: true };
    }
  }
  return out;
}

/** XAUUSD / XAGUSD из goldprice.org (без ключа; может быть недоступно). */
async function fetchMetals(): Promise<Record<string, Partial<LiveTicker>>> {
  const data = await fetchJson(
    "https://data-asg.goldprice.org/dbXRates/USD",
    BROWSERLIKE_HEADERS,
  );
  const out: Record<string, Partial<LiveTicker>> = {};
  if (data && typeof data === "object") {
    const items = (data as Record<string, unknown>)["items"];
    if (Array.isArray(items) && items[0] && typeof items[0] === "object") {
      const it = items[0] as Record<string, unknown>;
      const gold = asNum(it["xauPrice"]);
      const silver = asNum(it["xagPrice"]);
      const goldCh = asNum(it["pcXau"]);
      const silverCh = asNum(it["pcXag"]);
      if (gold != null) out["XAUUSD"] = { price: round(gold, 2), change24h: goldCh ?? 0, live: true };
      if (silver != null) out["XAGUSD"] = { price: round(silver, 3), change24h: silverCh ?? 0, live: true };
    }
  }
  return out;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export async function GET() {
  // База — значения из БД (или статика). Это всегда есть.
  const competition = await getCompetitionData().catch(() => null);
  const dbTickers: Ticker[] = competition?.tickers ?? [];

  // Тянем все источники параллельно; любой может вернуть пусто.
  const [crypto, fx, metals] = await Promise.all([
    fetchCrypto().catch(() => ({}) as Record<string, Partial<LiveTicker>>),
    fetchFx().catch(() => ({}) as Record<string, Partial<LiveTicker>>),
    fetchMetals().catch(() => ({}) as Record<string, Partial<LiveTicker>>),
  ]);
  const live: Record<string, Partial<LiveTicker>> = { ...crypto, ...fx, ...metals };

  // Мёрджим: для каждого тикера из БД берём live-значение если есть, иначе БД.
  const merged: LiveTicker[] = dbTickers.map((t) => {
    const l = live[t.symbol];
    if (l && l.price != null) {
      return { symbol: t.symbol, price: l.price, change24h: l.change24h ?? 0, live: true };
    }
    return { symbol: t.symbol, price: t.price, change24h: t.change24h, live: false };
  });

  // Если в live есть символы, которых нет в БД — добавим их тоже.
  for (const [symbol, l] of Object.entries(live)) {
    if (l.price != null && !merged.some((m) => m.symbol === symbol)) {
      merged.push({ symbol, price: l.price, change24h: l.change24h ?? 0, live: true });
    }
  }

  return Response.json(
    { tickers: merged, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } },
  );
}
