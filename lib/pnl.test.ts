// Юнит-тесты для lib/pnl.ts. Запуск:
//   npm run test:pnl
// (использует встроенный node:test + experimental-strip-types, без зависимостей)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeUnrealizedPnlUsd,
  contractSize,
  sideSign,
  toTwelveData,
  fromTwelveData,
} from "./pnl.ts";

// допустимая численная погрешность для сравнения
function approx(actual: number | null, expected: number, eps = 1e-6) {
  assert.ok(actual !== null, "ожидался не-null PnL");
  assert.ok(
    Math.abs((actual as number) - expected) < eps,
    `actual=${actual}, expected≈${expected}`,
  );
}

// ── XAUUSD (золото, 100 oz/лот) ────────────────────────────────────────────────
test("XAUUSD LONG profit", () => {
  // 0.5 лота, вход 4600, цена 4650 → (4650-4600)*100*0.5*+1 = +2500
  approx(computeUnrealizedPnlUsd("XAUUSD", "LONG", 0.5, 4600, 4650), 2500);
});

test("XAUUSD SHORT profit", () => {
  // 0.5 лота, вход 4650, цена 4600 → (4600-4650)*100*0.5*-1 = +2500
  approx(computeUnrealizedPnlUsd("XAUUSD", "SHORT", 0.5, 4650, 4600), 2500);
});

test("XAUUSD LONG loss", () => {
  // 0.5 лота, вход 4650, цена 4600 → (4600-4650)*100*0.5*+1 = -2500
  approx(computeUnrealizedPnlUsd("XAUUSD", "LONG", 0.5, 4650, 4600), -2500);
});

// ── XAGUSD (серебро, 5000 oz/лот) ──────────────────────────────────────────────
test("XAGUSD LONG profit", () => {
  // 0.1 лота, вход 28.0, цена 28.5 → 0.5*5000*0.1 = +250
  approx(computeUnrealizedPnlUsd("XAGUSD", "LONG", 0.1, 28.0, 28.5), 250);
});

// ── EURUSD (мажор, 100k/лот, quote=USD) ────────────────────────────────────────
test("EURUSD LONG profit", () => {
  // 0.3 лота, вход 1.0900, цена 1.0950 → 0.005*100000*0.3 = +150
  approx(computeUnrealizedPnlUsd("EURUSD", "LONG", 0.3, 1.0900, 1.0950), 150, 1e-9);
});

test("EURUSD SHORT loss", () => {
  // 0.3 лота, SHORT, вход 1.0900, цена 1.0950 → -150
  approx(computeUnrealizedPnlUsd("EURUSD", "SHORT", 0.3, 1.0900, 1.0950), -150, 1e-9);
});

// ── GBPUSD (мажор, 100k/лот) ──────────────────────────────────────────────────
test("GBPUSD SHORT profit", () => {
  // 0.2 лота, SHORT, вход 1.2800, цена 1.2750 → 0.005*100000*0.2 = +100
  approx(computeUnrealizedPnlUsd("GBPUSD", "SHORT", 0.2, 1.2800, 1.2750), 100, 1e-9);
});

// ── USDJPY (quote=JPY → перевод в USD по текущей цене пары) ───────────────────
test("USDJPY LONG profit (quote→USD via current rate)", () => {
  // 0.5 лота, вход 150.00, цена 151.00 → PnL_jpy = 1*100000*0.5 = 50_000
  // PnL_usd = 50_000 / 151.00 ≈ 331.13
  approx(computeUnrealizedPnlUsd("USDJPY", "LONG", 0.5, 150.0, 151.0), 50000 / 151.0, 1e-6);
});

test("USDJPY SHORT loss", () => {
  // 0.5 лота SHORT, вход 150, цена 151 → -50_000 jpy / 151 ≈ -331.13
  approx(computeUnrealizedPnlUsd("USDJPY", "SHORT", 0.5, 150.0, 151.0), -50000 / 151.0, 1e-6);
});

// ── BTCUSD (1 BTC / лот, quote=USD) ────────────────────────────────────────────
test("BTCUSD LONG profit", () => {
  // 0.1 лота (= 0.1 BTC), вход 70_000, цена 71_000 → 1000*1*0.1 = +100
  approx(computeUnrealizedPnlUsd("BTCUSD", "LONG", 0.1, 70_000, 71_000), 100);
});

test("BTCUSD SHORT profit", () => {
  // 0.1 лота SHORT, вход 71_000, цена 70_000 → +100
  approx(computeUnrealizedPnlUsd("BTCUSD", "SHORT", 0.1, 71_000, 70_000), 100);
});

// ── граничные случаи ──────────────────────────────────────────────────────────
test("missing entryPrice → null", () => {
  assert.equal(computeUnrealizedPnlUsd("EURUSD", "LONG", 1, null, 1.1), null);
});

test("missing marketPrice → null", () => {
  assert.equal(computeUnrealizedPnlUsd("EURUSD", "LONG", 1, 1.1, null), null);
});

test("zero entry price → null", () => {
  assert.equal(computeUnrealizedPnlUsd("EURUSD", "LONG", 1, 0, 1.1), null);
});

test("BUY/SELL synonyms are accepted", () => {
  assert.equal(sideSign("BUY"), 1);
  assert.equal(sideSign("SELL"), -1);
  approx(computeUnrealizedPnlUsd("EURUSD", "BUY", 0.3, 1.09, 1.095), 150, 1e-9);
  approx(computeUnrealizedPnlUsd("EURUSD", "SELL", 0.3, 1.095, 1.09), 150, 1e-9);
});

test("contractSize lookups", () => {
  assert.equal(contractSize("XAUUSD"), 100);
  assert.equal(contractSize("XAGUSD"), 5000);
  assert.equal(contractSize("BTCUSD"), 1);
  assert.equal(contractSize("EURUSD"), 100_000);
  assert.equal(contractSize("USDJPY"), 100_000);
});

// ── маппинг тикеров TwelveData ────────────────────────────────────────────────
test("toTwelveData splits 6-letter ticker into BASE/QUOTE", () => {
  assert.equal(toTwelveData("XAUUSD"), "XAU/USD");
  assert.equal(toTwelveData("EURUSD"), "EUR/USD");
  assert.equal(toTwelveData("BTCUSD"), "BTC/USD");
  assert.equal(toTwelveData("USDJPY"), "USD/JPY");
});

test("toTwelveData lowercase input still works", () => {
  assert.equal(toTwelveData("eurusd"), "EUR/USD");
});

test("fromTwelveData strips slash", () => {
  assert.equal(fromTwelveData("XAU/USD"), "XAUUSD");
  assert.equal(fromTwelveData("EUR/USD"), "EURUSD");
});
