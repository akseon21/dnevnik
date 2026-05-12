-- ─────────────────────────────────────────────────────────────────────────────
-- Trading-competition dashboard — v3: список наблюдения (watchlist)
-- Инструменты, которые участники присматривают, но ещё не открыли позицию.
-- Публичное чтение (anon SELECT), запись только service_role (обходит RLS).
-- Прогнать через Supabase SQL Editor (или `supabase db push`).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.watchlist (
  id                uuid primary key default uuid_generate_v4(),
  instrument        text not null,                       -- тикер, напр. XAGUSD
  note              text not null default '',            -- комментарий
  participant_names text[] not null default '{}',        -- имена тех, кто присматривает
  created_at        timestamptz not null default now()
);

alter table public.watchlist enable row level security;

create policy "public read watchlist" on public.watchlist
  for select using (true);

-- =====================
-- SEED (placeholder-записи; раскомментировать при первом наполнении или добавить через /admin)
-- =====================
insert into public.watchlist (instrument, note, participant_names) values
  ('XAGUSD', 'ждём отбой от уровня',          array['Кирилл', 'Алексей']),
  ('AUDUSD', 'смотрю на новостях RBA',        array['Руслан']),
  ('GBPUSD', 'после CPI',                     array['Lauris']);
