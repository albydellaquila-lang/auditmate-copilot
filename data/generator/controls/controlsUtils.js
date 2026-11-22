// Shared test-of-controls sample builders, used by both the normal-population generator and
// the deviation injector, so each sample shape has exactly one definition across both — same
// role as jeUtils.js (Sprint 1) and p2p/p2pUtils.js (Sprint 2) for their respective datasets.
// Every evidence field that a deviation can be missing (signedDate, approverId, approvalDate,
// reviewerId, reviewedAt/reviewedDate, completedDate) defaults to null, so constructing a
// deviation fixture is just omitting that option.

/** @param {string} attestationId @param {{personId:string, fiscalYear:number, signedDate?:string|null}} opts */
export function buildAttestation(attestationId, { personId, fiscalYear, signedDate = null }) {
  return { attestationId, personId, fiscalYear, signedDate };
}

/**
 * @param {string} onboardingId
 * @param {{vendorId:string, requestedDate:string, approverId?:string|null, approverRole?:string|null,
 *   approvalDate?:string|null, firstTransactionDate:string}} opts
 */
export function buildVendorOnboarding(onboardingId, {
  vendorId, requestedDate, approverId = null, approverRole = null, approvalDate = null, firstTransactionDate,
}) {
  return { onboardingId, vendorId, requestedDate, approverId, approverRole, approvalDate, firstTransactionDate };
}

/**
 * @param {string} sampleId
 * @param {{poId:string, vendorId:string, preparerId:string, totalMinor:number, poDate:string,
 *   approverId?:string|null, approvalDate?:string|null}} opts
 */
export function buildPoApproval(sampleId, { poId, vendorId, preparerId, totalMinor, poDate, approverId = null, approvalDate = null }) {
  return { sampleId, poId, vendorId, preparerId, totalMinor, poDate, approverId, approvalDate };
}

/**
 * @param {string} sampleId
 * @param {{jeId:string, preparerId:string, amountMinor:number, createdAt:string,
 *   reviewerId?:string|null, reviewedAt?:string|null}} opts
 */
export function buildJeReview(sampleId, { jeId, preparerId, amountMinor, createdAt, reviewerId = null, reviewedAt = null }) {
  return { sampleId, jeId, preparerId, amountMinor, createdAt, reviewerId, reviewedAt };
}

/**
 * @param {string} reconciliationId
 * @param {{period:string, preparerId:string, completedDate?:string|null,
 *   reviewerId?:string|null, reviewedDate?:string|null}} opts
 */
export function buildBankReconciliation(reconciliationId, { period, preparerId, completedDate = null, reviewerId = null, reviewedDate = null }) {
  return { reconciliationId, period, preparerId, completedDate, reviewerId, reviewedDate };
}
