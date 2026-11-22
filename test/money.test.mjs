import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, sumMinor, withinTolerance, formatMinor } from "../src/engines/money.js";

test("parseAmount: plain, thousands, currency codes, both decimal conventions", () => {
  assert.equal(parseAmount("1234.56"), 123456);
  assert.equal(parseAmount("1,234.56"), 123456);
  assert.equal(parseAmount("AED 1,234.56"), 123456);
  assert.equal(parseAmount("1.234,56", { decimal: "," }), 123456);
  assert.equal(parseAmount("1 234,5", { decimal: "," }), 123450);
  assert.equal(parseAmount("12"), 1200);
});

test("parseAmount: negatives in accounting, trailing-minus and signed formats", () => {
  assert.equal(parseAmount("(1,234.56)"), -123456);
  assert.equal(parseAmount("1234.56-"), -123456);
  assert.equal(parseAmount("-0.01"), -1);
  assert.equal(parseAmount("-0.00"), 0);
});

test("parseAmount: numbers avoid float drift and round half away from zero", () => {
  assert.equal(parseAmount(0.1 + 0.2), 30);      // 0.30000000000000004 -> 30
  assert.equal(parseAmount(1.005), 101);          // classic float trap
  assert.equal(parseAmount("2.675"), 268);
  assert.equal(parseAmount("-2.675"), -268);
  assert.equal(parseAmount("2.674"), 267);
});

test("parseAmount: rejects garbage instead of guessing", () => {
  for (const bad of ["", "abc", "1.2.3", "12a", "--5"]) {
    assert.throws(() => parseAmount(bad), undefined, `should reject "${bad}"`);
  }
  assert.throws(() => parseAmount(NaN), RangeError);
  assert.throws(() => parseAmount(null), TypeError);
});

test("sumMinor: exact integer sums; refuses floats", () => {
  assert.equal(sumMinor([10, 20, -30]), 0);
  assert.equal(sumMinor([]), 0);
  assert.throws(() => sumMinor([1, 0.5]), TypeError);
});

test("withinTolerance: absolute and basis-point tolerances", () => {
  assert.equal(withinTolerance(100_00, 100_00), true);
  assert.equal(withinTolerance(100_50, 100_00, { absMinor: 50 }), true);
  assert.equal(withinTolerance(100_51, 100_00, { absMinor: 50 }), false);
  assert.equal(withinTolerance(101_00, 100_00, { bps: 100 }), true);   // 1% of 100.00
  assert.equal(withinTolerance(101_01, 100_00, { bps: 100 }), false);
});

test("formatMinor: display formatting", () => {
  assert.match(formatMinor(123456), /1,234\.56/);
  assert.match(formatMinor(-5, { currency: "EUR", locale: "it-IT" }), /-?0,05/);
});
