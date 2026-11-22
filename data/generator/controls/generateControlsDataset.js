import { createRng } from "../rng.js";
import { COMPANY, APPROVAL_THRESHOLD_MINOR } from "../company.js";
import { generateNormalControlPopulation, AUTHORIZED_APPROVER_ROLES, MATERIALITY_MINOR } from "./generateNormalControlPopulation.js";
import { injectControlDeviations } from "./injectControlDeviations.js";

/**
 * @param {{seed?: number}} [opts]
 * @returns {{attestations:object[], vendorOnboardings:object[], poApprovals:object[], jeReviews:object[], bankReconciliations:object[], answerKey:object[], config:object}}
 */
export function generateControlsDataset({ seed = 23 } = {}) {
  const rng = createRng(seed);
  const normal = generateNormalControlPopulation(rng);
  const { attestations, vendorOnboardings, poApprovals, jeReviews, bankReconciliations, answerKey } = injectControlDeviations(normal, rng);

  const config = {
    fiscalYear: COMPANY.fiscalYear,
    thresholdMinor: APPROVAL_THRESHOLD_MINOR,
    authorizedApproverRoles: AUTHORIZED_APPROVER_ROLES,
    materialityMinor: MATERIALITY_MINOR,
    graceDays: 15,
    asOfDate: `${COMPANY.fiscalYear}-12-31`,
  };

  return { attestations, vendorOnboardings, poApprovals, jeReviews, bankReconciliations, answerKey, config };
}
