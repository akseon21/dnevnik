// ─────────────────────────────────────────────────────────────────────────────
// lib/pnl.ts — формулы нереализованного P&L по форекс-инструментам и
// маппинг наших тикеров в формат TwelveData (XAUUSD ↔ XAU/USD).
//
// Используется для live-расчёта P&L открытых позиций по текущим рыночным ценам
// (см. /api/prices + клиентский поллинг). Чистые функции, без сторонних
// зависимостей и сайд-эффектов — легко тестировать.
//
// Допущения по размеру контракта:
//   • XAUUSD     — 1 лот = 100 oz   (стандарт MT4/MT5)
//   • XAGUSD     — 1 лот = 5000 oz
//   • EURUSD/GBPUSD/AUDUSD/NZDUSD/прочие *USD-парах — 1 лот = 100 000 базовой
//   • USDJPY/USDCHF/USDCAD — 1 лот = 100 000 USD; PnL в quote-валюте,
//     перевод в USD по текущей цене пары
//   • BTCUSD     — 1 лот = 1 BTC (большинство брокеров; крипто-фьючерсы у разных
//     брокеров отличаются — здесь дефолт)
//
// Сторона:
//   LONG  → side=+1   (профит при росте цены)
//   SHORT → side=−1   (профит при падении цены)
//
// Для quote-валюты (PnL не в USD) делим/умножаем на курс quote/USD:
//   • USDJPY: PnL_jpy = (price − entry) × 100_000 × qty × side
//             PnL_usd = PnL_jpy / price (price — текущая USDJPY, т.е. JPY за 1 USD)
//   • USDCHF/USDCAD аналогично: PnL в CHF/CAD → делим на текущую цену пары
// ─────────────────────────────────────────────────────────────────────────────

export type Side = "LONG" | "SHORT" | "BUY" | "SELL";

/** Размер контракта в единицах базового актива (или USD для USDxxx-пар). */
export function contractSize(instrument: string): number {
  const s = instrument.toUpperCase();
  if (s === "XAUUSD") return 100;
  if (s === "XAGUSD") return 5000;
  if (s === "BTCUSD") return 1;
  // major-пары (включая обратные USDxxx) — стандартный лот 100 000
  return 100_000;
}

/** Знак стороны: LONG/BUY → +1, SHORT/SELL → −1. */
export function sideSign(side: Side): 1 | -1 {
  return side === "SHORT" || side === "SELL" ? -1 : 1;
}

/**
 * Нереализованный PnL открытой позиции в USD.
 * Возвращает null если расчёт невозможен (нет цены входа / нет рыночной цены /
 * не хватает кросс-курса для USDJPY-подобных пар).
 *
 * @param instrument тикер ("XAUUSD", "EURUSD", "USDJPY", "BTCUSD", ...)
 * @param side       LONG/SHORT (или BUY/SELL — синонимы)
 * @param qty        размер позиции в лотах (например 0.5)
 * @param entryPrice цена входа
 * @param marketPrice текущая рыночная цена этого инструмента
 * @param prices     карта {symbol: price} — нужна для конвертации в USD
 *                   PnL по парам с quote ≠ USD (USDJPY и т.п.). Может быть {}.
 */
export function computeUnrealizedPnlUsd(
  instrument: string,
  side: Side,
  qty: number,
  entryPrice: number | null | undefined,
  marketPrice: number | null | undefined,
  prices: Record<string, number> = {},
): number | null {
  if (entryPrice == null || !Number.isFinite(entryPrice) || entryPrice <= 0) return null;
  if (marketPrice == null || !Number.isFinite(marketPrice) || marketPrice <= 0) return null;
  if (!Number.isFinite(qty)) return null;

  const sym = instrument.toUpperCase();
  const sign = sideSign(side);
  const size = contractSize(sym);
  const diff = marketPrice - entryPrice;
  const rawPnl = diff * size * qty * sign; // в quote-валюте

  // Quote-валюта = USD (большинство наших инструментов)
  if (
    sym === "XAUUSD" ||
    sym === "XAGUSD" ||
    sym === "BTCUSD" ||
    sym.endsWith("USD") // EURUSD, GBPUSD, AUDUSD, NZDUSD ...
  ) {
    return rawPnl;
  }

  // Quote-валюта ≠ USD — нужен кросс-курс. Поддерживаем USDxxx (USDJPY/USDCHF/USDCAD).
  // PnL в quote-валюте → делим на текущую цену пары (marketPrice = quote per 1 USD).
  if (sym.startsWith("USD") && sym.length === 6) {
    return rawPnl / marketPrice;
  }

  // Незнакомая пара (например EURJPY) — без явной формулы возвращаем null.
  // Можно дополнить через prices[] (лук кросс-курса), но пока не нужно.
  void prices;
  return null;
}

// ─── Маппинг наших тикеров в формат TwelveData ────────────────────────────────
// TwelveData использует слеш в форекс-парах: "EUR/USD", "XAU/USD", "BTC/USD".
// Наш UI использует слитный формат без слеша: "EURUSD", "XAUUSD", "BTCUSD".

const TWELVEDATA_OVERRIDES: Record<string, string> = {
  // Дополнительные исключения, если понадобятся (например, разные синонимы).
  // Большинство пар укладывается в эвристику ниже.
};

/** "XAUUSD" → "XAU/USD", "EURUSD" → "EUR/USD", "BTCUSD" → "BTC/USD". */
export function toTwelveData(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  if (TWELVEDATA_OVERRIDES[s]) return TWELVEDATA_OVERRIDES[s];
  // 6-буквенный тикер без слешей — раскалываем 3+3.
  if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s;
}

/** "XAU/USD" → "XAUUSD" — обратное преобразование для удобства маппинга ответа. */
export function fromTwelveData(td: string): string {
  return td.toUpperCase().replace("/", "");
}
