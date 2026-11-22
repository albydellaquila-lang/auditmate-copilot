import { test } from "node:test";
import assert from "node:assert/strict";
import { generateControlsDataset } from "../data/generator/controls/index.js";
import {
  testConductAttestations,
  testVendorOnboardingApprovals,
  testPurchaseOrderApprovals,
  testPurchaseOrderSegregationOfDuties,
  testJournalEntryReviews,
  testBankReconciliations,
  runControlsTesting,
} from "../src/engines/controlsTesting.js";

test("generateControlsDataset: is deterministic for a given seed", () => {
  const a = generateControlsDataset({ seed: 23 });
  const b = generateControlsDataset({ seed: 23 });
  assert.deepEqual(a, b);

  const c = generateControlsDataset({ seed: 24 });
  assert.notDeepEqual(a.poApprovals, c.poApprovals);
});

test("generateControlsDataset: the normal population (minus planted deviations) has zero findings", () => {
  const { attestations, vendorOnboardings, poApprovals, jeReviews, bankReconciliations, config } = generateControlsDataset({ seed: 23 });
  const isDeviation = (id) => id.includes("-DEV-");
  const normal = {
    attestations: attestations.filter((a) => !isDeviation(a.attestationId)),
    vendorOnboardings: vendorOnboardings.filter((o) => !isDeviation(o.onboardingId)),
    poApprovals: poApprovals.filter((p) => !isDeviation(p.sampleId)),
    jeReviews: jeReviews.filter((j) => !isDeviation(j.sampleId)),
    bankReconciliations: bankReconciliations.filter((b) => !isDeviation(b.reconciliationId)),
  };
  assert.deepEqual(runControlsTesting(normal, config), []);
});

test("generateControlsDataset: every planted deviation is found by its matching control test", () => {
  const { attestations, vendorOnboardings, poApprovals, jeReviews, bankReconciliations, answerKey, config } = generateControlsDataset({ seed: 23 });

  for (const entry of answerKey) {
    let flagged;
    switch (entry.checkCode) {
      case "CTRL_ATTESTATION_MISSING":
        flagged = testConductAttestations(attestations, config);
        break;
      case "CTRL_VENDOR_ONBOARDING_UNAPPROVED":
      case "CTRL_VENDOR_ONBOARDING_LATE_APPROVAL":
        flagged = testVendorOnboardingApprovals(vendorOnboardings, config);
        break;
      case "CTRL_PO_APPROVAL_MISSING":
        flagged = testPurchaseOrderApprovals(poApprovals, config);
        break;
      case "CTRL_PO_SOD_VIOLATION":
        flagged = testPurchaseOrderSegregationOfDuties(poApprovals);
        break;
      case "CTRL_JE_REVIEW_MISSING":
      case "CTRL_JE_REVIEW_SOD_VIOLATION":
        flagged = testJournalEntryReviews(jeReviews, config);
        break;
      case "CTRL_BANKREC_MISSING":
      case "CTRL_BANKREC_LATE":
      case "CTRL_BANKREC_SOD_VIOLATION":
        flagged = testBankReconciliations(bankReconciliations, config);
        break;
      default:
        throw new Error(`controlsGenerator.test.mjs: no engine wired for check code ${entry.checkCode}`);
    }
    const flaggedReasonIds = flagged.filter((f) => f.reasonCode === entry.checkCode).map((f) => f.sampleId);
    for (const sampleId of entry.sampleIds) {
      assert.ok(flaggedReasonIds.includes(sampleId), `${entry.checkCode}: expected ${sampleId} to be flagged`);
    }
  }
});
