import { test } from "node:test";
import assert from "node:assert/strict";
import { flagCutoffEntries } from "../src/engines/cutoff.js";

const HEADERS = [
  { jeId: "JE-1", jeDate: "2026-12-30" }, // inside a 3-day window before 2026-12-31
  { jeId: "JE-2", jeDate: "2026-12-31" }, // the period-end date itself
  { jeId: "JE-3", jeDate: "2026-12-20" }, // well outside the window
  { jeId: "JE-4", jeDate: "2026-12-29" }, // inside window but below materiality
];
const LINES = [
  { jeId: "JE-1", debitMinor: 500000, creditMinor: 0 },
  { jeId: "JE-1", debitMinor: 0, creditMinor: 500000 },
  { jeId: "JE-2", debitMinor: 200000, creditMinor: 0 },
  { jeId: "JE-2", debitMinor: 0, creditMinor: 200000 },
  { jeId: "JE-3", debitMinor: 900000, creditMinor: 0 },
  { jeId: "JE-3", debitMinor: 0, creditMinor: 900000 },
  { jeId: "JE-4", debitMinor: 100, creditMinor: 0 },
  { jeId: "JE-4", debitMinor: 0, creditMinor: 100 },
];

test("flagCutoffEntries: flags entries within the window and above materiality, inclusive of the end date", () => {
  const flagged = flagCutoffEntries(HEADERS, LINES, {
    periodEndDate: "2026-12-31",
    windowDays: 3,
    materialityMinor: 1000,
  });
  assert.deepEqual(
    flagged.map((f) => f.jeId),
    ["JE-1", "JE-2"]
  );
});

test("flagCutoffEntries: a zero materiality floor includes small entries too", () => {
  const flagged = flagCutoffEntries(HEADERS, LINES, {
    periodEndDate: "2026-12-31",
    windowDays: 3,
    materialityMinor: 0,
  });
  assert.deepEqual(
    flagged.map((f) => f.jeId).sort(),
    ["JE-1", "JE-2", "JE-4"]
  );
});

test("flagCutoffEntries: a zero-day window includes only the period-end date itself", () => {
  const flagged = flagCutoffEntries(HEADERS, LINES, {
    periodEndDate: "2026-12-31",
    windowDays: 0,
    materialityMinor: 0,
  });
  assert.deepEqual(
    flagged.map((f) => f.jeId),
    ["JE-2"]
  );
});
