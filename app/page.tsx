import Link from "next/link";
import { getCompetitionData } from "@/lib/db";
import {
  getParticipantStats,
  getLeaderAndOutsider,
  getChartData,
  formatPct,
  formatTs,
} from "@/lib/standings";
import DashboardShell from "./components/DashboardShell";

function ChangeText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={cls}>{formatPct(value)}</span>;
}

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
  const { leader, outsider } = getLeaderAndOutsider(stats);
  const { rows } = getChartData(competition);
  const lines = competition.participants.map((p) => ({
    name: p.name,
    color: p.color,
  }));

  const periodLabel = `${formatTs(competition.startDate)} — ${formatTs(competition.endDate)}`;

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

      {/* ─── Верхняя строка тикеров ─── */}
      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-panel px-4 py-2.5 text-xs">
        {competition.tickers.map((t) => {
          const up = t.change24h >= 0;
          return (
            <span key={t.symbol} className="flex items-baseline gap-1.5">
              <span className="font-bold tracking-tight text-foreground">
                {t.symbol}
              </span>
              <span className="tabular-nums text-muted">
                {t.price.toLocaleString("ru-RU")}
              </span>
              <span className={`tabular-nums ${up ? "text-pos" : "text-neg"}`}>
                {up ? "+" : ""}
                {t.change24h.toFixed(2)}%
              </span>
            </span>
          );
        })}
        <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
          {leader && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted">Лидер:</span>
              <span style={{ color: leader.color }} className="font-bold">
                {leader.name}
              </span>
              <ChangeText value={leader.changePct} />
            </span>
          )}
          {outsider && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted">Аутсайдер:</span>
              <span style={{ color: outsider.color }} className="font-bold">
                {outsider.name}
              </span>
              <ChangeText value={outsider.changePct} />
            </span>
          )}
        </span>
      </section>

      {/* ─── Интерактивная часть: фильтр + график + карточки + табы ─── */}
      <DashboardShell
        stats={stats}
        rows={rows}
        lines={lines}
        note={competition.note}
        rulesText={RULES_TEXT}
      />

      <footer className="pt-2 text-center text-[10px] text-muted">
        📊 {competition.note} · {periodLabel}
      </footer>
    </main>
  );
}
