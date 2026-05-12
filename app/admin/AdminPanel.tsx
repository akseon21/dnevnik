"use client";

import { useActionState } from "react";
import {
  addBalancePoint,
  addPosition,
  closePosition,
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
  if (state.ok)
    return <p className="text-xs text-pos">{state.message ?? "Готово"}</p>;
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

type Action = (
  prev: ActionResult | null,
  fd: FormData,
) => Promise<ActionResult>;

function useFormAction(action: Action) {
  return useActionState<ActionResult | null, FormData>(action, null);
}

export default function AdminPanel({ data }: { data: AdminData | null }) {
  const participants = data?.participants ?? [];
  const tickers = data?.tickers ?? [];
  const openPositions = data?.openPositions ?? [];
  const meta = data?.meta ?? null;

  const [bpState, bpAction] = useFormAction(addBalancePoint);
  const [posState, posAction] = useFormAction(addPosition);
  const [closeState, closeAction] = useFormAction(closePosition);
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
      {/* ── Точка баланса ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Добавить точку баланса</h2>
        <form action={bpAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Участник</span>
            <select name="participant_id" className={inputCls} required>
              <option value="">—</option>
              {participantOptions}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Дата/время</span>
            <input type="datetime-local" name="ts" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Баланс, $</span>
            <input type="number" step="0.01" name="value" className={inputCls} required />
          </label>
          <Submit label="Добавить" />
        </form>
        <div className="mt-2">
          <Status state={bpState} />
        </div>
      </section>

      {/* ── Позиция ── */}
      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-foreground">Добавить позицию</h2>
        <form action={posAction} className="flex flex-wrap items-end gap-3">
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
            <span className={labelCls}>План выхода</span>
            <input name="exit_plan" placeholder="TP 4720 / SL 4650" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>PnL, $</span>
            <input type="number" step="0.01" name="unrealized_pnl" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Статус</span>
            <select name="status" className={inputCls}>
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <Submit label="Добавить" />
        </form>
        <div className="mt-2">
          <Status state={posState} />
        </div>

        {openPositions.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <h3 className="mb-2 text-xs font-semibold text-muted">Закрыть открытую позицию</h3>
            <div className="flex flex-col gap-2">
              {openPositions.map((q) => (
                <form
                  key={q.id}
                  action={closeAction}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <input type="hidden" name="id" value={q.id} />
                  <span className="text-foreground">
                    {nameById(q.participant_id)} · {q.side} {q.instrument} · {q.lot} лот
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="unrealized_pnl"
                    placeholder="итоговый PnL"
                    defaultValue={q.unrealized_pnl}
                    className={inputCls + " w-32"}
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:border-neg hover:text-neg"
                  >
                    Закрыть
                  </button>
                </form>
              ))}
            </div>
            <div className="mt-2">
              <Status state={closeState} />
            </div>
          </div>
        )}
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
            <input type="color" name="color" defaultValue="#22d3ee" className={inputCls + " h-9 w-16 p-1"} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Свободные средства, $</span>
            <input type="number" step="0.01" name="available_cash" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Порядок</span>
            <input type="number" name="sort_order" defaultValue={0} className={inputCls + " w-20"} />
          </label>
          <Submit label="Сохранить" />
        </form>
        <p className="mt-2 text-[11px] text-muted">
          При выборе существующего участника всё равно заполните имя/цвет/средства — они
          перезапишутся.
        </p>
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
            <input
              name="title"
              defaultValue={meta?.title ?? ""}
              className={inputCls}
              required
            />
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
              defaultValue={meta?.note ?? "Данные обновляются раз в день, в конце торгового дня"}
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
