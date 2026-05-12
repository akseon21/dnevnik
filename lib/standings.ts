import type {
  Competition,
  Participant,
  Position,
  TimelinePoint,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Производные величины (v6 — trade-centric).
//   balance        = starting_deposit + Σ realizedPnl всех закрытых позиций
//   equity         = balance + Σ unrealizedPnl всех открытых позиций
//   availableCash  = balance − Σ margin всех открытых позиций (свободные средства)
//   timeline       = [(startDate, starting_deposit), затем по каждой закрытой
//                     позиции в порядке closedAt — (closedAt, running_balance)]
// ─────────────────────────────────────────────────────────────────────────────

export type ParticipantStat = {
  name: string;
  color: string;
  avatar: string | null;
  startValue: number; // стартовый депозит
  currentValue: number; // = balance (закрытый результат)
  balance: number; // дубль currentValue, для ясности на вызовах
  equity: number; // balance + Σ unrealizedPnl открытых
  changeAbs: number; // balance − startValue
  changePct: number; // (balance / startValue − 1) * 100
  availableCash: number; // свободные средства = balance − Σ margin открытых
  timeline: TimelinePoint[]; // выведена из сделок (для графика / спарклайнов / статистики)
  openPositions: Position[];
  closedPositions: Position[];
  unrealizedPnl: number; // Σ unrealizedPnl по открытым позициям
};

function startTs(competition: Competition): string {
  const d = competition.startDate;
  return d.length === 10 ? `${d}T00:00:00` : d;
}

function closedSortKey(p: Position): string {
  return p.closedAt ?? p.openedAt ?? "";
}

/** Выводит timeline участника из закрытых сделок: старт + точка после каждого закрытия. */
function buildTimeline(p: Participant, startIso: string): TimelinePoint[] {
  const closed = p.positions
    .filter((q) => q.status === "closed")
    .sort((a, b) => closedSortKey(a).localeCompare(closedSortKey(b)));
  const points: TimelinePoint[] = [{ ts: startIso, value: p.startingDeposit }];
  let running = p.startingDeposit;
  for (const q of closed) {
    running += q.realizedPnl ?? 0;
    points.push({ ts: q.closedAt ?? q.openedAt ?? startIso, value: running });
  }
  return points;
}

export function getParticipantStats(competition: Competition): ParticipantStat[] {
  const startIso = startTs(competition);
  return competition.participants.map((p) => {
    const openPositions = p.positions.filter((q) => q.status === "open");
    const closedPositions = p.positions.filter((q) => q.status === "closed");
    const realizedSum = closedPositions.reduce((s, q) => s + (q.realizedPnl ?? 0), 0);
    const unrealizedPnl = openPositions.reduce((s, q) => s + q.unrealizedPnl, 0);
    const marginSum = openPositions.reduce((s, q) => s + q.margin, 0);

    const startValue = p.startingDeposit;
    const balance = startValue + realizedSum;
    const equity = balance + unrealizedPnl;
    const availableCash = balance - marginSum;
    const changeAbs = balance - startValue;
    const changePct = startValue > 0 ? (changeAbs / startValue) * 100 : 0;
    const timeline = buildTimeline(p, startIso);

    return {
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      startValue,
      currentValue: balance,
      balance,
      equity,
      changeAbs,
      changePct,
      availableCash,
      timeline,
      openPositions,
      closedPositions,
      unrealizedPnl,
    };
  });
}

// ── статистика участника (винрейт, лучшая/худшая сделка, средний PnL) ─────────
export type ParticipantSummary = {
  winRate: number | null; // % закрытых сделок с realizedPnl ≥ 0; null если закрытых нет
  totalTrades: number; // открытые + закрытые
  closedCount: number;
  best: Position | null; // закрытая позиция с максимальным realizedPnl
  worst: Position | null; // закрытая позиция с минимальным realizedPnl
  avgPnl: number | null; // средний realizedPnl по закрытым; null если закрытых нет
};

export function getParticipantSummary(stat: ParticipantStat): ParticipantSummary {
  const closed = stat.closedPositions;
  const closedCount = closed.length;
  const totalTrades = stat.openPositions.length + closedCount;
  if (closedCount === 0) {
    return { winRate: null, totalTrades, closedCount: 0, best: null, worst: null, avgPnl: null };
  }
  const r = (p: Position) => p.realizedPnl ?? 0;
  const wins = closed.filter((p) => r(p) >= 0).length;
  const winRate = (wins / closedCount) * 100;
  const sorted = [...closed].sort((a, b) => r(b) - r(a));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const avgPnl = closed.reduce((s, p) => s + r(p), 0) / closedCount;
  return { winRate, totalTrades, closedCount, best, worst, avgPnl };
}

// ── события для бегущей ленты: последние закрытые сделки всех участников ───────
export type FeedEvent = {
  owner: string;
  color: string;
  side: Position["side"];
  instrument: string;
  pnl: number; // realizedPnl
  closedAt: string;
};

export function getFeedEvents(competition: Competition, limit = 12): FeedEvent[] {
  const events: FeedEvent[] = [];
  for (const p of competition.participants) {
    for (const pos of p.positions) {
      if (pos.status !== "closed" || !pos.closedAt) continue;
      events.push({
        owner: p.name,
        color: p.color,
        side: pos.side,
        instrument: pos.instrument,
        pnl: pos.realizedPnl ?? 0,
        closedAt: pos.closedAt,
      });
    }
  }
  events.sort((a, b) => (a.closedAt < b.closedAt ? 1 : a.closedAt > b.closedAt ? -1 : 0));
  return events.slice(0, limit);
}

export function getLeaderAndOutsider(stats: ParticipantStat[]): {
  leader: ParticipantStat | null;
  outsider: ParticipantStat | null;
} {
  if (stats.length === 0) return { leader: null, outsider: null };
  const sorted = [...stats].sort((a, b) => b.changePct - a.changePct);
  return { leader: sorted[0], outsider: sorted[sorted.length - 1] };
}

/** Топ-3 участника по росту % (changePct). */
export function getLeaderboard(stats: ParticipantStat[]): ParticipantStat[] {
  return [...stats].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
}

export type ChartRow = { ts: string } & Record<string, number | string>;

/**
 * Сводит timeline всех участников (выведенный из сделок) в один массив строк для recharts.
 * Каждая строка — момент времени, ключ = имя участника → его баланс. Линии рисуются
 * с connectNulls, так что не у каждого участника нужна точка в каждой строке.
 * Дополнительно добавляет "__avg" — среднее по участникам, у кого на этот момент есть данные.
 */
export function getChartData(competition: Competition): {
  rows: ChartRow[];
  names: string[];
} {
  const stats = getParticipantStats(competition);
  const names = stats.map((s) => s.name);
  const tsSet = new Set<string>();
  for (const s of stats) for (const pt of s.timeline) tsSet.add(pt.ts);
  const allTs = [...tsSet].sort();

  const rows: ChartRow[] = allTs.map((ts) => {
    const row: ChartRow = { ts };
    let sum = 0;
    let count = 0;
    for (const s of stats) {
      const pt = s.timeline.find((x) => x.ts === ts);
      if (pt) {
        row[s.name] = pt.value;
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
  return sign + "$" + Math.abs(Math.round(v)).toLocaleString("ru-RU");
}

export function formatSignedMoney(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(v)).toLocaleString("ru-RU");
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
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return ts;
  const [, , mm, dd, hh, min] = m;
  if (hh) return `${dd}.${mm} ${hh}:${min}`;
  return `${dd}.${mm}`;
}
