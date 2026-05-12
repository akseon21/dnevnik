"use client";

import { useMemo, useState } from "react";
import EquityChart from "./EquityChart";
import ParticipantModal from "./ParticipantModal";
import Countdown from "./Countdown";
import Sparkline from "./Sparkline";
import {
  formatMoney,
  formatPct,
  formatSignedMoney,
  formatTs,
  initials,
  type ChartRow,
  type ParticipantStat,
} from "@/lib/standings";
import { positionPnl, type Position } from "@/lib/types";

type LineMeta = { name: string; color: string };

type Props = {
  stats: ParticipantStat[];
  rows: ChartRow[];
  lines: LineMeta[];
  note: string;
  startDate: string;
  endDate: string;
};

type TabKey = "open" | "closed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "open", label: "Открытые позиции" },
  { key: "closed", label: "Закрытые сделки" },
];

function ChangeText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={cls}>{formatPct(value)}</span>;
}

function PnlText({ value, label }: { value: number; label?: string }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return (
    <span className={`tabular-nums ${cls}`}>
      {label}
      {formatSignedMoney(value)}
    </span>
  );
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

function PositionsTable({
  positions,
  showOwner,
  closed,
}: {
  positions: { owner?: string; ownerColor?: string; pos: Position }[];
  showOwner?: boolean;
  closed?: boolean;
}) {
  if (positions.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted">
        {closed ? "Закрытых сделок пока нет" : "Открытых позиций нет"}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            {showOwner && <th className="py-1 pr-2 font-medium">Участник</th>}
            <th className="py-1 pr-2 font-medium">Направление</th>
            <th className="py-1 pr-2 font-medium">Инструмент</th>
            <th className="py-1 pr-2 font-medium">Размер лота</th>
            <th className="py-1 pr-2 font-medium">План выхода</th>
            {closed && <th className="py-1 pr-2 font-medium">Закрыта</th>}
            <th className="py-1 text-right font-medium">
              {closed ? "Результат PnL" : "Нереализ. PnL"}
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              {showOwner && (
                <td className="py-1.5 pr-2">
                  <span style={{ color: row.ownerColor }} className="font-semibold">
                    {row.owner}
                  </span>
                </td>
              )}
              <td className="py-1.5 pr-2">
                <SideBadge side={row.pos.side} />
              </td>
              <td className="py-1.5 pr-2 font-semibold text-foreground">
                {row.pos.instrument}
              </td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {row.pos.lot.toLocaleString("ru-RU")}
              </td>
              <td className="py-1.5 pr-2 text-muted">{row.pos.exitPlan || "—"}</td>
              {closed && (
                <td className="py-1.5 pr-2 tabular-nums text-muted">
                  {row.pos.closedAt ? formatTs(row.pos.closedAt) : "—"}
                </td>
              )}
              <td className="py-1.5 text-right">
                <PnlText value={closed ? positionPnl(row.pos) : row.pos.unrealizedPnl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ParticipantCard({
  s,
  onClick,
}: {
  s: ParticipantStat;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-l-[3px] border-border bg-panel px-3 py-2.5 text-left transition hover:border-accent/50"
      style={{ borderLeftColor: s.color }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
        style={{ borderColor: s.color, color: s.color }}
      >
        {initials(s.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-xs font-semibold text-foreground">{s.name}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="tabular-nums text-xs text-foreground">
            {formatMoney(s.currentValue)}
          </span>
          <span className="text-[10px]">
            <ChangeText value={s.changePct} />
          </span>
        </span>
      </span>
      <Sparkline timeline={s.timeline} color={s.color} className="shrink-0" />
    </button>
  );
}

export default function DashboardShell({
  stats,
  rows,
  lines,
  note,
  startDate,
  endDate,
}: Props) {
  const allNames = useMemo(() => stats.map((s) => s.name), [stats]);
  const [selected, setSelected] = useState<string[]>(allNames);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("open");
  const [modalName, setModalName] = useState<string | null>(null);

  const isAll = selected.length === allNames.length;
  const visible = (name: string) => selected.includes(name);

  const shownStats = stats.filter((s) => visible(s.name));
  const shownLines = lines.filter((l) => visible(l.name));
  const modalStat = stats.find((s) => s.name === modalName) ?? null;

  function toggle(name: string) {
    setSelected((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );
  }

  const allClosed = shownStats.flatMap((s) =>
    s.closedPositions.map((pos) => ({ owner: s.name, ownerColor: s.color, pos })),
  );

  return (
    <>
      {/* ─── Тулбар: пометка + отсчёт + фильтр участников ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted">📊 {note}</span>
        <div className="flex items-center gap-2">
          <Countdown startDate={startDate} endDate={endDate} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="rounded-md border border-border bg-panel px-3 py-1.5 text-xs text-foreground hover:border-accent/60"
            >
              {isAll ? "Все участники" : `Участники: ${selected.length}/${allNames.length}`}
              <span className="ml-1.5 text-muted">▾</span>
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border border-border bg-panel p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => setSelected(isAll ? [] : allNames)}
                  className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-accent hover:bg-border/40"
                >
                  {isAll ? "Снять все" : "Выбрать всех"}
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {stats.map((s) => (
                    <label
                      key={s.name}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-border/40"
                    >
                      <input
                        type="checkbox"
                        checked={visible(s.name)}
                        onChange={() => toggle(s.name)}
                        className="accent-current"
                        style={{ color: s.color }}
                      />
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="text-foreground">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Основная сетка: график (широкая колонка) + боковая панель участников ─── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* левая колонка: график */}
        <section className="rounded-lg border border-border bg-panel p-3 sm:p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Общий баланс счёта
            </h2>
          </div>
          {shownLines.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              Выберите участников в фильтре
            </p>
          ) : (
            <EquityChart
              rows={rows}
              lines={shownLines}
              stats={shownStats}
              onParticipantClick={(name) => setModalName(name)}
            />
          )}
        </section>

        {/* правая колонка: табы + карточки участников */}
        <aside className="flex flex-col gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-panel p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 whitespace-nowrap rounded px-2 py-1.5 text-[11px] font-medium transition ${
                  tab === t.key
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
            <div className="text-[10px] uppercase tracking-widest text-muted">
              Участники · {shownStats.length}
            </div>
            {shownStats.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted">Никого не выбрано</p>
            ) : (
              shownStats.map((s) => (
                <ParticipantCard key={s.name} s={s} onClick={() => setModalName(s.name)} />
              ))
            )}
          </div>
        </aside>
      </div>

      {/* ─── Контент активного таба (под графиком, на всю ширину) ─── */}
      <section>
        {tab === "open" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {shownStats.map((s) => (
              <div
                key={s.name}
                className="rounded-lg border border-border bg-panel p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setModalName(s.name)}
                    className="flex items-center gap-2 text-left hover:opacity-80"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                      style={{ borderColor: s.color, color: s.color }}
                    >
                      {initials(s.name)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  </button>
                  {s.openPositions.length > 0 ? (
                    <span className="text-xs">
                      <span className="text-muted">PnL: </span>
                      <PnlText value={s.unrealizedPnl} />
                    </span>
                  ) : (
                    <span className="text-xs">
                      <span className="tabular-nums text-foreground">
                        {formatMoney(s.currentValue)}
                      </span>{" "}
                      <ChangeText value={s.changePct} />
                    </span>
                  )}
                </div>
                {s.openPositions.length > 0 && (
                  <div className="mt-2">
                    <PositionsTable positions={s.openPositions.map((pos) => ({ pos }))} />
                  </div>
                )}
                <div className="mt-2 flex justify-end border-t border-border/60 pt-2 text-xs">
                  <span className="text-muted">Свободные средства:&nbsp;</span>
                  <span className="tabular-nums text-foreground">
                    {formatMoney(s.availableCash)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "closed" && (
          <div className="rounded-lg border border-border bg-panel p-3">
            <h3 className="mb-2 text-xs font-semibold text-foreground">
              Закрытые сделки всех участников
            </h3>
            <PositionsTable positions={allClosed} showOwner closed />
          </div>
        )}
      </section>

      {modalStat && (
        <ParticipantModal stat={modalStat} onClose={() => setModalName(null)} />
      )}
    </>
  );
}
