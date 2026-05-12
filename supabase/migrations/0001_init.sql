-- ─────────────────────────────────────────────────────────────────────────────
-- Trading-competition dashboard — initial schema
-- Публичное чтение (anon SELECT) на всех таблицах, запись только для service_role.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- =====================
-- TABLES
-- =====================

-- Метаданные соревнования (одна строка; держим как таблицу для гибкости).
create table public.competition_meta (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  note        text not null default 'Данные обновляются раз в день, в конце торгового дня',
  updated_at  timestamptz not null default now()
);

-- Участники соревнования.
create table public.participants (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  color           text not null,                       -- hex, напр. "#22d3ee"
  avatar_url      text,                                 -- nullable → показываем инициалы
  available_cash  numeric(14, 2) not null default 0,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- Точки баланса участника во времени (equity curve).
create table public.balance_points (
  id              uuid primary key default uuid_generate_v4(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  ts              timestamptz not null,
  value           numeric(14, 2) not null,
  created_at      timestamptz not null default now(),
  unique (participant_id, ts)
);

create index balance_points_participant_ts_idx on public.balance_points (participant_id, ts);

-- Позиции (открытые и закрытые сделки).
create table public.positions (
  id              uuid primary key default uuid_generate_v4(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  side            text not null check (side in ('LONG', 'SHORT')),
  instrument      text not null,
  lot             numeric(12, 4) not null default 0,
  exit_plan       text not null default '',
  unrealized_pnl  numeric(14, 2) not null default 0,
  status          text not null default 'open' check (status in ('open', 'closed')),
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz
);

create index positions_participant_status_idx on public.positions (participant_id, status);

-- Цены тикеров в верхней строке дашборда.
create table public.tickers (
  symbol      text primary key,                         -- XAUUSD, EURUSD, BTCUSD, ...
  price       numeric(16, 6) not null default 0,
  change_24h  numeric(8, 4) not null default 0,         -- изменение за сутки в %
  updated_at  timestamptz not null default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
-- Включаем RLS на всех таблицах. anon/authenticated получают только SELECT.
-- Запись (insert/update/delete) идёт только через service_role ключ, который
-- обходит RLS — поэтому отдельные write-политики не нужны.

alter table public.competition_meta enable row level security;
alter table public.participants     enable row level security;
alter table public.balance_points   enable row level security;
alter table public.positions        enable row level security;
alter table public.tickers          enable row level security;

create policy "public read competition_meta" on public.competition_meta
  for select using (true);

create policy "public read participants" on public.participants
  for select using (true);

create policy "public read balance_points" on public.balance_points
  for select using (true);

create policy "public read positions" on public.positions
  for select using (true);

create policy "public read tickers" on public.tickers
  for select using (true);

-- =====================
-- SEED (опционально — те же плейсхолдеры, что в data/competition.ts)
-- Раскомментировать при первом наполнении, либо заполнить через /admin.
-- =====================
-- insert into public.competition_meta (title, start_date, end_date)
-- values ('Реалити-торговля: 2 недели', '2026-05-13', '2026-05-27');
