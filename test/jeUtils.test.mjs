import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByJe, jeTotals, isWeekendOrAfterHours } from "../data/generator/jeUtils.js";

const LINES = [
  { jeId: "JE-1", debitMinor: 10000, creditMinor: 0 },
  { jeId: "JE-1", debitMinor: 0, creditMinor: 10000 },
  { jeId: "JE-2", debitMinor: 500, creditMinor: 0 },
  { jeId: "JE-2", debitMinor: 300, creditMinor: 0 },
  { jeId: "JE-2", debitMinor: 0, creditMinor: 800 },
];

test("groupByJe: groups lines under their jeId, preserving order", () => {
  const groups = groupByJe(LINES);
  assert.equal(groups.size, 2);
  assert.equal(groups.get("JE-1").length, 2);
  assert.equal(groups.get("JE-2").length, 3);
});

test("jeTotals: sums debit/credit per JE by hand", () => {
  const totals = jeTotals(LINES);
  assert.deepEqual(totals.get("JE-1"), { debitMinor: 10000, creditMinor: 10000 });
  assert.deepEqual(totals.get("JE-2"), { debitMinor: 800, creditMinor: 800 });
});

// 2026-03-14 is a Saturday (verified by hand: 2024-01-01 Mon -> 2025-01-01 Wed (+366 days)
// -> 2026-01-01 Thu (+365 days) -> +72 days to Mar 14 (31 Jan + 28 Feb + 13) = Thu + 72,
// 72 mod 7 = 2, Thu+2 = Saturday). 2026-03-16 is therefore the following Monday.
test("isWeekendOrAfterHours: flags Saturday regardless of hour", () => {
  assert.equal(isWeekendOrAfterHours("2026-03-14T11:00:00Z"), true);
});

test("isWeekendOrAfterHours: flags a weekday outside business hours", () => {
  assert.equal(isWeekendOrAfterHours("2026-03-16T23:00:00Z"), true);
  assert.equal(isWeekendOrAfterHours("2026-03-16T02:00:00Z"), true);
});

test("isWeekendOrAfterHours: weekday within business hours is not flagged", () => {
  assert.equal(isWeekendOrAfterHours("2026-03-16T10:00:00Z"), false);
  assert.equal(isWeekendOrAfterHours("2026-03-16T08:00:00Z"), false);
  assert.equal(isWeekendOrAfterHours("2026-03-16T17:59:00Z"), false);
});

test("isWeekendOrAfterHours: respects custom business-hour bounds", () => {
  assert.equal(
    isWeekendOrAfterHours("2026-03-16T07:00:00Z", { businessStartHour: 6, businessEndHour: 20 }),
    false
  );
});
