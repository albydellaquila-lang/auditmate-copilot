import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMateriality } from "../src/engines/materiality.js";

test("computeMateriality: revenue benchmark at 1%, hand-computed", () => {
  // AED 1,000,000.00 revenue -> 1% = AED 10,000.00 materiality
  // -> 75% performance materiality = AED 7,500.00 -> 5% clearly trivial = AED 500.00
  const result = computeMateriality({ benchmarkType: "revenue", benchmarkValueMinor: 100000000 });
  assert.deepEqual(result, {
    materialityMinor: 1000000,
    performanceMaterialityMinor: 750000,
    clearlyTrivialMinor: 50000,
    benchmarkType: "revenue",
    benchmarkBps: 100,
  });
});

test("computeMateriality: totalAssets benchmark at 1.5%, hand-computed", () => {
  // AED 2,000,000.00 total assets -> 1.5% = AED 30,000.00
  const result = computeMateriality({ benchmarkType: "totalAssets", benchmarkValueMinor: 200000000 });
  assert.equal(result.materialityMinor, 3000000);
});

test("computeMateriality: netIncomeBeforeTax benchmark at 5%, hand-computed", () => {
  // AED 400,000.00 net income -> 5% = AED 20,000.00
  const result = computeMateriality({ benchmarkType: "netIncomeBeforeTax", benchmarkValueMinor: 40000000 });
  assert.equal(result.materialityMinor, 2000000);
});

test("computeMateriality: custom performance-materiality and clearly-trivial ratios", () => {
  const result = computeMateriality({
    benchmarkType: "revenue",
    benchmarkValueMinor: 100000000,
    performanceMaterialityBps: 5000, // 50%
    clearlyTrivialBps: 1000, // 10%
  });
  assert.equal(result.performanceMaterialityMinor, 500000); // 50% of 1,000,000
  assert.equal(result.clearlyTrivialMinor, 100000); // 10% of 1,000,000
});

test("computeMateriality: rejects an unknown benchmark type or a bad amount", () => {
  assert.throws(() => computeMateriality({ benchmarkType: "profit", benchmarkValueMinor: 100 }), RangeError);
  assert.throws(() => computeMateriality({ benchmarkType: "revenue", benchmarkValueMinor: -1 }), TypeError);
});
