# Текущий статус

## v1 — ГОТОВ (2026-05-12)
Дашборд: тикеры + equity-график + карточки участников, тёмная тема, статика `data/competition.ts`. Закоммичено (`feat: initial dashboard v1 …`), НЕ запушено.

## v2-СТРУКТУРА — ГОТОВА (2026-05-12)

Построено всё, что можно без живой БД (с graceful fallback на статику):

- **SQL-схема** `supabase/migrations/0001_init.sql`: таблицы `competition_meta`, `participants`, `balance_points` (unique participant_id+ts), `positions` (side LONG/SHORT, status open/closed, opened_at/closed_at), `tickers`. RLS включён везде, политики — публичный SELECT для anon; запись только через service_role (обходит RLS). Seed закомментирован.
- **Типы** `lib/types.ts` — канонический shape (Competition/Participant/Position/TimelinePoint/Ticker). `data/competition.ts` теперь реэкспортит их и хранит ПЛЕЙСХОЛДЕРЫ (+ примеры позиций open/closed).
- **Слой данных** `lib/db.ts` → `getCompetitionData()`: если есть `NEXT_PUBLIC_SUPABASE_URL`+`NEXT_PUBLIC_SUPABASE_ANON_KEY` — тянет из Supabase и собирает объект; иначе (или при ошибке БД) — возвращает статику. `lib/supabase.ts` — фабрики `getAnonClient()` / `getServiceClient()` + `hasSupabase()` / `hasServiceRole()`.
- **`app/page.tsx`** переведён на `getCompetitionData()` (server component, `revalidate = 0`). `lib/standings.ts` — функции теперь принимают `Competition` аргументом, в `ParticipantStat` добавлены `availableCash`/`openPositions`/`closedPositions`/`unrealizedPnl`, хелпер `formatSignedMoney`.
- **`app/components/DashboardShell.tsx`** (client) — фильтр «Все участники» (дропдаун-чекбоксы, влияет на график + карточки), табы (Открытые позиции / Закрытые сделки / Список наблюдения=заглушка / О соревновании), правые карточки участников с таблицами позиций + «Свободные средства», 2-колоночная сетка (график слева, панель справа).
- **`app/admin/`**:
  - `actions.ts` (`"use server"`) — `login`/`logout` (пароль из `ADMIN_PASSWORD`, httpOnly-cookie 30д), `getAdminData()` (читает с id через service-client), мутации: `addBalancePoint`, `addPosition`, `closePosition`, `upsertParticipant`, `upsertTicker`, `upsertMeta` — все guarded (проверка auth + `hasServiceRole`), `revalidatePath("/")` после успеха. Сигнатура мутаций: `(prev: ActionResult|null, fd: FormData) => Promise<ActionResult>` (под `useActionState`).
  - `page.tsx` (server) — нет `ADMIN_PASSWORD` → «админка не настроена»; есть, но не залогинен → форма пароля; залогинен, но нет ключей Supabase → «БД не подключена»; иначе → `<AdminPanel>`.
  - `AdminPanel.tsx` (client) — нативные формы + `useActionState`, статус ok/error под каждой формой.
- **`.env.example`** — 4 переменные. `.gitignore` — добавлен `!.env.example`.
- **Зависимость** `@supabase/supabase-js` ^2.105 добавлена.
- README переписан под два режима (Supabase / статика) + инструкция подключения.

### Валидация
- `npm run lint` — чисто.
- `npm run build` — чисто. В `.env.local` уже лежат живые URL+anon+service ключи (их положил пользователь), но миграция ещё НЕ прогнана → `getCompetitionData()` ловит `PGRST205 (table not found)` и корректно деградирует на статику.
- `npm run dev` (порт 4123) — `/` → 200 (дашборд со статикой, табы/фильтр/карточки в HTML), `/admin` → 200 («Админка не настроена» — `ADMIN_PASSWORD` пустой).

## ЧТО ОСТАЛОСЬ — подключить реальный Supabase
1. Проект на supabase.com (судя по `.env.local` — уже создан, ключи лежат).
2. Прогнать `supabase/migrations/0001_init.sql`: через **SQL Editor** в дашборде Supabase (скопировать файл, выполнить) ИЛИ `supabase db push` (нужен CLI + `supabase link`; CLI на маке сейчас НЕ установлен).
3. Заполнить `ADMIN_PASSWORD` в `.env.local` (сейчас пусто).
4. Добавить все 4 переменные в Vercel → Environment Variables → Redeploy.
5. Залить данные через `/admin` (или раскомментировать seed / написать insert'ы).

### Как тестировать после подключения
- `npm run dev` → `/` показывает данные из БД (не плейсхолдеры). БД пустая → пустой дашборд; добавь через `/admin`.
- `/admin` → ввести `ADMIN_PASSWORD` → формы работают (добавил точку баланса → появилась на графике; обнови `/`).
- Проблема с БД → в логах сервера `[db] Supabase fetch failed, falling back to static` + код PostgREST.

## v3 (потом)
Live-тикеры (Finnhub/TwelveData free API), анимации линий, экспорт графика PNG, лидерборд с медальками, реальные аватары.

## Открытые вопросы к пользователю
1. Реальные имена участников + стартовые депозиты (сейчас плейсхолдеры Кирилл/Алексей/Павел/Lauris/Руслан).
2. Реальное название/даты соревнования (сейчас «Реалити-торговля: 2 недели», 13–27 мая 2026).
3. Точный список тикеров верхней строки.
4. Реальные фото-аватары (сейчас инициалы).
