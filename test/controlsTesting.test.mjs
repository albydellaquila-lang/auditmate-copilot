import { test } from "node:test";
import assert from "node:assert/strict";
import {
  testConductAttestations,
  testVendorOnboardingApprovals,
  testPurchaseOrderApprovals,
  testPurchaseOrderSegregationOfDuties,
  testJournalEntryReviews,
  testBankReconciliations,
  runControlsTesting,
} from "../src/engines/controlsTesting.js";

test("testConductAttestations: flags a missing or out-of-year signed date, passes a valid one", () => {
  const attestations = [
    { attestationId: "ATT-1", personId: "P-01", signedDate: "2026-05-10" }, // pass
    { attestationId: "ATT-2", personId: "P-02", signedDate: null }, // missing
    { attestationId: "ATT-3", personId: "P-03", signedDate: "2025-12-31" }, // outside fiscal year
  ];
  const flagged = testConductAttestations(attestations, { fiscalYear: 2026 });
  assert.deepEqual(flagged.map((f) => f.sampleId), ["ATT-2", "ATT-3"]);
  assert.deepEqual(flagged[0], {
    testId: "CTRL_ATTESTATION_MISSING:ATT-2",
    controlId: "CTRL-ENV-01",
    reasonCode: "CTRL_ATTESTATION_MISSING",
    sampleId: "ATT-2",
    detail: { personId: "P-02", fiscalYear: 2026, signedDate: null },
  });
});

test("testVendorOnboardingApprovals: flags unapproved and late-approved onboardings", () => {
  const onboardings = [
    { onboardingId: "ONB-1", vendorId: "V-1", approverId: "P-05", approverRole: "Controller", approvalDate: "2026-01-05", firstTransactionDate: "2026-01-10" }, // pass
    { onboardingId: "ONB-2", vendorId: "V-2", approverId: null, approverRole: null, approvalDate: null, firstTransactionDate: "2026-02-01" }, // unapproved
    { onboardingId: "ONB-3", vendorId: "V-3", approverId: "P-01", approverRole: "AP Clerk", approvalDate: "2026-02-05", firstTransactionDate: "2026-02-10" }, // unauthorized role
    { onboardingId: "ONB-4", vendorId: "V-4", approverId: "P-06", approverRole: "CFO", approvalDate: "2026-03-10", firstTransactionDate: "2026-03-01" }, // late
  ];
  const opts = { authorizedApproverRoles: ["Controller", "CFO"] };
  const flagged = testVendorOnboardingApprovals(onboardings, opts);
  assert.deepEqual(
    flagged.map((f) => [f.sampleId, f.reasonCode]),
    [
      ["ONB-2", "CTRL_VENDOR_ONBOARDING_UNAPPROVED"],
      ["ONB-3", "CTRL_VENDOR_ONBOARDING_UNAPPROVED"],
      ["ONB-4", "CTRL_VENDOR_ONBOARDING_LATE_APPROVAL"],
    ]
  );
});

test("testPurchaseOrderApprovals: flags only an above-threshold PO with no approver", () => {
  const poApprovals = [
    { sampleId: "POAP-1", poId: "PO-1", totalMinor: 500000, approverId: null }, // below threshold, fine
    { sampleId: "POAP-2", poId: "PO-2", totalMinor: 1500000, approverId: "P-05" }, // above, approved
    { sampleId: "POAP-3", poId: "PO-3", totalMinor: 1500000, approverId: null }, // above, missing
  ];
  const flagged = testPurchaseOrderApprovals(poApprovals, { thresholdMinor: 1000000 });
  assert.deepEqual(flagged, [
    {
      testId: "CTRL_PO_APPROVAL_MISSING:POAP-3",
      controlId: "CTRL-ACT-01",
      reasonCode: "CTRL_PO_APPROVAL_MISSING",
      sampleId: "POAP-3",
      detail: { poId: "PO-3", totalMinor: 1500000, thresholdMinor: 1000000 },
    },
  ]);
});

test("testPurchaseOrderSegregationOfDuties: flags only a PO approved by its own preparer", () => {
  const poApprovals = [
    { sampleId: "POAP-1", poId: "PO-1", preparerId: "P-01", approverId: "P-05" }, // different people, fine
    { sampleId: "POAP-2", poId: "PO-2", preparerId: "P-01", approverId: null }, // no approver yet, not a SoD case
    { sampleId: "POAP-3", poId: "PO-3", preparerId: "P-05", approverId: "P-05" }, // same person
  ];
  const flagged = testPurchaseOrderSegregationOfDuties(poApprovals);
  assert.deepEqual(flagged, [
    {
      testId: "CTRL_PO_SOD_VIOLATION:POAP-3",
      controlId: "CTRL-ACT-02",
      reasonCode: "CTRL_PO_SOD_VIOLATION",
      sampleId: "POAP-3",
      detail: { poId: "PO-3", preparerId: "P-05", approverId: "P-05" },
    },
  ]);
});

test("testJournalEntryReviews: flags missing and self-reviewed entries above materiality only", () => {
  const jeReviews = [
    { sampleId: "JEREV-1", jeId: "JE-1", preparerId: "P-03", amountMinor: 50000, reviewerId: null }, // below materiality, fine
    { sampleId: "JEREV-2", jeId: "JE-2", preparerId: "P-03", amountMinor: 200000, reviewerId: "P-05" }, // above, reviewed by someone else
    { sampleId: "JEREV-3", jeId: "JE-3", preparerId: "P-03", amountMinor: 200000, reviewerId: null }, // above, missing
    { sampleId: "JEREV-4", jeId: "JE-4", preparerId: "P-05", amountMinor: 200000, reviewerId: "P-05" }, // above, self-reviewed
  ];
  const flagged = testJournalEntryReviews(jeReviews, { materialityMinor: 100000 });
  assert.deepEqual(
    flagged.map((f) => [f.sampleId, f.reasonCode]),
    [
      ["JEREV-3", "CTRL_JE_REVIEW_MISSING"],
      ["JEREV-4", "CTRL_JE_REVIEW_SOD_VIOLATION"],
    ]
  );
});

test("testBankReconciliations: flags missing, late, and self-reviewed reconciliations", () => {
  const bankReconciliations = [
    { reconciliationId: "BANKREC-1", period: "2026-01", preparerId: "P-03", completedDate: "2026-02-05", reviewerId: "P-05" }, // 5 days after Jan31, fine
    { reconciliationId: "BANKREC-2", period: "2026-02", preparerId: "P-03", completedDate: null, reviewerId: null }, // missing
    // Jan 31 -> Feb 20 is 20 days (hand count: Jan31->Feb1=1 ... ->Feb20=20), beyond 15-day grace.
    { reconciliationId: "BANKREC-3", period: "2026-01", preparerId: "P-03", completedDate: "2026-02-20", reviewerId: "P-05" }, // late
    { reconciliationId: "BANKREC-4", period: "2026-03", preparerId: "P-05", completedDate: "2026-04-05", reviewerId: "P-05" }, // on time, self-reviewed
  ];
  const flagged = testBankReconciliations(bankReconciliations, { graceDays: 15 });
  assert.deepEqual(
    flagged.map((f) => [f.sampleId, f.reasonCode]),
    [
      ["BANKREC-2", "CTRL_BANKREC_MISSING"],
      ["BANKREC-3", "CTRL_BANKREC_LATE"],
      ["BANKREC-4", "CTRL_BANKREC_SOD_VIOLATION"],
    ]
  );
  assert.equal(flagged[1].detail.daysAfterPeriodEnd, 20);
});

test("runControlsTesting: combines every test into one flat list", () => {
  const dataset = {
    attestations: [{ attestationId: "ATT-1", personId: "P-01", signedDate: null }],
    vendorOnboardings: [],
    poApprovals: [{ sampleId: "POAP-1", poId: "PO-1", preparerId: "P-05", totalMinor: 1500000, approverId: "P-05" }],
    jeReviews: [],
    bankReconciliations: [],
  };
  const config = { fiscalYear: 2026, thresholdMinor: 1000000, authorizedApproverRoles: ["Controller", "CFO"], materialityMinor: 100000, graceDays: 15 };
  const reasonCodes = runControlsTesting(dataset, config).map((f) => f.reasonCode).sort();
  // attestation missing; PO above threshold with an approver -> not CTRL_PO_APPROVAL_MISSING;
  // but approver === preparer -> CTRL_PO_SOD_VIOLATION.
  assert.deepEqual(reasonCodes, ["CTRL_ATTESTATION_MISSING", "CTRL_PO_SOD_VIOLATION"]);
});
