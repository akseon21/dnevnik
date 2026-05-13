# Текущий статус

## v10.2 — догон по высоте графика + чистая мета-подпись (2026-05-13)

Две точечные правки в продолжение v10.1.

1. **Высота equity-графика поднята**: `h-[480px] sm:h-[600px] lg:h-[720px]` (было `420/520/580`). На lg график занимает ~70-75% видимой высоты дашборда, на sm 600px (планшет в портрете), на мобиле 480px (читаемо, дашборд скроллится — карточки участников снизу).

2. **Хвост `· live-PnL из TwelveData по цене входа` убран из мета-подписи** (caveat из v10.1 закрыт). UI-код DashboardShell.tsx НЕ менялся — подменили сам текст в источнике правды:
   - `data/competition.ts:86` → note = «Баланс и equity считаются автоматически из сделок» (статический fallback).
   - `supabase/migrations/0008_meta_note.sql` → идемпотентный UPDATE `competition_meta` (через `IS DISTINCT FROM` — повторный прогон = no-op). Кирилл прогоняет вручную в Supabase SQL Editor.

### Файлы
- `app/components/EquityChart.tsx` — одна строка (классы высоты).
- `data/competition.ts` — одна строка (note).
- `supabase/migrations/0008_meta_note.sql` — НОВЫЙ, ~12 строк.
- `.claude/agent-notes/{project-map,decisions,current-task}.md` — обновлены.

### Что НЕ менял
- Логику live-цен / Realtime / focus / контракты компонентов.
- Другие миграции, lib/db.ts, lib/standings.ts, lib/types.ts, lib/pnl.ts.
- DashboardShell.tsx (уже корректно склеивает note + ` · до следующего обновления: M:SS`).

### Валидация
- `npm run lint` — чисто (0 ошибок).
- `npm run build` — чисто (Turbopack 2.5s, TS OK). Маршруты прежние.
- `npm run test:pnl` — 19/19 pass.
- `npm run dev` — НЕ запускал (изменения чисто пресентационные).

### Caveat
- На проде с Supabase до прогона миграции 0008 текст останется со старым хвостом — БД источник правды. Статический fallback применяется только когда env Supabase не задан.
- После прогона Realtime (0007) подхватит UPDATE и обновит открытые вкладки автоматически.

### Suggested commit message
`feat(dashboard): taller equity chart + cleaner meta note (drop TwelveData tail)`

### Ниже — предыдущая запись (v10.1) для контекста
---

## v10.1 — UI-чистка после v10 (2026-05-13)

Серия мелких UI-правок поверх v10 по скрину Кирилла. Логика данных, миграции, контракты компонентов наружу — не тронуты, кроме одного: `EquityChart` потерял проп `onFocusChange` (был обвязан с удалённой легендой имён). Полное описание правок и файлы — в `decisions.md` → раздел «v10.1». Кратко:

1. Удалена интерактивная легенда EquityChart (имена + балансы + кнопка «сбросить») — дублировала боковую панель. Маленькая легенда «закрытые сделки» оставлена.
2. Высота canvas графика: 420 / 520 / 580 px (sm / lg) — было 340 / 420.
3. Удалён UI-индикатор «● live выкл / обновлено N сек назад» из тулбара. Стейл → `console.warn('[useLivePrices] stale: …')`.
4. Мета-подпись под графиком теперь живая: `📊 ${note} · до следующего обновления: M:SS`. Таймер 1 раз/сек, сбрасывается на каждый успешный fetch цен. Когда поллить нечего — суффикс пуст; когда канал стейл — «· обновление вручную».
5. Удалён правый ярлык шапки «Реалити-торговля · live-дашборд» — был дублем competition.title.
6. Удалён `<footer>` с `competition.title · YYYY` — тот же дубль.

### Файлы
- `app/components/EquityChart.tsx` — удалена легенда, удалён `onFocusChange`/`setHighlight`, увеличена высота.
- `app/components/DashboardShell.tsx` — удалён индикатор live, добавлен таймер в meta-подпись, добавлен `console.warn` на стейл, удалён `onFocusChange={...}` из вызова EquityChart.
- `app/page.tsx` — удалён правый блок шапки, удалён `<footer>`.

### Что НЕ менял
- БД, миграции, `lib/db.ts`, `lib/standings.ts`, `lib/types.ts`, `lib/pnl.ts`, `data/competition.ts`, `competition_meta.note` (см. caveat ниже).
- `useLiveCompetition`, `useLivePrices`, Realtime-логику.
- `EventTicker` (бегущая лента закрытых сделок) — это другие чипы (события, не балансы), на скрине не упомянут.
- Админку.

### Caveat
- Кирилл попросил мета-подпись ровно «📊 Баланс и equity считаются автоматически из сделок · до следующего обновления: 1:42». В коде сейчас выводится `📊 ${competition.note} · до следующего обновления: M:SS`. В БД (или в `data/competition.ts:86`) `note = 'Баланс и equity считаются автоматически из сделок · live-PnL из TwelveData по цене входа'` → итог НЕ дословно совпадает (останется хвост про «live-PnL из TwelveData по цене входа»). Чтобы попасть дословно — обновить `competition_meta.note` через `/admin` на «Баланс и equity считаются автоматически из сделок» (или поправить fallback в `data/competition.ts`). Я не стал менять источник правды без явной просьбы — Кирилл может захотеть оставить расширенное описание.

### Валидация
- `npm run lint` — чисто (0/0).
- `npm run build` — чисто (Turbopack 2.7s, TS OK). Маршруты прежние: `/` ƒ, `/admin` ƒ, `/api/prices` ƒ, `/api/tickers` ○ 5m. Ожидаемое `[db] ... falling back to static`.
- `npm run test:pnl` — 19/19 pass.
- `npm run dev` — НЕ запускал (нет надобности; SSR-снимок проверен build-ом, поведение таймера — pure derived state без асинхронщины).

### Ниже — предыдущая запись (v10) для контекста
---

## v10 — Live-sync через Supabase Realtime + focus-фильтр в боковой панели + URL-state (2026-05-13)

**Две связанные UX-задачи** после v9.2.

### Задача 2 — Фильтр участников переехал в боковую панель + выделение графика

**Что было.** Сверху дашборда висел дропдаун-фильтр «Все участники / Участники: N/M» с чекбоксами. Клик по карточке справа — открывал модалку. Клик-выделение линии работало через локальный `highlight` в `EquityChart` (легенда).

**Что стало.**
- **Удалена верхняя полоса фильтр-чипов** (дропдаун `setSelected/filterOpen/isAll/visible/toggle` из `DashboardShell.tsx`). График всегда показывает всех.
- **Новый «focus»-фильтр** (выделение одного участника):
  - Источник правды — URL `?focus=<имя>`. Никакого дублирующего локального state. Читаем через `useSearchParams()`, пишем через `router.replace(..., { scroll: false })`. Это даёт автоматом: переживание live re-fetch, шарабельную ссылку, back/forward, гидрационную консистентность (стартовое значение читается на сервере в `app/page.tsx` и передаётся `initialFocusedName` пропом → нет миганий).
  - **Закрытие модалки → set focus = этот участник** (по спеке: «остаётся выделенной его линия»). Если уже выделен — выделение остаётся. Если другой — переключается.
  - **Клик по тому же в боковой панели** = открывает модалку (на снятие — кнопка «Показать всех» или «Все» в заголовке графика, либо повторное открытие/закрытие модалки на том же — re-set, не toggle; снятие — отдельной кнопкой).
  - **Кнопки снятия фильтра**: «Все» в заголовке графика рядом с «график: <имя>» + «Показать всех» в шапке боковой панели (только когда фильтр активен).
- **Визуальный маркер «выбран» в боковой панели**: `ParticipantCard` получил пропсы `focused`/`dimmed`. Выбранная карточка — обводка цветом участника + лёгкая радужка градиента + маленькая стрелка `◀` слева от имени. Остальные — `opacity-40`.
- **График**: `EquityChart` теперь принимает `focusedName` + `onFocusChange` пропами (раньше держал `highlight` сам). Локальный state удалён — поведение полностью контролируется родителем. Линия выделенного — толще (strokeWidth 3 vs 2) и непрозрачная, остальные — `strokeOpacity 0.18`. Маркеры закрытых сделок и end-point-кружки на чужих линиях тоже dim-ятся.
- **Заголовок графика**: «график: <имя цвета участника>» когда фильтр активен; «график: все» когда нет. Рядом — кнопка «Все» для сброса.
- **`app/page.tsx`** — теперь `async` с `searchParams: Promise<...>`, читает `focus` из URL на сервере, валидирует против списка участников, передаёт `initialFocusedName` в `DashboardShell`. SSR не сломан.

**Файлы:**
- `app/components/DashboardShell.tsx` — большая правка: удалён старый фильтр, добавлен focus-flow + URL-sync, переписан `ParticipantCard`, добавлен подзаголовок графика.
- `app/components/EquityChart.tsx` — `highlight` теперь контролируется родителем через пропсы.
- `app/components/ParticipantModal.tsx` — НЕ менялся (контракт `onClose` остался; новое поведение задаётся в родителе).
- `app/page.tsx` — `searchParams` Promise + парсинг `focus`.

### Задача 1 — Live-sync участников/сделок/балансов через Supabase Realtime (вариант B)

**Выбран вариант B (Realtime websocket), не A (polling).** Обоснование:
- True realtime → изменение в `/admin` Кириллом отображается у зрителей за <1 сек, что соответствует «живой витрине».
- Supabase даёт фичу искаропки, дополнительных deps не нужно — у нас уже `@supabase/supabase-js`.
- Polling 30-60 сек = задержка до минуты + лишняя нагрузка на бесплатный tier при N зрителях × 2 req/мин.
- **Polling включён внутренне как fallback** — если Realtime канал не открылся (CHANNEL_ERROR / TIMED_OUT) или Supabase инициализация бросила, хук молча переключается на `setInterval(router.refresh, 45_000)`. То есть «B с автодеградацией в A», не «B вместо A».

**Архитектурное решение — `router.refresh()`, не дублирующий fetch на клиенте:**
- Хук `useLiveCompetition()` подписывается на `postgres_changes` по 5 таблицам и при любом событии вызывает `router.refresh()` (с дебаунсом 400 мс — несколько событий от одного admin-action склеиваются в один re-fetch).
- `router.refresh()` перезапускает RSC `getCompetitionData()` в `app/page.tsx`, мёрджит обновлённый payload и СОХРАНЯЕТ client state (фильтры, табы, focus в URL, открытую модалку, состояние графика). Не нужно ни SWR, ни React Query, ни клиентского кэша — Next 16 это уже делает (документировано в `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`: «merge the updated React Server Component payload without losing unaffected client-side React (e.g. useState) or browser state (e.g. scroll position)»).
- Это идиоматично для Next App Router и даёт минимальный сurface-area: ВСЯ логика fetch-а остаётся в одном месте (`lib/db.ts`), а клиент только триггерит revalidation.

**Дебаунс 400 мс**: одно server action в `/admin` (например `closeTrade` обновляет `positions` + `balance_points`) даёт 2-3 события WebSocket. Без дебаунса — 2-3 `router.refresh()` подряд. С дебаунсом — один.

**Graceful degradation:**
1. Нет `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` → no-op (статика, данные не меняются между рендерами, нечего обновлять).
2. Realtime publication для таблицы не настроена → channel.subscribe() придёт CHANNEL_ERROR → polling 45 сек.
3. WebSocket вообще не открывается (фаервол / лимит) → TIMED_OUT → polling.
4. createClient бросил → catch → polling.

**Файлы:**
- `app/components/useLiveCompetition.ts` — НОВЫЙ хук, ~110 строк. SSR-safe (всё в useEffect, без window-зависимостей в render). Без локального state — render возвращает void.
- `app/components/DashboardShell.tsx` — одна строчка вызова `useLiveCompetition()` в теле компонента.
- `supabase/migrations/0007_realtime.sql` — НОВАЯ миграция: `alter publication supabase_realtime add table participants, positions, balance_points, competition_meta, tickers`. Идемпотентна (DO-блок с проверкой `pg_publication_tables` — повторный прогон = no-op без ошибок).

**Что Кириллу сделать:**
1. **Прогнать `supabase/migrations/0007_realtime.sql`** в Supabase SQL Editor → активирует Realtime publication для 5 таблиц. Без этого хук переключится на polling-fallback (45 сек) — работать будет, но без мгновенности.
2. (опц.) В Supabase Dashboard → Database → Replication → проверить что таблицы в supabase_realtime publication отмечены (визуальное подтверждение того что сделала миграция).
3. **Тест:** открыть `/` в одной вкладке, `/admin` в другой → создать/закрыть сделку → главная вкладка должна обновиться без F5 в течение 1 сек (Realtime) или ~45 сек (polling-fallback если миграция не прогнана).
4. Ревью + коммит.

### Что НЕ менял
- `lib/db.ts`, `lib/standings.ts`, `lib/types.ts`, `lib/pnl.ts`, админка (`actions.ts`, `AdminPanel.tsx`, `admin/page.tsx`), `EquityChart` логика расчёта линий, `ParticipantModal` (контракт onClose), `TickerStrip`, `Leaderboard`, `EventTicker`, `Sparkline`, `Countdown` — не тронуты.
- Существующие миграции 0001–0006 — не тронуты.
- Никаких новых deps (Supabase Realtime — часть `@supabase/supabase-js`, который уже стоял).

### Валидация v10
- `npm run lint` — чисто (0 ошибок). Решены все 4 проблемы первой итерации (set-state-in-effect × 2, refs-in-render × 1, no-unused-vars × 1) — переход на URL-as-state и убрали лишний ref.
- `npm run build` — чисто (Turbopack 3.2s, TS OK). Маршруты не изменились: `/` ƒ, `/admin` ƒ, `/api/prices` ƒ, `/api/tickers` ○ 5m. Ожидаемое сообщение `[db] ... falling back to static` (БД-схема старее текущего кода — graceful path).
- `npm run test:pnl` — 19/19 pass (контракт `lib/pnl.ts` не менялся).
- `npm run dev` (порт 4988) — `/` 200; `/?focus=Андрей` 200, в HTML видно «график: Андрей» цветом #22d3ee; `/` без параметра — «график: все»; верхней фильтр-полосы (старый дропдаун) в HTML НЕТ. Гидрация без ошибок. Pre-existing recharts SSR warning остался (зафиксировано в decisions.md как известный, не блокер).

### Caveats
- **Realtime у Supabase Free Tier**: 200 одновременных подключений, 200 каналов, 2 млн сообщений/мес. Для демо-витрины с 5-50 зрителями — за глаза. Если пойдут сотни — пересмотреть (или включить filtering/throttling в хуке).
- **Hot reload в dev**: HMR пересоздаёт effect → канал переподписывается. Не баг, но в `tail -f` лога Supabase можно увидеть мерцание.
- **router.refresh() не дешёвый** — это полный RSC re-render. Дебаунс 400 мс защищает от штормов. Если когда-то пойдут сотни событий/сек — добавить throttle (например `eventsPerSecond: 5` уже стоит в realtime-config).
- **Focus в URL — кириллица**: `router.replace` сам делает encodeURIComponent → URL `?focus=%D0%90%D0%BD%D0%B4%D1%80%D0%B5%D0%B9` корректен и шарабелен. В отображении адреса браузер может показать как `?focus=Андрей`.
- **Click outside для снятия focus** — НЕ реализован буквально (клик по графиковой зоне вне линий — recharts это сложно перехватить). Замена: явные кнопки «Показать всех» и «Все» в заголовке графика, плюс escape сбрасывает только модалку. Это проще и понятнее, чем «магический» клик-фон.
- **Таб «Открытые позиции»** под графиком — НЕ диммится по focusedName. Решение сознательное: фокус — это про график и список участников; в таблице позиций dimming усложнил бы UX (там карточки с таблицами).
- **`app/page.tsx` стал dynamic** — `searchParams` это Request-time API → page всегда динамическая. У нас уже `revalidate = 0`, так что регресса нет.
- **`useLiveCompetition` создаёт `createClient` каждый раз при mount хука** — отдельный от `lib/supabase.ts:getAnonClient()`. Дубликат сознательный: `lib/supabase.ts` помечен как server-only, импортить его в client-component = тянуть `service_role` ключ в bundle. Хук создаёт лёгкий anon-клиент в браузере с минимальными опциями.

### Suggested commit message
`feat(dashboard): live-sync via Supabase Realtime + focus filter in sidebar with URL state`

---

## v9.2 — Расширение демо-сида с 6 до 15 участников (2026-05-13)

**Идея:** для красивой демо-картинки (более насыщенный график, разнообразие equity-кривых) расширил сид с 6 участников до 15 — добавил ещё 9.

### Что добавил

1. **`data/competition.ts`** — добавил 9 участников после Ивана (всего 15 в массиве `participants`):
   - **Артём** (1800 $, `#ef4444`) — +5.8% с открытыми, 2 closed + 2 open.
   - **Никита** (6500 $, `#06b6d4`) — +11.3% с открытыми, 4 closed + 3 open.
   - **Павел** (900 $, `#8b5cf6`) — около ноля (-1.3%), 2 closed + 1 open.
   - **Роман** (4200 $, `#14b8a6`) — +6.5% с открытыми, 3 closed + 2 open.
   - **Денис** (2200 $, `#eab308`) — В МИНУСЕ (-10.9%), 3 closed + 2 open.
   - **Олег** (5800 $, `#ec4899`) — +8.8%, 4 closed + 2 open.
   - **Виталий** (3500 $, `#84cc16`) — +9.4%, 2 closed + 2 open.
   - **Антон** (1100 $, `#f97316`) — В МИНУСЕ (-11.8%), 3 closed + 1 open.
   - **Максим** (7000 $, `#6366f1`) — топ-лидер +17.6%, 4 closed + 3 open.
   - Стартовые депозиты в диапазоне 800–7000 $. Все цвета не пересекаются с уже использованными у базовых 6 участников. Сохранён формат фабрик `open()` / `closed()`. У всех закрытые сделки в окне 2026-05-06…12 → красивая equity-история; у открытых — entry_price ≈ актуальной рыночной цене на 2026-05-13 (для live-PnL).
   - PnL в open-позициях посчитан под текущие placeholder-цены (XAUUSD 4640, EURUSD 1.0850, GBPUSD 1.2700, USDJPY 152, USDCAD 1.385, XAGUSD 57.85, BTCUSD 80000) с учётом contractSize и quote-конверсии (см. lib/pnl.ts) — без TwelveData ключа цифры в карточках сразу осмысленные, с ключом — пересчитываются live.
   - 3 участника в минусе по equity (Дмитрий, Денис, Антон) → интрига. Большинство — в плюсе или около ноля.
   - Шапка-комментарий обновлена (v9.2).

2. **`supabase/migrations/0006_demo_data_extended.sql`** — НОВАЯ миграция: DELETE + полный INSERT всех 15 участников. После прогона состояние БД = финальный демо-сид. `0005_demo_data.sql` остаётся как «base demo seed» (6 участников) — не тронут. Прогон 0005 → 0006 равносилен прогону одного 0006 (оба полностью перезаливают). sort_order продолжен корректно: базовые 6 = 0..5, новые 9 = 6..14.

### Что НЕ менял
- Типы (`lib/types.ts`), компоненты, расчёты (`lib/standings.ts`), админка, графики, миграции 0001–0005 — всё нетронуто, контракт сохранён.
- 6 базовых участников из v9.1 — не тронуты (имена, цвета, депозиты, сделки, sort_order).

### Валидация v9.2
- `npm run lint` — чисто (0 ошибок).
- `npm run build` — чисто (Turbopack 2.7s, TS OK). Маршруты не изменились: `/` ƒ, `/admin` ƒ, `/api/prices` ƒ, `/api/tickers` ○ 5m. На билде ожидаемое сообщение `[db] ... falling back to static` (прод-БД ещё со старой схемой / без 0006) — graceful path работает.
- `npm run test:pnl` — 19/19 pass (контракт `lib/pnl.ts` не менялся).

### Что Кириллу сделать
1. **Прогнать `supabase/migrations/0006_demo_data_extended.sql`** в Supabase SQL Editor — заменит текущий сид (6 уч.) на расширенный (15 уч.). Без этого Supabase отдаст старые 6, а статика (data/competition.ts) — новые 15 (только при ошибке БД → fallback).
2. Ревью + коммит.

### Caveats
- v9.2 трогает ТОЛЬКО демо-сид. Если в проде БД уже была заполнена реальными участниками через /admin — прогон 0006 их удалит (там `delete from public.participants` в начале). Перед прогоном на проде убедиться, что это безопасно.
- Цвета новых 9 — насыщенные, на тёмном фоне отличимые. Если после рендера видно конфликт с одной из базовых 6 — поправить hex.
- Live-PnL у новых открытых позиций даст реалистичные значения только при наличии TWELVEDATA_API_KEY. Без него — ручной `unrealizedPnl` (тоже осмысленный, но статичный).

---

## v9.1 — Поле entry_price в админке + богатая демо-сидинг (2026-05-13)

**Идея:** в v9 entry_price задавался только SQL-ом или правкой `data/competition.ts`. Теперь Кирилл задаёт его кликом мыши в `/admin`. Заодно перезалита демка под актуальные рыночные цены — для красивой демонстрации live-PnL.

### Что добавил

1. **`app/admin/actions.ts`**
   - `AdminPositionRow.entry_price: number | null` — новое поле (best-effort: если миграция 0004 не прогнана, идёт null без ошибки).
   - `getAdminData` — вторым best-effort `select id, entry_price` с `try/catch`, маппится в позиции (та же стратегия, что в `lib/db.ts`).
   - `openTrade` — принимает `entry_price` через `numFieldOrNull`. Сначала INSERT с колонкой, при `column entry_price does not exist` (детектор `isMissingEntryPriceError`) — повторный INSERT без неё. Совместимо со старой схемой.
   - `updateTrade` — то же самое для UPDATE (внутренний хелпер `updateRow` с graceful fallback).

2. **`app/admin/AdminPanel.tsx`**
   - Хелпер `entryPriceStep(instrument)` — шаг numeric-инпута: BTCUSD=1, XAU/XAGUSD=0.01, USDxxx=0.01, мажоры=0.0001.
   - Форма «Открыть сделку» — добавлено поле `Цена входа (необяз.)` `step="any"` (инструмент задаётся в той же форме, динамический шаг невозможен) + подсказка под формой: «Если задана — PnL пересчитывается из TwelveData. Если пусто — используется ручное значение PnL ниже».
   - `EditForm` — поле `Цена входа` со `step={entryPriceStep(q.instrument)}` и `defaultValue={q.entry_price ?? ""}`. Работает для открытых и закрытых сделок.
   - В строке-сводке `Row` (`tradeLine`) добавлена пометка `· вход {entry_price}` если задана — видно с первого взгляда, какие позиции live, а какие на ручном PnL.

3. **`data/competition.ts`** — полностью перезалит демо-сид:
   - 6 участников (русские имена без фамилий): Андрей (3000), Михаил (2500), Алексей (4500), Дмитрий (1500), Сергей (5000), Иван (1200).
   - У каждого 2-4 закрытые сделки за 2026-05-06…12 → красивая equity-история на графике.
   - У каждого 1-3 открытые позиции с `entryPrice` ≈ актуальной рыночной цене (XAUUSD ~4640, EURUSD ~1.0850, GBPUSD ~1.2700, USDCAD ~1.3850, USDJPY ~152.0, BTCUSD ~80000). Лоты 0.05-0.3, реалистичные.
   - Ручной `unrealizedPnl` посчитан для случая «текущая цена ровно ориентир» — чтобы при выключенном live (без ключа) UI всё равно показывал осмысленные числа, а с включенным — пересчитывалось из реальной цены TwelveData.
   - `startDate` сдвинут на 2026-05-06 (неделя назад от старта v9.1), `endDate` 2026-05-20 — чтобы график охватывал и историю, и будущее.
   - Добавлен USDCAD в tickers и в open-позиции (был только XAU/XAG/EUR/GBP/JPY/BTC).

4. **`supabase/migrations/0005_demo_data.sql`** — INSERT-скрипт под ту же демку для Supabase. Чистит положения/балансы/участников/мету/тикеры → перезаливает. Прогнать через Supabase SQL Editor (миграции 0001 → 0003 → 0004 уже должны быть прогнаны — особенно 0004, иначе колонки entry_price нет и INSERT упадёт).

### Что НЕ менял

- `app/admin/page.tsx`, `lib/db.ts`, `lib/pnl.ts`, `lib/types.ts`, дашборд (`/`), `EquityChart`, `ParticipantModal`, `useLivePrices`, `/api/prices` — ничего, контракт обратно совместим.
- `closeTrade` и `updateTradePnl` — не трогаются: они работают с уже открытой позицией (entry_price не должен меняться при закрытии или быстрой правке плавающего PnL — для этого есть полный edit).

### Валидация v9.1
- `npm run lint` — чисто (0 ошибок).
- `npm run build` — чисто (TS OK, Turbopack 2.3s). Маршруты не изменились: `/` ƒ, `/admin` ƒ, `/api/prices` ƒ, `/api/tickers` ○ 5m.
- `npm run test:pnl` — 19/19 pass (контракт `lib/pnl.ts` не менялся, проверка регресса).

### Что Кириллу сделать
1. **Прогнать `supabase/migrations/0005_demo_data.sql`** в Supabase SQL Editor — заменит текущий сид на новую демку с entry_price у открытых позиций. Без этого БД покажет старые v6-плейсхолдеры (Кирилл/Алексей/Павел/Lauris/Руслан), а статика покажет новую демку только если БД отдаст ошибку → fallback.
2. Ревью + коммит. Suggested commit message: `feat(admin,demo): entry_price field in admin form + live-PnL demo seed`.

### Caveats
- В форме «Открыть сделку» `step="any"` (инструмент ещё не выбран при вводе цены) — Кирилл сам введёт правильное число. В форме редактирования сделки шаг подбирается по фактическому инструменту.
- Старый сид (Кирилл/Алексей/Павел/Lauris/Руслан с депозитами 1000-1500) ушёл из `data/competition.ts`. Если нужен — есть в git history + в `supabase/migrations/0003b_seed.sql`.
- Live-PnL у открытых позиций даст реалистичные значения только при наличии TWELVEDATA_API_KEY. Без него — ручной `unrealizedPnl` из сида (тоже осмысленный, но статичный).

---

## v9 — LIVE-обновление PnL открытых позиций из текущих рыночных цен (2026-05-13)

**Идея:** у открытой позиции добавилось поле `entry_price`. Если задано — нереализованный PnL пересчитывается на лету из текущей рыночной цены TwelveData, без правки админки. Если null — fallback на ручной `unrealized_pnl` (старый поток сохранён, ничего не сломано).

### Что построил

1. **`lib/pnl.ts`** — чистые функции (без сайд-эффектов):
   - `computeUnrealizedPnlUsd(instrument, side, qty, entryPrice, marketPrice, prices?)` → PnL в USD или null
   - `contractSize(instrument)` — XAUUSD=100 oz, XAGUSD=5000 oz, BTCUSD=1, остальные мажоры=100 000
   - `sideSign(side)` — LONG/BUY → +1, SHORT/SELL → −1
   - `toTwelveData("XAUUSD") → "XAU/USD"` и обратно `fromTwelveData`
   - USDJPY/USDCHF/USDCAD: PnL в quote → перевод в USD по текущей цене пары
2. **`lib/pnl.test.ts`** — 19 юнит-тестов, все зелёные. Каждый инструмент: BUY profit / SELL profit / loss + edge cases (null entry/market, синонимы BUY/SELL, маппинг тикеров). Запуск: `npm run test:pnl` (использует `node --test --experimental-strip-types`, без новых deps).
3. **`app/api/prices/route.ts`** — серверная Next.js route. GET `?symbols=XAUUSD,EURUSD,...`:
   - Берёт `process.env.TWELVEDATA_API_KEY`. Если нет — отдаёт `{prices:{}, source:"static", error:"..."}`.
   - Маппит в TwelveData-формат (`XAU/USD`), один батч-запрос на все пары.
   - In-memory Map-кеш на 30 сек по сортированному ключу запроса.
   - На ошибку/лимит — отдаёт последний удачный кеш с `stale: true, error: "..."`.
   - `dynamic = "force-dynamic"` (route не кешируется Next-ом, кеш только наш в Map).
4. **`app/components/useLivePrices.ts`** — клиентский хук, поллит `/api/prices` каждые `NEXT_PUBLIC_PRICES_REFRESH_MS` мс (дефолт 120000 = 2 мин). Возвращает `{prices, fetchedAt, stale, source, loading, error}`. Защита от race через `reqIdRef`. Если symbols пустой — поллинг не запускается. Lint-чисто (избегаю cascading setState через derived state).
5. **`lib/types.ts`** — `Position` получил опциональное `entryPrice?: number | null`. Обратная совместимость — старые записи без entryPrice продолжают работать на ручном `unrealizedPnl`.
6. **`lib/db.ts`** — после основного positions-запроса вторым best-effort запросом подгружает `entry_price` из БД. Если колонки ещё нет (миграция 0004 не прогнана) — try/catch проглатывает, дашборд продолжает работать без live-режима. В основной select добавлен `id` (нужен для маппинга entry_price → позиции).
7. **`app/components/DashboardShell.tsx`** — главный интегратор:
   - Собирает уникальные тикеры открытых позиций c entryPrice → `useLivePrices(symbols)`.
   - Считает `livePnlByPosKey: Map<key, pnl>` и `liveUnrealizedByName: Map<name, sumPnl>`. Фолбэк на `pos.unrealizedPnl` если live-цены ещё нет.
   - Карточка участника (правая панель) показывает «Текущий счёт» = `balance + liveUnrealized`, цвет зел/красн относительно `startValue`. Под счётом — открытый PnL участника.
   - Таб «Открытые позиции» переписан на `LivePositionsTable`: колонки Напр./Инструмент/Лот/Вход/Цена/PnL, font-mono, бейдж «бд» если live-цены нет.
   - Тулбар: индикатор «обновлено N сек назад» (зелёный) / «данные на HH:MM» (красный, при stale) / «загрузка цен...» / «live выкл» (если ключа нет). Title-tooltip с подробностями.
   - Передаёт `liveUnrealizedByName` в `EquityChart` — режим «По депозиту + нереализ. PnL» теперь использует live-значения.
   - Передаёт `liveUnrealized/livePnlByPosKey/livePrices` в `ParticipantModal`.
8. **`app/components/EquityChart.tsx`** — новый опциональный проп `liveUnrealizedByName?: Map<string, number> | null`. В режиме equity — приподнимает последнюю точку линии на live-сумму вместо ручной. Если проп не передан — фолбэк на старое поведение.
9. **`app/components/ParticipantModal.tsx`** — новые опциональные пропы `liveUnrealized`/`livePnlByPosKey`/`livePrices`. Метрика «Equity» переименована в «Текущий счёт», цвет зел/красн по startValue. В таблице открытых позиций добавлены колонки «Вход» и «Цена», PnL берётся live если есть. Footer «Текущая прибыль/убыток» — live.
10. **`data/competition.ts`** — у 5 открытых позиций (Кирилл XAUUSD/USDJPY, Алексей XAGUSD, Павел BTCUSD, Lauris GBPUSD) выставлены `entryPrice`, чтобы можно было сразу увидеть live-режим в действии (после установки ключа). Хелпер `open(...)` теперь принимает entryPrice 8-м параметром (default null — обратно совместимо).
11. **`supabase/migrations/0004_entry_price.sql`** — `ALTER TABLE positions ADD COLUMN IF NOT EXISTS entry_price numeric` + COMMENT. Прогнать через Supabase SQL Editor (если БД подключена).
12. **`.env.example`** + **`.env.local.example`** — добавлены `TWELVEDATA_API_KEY` и `NEXT_PUBLIC_PRICES_REFRESH_MS` с комментариями где взять ключ.
13. **`README.md`** — раздел «Live prices (TwelveData)» с пошаговой настройкой, объяснением лимитов, инструкцией по тестам.
14. **`package.json`** — добавлен скрипт `"test:pnl": "node --test --experimental-strip-types --no-warnings lib/pnl.test.ts"`. Никаких новых production/dev зависимостей.

### Edge cases закрыты
- **Без TWELVEDATA_API_KEY** — `/api/prices` отдаёт `source:"static"`, prices:{}, дашборд показывает «live выкл», все позиции на ручном `unrealizedPnl` (старая логика).
- **Старая БД без entry_price** — best-effort запрос ловит ошибку, остальное работает как раньше.
- **TwelveData упал/лимит** — отдаём последний кеш с `stale:true`, в UI красный индикатор «данные на HH:MM».
- **Позиция без entryPrice** — фолбэк на ручной `pos.unrealizedPnl`, в строке таблицы бейдж «бд».
- **Smybols пустой** — хук не запускает поллинг, /api/prices сразу отдаёт пустой объект.
- **USDJPY/USDCHF/USDCAD** — quote-валюта не USD, формула делит rawPnl на текущую цену пары → корректный USD (тест `USDJPY LONG profit (quote→USD via current rate)`).
- **Race на смену symbols** — `reqIdRef` отбрасывает устаревшие ответы.

### Валидация v9
- `npm run lint` — чисто (0 ошибок).
- `npm run build` — чисто (TS OK). Маршруты: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m, **`/api/prices` ƒ** (новый, dynamic).
- `npm run test:pnl` — 19/19 pass (формулы по всем инструментам + маппинг тикеров).
- `npm run dev` (порт 4915) — `/` → 200, `/api/prices?symbols=...` → 200 (`{prices:{}, source:"static", error:"TWELVEDATA_API_KEY is not set"}` без ключа), `/api/prices?symbols=` → 200 (graceful empty).

### Что осталось Кириллу (НЕ делал — по запрету)
1. Получить бесплатный API-ключ на https://twelvedata.com → положить `TWELVEDATA_API_KEY=...` в `.env.local` (локально) и в Vercel → Project Settings → Environment Variables → Redeploy.
2. (опц.) Прогнать `supabase/migrations/0004_entry_price.sql` через Supabase SQL Editor — добавит колонку `entry_price` в БД, чтобы её можно было задавать через `/admin`. Без миграции дашборд работает на data/competition.ts (где entryPrice уже проставлены у нескольких позиций).
3. (опц.) Добавить поле `entry_price` в форму открытия сделки в `/admin/AdminPanel.tsx` — задача не просила, но логично, если соревнование будет вестись через БД.
4. Ревью + коммит. Suggested commit message: `feat(live-pnl): live unrealized PnL via TwelveData polling`.

### TODO / открытые вопросы
- **Админка не умеет задавать entry_price** — поле есть в типах и БД (после миграции 0004), но в форме `openTrade` (app/admin/actions.ts + AdminPanel.tsx) его нет. Кирилл может попросить добавить отдельно.
- **История equity-снапшотов** — задача явно сказала «пока не пишем». Сейчас на графике точка-«сейчас» приподнимается через режим equity, но в historical timeline не сохраняется.
- **Адаптивный refresh по торговым часам** — реализован НЕ как условный код, а через настраиваемый `NEXT_PUBLIC_PRICES_REFRESH_MS`. По умолчанию 2 мин (720 req/день, безопасно). Если хочется сложнее — можно сделать «1 мин в торговые часы / 5 мин ночью» в `useLivePrices`.
- **Кросс-курсы для EURJPY и т.п.** — формула возвращает null для незнакомых пар. Если такие инструменты появятся — расширить `computeUnrealizedPnlUsd`.

### Как тестировать
- **Юнит:** `npm run test:pnl` — 19 кейсов формул и маппинга.
- **End-to-end (без ключа):** `npm run dev` → `/` → в правой панели у участников с открытыми позициями видно текущий баланс + индикатор «live выкл». Открытые позиции в табе показывают entryPrice / «—» в колонке Цена / ручной PnL c бейджем «бд».
- **End-to-end (с ключом):** прописать `TWELVEDATA_API_KEY` в `.env.local`, перезапустить dev → раз в 2 мин (или сразу при первом рендере) цены подтянутся, индикатор станет зелёным «обновлено N сек назад», PnL пересчитается, в карточке цвет «Текущий счёт» поменяется в зависимости от того, выше/ниже стартового депозита.
- **Stale path:** временно подставить заведомо неверный TWELVEDATA_API_KEY → после первого ответа индикатор покраснеет «данные на HH:MM» (если до этого был кеш) или «live выкл».

---

## v8 — UI: убран бенчмарк, участники в боковую панель, убран таб «О соревновании» (2026-05-12)

Фидбэк пользователя по скриншоту главной.

### 1. Убрана пунктирная линия «среднее по участникам» (`__avg`)
- `lib/standings.ts:getChartData` — больше не считает и не кладёт `__avg` в строки графика. `ChartRow` тип не менялся.
- `app/components/EquityChart.tsx` — удалён `<Line dataKey="__avg">`, блок `__avg` в `CustomTooltip` (фильтр упрощён до `typeof p.value === "number"`), пересчёт `__avg` в `equityRows` (зависимость `lines` оттуда убрана). Мёртвого кода не осталось.
- `app/components/DashboardShell.tsx` — убрана подпись «пунктир — среднее по участникам» в шапке секции графика.

### 2. Участники → боковая панель с табами; таб «О соревновании» удалён
- `DashboardShell.tsx` переписан:
  - Новая сетка `grid lg:grid-cols-[minmax(0,1fr)_320px]`: слева — секция графика на всю доступную ширину; справа — `<aside>` с табами сверху + вертикальным списком карточек участников (скролл `lg:max-h-[420px] lg:overflow-y-auto`). Вынесен компонент `ParticipantCard` (аватар-инициалы, имя, текущий баланс, % изменения, спарклайн; клик → `ParticipantModal`).
  - Старый нижний ряд карточек участников (`lg:grid-cols-5`) удалён.
  - `TabKey = "open" | "closed"` (было `"open" | "closed" | "about"`). Таб «О соревновании» и его секция (`note` + `rulesText`) удалены.
  - Контент активного таба теперь рендерится в отдельной `<section>` ПОД сеткой график+панель, на всю ширину. На мобиле всё стекается: график → контент таба → панель участников.
  - Проп `rulesText` убран из `Props`.
- `app/page.tsx` — удалена константа `RULES_TEXT`, проп `rulesText` не передаётся. `formatTs` всё ещё используется.
- Остальные компоненты не тронуты. Неоновый-терминал стиль сохранён.

### Валидация v8
- `npm run build` — чисто (Turbopack, TS OK). Маршруты без изменений.
- `npm run dev` — `/` → 200, в HTML нет «пунктир — среднее»/«О соревновании», есть «Участники ·»/«Открытые позиции»/«Закрытые сделки». (Пред-существующий безвредный warning recharts ResponsiveContainer при SSR.)
- Запушено в `origin/main` (commit da23c29) + `vercel --prod --yes` → https://dnevnik-roan.vercel.app → 200.

### v8 — открытые вопросы
- Боковая панель фиксированной ширины 320px на `lg+`, список скроллится при большом числе участников.
- Контент таба «Открытые позиции» — карточки по 2 в ряд; «Закрытые сделки» — общая таблица. Логика та же, переехала под сетку.
- Реальные участники/депозиты — всё ещё плейсхолдеры (см. v7).

---

## v7 — АДМИНКА: полное редактирование участников и сделок + UX (2026-05-12)

**Только `/admin` + data-слой (actions). Дашборд (`/`) и `/api/tickers` НЕ тронуты. Миграция НЕ нужна** — всё нужное уже в схеме: `participants.avatar_url` (0001), `participants.starting_deposit` (0003), `positions.margin`/`positions.realized_pnl` (0003), `positions.participant_id ... ON DELETE CASCADE` + `balance_points.participant_id ... ON DELETE CASCADE` (0001 — каскад уже есть, `deleteParticipant` ещё и явно удаляет сделки/точки перед участником на случай если каскад на конкретной БД не настроен).

### app/admin/actions.ts
- `upsertParticipant` — теперь принимает `avatar_url` (пусто → null) вместе с name/color/starting_deposit/sort_order. Edit (есть `id`) → UPDATE, иначе INSERT.
- **`deleteParticipant`** — DELETE positions.eq(participant_id) → DELETE balance_points.eq(participant_id) → DELETE participants.eq(id). guarded.
- **`updateTrade`** — редактирует ЛЮБУЮ сделку (открытую или закрытую): side/instrument/lot/margin/exit_plan/opened_at; для закрытой ещё realized_pnl (обязателен) + closed_at; для открытой ещё unrealized_pnl. Hidden-поле `status` фиксировано на текущий статус (не переключает open↔closed). guarded.
- **`deleteTrade`** — DELETE positions.eq(id). guarded.
- `openTrade` / `updateTradePnl` / `closeTrade` / `upsertTicker` / `upsertMeta` — без изменений.
- `getAdminData` — переписан: возвращает `participants: AdminParticipantRow[]` (id, name, color, **avatar_url**, starting_deposit, sort_order + ВЫЧИСЛЕННЫЕ inline: balance, equity, available_cash, change_pct, open_count, closed_count), `positions: AdminPositionRow[]` (ВСЕ сделки — открытые + закрытые, с id+participant_id), `tickers`, `meta`, `lastUpdated` (макс. updated_at среди meta/tickers, ISO). Старое `openPositions` поле убрано. Вычисления повторяют логику lib/standings.ts:getParticipantStats (balance = starting_deposit + Σ realized; equity = balance + Σ unrealized открытых; available_cash = balance − Σ margin открытых).
- Хелперы: `toIsoOrNull` (datetime-local→ISO, трактует как UTC; пусто→null), `toIso` (пусто→now), `numFieldOrNull`.

### app/admin/AdminPanel.tsx — переписан
- Структура: 4 секции в нативных `<details>` (свернуть/развернуть). `👤 Участники` (open) → `📈 Сделки` (open) → `📊 Тикеры` (closed) → `🏁 Соревнование` (closed). Над секциями — шапка состояния: «Соревнование: {title} · {start}—{end} · N участников · последнее обновление {время} (UTC)».
- **Участники**: список карточек (каждая с цветной левой полоской) — имя · старт · порядок · и под ним вычисленные «баланс / equity / свободно / рост% / N откр./M закр.». Рядом кнопки «Редактировать» (→ форма ниже подставляет defaultValue через `key={editId}` ремоунт) и «Удалить» (`ConfirmSubmit` с `confirm("Удалить участника X? Его сделки тоже удалятся.")`). Ниже — форма add/edit: имя / цвет (`<input type=color>`) / **фото URL** (пусто = инициалы) / стартовый депозит / порядок. Заголовок формы «Новый участник» / «Редактирование: X» + кнопка «+ новый» для сброса.
- **Сделки**: блок «Открыть сделку» (как был) + список `<details>` на каждого участника. Внутри участника: открытые (🟢) и закрытые (🔒) сделки, у каждой строка-сводка + кнопки «Редактировать» (раскрывает инлайн-форму EditForm) и «Удалить» (`ConfirmSubmit`). У открытых дополнительно остались быстрые формы «Обновить PnL» и «Закрыть». EditForm: side/instrument/lot/margin/exit_plan/opened_at + (закрытая) realized_pnl+closed_at / (открытая) unrealized_pnl. `datetime-local` поля префиллятся через `toLocalInput(iso)` (UTC).
- **Инлайн-фидбек**: каждая форма — свой `useActionState`, под формой `<Status state>` → «✅ {message}» (text-pos) или «❌ Ошибка: {error}» (text-neg). Никаких alert().
- **Confirm**: `ConfirmSubmit` — `<button onClick={e => { if(!confirm(msg)) e.preventDefault() }}>` внутри формы → отменяет submit если пользователь нажал «Отмена».
- Хелперы форматирования (fmtMoney/fmtPct/fmtDate/toLocalInput) — локальные в файле (Math.round, UTC). Не тащил из lib/standings (там Competition-завязка).
- Зависимостей не добавлял. `useState` для editId участника/сделок (какую форму раскрыть).

### app/admin/page.tsx — без изменений (передаёт `getAdminData()` в `AdminPanel`; шапка состояния теперь внутри AdminPanel).

### Валидация v7
- `npm run lint` — чисто (0 проблем).
- `npm run build` — чисто (TS OK). Маршруты: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m — без изменений.
- `npm run dev` (порт 4912) — `/` → 200, `/admin` → 200 (локально ADMIN_PASSWORD пуст → «Админка не настроена», как и раньше; формы появятся когда заданы ADMIN_PASSWORD + ключи Supabase).
- Запушено в `origin/main` → Vercel автодеплой.

### v7 — открытые вопросы
- **Миграция 0004 НЕ нужна** — каскад и все колонки уже есть. (0001/0002/0003/0003b ещё надо прогнать через Supabase SQL Editor если прод-БД сырая — без этого дашборд+админка работают на статике, но `/admin` формы требуют service-role ключ → пишут «БД не подключена».)
- **Реальные участники + стартовые депозиты — ВСЁ ЕЩЁ ПЛЕЙСХОЛДЕРЫ** (5 имён: Кирилл/Алексей/Павел/Lauris/Руслан, депозиты 1000–1500 в `data/competition.ts` + `0003b_seed.sql`). Заменить через `/admin` (теперь полное редактирование) или в файле.
- Bulk-закрытие нескольких сделок одним действием — не делал (опционально, в задаче «на твой выбор»).
- Таб-навигация вместо `<details>` — выбрал `<details>` (нативно, проще, без зависимостей; в задаче «на твой выбор»).
- Авто-расчёт маржи из лот×плечо — НЕ делал (вводится вручную, как было).
- Светлая тема, реальный 24h FX, Finnhub-ключ — всё ещё отложено.

---

## v6 — РЕФАКТОР под сделко-центричную модель (2026-05-12)

**Идея:** баланс / equity / свободные средства / timeline графика больше НЕ вводятся руками — они **вычисляются из сделок**. Руками задаются только `starting_deposit` участника и сами сделки (открыть → обновить плавающий PnL → закрыть с результатом).

### Новая модель данных
- **`Participant`** (lib/types.ts): `name`, `color`, `avatar`, **`startingDeposit`** (число, задаётся раз), **`positions`** (открытые + закрытые). Убрано: `timeline` (выводится), `availableCash` (вычисляется).
- **`Position`**: `side` (LONG/SHORT), `instrument`, `lot`, `exitPlan`, **`margin`** (заблокированная сумма $, вводится при открытии), **`unrealizedPnl`** (текущий плавающий PnL пока открыта; 0 при открытии; для закрытой не используется), **`realizedPnl`** (number|null — финальный результат при закрытии), `status` ('open'|'closed'), `openedAt`, `closedAt`.
- **`positionPnl(p)`** хелпер в lib/types.ts: closed → `realizedPnl ?? 0`, open → `unrealizedPnl`. Используется везде где раньше читали `pos.unrealizedPnl` для закрытой позиции (DashboardShell таблица закрытых, ParticipantModal закрытые/best/worst, EquityChart tradeTitle + цвет маркера).

### Вычисляемые величины (lib/standings.ts, `getParticipantStats`)
- `balance` (= `currentValue`, дубль `balance`) = `startingDeposit + Σ realizedPnl` всех закрытых
- `equity` = `balance + Σ unrealizedPnl` всех открытых
- `availableCash` = `balance − Σ margin` всех открытых
- `changeAbs` = `balance − startingDeposit`, `changePct` = `(changeAbs/startingDeposit)*100`
- `timeline` = `[(startDate+"T00:00:00", startingDeposit), затем по каждой закрытой позиции в порядке closedAt → (closedAt, running_balance)]`. Последняя точка = текущий balance. (Без дневных снимков — точек на закрытия + старт достаточно.)
- `getParticipantSummary` — winRate/best/worst/avgPnl теперь по `realizedPnl` закрытых
- `getFeedEvents` — pnl = `realizedPnl`
- `getChartData` — теперь вызывает `getParticipantStats` внутри и строит rows из выведенных timeline (connectNulls на линиях, не у каждого участника точка в каждой строке)
- `getLeaderboard` — по `changePct` (как было)
- `formatMoney`/`formatSignedMoney` теперь `Math.round` значение (т.к. running_balance может быть дробным)

### EquityChart — режим equity с новой моделью
В режиме «По депозиту + нереализ. PnL» последняя числовая точка каждого участника с открытыми позициями приподнимается на `s.unrealizedPnl` (= Σ unrealizedPnl открытых). Проверено — работает: участники с открытыми позициями (Кирилл +103, Алексей +64, Павел −85, Lauris −35) видны приподнятыми; Руслан (нет открытых) — линии совпадают. Всё остальное (легенда-выделение, таймфреймы, маркеры закрытых сделок по closedAt, end-of-line аватары, draw-анимация, кликабельность линий/аватаров → модалка) — работает.

### Дашборд
- Компактные карточки участников: `formatMoney(s.currentValue)` = balance, `changePct` — как было.
- ParticipantModal: добавлена сетка «Баланс / Equity / Свободные средства» (3 `Metric`) между шапкой и блоком статистики; убран дублирующий футер «Свободные средства» внизу. Шапка показывает balance + changePct + changeAbs. Статистика (винрейт и т.д.) — пересчитана на realizedPnl закрытых.
- Лидерборд — `changePct` = `balance/startingDeposit − 1`.
- EventTicker (бегущая строка) — «{имя} закрыл {LONG/SHORT} {инструмент} {±$X}», X = realizedPnl, сортировка по closedAt.
- DashboardShell таб «Открытые позиции» — карточка участника + таблица открытых (unrealizedPnl) + «Свободные средства» (теперь вычислено). Таб «Закрытые сделки» — таблица с результатом = `positionPnl` (realizedPnl).
- page.tsx RULES_TEXT переписан под новую модель (баланс/equity/свободные средства из сделок); `note` дефолт = «Баланс и equity считаются автоматически из сделок».

### Админка `/admin` — переделана под сделки
- **Открыть сделку**: участник + side + инструмент + лот + маржа($) + план выхода + (необяз.) дата открытия → INSERT status='open', unrealized_pnl=0, realized_pnl=null, opened_at=дата|now.
- **Открытые сделки** (список): по каждой — форма «Обновить плавающий PnL» (UPDATE unrealized_pnl, .eq status='open') + форма «Закрыть» (realized_pnl обязателен, closed_at=дата|now → UPDATE status='closed', realized_pnl, closed_at, unrealized_pnl=0). Маржа освобождается автоматически (позиция перестаёт учитываться в Σ margin).
- **Участники**: имя / цвет / **стартовый депозит** / порядок. Формы «точка баланса» — УБРАНЫ (timeline выводится из сделок).
- **Тикеры**, **Параметры соревнования** — как было.
- Server actions: `openTrade`, `updateTradePnl`, `closeTrade`, `upsertParticipant` (теперь `starting_deposit`), `upsertTicker`, `upsertMeta` — все через `guarded` (auth + hasServiceRole + revalidatePath("/")). Убраны: `addBalancePoint`, `addPosition`, `closePosition` (старые), вотчлист-actions (уже были убраны в v4).
- `getAdminData` теперь возвращает participants с `starting_deposit` и openPositions с `margin`.
- (Не делал bulk-закрытие — опционально, не критично.)

### Миграции Supabase — НАДО ПРОГНАТЬ
1. **`supabase/migrations/0003_trade_centric.sql`** — `ALTER TABLE participants ADD COLUMN starting_deposit`; `ALTER TABLE positions ADD COLUMN margin, ADD COLUMN realized_pnl` (idempotent, `IF NOT EXISTS`). `available_cash` оставлена но не используется. `balance_points` оставлена но не используется. RLS не трогает.
2. **`supabase/migrations/0003b_seed.sql`** — DELETE всего + перезалив плейсхолдеров под новую модель (5 участников с starting_deposit, у каждого 3-4 closed позиции с realized_pnl + closed_at для timeline, 0-2 open позиции с margin + unrealized_pnl). Синхронизирован с `data/competition.ts`. Прогнать ПОСЛЕ 0003.
- Прогон через Supabase SQL Editor (нет supabase CLI). 0001 и 0002 — по прошлым заметкам ещё не прогнаны; если БД сырая — прогнать всё по порядку: 0001 → 0002 → 0003 → 0003b.
- **Graceful**: lib/db.ts — если запрос к positions/participants падает (включая `column starting_deposit does not exist` = старая схема) → fallback на `data/competition.ts`. Проверено: текущая прод-БД ещё со старой схемой → build/dev читают статику, дашборд не падает. После прогона 0003+0003b — дашборд начнёт читать БД.

### Валидация v6
- `npm run lint` — чисто (0 проблем).
- `npm run build` — чисто (TS OK). В логе build: `[db] ... column participants.starting_deposit does not exist ... falling back to static` — ожидаемо (прод-БД ещё старая), это и есть graceful. Маршруты: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m.
- `npm run dev` (порт 4864) — `/` → 200, `/admin` → 200. В HTML `/`: «Реалити-торговля: 2 недели», «закрыл» (события из realizedPnl), «По депозиту + нереализ. PnL» (режим equity), «Лидерборд», «Свободные средства». Только обычный recharts SSR width(-1)/height(-1) warning.
- Запушено в `origin/main` → Vercel автодеплой.

### v7 / открытые вопросы
- **Прогнать `0003_trade_centric.sql` + `0003b_seed.sql`** (после 0001/0002 если БД сырая) через Supabase SQL Editor. Без этого дашборд работает на `data/competition.ts` (новая модель уже там).
- **Реальные участники + стартовые депозиты** — заменить плейсхолдеры (5 имён, депозиты 1000-1500). Либо через /admin (форма «Участники» + стартовый депозит), либо в `data/competition.ts` + `0003b_seed.sql`.
- **Правила в табе «О соревновании»** — RULES_TEXT в page.tsx переписан под модель, но текст можно подправить под реальные условия соревнования.
- Bulk-вид быстрого закрытия нескольких сделок — не делал (опционально).
- Авто-расчёт маржи из лот×плечо — НЕ делал по запрету (вводится вручную).
- Старые таблицы `balance_points` (0001) и `watchlist` (0002) в БД остаются, не используются — можно дропнуть отдельной миграцией если захочется чистоты.
- Светлая тема, реальный 24h FX, Finnhub-ключ для металлов — всё ещё отложено.

---

## v5.2 — кликабельные линии/аватары на графике → модалка участника (2026-05-12)
- `app/components/EquityChart.tsx`: новый опциональный проп `onParticipantClick?: (participantName: string) => void`.
  - У каждой `<Line>` участника: `onClick={() => onParticipantClick(l.name)}` + `style={{ cursor: 'pointer' }}` (только когда проп передан). recharts 3.x `<Line>` поддерживает `onClick` (через `CurveMouseEvents`) и `style` (через `PresentationAttributesWithProps`). Кликабельна сама линия (path stroke), узкая зона ~ширине линии — приемлемо.
  - У end-of-line `ReferenceDot` (кружок-аватар с инициалами): `onClick={() => onParticipantClick(ep.name)}` + `style={{ cursor: 'pointer' }}`. recharts `ReferenceDot` поддерживает `onClick` нативно и `style` через DotProps.
  - `__avg` (пунктир-среднее) и `tradeMarkers` (маркеры закрытых сделок, `TradeDot`) — НЕ кликабельны, оставлены как были.
  - Легенда снизу (клик по имени → highlight/dim линий) — не тронута, конфликта нет (легенда — отдельный блок под графиком, линии/аватары — в области графика).
  - Работает в обоих режимах графика (balance/equity) и на всех таймфреймах — линии/аватары всегда рендерятся из `lines`/`endPoints`.
- `app/components/DashboardShell.tsx`: `<EquityChart ... onParticipantClick={(name) => setModalName(name)} />` — тот же `modalName` стейт, что открывает `ParticipantModal` при клике на компактную карточку участника. `name` приходит из `shownLines`/`endPoints`, всегда резолвится в `stats.find(s => s.name === modalName)`.
- Зависимостей не добавлял. Данные / Supabase / тикеры / лидерборд / карточки / контент модалки — не тронуты.
- Валидация: `npm run lint` чисто, `npm run build` чисто (TS OK, маршруты без изменений: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m), `npm run dev` (порт 4789) `/` → 200. Пуш в `origin/main` → Vercel автодеплой.

## v5.1 — переключатель режима графика (2026-05-12, коммит 888fb98)
- `app/components/EquityChart.tsx`: добавлен `useState<ChartMode>('balance')` (`'balance' | 'equity'`).
  - Режим `balance` — как было: линии = `displayRows` = `shownRows` (timeline.value участников).
  - Режим `equity` — `useMemo equityRows`: клон `shownRows`, у каждого участника с открытыми позициями (`status==='open'`, `unrealizedPnl !== 0`) ПОСЛЕДНЯЯ числовая точка приподнята на сумму его `unrealizedPnl` (берётся из `stats[].openPositions`/`unrealizedPnl`); `__avg` пересчитан по фактическим значениям участников в каждой строке. Исторические точки не трогаются (нет исторического floating PnL — стандартный Balance vs Equity). Если ни у кого нет открытых позиций → `equityRows === shownRows`.
  - `displayRows = mode === 'equity' ? equityRows : shownRows` — на нём строятся `<LineChart data>`, `endPoints` (аватары на концах), `tradeMarkers`, `intraDay`. Всё (легенда-выделение, таймфреймы, маркеры закрытых сделок, аватары, draw-анимация) работает в обоих режимах.
  - Draw-флаг: `drawKey = `${tf}:${mode}``, `drawnFor` теперь string, эффект перезапускается и при смене tf, и при смене mode → маркеры/аватары снова появляются с задержкой 1100мс.
  - UI: рядом с кнопками таймфреймов — сегментед-контрол в рамке `border border-border p-0.5`, две кнопки «По депозиту» / «По депозиту + нереализ. PnL», активная подсвечена `bg-accent/15 text-accent`. Если открытых позиций нет — у кнопки equity `title`-подсказка «линии совпадают».
  - Тултип: `CustomTooltip` получил проп `mode`; в режиме equity внизу строка «equity (с открытыми сделками)». Под легендой в режиме equity — `<p>` с пояснением (последняя точка включает нереализ. PnL / открытых позиций нет).
  - Зависимостей не добавлял. `lib/standings.ts`, данные, Supabase, тикеры, лидерборд, модалка, карточки — не тронуты.
- Валидация: `npm run lint` чисто, `npm run build` чисто (TS OK, маршруты без изменений), `npm run dev` (порт 4321) `/` → 200, в SSR-HTML обе кнопки «По депозиту» / «По депозиту + нереализ. PnL». В `data/competition.ts` есть открытые позиции у нескольких участников → в режиме equity их линии заметно приподняты. Пуш в `origin/main` → Vercel автодеплой.

## v5 — ГОТОВ (2026-05-12) — 6 улучшений

Все 6 пунктов сделаны полностью.

1. **Статистика участника в модалке.** `lib/standings.ts` — новый тип `ParticipantSummary` + `getParticipantSummary(stat)`: винрейт (% закрытых с PnL≥0; null если закрытых 0), totalTrades (открытые+закрытые), closedCount, best/worst (закрытая позиция с max/min PnL), avgPnl (среднее по закрытым; null если 0). В `ParticipantStat` добавлено поле `timeline` (нужно и для спарклайнов). `ParticipantModal.tsx` — новый блок «Статистика» между шапкой и «Открытые позиции»: компактная сетка `<Metric>` (grid 2/3 кол.), тёмный терминальный стиль. Винрейт зел/красн по ≥50%. «—» для пустых. Рост от старта НЕ дублирую (уже в шапке).
2. **Лента событий (бегущая строка).** `lib/standings.ts` — `getFeedEvents(competition, limit=12)`: собирает закрытые позиции всех участников (owner/color/side/instrument/pnl/closedAt), сортирует по closedAt по убыванию (новые слева), slice(limit). Новый компонент `app/components/EventTicker.tsx` (client): «{имя} закрыл {LONG/SHORT} {инструмент} {±$X}», цвет суммы зел/красн. CSS-marquee — два одинаковых `.marquee-track` подряд для бесшовного цикла, `@keyframes marquee` translateX(0→-50%), 40s linear infinite, пауза при `:hover` (`.marquee-wrap:hover`), `prefers-reduced-motion` → без анимации. Если событий нет → строка `startLabel` («Соревнование стартует {дата}»), если и его нет → null. Рендерится в `page.tsx` под `<TickerStrip>`. Keyframes в `app/globals.css`.
3. **Обратный отсчёт.** Новый `app/components/Countdown.tsx` (client): `useState(() => Date.now())` + `setInterval` раз в минуту, `suppressHydrationWarning`. Логика: now<startDate → «Старт через N дней»; now≥endDate(+24ч, конец дня) → «Соревнование завершено»; иначе «До конца: N дней» (если ≥сутки) или «До конца: H ч M мин». Русская плюрализация день/дня/дней. Цвет: акцент когда идёт, muted иначе. Рендерится в тулбаре `DashboardShell` рядом с фильтром участников (передаются `startDate`/`endDate` из `page.tsx`).
4. **Спарклайны в компактном ряду.** Новый `app/components/Sparkline.tsx` (server-renderable, без «use client»): ручной SVG-path по `timeline` значениям, 80×24px, нормализация min/max, `stroke=color участника`, без осей/подписей/интеракции, `preserveAspectRatio="none"`. В `DashboardShell` компактные карточки участников — `<Sparkline timeline={s.timeline} color={s.color} className="hidden shrink-0 sm:block" />` (на мобиле скрыт). `<2` точек → не рендерится.
5. **Цветная рамка карточки.** Компактные карточки в `DashboardShell` — `border-l-[3px]` + inline `style={{ borderLeftColor: s.color }}` (цвет линии участника). В `ParticipantModal` — `absolute inset-x-0 top-0 h-1` полоска цвета `stat.color` вверху панели.
6. **Анимация рисования линий.** `EquityChart.tsx` — у `<Line>` (и `__avg`, и линий участников) `isAnimationActive animationDuration={1100} animationEasing="ease-out"`. Маркеры закрытых сделок (`tradeMarkers`) и end-of-line кружки-аватары (`endPoints` ReferenceDot) рендерятся только когда `drawn` — флаг через `useState<TimeframeKey|null> drawnFor` + `useEffect` с `setTimeout(1100ms)` → `setDrawnFor(tf)`, `drawn = drawnFor === tf` (без синхронного setState в эффекте — обход `react-hooks/set-state-in-effect`). При смене таймфрейма анимация переигрывается, маркеры снова появляются с задержкой. Легенда снизу (использует `endPoints` напрямую) — не gated, видна сразу.

### Валидация v5
- `npm run lint` — чисто (обошёл `react-hooks/purity` в page.tsx — убрал `Date.now()` из server-render, всегда передаю `eventStartLabel`; обошёл `react-hooks/set-state-in-effect` в EquityChart — паттерн `drawnFor`).
- `npm run build` — чисто (TypeScript OK). Маршруты без изменений: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ 5m.
- `npm run dev` (порт 4231) — `/` → 200, `/admin` → 200. В SSR-HTML `/`: `marquee-track` (×2), «закрыл» (события), «Старт через 1 день» (отсчёт — сегодня 12.05, старт 13.05), `<svg viewBox="0 0 80 24">` (спарклайны). Только обычный recharts SSR width(-1)/height(-1) warning.
- Деплой: запушено в `origin/main` → Vercel автодеплой.

### v6 / открытые вопросы (v5)
- Светлая тема — всё ещё отложена.
- Реальный 24h change для FX-пар (Frankfurter не даёт) — открыто.
- v3.5 — fallback для металлов (goldprice.org) на проде Vercel → бесплатный Finnhub-ключ.
- Открытые вопросы v2/v3 в силе: реальные имена участников + стартовые депозиты, реальное название/даты, точный список тикеров, фото-аватары.
- Возможный draw-on эффект для линий через stroke-dashoffset (CSS на path'ах) — сейчас используется штатная recharts-анимация, её достаточно.
- Не делали (по запрету в задаче): resizable, экспорт PNG, фото-аватары, светлая тема, реальный 24h FX.

---

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

---

## v4.1 — убран лидер/аутсайдер из строки тикеров (2026-05-12, коммит e343b88)
- `app/components/TickerStrip.tsx`: убрал props `leader`/`outsider`, тип `LeaderInfo`, хелпер `fmtPct`, блоки «Лидер: …»/«Аутсайдер: …». Осталось: тикеры (цена + change%), бейдж «бд» у не-live, индикатор «● live / ○ бд».
- `app/page.tsx`: убрал импорт и вызов `getLeaderAndOutsider`, `leaderInfo`/`outsiderInfo`, передаю в `<TickerStrip initial={...} />`. Дублирование с `<Leaderboard>` (медальки) устранено.
- `lib/standings.ts` — `getLeaderAndOutsider` оставлен в файле (не используется, но не мешает); Leaderboard использует `getLeaderboard` — не тронут.
- Валидация: `npm run build` чисто, `npm run lint` чисто, `npm run dev` (порт 3199) `/` → 200, в HTML строки тикеров нет «Лидер»/«Аутсайдер» (слово «Лидер» осталось только в заголовке Leaderboard «🏆 Лидерборд» и в тексте правил — это ок). Пуш в main → Vercel задеплоил (Ready, 30s).

---

## v4.2 — два фикса графика (2026-05-12)
- `app/components/EquityChart.tsx`:
  - Ось X — date-only. Новый `xTickFormatter`: эвристика `intraDay = useMemo` (span видимых точек ≤ 1 дня) → если внутри одного дня и есть время → «HH:MM», иначе «DD.MM». Заменил `tickFormatter={formatTs}` на `xTickFormatter`. `formatTs` остался для тултипа и `tradeTitle`.
  - Правый отступ: `<LineChart margin={{ right: 88 → 110 }}>` чтобы end-of-line кружки-аватары (`ReferenceDot r={14}`, ~28px) и последний тик оси X не обрезались.
  - Ничего больше не тронуто: легенда-выделение, таймфреймы, маркеры сделок, данные/тикеры/лидерборд/модалка/табы — без изменений. Зависимостей не добавлял.
- Валидация: `npm run build` чисто, `npm run lint` чисто (react-hooks/preserve-manual-memoization обошёл — не возвращаю функцию из useMemo, formatter обычная функция), `npm run dev` `/` → 200.
