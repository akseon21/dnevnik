import { competition as staticCompetition } from "@/data/competition";
import { getAnonClient, hasSupabase } from "@/lib/supabase";
import type {
  Competition,
  Participant,
  Position,
  Ticker,
  WatchlistItem,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Слой данных дашборда.
//
// getCompetitionData():
//   • Если Supabase настроен (env есть) → тянет competition_meta + participants
//     + balance_points + positions + tickers и собирает в объект Competition.
//   • Если НЕ настроен → возвращает статический fallback из data/competition.ts.
//
// Дашборд (app/page.tsx) вызывает только getCompetitionData() и не знает, откуда
// данные. Это позволяет v1 (статика) и v2 (Supabase) работать без правок UI.
// ─────────────────────────────────────────────────────────────────────────────

type MetaRow = {
  title: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

type ParticipantRow = {
  id: string;
  name: string;
  color: string;
  avatar_url: string | null;
  available_cash: number | string | null;
  sort_order: number | null;
};

type BalancePointRow = {
  participant_id: string;
  ts: string;
  value: number | string;
};

type PositionRow = {
  participant_id: string;
  side: "LONG" | "SHORT";
  instrument: string;
  lot: number | string | null;
  exit_plan: string | null;
  unrealized_pnl: number | string | null;
  status: "open" | "closed";
  opened_at: string | null;
  closed_at: string | null;
};

type TickerRow = {
  symbol: string;
  price: number | string | null;
  change_24h: number | string | null;
};

type WatchlistRow = {
  instrument: string;
  note: string | null;
  participant_names: string[] | null;
};

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v) || 0;

export async function getCompetitionData(): Promise<Competition> {
  if (!hasSupabase()) return staticCompetition;

  const supabase = getAnonClient();
  if (!supabase) return staticCompetition;

  try {
    const [
      metaRes,
      participantsRes,
      balanceRes,
      positionsRes,
      tickersRes,
      watchlistRes,
    ] = await Promise.all([
      supabase
        .from("competition_meta")
        .select("title, start_date, end_date, note")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("participants")
        .select("id, name, color, avatar_url, available_cash, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("balance_points")
        .select("participant_id, ts, value")
        .order("ts", { ascending: true }),
      supabase
        .from("positions")
        .select(
          "participant_id, side, instrument, lot, exit_plan, unrealized_pnl, status, opened_at, closed_at",
        )
        .order("opened_at", { ascending: false }),
      supabase
        .from("tickers")
        .select("symbol, price, change_24h")
        .order("symbol", { ascending: true }),
      supabase
        .from("watchlist")
        .select("instrument, note, participant_names")
        .order("created_at", { ascending: true }),
    ]);

    // Если базовые запросы упали — деградируем на статику.
    if (participantsRes.error || metaRes.error) {
      console.error(
        "[db] Supabase fetch failed, falling back to static:",
        participantsRes.error ?? metaRes.error,
      );
      return staticCompetition;
    }

    const meta = (metaRes.data as MetaRow | null) ?? {
      title: staticCompetition.title,
      start_date: staticCompetition.startDate,
      end_date: staticCompetition.endDate,
      note: staticCompetition.note,
    };

    const participantRows = (participantsRes.data ?? []) as ParticipantRow[];
    const balanceRows = (balanceRes.data ?? []) as BalancePointRow[];
    const positionRows = (positionsRes.data ?? []) as PositionRow[];
    const tickerRows = (tickersRes.data ?? []) as TickerRow[];
    const watchlistRows = watchlistRes.error
      ? []
      : ((watchlistRes.data ?? []) as WatchlistRow[]);

    const participants: Participant[] = participantRows.map((p) => {
      const timeline = balanceRows
        .filter((b) => b.participant_id === p.id)
        .map((b) => ({ ts: b.ts, value: num(b.value) }))
        .sort((a, b) => a.ts.localeCompare(b.ts));

      const positions: Position[] = positionRows
        .filter((q) => q.participant_id === p.id)
        .map((q) => ({
          side: q.side,
          instrument: q.instrument,
          lot: num(q.lot),
          exitPlan: q.exit_plan ?? "",
          unrealizedPnl: num(q.unrealized_pnl),
          status: q.status,
          openedAt: q.opened_at,
          closedAt: q.closed_at,
        }));

      return {
        name: p.name,
        color: p.color,
        avatar: p.avatar_url,
        timeline,
        positions,
        availableCash: num(p.available_cash),
      };
    });

    const tickers: Ticker[] = tickerRows.map((t) => ({
      symbol: t.symbol,
      price: num(t.price),
      change24h: num(t.change_24h),
    }));

    const watchlist: WatchlistItem[] = watchlistRows.map((w) => ({
      instrument: w.instrument,
      note: w.note ?? "",
      participantNames: w.participant_names ?? [],
    }));

    return {
      title: meta.title,
      startDate: meta.start_date,
      endDate: meta.end_date,
      note: meta.note ?? staticCompetition.note,
      tickers: tickers.length > 0 ? tickers : staticCompetition.tickers,
      participants:
        participants.length > 0 ? participants : staticCompetition.participants,
      watchlist,
    };
  } catch (err) {
    console.error("[db] Supabase error, falling back to static:", err);
    return staticCompetition;
  }
}
