// Source: COSO Internal Control — Integrated Framework (2013); PCAOB AS 2201 (test-of-controls
// cross-reference, US readers). Every function below is a pure presence/equality/date/threshold
// check on already-structured synthetic evidence records (attestations, approvals, reviews,
// reconciliations) — there is no free-text document here for an LLM to read, so this file never
// imports from src/ai/ and the "LLM never does math" rule is satisfied by construction, not by a
// guardrail. No money tolerance math is needed either (only integer >=/=== comparisons on
// already-minor-unit fields), so money.js's withinTolerance/sumMinor are not used here.
function testId(reasonCode, sampleId) {
  return `${reasonCode}:${sampleId}`;
}

// Source: COSO 2013, Principle 1 — demonstrates a commitment to integrity and ethical values.
// A signed annual attestation on file for every person is the checkable evidence of this.
/**
 * @param {Array<{attestationId:string, personId:string, fiscalYear:number, signedDate:string|null}>} attestations
 * @param {{fiscalYear: number}} opts
 */
export function testConductAttestations(attestations, { fiscalYear }) {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd = `${fiscalYear}-12-31`;
  const flagged = [];
  for (const a of attestations) {
    if (!a.signedDate || a.signedDate < yearStart || a.signedDate > yearEnd) {
      flagged.push({
        testId: testId("CTRL_ATTESTATION_MISSING", a.attestationId),
        controlId: "CTRL-ENV-01",
        reasonCode: "CTRL_ATTESTATION_MISSING",
        sampleId: a.attestationId,
        detail: { personId: a.personId, fiscalYear, signedDate: a.signedDate },
      });
    }
  }
  return flagged;
}

// Source: COSO 2013, Principle 8 — considers the potential for fraud in assessing risks; a new
// vendor must be approved by an authorized role before, not after, transacting with it.
/**
 * @param {Array<object>} onboardings
 * @param {{authorizedApproverRoles: string[]}} opts
 */
export function testVendorOnboardingApprovals(onboardings, { authorizedApproverRoles }) {
  const flagged = [];
  for (const o of onboardings) {
    if (!o.approverId || !authorizedApproverRoles.includes(o.approverRole)) {
      flagged.push({
        testId: testId("CTRL_VENDOR_ONBOARDING_UNAPPROVED", o.onboardingId),
        controlId: "CTRL-RISK-01",
        reasonCode: "CTRL_VENDOR_ONBOARDING_UNAPPROVED",
        sampleId: o.onboardingId,
        detail: { vendorId: o.vendorId, approverId: o.approverId, approverRole: o.approverRole },
      });
    } else if (o.approvalDate > o.firstTransactionDate) {
      flagged.push({
        testId: testId("CTRL_VENDOR_ONBOARDING_LATE_APPROVAL", o.onboardingId),
        controlId: "CTRL-RISK-01",
        reasonCode: "CTRL_VENDOR_ONBOARDING_LATE_APPROVAL",
        sampleId: o.onboardingId,
        detail: { vendorId: o.vendorId, approvalDate: o.approvalDate, firstTransactionDate: o.firstTransactionDate },
      });
    }
  }
  return flagged;
}

// Source: COSO 2013, Principle 12 — deploys control activities through policies and procedures;
// purchases above the approval threshold require a documented approver.
/**
 * @param {Array<object>} poApprovals
 * @param {{thresholdMinor: number}} opts
 */
export function testPurchaseOrderApprovals(poApprovals, { thresholdMinor }) {
  const flagged = [];
  for (const p of poApprovals) {
    if (p.totalMinor >= thresholdMinor && !p.approverId) {
      flagged.push({
        testId: testId("CTRL_PO_APPROVAL_MISSING", p.sampleId),
        controlId: "CTRL-ACT-01",
        reasonCode: "CTRL_PO_APPROVAL_MISSING",
        sampleId: p.sampleId,
        detail: { poId: p.poId, totalMinor: p.totalMinor, thresholdMinor },
      });
    }
  }
  return flagged;
}

// Source: COSO 2013, Principle 10 — selects/develops control activities including segregation
// of incompatible duties; the same person must not both prepare and approve a purchase order.
/** @param {Array<object>} poApprovals */
export function testPurchaseOrderSegregationOfDuties(poApprovals) {
  const flagged = [];
  for (const p of poApprovals) {
    if (p.approverId && p.approverId === p.preparerId) {
      flagged.push({
        testId: testId("CTRL_PO_SOD_VIOLATION", p.sampleId),
        controlId: "CTRL-ACT-02",
        reasonCode: "CTRL_PO_SOD_VIOLATION",
        sampleId: p.sampleId,
        detail: { poId: p.poId, preparerId: p.preparerId, approverId: p.approverId },
      });
    }
  }
  return flagged;
}

// Source: COSO 2013, Principle 14 — internally communicates information necessary to support
// internal control; journal entries above materiality require a documented, independent review.
/**
 * @param {Array<object>} jeReviews
 * @param {{materialityMinor: number}} opts
 */
export function testJournalEntryReviews(jeReviews, { materialityMinor }) {
  const flagged = [];
  for (const j of jeReviews) {
    if (j.amountMinor < materialityMinor) continue;
    if (!j.reviewerId) {
      flagged.push({
        testId: testId("CTRL_JE_REVIEW_MISSING", j.sampleId),
        controlId: "CTRL-INFO-01",
        reasonCode: "CTRL_JE_REVIEW_MISSING",
        sampleId: j.sampleId,
        detail: { jeId: j.jeId, amountMinor: j.amountMinor, materialityMinor },
      });
    } else if (j.reviewerId === j.preparerId) {
      flagged.push({
        testId: testId("CTRL_JE_REVIEW_SOD_VIOLATION", j.sampleId),
        controlId: "CTRL-INFO-01",
        reasonCode: "CTRL_JE_REVIEW_SOD_VIOLATION",
        sampleId: j.sampleId,
        detail: { jeId: j.jeId, preparerId: j.preparerId, reviewerId: j.reviewerId },
      });
    }
  }
  return flagged;
}

function monthEndDate(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

// Source: COSO 2013, Principle 16 — conducts ongoing and/or separate evaluations; monthly bank
// reconciliations must be completed within a grace period and reviewed by someone else.
/**
 * @param {Array<object>} bankReconciliations
 * @param {{graceDays?: number}} [opts]
 */
export function testBankReconciliations(bankReconciliations, { graceDays = 15 } = {}) {
  const flagged = [];
  for (const b of bankReconciliations) {
    if (!b.completedDate) {
      flagged.push({
        testId: testId("CTRL_BANKREC_MISSING", b.reconciliationId),
        controlId: "CTRL-MON-01",
        reasonCode: "CTRL_BANKREC_MISSING",
        sampleId: b.reconciliationId,
        detail: { period: b.period },
      });
      continue;
    }
    const periodEnd = monthEndDate(b.period);
    const daysAfterPeriodEnd = Math.floor((new Date(`${b.completedDate}T00:00:00Z`) - new Date(`${periodEnd}T00:00:00Z`)) / 86400000);
    if (daysAfterPeriodEnd > graceDays) {
      flagged.push({
        testId: testId("CTRL_BANKREC_LATE", b.reconciliationId),
        controlId: "CTRL-MON-01",
        reasonCode: "CTRL_BANKREC_LATE",
        sampleId: b.reconciliationId,
        detail: { period: b.period, completedDate: b.completedDate, daysAfterPeriodEnd },
      });
    } else if (!b.reviewerId || b.reviewerId === b.preparerId) {
      flagged.push({
        testId: testId("CTRL_BANKREC_SOD_VIOLATION", b.reconciliationId),
        controlId: "CTRL-MON-01",
        reasonCode: "CTRL_BANKREC_SOD_VIOLATION",
        sampleId: b.reconciliationId,
        detail: { period: b.period, preparerId: b.preparerId, reviewerId: b.reviewerId },
      });
    }
  }
  return flagged;
}

/**
 * Run every test of controls and return one combined, flat list of findings.
 * @param {{attestations:object[], vendorOnboardings:object[], poApprovals:object[], jeReviews:object[], bankReconciliations:object[]}} dataset
 * @param {object} config see each test function above for the keys it reads from this object.
 */
export function runControlsTesting(dataset, config) {
  return [
    ...testConductAttestations(dataset.attestations, config),
    ...testVendorOnboardingApprovals(dataset.vendorOnboardings, config),
    ...testPurchaseOrderApprovals(dataset.poApprovals, config),
    ...testPurchaseOrderSegregationOfDuties(dataset.poApprovals),
    ...testJournalEntryReviews(dataset.jeReviews, config),
    ...testBankReconciliations(dataset.bankReconciliations, config),
  ];
}
