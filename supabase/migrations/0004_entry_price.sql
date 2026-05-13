-- v9 — entry_price для live-расчёта нереализованного PnL открытых позиций.
-- Опциональная колонка: NULL → fallback на ручной positions.unrealized_pnl
-- (старый поток админки сохраняется, дашборд не падает).
--
-- См. lib/pnl.ts (формулы по инструментам) + app/api/prices/route.ts
-- (TwelveData батч-запрос с кешем) + app/components/useLivePrices.ts
-- (клиентский поллинг). Цена входа задаётся при открытии сделки в /admin.

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS entry_price numeric;

COMMENT ON COLUMN positions.entry_price IS
  'Цена входа в сделку. Если задана — нереализ. PnL пересчитывается на лету из текущей рыночной цены TwelveData. Если NULL — используется ручной positions.unrealized_pnl.';
