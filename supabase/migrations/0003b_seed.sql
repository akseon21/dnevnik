-- ─────────────────────────────────────────────────────────────────────────────
-- v6 — reseed под trade-centric модель.
-- Прогнать ПОСЛЕ 0003_trade_centric.sql. Полностью перезаливает плейсхолдеры:
-- участников (с starting_deposit), их закрытые сделки (с realized_pnl + closed_at,
-- чтобы строился timeline) и пару открытых сделок (с margin + unrealized_pnl).
-- Содержимое синхронизировано с data/competition.ts (статический fallback).
--
-- ВНИМАНИЕ: это плейсхолдеры. Замени на реальных участников и реальные стартовые
-- депозиты, потом — веди сделки через /admin.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- чистим старое (positions удалятся каскадом по FK при удалении participants,
-- но balance_points тоже завязаны на participants — тоже уйдут)
delete from public.positions;
delete from public.balance_points;
delete from public.participants;
delete from public.competition_meta;
delete from public.tickers;

-- ── meta ─────────────────────────────────────────────────────────────────────
insert into public.competition_meta (title, start_date, end_date, note) values
  ('Реалити-торговля: 2 недели', '2026-05-13', '2026-05-27',
   'Баланс и equity считаются автоматически из сделок');

-- ── tickers ──────────────────────────────────────────────────────────────────
insert into public.tickers (symbol, price, change_24h) values
  ('XAUUSD', 4682.5,  0.84),
  ('XAGUSD', 58.12,  -0.42),
  ('EURUSD', 1.0915,  0.12),
  ('GBPUSD', 1.2734, -0.18),
  ('USDJPY', 152.36,  0.31),
  ('BTCUSD', 71240,   2.15);

-- ── participants + positions ─────────────────────────────────────────────────
do $$
declare
  kir uuid; alx uuid; pvl uuid; lrs uuid; rsl uuid;
begin
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Кирилл', '#22d3ee', null, 1500, 0, 0) returning id into kir;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Алексей', '#a78bfa', null, 1200, 0, 1) returning id into alx;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Павел', '#f472b6', null, 1000, 0, 2) returning id into pvl;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Lauris', '#4ade80', null, 1350, 0, 3) returning id into lrs;
  insert into public.participants (name, color, avatar_url, starting_deposit, available_cash, sort_order)
    values ('Руслан', '#fbbf24', null, 1100, 0, 4) returning id into rsl;

  -- closed trades (realized_pnl + closed_at → строят timeline) + open trades (margin + unrealized_pnl)
  insert into public.positions
    (participant_id, side, instrument, lot, exit_plan, margin, unrealized_pnl, realized_pnl, status, opened_at, closed_at) values
    -- Кирилл: +120, -45, +180, +75 closed → balance 1500+330=1830; open: +145 (margin 300), -42 (margin 180) → equity 1933, free 1830-480=1350
    (kir, 'LONG',  'EURUSD', 0.4, 'TP 1.0980 / SL 1.0880', 220, 0,  120, 'closed', '2026-05-13T10:00Z', '2026-05-14T16:00Z'),
    (kir, 'SHORT', 'GBPUSD', 0.3, 'TP 1.2680 / SL 1.2820', 200, 0,  -45, 'closed', '2026-05-15T09:00Z', '2026-05-16T12:00Z'),
    (kir, 'LONG',  'XAUUSD', 0.3, 'TP 4690 / SL 4600',     280, 0,  180, 'closed', '2026-05-16T10:00Z', '2026-05-17T15:00Z'),
    (kir, 'LONG',  'XAGUSD', 0.5, 'TP 59.0 / SL 57.0',     160, 0,   75, 'closed', '2026-05-18T10:00Z', '2026-05-18T17:00Z'),
    (kir, 'LONG',  'XAUUSD', 0.5, 'TP 4720 / SL 4650',     300, 145, null, 'open',  '2026-05-19T11:00Z', null),
    (kir, 'SHORT', 'USDJPY', 0.3, 'TP 151.20 / SL 153.10', 180, -42, null, 'open',  '2026-05-19T09:30Z', null),
    -- Алексей: -20, +95, +205 closed → balance 1200+280=1480; open: +64 (margin 320) → equity 1544, free 1480-320=1160
    (alx, 'SHORT', 'BTCUSD', 0.1, 'TP 70000 / SL 73000',   400, 0,  -20, 'closed', '2026-05-13T11:00Z', '2026-05-14T18:00Z'),
    (alx, 'LONG',  'EURUSD', 0.5, 'TP 1.0960 / SL 1.0860', 250, 0,   95, 'closed', '2026-05-15T10:00Z', '2026-05-16T16:00Z'),
    (alx, 'LONG',  'XAUUSD', 0.4, 'TP 4700 / SL 4620',     300, 0,  205, 'closed', '2026-05-17T10:00Z', '2026-05-18T14:00Z'),
    (alx, 'LONG',  'XAGUSD', 1.0, 'TP 59.50 / SL 57.40',   320, 64, null, 'open',  '2026-05-19T10:15Z', null),
    -- Павел: -65, -40, -80 closed → balance 1000-185=815; open: -85 (margin 350) → equity 730, free 815-350=465
    (pvl, 'LONG',  'GBPUSD', 0.4, 'TP 1.2850 / SL 1.2680', 220, 0,  -65, 'closed', '2026-05-13T10:30Z', '2026-05-14T15:00Z'),
    (pvl, 'SHORT', 'XAUUSD', 0.3, 'TP 4600 / SL 4700',     260, 0,  -40, 'closed', '2026-05-15T11:00Z', '2026-05-16T13:00Z'),
    (pvl, 'LONG',  'EURUSD', 0.5, 'TP 1.0980 / SL 1.0880', 250, 0,  -80, 'closed', '2026-05-17T09:00Z', '2026-05-18T11:00Z'),
    (pvl, 'SHORT', 'BTCUSD', 0.1, 'TP 68000 / SL 73500',   350, -85, null, 'open', '2026-05-18T14:00Z', null),
    -- Lauris: +70, +210, -45 closed → balance 1350+235=1585; open: -35 (margin 240) → equity 1550, free 1585-240=1345
    (lrs, 'LONG',  'XAGUSD', 0.6, 'TP 59.0 / SL 57.0',     200, 0,   70, 'closed', '2026-05-13T10:00Z', '2026-05-14T17:00Z'),
    (lrs, 'LONG',  'XAUUSD', 0.3, 'TP 4690 / SL 4600',     280, 0,  210, 'closed', '2026-05-14T10:00Z', '2026-05-16T15:00Z'),
    (lrs, 'SHORT', 'USDJPY', 0.4, 'TP 150.50 / SL 153.50', 230, 0,  -45, 'closed', '2026-05-17T10:00Z', '2026-05-18T12:00Z'),
    (lrs, 'LONG',  'GBPUSD', 0.6, 'TP 1.2850 / SL 1.2680', 240, -35, null, 'open', '2026-05-19T08:00Z', null),
    -- Руслан: +40, -90, +80 closed → balance 1100+30=1130; нет открытых → equity 1130, free 1130
    (rsl, 'LONG',  'EURUSD', 0.4, 'TP 1.0960 / SL 1.0870', 200, 0,   40, 'closed', '2026-05-13T12:00Z', '2026-05-14T16:00Z'),
    (rsl, 'LONG',  'BTCUSD', 0.1, 'TP 73000 / SL 69000',   400, 0,  -90, 'closed', '2026-05-15T10:00Z', '2026-05-16T14:00Z'),
    (rsl, 'SHORT', 'XAGUSD', 0.5, 'TP 56.0 / SL 59.0',     180, 0,   80, 'closed', '2026-05-17T11:00Z', '2026-05-18T15:00Z');
end $$;

commit;
