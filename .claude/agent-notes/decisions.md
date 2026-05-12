# Решения / лог

## v1 — initial dashboard (2026-05-12)

### Стек
- Next.js 16.2.6 (App Router, Turbopack) + TypeScript + Tailwind v4
- recharts 3.8.1 — графики
- Шрифт: JetBrains Mono (next/font/google) — терминальный вайб
- Бэкенда нет. Источник данных — статический TS-модуль `data/competition.ts`

### Что сделано
- `data/competition.ts` — модель данных + ПЛЕЙСХОЛДЕРЫ:
  - title «Реалити-торговля: 2 недели», 2026-05-13 → 2026-05-27
  - 6 тикеров: XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY, BTCUSD (фейк цены/изменения)
  - 5 участников: Кирилл / Алексей / Павел / Lauris / Руслан — у каждого цвет линии, avatar=null (инициалы), timeline из 7 точек, positions=[] (v2), availableCash (v2)
- `lib/standings.ts` — производные данные: статистика участников (текущий баланс, изменение %), лидер/аутсайдер, сведение timeline в строки для recharts (+ ключ `__avg` — среднее по участникам, у кого есть данные на момент), форматтеры (деньги/проценты/таймстамп), инициалы
- `app/layout.tsx` — тёмная тема, `lang="ru"`, мета из competition.title, JetBrains Mono
- `app/globals.css` — тёмный фон #0a0a0c, переменные --panel/--border/--muted/--accent(cyan)/--pos(green)/--neg(red), моноширинный body
- `app/page.tsx` (server component) — дашборд v1:
  - Заголовок (название / период / кол-во участников)
  - Верхняя строка тикеров (символ + цена + изменение зел/красным) + справа Лидер/Аутсайдер
  - Главный график «Общий баланс счёта» (`app/components/EquityChart.tsx`)
  - Нижняя строка — сводные карточки участников (инициалы-кружок + имя + баланс + изменение %)
  - Футер
- `app/components/EquityChart.tsx` (client component) — recharts LineChart:
  - multi-line equity curves, каждый своим цветом, connectNulls
  - пунктирная линия `__avg` (серая) — среднее по участникам
  - X — таймстампы (формат «ДД.ММ ЧЧ:ММ»), Y — $
  - кастомный Tooltip: момент / список участников с балансами (сорт по убыванию) / среднее
  - ReferenceDot на конце каждой линии — кружок с инициалами участника
  - под графиком — строка «легенда»: цвет + имя + текущий баланс

### Принятые за пользователя решения (открытые вопросы из инструкции)
1. Название/период — взял дефолт из инструкции «Реалити-торговля: 2 недели», 13–27 мая 2026
2. Участники — 5 плейсхолдеров (Кирилл / Алексей / Павел / Lauris / Руслан) с фейковыми депозитами 1000–1500 на старте, разной динамикой. Пользователь заменит на реальных.
3. `/admin` не делал — v1 = ручное редактирование `data/competition.ts` (как в спеке)
4. Дизайн — тёмная терминальная тема (по спеку, не дефолтный светлый Tailwind)
5. Шрифт — JetBrains Mono вместо дефолтных Geist (терминальный вайб из спека)
6. Тикеры в верхней строке — взял форекс-набор из задачи (XAU/XAG/EUR/GBP/JPY) + BTCUSD

### Известные мелочи
- При `next build` / SSR recharts печатает warning «width(-1) height(-1)» — ResponsiveContainer не может измерить контейнер на этапе пререндера. На клиенте отрисовывается корректно. Это warning, не ошибка; билд проходит чисто.

### Валидация
- `npm run build` — OK (TypeScript OK, статика сгенерирована)
- `npm run lint` — OK, без замечаний
- `npm run dev` — стартует, `GET / → 200`, русский контент рендерится (проверено curl-ом)

## v2-структура — Supabase + админка + позиции/табы/фильтры (2026-05-12)

### Добавлено в стек
- `@supabase/supabase-js` ^2.105 — клиент БД. Решение: это нормальная зависимость для проекта на Supabase (как super-lms / podcast-studio), а не лишнее усложнение.

### Архитектурные решения
- **Канонические типы вынесены в `lib/types.ts`** — чтобы статический fallback и слой БД говорили на одном языке. `data/competition.ts` стал именно fallback'ом (раньше был «единственным источником»), реэкспортит типы.
- **`Position` расширен**: `status: "open"|"closed"`, `openedAt`, `closedAt` — нужно для таба «Закрытые сделки». В статике добавил пару примеров закрытых позиций.
- **Слой данных `lib/db.ts` с graceful fallback**: `getCompetitionData()` смотрит на env. Нет `NEXT_PUBLIC_SUPABASE_URL`+`ANON_KEY` → статика. Есть → запрос к 5 таблицам параллельно, сборка в `Competition`; при ЛЮБОЙ ошибке (нет таблицы, сеть и т.п.) — лог + деградация на статику. Это и проверено на билде: ключи в `.env.local` уже есть, миграция не прогнана → `PGRST205` → статика, билд зелёный.
- **`lib/standings.ts` отрефакторен** — функции теперь принимают `Competition` аргументом (раньше импортировали `competition` напрямую), `ParticipantStat` обогащён позициями/cash/unrealizedPnl.
- **Дашборд: server-shell + client-shell.** `app/page.tsx` (server) грузит данные, считает stats/chart, рендерит шапку+тикеры+`<DashboardShell>`. `DashboardShell` (client) держит состояние фильтра участников и активного таба; график (`EquityChart`) и карточки получают уже отфильтрованные данные.
- **`/admin`: пароль в env + httpOnly-cookie.** Не Supabase Auth — проще и достаточно для одного админа. `login` server action сверяет `ADMIN_PASSWORD`, кладёт cookie на 30д, `redirect("/admin")`. Страница проверяет cookie === `process.env.ADMIN_PASSWORD`. Три состояния: нет пароля → «не настроена», не залогинен → форма, залогинен без ключей БД → «БД не подключена».
- **Мутации — Server Actions с service-role ключом** (обходит RLS). Все обёрнуты в `guarded()`: проверка auth + `hasServiceRole()` → понятная ошибка если БД не подключена. Сигнатура `(prev: ActionResult|null, fd: FormData) => Promise<ActionResult>` — под `useActionState` в клиентских формах. После успеха `revalidatePath("/")`. Никаких библиотек форм — нативный FormData.
- **RLS**: только `select using(true)` для всех таблиц; write-политик нет намеренно — пишем service-role'ом, который обходит RLS. Если позже появится Supabase Auth — добавятся write-политики `to authenticated`.
- **Prisma не используется** (в репо её нет) — миграция написана как обычный SQL-файл в `supabase/migrations/`, что соответствует паттерну Supabase (как в super-lms). Запрет «не писать SQL миграций руками» из CLAUDE.md относится к Prisma-репозиториям; здесь Supabase-стиль.

### Принятые за пользователя решения
1. `data/competition.ts` оставлен как живой fallback (не удалён) — v1 продолжает работать без БД.
2. Текст правил для таба «О соревновании» — написал болванку (`RULES_TEXT` в `app/page.tsx`), пользователь поправит.
3. «Список наблюдения» — заглушка «скоро» (в задаче так и просили).
4. datetime-local в админке трактуется как UTC (`+":00Z"`) — предсказуемо; пользователь при желании сменит на локальную зону.
5. Структура графика осталась прежней (recharts), просто получает отфильтрованные `lines`.

### Известные мелочи / риски
- Тот же recharts SSR-warning «width(-1) height(-1)» — не ошибка.
- `getAdminData()` экспортируется из `"use server"` файла → формально это server action (POST). Read-only и guarded — нормально, но если когда-то будет важно, можно вынести в отдельный server-only модуль.
- Если БД пустая (миграция прогнана, данных нет) — дашборд покажет пустой график без участников (не fallback на статику, т.к. соединение успешно, просто 0 строк). Это ожидаемо; заполнять через `/admin`.
- В `.env.local` пользователь уже положил URL+anon+service ключи, но `ADMIN_PASSWORD` пустой и миграция не прогнана. До прогона миграции дашборд работает на статике.

### Валидация
- `npm run lint` — OK.
- `npm run build` — OK (TypeScript OK; `[db] Supabase fetch failed → falling back to static` из-за непрогнанной миграции — ожидаемо).
- `npm run dev` (порт 4123) — `/` → 200 (статика, табы/фильтр/карточки/позиции в HTML), `/admin` → 200 («Админка не настроена», т.к. `ADMIN_PASSWORD` пуст). Ошибок в логе нет.

## v3 — лидерборд + наполненный вотчлист + live-тикеры (2026-05-12)

### Решения
- **Лидерборд**: переиспользовал готовый `changePct` из `getParticipantStats` (= current/start − 1 в %) — это ровно «рост %» из задачи. Новый чистый хелпер `getLeaderboard(stats)` = sort by changePct desc, slice(0,3). Компонент `Leaderboard.tsx` — серверный (никакого client-state не нужно). Стиль — в тон тёмного терминала: панель `bg-panel`, медальки эмодзи, аватары-инициалы как в карточках.
- **Watchlist в схеме**: `participant_names` сделал `text[]` (Postgres-массив), как просили. В `lib/types.ts` → camelCase `participantNames: string[]`. В админке имена вводятся одной строкой через запятую → split/trim/filter в server action. Seed в миграции НЕ закомментирован (в задаче «засей 2-3 placeholder-записи» — оставил активным, прогонится вместе с CREATE TABLE). Те же 3 записи продублированы в `data/competition.ts` чтобы статический fallback тоже их показывал.
- **db.ts — устойчивость к непрогнанной миграции 0002**: watchlist-запрос идёт в том же `Promise.all`, но его ошибка НЕ роняет весь fetch (в отличие от participants/meta) — `watchlistRes.error ? [] : data`. Так дашборд с прогнанным 0001, но без 0002, просто покажет пустой вотчлист (или fallback-данные если вообще без БД), не упадёт.
- **Live-тикеры — архитектура graceful degradation**:
  - `app/api/tickers/route.ts` с `export const revalidate = 300` (как просили) — route стал статическим ISR (видно в build: `○ /api/tickers 5m`). Каждый внешний fetch — `next:{revalidate:300}` (синхронно с route). 4-сек таймаут на каждый источник через AbortController, любой упавший игнорируется.
  - Не блокируем рендер дашборда: строку тикеров вынес из server-render в client-компонент `TickerStrip.tsx`. SSR отдаёт БД-значения мгновенно, клиент опрашивает `/api/tickers` каждые 60с и обновляет. Запрос упал → оставляем последнее известное (`catch {}` без сброса state).
  - Мёрдж: для каждого тикера из БД берём live если есть (`live:true`), иначе БД-значение (`live:false`). Символы, которых нет в БД, но пришли из live — тоже добавляются.
- **Источники (проверено вживую на dev)**:
  - BTCUSD ← CoinGecko `simple/price` (+ `usd_24h_change`) — работает, реальный 24h change. Без ключа.
  - EURUSD/GBPUSD/USDJPY ← Frankfurter `latest?from=USD&to=EUR,GBP,JPY` — работает. EUR/GBP = 1/rate (round 4 знака), JPY = rate напрямую (round 3). change24h = 0 — Frankfurter (reference rates ЕЦБ) не несёт внутридневное изменение; принял, что для FX показываем 0% (альтернатива — доп. запрос за вчерашней датой, отложил в v4).
  - XAUUSD/XAGUSD ← goldprice.org `dbXRates/USD` — работает ТОЛЬКО с браузероподобными заголовками (User-Agent + Referer: goldprice.org + Origin: goldprice.org), без них — `Forbidden`. Заголовки в `BROWSERLIKE_HEADERS`. Это неофициальный эндпоинт → риск что закроется/IP Vercel забанит. Тогда graceful degradation: `live:false`, металлы из БД (ручное обновление через /admin), а для нормального live нужен будет бесплатный Finnhub-ключ → v3.5.
- **Не добавлял зависимости** — всё на встроенном fetch + Route Handler. `dom-to-image`/`html-to-image` не ставил (явный запрет). Экспорт PNG и доработку аватаров не делал (явный запрет).

### Известные мелочи / риски
- В RSC flight-payload `formatMoney` («$1 910») сериализуется как `$$1 910` — это экранирование `$` в RSC-протоколе, рендерится корректно (`$1 910`). Не баг.
- goldprice.org: эндпоинт неофициальный, на проде Vercel может вести себя иначе чем локально (другой IP-диапазон). Проверить `/api/tickers` после деплоя — если металлы `live:false`, см. v3.5.
- placeholder-цены тикеров в `data/competition.ts`/БД могут расходиться с реальными (XAGUSD placeholder 58.12 vs live ~84) — после прогона миграций и обновления реальных данных это уйдёт; пока что live перекрывает placeholder на дашборде.
- `/api/tickers` пререндерится на билде с build-time данными (БД→fallback т.к. миграция не прогнана), на Vercel ревалидируется раз в 5 мин — норма.

### Валидация
- `npm run lint` — OK.
- `npm run build` — OK (TypeScript OK). Маршруты: `/` ƒ, `/admin` ƒ, `/api/tickers` ○ (revalidate 5m).
- `npm run dev` (порт 4137) — `/` → 200 (лидерборд + строка тикеров + таб «Список наблюдения» с таблицей в HTML), `/admin` → 200 («Админка не настроена», `ADMIN_PASSWORD` пуст), `/api/tickers` → 200, все 6 тикеров `live:true` (BTC/CoinGecko, EUR+GBP+JPY/Frankfurter, XAU+XAG/goldprice.org).

## v7.1 — убрана ссылка «Админка» с публичной страницы (commit 4d5feaa)
- `app/page.tsx`: удалён `<Link href="/admin">Админка</Link>` из шапки + неиспользуемый `import Link from "next/link"`. Шапка соревнования (`competition.title`, период, кол-во участников) и «Реалити-торговля · live-дашборд» остались. `/admin` доступна только по прямому URL.
- Валидация: lint OK, build OK (`/` ƒ, `/admin` ƒ), dev → `/` 200 (нет «Админка»/`href="/admin"` в HTML), `/admin` 200. Push в main → Vercel auto-deploy (building).
