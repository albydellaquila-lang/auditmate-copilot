// "Normal" test-of-controls population: every sample passes its control, so it is a clean
// baseline with zero engine findings — the controls-testing analogue of Sprint 1/2's "normal
// population balances/matches" invariant.
import { COMPANY, VENDORS, PREPARERS, APPROVAL_THRESHOLD_MINOR } from "../company.js";
import { addDays, monthEnd } from "../jeUtils.js";
import { buildAttestation, buildVendorOnboarding, buildPoApproval, buildJeReview, buildBankReconciliation } from "./controlsUtils.js";

export const AUTHORIZED_APPROVER_ROLES = ["Controller", "CFO"];
export const MATERIALITY_MINOR = 100000; // AED 1,000.00 — independent configurable assumption for this module

/**
 * @param {import("../rng.js").createRng extends (...a:any)=>infer R ? R : never} rng
 */
export function generateNormalControlPopulation(rng) {
  const fiscalYear = COMPANY.fiscalYear;
  const authorizedApprovers = PREPARERS.filter((p) => AUTHORIZED_APPROVER_ROLES.includes(p.role));
  const nonApprovers = PREPARERS.filter((p) => !AUTHORIZED_APPROVER_ROLES.includes(p.role));

  // Attestations: one per preparer, signed sometime within the fiscal year.
  const attestations = PREPARERS.map((p, i) =>
    buildAttestation(`ATT-${String(i + 1).padStart(2, "0")}`, {
      personId: p.id,
      fiscalYear,
      signedDate: `${fiscalYear}-${String(rng.int(1, 12)).padStart(2, "0")}-${String(rng.int(1, 28)).padStart(2, "0")}`,
    })
  );

  // Vendor onboardings: approved by an authorized role, before the vendor's first transaction.
  const vendorOnboardings = Array.from({ length: 15 }, (_, i) => {
    const vendorId = rng.pick(VENDORS).id;
    const month = rng.int(1, 10);
    const day = rng.int(1, 20);
    const requestedDate = `${fiscalYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const approvalDate = addDays(requestedDate, rng.int(1, 5));
    const firstTransactionDate = addDays(approvalDate, rng.int(1, 10));
    const approver = rng.pick(authorizedApprovers);
    return buildVendorOnboarding(`ONB-${String(i + 1).padStart(2, "0")}`, {
      vendorId, requestedDate, approverId: approver.id, approverRole: approver.role, approvalDate, firstTransactionDate,
    });
  });

  // PO approvals: an authorized approver, different from the preparer, whenever the total is
  // at/above the approval threshold; below threshold, no approval is required.
  const poApprovals = Array.from({ length: 16 }, (_, i) => {
    const preparer = rng.pick(nonApprovers);
    const month = rng.int(1, 11);
    const day = rng.int(1, 25);
    const poDate = `${fiscalYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const aboveThreshold = rng.bool(0.5);
    const totalMinor = aboveThreshold
      ? APPROVAL_THRESHOLD_MINOR + rng.int(1, 500000)
      : rng.int(1000, APPROVAL_THRESHOLD_MINOR - 1);
    const approver = aboveThreshold ? rng.pick(authorizedApprovers) : null;
    return buildPoApproval(`POAP-${String(i + 1).padStart(2, "0")}`, {
      poId: `PO-CTRL-${String(i + 1).padStart(4, "0")}`,
      vendorId: rng.pick(VENDORS).id,
      preparerId: preparer.id,
      totalMinor,
      poDate,
      approverId: approver?.id ?? null,
      approvalDate: approver ? addDays(poDate, rng.int(1, 3)) : null,
    });
  });

  // JE reviews: an authorized reviewer, different from the preparer, whenever the amount is
  // at/above materiality; below materiality, no review is required.
  const jeReviews = Array.from({ length: 16 }, (_, i) => {
    const preparer = rng.pick(nonApprovers);
    const month = rng.int(1, 11);
    const day = rng.int(1, 25);
    const createdAt = `${fiscalYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T10:00:00Z`;
    const aboveMateriality = rng.bool(0.5);
    const amountMinor = aboveMateriality
      ? MATERIALITY_MINOR + rng.int(1, 500000)
      : rng.int(100, MATERIALITY_MINOR - 1);
    const reviewer = aboveMateriality ? rng.pick(authorizedApprovers) : null;
    return buildJeReview(`JEREV-${String(i + 1).padStart(2, "0")}`, {
      jeId: `JE-CTRL-${String(i + 1).padStart(4, "0")}`,
      preparerId: preparer.id,
      amountMinor,
      createdAt,
      reviewerId: reviewer?.id ?? null,
      reviewedAt: reviewer ? addDays(createdAt.slice(0, 10), rng.int(1, 3)) + "T10:00:00Z" : null,
    });
  });

  // Monthly bank reconciliations: completed within the grace period, reviewed by someone other
  // than the preparer.
  const bankReconciliations = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const period = `${fiscalYear}-${String(month).padStart(2, "0")}`;
    const preparer = rng.pick(nonApprovers);
    const reviewer = rng.pick(authorizedApprovers);
    const completedDate = addDays(monthEnd(fiscalYear, month), rng.int(1, 10));
    return buildBankReconciliation(`BANKREC-${String(month).padStart(2, "0")}`, {
      period, preparerId: preparer.id, completedDate, reviewerId: reviewer.id, reviewedDate: addDays(completedDate, rng.int(1, 3)),
    });
  });

  return { attestations, vendorOnboardings, poApprovals, jeReviews, bankReconciliations };
}
