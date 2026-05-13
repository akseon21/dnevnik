import { competition as staticCompetition } from "@/data/competition";
import { getAnonClient, hasSupabase } from "@/lib/supabase";
import type { Competition, Participant, Position, Ticker } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Слой данных дашборда (v6 — trade-centric).
//
// getCompetitionData():
//   • Supabase настроен И в БД новая схема (есть participants.starting_deposit) →
//     тянет competition_meta + participants + positions + tickers, собирает Competition.
//   • Supabase не настроен, или ещё старая схема, или ошибка → статический fallback
//     из data/competition.ts. Дашборд не падает ни при старой, ни при новой схеме.
//
// balance / equity / свободные средства / timeline графика — вычисляются из сделок
// в lib/standings.ts, тут только сырые данные.
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
  starting_deposit: number | string | null;
  sort_order: number | null;
};

type PositionRow = {
  id: string;
  participant_id: string;
  side: "LONG" | "SHORT";
  instrument: string;
  lot: number | string | null;
  exit_plan: string | null;
  margin: number | string | null;
  unrealized_pnl: number | string | null;
  realized_pnl: number | string | null;
  status: "open" | "closed";
  opened_at: string | null;
  closed_at: string | null;
};

type TickerRow = {
  symbol: string;
  price: number | string | null;
  change_24h: number | string | null;
};

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v) || 0;

const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null ? null : typeof v === "number" ? v : Number(v);

export async function getCompetitionData(): Promise<Competition> {
  if (!hasSupabase()) return staticCompetition;

  const supabase = getAnonClient();
  if (!supabase) return staticCompetition;

  try {
    const [metaRes, participantsRes, positionsRes, tickersRes] = await Promise.all([
      supabase
        .from("competition_meta")
        .select("title, start_date, end_date, note")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("participants")
        .select("id, name, color, avatar_url, starting_deposit, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("positions")
        .select(
          "id, participant_id, side, instrument, lot, exit_plan, margin, unrealized_pnl, realized_pnl, status, opened_at, closed_at",
        )
        .order("opened_at", { ascending: false }),
      supabase
        .from("tickers")
        .select("symbol, price, change_24h")
        .order("symbol", { ascending: true }),
    ]);

    // Старая схема (нет колонки starting_deposit или margin/realized_pnl) либо ошибка
    // на базовых запросах → деградируем на статику. Это и есть graceful-обработка
    // случая «миграция 0003 ещё не прогнана».
    if (participantsRes.error || metaRes.error || positionsRes.error) {
      console.error(
        "[db] Supabase fetch failed or schema is pre-v6, falling back to static:",
        participantsRes.error ?? metaRes.error ?? positionsRes.error,
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
    const positionRows = (positionsRes.data ?? []) as PositionRow[];
    const tickerRows = (tickersRes.data ?? []) as TickerRow[];

    // v9 — entry_price тянем отдельным best-effort запросом: если колонки ещё нет
    // в БД (миграция 0004 не прогнана) — просто пропускаем, дашборд продолжит
    // работать со старыми ручными PnL без live-расчёта.
    const entryByPosId = new Map<string, number | null>();
    try {
      const epRes = await supabase
        .from("positions")
        .select("id, entry_price");
      if (!epRes.error && Array.isArray(epRes.data)) {
        for (const r of epRes.data as { id: string; entry_price: number | string | null }[]) {
          entryByPosId.set(r.id, numOrNull(r.entry_price));
        }
      }
    } catch {
      // колонки ещё нет — пропускаем без шума
    }

    const participants: Participant[] = participantRows.map((p) => {
      const positions: Position[] = positionRows
        .filter((q) => q.participant_id === p.id)
        .map((q) => ({
          side: q.side,
          instrument: q.instrument,
          lot: num(q.lot),
          exitPlan: q.exit_plan ?? "",
          margin: num(q.margin),
          unrealizedPnl: num(q.unrealized_pnl),
          realizedPnl: numOrNull(q.realized_pnl),
          status: q.status,
          openedAt: q.opened_at,
          closedAt: q.closed_at,
          entryPrice: entryByPosId.has(q.id) ? entryByPosId.get(q.id) ?? null : null,
        }));

      return {
        name: p.name,
        color: p.color,
        avatar: p.avatar_url,
        startingDeposit: num(p.starting_deposit),
        positions,
      };
    });

    const tickers: Ticker[] = tickerRows.map((t) => ({
      symbol: t.symbol,
      price: num(t.price),
      change24h: num(t.change_24h),
    }));

    return {
      title: meta.title,
      startDate: meta.start_date,
      endDate: meta.end_date,
      note: meta.note ?? staticCompetition.note,
      tickers: tickers.length > 0 ? tickers : staticCompetition.tickers,
      participants:
        participants.length > 0 ? participants : staticCompetition.participants,
    };
  } catch (err) {
    console.error("[db] Supabase error, falling back to static:", err);
    return staticCompetition;
  }
}
