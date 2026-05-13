// Канонические типы данных дашборда — общие для статического fallback (data/competition.ts)
// и для слоя БД (lib/db.ts).
//
// v6 — trade-centric модель: баланс / equity / свободные средства НЕ хранятся,
// а вычисляются из сделок (см. lib/standings.ts). Хранятся: starting_deposit
// участника и сами позиции (margin, unrealized_pnl пока открыта, realized_pnl при закрытии).

export type Ticker = {
  symbol: string; // тикер (XAUUSD, EURUSD, ...) — НЕ переводим
  price: number; // текущая цена
  change24h: number; // изменение за сутки в % (может быть отрицательным)
};

export type Position = {
  side: "LONG" | "SHORT"; // LONG / SHORT — НЕ переводим
  instrument: string; // тикер инструмента
  lot: number; // размер лота, напр. 0.5
  exitPlan: string; // план выхода, напр. "TP 4700 / SL 4640"
  margin: number; // заблокированная сумма $ (вводится при открытии)
  unrealizedPnl: number; // текущий плавающий PnL пока сделка открыта (0 при открытии); для закрытой — не используется
  realizedPnl: number | null; // финальный результат при закрытии (null пока открыта)
  status: "open" | "closed"; // открытая / закрытая
  openedAt?: string | null; // ISO-таймстамп открытия
  closedAt?: string | null; // ISO-таймстамп закрытия (для закрытых)
  // v9 — live-PnL: цена входа в сделку. Если задана — нереализ. PnL пересчитывается
  // на лету из текущей рыночной цены (см. lib/pnl.ts + /api/prices). Если null —
  // используется ручной unrealizedPnl (старый поток админки сохраняется).
  entryPrice?: number | null;
};

/** PnL сделки в текущем виде: для закрытой — realizedPnl, для открытой — unrealizedPnl. */
export function positionPnl(p: Position): number {
  return p.status === "closed" ? p.realizedPnl ?? 0 : p.unrealizedPnl;
}

export type TimelinePoint = {
  ts: string; // ISO-таймстамп момента
  value: number; // баланс счёта участника на этот момент, $
};

export type Participant = {
  name: string; // имя участника
  color: string; // стабильный цвет линии (hex)
  avatar: string | null; // путь к фото или null → показываем инициалы
  startingDeposit: number; // стартовый депозит, $ (база для баланса / роста %)
  positions: Position[]; // позиции участника (открытые + закрытые)
};

// Список наблюдения — оставлен в типах для совместимости (таблица watchlist в БД
// сохранена), но в UI больше не используется (убран таб «Список наблюдения», v4).
export type WatchlistItem = {
  instrument: string;
  note: string;
  participantNames: string[];
};

export type Competition = {
  title: string;
  startDate: string; // "ГГГГ-ММ-ДД"
  endDate: string; // "ГГГГ-ММ-ДД"
  note: string; // пометка под графиком
  tickers: Ticker[];
  participants: Participant[];
  watchlist?: WatchlistItem[]; // не используется в UI
};
