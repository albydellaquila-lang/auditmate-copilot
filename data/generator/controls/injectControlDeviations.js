// Deliberately planted control deviations, one per reason code in controlMatrix.js's
// CONTROL_MATRIX (10 total). IDs are reserved static strings (not seed-derived) so the answer
// key below is a literal, reviewable table, and `npm test` can assert the engine in
// src/engines/controlsTesting.js actually finds every planted deviation.
import { APPROVAL_THRESHOLD_MINOR } from "../company.js";
import { MATERIALITY_MINOR } from "./generateNormalControlPopulation.js";
import { buildAttestation, buildVendorOnboarding, buildPoApproval, buildJeReview, buildBankReconciliation } from "./controlsUtils.js";

/**
 * @param {{attestations:object[], vendorOnboardings:object[], poApprovals:object[], jeReviews:object[], bankReconciliations:object[]}} normal
 * @param {import("../rng.js").createRng extends (...a:any)=>infer R ? R : never} _rng unused by
 *   this fixed fixture set, accepted for a consistent generator-stage signature (see Sprint 1's
 *   injectAnomalies.js and Sprint 2's injectP2PAnomalies.js for the same documented rationale).
 */
export function injectControlDeviations(normal, _rng) {
  const attestation = buildAttestation("ATT-DEV-01", { personId: "P-04", fiscalYear: 2026, signedDate: null });

  const onboardingUnapproved = buildVendorOnboarding("ONB-DEV-01", {
    vendorId: "V-07", requestedDate: "2026-03-05", firstTransactionDate: "2026-03-12",
  });
  const onboardingLate = buildVendorOnboarding("ONB-DEV-02", {
    vendorId: "V-08", requestedDate: "2026-04-01", approverId: "P-05", approverRole: "Controller",
    approvalDate: "2026-04-10", firstTransactionDate: "2026-04-05",
  });

  const poApprovalMissing = buildPoApproval("POAP-DEV-01", {
    poId: "PO-CTRL-DEV-01", vendorId: "V-01", preparerId: "P-01",
    totalMinor: APPROVAL_THRESHOLD_MINOR + 100000, poDate: "2026-05-05",
  });
  const poSodViolation = buildPoApproval("POAP-DEV-02", {
    poId: "PO-CTRL-DEV-02", vendorId: "V-02", preparerId: "P-05",
    totalMinor: APPROVAL_THRESHOLD_MINOR + 50000, poDate: "2026-05-10",
    approverId: "P-05", approvalDate: "2026-05-12",
  });

  const jeReviewMissing = buildJeReview("JEREV-DEV-01", {
    jeId: "JE-CTRL-DEV-01", preparerId: "P-03", amountMinor: MATERIALITY_MINOR + 50000, createdAt: "2026-06-05T10:00:00Z",
  });
  const jeReviewSodViolation = buildJeReview("JEREV-DEV-02", {
    jeId: "JE-CTRL-DEV-02", preparerId: "P-05", amountMinor: MATERIALITY_MINOR + 30000, createdAt: "2026-06-10T10:00:00Z",
    reviewerId: "P-05", reviewedAt: "2026-06-11T10:00:00Z",
  });

  const bankrecMissing = buildBankReconciliation("BANKREC-DEV-01", { period: "2026-08", preparerId: "P-03" });
  const bankrecLate = buildBankReconciliation("BANKREC-DEV-02", {
    period: "2026-09", preparerId: "P-03", completedDate: "2026-10-20", reviewerId: "P-05", reviewedDate: "2026-10-22",
  });
  const bankrecSodViolation = buildBankReconciliation("BANKREC-DEV-03", {
    period: "2026-10", preparerId: "P-05", completedDate: "2026-11-05", reviewerId: "P-05", reviewedDate: "2026-11-06",
  });

  const answerKey = [
    { checkCode: "CTRL_ATTESTATION_MISSING", controlId: "CTRL-ENV-01", sampleIds: ["ATT-DEV-01"], reason: "Conduct attestation has no signed date on file." },
    { checkCode: "CTRL_VENDOR_ONBOARDING_UNAPPROVED", controlId: "CTRL-RISK-01", sampleIds: ["ONB-DEV-01"], reason: "Vendor onboarding has no approval on file." },
    { checkCode: "CTRL_VENDOR_ONBOARDING_LATE_APPROVAL", controlId: "CTRL-RISK-01", sampleIds: ["ONB-DEV-02"], reason: "Vendor onboarding was approved after the vendor's first transaction." },
    { checkCode: "CTRL_PO_APPROVAL_MISSING", controlId: "CTRL-ACT-01", sampleIds: ["POAP-DEV-01"], reason: "PO above the approval threshold has no approver on file." },
    { checkCode: "CTRL_PO_SOD_VIOLATION", controlId: "CTRL-ACT-02", sampleIds: ["POAP-DEV-02"], reason: "PO preparer and approver are the same person." },
    { checkCode: "CTRL_JE_REVIEW_MISSING", controlId: "CTRL-INFO-01", sampleIds: ["JEREV-DEV-01"], reason: "Journal entry above materiality has no reviewer on file." },
    { checkCode: "CTRL_JE_REVIEW_SOD_VIOLATION", controlId: "CTRL-INFO-01", sampleIds: ["JEREV-DEV-02"], reason: "Journal entry preparer and reviewer are the same person." },
    { checkCode: "CTRL_BANKREC_MISSING", controlId: "CTRL-MON-01", sampleIds: ["BANKREC-DEV-01"], reason: "Bank reconciliation was never completed." },
    { checkCode: "CTRL_BANKREC_LATE", controlId: "CTRL-MON-01", sampleIds: ["BANKREC-DEV-02"], reason: "Bank reconciliation was completed after the grace period." },
    { checkCode: "CTRL_BANKREC_SOD_VIOLATION", controlId: "CTRL-MON-01", sampleIds: ["BANKREC-DEV-03"], reason: "Bank reconciliation preparer and reviewer are the same person." },
  ];

  return {
    attestations: [...normal.attestations, attestation],
    vendorOnboardings: [...normal.vendorOnboardings, onboardingUnapproved, onboardingLate],
    poApprovals: [...normal.poApprovals, poApprovalMissing, poSodViolation],
    jeReviews: [...normal.jeReviews, jeReviewMissing, jeReviewSodViolation],
    bankReconciliations: [...normal.bankReconciliations, bankrecMissing, bankrecLate, bankrecSodViolation],
    answerKey,
  };
}
