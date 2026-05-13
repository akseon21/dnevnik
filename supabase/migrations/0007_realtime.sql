-- ─────────────────────────────────────────────────────────────────────────────
-- v10 — Включаем Supabase Realtime publication для таблиц дашборда.
--
-- Без этой миграции Supabase Realtime не транслирует postgres_changes по таблицам,
-- даже если RLS разрешает SELECT. После прогона любой INSERT / UPDATE / DELETE
-- в этих таблицах отдаётся подписчикам канала на клиенте → дашборд обновляется
-- без F5.
--
-- Безопасно прогонять повторно: оборачиваем в DO-блок с проверкой членства
-- таблицы в публикации (`pg_publication_tables`). При повторном запуске —
-- no-op без ошибок.
--
-- Прогнать через Supabase SQL Editor (или `supabase db push` если используется CLI).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'participants',
    'positions',
    'balance_points',
    'competition_meta',
    'tickers'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
