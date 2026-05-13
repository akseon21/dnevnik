-- ─────────────────────────────────────────────────────────────────────────────
-- v9.2 — РАСШИРЕННЫЙ ДЕМО-СИДИНГ (15 участников)
--
-- Расширяет демо с 6 до 15 участников. Полностью перезаливает БД (DELETE +
-- INSERT всех 15) — после прогона состояние БД = финальный демо-сид.
-- 0005_demo_data.sql остаётся как «base demo seed» (6 участников); 0006 = «extended».
--
--   • Базовые 6 (из v9.1): Андрей, Михаил, Алексей, Дмитрий, Сергей, Иван
--     (депозиты 1200–5000 $).
--   • +9 новых: Артём, Никита, Павел, Роман, Денис, Олег, Виталий, Антон, Максим
--     (депозиты 800–7000 $). Цвета расширены, чтобы линии на графике различались.
--   • У каждого 2–4 закрытые сделки за 2026-05-06…12 → красивая equity-история.
--   • У каждого 1–3 открытые позиции с entry_price ≈ актуальной рыночной цене
--     на 2026-05-13: XAUUSD ~4640, XAGUSD ~57.85, EURUSD ~1.0850, GBPUSD ~1.2700,
--     USDCAD ~1.3850, USDJPY ~152.0, BTCUSD ~80000.
--   • Несколько участников намеренно в минусе (Дмитрий, Денис, Антон) для интриги.
--
-- Содержимое синхронизировано с data/competition.ts (статический fallback).
--
-- ВНИМАНИЕ: всё ещё плейсхолдеры (вымышленные имена, без фамилий).
-- Замени на реальных участников через /admin.
--
-- ТРЕБОВАНИЯ: миграции 0001 → 0003 → 0004 уже прогнаны (в т.ч. колонка
-- positions.entry_price из 0004_entry_price.sql).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- чистим старое
delete from public.positions;
delete from public.balance_points;
delete from public.participants;
delete from public.competition_meta;
delete from public.tickers;

-- ── meta ─────────────────────────────────────────────────────────────────────
insert into public.competition_meta (title, start_date, end_date, note) values
  ('Реалити-торговля: 2 недели', '2026-05-06', '2026-05-20',
   'Баланс и equity считаются автоматически из сделок · live-PnL из TwelveData по цене входа');

-- ── tickers ──────────────────────────────────────────────────────────────────
insert into public.tickers (symbol, price, change_24h) values
  ('XAUUSD', 4640.0,  0.42),
  ('XAGUSD',   57.85, -0.31),
  ('EURUSD',    1.0850,  0.08),
  ('GBPUSD',    1.2700, -0.14),
  ('USDJPY',  152.00,  0.18),
  ('USDCAD',    1.3850,  0.05),
  ('BTCUSD',  80000,    1.85);

-- ── participants + positions ─────────────────────────────────────────────────
do $$
declare
  andr uuid; mihl uuid; alxs uuid; dmtr uuid; serg uuid; ivan uuid;
  artm uuid; nktt uuid; pavl uuid; romn uuid; dens uuid;
  oleg uuid; vitl uuid; antn uuid; mxsm uuid;
begin
  -- базовые 6 (из 0005)
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Андрей',  '#22d3ee', null, 3000, 0, 0) returning id into andr;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Михаил',  '#a78bfa', null, 2500, 0, 1) returning id into mihl;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Алексей', '#4ade80', null, 4500, 0, 2) returning id into alxs;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Дмитрий', '#f472b6', null, 1500, 0, 3) returning id into dmtr;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Сергей',  '#fbbf24', null, 5000, 0, 4) returning id into serg;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Иван',    '#fb923c', null, 1200, 0, 5) returning id into ivan;

  -- +9 новых (v9.2): расширенная палитра, депозиты 800–7000 $
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Артём',   '#ef4444', null, 1800, 0, 6) returning id into artm;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Никита',  '#06b6d4', null, 6500, 0, 7) returning id into nktt;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Павел',   '#8b5cf6', null,  900, 0, 8) returning id into pavl;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Роман',   '#14b8a6', null, 4200, 0, 9) returning id into romn;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Денис',   '#eab308', null, 2200, 0, 10) returning id into dens;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Олег',    '#ec4899', null, 5800, 0, 11) returning id into oleg;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Виталий', '#84cc16', null, 3500, 0, 12) returning id into vitl;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Антон',   '#f97316', null, 1100, 0, 13) returning id into antn;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Максим',  '#6366f1', null, 7000, 0, 14) returning id into mxsm;

  -- closed: realized_pnl + closed_at для timeline; open: margin + unrealized_pnl + entry_price для live-PnL
  insert into public.positions
    (participant_id, side, instrument, lot, exit_plan, margin, unrealized_pnl, realized_pnl, status, opened_at, closed_at, entry_price) values
    -- ── Андрей: closed +250 → balance 3250; open +189 (live) ──────────────────
    (andr, 'LONG',  'EURUSD', 0.3, 'TP 1.0900 / SL 1.0800', 250, 0,  95,  'closed', '2026-05-06T10:00Z', '2026-05-07T16:30Z', null),
    (andr, 'LONG',  'XAUUSD', 0.2, 'TP 4660 / SL 4600',     320, 0, 130,  'closed', '2026-05-08T09:00Z', '2026-05-09T14:00Z', null),
    (andr, 'SHORT', 'GBPUSD', 0.2, 'TP 1.2650 / SL 1.2750', 200, 0, -45,  'closed', '2026-05-10T11:00Z', '2026-05-11T13:00Z', null),
    (andr, 'LONG',  'USDCAD', 0.2, 'TP 1.3900 / SL 1.3800', 180, 0,  70,  'closed', '2026-05-11T15:00Z', '2026-05-12T17:00Z', null),
    (andr, 'LONG',  'XAUUSD', 0.1, 'TP 4700 / SL 4600',     320, 150, null, 'open', '2026-05-13T08:30Z', null, 4625.00),
    (andr, 'SHORT', 'USDJPY', 0.2, 'TP 151.20 / SL 152.80', 200,  39, null, 'open', '2026-05-13T09:15Z', null,  152.30),

    -- ── Михаил: closed +115 → balance 2615; open +30 (live) ───────────────────
    (mihl, 'LONG',  'XAUUSD', 0.1, 'TP 4650 / SL 4580',     280, 0,  60,  'closed', '2026-05-06T11:00Z', '2026-05-07T15:00Z', null),
    (mihl, 'SHORT', 'USDJPY', 0.15,'TP 151.20 / SL 152.80', 220, 0, -30,  'closed', '2026-05-08T10:30Z', '2026-05-09T12:00Z', null),
    (mihl, 'LONG',  'BTCUSD', 0.05,'TP 81000 / SL 78000',   380, 0,  85,  'closed', '2026-05-10T09:00Z', '2026-05-11T16:00Z', null),
    (mihl, 'LONG',  'EURUSD', 0.15,'TP 1.0920 / SL 1.0780', 200,  45, null, 'open', '2026-05-13T08:00Z', null,    1.0820),
    (mihl, 'LONG',  'GBPUSD', 0.1, 'TP 1.2780 / SL 1.2640', 180, -15, null, 'open', '2026-05-13T10:00Z', null,    1.2715),

    -- ── Алексей: closed +325 → balance 4825; open +320 (live) ─────────────────
    (alxs, 'LONG',  'XAUUSD', 0.3, 'TP 4660 / SL 4580',     480, 0, 180,  'closed', '2026-05-06T10:00Z', '2026-05-07T17:00Z', null),
    (alxs, 'LONG',  'EURUSD', 0.4, 'TP 1.0900 / SL 1.0780', 320, 0,  95,  'closed', '2026-05-08T11:00Z', '2026-05-09T15:30Z', null),
    (alxs, 'SHORT', 'USDJPY', 0.3, 'TP 151.00 / SL 153.00', 280, 0, 110,  'closed', '2026-05-09T09:00Z', '2026-05-11T12:00Z', null),
    (alxs, 'LONG',  'GBPUSD', 0.3, 'TP 1.2780 / SL 1.2640', 240, 0, -60,  'closed', '2026-05-11T10:00Z', '2026-05-12T16:00Z', null),
    (alxs, 'LONG',  'XAUUSD', 0.3, 'TP 4700 / SL 4600',     480, 240, null, 'open', '2026-05-13T08:00Z', null, 4632.00),
    (alxs, 'LONG',  'BTCUSD', 0.1, 'TP 82000 / SL 78000',   600,  80, null, 'open', '2026-05-13T09:30Z', null, 79200.00),

    -- ── Дмитрий: closed -70 → balance 1430; open -73 (live) ───────────────────
    (dmtr, 'LONG',  'GBPUSD', 0.2, 'TP 1.2780 / SL 1.2650', 200, 0, -65,  'closed', '2026-05-06T12:00Z', '2026-05-07T14:00Z', null),
    (dmtr, 'SHORT', 'XAUUSD', 0.1, 'TP 4580 / SL 4670',     280, 0, -40,  'closed', '2026-05-08T10:00Z', '2026-05-09T13:00Z', null),
    (dmtr, 'LONG',  'EURUSD', 0.2, 'TP 1.0890 / SL 1.0790', 180, 0,  35,  'closed', '2026-05-10T09:00Z', '2026-05-11T15:00Z', null),
    (dmtr, 'SHORT', 'USDCAD', 0.1, 'TP 1.3780 / SL 1.3920', 150,  14, null, 'open', '2026-05-13T08:00Z', null,    1.3870),
    (dmtr, 'LONG',  'XAGUSD', 0.05,'TP 60.00 / SL 56.50',   145, -87, null, 'open', '2026-05-13T09:00Z', null,   58.20),

    -- ── Сергей: closed +385 → balance 5385; open +296 (live) ──────────────────
    (serg, 'LONG',  'XAUUSD', 0.2, 'TP 4670 / SL 4590',     380, 0, 150,  'closed', '2026-05-06T09:00Z', '2026-05-07T18:00Z', null),
    (serg, 'LONG',  'BTCUSD', 0.1, 'TP 81500 / SL 77500',   500, 0, 200,  'closed', '2026-05-08T10:00Z', '2026-05-10T11:00Z', null),
    (serg, 'SHORT', 'EURUSD', 0.4, 'TP 1.0790 / SL 1.0890', 320, 0, -85,  'closed', '2026-05-10T13:00Z', '2026-05-11T17:00Z', null),
    (serg, 'LONG',  'USDCAD', 0.3, 'TP 1.3920 / SL 1.3800', 280, 0, 120,  'closed', '2026-05-11T09:00Z', '2026-05-12T15:00Z', null),
    (serg, 'SHORT', 'XAUUSD', 0.2, 'TP 4580 / SL 4680',     380, 300, null, 'open', '2026-05-13T08:30Z', null, 4655.00),
    (serg, 'SHORT', 'EURUSD', 0.3, 'TP 1.0780 / SL 1.0890', 320, -30, null, 'open', '2026-05-13T09:00Z', null,    1.0840),
    (serg, 'LONG',  'USDJPY', 0.2, 'TP 153.00 / SL 151.00', 220,  26, null, 'open', '2026-05-13T10:00Z', null,  151.80),

    -- ── Иван: closed +25 → balance 1225; open +15 (live) ──────────────────────
    (ivan, 'LONG',  'EURUSD', 0.1, 'TP 1.0890 / SL 1.0790', 110, 0, -30,  'closed', '2026-05-07T11:00Z', '2026-05-08T15:00Z', null),
    (ivan, 'LONG',  'XAUUSD', 0.05,'TP 4650 / SL 4590',     230, 0,  55,  'closed', '2026-05-10T10:00Z', '2026-05-11T16:00Z', null),
    (ivan, 'SHORT', 'GBPUSD', 0.1, 'TP 1.2640 / SL 1.2780', 130,  15, null, 'open', '2026-05-13T09:30Z', null,    1.2715),

    -- ── Артём: closed +35 → balance 1835; open +70 (live) ─────────────────────
    (artm, 'LONG',  'XAUUSD', 0.1, 'TP 4660 / SL 4600',     250, 0,  85,  'closed', '2026-05-07T10:00Z', '2026-05-08T14:00Z', null),
    (artm, 'SHORT', 'EURUSD', 0.2, 'TP 1.0780 / SL 1.0890', 200, 0, -50,  'closed', '2026-05-09T11:00Z', '2026-05-10T16:00Z', null),
    (artm, 'LONG',  'GBPUSD', 0.1, 'TP 1.2780 / SL 1.2640', 150,  20, null, 'open', '2026-05-13T08:30Z', null,    1.2680),
    (artm, 'SHORT', 'XAUUSD', 0.05,'TP 4580 / SL 4690',     180,  50, null, 'open', '2026-05-13T10:00Z', null, 4650.00),

    -- ── Никита: closed +385 → balance 6885; open +389 (live) ──────────────────
    (nktt, 'LONG',  'BTCUSD', 0.15,'TP 81500 / SL 78500',   600, 0, 220,  'closed', '2026-05-06T09:30Z', '2026-05-07T17:00Z', null),
    (nktt, 'LONG',  'XAUUSD', 0.3, 'TP 4680 / SL 4590',     420, 0, 180,  'closed', '2026-05-08T10:00Z', '2026-05-09T16:00Z', null),
    (nktt, 'SHORT', 'GBPUSD', 0.3, 'TP 1.2640 / SL 1.2780', 250, 0, -90,  'closed', '2026-05-10T11:00Z', '2026-05-11T14:00Z', null),
    (nktt, 'LONG',  'USDCAD', 0.25,'TP 1.3920 / SL 1.3800', 240, 0,  75,  'closed', '2026-05-11T15:00Z', '2026-05-12T17:00Z', null),
    (nktt, 'LONG',  'BTCUSD', 0.1, 'TP 82000 / SL 78000',   600,  50, null, 'open', '2026-05-13T08:00Z', null, 79500.00),
    (nktt, 'LONG',  'XAUUSD', 0.2, 'TP 4700 / SL 4600',     380, 240, null, 'open', '2026-05-13T09:00Z', null, 4628.00),
    (nktt, 'SHORT', 'USDJPY', 0.3, 'TP 151.00 / SL 153.00', 280,  99, null, 'open', '2026-05-13T10:30Z', null,  152.50),

    -- ── Павел: closed -7 → balance 893; open -5 (live) ───────────────────────
    (pavl, 'SHORT', 'XAUUSD', 0.05,'TP 4580 / SL 4670',     200, 0, -25,  'closed', '2026-05-07T11:00Z', '2026-05-08T15:30Z', null),
    (pavl, 'LONG',  'GBPUSD', 0.1, 'TP 1.2780 / SL 1.2650', 120, 0,  18,  'closed', '2026-05-10T10:00Z', '2026-05-11T13:00Z', null),
    (pavl, 'LONG',  'EURUSD', 0.05,'TP 1.0930 / SL 1.0790',  80,  -5, null, 'open', '2026-05-13T09:00Z', null,    1.0860),

    -- ── Роман: closed +160 → balance 4360; open +112 (live) ──────────────────
    (romn, 'LONG',  'EURUSD', 0.3, 'TP 1.0900 / SL 1.0790', 280, 0, 115,  'closed', '2026-05-06T11:00Z', '2026-05-07T15:00Z', null),
    (romn, 'SHORT', 'BTCUSD', 0.05,'TP 78500 / SL 81000',   400, 0, -45,  'closed', '2026-05-08T09:00Z', '2026-05-09T17:00Z', null),
    (romn, 'LONG',  'XAUUSD', 0.15,'TP 4670 / SL 4590',     350, 0,  90,  'closed', '2026-05-10T10:00Z', '2026-05-11T16:30Z', null),
    (romn, 'LONG',  'USDCAD', 0.2, 'TP 1.3920 / SL 1.3780', 200,  22, null, 'open', '2026-05-13T08:30Z', null,    1.3835),
    (romn, 'LONG',  'XAUUSD', 0.15,'TP 4720 / SL 4600',     350,  90, null, 'open', '2026-05-13T09:30Z', null, 4634.00),

    -- ── Денис: closed -105 → balance 2095; open -140 (live) ──────────────────
    (dens, 'LONG',  'BTCUSD', 0.05,'TP 81000 / SL 78500',   400, 0, -80,  'closed', '2026-05-06T10:00Z', '2026-05-07T16:00Z', null),
    (dens, 'SHORT', 'XAUUSD', 0.1, 'TP 4580 / SL 4670',     280, 0, -55,  'closed', '2026-05-08T11:00Z', '2026-05-09T13:30Z', null),
    (dens, 'LONG',  'EURUSD', 0.15,'TP 1.0900 / SL 1.0800', 180, 0,  30,  'closed', '2026-05-10T12:00Z', '2026-05-11T15:00Z', null),
    (dens, 'SHORT', 'GBPUSD', 0.1, 'TP 1.2620 / SL 1.2780', 150, -15, null, 'open', '2026-05-13T08:00Z', null,    1.2685),
    (dens, 'LONG',  'XAGUSD', 0.1, 'TP 60.00 / SL 56.00',   290,-125, null, 'open', '2026-05-13T10:00Z', null,   58.10),

    -- ── Олег: closed +390 → balance 6190; open +120 (live) ───────────────────
    (oleg, 'LONG',  'XAUUSD', 0.25,'TP 4680 / SL 4590',     450, 0, 160,  'closed', '2026-05-06T10:30Z', '2026-05-07T17:30Z', null),
    (oleg, 'LONG',  'BTCUSD', 0.1, 'TP 81500 / SL 78000',   550, 0, 200,  'closed', '2026-05-08T09:30Z', '2026-05-09T15:00Z', null),
    (oleg, 'SHORT', 'EURUSD', 0.3, 'TP 1.0790 / SL 1.0890', 260, 0, -60,  'closed', '2026-05-10T11:00Z', '2026-05-11T14:00Z', null),
    (oleg, 'LONG',  'USDJPY', 0.25,'TP 153.00 / SL 151.00', 240, 0,  90,  'closed', '2026-05-11T10:00Z', '2026-05-12T17:00Z', null),
    (oleg, 'SHORT', 'BTCUSD', 0.05,'TP 78500 / SL 81500',   600,  40, null, 'open', '2026-05-13T08:30Z', null, 80800.00),
    (oleg, 'LONG',  'EURUSD', 0.4, 'TP 1.0930 / SL 1.0780', 320,  80, null, 'open', '2026-05-13T09:00Z', null,    1.0830),

    -- ── Виталий: closed +75 → balance 3575; open +253 (live) ──────────────────
    (vitl, 'LONG',  'GBPUSD', 0.2, 'TP 1.2780 / SL 1.2640', 200, 0, 120,  'closed', '2026-05-07T10:00Z', '2026-05-08T16:00Z', null),
    (vitl, 'SHORT', 'BTCUSD', 0.05,'TP 78000 / SL 81000',   400, 0, -45,  'closed', '2026-05-09T11:00Z', '2026-05-10T15:00Z', null),
    (vitl, 'LONG',  'USDJPY', 0.2, 'TP 153.00 / SL 151.00', 220,  53, null, 'open', '2026-05-13T08:30Z', null,  151.60),
    (vitl, 'SHORT', 'XAUUSD', 0.1, 'TP 4580 / SL 4690',     320, 200, null, 'open', '2026-05-13T09:30Z', null, 4660.00),

    -- ── Антон: closed -55 → balance 1045; open -75 (live) ────────────────────
    (antn, 'LONG',  'EURUSD', 0.1, 'TP 1.0900 / SL 1.0780', 110, 0, -45,  'closed', '2026-05-07T12:00Z', '2026-05-08T15:00Z', null),
    (antn, 'SHORT', 'GBPUSD', 0.1, 'TP 1.2640 / SL 1.2780', 130, 0, -30,  'closed', '2026-05-09T10:00Z', '2026-05-10T14:00Z', null),
    (antn, 'LONG',  'USDCAD', 0.1, 'TP 1.3900 / SL 1.3800', 100, 0,  20,  'closed', '2026-05-11T11:00Z', '2026-05-12T15:00Z', null),
    (antn, 'LONG',  'XAUUSD', 0.05,'TP 4720 / SL 4610',     230, -75, null, 'open', '2026-05-13T09:00Z', null, 4655.00),

    -- ── Максим: closed +490 → balance 7490; open +740 (live) ─────────────────
    (mxsm, 'LONG',  'XAUUSD', 0.4, 'TP 4690 / SL 4590',     580, 0, 280,  'closed', '2026-05-06T09:00Z', '2026-05-07T18:00Z', null),
    (mxsm, 'LONG',  'BTCUSD', 0.1, 'TP 82000 / SL 78000',   600, 0, 150,  'closed', '2026-05-08T10:00Z', '2026-05-09T17:00Z', null),
    (mxsm, 'SHORT', 'EURUSD', 0.4, 'TP 1.0780 / SL 1.0900', 320, 0,-120,  'closed', '2026-05-10T11:00Z', '2026-05-11T13:00Z', null),
    (mxsm, 'LONG',  'USDJPY', 0.3, 'TP 153.00 / SL 151.00', 280, 0, 180,  'closed', '2026-05-11T09:30Z', '2026-05-12T16:00Z', null),
    (mxsm, 'LONG',  'XAUUSD', 0.4, 'TP 4720 / SL 4600',     580, 600, null, 'open', '2026-05-13T08:00Z', null, 4625.00),
    (mxsm, 'SHORT', 'GBPUSD', 0.3, 'TP 1.2620 / SL 1.2790', 250, 120, null, 'open', '2026-05-13T09:00Z', null,    1.2740),
    (mxsm, 'LONG',  'BTCUSD', 0.1, 'TP 82000 / SL 78500',   600,  20, null, 'open', '2026-05-13T10:00Z', null, 79800.00);
end $$;

commit;
