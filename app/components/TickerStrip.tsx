"use client";

import { useEffect, useState } from "react";
import type { Ticker } from "@/lib/types";

type LiveTicker = Ticker & { live?: boolean };

type Props = {
  initial: Ticker[];
};

// Верхняя строка тикеров. Стартует с БД-значений (SSR), затем опрашивает
// /api/tickers каждые 60 сек. Если запрос упал — оставляем последние известные.
export default function TickerStrip({ initial }: Props) {
  const [tickers, setTickers] = useState<LiveTicker[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/tickers", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tickers?: LiveTicker[] };
        if (!cancelled && Array.isArray(data.tickers) && data.tickers.length > 0) {
          setTickers(data.tickers);
          setLive(data.tickers.some((t) => t.live));
        }
      } catch {
        // источник недоступен — оставляем что есть
      }
    }

    poll();
    const id = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-panel px-4 py-2.5 text-xs">
      {tickers.map((t) => {
        const up = t.change24h >= 0;
        return (
          <span key={t.symbol} className="flex items-baseline gap-1.5">
            <span className="font-bold tracking-tight text-foreground">{t.symbol}</span>
            <span className="tabular-nums text-muted">
              {t.price.toLocaleString("ru-RU")}
            </span>
            <span className={`tabular-nums ${up ? "text-pos" : "text-neg"}`}>
              {up ? "+" : ""}
              {t.change24h.toFixed(2)}%
            </span>
            {t.live === false && (
              <span className="text-[9px] uppercase tracking-wide text-muted/60" title="из БД (live-источник недоступен)">
                бд
              </span>
            )}
          </span>
        );
      })}
      <span className="ml-auto flex items-center">
        <span
          className={`text-[9px] uppercase tracking-widest ${live ? "text-pos" : "text-muted/60"}`}
          title={live ? "цены обновляются автоматически" : "live-источники недоступны — значения из БД"}
        >
          {live ? "● live" : "○ бд"}
        </span>
      </span>
    </section>
  );
}
