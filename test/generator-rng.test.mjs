import { test } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "../data/generator/rng.js";

// mulberry32 output is not hand-verifiable digit-by-digit (32-bit imul chains), so these tests
// check the properties that matter for a synthetic-data generator: determinism, range, and the
// documented behaviour of each helper — not a specific numeric sequence.

test("createRng: same seed is deterministic, different seeds diverge", () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  assert.deepEqual(seqA, seqB);

  const c = createRng(43);
  const seqC = Array.from({ length: 10 }, () => c.next());
  assert.notDeepEqual(seqA, seqC);
});

test("createRng: next() stays within [0, 1)", () => {
  const rng = createRng(7);
  for (let i = 0; i < 2000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("createRng: int(min, maxInclusive) stays in bounds and reaches both ends", () => {
  const rng = createRng(1);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = rng.int(3, 7);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 7, `out of range: ${v}`);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6, 7]);
});

test("createRng: pick() always returns a member of the array", () => {
  const rng = createRng(2);
  const options = ["a", "b", "c"];
  for (let i = 0; i < 200; i++) {
    assert.ok(options.includes(rng.pick(options)));
  }
  assert.throws(() => rng.pick([]), RangeError);
});

test("createRng: bool(p) returns both outcomes over enough draws", () => {
  const rng = createRng(3);
  const outcomes = new Set();
  for (let i = 0; i < 200; i++) outcomes.add(rng.bool(0.5));
  assert.deepEqual(outcomes, new Set([true, false]));
  assert.equal(createRng(9).bool(0), false);
  assert.equal(createRng(9).bool(1), true);
});

test("createRng: shuffle() is a permutation and does not mutate the input", () => {
  const rng = createRng(4);
  const original = [1, 2, 3, 4, 5];
  const shuffled = rng.shuffle(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]); // unmutated
  assert.deepEqual([...shuffled].sort((x, y) => x - y), [1, 2, 3, 4, 5]); // same multiset
});
