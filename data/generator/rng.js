// Source: mulberry32 — public-domain seeded PRNG (T. Ettinger). Chosen only for deterministic,
// reproducible synthetic-data generation; not suitable for cryptographic use.
export function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded random helpers built on mulberry32, for reproducible synthetic-data generation.
 * @param {number} seed
 */
export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Integer in [min, maxInclusive]. */
    int(min, maxInclusive) {
      return min + Math.floor(next() * (maxInclusive - min + 1));
    },
    /** Uniformly pick one element of a non-empty array. */
    pick(array) {
      if (array.length === 0) throw new RangeError("pick: empty array");
      return array[Math.floor(next() * array.length)];
    },
    /** True with probability p (default 0.5). */
    bool(p = 0.5) {
      return next() < p;
    },
    /** Fisher-Yates shuffle; returns a new array, does not mutate the input. */
    shuffle(array) {
      const a = array.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
