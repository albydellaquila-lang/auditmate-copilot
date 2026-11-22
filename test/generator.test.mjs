import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGlDataset } from "../data/generator/index.js";
import { jeTotals } from "../data/generator/jeUtils.js";
import { findUnbalancedEntries } from "../src/engines/balancing.js";
import { runJetRiskCriteria } from "../src/engines/jetRiskCriteria.js";
import { benfordMeanAbsoluteDeviation } from "../src/engines/benford.js";
import { flagCutoffEntries } from "../src/engines/cutoff.js";
import { findNewVendors } from "../src/engines/newVendor.js";
import { vendorConcentration } from "../src/engines/concentration.js";

test("generateGlDataset: is deterministic for a given seed", () => {
  const a = generateGlDataset({ seed: 42 });
  const b = generateGlDataset({ seed: 42 });
  assert.deepEqual(a, b);

  const c = generateGlDataset({ seed: 43 });
  assert.notDeepEqual(a.lines, c.lines);
});

test("generateGlDataset: the normal population balances (planted BALANCING entries excluded)", () => {
  const { headers, lines, answerKey } = generateGlDataset({ seed: 42 });
  const balancingAnomalyIds = new Set(answerKey.find((a) => a.checkCode === "BALANCING").jeIds);
  const normalLines = lines.filter((l) => !balancingAnomalyIds.has(l.jeId));
  const unbalanced = [...jeTotals(normalLines)].filter(([, t]) => t.debitMinor !== t.creditMinor);
  assert.deepEqual(unbalanced, []);
  assert.ok(headers.length > balancingAnomalyIds.size);
});

test("generateGlDataset: every planted anomaly is found by its matching engine", () => {
  const dataset = generateGlDataset({ seed: 42 });
  const { headers, lines, answerKey, config } = dataset;

  for (const entry of answerKey) {
    if (entry.checkCode === "CONCENTRATION") continue; // asserted separately below
    let flaggedIds;
    switch (entry.checkCode) {
      case "BALANCING":
        flaggedIds = findUnbalancedEntries(lines).map((f) => f.jeId);
        break;
      case "JET_UNUSUAL_PREPARER":
      case "JET_UNUSUAL_PAIRING":
      case "JET_ROUND_AMOUNT":
      case "JET_JUST_UNDER_THRESHOLD":
      case "JET_WEEKEND_AFTER_HOURS":
        flaggedIds = runJetRiskCriteria({ headers, lines }, config)
          .filter((f) => f.reasonCode === entry.checkCode)
          .map((f) => f.jeId);
        break;
      case "CUTOFF":
        flaggedIds = flagCutoffEntries(headers, lines, config).map((f) => f.jeId);
        break;
      case "NEW_VENDOR":
        flaggedIds = findNewVendors(lines, headers, config).map((f) => f.jeId);
        break;
      case "BENFORD":
        flaggedIds = null; // Benford flags a distribution, not individual JEs; checked below
        break;
      default:
        throw new Error(`generator.test.mjs: no engine wired for check code ${entry.checkCode}`);
    }
    if (flaggedIds) {
      for (const jeId of entry.jeIds) {
        assert.ok(flaggedIds.includes(jeId), `${entry.checkCode}: expected engine to flag ${jeId}`);
      }
    }
  }
});

test("generateGlDataset: the planted Benford anomaly skews the first-digit distribution", () => {
  const { lines, answerKey } = generateGlDataset({ seed: 42 });
  const benfordIds = new Set(answerKey.find((a) => a.checkCode === "BENFORD").jeIds);
  const anomalyAmounts = lines.filter((l) => benfordIds.has(l.jeId) && l.debitMinor > 0).map((l) => l.debitMinor);
  assert.equal(anomalyAmounts.length, 25);
  assert.ok(anomalyAmounts.every((a) => Math.floor(a / 100000) === 0 && String(a).startsWith("9")));

  const allAmounts = lines.filter((l) => l.debitMinor > 0).map((l) => l.debitMinor);
  const withoutAnomaly = lines.filter((l) => l.debitMinor > 0 && !benfordIds.has(l.jeId)).map((l) => l.debitMinor);
  const withAnomalyMad = benfordMeanAbsoluteDeviation(allAmounts).mad;
  const withoutAnomalyMad = benfordMeanAbsoluteDeviation(withoutAnomaly).mad;
  assert.ok(withAnomalyMad > withoutAnomalyMad, "planted leading-digit-9 cluster should worsen Benford conformity");
});

test("generateGlDataset: the planted vendor dominates AP spend concentration", () => {
  const { lines, answerKey } = generateGlDataset({ seed: 42 });
  const concEntry = answerKey.find((a) => a.checkCode === "CONCENTRATION");
  const { ranked, hhi } = vendorConcentration(lines);
  assert.equal(ranked[0].vendorId, concEntry.vendorId);
  assert.ok(hhi > 1000, `expected a concentrated HHI, got ${hhi}`);
});
