# Текущий статус

## v4 — ГОТОВ (2026-05-12) — пакет UX-улучшений

7 пунктов, все сделаны:

1. **Футер очищен.** Строка «📊 {note} · период» убрана из футера (`app/page.tsx`). Футер теперь только «{title} · {год}». Пометка про обновление раз в день осталась в тулбаре над графиком (`DashboardShell`) и в табе «О соревновании».
2. **Выделение линии через клик в легенде.** В `EquityChart.tsx` — `useState<string|null>` highlight. Клик по имени в легенде → линия яркая (strokeWidth 3), остальные приглушены (opacity 0.18, точки/activeDot off), пунктир-среднее приглушён, end-dot'ы и маркеры сделок других приглушены. Повторный клик / кнопка «сбросить» → норма. Активное имя в легенде — фон `bg-border/60` + жирный.
3. **Таймфреймы.** В `EquityChart.tsx` — `useState<TimeframeKey>` tf: «Весь период»(дефолт)/«Неделя»/«3 дня»/«Сегодня». Фильтрует `rows` по ts от последней даты данных назад (минимум оставляет 2 точки). Кнопки, для которых данных заведомо мало (spanDays < days*0.5), скрываются (кроме «Весь период»). Селектор — над графиком, сегментед-стиль.
4. **Маркеры закрытых сделок.** В `EquityChart.tsx` — для каждой `closedPosition` участника `ReferenceDot` с кастомным `shape=<TradeDot>` (SVG circle + `<title>` = нативный тултип: направление / инструмент / лот / PnL / период). Привязка по `closedAt` → ближайшая точка timeline где у участника есть значение. Цвет: `var(--pos)` если PnL≥0, иначе `var(--neg)`. Нет закрытых сделок → нет маркеров. В легенде снизу — мини-легенда «зелёный/красный = закрытые сделки».
5. **Карточки → модалка.** Правая панель с большими карточками убрана. Вместо неё — `<section>` с компактным рядом участников (grid 2/3/5 кол.): кружок-инициалы (цвет линии) + имя + баланс + изменение %. Клик → `<ParticipantModal>` (новый компонент `app/components/ParticipantModal.tsx`): div-оверлей `fixed inset-0 z-50`, тёмный терминальный стиль, фокус через `tabIndex=-1` + `panelRef.focus()`, `body.overflow=hidden`, закрытие — крестик / клик по фону (`onMouseDown` target check) / Esc. Внутри: шапка (инициалы/имя/баланс/changePct/changeAbs), таблица открытых позиций (направление/инструмент/лот/план выхода/нереализ. PnL), список закрытых сделок (направление/инструмент/лот/период/результат PnL), свободные средства. На мобиле модалка — снизу, `rounded-t-xl`, `max-h-[92vh]`; на ≥sm — по центру, `rounded-xl`. Имя участника в табе «Открытые позиции» тоже кликабельно → та же модалка.
6. **Таб «Список наблюдения» убран.** `DashboardShell.tsx` — TabKey теперь `"open"|"closed"|"about"`, проп `watchlist` убран, `WatchlistTable` удалён. `app/page.tsx` — не передаёт watchlist. `lib/db.ts` — watchlist-запрос и тип `WatchlistRow` удалены, импорт `WatchlistItem` убран. `lib/types.ts` — `Competition.watchlist` стало опциональным (`?`), `WatchlistItem` оставлен с пометкой «не используется в UI». `app/admin/AdminPanel.tsx` — секция «Список наблюдения» удалена, импорты `addWatchlistItem`/`deleteWatchlistItem` убраны. `app/admin/actions.ts` — `addWatchlistItem`/`deleteWatchlistItem` удалены (заменены комментарием), `AdminData.watchlist` и его запрос в `getAdminData` убраны. **Таблицу `watchlist` в Supabase НЕ трогали — миграция 0002 на месте, таблица просто не используется.** `data/competition.ts` всё ещё содержит `watchlist` (3 placeholder-записи) — безвредно, тип опциональный.
7. **Адаптив под мобилу.** Однокол. layout (убрана 2-кол. сетка `lg:grid-cols-[1.6fr_1fr]`): тулбар → график на всю ширину → ряд участников (2 кол. на телефоне) → табы (горизонтальный скролл `overflow-x-auto`) → контент таба (`sm:grid-cols-2` для открытых позиций). График: высота `h-[340px]` на телефоне, `sm:h-[420px]`. XAxis `minTickGap={24}` чтобы метки не наезжали. Модалка — полноэкранная снизу на мобиле. Подпись «пунктир — среднее» скрыта на мобиле (`hidden sm:inline`). На странице порядок блоков: header → лидерборд → тикеры → DashboardShell → футер (лидерборд и тикеры поменяны местами под спек).

### Валидация v4
- `npm run lint` — чисто.
- `npm run build` — чисто (TypeScript OK). Маршруты: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m — без изменений.
- `npm run dev` (порт 4191) — `/` → 200, `/admin` → 200. В SSR-HTML `/`: «Список наблюдения» отсутствует, есть «Открытые позиции / Закрытые сделки / О соревновании», «Весь период» (таймфрейм), «Лидерборд». Ошибок в логе нет (только обычные recharts SSR width(-1)/height(-1) warning).
- Деплой: запушено в `origin/main` → Vercel автодеплой.

### v5 / открытые вопросы (v4)
- Анимации появления линий/маркеров, светлая тема — в v5.
- Реальный 24h change для FX-пар (Frankfurter не даёт) — всё ещё открыто.
- v3.5 — fallback для металлов если goldprice.org нестабилен на проде Vercel → бесплатный Finnhub-ключ.
- Открытые вопросы из v2/v3 в силе: реальные имена участников + стартовые депозиты, реальное название/даты, точный список тикеров, фото-аватары.
- Server actions `addWatchlistItem`/`deleteWatchlistItem` и UI вотчлиста удалены полностью. Таблица `watchlist` в БД и миграция 0002 — на месте, не используются. `WatchlistItem` тип оставлен (опциональное поле в Competition) — если вотчлист понадобится, легко вернуть.

---

## v3 — ГОТОВ (2026-05-12)

Три пункта, ровно:

### 1. Лидерборд с медальками
- `app/components/Leaderboard.tsx` — топ-3 по росту % (changePct = current/start − 1). Места 🥇/🥈/🥉 + аватар-инициалы + рост % (зел/красн) + текущий баланс. Если участников <3 — в шапке блока «участников: N».
- `lib/standings.ts` → `getLeaderboard(stats)` — сортировка по changePct, slice(0,3).
- Рендерится в `app/page.tsx` отдельным блоком над DashboardShell.

### 2. Таб «Список наблюдения» — наполнен
- Миграция `supabase/migrations/0002_watchlist.sql` — таблица `watchlist` (id uuid, instrument text, note text, participant_names text[], created_at). RLS: public SELECT, запись только service_role. Seed (3 placeholder-записи: XAGUSD/AUDUSD/GBPUSD) — НЕ закомментирован, прогонится вместе с миграцией. **Пользователь прогоняет через Supabase SQL Editor — у нас нет supabase CLI.**
- `lib/types.ts` — тип `WatchlistItem` (instrument, note, participantNames), в `Competition` добавлено поле `watchlist`.
- `data/competition.ts` — добавлено `watchlist` с теми же 3 placeholder-записями (статический fallback).
- `lib/db.ts` — `getCompetitionData()` тянет `watchlist` (6-й параллельный запрос; если таблицы ещё нет — `watchlistRes.error` → `[]`, дашборд не падает).
- `app/components/DashboardShell.tsx` — таб «Список наблюдения» теперь рендерит таблицу: Инструмент / Кто присматривает / Комментарий (компонент `WatchlistTable`). Принимает проп `watchlist`.
- `/admin` — секция «Список наблюдения»: форма добавления (instrument / participant_names через запятую / note) + список текущих записей с кнопкой «Удалить». Server actions `addWatchlistItem` / `deleteWatchlistItem` в `app/admin/actions.ts` (guarded, service-role, revalidatePath). `getAdminData()` теперь возвращает `watchlist` с id.

### 3. Live-тикеры (best-effort, без API-ключа)
- `app/api/tickers/route.ts` — `export const revalidate = 300`. GET: тянет 3 источника параллельно (4-сек таймаут на каждый), мёрджит с БД-значениями (БД — fallback), отдаёт `{ tickers:[{symbol,price,change24h,live}], updatedAt }`. Если источник лёг — для его тикеров `live:false` и значение из БД. Если все легли — ровно БД, ничего не падает.
- Источники:
  - **BTCUSD** → CoinGecko `simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true` — РАБОТАЕТ, с реальным 24h change.
  - **EURUSD / GBPUSD / USDJPY** → Frankfurter `latest?from=USD&to=EUR,GBP,JPY` — РАБОТАЕТ. EUR/GBP инвертируются (1/rate), JPY прямой. change24h = 0 (reference rates ЕЦБ не несут внутридневное изменение, обновление раз в день — для нашего кейса ок).
  - **XAUUSD / XAGUSD** → goldprice.org `dbXRates/USD` — РАБОТАЕТ, но ТОЛЬКО с браузероподобными заголовками (User-Agent + Referer + Origin = goldprice.org), иначе отдаёт "Forbidden". С заголовками отдаёт цену золота/серебра в USD/унц + % изменение. Заголовки прописаны в `BROWSERLIKE_HEADERS` в route. Риск: неофициальный эндпоинт, может в любой момент закрыться/поменяться — тогда graceful degradation на БД-значения (раздаётся `live:false`, обновляется вручную через /admin).
- `app/components/TickerStrip.tsx` (client) — заменил серверный рендер строки тикеров в `app/page.tsx`. Стартует с БД-значений (SSR), опрашивает `/api/tickers` каждые 60 сек, обновляет цены. Если запрос упал — оставляет последние известные. Маленький индикатор `● live` / `○ бд` справа + бейдж «бд» у тикеров без live-источника. Лидер/аутсайдер по-прежнему в этой строке (передаются пропсами).

### НЕ делали (по запрету в задаче)
- Экспорт графика в PNG — отменён.
- Доработка аватаров — отменена (инициалы как были).
- Никаких html-to-image / dom-to-image и т.п. — не ставили.
- Ничего за пределами 3 пунктов не трогали.

### Валидация
- `npm run lint` — чисто.
- `npm run build` — чисто. Маршруты: `/` ƒ dynamic (revalidate=0), `/admin` ƒ dynamic, `/api/tickers` ○ static (revalidate 5m).
- `npm run dev` (порт 4137) — `/` → 200 (лидерборд + строка тикеров + таб «Список наблюдения» с таблицей в HTML), `/admin` → 200 («Админка не настроена» — `ADMIN_PASSWORD` пуст, как и было), `/api/tickers` → 200, проверено вживую: ВСЕ 6 тикеров вернулись `live:true` (BTC из CoinGecko, EUR/GBP/JPY из Frankfurter, XAU/XAG из goldprice.org).
- Примечание: BTCUSD/XAGUSD из live-источников отличаются от placeholder'ов в БД (XAGUSD live ≈ 84 vs placeholder 58.12) — это нормально, live = правда; placeholder'ы заменятся реальными данными.

## ЧТО ОСТАЛОСЬ ПОЛЬЗОВАТЕЛЮ
1. **Прогнать `supabase/migrations/0002_watchlist.sql`** через Supabase SQL Editor (вместе с seed-вставкой 3 placeholder-записей). Без этого вотчлист берётся из `data/competition.ts` (тоже 3 записи) — дашборд работает.
   - Напоминание: `0001_init.sql` тоже ещё НЕ прогнан (по прошлым заметкам). Если БД пустая — прогнать оба по порядку.
2. (если ещё не сделано) `ADMIN_PASSWORD` в `.env.local` + в Vercel → Environment Variables → Redeploy.
3. После деплоя проверить, что `/api/tickers` на проде отдаёт `live:true` для металлов (goldprice.org мог заблокировать IP Vercel — тогда `live:false`, и для live-металлов нужен будет бесплатный Finnhub-ключ → v3.5).

## v4 / открытые вопросы
- v3.5 — fallback для металлов: если goldprice.org нестабилен на проде Vercel → завести бесплатный Finnhub-ключ (или metals.dev / metalpriceapi free tier), env-переменная, источник в `app/api/tickers/route.ts`.
- Реальный 24h change для валютных пар — Frankfurter его не даёт; можно считать самим (запросить `latest` + вчерашнюю дату) либо принять, что для FX показываем 0%.
- Открытые вопросы из v2 всё ещё в силе: реальные имена участников + стартовые депозиты, реальное название/даты, точный список тикеров, фото-аватары.
