// Deliberately planted anomalies, one group per deterministic engine check in src/engines/.
// JE IDs are reserved static strings (not seed-derived) so the answer key below is a literal,
// reviewable table, and `npm test` can assert each engine actually finds every planted case.
import { APPROVAL_THRESHOLD_MINOR } from "./company.js";

function twoLineJe(jeId, { jeDate, createdAt, preparerId, source = "Manual", debitAccountId, creditAccountId, amountMinor, vendorId = null }) {
  return {
    header: {
      jeId,
      companyId: "FGH-DEMO",
      fiscalYear: 2026,
      period: jeDate.slice(0, 7),
      jeDate,
      createdAt,
      source,
      preparerId,
      approverId: null,
      description: `Anomaly fixture ${jeId}`,
      isReversal: false,
    },
    lines: [
      { jeId, lineNo: 1, accountId: debitAccountId, accountType: "debit-side", debitMinor: amountMinor, creditMinor: 0, vendorId, lineDescription: jeId },
      { jeId, lineNo: 2, accountId: creditAccountId, accountType: "credit-side", debitMinor: 0, creditMinor: amountMinor, vendorId, lineDescription: jeId },
    ],
  };
}

/**
 * @param {object[]} normalHeaders
 * @param {object[]} normalLines
 * @param {import("./rng.js").createRng extends (...args: any) => infer R ? R : never} rng unused
 *   by the anomaly set itself (every anomaly is a fixed fixture), accepted for a consistent
 *   generator-stage signature.
 * @returns {{headers: object[], lines: object[], answerKey: object[]}}
 */
export function injectAnomalies(normalHeaders, normalLines, _rng) {
  const entries = [];
  const answerKey = [];

  // BALANCING: one off by 1 minor unit, one with a missing line.
  entries.push(twoLineJe("JE-ANOM-BAL-1", {
    jeDate: "2026-06-10", createdAt: "2026-06-10T11:00:00Z", preparerId: "P-03",
    debitAccountId: "5000", creditAccountId: "2000", amountMinor: 50001,
  }));
  entries[entries.length - 1].lines[1].creditMinor = 50000; // credit intentionally 1 minor unit short
  entries.push({
    header: { jeId: "JE-ANOM-BAL-2", companyId: "FGH-DEMO", fiscalYear: 2026, period: "2026-06", jeDate: "2026-06-11", createdAt: "2026-06-11T11:00:00Z", source: "Manual", preparerId: "P-03", approverId: null, description: "Anomaly fixture JE-ANOM-BAL-2", isReversal: false },
    lines: [
      { jeId: "JE-ANOM-BAL-2", lineNo: 1, accountId: "5200", accountType: "debit-side", debitMinor: 30000, creditMinor: 0, vendorId: null, lineDescription: "JE-ANOM-BAL-2" },
      { jeId: "JE-ANOM-BAL-2", lineNo: 2, accountId: "5200", accountType: "debit-side", debitMinor: 20000, creditMinor: 0, vendorId: null, lineDescription: "JE-ANOM-BAL-2" },
      { jeId: "JE-ANOM-BAL-2", lineNo: 3, accountId: "2000", accountType: "credit-side", debitMinor: 0, creditMinor: 20000, vendorId: null, lineDescription: "JE-ANOM-BAL-2" },
    ],
  });
  answerKey.push({ checkCode: "BALANCING", jeIds: ["JE-ANOM-BAL-1", "JE-ANOM-BAL-2"], reason: "Debits and credits do not sum to the same total." });

  // JET_UNUSUAL_PREPARER: a role never seen on that account.
  entries.push(twoLineJe("JE-ANOM-PREP-1", { jeDate: "2026-06-12", createdAt: "2026-06-12T11:00:00Z", preparerId: "P-06", debitAccountId: "1100", creditAccountId: "4000", amountMinor: 123400 }));
  entries.push(twoLineJe("JE-ANOM-PREP-2", { jeDate: "2026-06-15", createdAt: "2026-06-15T11:00:00Z", preparerId: "P-01", debitAccountId: "5100", creditAccountId: "1000", amountMinor: 234500 }));
  answerKey.push({ checkCode: "JET_UNUSUAL_PREPARER", jeIds: ["JE-ANOM-PREP-1", "JE-ANOM-PREP-2"], reason: "Posted by a preparer whose role is never seen on this account." });

  // JET_UNUSUAL_PAIRING: account pairing absent from the normal list.
  entries.push(twoLineJe("JE-ANOM-PAIR-1", { jeDate: "2026-06-16", createdAt: "2026-06-16T11:00:00Z", preparerId: "P-05", debitAccountId: "4000", creditAccountId: "1000", amountMinor: 345600 }));
  entries.push(twoLineJe("JE-ANOM-PAIR-2", { jeDate: "2026-06-17", createdAt: "2026-06-17T11:00:00Z", preparerId: "P-05", debitAccountId: "2000", creditAccountId: "4000", amountMinor: 456700 }));
  answerKey.push({ checkCode: "JET_UNUSUAL_PAIRING", jeIds: ["JE-ANOM-PAIR-1", "JE-ANOM-PAIR-2"], reason: "Debit/credit account pairing never seen in normal processing." });

  // JET_ROUND_AMOUNT: exact round amounts at/above the round-amount floor (AED 10,000).
  entries.push(twoLineJe("JE-ANOM-ROUND-1", { jeDate: "2026-06-18", createdAt: "2026-06-18T11:00:00Z", preparerId: "P-03", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 5000000 }));
  entries.push(twoLineJe("JE-ANOM-ROUND-2", { jeDate: "2026-06-19", createdAt: "2026-06-19T11:00:00Z", preparerId: "P-03", debitAccountId: "5200", creditAccountId: "2000", amountMinor: 7500000 }));
  entries.push(twoLineJe("JE-ANOM-ROUND-3", { jeDate: "2026-06-22", createdAt: "2026-06-22T11:00:00Z", preparerId: "P-03", debitAccountId: "1500", creditAccountId: "2000", amountMinor: 10000000 }));
  answerKey.push({ checkCode: "JET_ROUND_AMOUNT", jeIds: ["JE-ANOM-ROUND-1", "JE-ANOM-ROUND-2", "JE-ANOM-ROUND-3"], reason: "Exact round-number amount, a classic manual/fabricated-entry indicator." });

  // JET_JUST_UNDER_THRESHOLD: just below the management-approval threshold.
  entries.push(twoLineJe("JE-ANOM-THRESH-1", { jeDate: "2026-06-23", createdAt: "2026-06-23T11:00:00Z", preparerId: "P-03", debitAccountId: "5300", creditAccountId: "1000", amountMinor: APPROVAL_THRESHOLD_MINOR - 5000 }));
  entries.push(twoLineJe("JE-ANOM-THRESH-2", { jeDate: "2026-06-24", createdAt: "2026-06-24T11:00:00Z", preparerId: "P-03", debitAccountId: "5300", creditAccountId: "1000", amountMinor: APPROVAL_THRESHOLD_MINOR - 100 }));
  answerKey.push({ checkCode: "JET_JUST_UNDER_THRESHOLD", jeIds: ["JE-ANOM-THRESH-1", "JE-ANOM-THRESH-2"], reason: "Amount clusters just under the approval threshold, suggesting structuring." });

  // JET_WEEKEND_AFTER_HOURS: 2026-03-14 is a Saturday, 2026-03-15 the following Sunday,
  // 2026-03-16 the following Monday (verified in test/jeUtils.test.mjs).
  entries.push(twoLineJe("JE-ANOM-TIME-1", { jeDate: "2026-03-14", createdAt: "2026-03-14T23:10:00Z", preparerId: "P-03", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 61100 }));
  entries.push(twoLineJe("JE-ANOM-TIME-2", { jeDate: "2026-03-15", createdAt: "2026-03-15T02:00:00Z", preparerId: "P-03", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 62200 }));
  entries.push(twoLineJe("JE-ANOM-TIME-3", { jeDate: "2026-03-16", createdAt: "2026-03-16T23:45:00Z", preparerId: "P-03", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 63300 }));
  answerKey.push({ checkCode: "JET_WEEKEND_AFTER_HOURS", jeIds: ["JE-ANOM-TIME-1", "JE-ANOM-TIME-2", "JE-ANOM-TIME-3"], reason: "Posted outside normal business hours/days." });

  // BENFORD: 25 line amounts with leading digit forced to 9, kept well under both the
  // round-amount floor and the just-under-threshold band so they isolate the Benford check.
  const benfordIds = [];
  for (let i = 0; i < 25; i++) {
    const jeId = `JE-ANOM-BENF-${String(i + 1).padStart(2, "0")}`;
    benfordIds.push(jeId);
    entries.push(twoLineJe(jeId, {
      jeDate: "2026-07-01", createdAt: "2026-07-01T11:00:00Z", preparerId: "P-03",
      debitAccountId: "5000", creditAccountId: "2000", amountMinor: 90000 + i * 100, // 900.00-902.40
    }));
  }
  answerKey.push({ checkCode: "BENFORD", jeIds: benfordIds, reason: "Leading-digit distribution skewed toward 9, far from the expected Benford frequency." });

  // CUTOFF: material entries dated in the last days of the fiscal year.
  entries.push(twoLineJe("JE-ANOM-CUTOFF-1", { jeDate: "2026-12-29", createdAt: "2026-12-29T11:00:00Z", preparerId: "P-03", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 150000 }));
  entries.push(twoLineJe("JE-ANOM-CUTOFF-2", { jeDate: "2026-12-30", createdAt: "2026-12-30T11:00:00Z", preparerId: "P-03", debitAccountId: "5200", creditAccountId: "2000", amountMinor: 180000 }));
  entries.push(twoLineJe("JE-ANOM-CUTOFF-3", { jeDate: "2026-12-31", createdAt: "2026-12-31T11:00:00Z", preparerId: "P-03", debitAccountId: "1500", creditAccountId: "2000", amountMinor: 220000 }));
  answerKey.push({ checkCode: "CUTOFF", jeIds: ["JE-ANOM-CUTOFF-1", "JE-ANOM-CUTOFF-2", "JE-ANOM-CUTOFF-3"], reason: "Material entry dated at/near the fiscal year-end boundary." });

  // NEW_VENDOR: a vendor with no history before the lookback window, posted twice in December.
  entries.push(twoLineJe("JE-ANOM-NEWVENDOR-1", { jeDate: "2026-12-05", createdAt: "2026-12-05T11:00:00Z", preparerId: "P-01", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 88000, vendorId: "V-NEW-ANOM" }));
  entries.push(twoLineJe("JE-ANOM-NEWVENDOR-2", { jeDate: "2026-12-20", createdAt: "2026-12-20T11:00:00Z", preparerId: "P-01", debitAccountId: "5000", creditAccountId: "2000", amountMinor: 77000, vendorId: "V-NEW-ANOM" }));
  answerKey.push({ checkCode: "NEW_VENDOR", jeIds: ["JE-ANOM-NEWVENDOR-1", "JE-ANOM-NEWVENDOR-2"], reason: "Vendor has no activity before the lookback window." });

  // CONCENTRATION: ten entries funnelling spend to one vendor, each individually unremarkable.
  const concIds = [];
  for (let i = 0; i < 10; i++) {
    const jeId = `JE-ANOM-CONC-${String(i + 1).padStart(2, "0")}`;
    concIds.push(jeId);
    entries.push(twoLineJe(jeId, {
      jeDate: `2026-0${(i % 9) + 1}-10`, createdAt: `2026-0${(i % 9) + 1}-10T11:00:00Z`, preparerId: "P-01",
      debitAccountId: "5000", creditAccountId: "2000", amountMinor: 800000, vendorId: "V-CONC-ANOM",
    }));
  }
  answerKey.push({ checkCode: "CONCENTRATION", vendorId: "V-CONC-ANOM", jeIds: concIds, reason: "A single vendor accounts for a disproportionate share of AP spend." });

  return {
    headers: [...normalHeaders, ...entries.map((e) => e.header)],
    lines: [...normalLines, ...entries.flatMap((e) => e.lines)],
    answerKey,
  };
}
