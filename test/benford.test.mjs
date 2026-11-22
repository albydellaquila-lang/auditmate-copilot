import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstDigit,
  expectedBenfordFrequency,
  benfordDigitDistribution,
  benfordMeanAbsoluteDeviation,
} from "../src/engines/benford.js";

function closeTo(actual, expected, epsilon = 1e-4) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} not within ${epsilon} of ${expected}`);
}

test("firstDigit: reduces to the leading digit regardless of magnitude", () => {
  assert.equal(firstDigit(5), 5);
  assert.equal(firstDigit(100), 1);
  assert.equal(firstDigit(987), 9);
  assert.equal(firstDigit(12345), 1);
  assert.equal(firstDigit(-220), 2); // sign irrelevant to leading digit
});

test("firstDigit: rejects zero and non-integers", () => {
  assert.throws(() => firstDigit(0), RangeError);
  assert.throws(() => firstDigit(12.5), RangeError);
});

// Hand-computed via log10(1 + 1/d).
test("expectedBenfordFrequency: matches the published log10(1+1/d) values", () => {
  closeTo(expectedBenfordFrequency(1), 0.30103);
  closeTo(expectedBenfordFrequency(2), 0.17609);
  closeTo(expectedBenfordFrequency(5), 0.07918);
  closeTo(expectedBenfordFrequency(9), 0.04576);
  assert.throws(() => expectedBenfordFrequency(0), RangeError);
  assert.throws(() => expectedBenfordFrequency(10), RangeError);
});

test("benfordDigitDistribution: counts and frequencies, hand-tallied", () => {
  // digits: 1,1,2,3,9,9,9,9,9,5 -> counts [2,1,1,0,1,0,0,0,5]
  const amounts = [100, 150, 220, 300, 912, 930, 940, 950, 960, 500];
  const { counts, frequencies, n } = benfordDigitDistribution(amounts);
  assert.equal(n, 10);
  assert.deepEqual(counts, [2, 1, 1, 0, 1, 0, 0, 0, 5]);
  assert.deepEqual(frequencies, [0.2, 0.1, 0.1, 0, 0.1, 0, 0, 0, 0.5]);
});

test("benfordMeanAbsoluteDeviation: all-digit-1 population is far from Benford (nonconforming)", () => {
  // Observed = delta function at digit 1; by hand, MAD = 2*(1 - expected(1)) / 9
  // = 2*(1 - 0.30103)/9 = 1.39794/9 = 0.155327.
  const amounts = Array(50).fill(100); // every amount has leading digit 1
  const { mad, conformity } = benfordMeanAbsoluteDeviation(amounts);
  closeTo(mad, 0.155327, 1e-3);
  assert.equal(conformity, "nonconforming");
});

test("benfordMeanAbsoluteDeviation: a near-theoretical distribution is close conformity", () => {
  // Counts chosen to sit within a few amounts of the theoretical 1000 * expected(d) for each
  // digit (301/176/125/97/79/67/58/51/46, summing to 1000). By hand: MAD ~= 0.0001, well
  // under the 0.006 "close" band (see benford.js's cited Nigrini bands).
  const counts = [301, 176, 125, 97, 79, 67, 58, 51, 46];
  const digitSeed = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const amounts = counts.flatMap((count, i) => Array(count).fill(digitSeed[i]));
  const { mad, conformity } = benfordMeanAbsoluteDeviation(amounts);
  assert.ok(mad <= 0.006, `expected mad <= 0.006, got ${mad}`);
  closeTo(mad, 0.0001, 0.0005);
  assert.equal(conformity, "close");
});
