# Карта проекта (v3)

```
dnevnik/
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql      ← схема: competition_meta, participants, balance_points, positions, tickers + RLS (public SELECT для anon, запись только service_role). Прогнать через Supabase SQL Editor или `supabase db push`.
│       └── 0002_watchlist.sql ← v3: таблица watchlist (id, instrument, note, participant_names text[], created_at) + RLS public SELECT + seed (3 placeholder-записи, НЕ закомментирован). Прогнать через Supabase SQL Editor.
├── data/
│   └── competition.ts         ← СТАТИЧЕСКИЙ FALLBACK (используется когда Supabase не настроен). Реэкспортит типы из lib/types.ts + объект competition (плейсхолдеры: участники, позиции, watchlist).
├── lib/
│   ├── types.ts               ← канонические типы: Ticker / Position / TimelinePoint / Participant / WatchlistItem (instrument, note, participantNames) / Competition (+ note, + watchlist)
│   ├── supabase.ts            ← фабрики клиентов: hasSupabase()/hasServiceRole(), getAnonClient() (чтение, RLS), getServiceClient() (запись, обходит RLS — только server). Читает env.
│   ├── db.ts                  ← getCompetitionData(): Supabase (если env есть) → собирает Competition из 6 таблиц (вкл. watchlist; если таблицы watchlist ещё нет — error → []); иначе/при ошибке → статика. Логирует деградацию.
│   └── standings.ts           ← производные из Competition (передаётся аргументом): getParticipantStats(c) → ParticipantStat, getLeaderAndOutsider(stats), getLeaderboard(stats) (топ-3 по changePct), getChartData(c), форматтеры (formatMoney/formatSignedMoney/formatPct/initials/formatTs)
├── app/
│   ├── layout.tsx             ← root layout: тёмная тема, lang=ru, JetBrains Mono. generateMetadata() → competition.title
│   ├── globals.css            ← Tailwind v4 + CSS-переменные тёмной темы (--panel/--border/--muted/--accent/--pos/--neg)
│   ├── page.tsx               ← главная (server, revalidate=0): getCompetitionData() → заголовок + <TickerStrip> + <Leaderboard> + <DashboardShell> + футер
│   ├── api/
│   │   └── tickers/route.ts   ← GET, revalidate=300. Тянет CoinGecko (BTCUSD) + Frankfurter (EUR/GBP/JPY) + goldprice.org (XAU/XAG, нужны браузероподобные заголовки) параллельно с 4-сек таймаутом, мёрджит с БД-значениями (БД=fallback), отдаёт {tickers:[{symbol,price,change24h,live}],updatedAt}. Graceful: всё легло → ровно БД.
│   ├── components/
│   │   ├── EquityChart.tsx    ← client: recharts LineChart — multi-line equity, пунктир __avg, ReferenceDot с инициалами, кастомный Tooltip
│   │   ├── TickerStrip.tsx    ← client: верхняя строка тикеров. SSR-старт с БД-значений, опрос /api/tickers каждые 60с, обновление цен, индикатор ●live/○бд, бейдж «бд» у не-live тикеров. Лидер/аутсайдер через пропсы.
│   │   ├── Leaderboard.tsx    ← server: топ-3 по росту % (медальки 🥇🥈🥉 + аватар-инициалы + рост% + текущий баланс). <3 участников → «участников: N».
│   │   └── DashboardShell.tsx ← client: фильтр участников (дропдаун-чекбоксы) + активный таб. 2-кол. сетка (слева — EquityChart + сводные карточки; справа — табы + правые карточки участников с позициями / закрытые сделки / список наблюдения=таблица WatchlistTable / о соревновании). Принимает проп watchlist.
│   └── admin/
│       ├── actions.ts         ← "use server": login/logout, getAdminData() (с id, вкл. watchlist), мутации addBalancePoint/addPosition/closePosition/upsertParticipant/upsertTicker/upsertMeta/addWatchlistItem/deleteWatchlistItem (guarded: auth+hasServiceRole, revalidatePath("/"))
│       ├── page.tsx           ← server: нет ADMIN_PASSWORD → "не настроена"; не залогинен → форма; нет ключей Supabase → "БД не подключена"; иначе → <AdminPanel>
│       └── AdminPanel.tsx     ← client: нативные формы + useActionState. Секции: точка баланса / позиция / участники / тикеры / список наблюдения (форма добавления + список с «Удалить») / параметры соревнования
├── public/                    ← дефолтные SVG из create-next-app (не используются)
├── .env.example               ← NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD
├── .claude/agent-notes/       ← decisions.md / project-map.md / current-task.md
├── README.md                  ← два режима (Supabase / статика), как подключить, как запустить/деплоить
└── package.json               ← next 16.2.6, react 19, recharts 3.8.1, tailwind v4, @supabase/supabase-js 2.105 (новых зависимостей в v3 НЕТ)
```

## Где что менять

- **Подключить Supabase** → заполнить `.env.local` из `.env.example` + прогнать `supabase/migrations/0001_init.sql` и `0002_watchlist.sql`
- **Изменить схему БД** → новый файл `supabase/migrations/000N_*.sql` + обновить типы в `lib/types.ts` и маппинг в `lib/db.ts`
- **Без БД — данные** → `data/competition.ts` (timeline / tickers / participants / watchlist / title / startDate / endDate / note)
- **Логика загрузки данных / fallback** → `lib/db.ts`
- **Вид графика** → `app/components/EquityChart.tsx`
- **Раскладка дашборда, табы, фильтр, карточки участников, таблица вотчлиста** → `app/components/DashboardShell.tsx`
- **Шапка / порядок блоков** → `app/page.tsx`
- **Строка тикеров (UI + опрос)** → `app/components/TickerStrip.tsx`; **источники live-цен** → `app/api/tickers/route.ts`
- **Лидерборд** → `app/components/Leaderboard.tsx` + `getLeaderboard()` в `lib/standings.ts`
- **Расчёты статистики, форматтеры** → `lib/standings.ts`
- **Формы админки** → `app/admin/AdminPanel.tsx` (UI) + `app/admin/actions.ts` (логика/мутации)
- **Цвета темы** → `app/globals.css`

## Конвенции
- alias `@/` → корень проекта (`tsconfig.json`)
- Всё UI — по-русски, кроме тикеров (XAUUSD и т.п.) и LONG/SHORT
- recharts и любой client-state → "use client" компонент (EquityChart, DashboardShell, AdminPanel)
- `lib/supabase.ts` / `lib/db.ts` / `app/admin/actions.ts` — ТОЛЬКО server (никогда не импортировать из "use client"); service-role ключ не утекает на клиент
- Server Actions для мутаций (нативный FormData), без библиотек форм
