// Source: ISA 530, Audit Sampling + AICPA Audit Guide, "Audit Sampling" — monetary unit sampling
// (MUS) with published reliability (confidence) factors at zero expected misstatements. The
// factor table is the standard public table, not a proprietary formula; confidenceLevel must be
// one of its published keys.
// Source: AICPA Audit Guide, Audit Sampling — reliability factors for monetary unit sampling,
// zero expected misstatements.
export const RELIABILITY_FACTORS_ZERO_ERRORS = { 70: 1.2, 80: 1.6, 90: 2.3, 95: 3.0, 99: 4.6 };

/**
 * @param {{populationValueMinor: number, tolerableMisstatementMinor: number, confidenceLevel?: 70|80|90|95|99}} opts
 * @returns {number} sample size (count of sampling intervals)
 */
export function computeSampleSize({ populationValueMinor, tolerableMisstatementMinor, confidenceLevel = 95 }) {
  const factor = RELIABILITY_FACTORS_ZERO_ERRORS[confidenceLevel];
  if (factor === undefined) throw new RangeError(`Unknown confidenceLevel: ${confidenceLevel}`);
  if (tolerableMisstatementMinor <= 0) throw new RangeError("tolerableMisstatementMinor must be positive");
  return Math.ceil((populationValueMinor * factor) / tolerableMisstatementMinor);
}

/**
 * Systematic monetary unit sampling: walk the population's cumulative value and select the item
 * covering each evenly-spaced interval point. An item whose value exceeds the interval can cover
 * more than one point (and so is selected more than once) — standard MUS behaviour, not a bug.
 * @param {Array<{id:string, valueMinor:number}>} items in a fixed, stable order
 * @param {{sampleSize: number, populationValueMinor: number}} opts
 * @returns {Array<{id:string, valueMinor:number, hitCount:number}>} in order of first selection
 */
export function selectMusSample(items, { sampleSize, populationValueMinor }) {
  if (sampleSize <= 0) throw new RangeError("sampleSize must be positive");
  const samplingInterval = populationValueMinor / sampleSize;

  const ranges = [];
  let cumulative = 0;
  for (const item of items) {
    ranges.push({ item, start: cumulative, end: cumulative + item.valueMinor });
    cumulative += item.valueMinor;
  }

  const hitsById = new Map();
  for (let k = 0; k < sampleSize; k++) {
    const point = k * samplingInterval + samplingInterval / 2;
    const range = ranges.find((r) => point >= r.start && point < r.end);
    if (!range) continue; // point falls past the last item's cumulative value; nothing to select
    const existing = hitsById.get(range.item.id);
    if (existing) existing.hitCount += 1;
    else hitsById.set(range.item.id, { id: range.item.id, valueMinor: range.item.valueMinor, hitCount: 1 });
  }
  return [...hitsById.values()];
}
