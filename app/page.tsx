import { competition } from "@/data/competition";
import {
  getParticipantStats,
  getLeaderAndOutsider,
  getChartData,
  formatMoney,
  formatPct,
  initials,
  formatTs,
} from "@/lib/standings";
import EquityChart from "./components/EquityChart";

function ChangeText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={cls}>{formatPct(value)}</span>;
}

function periodLabel(): string {
  return `${formatTs(competition.startDate)} — ${formatTs(competition.endDate)}`;
}

export default function Home() {
  const stats = getParticipantStats();
  const { leader, outsider } = getLeaderAndOutsider();
  const { rows } = getChartData();
  const lines = competition.participants.map((p) => ({
    name: p.name,
    color: p.color,
  }));

  return (
    <main className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
      {/* ─── Заголовок ─── */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {competition.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Период: {periodLabel()} · Участников:{" "}
            {competition.participants.length}
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted">
          Реалити-торговля · live-дашборд
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

      {/* ─── Главный график ─── */}
      <section className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Общий баланс счёта
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-muted">
            пунктир — среднее по участникам
          </span>
        </div>
        <EquityChart rows={rows} lines={lines} />
      </section>

      {/* ─── Нижняя строка: сводные карточки участников ─── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.name}
            className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                style={{ borderColor: s.color, color: s.color }}
              >
                {initials(s.name)}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {s.name}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="tabular-nums text-base font-bold text-foreground">
                {formatMoney(s.currentValue)}
              </span>
              <ChangeText value={s.changePct} />
            </div>
          </div>
        ))}
      </section>

      <footer className="pt-2 text-center text-[10px] text-muted">
        Данные обновляются вручную · {periodLabel()}
      </footer>
    </main>
  );
}
