import { test } from "node:test";
import assert from "node:assert/strict";
import { computeVatMinor } from "../src/engines/vat.js";

test("computeVatMinor: 5% of AED 1,000.00 is AED 50.00 (hand-computed)", () => {
  assert.equal(computeVatMinor(100000), 5000);
});

test("computeVatMinor: rounds to the nearest minor unit", () => {
  // 10001 * 500 / 10000 = 500.05 -> rounds down to 500.
  assert.equal(computeVatMinor(10001), 500);
  // 10 * 500 / 10000 = 0.5 -> rounds up (Math.round rounds half towards +Infinity) to 1.
  assert.equal(computeVatMinor(10), 1);
});

test("computeVatMinor: supports a custom rate in basis points", () => {
  assert.equal(computeVatMinor(100000, { rateBps: 0 }), 0);
  assert.equal(computeVatMinor(100000, { rateBps: 1000 }), 10000); // 10%
});

test("computeVatMinor: rejects negative or non-integer amounts", () => {
  assert.throws(() => computeVatMinor(-1), TypeError);
  assert.throws(() => computeVatMinor(1.5), TypeError);
});
