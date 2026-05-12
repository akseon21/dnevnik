// ─────────────────────────────────────────────────────────────────────────────
// ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ ДАШБОРДА
// Чтобы обновить дашборд: отредактируй этот файл → commit → push → Vercel сам перерендерит.
//
// Что обычно меняется каждый день:
//  • tickers[].price / change24h — текущие цены инструментов
//  • participants[].timeline — добавить новую точку { ts: "...", value: ... }
//  • (v2) participants[].positions — открытые позиции
//  • (v2) participants[].availableCash — свободные средства
//
// ВНИМАНИЕ: данные ниже — ПЛЕЙСХОЛДЕРЫ. Замени на реальные.
// ─────────────────────────────────────────────────────────────────────────────

export type Ticker = {
  symbol: string;       // тикер (XAUUSD, EURUSD, ...) — НЕ переводим
  price: number;        // текущая цена
  change24h: number;    // изменение за сутки в % (может быть отрицательным)
};

export type Position = {
  side: "LONG" | "SHORT";       // LONG / SHORT — НЕ переводим
  instrument: string;            // тикер инструмента
  lot: number;                   // размер лота, напр. 0.5
  exitPlan: string;              // план выхода, напр. "TP 4700 / SL 4640"
  unrealizedPnl: number;         // текущий PnL по позиции, $
};

export type TimelinePoint = {
  ts: string;     // ISO-таймстамп момента, напр. "2026-05-13T10:00"
  value: number;  // баланс счёта участника на этот момент, $
};

export type Participant = {
  name: string;                  // имя участника
  color: string;                 // стабильный цвет линии (hex)
  avatar: string | null;         // путь к фото в /public или null → показываем инициалы
  timeline: TimelinePoint[];     // динамика баланса во времени (минимум 1 точка)
  positions: Position[];         // открытые позиции (v2; пока [])
  availableCash: number;         // свободные средства, $ (v2)
};

export type Competition = {
  title: string;
  startDate: string;             // "ГГГГ-ММ-ДД"
  endDate: string;               // "ГГГГ-ММ-ДД"
  tickers: Ticker[];
  participants: Participant[];
};

export const competition: Competition = {
  title: "Реалити-торговля: 2 недели",
  startDate: "2026-05-13",
  endDate: "2026-05-27",
  tickers: [
    { symbol: "XAUUSD", price: 4682.5, change24h: 0.84 },
    { symbol: "XAGUSD", price: 58.12, change24h: -0.42 },
    { symbol: "EURUSD", price: 1.0915, change24h: 0.12 },
    { symbol: "GBPUSD", price: 1.2734, change24h: -0.18 },
    { symbol: "USDJPY", price: 152.36, change24h: 0.31 },
    { symbol: "BTCUSD", price: 71240, change24h: 2.15 },
  ],
  participants: [
    {
      name: "Кирилл",
      color: "#22d3ee", // cyan
      avatar: null,
      timeline: [
        { ts: "2026-05-13T10:00", value: 1500 },
        { ts: "2026-05-14T10:00", value: 1565 },
        { ts: "2026-05-15T10:00", value: 1620 },
        { ts: "2026-05-16T10:00", value: 1740 },
        { ts: "2026-05-17T10:00", value: 1705 },
        { ts: "2026-05-18T10:00", value: 1830 },
        { ts: "2026-05-19T10:00", value: 1910 },
      ],
      positions: [],
      availableCash: 920,
    },
    {
      name: "Алексей",
      color: "#a78bfa", // violet
      avatar: null,
      timeline: [
        { ts: "2026-05-13T10:00", value: 1200 },
        { ts: "2026-05-14T10:00", value: 1255 },
        { ts: "2026-05-15T10:00", value: 1180 },
        { ts: "2026-05-16T10:00", value: 1310 },
        { ts: "2026-05-17T10:00", value: 1395 },
        { ts: "2026-05-18T10:00", value: 1360 },
        { ts: "2026-05-19T10:00", value: 1480 },
      ],
      positions: [],
      availableCash: 640,
    },
    {
      name: "Павел",
      color: "#f472b6", // pink
      avatar: null,
      timeline: [
        { ts: "2026-05-13T10:00", value: 1000 },
        { ts: "2026-05-14T10:00", value: 980 },
        { ts: "2026-05-15T10:00", value: 940 },
        { ts: "2026-05-16T10:00", value: 905 },
        { ts: "2026-05-17T10:00", value: 870 },
        { ts: "2026-05-18T10:00", value: 845 },
        { ts: "2026-05-19T10:00", value: 815 },
      ],
      positions: [],
      availableCash: 310,
    },
    {
      name: "Lauris",
      color: "#4ade80", // green
      avatar: null,
      timeline: [
        { ts: "2026-05-13T10:00", value: 1350 },
        { ts: "2026-05-14T10:00", value: 1420 },
        { ts: "2026-05-15T10:00", value: 1390 },
        { ts: "2026-05-16T10:00", value: 1505 },
        { ts: "2026-05-17T10:00", value: 1560 },
        { ts: "2026-05-18T10:00", value: 1620 },
        { ts: "2026-05-19T10:00", value: 1585 },
      ],
      positions: [],
      availableCash: 720,
    },
    {
      name: "Руслан",
      color: "#fbbf24", // amber
      avatar: null,
      timeline: [
        { ts: "2026-05-13T10:00", value: 1100 },
        { ts: "2026-05-14T10:00", value: 1140 },
        { ts: "2026-05-15T10:00", value: 1210 },
        { ts: "2026-05-16T10:00", value: 1175 },
        { ts: "2026-05-17T10:00", value: 1095 },
        { ts: "2026-05-18T10:00", value: 1040 },
        { ts: "2026-05-19T10:00", value: 1130 },
      ],
      positions: [],
      availableCash: 480,
    },
  ],
};
