import type { Competition, Participant, Position } from "@/lib/types";

export type ParticipantStat = {
  name: string;
  color: string;
  avatar: string | null;
  startValue: number;
  currentValue: number;
  changeAbs: number;
  changePct: number;
  availableCash: number;
  openPositions: Position[];
  closedPositions: Position[];
  unrealizedPnl: number; // сумма unrealizedPnl по открытым позициям
};

function lastValue(p: Participant): number {
  if (p.timeline.length === 0) return 0;
  return p.timeline[p.timeline.length - 1].value;
}

function firstValue(p: Participant): number {
  if (p.timeline.length === 0) return 0;
  return p.timeline[0].value;
}

export function getParticipantStats(competition: Competition): ParticipantStat[] {
  return competition.participants.map((p) => {
    const startValue = firstValue(p);
    const currentValue = lastValue(p);
    const changeAbs = currentValue - startValue;
    const changePct = startValue > 0 ? (changeAbs / startValue) * 100 : 0;
    const openPositions = p.positions.filter((q) => q.status === "open");
    const closedPositions = p.positions.filter((q) => q.status === "closed");
    const unrealizedPnl = openPositions.reduce((s, q) => s + q.unrealizedPnl, 0);
    return {
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      startValue,
      currentValue,
      changeAbs,
      changePct,
      availableCash: p.availableCash,
      openPositions,
      closedPositions,
      unrealizedPnl,
    };
  });
}

export function getLeaderAndOutsider(stats: ParticipantStat[]): {
  leader: ParticipantStat | null;
  outsider: ParticipantStat | null;
} {
  if (stats.length === 0) return { leader: null, outsider: null };
  const sorted = [...stats].sort((a, b) => b.changePct - a.changePct);
  return { leader: sorted[0], outsider: sorted[sorted.length - 1] };
}

/**
 * Топ-3 участника по росту % (changePct = текущий/стартовый − 1).
 * Возвращает не более 3 элементов в порядке убывания роста.
 */
export function getLeaderboard(stats: ParticipantStat[]): ParticipantStat[] {
  return [...stats].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
}

export type ChartRow = { ts: string } & Record<string, number | string>;

/**
 * Сводит timeline всех участников в один массив строк для recharts.
 * Каждая строка — момент времени, ключ = имя участника → его баланс.
 * Также добавляет ключ "__avg" — среднее по тем участникам, у кого на этот момент есть данные.
 */
export function getChartData(competition: Competition): {
  rows: ChartRow[];
  names: string[];
} {
  const names = competition.participants.map((p) => p.name);
  const tsSet = new Set<string>();
  for (const p of competition.participants) {
    for (const pt of p.timeline) tsSet.add(pt.ts);
  }
  const allTs = [...tsSet].sort();

  const rows: ChartRow[] = allTs.map((ts) => {
    const row: ChartRow = { ts };
    let sum = 0;
    let count = 0;
    for (const p of competition.participants) {
      const pt = p.timeline.find((x) => x.ts === ts);
      if (pt) {
        row[p.name] = pt.value;
        sum += pt.value;
        count += 1;
      }
    }
    if (count > 0) row["__avg"] = Math.round(sum / count);
    return row;
  });

  return { rows, names };
}

export function formatMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toLocaleString("ru-RU");
}

export function formatSignedMoney(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toLocaleString("ru-RU");
}

export function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(1) + "%";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatTs(ts: string): string {
  // "2026-05-13T10:00" / "2026-05-13T10:00:00+00:00" → "13.05 10:00"
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return ts;
  const [, , mm, dd, hh, min] = m;
  if (hh) return `${dd}.${mm} ${hh}:${min}`;
  return `${dd}.${mm}`;
}
