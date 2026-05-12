"use client";

import { useActionState } from "react";
import {
  openTrade,
  updateTradePnl,
  closeTrade,
  upsertParticipant,
  upsertTicker,
  upsertMeta,
  type ActionResult,
  type AdminData,
} from "./actions";

const inputCls =
  "rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent";
const labelCls = "text-[11px] uppercase tracking-wide text-muted";
const cardCls = "rounded-lg border border-border bg-panel p-4";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) return <p className="text-xs text-pos">{state.message ?? "Готово"}</p>;
  return <p className="text-xs text-neg">{state.error ?? "Ошибка"}</p>;
}

function Submit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-background hover:opacity-90"
    >
      {label}
    </button>
  );
}

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function useFormAction(action: Action) {
  return useActionState<ActionResult | null, FormData>(action, null);
}

export default function AdminPanel({ data }: { data: AdminData | null }) {
  const participants = data?.participants ?? [];
  const tickers = data?.tickers ?? [];
  const openPositions = data?.openPositions ?? [];
  const meta = data?.meta ?? null;

  const [openState, openAction] = useFormAction(openTrade);
  const [pnlState, pnlAction] = useFormAction(updateTradePnl);
  const [closeState, closeAction] = useFormAction(closeTrade);
  const [pState, pAction] = useFormAction(upsertParticipant);
  const [tState, tAction] = useFormAction(upsertTicker);
  const [mState, mAction] = useFormAction(upsertMeta);

  const participantOptions = participants.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));

  const nameById = (id: string) => participants.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-border bg-panel px-3 py-2 text-[11px] text-muted">
        Сделко-центричная модель: баланс, equity и свободные средства считаются автоматически из
        сделок. Руками задаются только стартовый депозит участника и сами сделки (открыть → обновить
        плавающий PnL → закрыть с результатом).
      </p>

      {/* ── Открыть сделку ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Открыть сделку</h2>
        <form action={openAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Участник</span>
            <select name="participant_id" className={inputCls} required>
              <option value="">—</option>
              {participantOptions}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Направление</span>
            <select name="side" className={inputCls}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Инструмент</span>
            <input name="instrument" placeholder="XAUUSD" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Размер лота</span>
            <input type="number" step="0.01" name="lot" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Маржа, $</span>
            <input type="number" step="0.01" name="margin" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>План выхода</span>
            <input name="exit_plan" placeholder="TP 4720 / SL 4650" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Открыта (необяз.)</span>
            <input type="datetime-local" name="opened_at" className={inputCls} />
          </label>
          <Submit label="Открыть" />
        </form>
        <p className="mt-2 text-[11px] text-muted">
          Плавающий PnL при открытии = 0. Дату можно не указывать — поставится текущая.
        </p>
        <div className="mt-2">
          <Status state={openState} />
        </div>
      </section>

      {/* ── Открытые сделки: обновить PnL / закрыть ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Открытые сделки</h2>
        {openPositions.length === 0 ? (
          <p className="py-2 text-xs text-muted">Открытых сделок нет.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {openPositions.map((q) => (
              <div
                key={q.id}
                className="rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="mb-2 text-xs font-semibold text-foreground">
                  {nameById(q.participant_id)} · {q.side} {q.instrument} · {q.lot} лот · маржа $
                  {q.margin}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  {/* обновить плавающий PnL */}
                  <form action={pnlAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={q.id} />
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Текущий плавающий PnL, $</span>
                      <input
                        type="number"
                        step="0.01"
                        name="unrealized_pnl"
                        defaultValue={q.unrealized_pnl}
                        className={inputCls + " w-32"}
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-accent hover:text-accent"
                    >
                      Обновить PnL
                    </button>
                  </form>
                  {/* закрыть сделку */}
                  <form action={closeAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={q.id} />
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Итоговый результат, $</span>
                      <input
                        type="number"
                        step="0.01"
                        name="realized_pnl"
                        placeholder="realized PnL"
                        className={inputCls + " w-32"}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelCls}>Закрыта (необяз.)</span>
                      <input type="datetime-local" name="closed_at" className={inputCls} />
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-neg hover:text-neg"
                    >
                      Закрыть
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-1">
          <Status state={pnlState} />
          <Status state={closeState} />
        </div>
      </section>

      {/* ── Участники ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">
          Участники (добавить / редактировать)
        </h2>
        <form action={pAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Существующий (для правки)</span>
            <select name="id" className={inputCls} defaultValue="">
              <option value="">— новый —</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Имя</span>
            <input name="name" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Цвет</span>
            <input
              type="color"
              name="color"
              defaultValue="#22d3ee"
              className={inputCls + " h-9 w-16 p-1"}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Стартовый депозит, $</span>
            <input type="number" step="0.01" name="starting_deposit" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Порядок</span>
            <input type="number" name="sort_order" defaultValue={0} className={inputCls + " w-20"} />
          </label>
          <Submit label="Сохранить" />
        </form>
        <p className="mt-2 text-[11px] text-muted">
          При выборе существующего участника всё равно заполните имя/цвет/депозит/порядок — они
          перезапишутся. Стартовый депозит задаётся один раз; дальше баланс растёт от сделок.
        </p>
        {participants.length > 0 && (
          <p className="mt-1 text-[11px] text-muted">
            Текущие:{" "}
            {participants.map((p) => `${p.name} ($${p.starting_deposit})`).join(" · ")}
          </p>
        )}
        <div className="mt-2">
          <Status state={pState} />
        </div>
      </section>

      {/* ── Тикеры ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Обновить тикер</h2>
        <form action={tAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Символ</span>
            <input
              name="symbol"
              list="ticker-symbols"
              placeholder="XAUUSD"
              className={inputCls}
              required
            />
            <datalist id="ticker-symbols">
              {tickers.map((t) => (
                <option key={t.symbol} value={t.symbol} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Цена</span>
            <input type="number" step="any" name="price" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Изменение за 24ч, %</span>
            <input type="number" step="any" name="change_24h" className={inputCls} />
          </label>
          <Submit label="Сохранить" />
        </form>
        {tickers.length > 0 && (
          <p className="mt-2 text-[11px] text-muted">
            Текущие: {tickers.map((t) => `${t.symbol} ${t.price}`).join(" · ")}
          </p>
        )}
        <div className="mt-2">
          <Status state={tState} />
        </div>
      </section>

      {/* ── Соревнование ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Параметры соревнования</h2>
        <form action={mAction} className="flex flex-col gap-3">
          {meta && <input type="hidden" name="id" value={meta.id} />}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Название</span>
            <input name="title" defaultValue={meta?.title ?? ""} className={inputCls} required />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Начало</span>
              <input
                type="date"
                name="start_date"
                defaultValue={meta?.start_date ?? ""}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Конец</span>
              <input
                type="date"
                name="end_date"
                defaultValue={meta?.end_date ?? ""}
                className={inputCls}
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Пометка</span>
            <input
              name="note"
              defaultValue={meta?.note ?? "Баланс и equity считаются автоматически из сделок"}
              className={inputCls}
            />
          </label>
          <Submit label="Сохранить" />
        </form>
        <div className="mt-2">
          <Status state={mState} />
        </div>
      </section>
    </div>
  );
}
