"use client";

import { useActionState, useState } from "react";
import {
  openTrade,
  updateTrade,
  updateTradePnl,
  closeTrade,
  deleteTrade,
  upsertParticipant,
  deleteParticipant,
  upsertTicker,
  upsertMeta,
  type ActionResult,
  type AdminData,
  type AdminParticipantRow,
  type AdminPositionRow,
} from "./actions";

// ─────────────────────────────────────────────────────────────────────────────
// Админка v7 — полное редактирование участников и сделок + UX-апгрейд.
//   • секции через <details> (свернуть/развернуть)
//   • рядом с участником — вычисленные баланс / equity / свободные / рост %
//   • инлайн-фидбек после каждого действия (useActionState → Status)
//   • confirm() на удаление участника / сделки
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  "rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent";
const labelCls = "text-[11px] uppercase tracking-wide text-muted";
const sectionCls = "rounded-lg border border-border bg-panel";
const summaryCls =
  "cursor-pointer select-none px-4 py-3 text-sm font-bold text-foreground marker:text-muted";
const bodyCls = "border-t border-border px-4 py-4";
const subCardCls = "rounded-md border border-border/70 bg-background/40 p-3";

function fmtMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(v)).toLocaleString("ru-RU");
}
function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(1) + "%";
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
/** ISO → значение для <input type="datetime-local"> (UTC, "ГГГГ-ММ-ДДTHH:MM"). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok)
    return <p className="mt-2 text-xs font-semibold text-pos">✅ {state.message ?? "Сохранено"}</p>;
  return <p className="mt-2 text-xs font-semibold text-neg">❌ Ошибка: {state.error ?? "неизвестно"}</p>;
}

function Submit({ label, variant = "primary" }: { label: string; variant?: "primary" | "ghost" | "danger" }) {
  const cls =
    variant === "primary"
      ? "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-background hover:opacity-90"
      : variant === "danger"
        ? "rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-neg hover:text-neg"
        : "rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-accent hover:text-accent";
  return (
    <button type="submit" className={"self-start " + cls}>
      {label}
    </button>
  );
}

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
function useFormAction(action: Action) {
  return useActionState<ActionResult | null, FormData>(action, null);
}

/** Кнопка-сабмит с confirm(): если пользователь отменяет — предотвращаем отправку формы. */
function ConfirmSubmit({ label, message }: { label: string; message: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className="self-start rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-neg hover:text-neg"
    >
      {label}
    </button>
  );
}

// ── участники ────────────────────────────────────────────────────────────────
function ParticipantsSection({ participants }: { participants: AdminParticipantRow[] }) {
  const [upState, upAction] = useFormAction(upsertParticipant);
  const [delState, delAction] = useFormAction(deleteParticipant);
  // какой участник сейчас редактируется ('' = форма «новый»)
  const [editId, setEditId] = useState<string>("");
  const editing = participants.find((p) => p.id === editId) ?? null;
  // key, чтобы форма пересоздавалась при смене editId (подставит defaultValue)
  const formKey = editId || "new";

  return (
    <details className={sectionCls} open>
      <summary className={summaryCls}>👤 Участники ({participants.length})</summary>
      <div className={bodyCls}>
        {/* список участников с вычисленными значениями + кнопки */}
        {participants.length === 0 ? (
          <p className="mb-4 text-xs text-muted">Участников нет — добавьте ниже.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className={subCardCls + " flex flex-wrap items-center justify-between gap-3"}
                style={{ borderLeft: `3px solid ${p.color}` }}
              >
                <div className="min-w-[180px]">
                  <div className="text-sm font-semibold text-foreground">
                    {p.name}{" "}
                    <span className="text-[11px] font-normal text-muted">
                      · старт {fmtMoney(p.starting_deposit)} · порядок {p.sort_order}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    баланс <span className="text-foreground">{fmtMoney(p.balance)}</span> · equity{" "}
                    <span className="text-foreground">{fmtMoney(p.equity)}</span> · свободно{" "}
                    <span className="text-foreground">{fmtMoney(p.available_cash)}</span> · рост{" "}
                    <span className={p.change_pct >= 0 ? "text-pos" : "text-neg"}>{fmtPct(p.change_pct)}</span>
                    {" · "}
                    {p.open_count} откр. / {p.closed_count} закр.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditId(p.id)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-accent hover:text-accent"
                  >
                    Редактировать
                  </button>
                  <form action={delAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmit
                      label="Удалить"
                      message={`Удалить участника ${p.name}? Его сделки тоже удалятся.`}
                    />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <Status state={delState} />

        {/* форма добавления / редактирования */}
        <div className="mt-4 rounded-md border border-border bg-background/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
              {editing ? `Редактирование: ${editing.name}` : "Новый участник"}
            </h3>
            {editing && (
              <button
                type="button"
                onClick={() => setEditId("")}
                className="text-[11px] uppercase tracking-wide text-muted hover:text-accent"
              >
                + новый
              </button>
            )}
          </div>
          <form key={formKey} action={upAction} className="flex flex-wrap items-end gap-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Имя</span>
              <input name="name" defaultValue={editing?.name ?? ""} className={inputCls} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Цвет</span>
              <input
                type="color"
                name="color"
                defaultValue={editing?.color ?? "#22d3ee"}
                className={inputCls + " h-9 w-16 p-1"}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Фото (URL) — пусто = инициалы</span>
              <input
                name="avatar_url"
                defaultValue={editing?.avatar_url ?? ""}
                placeholder="https://…/avatar.jpg"
                className={inputCls + " w-56"}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Стартовый депозит, $</span>
              <input
                type="number"
                step="0.01"
                name="starting_deposit"
                defaultValue={editing?.starting_deposit ?? 0}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Порядок</span>
              <input
                type="number"
                name="sort_order"
                defaultValue={editing?.sort_order ?? 0}
                className={inputCls + " w-20"}
              />
            </label>
            <Submit label={editing ? "Сохранить изменения" : "Добавить участника"} />
          </form>
          <p className="mt-2 text-[11px] text-muted">
            Баланс / equity / свободные средства / рост % считаются автоматически из сделок участника.
            Стартовый депозит — единственная вводимая денежная база.
          </p>
          <Status state={upState} />
        </div>
      </div>
    </details>
  );
}

// ── сделки участника ─────────────────────────────────────────────────────────
function ParticipantTrades({
  participant,
  positions,
}: {
  participant: AdminParticipantRow;
  positions: AdminPositionRow[];
}) {
  const [editState, editAction] = useFormAction(updateTrade);
  const [delState, delAction] = useFormAction(deleteTrade);
  const [closeState, closeAction] = useFormAction(closeTrade);
  const [pnlState, pnlAction] = useFormAction(updateTradePnl);
  const [editId, setEditId] = useState<string | null>(null);

  const own = positions.filter((q) => q.participant_id === participant.id);
  const open = own.filter((q) => q.status === "open");
  const closed = own.filter((q) => q.status === "closed");

  function tradeLine(q: AdminPositionRow): string {
    const pnl =
      q.status === "closed"
        ? ` · результат ${fmtMoney(q.realized_pnl ?? 0)}`
        : ` · плав. PnL ${fmtMoney(q.unrealized_pnl)}`;
    return `${q.side} ${q.instrument} · ${q.lot} лот · маржа ${fmtMoney(q.margin)}${pnl}`;
  }

  function EditForm({ q }: { q: AdminPositionRow }) {
    const isClosed = q.status === "closed";
    return (
      <form action={editAction} className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-border bg-background/40 p-3">
        <input type="hidden" name="id" value={q.id} />
        <input type="hidden" name="status" value={q.status} />
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Направление</span>
          <select name="side" defaultValue={q.side} className={inputCls}>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Инструмент</span>
          <input name="instrument" defaultValue={q.instrument} className={inputCls + " w-28"} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Лот</span>
          <input type="number" step="0.01" name="lot" defaultValue={q.lot} className={inputCls + " w-20"} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Маржа, $</span>
          <input type="number" step="0.01" name="margin" defaultValue={q.margin} className={inputCls + " w-24"} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>План выхода</span>
          <input name="exit_plan" defaultValue={q.exit_plan} className={inputCls + " w-44"} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Открыта</span>
          <input type="datetime-local" name="opened_at" defaultValue={toLocalInput(q.opened_at)} className={inputCls} />
        </label>
        {isClosed ? (
          <>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Итоговый результат, $</span>
              <input
                type="number"
                step="0.01"
                name="realized_pnl"
                defaultValue={q.realized_pnl ?? 0}
                className={inputCls + " w-28"}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Закрыта</span>
              <input type="datetime-local" name="closed_at" defaultValue={toLocalInput(q.closed_at)} className={inputCls} />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Плавающий PnL, $</span>
            <input
              type="number"
              step="0.01"
              name="unrealized_pnl"
              defaultValue={q.unrealized_pnl}
              className={inputCls + " w-28"}
            />
          </label>
        )}
        <Submit label="Сохранить" variant="ghost" />
        <button
          type="button"
          onClick={() => setEditId(null)}
          className="self-start rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Отмена
        </button>
      </form>
    );
  }

  function Row({ q }: { q: AdminPositionRow }) {
    return (
      <div className={subCardCls}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-foreground">
            {q.status === "closed" ? "🔒 " : "🟢 "}
            {tradeLine(q)}
            <span className="ml-2 font-normal text-muted">
              · откр. {fmtDate(q.opened_at)}
              {q.status === "closed" && q.closed_at ? ` → закр. ${fmtDate(q.closed_at)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditId(editId === q.id ? null : q.id)}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:border-accent hover:text-accent"
            >
              {editId === q.id ? "Свернуть" : "Редактировать"}
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={q.id} />
              <ConfirmSubmit
                label="Удалить"
                message={`Удалить сделку ${q.side} ${q.instrument} (${participant.name})?`}
              />
            </form>
          </div>
        </div>

        {/* быстрые действия для открытых */}
        {q.status === "open" && editId !== q.id && (
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <form action={pnlAction} className="flex items-end gap-2">
              <input type="hidden" name="id" value={q.id} />
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Плавающий PnL, $</span>
                <input
                  type="number"
                  step="0.01"
                  name="unrealized_pnl"
                  defaultValue={q.unrealized_pnl}
                  className={inputCls + " w-28"}
                />
              </label>
              <Submit label="Обновить PnL" variant="ghost" />
            </form>
            <form action={closeAction} className="flex items-end gap-2">
              <input type="hidden" name="id" value={q.id} />
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Итоговый результат, $</span>
                <input type="number" step="0.01" name="realized_pnl" placeholder="realized PnL" className={inputCls + " w-28"} required />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Закрыта (необяз.)</span>
                <input type="datetime-local" name="closed_at" className={inputCls} />
              </label>
              <Submit label="Закрыть" variant="danger" />
            </form>
          </div>
        )}

        {editId === q.id && <EditForm q={q} />}
      </div>
    );
  }

  return (
    <details className="rounded-md border border-border/70 bg-background/30">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-foreground marker:text-muted">
        <span style={{ color: participant.color }}>●</span> {participant.name}
        <span className="ml-2 font-normal text-muted">
          — {open.length} открытых / {closed.length} закрытых · баланс {fmtMoney(participant.balance)} · equity{" "}
          {fmtMoney(participant.equity)} · свободно {fmtMoney(participant.available_cash)}
        </span>
      </summary>
      <div className="border-t border-border/70 px-3 py-3">
        {own.length === 0 ? (
          <p className="text-xs text-muted">У участника нет сделок. Откройте сделку в секции «Сделки → Открыть сделку».</p>
        ) : (
          <div className="flex flex-col gap-2">
            {open.length > 0 && (
              <p className="text-[11px] uppercase tracking-wide text-muted">Открытые</p>
            )}
            {open.map((q) => (
              <Row key={q.id} q={q} />
            ))}
            {closed.length > 0 && (
              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">Закрытые</p>
            )}
            {closed.map((q) => (
              <Row key={q.id} q={q} />
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-1">
          <Status state={pnlState} />
          <Status state={closeState} />
          <Status state={editState} />
          <Status state={delState} />
        </div>
      </div>
    </details>
  );
}

function TradesSection({
  participants,
  positions,
}: {
  participants: AdminParticipantRow[];
  positions: AdminPositionRow[];
}) {
  const [openState, openAction] = useFormAction(openTrade);
  const totalOpen = positions.filter((q) => q.status === "open").length;
  const totalClosed = positions.filter((q) => q.status === "closed").length;

  return (
    <details className={sectionCls} open>
      <summary className={summaryCls}>
        📈 Сделки ({totalOpen} открытых / {totalClosed} закрытых)
      </summary>
      <div className={bodyCls}>
        {/* открыть новую сделку */}
        <div className="mb-4 rounded-md border border-border bg-background/30 p-3">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">Открыть сделку</h3>
          {participants.length === 0 ? (
            <p className="text-xs text-muted">Сначала добавьте участника.</p>
          ) : (
            <form action={openAction} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Участник</span>
                <select name="participant_id" className={inputCls} required>
                  <option value="">—</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
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
                <input name="instrument" placeholder="XAUUSD" className={inputCls + " w-28"} required />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Размер лота</span>
                <input type="number" step="0.01" name="lot" className={inputCls + " w-20"} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Маржа, $</span>
                <input type="number" step="0.01" name="margin" className={inputCls + " w-24"} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>План выхода</span>
                <input name="exit_plan" placeholder="TP 4720 / SL 4650" className={inputCls + " w-44"} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Открыта (необяз.)</span>
                <input type="datetime-local" name="opened_at" className={inputCls} />
              </label>
              <Submit label="Открыть" />
            </form>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Плавающий PnL при открытии = 0. Дату можно не указывать — поставится текущая.
          </p>
          <Status state={openState} />
        </div>

        {/* сделки по участникам */}
        <div className="flex flex-col gap-2">
          {participants.map((p) => (
            <ParticipantTrades key={p.id} participant={p} positions={positions} />
          ))}
        </div>
      </div>
    </details>
  );
}

// ── тикеры ───────────────────────────────────────────────────────────────────
function TickersSection({ tickers }: { tickers: AdminData["tickers"] }) {
  const [tState, tAction] = useFormAction(upsertTicker);
  return (
    <details className={sectionCls}>
      <summary className={summaryCls}>📊 Тикеры ({tickers.length})</summary>
      <div className={bodyCls}>
        {tickers.length > 0 && (
          <p className="mb-3 text-[11px] text-muted">
            Текущие: {tickers.map((t) => `${t.symbol} ${t.price}`).join(" · ")}
          </p>
        )}
        <form action={tAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Символ</span>
            <input name="symbol" list="ticker-symbols" placeholder="XAUUSD" className={inputCls} required />
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
        <p className="mt-2 text-[11px] text-muted">
          Тикеры также автоматически подтягиваются с внешних источников (CoinGecko / Frankfurter /
          goldprice.org) — ручное значение используется как fallback.
        </p>
        <Status state={tState} />
      </div>
    </details>
  );
}

// ── соревнование ─────────────────────────────────────────────────────────────
function MetaSection({ meta }: { meta: AdminData["meta"] }) {
  const [mState, mAction] = useFormAction(upsertMeta);
  return (
    <details className={sectionCls}>
      <summary className={summaryCls}>🏁 Соревнование</summary>
      <div className={bodyCls}>
        <form action={mAction} className="flex flex-col gap-3">
          {meta && <input type="hidden" name="id" value={meta.id} />}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Название</span>
            <input name="title" defaultValue={meta?.title ?? ""} className={inputCls} required />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Начало</span>
              <input type="date" name="start_date" defaultValue={meta?.start_date ?? ""} className={inputCls} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Конец</span>
              <input type="date" name="end_date" defaultValue={meta?.end_date ?? ""} className={inputCls} required />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Пометка (правила / описание под графиком)</span>
            <input
              name="note"
              defaultValue={meta?.note ?? "Баланс и equity считаются автоматически из сделок"}
              className={inputCls}
            />
          </label>
          <Submit label="Сохранить" />
        </form>
        <Status state={mState} />
      </div>
    </details>
  );
}

// ── корневой компонент ───────────────────────────────────────────────────────
export default function AdminPanel({ data }: { data: AdminData | null }) {
  const participants = data?.participants ?? [];
  const tickers = data?.tickers ?? [];
  const positions = data?.positions ?? [];
  const meta = data?.meta ?? null;
  const lastUpdated = data?.lastUpdated ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* шапка: текущее состояние */}
      <div className="rounded-md border border-border bg-panel px-3 py-2.5 text-xs text-muted">
        {meta ? (
          <span>
            Соревнование: <span className="text-foreground">{meta.title}</span> · {meta.start_date} —{" "}
            {meta.end_date} · {participants.length} участников
          </span>
        ) : (
          <span>Параметры соревнования не заданы — заполните секцию «Соревнование».</span>
        )}
        {lastUpdated && (
          <span> · последнее обновление {fmtDate(lastUpdated)} (UTC)</span>
        )}
      </div>

      <p className="rounded-md border border-border bg-panel px-3 py-2 text-[11px] text-muted">
        Сделко-центричная модель: баланс, equity и свободные средства считаются автоматически из
        сделок. Руками задаются только стартовый депозит участника и сами сделки. Деструктивные
        действия (удаление участника / сделки) требуют подтверждения.
      </p>

      <ParticipantsSection participants={participants} />
      <TradesSection participants={participants} positions={positions} />
      <TickersSection tickers={tickers} />
      <MetaSection meta={meta} />
    </div>
  );
}
