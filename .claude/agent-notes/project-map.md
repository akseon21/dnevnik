# Карта проекта

```
dnevnik/
├── data/
│   └── competition.ts        ← ЕДИНСТВЕННЫЙ источник данных. Типы (Ticker/Position/TimelinePoint/Participant/Competition) + объект competition. Пользователь редактирует ТОЛЬКО этот файл для обновления дашборда.
├── lib/
│   └── standings.ts          ← производные данные из competition: статистика участников, лидер/аутсайдер, getChartData() (строки для recharts + __avg), форматтеры, initials(), formatTs()
├── app/
│   ├── layout.tsx            ← root layout: тёмная тема, lang=ru, JetBrains Mono, мета из competition.title
│   ├── globals.css           ← Tailwind v4 + CSS-переменные тёмной темы (--panel/--border/--muted/--accent/--pos/--neg)
│   ├── page.tsx              ← главная страница (server component): заголовок + строка тикеров + <EquityChart> + карточки участников
│   └── components/
│       └── EquityChart.tsx   ← client component ("use client"): recharts LineChart — multi-line equity, пунктир __avg, ReferenceDot с инициалами на концах, кастомный Tooltip
├── public/                   ← дефолтные SVG из create-next-app (не используются, можно удалить позже)
├── .claude/agent-notes/      ← это место: decisions.md / project-map.md / current-task.md
├── README.md                 ← что это, как добавлять данные, как запустить, как деплоить
├── AGENTS.md / CLAUDE.md     ← от create-next-app: «это не тот Next.js что ты знаешь», читать node_modules/next/dist/docs/
└── package.json              ← next 16.2.6, react 19, recharts 3.8.1, tailwind v4
```

## Где что менять

- **Добавить точку баланса участнику** → `data/competition.ts` → нужный `participant.timeline` → новый `{ ts, value }`
- **Обновить цены тикеров** → `data/competition.ts` → `tickers[].price` / `change24h`
- **Добавить/убрать участника** → `data/competition.ts` → массив `participants` (не забыть уникальный `color`)
- **Поменять заголовок/период** → `data/competition.ts` → `title` / `startDate` / `endDate`
- **Изменить вид графика** → `app/components/EquityChart.tsx`
- **Изменить раскладку дашборда** → `app/page.tsx`
- **Цвета темы** → `app/globals.css`
- **Логика лидера/аутсайдера, форматтеры** → `lib/standings.ts`

## Конвенции
- alias `@/` → корень проекта (`tsconfig.json`)
- Всё UI — по-русски, кроме тикеров (XAUUSD и т.п.) и LONG/SHORT
- recharts работает только в client component → график вынесен в `app/components/EquityChart.tsx`
