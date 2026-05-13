// ─────────────────────────────────────────────────────────────────────────────
// СТАТИЧЕСКИЙ FALLBACK ДЛЯ ДАШБОРДА (v9 — trade-centric + live PnL)
//
// Используется когда Supabase НЕ настроен ИЛИ когда в БД ещё старая схема (нет
// колонки participants.starting_deposit) — см. lib/db.ts. Тогда дашборд читает
// данные отсюда. Когда БД с новой схемой подключена — данные берутся из неё (/admin).
//
// Модель: у участника только starting_deposit + сделки. Баланс / equity /
// свободные средства / timeline графика вычисляются из сделок (lib/standings.ts).
//
// v9.2 — РАСШИРЕННЫЙ ДЕМО-СИДИНГ (15 участников):
//   • Базовые 6 (v9.1): Андрей, Михаил, Алексей, Дмитрий, Сергей, Иван (1200-5000 $).
//   • +9 новых (v9.2): Артём, Никита, Павел, Роман, Денис, Олег, Виталий, Антон,
//     Максим (800-7000 $). Цвета расширены, чтобы линии на графике различались.
//   • У каждого 2-4 закрытые сделки за 2026-05-06…12 → красивый equity-график.
//   • У каждого 1-3 открытые позиции с entryPrice ≈ актуальной рыночной цене
//     (на 2026-05-13: XAUUSD ~4640, XAGUSD ~57.85, EURUSD ~1.0850, GBPUSD ~1.2700,
//      USDCAD ~1.3850, USDJPY ~152.0, BTCUSD ~80000).
//   • Несколько участников намеренно в минусе по equity для интриги в соревновании.
//   • При включённом TwelveData ключе нереализ. PnL пересчитывается live
//     (см. lib/pnl.ts). Без ключа — fallback на ручной unrealizedPnl ниже.
// Синхронизировано с supabase/migrations/0006_demo_data_extended.sql
// (0005_demo_data.sql — base seed на 6 участников, остаётся как есть).
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
  startDate: "2026-05-06",
  endDate: "2026-05-20",
  note: "Баланс и equity считаются автоматически из сделок · live-PnL из TwelveData по цене входа",
  tickers: [
    { symbol: "XAUUSD", price: 4640.0, change24h: 0.42 },
    { symbol: "XAGUSD", price: 57.85, change24h: -0.31 },
    { symbol: "EURUSD", price: 1.085, change24h: 0.08 },
    { symbol: "GBPUSD", price: 1.27, change24h: -0.14 },
    { symbol: "USDJPY", price: 152.0, change24h: 0.18 },
    { symbol: "USDCAD", price: 1.385, change24h: 0.05 },
    { symbol: "BTCUSD", price: 80000, change24h: 1.85 },
  ],
  participants: [
    // ── Андрей — крепкий, +5.0% ──────────────────────────────────────────────
    {
      name: "Андрей",
      color: "#22d3ee",
      avatar: null,
      startingDeposit: 3000,
      // closed: +95 +130 -45 +70 = +250 → balance 3250 (+8.3%)
      // open: XAUUSD LONG 0.1 entry 4625 → +150 (live), USDJPY SHORT 0.2 entry 152.30 → +39 (live)
      positions: [
        closed("LONG", "EURUSD", 0.3, "TP 1.0900 / SL 1.0800", 250, 95, "2026-05-06T10:00", "2026-05-07T16:30"),
        closed("LONG", "XAUUSD", 0.2, "TP 4660 / SL 4600", 320, 130, "2026-05-08T09:00", "2026-05-09T14:00"),
        closed("SHORT", "GBPUSD", 0.2, "TP 1.2650 / SL 1.2750", 200, -45, "2026-05-10T11:00", "2026-05-11T13:00"),
        closed("LONG", "USDCAD", 0.2, "TP 1.3900 / SL 1.3800", 180, 70, "2026-05-11T15:00", "2026-05-12T17:00"),
        open("LONG", "XAUUSD", 0.1, "TP 4700 / SL 4600", 320, 150, "2026-05-13T08:30", 4625.0),
        open("SHORT", "USDJPY", 0.2, "TP 151.20 / SL 152.80", 200, 39, "2026-05-13T09:15", 152.3),
      ],
    },

    // ── Михаил — осторожный, +1.6% ───────────────────────────────────────────
    {
      name: "Михаил",
      color: "#a78bfa",
      avatar: null,
      startingDeposit: 2500,
      // closed: +60 -30 +85 = +115 → balance 2615 (+4.6%)
      // open: EURUSD LONG 0.15 entry 1.0820 → +45, GBPUSD LONG 0.1 entry 1.2715 → -15
      positions: [
        closed("LONG", "XAUUSD", 0.1, "TP 4650 / SL 4580", 280, 60, "2026-05-06T11:00", "2026-05-07T15:00"),
        closed("SHORT", "USDJPY", 0.15, "TP 151.20 / SL 152.80", 220, -30, "2026-05-08T10:30", "2026-05-09T12:00"),
        closed("LONG", "BTCUSD", 0.05, "TP 81000 / SL 78000", 380, 85, "2026-05-10T09:00", "2026-05-11T16:00"),
        open("LONG", "EURUSD", 0.15, "TP 1.0920 / SL 1.0780", 200, 45, "2026-05-13T08:00", 1.082),
        open("LONG", "GBPUSD", 0.1, "TP 1.2780 / SL 1.2640", 180, -15, "2026-05-13T10:00", 1.2715),
      ],
    },

    // ── Алексей — лидер, +6.6% ───────────────────────────────────────────────
    {
      name: "Алексей",
      color: "#4ade80",
      avatar: null,
      startingDeposit: 4500,
      // closed: +180 +95 +110 -60 = +325 → balance 4825 (+7.2%)
      // open: XAUUSD LONG 0.3 entry 4615 → +750 ?? слишком много для 0.3 лота
      //       0.3 × 100 × 25 = $750. Уменьшу: entry 4632 → диф 8 → 0.3×100×8 = $240
      //       BTCUSD LONG 0.1 entry 79200 → 800×0.1 = $80
      positions: [
        closed("LONG", "XAUUSD", 0.3, "TP 4660 / SL 4580", 480, 180, "2026-05-06T10:00", "2026-05-07T17:00"),
        closed("LONG", "EURUSD", 0.4, "TP 1.0900 / SL 1.0780", 320, 95, "2026-05-08T11:00", "2026-05-09T15:30"),
        closed("SHORT", "USDJPY", 0.3, "TP 151.00 / SL 153.00", 280, 110, "2026-05-09T09:00", "2026-05-11T12:00"),
        closed("LONG", "GBPUSD", 0.3, "TP 1.2780 / SL 1.2640", 240, -60, "2026-05-11T10:00", "2026-05-12T16:00"),
        open("LONG", "XAUUSD", 0.3, "TP 4700 / SL 4600", 480, 240, "2026-05-13T08:00", 4632.0),
        open("LONG", "BTCUSD", 0.1, "TP 82000 / SL 78000", 600, 80, "2026-05-13T09:30", 79200),
      ],
    },

    // ── Дмитрий — в минусе, -3.0% ────────────────────────────────────────────
    {
      name: "Дмитрий",
      color: "#f472b6",
      avatar: null,
      startingDeposit: 1500,
      // closed: -65 -40 +35 = -70 → balance 1430 (-4.7%)
      // open: USDCAD SHORT 0.1 entry 1.3870 → +14 (1.385 ниже entry → SHORT в плюсе)
      //       0.002 × 100000 × 0.1 / 1.385 ≈ 14.4
      //       XAGUSD LONG 0.05 entry 58.20 → диф -0.35 × 5000 × 0.05 = -87.5
      positions: [
        closed("LONG", "GBPUSD", 0.2, "TP 1.2780 / SL 1.2650", 200, -65, "2026-05-06T12:00", "2026-05-07T14:00"),
        closed("SHORT", "XAUUSD", 0.1, "TP 4580 / SL 4670", 280, -40, "2026-05-08T10:00", "2026-05-09T13:00"),
        closed("LONG", "EURUSD", 0.2, "TP 1.0890 / SL 1.0790", 180, 35, "2026-05-10T09:00", "2026-05-11T15:00"),
        open("SHORT", "USDCAD", 0.1, "TP 1.3780 / SL 1.3920", 150, 14, "2026-05-13T08:00", 1.387),
        open("LONG", "XAGUSD", 0.05, "TP 60.00 / SL 56.50", 145, -87, "2026-05-13T09:00", 58.2),
      ],
    },

    // ── Сергей — стабильный лидер по сумме, +3.4% ────────────────────────────
    {
      name: "Сергей",
      color: "#fbbf24",
      avatar: null,
      startingDeposit: 5000,
      // closed: +150 +200 -85 +120 = +385 → balance 5385 (+7.7%)
      // open: XAUUSD SHORT 0.2 entry 4655 → +300 (4640 ниже entry → SHORT в плюсе, 15×100×0.2 = $300)
      //       EURUSD SHORT 0.3 entry 1.0840 → -30 (1.085 выше entry → SHORT в минусе, 0.001×100000×0.3 = $30)
      //       USDJPY LONG 0.2 entry 151.80 → +26 (152 выше entry, 0.20×100000×0.2/152 ≈ 26.3)
      positions: [
        closed("LONG", "XAUUSD", 0.2, "TP 4670 / SL 4590", 380, 150, "2026-05-06T09:00", "2026-05-07T18:00"),
        closed("LONG", "BTCUSD", 0.1, "TP 81500 / SL 77500", 500, 200, "2026-05-08T10:00", "2026-05-10T11:00"),
        closed("SHORT", "EURUSD", 0.4, "TP 1.0790 / SL 1.0890", 320, -85, "2026-05-10T13:00", "2026-05-11T17:00"),
        closed("LONG", "USDCAD", 0.3, "TP 1.3920 / SL 1.3800", 280, 120, "2026-05-11T09:00", "2026-05-12T15:00"),
        open("SHORT", "XAUUSD", 0.2, "TP 4580 / SL 4680", 380, 300, "2026-05-13T08:30", 4655.0),
        open("SHORT", "EURUSD", 0.3, "TP 1.0780 / SL 1.0890", 320, -30, "2026-05-13T09:00", 1.084),
        open("LONG", "USDJPY", 0.2, "TP 153.00 / SL 151.00", 220, 26, "2026-05-13T10:00", 151.8),
      ],
    },

    // ── Иван — новичок, +0.7% ────────────────────────────────────────────────
    {
      name: "Иван",
      color: "#fb923c",
      avatar: null,
      startingDeposit: 1200,
      // closed: -30 +55 = +25 → balance 1225 (+2.1%)
      // open: GBPUSD SHORT 0.1 entry 1.2715 → +15 (1.27 ниже entry → SHORT в плюсе, 0.0015×100000×0.1 = $15)
      positions: [
        closed("LONG", "EURUSD", 0.1, "TP 1.0890 / SL 1.0790", 110, -30, "2026-05-07T11:00", "2026-05-08T15:00"),
        closed("LONG", "XAUUSD", 0.05, "TP 4650 / SL 4590", 230, 55, "2026-05-10T10:00", "2026-05-11T16:00"),
        open("SHORT", "GBPUSD", 0.1, "TP 1.2640 / SL 1.2780", 130, 15, "2026-05-13T09:30", 1.2715),
      ],
    },

    // ─── v9.2: ещё 9 участников ─────────────────────────────────────────────────

    // ── Артём — лёгкий плюс, +5.8% (с открытыми) ─────────────────────────────
    {
      name: "Артём",
      color: "#ef4444",
      avatar: null,
      startingDeposit: 1800,
      // closed: +85 -50 = +35 → balance 1835 (+1.9%)
      // open: GBPUSD LONG 0.1 entry 1.2680 → +20 (1.27 выше entry, 0.002×100000×0.1=$20)
      //       XAUUSD SHORT 0.05 entry 4650 → +50 (4640 ниже entry, 10×100×0.05=$50)
      positions: [
        closed("LONG", "XAUUSD", 0.1, "TP 4660 / SL 4600", 250, 85, "2026-05-07T10:00", "2026-05-08T14:00"),
        closed("SHORT", "EURUSD", 0.2, "TP 1.0780 / SL 1.0890", 200, -50, "2026-05-09T11:00", "2026-05-10T16:00"),
        open("LONG", "GBPUSD", 0.1, "TP 1.2780 / SL 1.2640", 150, 20, "2026-05-13T08:30", 1.268),
        open("SHORT", "XAUUSD", 0.05, "TP 4580 / SL 4690", 180, 50, "2026-05-13T10:00", 4650.0),
      ],
    },

    // ── Никита — крепкий лидер, +11.3% (с открытыми) ─────────────────────────
    {
      name: "Никита",
      color: "#06b6d4",
      avatar: null,
      startingDeposit: 6500,
      // closed: +220 +180 -90 +75 = +385 → balance 6885 (+5.9%)
      // open: BTCUSD LONG 0.1 entry 79500 → +50 (80000-79500=500, 500×1×0.1=$50)
      //       XAUUSD LONG 0.2 entry 4628 → +240 (12×100×0.2=$240)
      //       USDJPY SHORT 0.3 entry 152.50 → +99 (0.50×100000×0.3/152≈$98.7)
      positions: [
        closed("LONG", "BTCUSD", 0.15, "TP 81500 / SL 78500", 600, 220, "2026-05-06T09:30", "2026-05-07T17:00"),
        closed("LONG", "XAUUSD", 0.3, "TP 4680 / SL 4590", 420, 180, "2026-05-08T10:00", "2026-05-09T16:00"),
        closed("SHORT", "GBPUSD", 0.3, "TP 1.2640 / SL 1.2780", 250, -90, "2026-05-10T11:00", "2026-05-11T14:00"),
        closed("LONG", "USDCAD", 0.25, "TP 1.3920 / SL 1.3800", 240, 75, "2026-05-11T15:00", "2026-05-12T17:00"),
        open("LONG", "BTCUSD", 0.1, "TP 82000 / SL 78000", 600, 50, "2026-05-13T08:00", 79500),
        open("LONG", "XAUUSD", 0.2, "TP 4700 / SL 4600", 380, 240, "2026-05-13T09:00", 4628.0),
        open("SHORT", "USDJPY", 0.3, "TP 151.00 / SL 153.00", 280, 99, "2026-05-13T10:30", 152.5),
      ],
    },

    // ── Павел — около ноля, -1.3% (с открытыми) ──────────────────────────────
    {
      name: "Павел",
      color: "#8b5cf6",
      avatar: null,
      startingDeposit: 900,
      // closed: -25 +18 = -7 → balance 893 (-0.8%)
      // open: EURUSD LONG 0.05 entry 1.0860 → -5 (-0.001×100000×0.05=-$5)
      positions: [
        closed("SHORT", "XAUUSD", 0.05, "TP 4580 / SL 4670", 200, -25, "2026-05-07T11:00", "2026-05-08T15:30"),
        closed("LONG", "GBPUSD", 0.1, "TP 1.2780 / SL 1.2650", 120, 18, "2026-05-10T10:00", "2026-05-11T13:00"),
        open("LONG", "EURUSD", 0.05, "TP 1.0930 / SL 1.0790", 80, -5, "2026-05-13T09:00", 1.086),
      ],
    },

    // ── Роман — стабильный плюс, +6.5% (с открытыми) ─────────────────────────
    {
      name: "Роман",
      color: "#14b8a6",
      avatar: null,
      startingDeposit: 4200,
      // closed: +115 -45 +90 = +160 → balance 4360 (+3.8%)
      // open: USDCAD LONG 0.2 entry 1.3835 → +22 (0.0015×100000×0.2/1.385≈$21.66)
      //       XAUUSD LONG 0.15 entry 4634 → +90 (6×100×0.15=$90)
      positions: [
        closed("LONG", "EURUSD", 0.3, "TP 1.0900 / SL 1.0790", 280, 115, "2026-05-06T11:00", "2026-05-07T15:00"),
        closed("SHORT", "BTCUSD", 0.05, "TP 78500 / SL 81000", 400, -45, "2026-05-08T09:00", "2026-05-09T17:00"),
        closed("LONG", "XAUUSD", 0.15, "TP 4670 / SL 4590", 350, 90, "2026-05-10T10:00", "2026-05-11T16:30"),
        open("LONG", "USDCAD", 0.2, "TP 1.3920 / SL 1.3780", 200, 22, "2026-05-13T08:30", 1.3835),
        open("LONG", "XAUUSD", 0.15, "TP 4720 / SL 4600", 350, 90, "2026-05-13T09:30", 4634.0),
      ],
    },

    // ── Денис — В МИНУСЕ, -10.9% (с открытыми) ───────────────────────────────
    {
      name: "Денис",
      color: "#eab308",
      avatar: null,
      startingDeposit: 2200,
      // closed: -80 -55 +30 = -105 → balance 2095 (-4.8%)
      // open: GBPUSD SHORT 0.1 entry 1.2685 → -15 (1.27 выше entry, -0.0015×100000×0.1=-$15)
      //       XAGUSD LONG 0.1 entry 58.10 → -125 (-0.25×5000×0.1=-$125)
      positions: [
        closed("LONG", "BTCUSD", 0.05, "TP 81000 / SL 78500", 400, -80, "2026-05-06T10:00", "2026-05-07T16:00"),
        closed("SHORT", "XAUUSD", 0.1, "TP 4580 / SL 4670", 280, -55, "2026-05-08T11:00", "2026-05-09T13:30"),
        closed("LONG", "EURUSD", 0.15, "TP 1.0900 / SL 1.0800", 180, 30, "2026-05-10T12:00", "2026-05-11T15:00"),
        open("SHORT", "GBPUSD", 0.1, "TP 1.2620 / SL 1.2780", 150, -15, "2026-05-13T08:00", 1.2685),
        open("LONG", "XAGUSD", 0.1, "TP 60.00 / SL 56.00", 290, -125, "2026-05-13T10:00", 58.1),
      ],
    },

    // ── Олег — лидер по абсолютной сумме, +8.8% (с открытыми) ────────────────
    {
      name: "Олег",
      color: "#ec4899",
      avatar: null,
      startingDeposit: 5800,
      // closed: +160 +200 -60 +90 = +390 → balance 6190 (+6.7%)
      // open: BTCUSD SHORT 0.05 entry 80800 → +40 (800×1×0.05=$40)
      //       EURUSD LONG 0.4 entry 1.0830 → +80 (0.002×100000×0.4=$80)
      positions: [
        closed("LONG", "XAUUSD", 0.25, "TP 4680 / SL 4590", 450, 160, "2026-05-06T10:30", "2026-05-07T17:30"),
        closed("LONG", "BTCUSD", 0.1, "TP 81500 / SL 78000", 550, 200, "2026-05-08T09:30", "2026-05-09T15:00"),
        closed("SHORT", "EURUSD", 0.3, "TP 1.0790 / SL 1.0890", 260, -60, "2026-05-10T11:00", "2026-05-11T14:00"),
        closed("LONG", "USDJPY", 0.25, "TP 153.00 / SL 151.00", 240, 90, "2026-05-11T10:00", "2026-05-12T17:00"),
        open("SHORT", "BTCUSD", 0.05, "TP 78500 / SL 81500", 600, 40, "2026-05-13T08:30", 80800),
        open("LONG", "EURUSD", 0.4, "TP 1.0930 / SL 1.0780", 320, 80, "2026-05-13T09:00", 1.083),
      ],
    },

    // ── Виталий — крепкий плюс, +9.4% (с открытыми) ──────────────────────────
    {
      name: "Виталий",
      color: "#84cc16",
      avatar: null,
      startingDeposit: 3500,
      // closed: +120 -45 = +75 → balance 3575 (+2.1%)
      // open: USDJPY LONG 0.2 entry 151.60 → +53 (0.40×100000×0.2/152≈$52.6)
      //       XAUUSD SHORT 0.1 entry 4660 → +200 (20×100×0.1=$200)
      positions: [
        closed("LONG", "GBPUSD", 0.2, "TP 1.2780 / SL 1.2640", 200, 120, "2026-05-07T10:00", "2026-05-08T16:00"),
        closed("SHORT", "BTCUSD", 0.05, "TP 78000 / SL 81000", 400, -45, "2026-05-09T11:00", "2026-05-10T15:00"),
        open("LONG", "USDJPY", 0.2, "TP 153.00 / SL 151.00", 220, 53, "2026-05-13T08:30", 151.6),
        open("SHORT", "XAUUSD", 0.1, "TP 4580 / SL 4690", 320, 200, "2026-05-13T09:30", 4660.0),
      ],
    },

    // ── Антон — В МИНУСЕ, -11.8% (с открытыми) ───────────────────────────────
    {
      name: "Антон",
      color: "#f97316",
      avatar: null,
      startingDeposit: 1100,
      // closed: -45 -30 +20 = -55 → balance 1045 (-5.0%)
      // open: XAUUSD LONG 0.05 entry 4655 → -75 (-15×100×0.05=-$75)
      positions: [
        closed("LONG", "EURUSD", 0.1, "TP 1.0900 / SL 1.0780", 110, -45, "2026-05-07T12:00", "2026-05-08T15:00"),
        closed("SHORT", "GBPUSD", 0.1, "TP 1.2640 / SL 1.2780", 130, -30, "2026-05-09T10:00", "2026-05-10T14:00"),
        closed("LONG", "USDCAD", 0.1, "TP 1.3900 / SL 1.3800", 100, 20, "2026-05-11T11:00", "2026-05-12T15:00"),
        open("LONG", "XAUUSD", 0.05, "TP 4720 / SL 4610", 230, -75, "2026-05-13T09:00", 4655.0),
      ],
    },

    // ── Максим — топ-лидер, +17.6% (с открытыми) ─────────────────────────────
    {
      name: "Максим",
      color: "#6366f1",
      avatar: null,
      startingDeposit: 7000,
      // closed: +280 +150 -120 +180 = +490 → balance 7490 (+7.0%)
      // open: XAUUSD LONG 0.4 entry 4625 → +600 (15×100×0.4=$600)
      //       GBPUSD SHORT 0.3 entry 1.2740 → +120 (0.004×100000×0.3=$120)
      //       BTCUSD LONG 0.1 entry 79800 → +20 (200×1×0.1=$20)
      positions: [
        closed("LONG", "XAUUSD", 0.4, "TP 4690 / SL 4590", 580, 280, "2026-05-06T09:00", "2026-05-07T18:00"),
        closed("LONG", "BTCUSD", 0.1, "TP 82000 / SL 78000", 600, 150, "2026-05-08T10:00", "2026-05-09T17:00"),
        closed("SHORT", "EURUSD", 0.4, "TP 1.0780 / SL 1.0900", 320, -120, "2026-05-10T11:00", "2026-05-11T13:00"),
        closed("LONG", "USDJPY", 0.3, "TP 153.00 / SL 151.00", 280, 180, "2026-05-11T09:30", "2026-05-12T16:00"),
        open("LONG", "XAUUSD", 0.4, "TP 4720 / SL 4600", 580, 600, "2026-05-13T08:00", 4625.0),
        open("SHORT", "GBPUSD", 0.3, "TP 1.2620 / SL 1.2790", 250, 120, "2026-05-13T09:00", 1.274),
        open("LONG", "BTCUSD", 0.1, "TP 82000 / SL 78500", 600, 20, "2026-05-13T10:00", 79800),
      ],
    },
  ],
  watchlist: [],
};
