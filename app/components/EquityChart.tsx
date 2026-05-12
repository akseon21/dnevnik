"use client";

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
  formatMoney,
  formatTs,
  initials,
} from "@/lib/standings";

type LineMeta = { name: string; color: string };

type Props = {
  rows: ChartRow[];
  lines: LineMeta[];
};

function CustomTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-panel/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-1 text-muted">{formatTs(String(label))}</div>
      {payload
        .filter((p) => p.dataKey !== "__avg")
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
    </div>
  );
}

export default function EquityChart({ rows, lines }: Props) {
  // последний индекс, где у участника есть значение — для подписи на конце линии
  const endPoints = lines.map((l) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i][l.name];
      if (typeof v === "number") return { ...l, ts: rows[i].ts, value: v };
    }
    return null;
  });

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 88, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            tickFormatter={formatTs}
            stroke="#3f3f46"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickMargin={8}
          />
          <YAxis
            stroke="#3f3f46"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickFormatter={(v) => "$" + Number(v).toLocaleString("ru-RU")}
            width={64}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46" }} />
          <Line
            type="monotone"
            dataKey="__avg"
            name="среднее"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {lines.map((l) => (
            <Line
              key={l.name}
              type="monotone"
              dataKey={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 2, fill: l.color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {endPoints.map(
            (ep) =>
              ep && (
                <ReferenceDot
                  key={ep.name}
                  x={ep.ts}
                  y={ep.value}
                  r={14}
                  fill="#0a0a0c"
                  stroke={ep.color}
                  strokeWidth={2}
                  label={{
                    value: initials(ep.name),
                    fill: ep.color,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )
          )}
        </LineChart>
      </ResponsiveContainer>
      {/* подписи текущих значений рядом с концами линий */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {endPoints.map(
          (ep) =>
            ep && (
              <span key={ep.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: ep.color }}
                />
                <span className="text-foreground">{ep.name}</span>
                <span className="tabular-nums text-muted">
                  {formatMoney(ep.value)}
                </span>
              </span>
            )
        )}
      </div>
    </div>
  );
}
