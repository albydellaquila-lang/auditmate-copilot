import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMonthlyAccountActivity, flagSignificantVariances } from "../src/engines/analyticalProcedures.js";

const HEADERS = [
  { jeId: "JE-1", period: "2026-01" },
  { jeId: "JE-2", period: "2026-01" },
  { jeId: "JE-3", period: "2026-02" },
  { jeId: "JE-4", period: "2026-03" },
  { jeId: "JE-5", period: "2026-03" },
];
const LINES = [
  { jeId: "JE-1", accountId: "5000", debitMinor: 100000, creditMinor: 0 }, // Jan, net 100000
  { jeId: "JE-2", accountId: "4000", debitMinor: 0, creditMinor: 500000 }, // Jan, net -500000
  { jeId: "JE-3", accountId: "5000", debitMinor: 110000, creditMinor: 0 }, // Feb, net 110000
  { jeId: "JE-4", accountId: "5000", debitMinor: 200000, creditMinor: 0 }, // Mar, net 200000
  { jeId: "JE-5", accountId: "4000", debitMinor: 0, creditMinor: 520000 }, // Mar, net -520000
];

test("computeMonthlyAccountActivity: sums debit minus credit per account per period, hand-computed", () => {
  const activity = computeMonthlyAccountActivity(HEADERS, LINES);
  assert.deepEqual(activity, [
    { accountId: "4000", period: "2026-01", netMinor: -500000 },
    { accountId: "4000", period: "2026-03", netMinor: -520000 },
    { accountId: "5000", period: "2026-01", netMinor: 100000 },
    { accountId: "5000", period: "2026-02", netMinor: 110000 },
    { accountId: "5000", period: "2026-03", netMinor: 200000 },
  ]);
});

test("flagSignificantVariances: flags only the swing beyond threshold, by hand", () => {
  const activity = computeMonthlyAccountActivity(HEADERS, LINES);
  const flagged = flagSignificantVariances(activity, { varianceThresholdBps: 3000 });
  // 4000: Jan -500000 -> Mar -520000: |20000|/500000 = 400 bps, below threshold.
  // 5000: Jan 100000 -> Feb 110000: |10000|/100000 = 1000 bps, below threshold.
  // 5000: Feb 110000 -> Mar 200000: |90000|/110000 = 8181.818...% -> rounds to 8182 bps, flagged.
  assert.deepEqual(flagged, [
    {
      accountId: "5000",
      period: "2026-03",
      previousPeriod: "2026-02",
      currentNetMinor: 200000,
      previousNetMinor: 110000,
      varianceBps: 8182,
      reasonCode: "SIGNIFICANT_VARIANCE",
    },
  ]);
});

test("flagSignificantVariances: a lower threshold catches the smaller swings too", () => {
  const activity = computeMonthlyAccountActivity(HEADERS, LINES);
  const flagged = flagSignificantVariances(activity, { varianceThresholdBps: 300 });
  assert.deepEqual(
    flagged.map((f) => `${f.accountId}:${f.previousPeriod}->${f.period}`),
    ["4000:2026-01->2026-03", "5000:2026-01->2026-02", "5000:2026-02->2026-03"]
  );
});

test("flagSignificantVariances: a zero previous period is skipped, not divided by", () => {
  const activity = [
    { accountId: "9999", period: "2026-01", netMinor: 0 },
    { accountId: "9999", period: "2026-02", netMinor: 50000 },
  ];
  assert.deepEqual(flagSignificantVariances(activity), []);
});

test("flagSignificantVariances: a materiality floor excludes huge-percentage swings on tiny balances", () => {
  const activity = [
    // AED 2.00 -> AED 300.00: a 14,900% swing by the raw percentage, but both amounts are
    // immaterial (well under a AED 5,000 floor), so this is noise, not a real fluctuation.
    { accountId: "4000", period: "2026-01", netMinor: 200 },
    { accountId: "4000", period: "2026-02", netMinor: 30000 },
    // A genuinely material swing on the same account, now large enough to clear the floor.
    { accountId: "4000", period: "2026-03", netMinor: 600000 }, // AED 6,000.00
  ];
  const flagged = flagSignificantVariances(activity, { materialityFloorMinor: 500000 }); // AED 5,000.00
  assert.deepEqual(
    flagged.map((f) => `${f.previousPeriod}->${f.period}`),
    ["2026-02->2026-03"]
  );
});
