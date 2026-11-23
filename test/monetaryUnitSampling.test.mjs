import { test } from "node:test";
import assert from "node:assert/strict";
import { RELIABILITY_FACTORS_ZERO_ERRORS, computeSampleSize, selectMusSample } from "../src/engines/monetaryUnitSampling.js";

test("computeSampleSize: hand-computed at 95% and 90% confidence", () => {
  // AED 100,000 population / AED 20,000 tolerable misstatement * 3.0 (95%) = 15.
  assert.equal(computeSampleSize({ populationValueMinor: 10000000, tolerableMisstatementMinor: 2000000, confidenceLevel: 95 }), 15);
  // Same population/misstatement at 90% (factor 2.3): ceil(10,000,000*2.3/2,000,000) = ceil(11.5) = 12.
  assert.equal(computeSampleSize({ populationValueMinor: 10000000, tolerableMisstatementMinor: 2000000, confidenceLevel: 90 }), 12);
});

test("computeSampleSize: rejects an unknown confidence level or non-positive tolerable misstatement", () => {
  assert.throws(() => computeSampleSize({ populationValueMinor: 100, tolerableMisstatementMinor: 10, confidenceLevel: 50 }), RangeError);
  assert.throws(() => computeSampleSize({ populationValueMinor: 100, tolerableMisstatementMinor: 0 }), RangeError);
});

test("RELIABILITY_FACTORS_ZERO_ERRORS: matches the published AICPA table", () => {
  assert.deepEqual(RELIABILITY_FACTORS_ZERO_ERRORS, { 70: 1.2, 80: 1.6, 90: 2.3, 95: 3.0, 99: 4.6 });
});

test("selectMusSample: systematic selection, hand-walked cumulative ranges", () => {
  // Items A..F, cumulative ranges: A[0,1M) B[1M,3M) C[3M,3.5M) D[3.5M,5M) E[5M,8M) F[8M,10M).
  // Population 10M, sampleSize 5 -> interval 2M, selection points: 1M, 3M, 5M, 7M, 9M.
  // 1M -> B (A's range excludes its own 1M upper bound); 3M -> C; 5M -> E; 7M -> E again
  // (E spans 5M-8M, wider than the 2M interval, so it covers two selection points); 9M -> F.
  const items = [
    { id: "A", valueMinor: 1000000 },
    { id: "B", valueMinor: 2000000 },
    { id: "C", valueMinor: 500000 },
    { id: "D", valueMinor: 1500000 },
    { id: "E", valueMinor: 3000000 },
    { id: "F", valueMinor: 2000000 },
  ];
  const selected = selectMusSample(items, { sampleSize: 5, populationValueMinor: 10000000 });
  assert.deepEqual(selected, [
    { id: "B", valueMinor: 2000000, hitCount: 1 },
    { id: "C", valueMinor: 500000, hitCount: 1 },
    { id: "E", valueMinor: 3000000, hitCount: 2 },
    { id: "F", valueMinor: 2000000, hitCount: 1 },
  ]);
});

test("selectMusSample: rejects a non-positive sample size", () => {
  assert.throws(() => selectMusSample([{ id: "A", valueMinor: 100 }], { sampleSize: 0, populationValueMinor: 100 }), RangeError);
});
