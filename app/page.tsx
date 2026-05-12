import Link from "next/link";
import { getCompetitionData } from "@/lib/db";
import {
  getParticipantStats,
  getLeaderboard,
  getChartData,
  getFeedEvents,
  formatTs,
} from "@/lib/standings";
import DashboardShell from "./components/DashboardShell";
import Leaderboard from "./components/Leaderboard";
import TickerStrip from "./components/TickerStrip";
import EventTicker from "./components/EventTicker";

const RULES_TEXT = `Реалити-торговля сообщества: участники торгуют форекс-инструменты (золото, серебро, валютные пары) и публично показывают динамику своего депозита.

• Каждый участник стартует со своим депозитом — на графике видна equity-кривая.
• Балансы и позиции обновляются раз в день, в конце торгового дня.
• Лидер и аутсайдер считаются по изменению депозита в % от старта.
• «Размер лота» — объём позиции в лотах; «План выхода» — уровни TP/SL.
• Закрытые сделки попадают во вкладку «Закрытые сделки».`;

// Данные могут приходить из Supabase — не кешируем агрессивно.
export const revalidate = 0;

export default async function Home() {
  const competition = await getCompetitionData();
  const stats = getParticipantStats(competition);
  const top = getLeaderboard(stats);
  const { rows } = getChartData(competition);
  const lines = competition.participants.map((p) => ({
    name: p.name,
    color: p.color,
  }));
  const feedEvents = getFeedEvents(competition);

  const periodLabel = `${formatTs(competition.startDate)} — ${formatTs(competition.endDate)}`;
  const eventStartLabel = `Соревнование стартует ${formatTs(competition.startDate)}`;

  return (
    <main className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
      {/* ─── Заголовок ─── */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {competition.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Период: {periodLabel} · Участников: {competition.participants.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-accent"
          >
            Админка
          </Link>
          <div className="text-[10px] uppercase tracking-widest text-muted">
            Реалити-торговля · live-дашборд
          </div>
        </div>
      </header>

      {/* ─── Лидерборд с медальками ─── */}
      <Leaderboard top={top} />

      {/* ─── Верхняя строка тикеров (авто-обновление через /api/tickers) ─── */}
      <TickerStrip initial={competition.tickers} />

      {/* ─── Бегущая лента событий (закрытые сделки) ─── */}
      <EventTicker events={feedEvents} startLabel={eventStartLabel} />

      {/* ─── Интерактивная часть: фильтр + график + участники + табы ─── */}
      <DashboardShell
        stats={stats}
        rows={rows}
        lines={lines}
        note={competition.note}
        rulesText={RULES_TEXT}
        startDate={competition.startDate}
        endDate={competition.endDate}
      />

      <footer className="pt-2 text-center text-[10px] text-muted">
        {competition.title} · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
