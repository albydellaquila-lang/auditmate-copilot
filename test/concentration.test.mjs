import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHHI, vendorConcentration } from "../src/engines/concentration.js";

// Hand-computed: shares 50%/30%/20% -> HHI = 50^2 + 30^2 + 20^2 = 2500 + 900 + 400 = 3800.
test("computeHHI: classic 50/30/20 example", () => {
  assert.equal(computeHHI([5000, 3000, 2000]), 3800);
});

test("computeHHI: a single entity at 100% share gives the maximum HHI of 10000", () => {
  assert.equal(computeHHI([10000]), 10000);
});

test("computeHHI: many equal-sized entities gives a low HHI", () => {
  // 10 entities at 10% each: HHI = 10 * 10^2 = 1000.
  assert.equal(computeHHI(Array(10).fill(1000)), 1000);
});

test("vendorConcentration: ranks vendors by spend and computes shares/HHI by hand", () => {
  const lines = [
    { vendorId: "V-1", debitMinor: 500000 },
    { vendorId: "V-2", debitMinor: 300000 },
    { vendorId: "V-3", debitMinor: 200000 },
    { vendorId: "V-3", debitMinor: 0, creditMinor: 200000 }, // credit side, not spend
    { vendorId: null, debitMinor: 999999 }, // no vendor, excluded
  ];
  const { hhi, totalMinor, ranked } = vendorConcentration(lines);
  assert.equal(totalMinor, 1000000);
  assert.deepEqual(ranked, [
    { vendorId: "V-1", spendMinor: 500000, shareBps: 5000 },
    { vendorId: "V-2", spendMinor: 300000, shareBps: 3000 },
    { vendorId: "V-3", spendMinor: 200000, shareBps: 2000 },
  ]);
  assert.equal(hhi, 3800);
});

test("vendorConcentration: no vendor spend yields zero HHI and an empty ranking", () => {
  assert.deepEqual(vendorConcentration([{ vendorId: null, debitMinor: 100 }]), {
    hhi: 0,
    totalMinor: 0,
    ranked: [],
  });
});
