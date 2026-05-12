"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import {
  type ChartRow,
  type ParticipantStat,
  formatMoney,
  formatSignedMoney,
  formatTs,
  initials,
} from "@/lib/standings";
import { positionPnl, type Position } from "@/lib/types";

type LineMeta = { name: string; color: string };

type Props = {
  rows: ChartRow[];
  lines: LineMeta[];
  stats: ParticipantStat[];
  onParticipantClick?: (participantName: string) => void;
};

// ── таймфреймы ───────────────────────────────────────────────────────────────
type TimeframeKey = "all" | "week" | "3d" | "1d";
const TIMEFRAMES: { key: TimeframeKey; label: string; days: number }[] = [
  { key: "all", label: "Весь период", days: Infinity },
  { key: "week", label: "Неделя", days: 7 },
  { key: "3d", label: "3 дня", days: 3 },
  { key: "1d", label: "Сегодня", days: 1 },
];

// ── режим графика ────────────────────────────────────────────────────────────
// "balance" — линии = баланс счёта (закрытый результат), как в данных.
// "equity"  — у участника с открытыми позициями последняя точка приподнята на
//             сумму его нереализованного PnL (Balance vs Equity, текущий снимок).
type ChartMode = "balance" | "equity";

const DAY_MS = 24 * 60 * 60 * 1000;

function tsMs(ts: string): number {
  // "2026-05-13T10:00" → ms; терпит и без времени
  const norm = ts.length === 16 ? ts + ":00Z" : ts.length === 10 ? ts + "T00:00:00Z" : ts;
  const t = new Date(norm).getTime();
  return Number.isNaN(t) ? new Date(ts).getTime() : t;
}

function CustomTooltip({
  active,
  payload,
  label,
  mode = "balance",
}: Partial<TooltipContentProps<number, string>> & { mode?: ChartMode }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-panel/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-1 text-muted">{formatTs(String(label))}</div>
      {payload
        .filter((p) => p.dataKey !== "__avg" && typeof p.value === "number")
        .sort((a, b) => Number(b.value) - Number(a.value))
        .map((p) => (
          <div key={String(p.dataKey)} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-foreground">{String(p.dataKey)}</span>
            <span className="ml-auto tabular-nums text-foreground">
              {formatMoney(Number(p.value))}
            </span>
          </div>
        ))}
      {payload.some((p) => p.dataKey === "__avg") && (
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-1 text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-muted" />
          <span>среднее</span>
          <span className="ml-auto tabular-nums">
            {formatMoney(
              Number(payload.find((p) => p.dataKey === "__avg")?.value ?? 0)
            )}
          </span>
        </div>
      )}
      {mode === "equity" && (
        <div className="mt-1 border-t border-border pt-1 text-[10px] text-muted">
          equity (с открытыми сделками)
        </div>
      )}
    </div>
  );
}

// маркер закрытой сделки на линии (SVG-кружок c нативным title-тултипом)
function TradeDot(props: {
  cx?: number;
  cy?: number;
  fill: string;
  title: string;
  dim: boolean;
}) {
  const { cx, cy, fill, title, dim } = props;
  if (cx == null || cy == null) return <g />;
  return (
    <g style={{ opacity: dim ? 0.18 : 1 }}>
      <title>{title}</title>
      <circle cx={cx} cy={cy} r={5.5} fill={fill} stroke="#0a0a0c" strokeWidth={1.5} />
    </g>
  );
}

function tradeTitle(owner: string, pos: Position): string {
  const dir = pos.side;
  const range =
    pos.openedAt && pos.closedAt
      ? ` · ${formatTs(pos.openedAt)} → ${formatTs(pos.closedAt)}`
      : pos.closedAt
        ? ` · закрыта ${formatTs(pos.closedAt)}`
        : "";
  return `${owner}: ${dir} ${pos.instrument} · ${pos.lot} лот · ${formatSignedMoney(positionPnl(pos))}${range}`;
}

const LINE_ANIM_MS = 1100;

export default function EquityChart({ rows, lines, stats, onParticipantClick }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tf, setTf] = useState<TimeframeKey>("all");
  const [mode, setMode] = useState<ChartMode>("balance");

  // линии «прорисовываются» слева направо; маркеры/аватары появляются после этого.
  // храним пару (tf, mode), для которой анимация уже завершилась — без синхронного setState в эффекте.
  const drawKey = `${tf}:${mode}`;
  const [drawnFor, setDrawnFor] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setDrawnFor(drawKey), LINE_ANIM_MS);
    return () => clearTimeout(id);
  }, [drawKey]);
  const drawn = drawnFor === drawKey;

  // диапазон данных, чтобы дизейблить лишние таймфреймы
  const spanDays = useMemo(() => {
    if (rows.length < 2) return 0;
    return (tsMs(rows[rows.length - 1].ts) - tsMs(rows[0].ts)) / DAY_MS;
  }, [rows]);

  // отфильтрованные строки по таймфрейму (от последней даты данных назад)
  const shownRows = useMemo(() => {
    const def = TIMEFRAMES.find((t) => t.key === tf)!;
    if (!Number.isFinite(def.days) || rows.length === 0) return rows;
    const lastMs = tsMs(rows[rows.length - 1].ts);
    const cutoff = lastMs - def.days * DAY_MS;
    const filtered = rows.filter((r) => tsMs(r.ts) >= cutoff);
    return filtered.length >= 2 ? filtered : rows.slice(-2);
  }, [rows, tf]);

  const colorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of lines) m.set(l.name, l.color);
    return m;
  }, [lines]);

  // нереализованный PnL по открытым позициям — по имени участника
  const unrealizedByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stats) {
      const has = s.openPositions.some((p) => p.status === "open");
      if (has && s.unrealizedPnl !== 0) m.set(s.name, s.unrealizedPnl);
    }
    return m;
  }, [stats]);

  // режим "equity": клонируем строки и приподнимаем ПОСЛЕДНЮЮ числовую точку
  // каждого участника на сумму его нереализованного PnL. __avg пересчитываем
  // по equity-значениям. Исторические точки не трогаем (нет исторического floating PnL).
  const equityRows = useMemo<ChartRow[]>(() => {
    if (unrealizedByName.size === 0) return shownRows;
    const cloned: ChartRow[] = shownRows.map((r) => ({ ...r }));
    // последний числовой индекс на участника
    for (const [name, pnl] of unrealizedByName) {
      for (let i = cloned.length - 1; i >= 0; i--) {
        if (typeof cloned[i][name] === "number") {
          cloned[i][name] = (cloned[i][name] as number) + pnl;
          break;
        }
      }
    }
    // пересчёт среднего по фактическим значениям участников в строке
    for (const r of cloned) {
      let sum = 0;
      let count = 0;
      for (const l of lines) {
        const v = r[l.name];
        if (typeof v === "number") {
          sum += v;
          count += 1;
        }
      }
      if (count > 0) r["__avg"] = Math.round(sum / count);
    }
    return cloned;
  }, [shownRows, unrealizedByName, lines]);

  const displayRows = mode === "equity" ? equityRows : shownRows;

  // последний индекс, где у участника есть значение — для подписи на конце линии
  const endPoints = lines.map((l) => {
    for (let i = displayRows.length - 1; i >= 0; i--) {
      const v = displayRows[i][l.name];
      if (typeof v === "number") return { ...l, ts: displayRows[i].ts, value: v };
    }
    return null;
  });

  // маркеры закрытых сделок: для каждой закрытой позиции — ближайшая точка timeline
  const tradeMarkers = useMemo(() => {
    if (displayRows.length === 0) return [];
    const out: { key: string; owner: string; ts: string; value: number; pos: Position }[] = [];
    for (const s of stats) {
      if (!colorByName.has(s.name)) continue; // участник скрыт фильтром
      for (let idx = 0; idx < s.closedPositions.length; idx++) {
        const pos = s.closedPositions[idx];
        if (!pos.closedAt) continue;
        const targetMs = tsMs(pos.closedAt);
        // ближайшая строка, где у участника есть значение
        let best: { row: ChartRow; diff: number } | null = null;
        for (const r of displayRows) {
          if (typeof r[s.name] !== "number") continue;
          const diff = Math.abs(tsMs(r.ts) - targetMs);
          if (!best || diff < best.diff) best = { row: r, diff };
        }
        if (!best) continue;
        out.push({
          key: `${s.name}-${idx}`,
          owner: s.name,
          ts: best.row.ts,
          value: best.row[s.name] as number,
          pos,
        });
      }
    }
    return out;
  }, [stats, displayRows, colorByName]);

  // формат оси X: если видимые данные охватывают > 1 дня — только дата «DD.MM»,
  // иначе (несколько точек внутри одного дня, напр. фильтр «Сегодня») — время «HH:MM»
  const intraDay = useMemo(() => {
    if (displayRows.length < 2) return false;
    return tsMs(displayRows[displayRows.length - 1].ts) - tsMs(displayRows[0].ts) <= DAY_MS;
  }, [displayRows]);

  function xTickFormatter(ts: string): string {
    const m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return String(ts);
    const [, , mm, dd, hh, min] = m;
    if (intraDay && hh) return `${hh}:${min}`;
    return `${dd}.${mm}`;
  }

  const dim = (name: string) => highlight !== null && highlight !== name;

  const hasUnrealized = unrealizedByName.size > 0;

  return (
    <div>
      {/* панель управления: таймфреймы + режим графика */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex flex-wrap gap-1">
          {TIMEFRAMES.map((t) => {
            // прячем кнопки, для которых данных заведомо меньше выбранного периода
            const disabled =
              Number.isFinite(t.days) && spanDays > 0 && spanDays < t.days * 0.5 && t.key !== "all";
            if (disabled) return null;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTf(t.key)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${
                  tf === t.key
                    ? "bg-accent/15 text-accent"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {/* режим: баланс vs баланс + нереализованный PnL */}
        <div className="flex items-center rounded border border-border p-0.5">
          {([
            { key: "balance", label: "По депозиту" },
            { key: "equity", label: "По депозиту + нереализ. PnL" },
          ] as const).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              title={
                m.key === "equity" && !hasUnrealized
                  ? "Нет открытых позиций — линии совпадают с режимом «По депозиту»"
                  : undefined
              }
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${
                mode === m.key
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[340px] w-full sm:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayRows} margin={{ top: 16, right: 110, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              tickFormatter={xTickFormatter}
              stroke="#3f3f46"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              stroke="#3f3f46"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickFormatter={(v) => "$" + Number(v).toLocaleString("ru-RU")}
              width={64}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip mode={mode} />} cursor={{ stroke: "#3f3f46" }} />
            <Line
              type="monotone"
              dataKey="__avg"
              name="среднее"
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              strokeOpacity={highlight !== null ? 0.15 : 1}
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={LINE_ANIM_MS}
              animationEasing="ease-out"
            />
            {lines.map((l) => (
              <Line
                key={l.name}
                type="monotone"
                dataKey={l.name}
                stroke={l.color}
                strokeWidth={highlight === l.name ? 3 : 2}
                strokeOpacity={dim(l.name) ? 0.18 : 1}
                dot={dim(l.name) ? false : { r: 2, fill: l.color, strokeWidth: 0 }}
                activeDot={dim(l.name) ? false : { r: 4 }}
                connectNulls
                isAnimationActive
                animationDuration={LINE_ANIM_MS}
                animationEasing="ease-out"
                style={onParticipantClick ? { cursor: "pointer" } : undefined}
                onClick={
                  onParticipantClick ? () => onParticipantClick(l.name) : undefined
                }
              />
            ))}
            {drawn && tradeMarkers.map((m) => {
              const positive = positionPnl(m.pos) >= 0;
              return (
                <ReferenceDot
                  key={m.key}
                  x={m.ts}
                  y={m.value}
                  shape={
                    <TradeDot
                      fill={positive ? "var(--pos)" : "var(--neg)"}
                      title={tradeTitle(m.owner, m.pos)}
                      dim={dim(m.owner)}
                    />
                  }
                />
              );
            })}
            {drawn && endPoints.map(
              (ep) =>
                ep && (
                  <ReferenceDot
                    key={ep.name}
                    x={ep.ts}
                    y={ep.value}
                    r={14}
                    fill="#0a0a0c"
                    fillOpacity={dim(ep.name) ? 0.3 : 1}
                    stroke={ep.color}
                    strokeWidth={2}
                    strokeOpacity={dim(ep.name) ? 0.25 : 1}
                    style={onParticipantClick ? { cursor: "pointer" } : undefined}
                    onClick={
                      onParticipantClick ? () => onParticipantClick(ep.name) : undefined
                    }
                    label={{
                      value: initials(ep.name),
                      fill: ep.color,
                      fillOpacity: dim(ep.name) ? 0.25 : 1,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* интерактивная легенда: клик по имени — выделить линию */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
        {endPoints.map(
          (ep) =>
            ep && (
              <button
                key={ep.name}
                type="button"
                onClick={() => setHighlight((cur) => (cur === ep.name ? null : ep.name))}
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 transition ${
                  highlight === ep.name
                    ? "bg-border/60 font-semibold"
                    : highlight !== null
                      ? "opacity-40 hover:opacity-100"
                      : "hover:bg-border/40"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: ep.color }}
                />
                <span className="text-foreground">{ep.name}</span>
                <span className="tabular-nums text-muted">{formatMoney(ep.value)}</span>
              </button>
            )
        )}
        {highlight !== null && (
          <button
            type="button"
            onClick={() => setHighlight(null)}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent hover:bg-border/40"
          >
            сбросить
          </button>
        )}
        {tradeMarkers.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--pos)" }} />
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--neg)" }} />
            закрытые сделки
          </span>
        )}
      </div>
      {mode === "equity" && (
        <p className="mt-1 text-[10px] text-muted">
          {hasUnrealized
            ? "Последняя точка линий включает нереализованный PnL открытых позиций (equity). Исторические точки — только закрытый результат."
            : "Открытых позиций нет — линии совпадают с режимом «По депозиту»."}
        </p>
      )}
    </div>
  );
}
