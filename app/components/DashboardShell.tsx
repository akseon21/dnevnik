"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import EquityChart from "./EquityChart";
import ParticipantModal from "./ParticipantModal";
import Countdown from "./Countdown";
import Sparkline from "./Sparkline";
import { useLivePrices } from "./useLivePrices";
import { useLiveCompetition } from "./useLiveCompetition";
import {
  formatMoney,
  formatPct,
  formatSignedMoney,
  formatTs,
  initials,
  type ChartRow,
  type ParticipantStat,
} from "@/lib/standings";
import { positionPnl, type Position } from "@/lib/types";
import { computeUnrealizedPnlUsd } from "@/lib/pnl";

type LineMeta = { name: string; color: string };

type Props = {
  stats: ParticipantStat[];
  rows: ChartRow[];
  lines: LineMeta[];
  note: string;
  startDate: string;
  endDate: string;
  /** Стартовое значение для focus, прочитанное на сервере из ?focus= (page.tsx). */
  initialFocusedName?: string | null;
};

type TabKey = "open" | "closed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "open", label: "Открытые позиции" },
  { key: "closed", label: "Закрытые сделки" },
];

function ChangeText({ value }: { value: number }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return <span className={cls}>{formatPct(value)}</span>;
}

function PnlText({ value, label }: { value: number; label?: string }) {
  const cls = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  return (
    <span className={`tabular-nums ${cls}`}>
      {label}
      {formatSignedMoney(value)}
    </span>
  );
}

function SideBadge({ side }: { side: Position["side"] }) {
  const long = side === "LONG";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
        long ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"
      }`}
    >
      {side}
    </span>
  );
}

function PositionsTable({
  positions,
  showOwner,
  closed,
}: {
  positions: { owner?: string; ownerColor?: string; pos: Position }[];
  showOwner?: boolean;
  closed?: boolean;
}) {
  if (positions.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted">
        {closed ? "Закрытых сделок пока нет" : "Открытых позиций нет"}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            {showOwner && <th className="py-1 pr-2 font-medium">Участник</th>}
            <th className="py-1 pr-2 font-medium">Направление</th>
            <th className="py-1 pr-2 font-medium">Инструмент</th>
            <th className="py-1 pr-2 font-medium">Размер лота</th>
            <th className="py-1 pr-2 font-medium">План выхода</th>
            {closed && <th className="py-1 pr-2 font-medium">Закрыта</th>}
            <th className="py-1 text-right font-medium">
              {closed ? "Результат PnL" : "Нереализ. PnL"}
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              {showOwner && (
                <td className="py-1.5 pr-2">
                  <span style={{ color: row.ownerColor }} className="font-semibold">
                    {row.owner}
                  </span>
                </td>
              )}
              <td className="py-1.5 pr-2">
                <SideBadge side={row.pos.side} />
              </td>
              <td className="py-1.5 pr-2 font-semibold text-foreground">
                {row.pos.instrument}
              </td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {row.pos.lot.toLocaleString("ru-RU")}
              </td>
              <td className="py-1.5 pr-2 text-muted">{row.pos.exitPlan || "—"}</td>
              {closed && (
                <td className="py-1.5 pr-2 tabular-nums text-muted">
                  {row.pos.closedAt ? formatTs(row.pos.closedAt) : "—"}
                </td>
              )}
              <td className="py-1.5 text-right">
                <PnlText value={closed ? positionPnl(row.pos) : row.pos.unrealizedPnl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LivePositionsTable({
  rows,
}: {
  rows: { pos: Position; pnl: number; isLive: boolean; marketPrice: number | null }[];
}) {
  if (rows.length === 0) {
    return <p className="py-3 text-center text-xs text-muted">Открытых позиций нет</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            <th className="py-1 pr-2 font-medium">Напр.</th>
            <th className="py-1 pr-2 font-medium">Инструмент</th>
            <th className="py-1 pr-2 font-medium">Лот</th>
            <th className="py-1 pr-2 font-medium">Вход</th>
            <th className="py-1 pr-2 font-medium">Цена</th>
            <th className="py-1 text-right font-medium">PnL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="py-1.5 pr-2">
                <SideBadge side={row.pos.side} />
              </td>
              <td className="py-1.5 pr-2 font-semibold text-foreground">
                {row.pos.instrument}
              </td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {row.pos.lot.toLocaleString("ru-RU")}
              </td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {row.pos.entryPrice != null
                  ? row.pos.entryPrice.toLocaleString("ru-RU")
                  : "—"}
              </td>
              <td className="py-1.5 pr-2 tabular-nums text-muted">
                {row.marketPrice != null
                  ? row.marketPrice.toLocaleString("ru-RU")
                  : row.pos.entryPrice != null
                    ? "…"
                    : "—"}
              </td>
              <td className="py-1.5 text-right">
                <PnlText value={row.pnl} />
                {!row.isLive && row.pos.entryPrice != null && (
                  <span className="ml-1 text-[9px] uppercase text-muted/60" title="нет live-цены, показан ручной PnL из БД">
                    бд
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ParticipantCard({
  s,
  onClick,
  liveEquity,
  liveUnrealized,
  hasLive,
  focused,
  dimmed,
}: {
  s: ParticipantStat;
  onClick: () => void;
  liveEquity: number; // = s.balance + (live unrealized || s.unrealizedPnl)
  liveUnrealized: number; // Σ live PnL открытых
  hasLive: boolean; // true если хоть для одной открытой позиции есть live-цена
  focused: boolean; // карточка выбранного фильтр-участника (тёплая обводка)
  dimmed: boolean; // фильтр активен, но это не выбранный → приглушаем
}) {
  // «Текущий счёт»: цвет относительно стартового депозита.
  const equityCls = liveEquity >= s.startValue ? "text-pos" : "text-neg";
  // Визуальный маркер «выбран»: яркая обводка цветом участника + лёгкая подсветка фона.
  // Когда фильтр активен и карточка не выбрана — приглушаем opacity (~40%).
  const wrapperCls = focused
    ? "border-l-[3px] shadow-[0_0_0_1px_var(--tw-shadow-color)]"
    : "border-l-[3px]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={focused}
      className={`flex w-full items-center gap-2.5 rounded-lg border bg-panel px-3 py-2.5 text-left transition hover:border-accent/50 ${wrapperCls} ${dimmed ? "opacity-40" : ""}`}
      style={{
        borderLeftColor: s.color,
        borderColor: focused ? s.color : undefined,
        boxShadow: focused ? `0 0 0 1px ${s.color}55` : undefined,
        background: focused ? `linear-gradient(90deg, ${s.color}14, transparent 60%)` : undefined,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
        style={{ borderColor: s.color, color: s.color }}
      >
        {initials(s.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="flex items-center gap-1">
          {focused && (
            <span
              aria-hidden="true"
              className="text-[10px] leading-none"
              style={{ color: s.color }}
              title="Фильтр графика"
            >
              ◀
            </span>
          )}
          <span className="truncate text-xs font-semibold text-foreground">{s.name}</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className={`tabular-nums text-xs ${hasLive ? equityCls : "text-foreground"}`}>
            {formatMoney(hasLive ? liveEquity : s.currentValue)}
          </span>
          <span className="text-[10px]">
            <ChangeText value={s.changePct} />
          </span>
        </span>
        {hasLive && s.openPositions.length > 0 && (
          <span className="text-[10px] text-muted">
            <span>откр. PnL </span>
            <PnlText value={liveUnrealized} />
          </span>
        )}
      </span>
      <Sparkline timeline={s.timeline} color={s.color} className="shrink-0" />
    </button>
  );
}

// ── live-PnL: построение карт по позициям и участникам ───────────────────────
// Уникальный ключ позиции — для маппинга live-PnL обратно в UI.
function positionKey(participantName: string, pos: Position, idx: number): string {
  return `${participantName}|${pos.instrument}|${pos.side}|${pos.openedAt ?? "?"}|${idx}`;
}

function isPositionLiveable(pos: Position): boolean {
  return (
    pos.status === "open" &&
    pos.entryPrice != null &&
    Number.isFinite(pos.entryPrice) &&
    pos.entryPrice > 0
  );
}

export default function DashboardShell({
  stats,
  rows,
  lines,
  note,
  startDate,
  endDate,
  initialFocusedName = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>("open");
  const [modalName, setModalName] = useState<string | null>(null);

  // ── Live-sync участников/сделок/балансов через Supabase Realtime ───────────
  // Подписываемся на postgres_changes по 5 таблицам. На любое изменение в
  // /admin (новая сделка, правка депозита, закрытие позиции) → router.refresh()
  // перезапускает RSC-fetch, новые данные мёрджатся в DashboardShell без потери
  // фильтров/фокуса/открытой модалки. Если Supabase env нет — деградация в no-op.
  // Если Realtime канал упал — внутренний fallback на polling 45 сек.
  useLiveCompetition();

  // ── Focus (выделение участника на графике) ─────────────────────────────────
  // Источник правды — URL `?focus=<name>`. Никакого локального state — читаем
  // напрямую из useSearchParams. Это автоматически даёт:
  //   • переживание live re-fetch (RSC обновится, URL не тронут);
  //   • шарабельную ссылку (F5 / копирование сохраняет focus);
  //   • back/forward в браузере работают «бесплатно»;
  //   • если в БД удалили выделенного участника — фильтр становится no-op
  //     (имени просто нет в stats), а на следующее действие пользователя
  //     setFocusedName(null) почистит URL.
  // initialFocusedName используется только для SSR-консистентности (избежать
  // гидрационных миганий) — фактическое значение всё равно берётся из URL.
  const focusedName: string | null = (() => {
    const fromUrl = searchParams.get("focus") ?? initialFocusedName ?? null;
    return fromUrl && stats.some((s) => s.name === fromUrl) ? fromUrl : null;
  })();

  const setFocusedName = useCallback(
    (next: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next) sp.set("focus", next);
      else sp.delete("focus");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearFocus = useCallback(() => setFocusedName(null), [setFocusedName]);

  // Все участники теперь всегда видны на графике (фильтр-чипы убраны).
  // «Выделение» — только подсветка/приглушение через focusedName.
  const shownStats = stats;
  const shownLines = lines;
  const modalStat = stats.find((s) => s.name === modalName) ?? null;
  const focusedStat = focusedName ? stats.find((s) => s.name === focusedName) ?? null : null;

  // ── Live prices: уникальные тикеры открытых позиций c entryPrice ──────────
  const liveSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const s of stats) {
      for (const pos of s.openPositions) {
        if (isPositionLiveable(pos)) set.add(pos.instrument.toUpperCase());
        // Для USDxxx-пар (USDJPY/USDCHF/USDCAD) кросс-курс = цена самой пары,
        // отдельных кросс-тикеров не нужно.
      }
    }
    return [...set];
  }, [stats]);

  const live = useLivePrices(liveSymbols);
  const livePrices = live.prices;

  // Если live-канал TwelveData недоступен (нет ключа / 429 / сеть упала) — пишем
  // warning в консоль для разработки. UI-индикатор «live выкл» убран из видимого
  // дашборда по правке UI v10.1, но сигнал должен оставаться доступным разработчику.
  useEffect(() => {
    if (live.stale && live.error) {
      console.warn(`[useLivePrices] stale: ${live.error}`);
    }
  }, [live.stale, live.error]);

  // Live PnL по позициям и Σ live PnL по участникам.
  // Если live-цены для инструмента ещё нет (loading / source=static / нет ключа) —
  // фолбэк на ручной pos.unrealizedPnl, чтобы UI не «прыгал» в ноль.
  const { livePnlByPosKey, liveUnrealizedByName, liveCoverageByName } = useMemo(() => {
    const byPos = new Map<string, number>();
    const byName = new Map<string, number>();
    const coverage = new Map<string, { live: number; total: number }>(); // сколько позиций с live-ценой / всего открытых
    for (const s of stats) {
      let sum = 0;
      let liveCount = 0;
      const totalOpen = s.openPositions.length;
      s.openPositions.forEach((pos, idx) => {
        const key = positionKey(s.name, pos, idx);
        if (isPositionLiveable(pos)) {
          const market = livePrices[pos.instrument.toUpperCase()];
          const pnl = computeUnrealizedPnlUsd(
            pos.instrument,
            pos.side,
            pos.lot,
            pos.entryPrice ?? null,
            market ?? null,
            livePrices,
          );
          if (pnl != null) {
            byPos.set(key, pnl);
            sum += pnl;
            liveCount++;
            return;
          }
        }
        // фолбэк — ручной PnL из БД
        byPos.set(key, pos.unrealizedPnl);
        sum += pos.unrealizedPnl;
      });
      byName.set(s.name, sum);
      coverage.set(s.name, { live: liveCount, total: totalOpen });
    }
    return { livePnlByPosKey: byPos, liveUnrealizedByName: byName, liveCoverageByName: coverage };
  }, [stats, livePrices]);

  // ── Обратный таймер до следующего опроса цен (для мета-подписи под графиком) ──
  // Тикает раз в секунду чтобы текст «1:42» был живым. Старт отсчёта = последний
  // удачный fetch цен (live.fetchedAt). Шаг — NEXT_PUBLIC_PRICES_REFRESH_MS.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  const fetchedMs = live.fetchedAt ? new Date(live.fetchedAt).getTime() : null;
  const refreshMs = (() => {
    const raw = process.env.NEXT_PUBLIC_PRICES_REFRESH_MS;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 5_000 ? n : 120_000;
  })();
  const hasAnyLiveTarget = liveSymbols.length > 0;
  // Показываем таймер только когда поллинг реально идёт и есть точка отсчёта.
  // Если нет открытых позиций требующих live (нечего поллить) или цена ещё ни
  // разу не пришла (live.stale без данных) — таймер скрыт, чтобы не путать.
  const showCountdown =
    hasAnyLiveTarget && fetchedMs != null && !live.stale;
  const remainSec = showCountdown
    ? Math.max(0, Math.ceil((fetchedMs! + refreshMs - nowMs) / 1000))
    : null;
  function fmtCountdown(s: number): string {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  }
  // Текст про следующее обновление (приклеивается к note под графиком).
  const nextUpdateSuffix = showCountdown
    ? ` · до следующего обновления: ${fmtCountdown(remainSec ?? 0)}`
    : hasAnyLiveTarget
      ? " · обновление вручную"
      : "";

  const allClosed = shownStats.flatMap((s) =>
    s.closedPositions.map((pos) => ({ owner: s.name, ownerColor: s.color, pos })),
  );

  return (
    <>
      {/* ─── Тулбар: мета-подпись (с обратным таймером до след. поллинга цен) + Countdown соревнования ─── */}
      {/*
        v10.1: индикатор «● live выкл / обновлено N сек назад» убран из видимого
        UI по правке Кирилла. Если live-канал упал (live.stale) — пишем в консоль
        для разработки, но не показываем виджет. Сама мета-подпись теперь несёт
        живой обратный таймер до следующего fetch цен (см. nextUpdateSuffix).
      */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          📊 {note}
          {nextUpdateSuffix}
        </span>
        <div className="flex items-center gap-2">
          <Countdown startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {/* ─── Основная сетка: график (широкая колонка) + боковая панель участников ─── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* левая колонка: график */}
        <section className="rounded-lg border border-border bg-panel p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Общий баланс счёта
            </h2>
            <div className="flex items-baseline gap-2 text-[11px]">
              <span className="text-muted">график:</span>
              {focusedStat ? (
                <>
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: focusedStat.color }}
                  >
                    {focusedStat.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearFocus}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent hover:border-accent"
                    title="Снять фильтр и показать всех"
                  >
                    Все
                  </button>
                </>
              ) : (
                <span className="font-semibold text-foreground">все</span>
              )}
            </div>
          </div>
          <EquityChart
            rows={rows}
            lines={shownLines}
            stats={shownStats}
            onParticipantClick={(name) => setModalName(name)}
            liveUnrealizedByName={liveUnrealizedByName}
            focusedName={focusedName}
          />
        </section>

        {/* правая колонка: табы + карточки участников */}
        <aside className="flex flex-col gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-panel p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 whitespace-nowrap rounded px-2 py-1.5 text-[11px] font-medium transition ${
                  tab === t.key
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-widest text-muted">
                Участники · {shownStats.length}
              </div>
              {focusedName && (
                <button
                  type="button"
                  onClick={clearFocus}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent hover:border-accent"
                  title="Снять выделение с участника"
                >
                  Показать всех
                </button>
              )}
            </div>
            {shownStats.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted">Участников нет</p>
            ) : (
              shownStats.map((s) => {
                const liveUnrealized = liveUnrealizedByName.get(s.name) ?? s.unrealizedPnl;
                const cov = liveCoverageByName.get(s.name);
                const hasLive = !!cov && cov.live > 0;
                const isFocused = focusedName === s.name;
                const isDimmed = focusedName !== null && !isFocused;
                return (
                  <ParticipantCard
                    key={s.name}
                    s={s}
                    onClick={() => setModalName(s.name)}
                    liveEquity={s.balance + liveUnrealized}
                    liveUnrealized={liveUnrealized}
                    hasLive={hasLive}
                    focused={isFocused}
                    dimmed={isDimmed}
                  />
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* ─── Контент активного таба (под графиком, на всю ширину) ─── */}
      <section>
        {tab === "open" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {shownStats.map((s) => {
              const liveUnrealized = liveUnrealizedByName.get(s.name) ?? s.unrealizedPnl;
              return (
                <div
                  key={s.name}
                  className="rounded-lg border border-border bg-panel p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setModalName(s.name)}
                      className="flex items-center gap-2 text-left hover:opacity-80"
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                        style={{ borderColor: s.color, color: s.color }}
                      >
                        {initials(s.name)}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    </button>
                    {s.openPositions.length > 0 ? (
                      <span className="text-xs">
                        <span className="text-muted">PnL: </span>
                        <PnlText value={liveUnrealized} />
                      </span>
                    ) : (
                      <span className="text-xs">
                        <span className="tabular-nums text-foreground">
                          {formatMoney(s.currentValue)}
                        </span>{" "}
                        <ChangeText value={s.changePct} />
                      </span>
                    )}
                  </div>
                  {s.openPositions.length > 0 && (
                    <div className="mt-2">
                      <LivePositionsTable
                        rows={s.openPositions.map((pos, idx) => ({
                          pos,
                          pnl: livePnlByPosKey.get(positionKey(s.name, pos, idx)) ?? pos.unrealizedPnl,
                          isLive:
                            isPositionLiveable(pos) &&
                            livePrices[pos.instrument.toUpperCase()] != null,
                          marketPrice: livePrices[pos.instrument.toUpperCase()] ?? null,
                        }))}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex justify-end border-t border-border/60 pt-2 text-xs">
                    <span className="text-muted">Свободные средства:&nbsp;</span>
                    <span className="tabular-nums text-foreground">
                      {formatMoney(s.availableCash)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "closed" && (
          <div className="rounded-lg border border-border bg-panel p-3">
            <h3 className="mb-2 text-xs font-semibold text-foreground">
              Закрытые сделки всех участников
            </h3>
            <PositionsTable positions={allClosed} showOwner closed />
          </div>
        )}
      </section>

      {modalStat && (
        <ParticipantModal
          stat={modalStat}
          onClose={() => {
            // По спеке: закрытие модалки = «оставить выделенным этого участника на графике».
            // (a) если уже выделен — выделение остаётся; (b) если другой — переключаем.
            setFocusedName(modalStat.name);
            setModalName(null);
          }}
          liveUnrealized={liveUnrealizedByName.get(modalStat.name) ?? null}
          livePnlByPosKey={livePnlByPosKey}
          livePrices={livePrices}
        />
      )}
    </>
  );
}
