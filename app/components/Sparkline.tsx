import type { TimelinePoint } from "@/lib/types";

/**
 * Минимальный спарклайн: SVG-path по значениям timeline. Без осей, подписей,
 * интерактивности. Цвет = цвет линии участника.
 */
export default function Sparkline({
  timeline,
  color,
  width = 80,
  height = 24,
  className,
}: {
  timeline: TimelinePoint[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (timeline.length < 2) return null;

  const values = timeline.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / span) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M ${points.join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
