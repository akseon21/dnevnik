"use client";

import { formatSignedMoney, type FeedEvent } from "@/lib/standings";

function EventItem({ e }: { e: FeedEvent }) {
  const pnlCls = e.pnl >= 0 ? "text-pos" : "text-neg";
  const dir = e.side === "LONG" ? "LONG" : "SHORT";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
      <span className="font-semibold text-foreground">{e.owner}</span>
      <span className="text-muted">закрыл</span>
      <span className="font-medium text-foreground">{dir}</span>
      <span className="font-semibold text-foreground">{e.instrument}</span>
      <span className={`tabular-nums font-semibold ${pnlCls}`}>{formatSignedMoney(e.pnl)}</span>
    </span>
  );
}

/**
 * Горизонтальная бегущая лента последних закрытых сделок. Если событий нет —
 * не рендерится (показывает строку про старт соревнования, если задана startLabel).
 */
export default function EventTicker({
  events,
  startLabel,
}: {
  events: FeedEvent[];
  startLabel?: string | null;
}) {
  if (events.length === 0) {
    if (!startLabel) return null;
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted">
        {startLabel}
      </div>
    );
  }

  return (
    <div className="marquee-wrap overflow-hidden rounded-lg border border-border bg-panel py-2">
      <div className="flex">
        {/* два одинаковых трека подряд для бесшовного цикла */}
        <div className="marquee-track">
          {events.map((e, i) => (
            <EventItem key={`a-${i}`} e={e} />
          ))}
        </div>
        <div className="marquee-track" aria-hidden="true">
          {events.map((e, i) => (
            <EventItem key={`b-${i}`} e={e} />
          ))}
        </div>
      </div>
    </div>
  );
}
