import { formatMoney, formatPct, initials, type ParticipantStat } from "@/lib/standings";

// Лидерборд с медальками: топ-3 участника по росту % (current/start − 1).
// Если участников меньше 3 — показываем сколько есть.

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ top }: { top: ParticipantStat[] }) {
  return (
    <section className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          🏆 Лидерборд — топ по росту
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted">
          {top.length < 3 ? `участников: ${top.length}` : "по % к старту"}
        </span>
      </div>
      {top.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted">Пока нет участников</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-3">
          {top.map((s, i) => {
            const cls =
              s.changePct > 0 ? "text-pos" : s.changePct < 0 ? "text-neg" : "text-muted";
            return (
              <li
                key={s.name}
                className="flex items-center gap-3 rounded-md border border-border/70 bg-background/40 px-3 py-2"
              >
                <span className="text-xl leading-none">{MEDALS[i] ?? "•"}</span>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                  style={{ borderColor: s.color, color: s.color }}
                  aria-hidden
                >
                  {initials(s.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {s.name}
                  </span>
                  <span className="flex items-baseline gap-1.5 text-xs">
                    <span className={`font-bold tabular-nums ${cls}`}>
                      {formatPct(s.changePct)}
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatMoney(s.currentValue)}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
