# Карта проекта (v2-структура)

```
dnevnik/
├── supabase/
│   └── migrations/
│       └── 0001_init.sql      ← схема: competition_meta, participants, balance_points, positions, tickers + RLS (public SELECT для anon, запись только service_role). Прогнать через Supabase SQL Editor или `supabase db push`.
├── data/
│   └── competition.ts         ← СТАТИЧЕСКИЙ FALLBACK (используется когда Supabase не настроен). Реэкспортит типы из lib/types.ts + объект competition (плейсхолдеры + примеры позиций).
├── lib/
│   ├── types.ts               ← канонические типы: Ticker / Position (side, lot, exitPlan, unrealizedPnl, status open|closed, openedAt, closedAt) / TimelinePoint / Participant (+ positions, availableCash) / Competition (+ note)
│   ├── supabase.ts            ← фабрики клиентов: hasSupabase()/hasServiceRole(), getAnonClient() (чтение, RLS), getServiceClient() (запись, обходит RLS — только server). Читает env.
│   ├── db.ts                  ← getCompetitionData(): Supabase (если env есть) → собирает Competition из 5 таблиц; иначе/при ошибке → статика. Логирует деградацию.
│   └── standings.ts           ← производные из Competition (передаётся аргументом): getParticipantStats(c) → ParticipantStat (+ availableCash/openPositions/closedPositions/unrealizedPnl), getLeaderAndOutsider(stats), getChartData(c) (строки для recharts + __avg), форматтеры (formatMoney/formatSignedMoney/formatPct/initials/formatTs)
├── app/
│   ├── layout.tsx             ← root layout: тёмная тема, lang=ru, JetBrains Mono. generateMetadata() → competition.title из getCompetitionData()
│   ├── globals.css            ← Tailwind v4 + CSS-переменные тёмной темы (--panel/--border/--muted/--accent/--pos/--neg)
│   ├── page.tsx               ← главная (server, revalidate=0): await getCompetitionData() → заголовок (+ ссылка /admin) + строка тикеров (+ лидер/аутсайдер) + <DashboardShell> + футер с пометкой
│   ├── components/
│   │   ├── EquityChart.tsx    ← client: recharts LineChart — multi-line equity, пунктир __avg, ReferenceDot с инициалами, кастомный Tooltip. Принимает rows + lines (lines уже отфильтрованы).
│   │   └── DashboardShell.tsx ← client: состояние фильтра участников (дропдаун-чекбоксы) + активного таба. Рендерит: тулбар (пометка + фильтр), 2-кол. сетку (слева — <EquityChart> + сводные карточки; справа — табы + правые карточки участников с таблицами позиций / закрытые сделки / список наблюдения=заглушка / о соревновании)
│   └── admin/
│       ├── actions.ts         ← "use server": login/logout (пароль ADMIN_PASSWORD → httpOnly-cookie), getAdminData() (читает с id через service-client), мутации addBalancePoint/addPosition/closePosition/upsertParticipant/upsertTicker/upsertMeta (сигнатура (prev,fd)=>ActionResult, guarded: auth+hasServiceRole, revalidatePath("/") после успеха)
│       ├── page.tsx           ← server: нет ADMIN_PASSWORD → "не настроена"; не залогинен → форма пароля; нет ключей Supabase → "БД не подключена"; иначе → <AdminPanel data={getAdminData()}>
│       └── AdminPanel.tsx     ← client: нативные формы (FormData) + useActionState, статус ok/error под каждой
├── public/                    ← дефолтные SVG из create-next-app (не используются)
├── .env.example               ← NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD
├── .claude/agent-notes/       ← decisions.md / project-map.md / current-task.md
├── README.md                  ← два режима (Supabase / статика), как подключить, как запустить/деплоить
└── package.json               ← next 16.2.6, react 19, recharts 3.8.1, tailwind v4, @supabase/supabase-js 2.105
```

## Где что менять

- **Подключить Supabase** → заполнить `.env.local` из `.env.example` + прогнать `supabase/migrations/0001_init.sql`
- **Изменить схему БД** → новый файл `supabase/migrations/000N_*.sql` + обновить типы в `lib/types.ts` и маппинг в `lib/db.ts`
- **Без БД — данные** → `data/competition.ts` (timeline / tickers / participants / title / startDate / endDate / note)
- **Логика загрузки данных / fallback** → `lib/db.ts`
- **Вид графика** → `app/components/EquityChart.tsx`
- **Раскладка дашборда, табы, фильтр, карточки участников** → `app/components/DashboardShell.tsx`
- **Шапка / строка тикеров / лидер-аутсайдер** → `app/page.tsx`
- **Расчёты статистики, форматтеры** → `lib/standings.ts`
- **Формы админки** → `app/admin/AdminPanel.tsx` (UI) + `app/admin/actions.ts` (логика/мутации)
- **Цвета темы** → `app/globals.css`

## Конвенции
- alias `@/` → корень проекта (`tsconfig.json`)
- Всё UI — по-русски, кроме тикеров (XAUUSD и т.п.) и LONG/SHORT
- recharts и любой client-state → "use client" компонент (EquityChart, DashboardShell, AdminPanel)
- `lib/supabase.ts` / `lib/db.ts` / `app/admin/actions.ts` — ТОЛЬКО server (никогда не импортировать из "use client"); service-role ключ не утекает на клиент
- Server Actions для мутаций (нативный FormData), без библиотек форм
