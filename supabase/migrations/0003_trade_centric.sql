-- ─────────────────────────────────────────────────────────────────────────────
-- v6 — trade-centric model
-- Баланс / equity / свободные средства больше НЕ вводятся руками — они вычисляются
-- из сделок (positions). Вводятся только: starting_deposit участника и сами сделки
-- (открытие → margin + unrealized_pnl=0; обновление floating PnL; закрытие → realized_pnl).
--
-- Прогнать через Supabase SQL Editor (у нас нет supabase CLI). Идемпотентно (IF NOT EXISTS).
-- После — прогнать 0003b_seed.sql чтобы перезалить плейсхолдеры под новую модель.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── participants: стартовый депозит ──────────────────────────────────────────
alter table public.participants
  add column if not exists starting_deposit numeric(14, 2) not null default 0;

-- available_cash больше не используется (станет вычисляемым в коде) — колонку
-- оставляем, чтобы не ломать существующие данные/insert'ы, но дашборд её игнорирует.

-- ── positions: расширение под полноценную сделку ─────────────────────────────
alter table public.positions
  add column if not exists margin       numeric(14, 2) not null default 0,
  add column if not exists realized_pnl numeric(14, 2);            -- nullable, ставится при закрытии

-- side / instrument / lot / exit_plan / unrealized_pnl / status / opened_at / closed_at
-- уже есть из 0001_init.sql. unrealized_pnl теперь = текущий плавающий PnL (0 при открытии,
-- обновляется вручную пока сделка открыта). realized_pnl = финальный результат при закрытии.

-- balance_points (из 0001) больше не используется для отображения — timeline теперь
-- выводится из закрытых сделок. Таблицу не дропаем (не мешает), но и не читаем.

-- RLS / политики чтения уже включены в 0001 для participants и positions — ничего не меняем.
