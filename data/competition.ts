// ─────────────────────────────────────────────────────────────────────────────
// СТАТИЧЕСКИЙ FALLBACK ДЛЯ ДАШБОРДА (v6 — trade-centric)
//
// Используется когда Supabase НЕ настроен ИЛИ когда в БД ещё старая схема (нет
// колонки participants.starting_deposit) — см. lib/db.ts. Тогда дашборд читает
// данные отсюда. Когда БД с новой схемой подключена — данные берутся из неё (/admin).
//
// Модель: у участника только starting_deposit + сделки. Баланс / equity /
// свободные средства / timeline графика вычисляются из сделок (lib/standings.ts).
//
// ВНИМАНИЕ: данные ниже — ПЛЕЙСХОЛДЕРЫ. Замени на реальных участников и депозиты.
// Синхронизировано с supabase/migrations/0003b_seed.sql.
// ─────────────────────────────────────────────────────────────────────────────

import type { Competition, Position } from "@/lib/types";

export type {
  Competition,
  Participant,
  Position,
  TimelinePoint,
  Ticker,
  WatchlistItem,
} from "@/lib/types";

const open = (
  side: Position["side"],
  instrument: string,
  lot: number,
  exitPlan: string,
  margin: number,
  unrealizedPnl: number,
  openedAt: string,
  entryPrice: number | null = null,
): Position => ({
  side,
  instrument,
  lot,
  exitPlan,
  margin,
  unrealizedPnl,
  realizedPnl: null,
  status: "open",
  openedAt,
  closedAt: null,
  entryPrice,
});

const closed = (
  side: Position["side"],
  instrument: string,
  lot: number,
  exitPlan: string,
  margin: number,
  realizedPnl: number,
  openedAt: string,
  closedAt: string,
): Position => ({
  side,
  instrument,
  lot,
  exitPlan,
  margin,
  unrealizedPnl: 0,
  realizedPnl,
  status: "closed",
  openedAt,
  closedAt,
});

export const competition: Competition = {
  title: "Реалити-торговля: 2 недели",
  startDate: "2026-05-13",
  endDate: "2026-05-27",
  note: "Баланс и equity считаются автоматически из сделок",
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
      color: "#22d3ee",
      avatar: null,
      startingDeposit: 1500, // → balance 1830 (closed +330), equity 1933, free 1350
      positions: [
        closed("LONG", "EURUSD", 0.4, "TP 1.0980 / SL 1.0880", 220, 120, "2026-05-13T10:00", "2026-05-14T16:00"),
        closed("SHORT", "GBPUSD", 0.3, "TP 1.2680 / SL 1.2820", 200, -45, "2026-05-15T09:00", "2026-05-16T12:00"),
        closed("LONG", "XAUUSD", 0.3, "TP 4690 / SL 4600", 280, 180, "2026-05-16T10:00", "2026-05-17T15:00"),
        closed("LONG", "XAGUSD", 0.5, "TP 59.0 / SL 57.0", 160, 75, "2026-05-18T10:00", "2026-05-18T17:00"),
        open("LONG", "XAUUSD", 0.5, "TP 4720 / SL 4650", 300, 145, "2026-05-19T11:00", 4670.0),
        open("SHORT", "USDJPY", 0.3, "TP 151.20 / SL 153.10", 180, -42, "2026-05-19T09:30", 152.10),
      ],
    },
    {
      name: "Алексей",
      color: "#a78bfa",
      avatar: null,
      startingDeposit: 1200, // → balance 1480 (closed +280), equity 1544, free 1160
      positions: [
        closed("SHORT", "BTCUSD", 0.1, "TP 70000 / SL 73000", 400, -20, "2026-05-13T11:00", "2026-05-14T18:00"),
        closed("LONG", "EURUSD", 0.5, "TP 1.0960 / SL 1.0860", 250, 95, "2026-05-15T10:00", "2026-05-16T16:00"),
        closed("LONG", "XAUUSD", 0.4, "TP 4700 / SL 4620", 300, 205, "2026-05-17T10:00", "2026-05-18T14:00"),
        open("LONG", "XAGUSD", 1.0, "TP 59.50 / SL 57.40", 320, 64, "2026-05-19T10:15", 57.50),
      ],
    },
    {
      name: "Павел",
      color: "#f472b6",
      avatar: null,
      startingDeposit: 1000, // → balance 815 (closed -185), equity 730, free 465
      positions: [
        closed("LONG", "GBPUSD", 0.4, "TP 1.2850 / SL 1.2680", 220, -65, "2026-05-13T10:30", "2026-05-14T15:00"),
        closed("SHORT", "XAUUSD", 0.3, "TP 4600 / SL 4700", 260, -40, "2026-05-15T11:00", "2026-05-16T13:00"),
        closed("LONG", "EURUSD", 0.5, "TP 1.0980 / SL 1.0880", 250, -80, "2026-05-17T09:00", "2026-05-18T11:00"),
        open("SHORT", "BTCUSD", 0.1, "TP 68000 / SL 73500", 350, -85, "2026-05-18T14:00", 70400),
      ],
    },
    {
      name: "Lauris",
      color: "#4ade80",
      avatar: null,
      startingDeposit: 1350, // → balance 1585 (closed +235), equity 1550, free 1345
      positions: [
        closed("LONG", "XAGUSD", 0.6, "TP 59.0 / SL 57.0", 200, 70, "2026-05-13T10:00", "2026-05-14T17:00"),
        closed("LONG", "XAUUSD", 0.3, "TP 4690 / SL 4600", 280, 210, "2026-05-14T10:00", "2026-05-16T15:00"),
        closed("SHORT", "USDJPY", 0.4, "TP 150.50 / SL 153.50", 230, -45, "2026-05-17T10:00", "2026-05-18T12:00"),
        open("LONG", "GBPUSD", 0.6, "TP 1.2850 / SL 1.2680", 240, -35, "2026-05-19T08:00", 1.2792),
      ],
    },
    {
      name: "Руслан",
      color: "#fbbf24",
      avatar: null,
      startingDeposit: 1100, // → balance 1130 (closed +30), нет открытых
      positions: [
        closed("LONG", "EURUSD", 0.4, "TP 1.0960 / SL 1.0870", 200, 40, "2026-05-13T12:00", "2026-05-14T16:00"),
        closed("LONG", "BTCUSD", 0.1, "TP 73000 / SL 69000", 400, -90, "2026-05-15T10:00", "2026-05-16T14:00"),
        closed("SHORT", "XAGUSD", 0.5, "TP 56.0 / SL 59.0", 180, 80, "2026-05-17T11:00", "2026-05-18T15:00"),
      ],
    },
  ],
  watchlist: [],
};
