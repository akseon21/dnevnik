// ─────────────────────────────────────────────────────────────────────────────
// СТАТИЧЕСКИЙ FALLBACK ДЛЯ ДАШБОРДА
//
// Этот файл используется когда Supabase НЕ настроен (нет env-переменных
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Тогда дашборд
// читает данные отсюда — как в v1. Когда Supabase подключён, данные берутся из БД
// (см. lib/db.ts), а этот файл остаётся резервом.
//
// Чтобы обновить дашборд БЕЗ БД: отредактируй этот файл → commit → push → Vercel
// перерендерит. С БД — используй страницу /admin.
//
// ВНИМАНИЕ: данные ниже — ПЛЕЙСХОЛДЕРЫ. Замени на реальные.
// ─────────────────────────────────────────────────────────────────────────────

import type { Competition } from "@/lib/types";

export type {
  Competition,
  Participant,
  Position,
  TimelinePoint,
  Ticker,
  WatchlistItem,
} from "@/lib/types";

export const competition: Competition = {
  title: "Реалити-торговля: 2 недели",
  startDate: "2026-05-13",
  endDate: "2026-05-27",
  note: "Данные обновляются раз в день, в конце торгового дня",
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
      positions: [
        {
          side: "LONG",
          instrument: "XAUUSD",
          lot: 0.5,
          exitPlan: "TP 4720 / SL 4650",
          unrealizedPnl: 145,
          status: "open",
          openedAt: "2026-05-18T11:00",
        },
        {
          side: "SHORT",
          instrument: "USDJPY",
          lot: 0.3,
          exitPlan: "TP 151.20 / SL 153.10",
          unrealizedPnl: -42,
          status: "open",
          openedAt: "2026-05-19T09:30",
        },
        {
          side: "LONG",
          instrument: "EURUSD",
          lot: 0.4,
          exitPlan: "TP 1.0980 / SL 1.0880",
          unrealizedPnl: 88,
          status: "closed",
          openedAt: "2026-05-15T10:00",
          closedAt: "2026-05-17T16:00",
        },
      ],
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
      positions: [
        {
          side: "LONG",
          instrument: "XAGUSD",
          lot: 1.0,
          exitPlan: "TP 59.50 / SL 57.40",
          unrealizedPnl: 64,
          status: "open",
          openedAt: "2026-05-19T10:15",
        },
      ],
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
      positions: [
        {
          side: "SHORT",
          instrument: "BTCUSD",
          lot: 0.1,
          exitPlan: "TP 68000 / SL 73500",
          unrealizedPnl: -85,
          status: "open",
          openedAt: "2026-05-18T14:00",
        },
      ],
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
      positions: [
        {
          side: "LONG",
          instrument: "GBPUSD",
          lot: 0.6,
          exitPlan: "TP 1.2850 / SL 1.2680",
          unrealizedPnl: -35,
          status: "open",
          openedAt: "2026-05-19T08:00",
        },
        {
          side: "LONG",
          instrument: "XAUUSD",
          lot: 0.3,
          exitPlan: "TP 4690 / SL 4600",
          unrealizedPnl: 210,
          status: "closed",
          openedAt: "2026-05-14T10:00",
          closedAt: "2026-05-16T15:00",
        },
      ],
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
  watchlist: [
    {
      instrument: "XAGUSD",
      note: "ждём отбой от уровня",
      participantNames: ["Кирилл", "Алексей"],
    },
    {
      instrument: "AUDUSD",
      note: "смотрю на новостях RBA",
      participantNames: ["Руслан"],
    },
    {
      instrument: "GBPUSD",
      note: "после CPI",
      participantNames: ["Lauris"],
    },
  ],
};
