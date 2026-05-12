// Канонические типы данных дашборда — общие для статического fallback (data/competition.ts)
// и для слоя БД (lib/db.ts).

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
  unrealizedPnl: number; // текущий PnL по позиции, $
  status: "open" | "closed"; // открытая / закрытая
  openedAt?: string | null; // ISO-таймстамп открытия
  closedAt?: string | null; // ISO-таймстамп закрытия (для закрытых)
};

export type TimelinePoint = {
  ts: string; // ISO-таймстамп момента, напр. "2026-05-13T10:00"
  value: number; // баланс счёта участника на этот момент, $
};

export type Participant = {
  name: string; // имя участника
  color: string; // стабильный цвет линии (hex)
  avatar: string | null; // путь к фото или null → показываем инициалы
  timeline: TimelinePoint[]; // динамика баланса во времени (минимум 1 точка)
  positions: Position[]; // позиции участника (открытые + закрытые)
  availableCash: number; // свободные средства, $
};

export type WatchlistItem = {
  instrument: string; // тикер, который присматривают (XAGUSD, AUDUSD, ...) — НЕ переводим
  note: string; // комментарий «ждём отбой от уровня» и т.п.
  participantNames: string[]; // имена участников, кто присматривает
};

export type Competition = {
  title: string;
  startDate: string; // "ГГГГ-ММ-ДД"
  endDate: string; // "ГГГГ-ММ-ДД"
  note: string; // пометка «данные обновляются раз в день…»
  tickers: Ticker[];
  participants: Participant[];
  watchlist: WatchlistItem[]; // список наблюдения (v3)
};
