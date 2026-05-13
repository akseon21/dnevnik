"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useLivePrices — клиентский поллинг /api/prices для заданного набора тикеров.
//
// Возвращает {prices, fetchedAt, stale, source, loading}.
//   prices     — { "XAUUSD": 4637.5, ... } (наш формат тикера)
//   fetchedAt  — ISO момента когда сервер получил/обновил цену
//   stale      — true если ответ из старого кеша после ошибки апстрима
//   source     — "twelvedata" | "cache" | "static"
//   loading    — true пока идёт первый запрос
//
// Дефолтный интервал — 120 000 мс (2 минуты), чтобы укладываться в TwelveData
// free лимит 800 req/день (1 req/2 мин = 720 req/день). Перекрывается через
// NEXT_PUBLIC_PRICES_REFRESH_MS в .env.local или Vercel env.
//
// Если symbols пустой массив — поллинг не запускается (не нагружаем сеть).
// ─────────────────────────────────────────────────────────────────────────────

export type LivePricesState = {
  prices: Record<string, number>;
  fetchedAt: string | null;
  stale: boolean;
  source: "twelvedata" | "cache" | "static" | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  prices?: Record<string, number>;
  fetchedAt?: string;
  stale?: boolean;
  source?: LivePricesState["source"];
  error?: string;
};

const DEFAULT_REFRESH_MS = 120_000;

function readRefreshMs(): number {
  const raw = process.env.NEXT_PUBLIC_PRICES_REFRESH_MS;
  if (!raw) return DEFAULT_REFRESH_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5_000) return DEFAULT_REFRESH_MS; // нижняя граница 5 сек
  return n;
}

const EMPTY_STATE: LivePricesState = {
  prices: {},
  fetchedAt: null,
  stale: false,
  source: null,
  loading: false,
  error: null,
};

export function useLivePrices(symbols: string[]): LivePricesState {
  // стабилизируем ключ запроса — сортированный, уникальный набор тикеров
  const symbolsKey = useMemo(() => {
    const set = new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean));
    return [...set].sort().join(",");
  }, [symbols]);

  const [fetched, setFetched] = useState<LivePricesState>({
    ...EMPTY_STATE,
    loading: symbolsKey.length > 0,
  });

  // защита от устаревших ответов
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!symbolsKey) return;

    const refreshMs = readRefreshMs();
    let cancelled = false;
    const myReq = ++reqIdRef.current;

    async function poll() {
      try {
        const res = await fetch(
          `/api/prices?symbols=${encodeURIComponent(symbolsKey)}`,
          { cache: "no-store" },
        );
        if (cancelled || myReq !== reqIdRef.current) return;
        if (!res.ok) {
          setFetched((s) => ({ ...s, loading: false, stale: true, error: `http ${res.status}` }));
          return;
        }
        const data = (await res.json()) as ApiResponse;
        if (cancelled || myReq !== reqIdRef.current) return;
        setFetched({
          prices: data.prices ?? {},
          fetchedAt: data.fetchedAt ?? new Date().toISOString(),
          stale: !!data.stale,
          source: data.source ?? null,
          loading: false,
          error: data.error ?? null,
        });
      } catch (err) {
        if (cancelled || myReq !== reqIdRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setFetched((s) => ({ ...s, loading: false, stale: true, error: message }));
      }
    }

    poll();
    const id = setInterval(poll, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbolsKey]);

  // Если поллить нечего — возвращаем дефолт, не дожидаясь setState (избегаем cascading render)
  return symbolsKey ? fetched : EMPTY_STATE;
}
