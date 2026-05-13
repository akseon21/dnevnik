"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// useLiveCompetition — клиентская подписка на изменения таблиц соревнования.
//
// Стратегия: при ЛЮБОМ INSERT / UPDATE / DELETE в наблюдаемых таблицах вызываем
// `router.refresh()`. Это перезапускает RSC-fetch (`getCompetitionData()` в
// app/page.tsx), мёрджит новый payload и сохраняет client state (фильтры, табы,
// фокус, открытую модалку, состояние графика). Получаем «true realtime» без
// дублирования fetch-логики на клиенте.
//
// Транспорт:
//   B (по умолчанию) — Supabase Realtime websocket, postgres_changes на список
//                      таблиц. Требует `alter publication supabase_realtime add table ...`
//                      (миграция 0007_realtime.sql) и публичный SELECT через RLS
//                      (уже настроен в 0001_init.sql).
//   A (fallback)     — обычный setInterval на router.refresh() каждые
//                      `pollIntervalMs` (по умолчанию 45 000 мс). Используется
//                      когда Supabase env не настроен ИЛИ websocket не открылся
//                      / упал в ошибку.
//
// Важно: дебаунс. На одно server action в /admin Supabase может прислать сразу
// несколько событий (несколько INSERT в balance_points + UPDATE positions и т.п.)
// → `router.refresh()` вызвался бы N раз подряд. Дебаунс склеивает их в один
// перезапрос (по умолчанию 400 мс).
//
// SSR-safe: весь реальный код в useEffect. Render возвращает void.
// ─────────────────────────────────────────────────────────────────────────────

const REALTIME_TABLES = [
  "participants",
  "positions",
  "balance_points",
  "competition_meta",
  "tickers",
] as const;

const DEFAULT_POLL_MS = 45_000;
const REFRESH_DEBOUNCE_MS = 400;

type Options = {
  /** Включить хук. По умолчанию true. */
  enabled?: boolean;
  /** Интервал поллинга-фолбэка в мс. По умолчанию 45 000. */
  pollIntervalMs?: number;
};

export function useLiveCompetition(opts: Options = {}): void {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_MS } = opts;
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRefresh() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

    let cleanup: (() => void) | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function startPollingFallback(reason: string) {
      if (pollId) return;
      console.info(`[live-sync] using polling fallback (${reason}, ${pollIntervalMs} ms)`);
      pollId = setInterval(() => {
        router.refresh();
      }, pollIntervalMs);
    }

    if (!url || !anonKey) {
      // Supabase не настроен (статика) — нечего слушать. Fallback тоже не нужен:
      // данные не меняются между рендерами. Молча выходим.
      return;
    }

    // Пытаемся открыть Realtime канал. На любую ошибку — переключаемся на polling.
    try {
      const supabase = createClient(url, anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } },
      });

      let channel = supabase.channel("dashboard-live");
      for (const table of REALTIME_TABLES) {
        channel = channel.on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          { event: "*", schema: "public", table },
          () => scheduleRefresh(),
        );
      }
      channel.subscribe((status) => {
        // Возможные status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED"
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          startPollingFallback(`channel status=${status}`);
        }
      });

      cleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("[live-sync] Realtime init failed, falling back to polling:", err);
      startPollingFallback("init exception");
      cleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }

    return () => {
      if (pollId) clearInterval(pollId);
      cleanup?.();
    };
  }, [enabled, pollIntervalMs, router]);
}
