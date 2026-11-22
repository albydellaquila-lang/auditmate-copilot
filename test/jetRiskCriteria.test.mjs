import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flagUnusualPreparers,
  flagUnusualAccountPairings,
  flagRoundAmounts,
  flagJustUnderThreshold,
  flagWeekendOrAfterHoursPostings,
  runJetRiskCriteria,
} from "../src/engines/jetRiskCriteria.js";

test("flagUnusualPreparers: flags a role never seen on that account, ignores accounts with no rule", () => {
  const lines = [
    { jeId: "JE-1", accountId: "5100" }, // payroll account
    { jeId: "JE-2", accountId: "9999" }, // no rule defined for this account
  ];
  const headers = [
    { jeId: "JE-1", preparerId: "P-CFO" },
    { jeId: "JE-2", preparerId: "P-CFO" },
  ];
  const opts = {
    normalRolesByAccount: { "5100": ["Payroll Admin", "Controller"] },
    preparerRoleById: { "P-CFO": "CFO" },
  };
  assert.deepEqual(flagUnusualPreparers(lines, headers, opts), [
    { jeId: "JE-1", reasonCode: "JET_UNUSUAL_PREPARER", detail: { accountId: "5100", preparerId: "P-CFO", role: "CFO", allowedRoles: ["Payroll Admin", "Controller"] } },
  ]);
});

test("flagUnusualAccountPairings: flags a two-line entry whose pairing is not in the normal list", () => {
  const lines = [
    { jeId: "JE-1", accountId: "5000", debitMinor: 1000, creditMinor: 0 },
    { jeId: "JE-1", accountId: "2000", debitMinor: 0, creditMinor: 1000 },
    { jeId: "JE-2", accountId: "4000", debitMinor: 500, creditMinor: 0 },
    { jeId: "JE-2", accountId: "1000", debitMinor: 0, creditMinor: 500 },
  ];
  const opts = { normalPairs: [["5000", "2000"]] };
  assert.deepEqual(flagUnusualAccountPairings(lines, opts), [
    { jeId: "JE-2", reasonCode: "JET_UNUSUAL_PAIRING", detail: { debitAccountId: "4000", creditAccountId: "1000" } },
  ]);
});

test("flagUnusualAccountPairings: skips entries that are not exactly two lines", () => {
  const lines = [
    { jeId: "JE-3", accountId: "5000", debitMinor: 300, creditMinor: 0 },
    { jeId: "JE-3", accountId: "5100", debitMinor: 200, creditMinor: 0 },
    { jeId: "JE-3", accountId: "2000", debitMinor: 0, creditMinor: 500 },
  ];
  assert.deepEqual(flagUnusualAccountPairings(lines, { normalPairs: [] }), []);
});

test("flagRoundAmounts: flags round amounts at/above the floor, not smaller or non-round ones", () => {
  const lines = [
    { jeId: "JE-1", debitMinor: 5000000, creditMinor: 0 }, // 50,000.00 - round, >= floor
    { jeId: "JE-2", debitMinor: 50000, creditMinor: 0 }, // 500.00 - round but below floor
    { jeId: "JE-3", debitMinor: 0, creditMinor: 1234500 }, // 12,345.00 - above floor, not round
  ];
  assert.deepEqual(flagRoundAmounts(lines, { minMinor: 1000000, granularityMinor: 100000 }), [
    { jeId: "JE-1", reasonCode: "JET_ROUND_AMOUNT", detail: { amountMinor: 5000000 } },
  ]);
});

test("flagJustUnderThreshold: flags totals within the band just below the threshold", () => {
  const lines = [
    { jeId: "JE-1", debitMinor: 995000, creditMinor: 0 }, // 9,950.00
    { jeId: "JE-1", debitMinor: 0, creditMinor: 995000 },
    { jeId: "JE-2", debitMinor: 500000, creditMinor: 0 }, // 5,000.00 - well under, not "just under"
    { jeId: "JE-2", debitMinor: 0, creditMinor: 500000 },
  ];
  const flagged = flagJustUnderThreshold(lines, { thresholdMinor: 1000000, bandMinor: 100000 });
  assert.deepEqual(flagged, [
    { jeId: "JE-1", reasonCode: "JET_JUST_UNDER_THRESHOLD", detail: { amountMinor: 995000, thresholdMinor: 1000000 } },
  ]);
});

// 2026-03-14 is a Saturday, 2026-03-16 the following Monday (see test/jeUtils.test.mjs).
test("flagWeekendOrAfterHoursPostings: flags weekend and after-hours postings only", () => {
  const headers = [
    { jeId: "JE-1", createdAt: "2026-03-14T11:00:00Z" }, // Saturday
    { jeId: "JE-2", createdAt: "2026-03-16T23:00:00Z" }, // Monday, after hours
    { jeId: "JE-3", createdAt: "2026-03-16T10:00:00Z" }, // Monday, business hours
  ];
  assert.deepEqual(flagWeekendOrAfterHoursPostings(headers), [
    { jeId: "JE-1", reasonCode: "JET_WEEKEND_AFTER_HOURS", detail: { createdAt: "2026-03-14T11:00:00Z" } },
    { jeId: "JE-2", reasonCode: "JET_WEEKEND_AFTER_HOURS", detail: { createdAt: "2026-03-16T23:00:00Z" } },
  ]);
});

test("runJetRiskCriteria: combines every sub-check into one flat list", () => {
  const dataset = {
    headers: [{ jeId: "JE-1", preparerId: "P-CFO", createdAt: "2026-03-14T11:00:00Z" }],
    lines: [
      { jeId: "JE-1", accountId: "5100", debitMinor: 5000000, creditMinor: 0 },
      { jeId: "JE-1", accountId: "1000", debitMinor: 0, creditMinor: 5000000 },
    ],
  };
  const config = {
    normalRolesByAccount: { "5100": ["Payroll Admin"] },
    preparerRoleById: { "P-CFO": "CFO" },
    normalPairs: [["5100", "1000"]],
    minMinor: 1000000,
    granularityMinor: 100000,
    thresholdMinor: 1000000,
    bandMinor: 100000,
  };
  // Both lines carry the same round amount (5,000,000 minor units), so flagRoundAmounts
  // — which flags per line, not per entry — fires twice.
  const reasonCodes = runJetRiskCriteria(dataset, config).map((f) => f.reasonCode).sort();
  assert.deepEqual(reasonCodes, [
    "JET_ROUND_AMOUNT",
    "JET_ROUND_AMOUNT",
    "JET_UNUSUAL_PREPARER",
    "JET_WEEKEND_AFTER_HOURS",
  ]);
});
