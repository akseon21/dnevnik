# dnevnik — дашборд соревнования по трейдингу

Публичная страница, где видно, как участники реалити-торговли растут/проседают по балансу счёта во времени.

- **Стек:** Next.js (App Router) + TypeScript + Tailwind + recharts + Supabase (опционально)
- **Источник данных:** Supabase, если настроены переменные окружения; иначе — статический файл `data/competition.ts` (fallback, как в v1).
- **Тема:** тёмная, терминальная. Весь интерфейс по-русски (кроме тикеров и LONG/SHORT).

## Что на дашборде

1. Заголовок — название соревнования, период, число участников. Ссылка на `/admin`.
2. Верхняя строка тикеров — XAUUSD / XAGUSD / EURUSD / ... с ценами и суточным изменением. Справа — лидер и аутсайдер на текущий момент.
3. Тулбар — пометка «📊 данные обновляются раз в день» + дропдаун-фильтр «Все участники» (выбор, кого показывать на графике и в карточках).
4. Главный график «Общий баланс счёта» — линия баланса по каждому участнику своим цветом, пунктир — среднее по всем. Кружок с инициалами на конце каждой линии. Тултип при наведении.
5. Сводные карточки участников (под графиком) — инициалы + имя + текущий баланс + изменение %.
6. Правая панель с табами:
   - **Открытые позиции** — по каждому участнику карточка: имя, текущая прибыль/убыток (Σ нереализ. PnL), таблица открытых позиций (направление LONG/SHORT, инструмент, размер лота, план выхода, нереализ. PnL), свободные средства.
   - **Закрытые сделки** — таблица закрытых позиций всех участников.
   - **Список наблюдения** — заглушка («скоро»).
   - **О соревновании** — пометка + правила.

## Данные: два режима

### Режим A — Supabase (рекомендуется для v2)

Если заданы `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, дашборд читает из БД. Запись — через страницу `/admin` (Server Actions с `SUPABASE_SERVICE_ROLE_KEY`).

**Подключение с нуля:**

1. Создать проект на [supabase.com](https://supabase.com).
2. Прогнать миграцию `supabase/migrations/0001_init.sql` — через Supabase SQL Editor (скопировать содержимое и выполнить) или `supabase db push` (если установлен CLI и проект слинкован).
3. Скопировать `.env.example` → `.env.local`, заполнить:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — там же (секретный, не коммитить).
   - `ADMIN_PASSWORD` — любой пароль для входа в `/admin`.
4. Те же переменные добавить в Vercel: Project Settings → Environment Variables.
5. Заполнить данные через `/admin` (или раскомментировать seed в миграции).

Схема (RLS: публичное чтение, запись только service_role):
`competition_meta` · `participants` · `balance_points` · `positions` · `tickers`.

### Режим B — статический файл (fallback / v1)

Если переменные Supabase НЕ заданы — данные берутся из [`data/competition.ts`](data/competition.ts). Отредактировал → закоммитил → запушил → Vercel перерендерил.

- **Добавить точку баланса:** в нужный `participant.timeline` — `{ ts: "2026-05-20T10:00", value: 1985 }`.
- **Обновить тикеры:** `tickers[].price` / `change24h`.
- **Добавить участника:** новый объект в `participants` (уникальный `color`, `avatar: null` → инициалы, `timeline` ≥1 точки, `positions: []`, `availableCash`).
- **Заголовок/период/пометка:** `title` / `startDate` / `endDate` / `note`.

## `/admin`

- Защита — пароль из `ADMIN_PASSWORD` (httpOnly-cookie на 30 дней). Если переменная не задана — страница пишет «админка не настроена».
- Формы: добавить точку баланса · добавить/закрыть позицию · добавить/редактировать участника · обновить тикер · параметры соревнования.
- Если заданы только `ADMIN_PASSWORD`, но нет ключей Supabase — войти можно, но формы скажут «БД не подключена».

## Live prices (TwelveData)

Дашборд может пересчитывать нереализованный PnL открытых позиций **в реальном времени** из текущих рыночных цен — без правки админки руками каждые 5 минут.

**Как это работает:**

1. У открытой позиции в `/admin` указывается `entry_price` (цена входа). Если поле пустое — live-режим выключен для этой позиции, отображается ручной `unrealized_pnl` как раньше.
2. Браузер раз в `NEXT_PUBLIC_PRICES_REFRESH_MS` мс (по умолчанию 2 мин) дёргает `/api/prices?symbols=XAUUSD,EURUSD,...`.
3. Серверная route батчем тянет цены с TwelveData, кеширует на 30 сек в памяти. При ошибке/лимите — отдаёт последний удачный кеш с флагом `stale: true`.
4. Клиент пересчитывает PnL по формулам в `lib/pnl.ts` (учёт размера контракта по типу инструмента: XAUUSD = 100 oz/лот, EURUSD = 100 000/лот, USDJPY с конвертацией в USD и т.д.).
5. В карточке участника обновляется «Текущий счёт» (= депозит + Σ live PnL), цвет зел/красн относительно стартового депозита. Под счётом — открытый PnL участника.
6. В тулбаре видно «обновлено N сек назад» или «данные на HH:MM» если апстрим лёг.

**Настройка:**

1. Получи бесплатный API-ключ на [twelvedata.com](https://twelvedata.com) (регистрация → Dashboard → API Keys).
2. Локально: скопируй `.env.local.example` → `.env.local`, впиши `TWELVEDATA_API_KEY=...`.
3. На Vercel: Project Settings → Environment Variables → добавь `TWELVEDATA_API_KEY`. Опционально `NEXT_PUBLIC_PRICES_REFRESH_MS` (по умолчанию 120000).
4. Прогнать миграцию `supabase/migrations/0004_entry_price.sql` (`ALTER TABLE positions ADD COLUMN IF NOT EXISTS entry_price`).
5. У открытых позиций в `/admin` (или вручную в `data/competition.ts`) проставить `entry_price`.

**Лимиты TwelveData free:** 8 req/min, 800 req/день. При polling раз в 2 минуты батчем по 6-8 парам = 1 запрос / 2 мин = 720 req/день — вписывается. Если поставить `NEXT_PUBLIC_PRICES_REFRESH_MS=60000` (1 мин) — будет 1440 req/день и упрётся в лимит во второй половине дня.

**Без ключа:** дашборд работает как раньше (ручной `unrealized_pnl` из админки). Тулбар покажет «live выкл», `/api/prices` вернёт пустой объект.

**Тесты формул PnL:**

```bash
npm run test:pnl
```

(использует встроенный `node:test` + `--experimental-strip-types`, без зависимостей)

## Запуск локально

```bash
npm install
npm run dev      # http://localhost:3000
```

Проверка перед коммитом:

```bash
npm run build
npm run lint
```

## Деплой на Vercel

1. New Project → импортировать `akseon21/dnevnik`.
2. Framework Preset — Next.js (автоопределение).
3. Environment Variables — добавить (если используете Supabase): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`.
4. Deploy. Дальше каждый `git push` в `main` → авто-деплой.

## Структура

См. [`.claude/agent-notes/project-map.md`](.claude/agent-notes/project-map.md). Кратко: `lib/types.ts` — типы, `data/competition.ts` — статический fallback, `lib/db.ts` — слой данных (Supabase или fallback), `lib/standings.ts` — производные расчёты, `lib/supabase.ts` — клиенты, `app/page.tsx` + `app/components/DashboardShell.tsx` — дашборд, `app/components/EquityChart.tsx` — график, `app/admin/*` — админка, `supabase/migrations/0001_init.sql` — схема.

## Дорожная карта

- **v1 (готово):** тикеры + equity-график + карточки участников + тёмная тема, статический файл.
- **v2-структура (готово):** SQL-схема Supabase + слой данных с fallback + страница `/admin` (Server Actions) + правые карточки с таблицами позиций + табы + фильтр участников. Осталось — подключить реальный Supabase (см. «Режим A»).
- **v3:** live-тикеры с API, анимации, экспорт графика, лидерборд с медальками.
