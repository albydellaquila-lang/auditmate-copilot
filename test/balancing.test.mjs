import { test } from "node:test";
import assert from "node:assert/strict";
import { findUnbalancedEntries } from "../src/engines/balancing.js";

const LINES = [
  // JE-1: balanced (1000 = 1000)
  { jeId: "JE-1", debitMinor: 100000, creditMinor: 0 },
  { jeId: "JE-1", debitMinor: 0, creditMinor: 100000 },
  // JE-2: off by 1 minor unit (debit 500.01 vs credit 500.00)
  { jeId: "JE-2", debitMinor: 50001, creditMinor: 0 },
  { jeId: "JE-2", debitMinor: 0, creditMinor: 50000 },
  // JE-3: balanced across three lines (300 + 200 = 500)
  { jeId: "JE-3", debitMinor: 30000, creditMinor: 0 },
  { jeId: "JE-3", debitMinor: 20000, creditMinor: 0 },
  { jeId: "JE-3", debitMinor: 0, creditMinor: 50000 },
];

test("findUnbalancedEntries: flags only the entry with a real mismatch", () => {
  const flagged = findUnbalancedEntries(LINES);
  assert.deepEqual(flagged, [
    { jeId: "JE-2", totalDebitMinor: 50001, totalCreditMinor: 50000, diffMinor: 1 },
  ]);
});

test("findUnbalancedEntries: a toleranceMinor allows small rounding drift", () => {
  assert.deepEqual(findUnbalancedEntries(LINES, { toleranceMinor: 1 }), []);
});

test("findUnbalancedEntries: no entries flagged when everything balances", () => {
  const balanced = LINES.filter((l) => l.jeId !== "JE-2");
  assert.deepEqual(findUnbalancedEntries(balanced), []);
});
