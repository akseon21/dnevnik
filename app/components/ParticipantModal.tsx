"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  formatMoney,
  formatPct,
  formatSignedMoney,
  formatTs,
  getParticipantSummary,
  initials,
  type ParticipantStat,
} from "@/lib/standings";
import type { Position } from "@/lib/types";

function ChangeText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={cls}>{formatPct(value)}</span>;
}

function PnlText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={`tabular-nums ${cls}`}>{formatSignedMoney(value)}</span>;
}

function SideBadge({ side }: { side: Position["side"] }) {
  const long = side === "LONG";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
        long ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"
      }`}
    >
      {side}
    </span>
  );
}

function OpenPositions({ positions }: { positions: Position[] }) {
  if (positions.length === 0)
    return <p className="py-2 text-center text-xs text-muted">Открытых позиций нет</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            <th className="py-1 pr-2 font-medium">Направление</th>
            <th className="py-1 pr-2 font-medium">Инструмент</th>
            <th className="py-1 pr-2 font-medium">Размер лота</th>
            <th className="py-1 pr-2 font-medium">План выхода</th>
            <th className="py-1 text-right font-medium">Нереализ. PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="py-1.5 pr-2"><SideBadge side={p.side} /></td>
              <td className="py-1.5 pr-2 font-semibold text-foreground">{p.instrument}</td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">{p.lot.toLocaleString("ru-RU")}</td>
              <td className="py-1.5 pr-2 text-muted">{p.exitPlan || "—"}</td>
              <td className="py-1.5 text-right"><PnlText value={p.unrealizedPnl} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClosedTrades({ positions }: { positions: Position[] }) {
  if (positions.length === 0)
    return <p className="py-2 text-center text-xs text-muted">Закрытых сделок пока нет</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            <th className="py-1 pr-2 font-medium">Направление</th>
            <th className="py-1 pr-2 font-medium">Инструмент</th>
            <th className="py-1 pr-2 font-medium">Размер лота</th>
            <th className="py-1 pr-2 font-medium">Период</th>
            <th className="py-1 text-right font-medium">Результат PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="py-1.5 pr-2"><SideBadge side={p.side} /></td>
              <td className="py-1.5 pr-2 font-semibold text-foreground">{p.instrument}</td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">{p.lot.toLocaleString("ru-RU")}</td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {p.openedAt ? formatTs(p.openedAt) : "—"} → {p.closedAt ? formatTs(p.closedAt) : "—"}
              </td>
              <td className="py-1.5 text-right"><PnlText value={p.unrealizedPnl} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function StatsBlock({ stat }: { stat: ParticipantStat }) {
  const s = getParticipantSummary(stat);
  const dash = "—";
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Статистика
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Винрейт">
          {s.winRate === null ? (
            <span className="text-muted">{dash}</span>
          ) : (
            <span className={s.winRate >= 50 ? "text-pos" : "text-neg"}>
              {s.winRate.toFixed(0)}%
            </span>
          )}
        </Metric>
        <Metric label="Всего сделок">
          <span className="tabular-nums">{s.totalTrades}</span>
        </Metric>
        <Metric label="Закрытых сделок">
          <span className="tabular-nums">{s.closedCount}</span>
        </Metric>
        <Metric label="Лучшая сделка">
          {s.best ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-foreground">{s.best.instrument}</span>
              <PnlText value={s.best.unrealizedPnl} />
            </span>
          ) : (
            <span className="text-muted">{dash}</span>
          )}
        </Metric>
        <Metric label="Худшая сделка">
          {s.worst ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-foreground">{s.worst.instrument}</span>
              <PnlText value={s.worst.unrealizedPnl} />
            </span>
          ) : (
            <span className="text-muted">{dash}</span>
          )}
        </Metric>
        <Metric label="Средний PnL / сделку">
          {s.avgPnl === null ? (
            <span className="text-muted">{dash}</span>
          ) : (
            <PnlText value={Math.round(s.avgPnl)} />
          )}
        </Metric>
      </div>
    </section>
  );
}

export default function ParticipantModal({
  stat,
  onClose,
}: {
  stat: ParticipantStat;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // фокус-трап: переносим фокус в модалку
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Детали участника ${stat.name}`}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-xl border border-border bg-panel p-5 shadow-2xl outline-none sm:rounded-xl"
      >
        {/* цветная полоска = цвет линии участника */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ background: stat.color }}
        />
        {/* шапка */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
              style={{ borderColor: stat.color, color: stat.color }}
            >
              {initials(stat.name)}
            </span>
            <div>
              <div className="text-base font-bold text-foreground">{stat.name}</div>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="tabular-nums font-semibold text-foreground">
                  {formatMoney(stat.currentValue)}
                </span>
                <ChangeText value={stat.changePct} />
                <span className="text-xs text-muted">
                  ({formatSignedMoney(stat.changeAbs)} к старту)
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </div>

        {/* статистика */}
        <StatsBlock stat={stat} />

        {/* открытые позиции */}
        <section className="mb-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Открытые позиции
          </h3>
          <OpenPositions positions={stat.openPositions} />
          {stat.openPositions.length > 0 && (
            <div className="mt-1.5 flex justify-end text-xs">
              <span className="text-muted">Текущая прибыль/убыток:&nbsp;</span>
              <PnlText value={stat.unrealizedPnl} />
            </div>
          )}
        </section>

        {/* закрытые сделки */}
        <section className="mb-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Закрытые сделки
          </h3>
          <ClosedTrades positions={stat.closedPositions} />
        </section>

        {/* свободные средства */}
        <div className="flex justify-end border-t border-border/60 pt-3 text-sm">
          <span className="text-muted">Свободные средства:&nbsp;</span>
          <span className="tabular-nums text-foreground">{formatMoney(stat.availableCash)}</span>
        </div>
      </div>
    </div>
  );
}
