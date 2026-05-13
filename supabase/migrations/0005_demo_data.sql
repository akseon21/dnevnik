-- ─────────────────────────────────────────────────────────────────────────────
-- v9.1 — ДЕМО-ДАННЫЕ ДЛЯ ПОКАЗА LIVE-PNL
--
-- Полностью перезаливает плейсхолдеры под демонстрацию live-обновления PnL
-- через TwelveData. 6 участников с депозитами 1200–5000 $, 2–4 закрытые сделки
-- у каждого за прошедшую неделю (для красивой equity-истории), 1–3 открытые
-- позиции с entry_price ≈ актуальной рыночной цене на 2026-05-13:
--   XAUUSD ~4640, EURUSD ~1.0850, GBPUSD ~1.2700,
--   USDCAD ~1.3850, USDJPY ~152.0, BTCUSD ~80000.
--
-- Содержимое синхронизировано с data/competition.ts (статический fallback).
--
-- ВНИМАНИЕ: это всё ещё плейсхолдеры (вымышленные имена, без фамилий).
-- Замени на реальных участников через /admin (теперь умеет entry_price).
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
begin
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
    (ivan, 'SHORT', 'GBPUSD', 0.1, 'TP 1.2640 / SL 1.2780', 130,  15, null, 'open', '2026-05-13T09:30Z', null,    1.2715);
end $$;

commit;
