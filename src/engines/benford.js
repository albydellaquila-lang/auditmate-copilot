// Source: Newcomb-Benford Law of leading digits — the expected frequency of each leading digit
// d in 1..9 in naturally occurring amounts is log10(1 + 1/d). Audit application and the Mean
// Absolute Deviation (MAD) conformity bands below follow M. Nigrini, "Benford's Law:
// Applications for Forensic Accounting, Auditing, and Fraud Detection" (Wiley, 2012) — a public
// forensic-accounting reference, not a proprietary scoring formula.
// Published MAD conformity bands (first-digit test, Nigrini 2012):
//   <= 0.006 close conformity, <= 0.012 acceptable, <= 0.015 marginal, > 0.015 nonconformity.
const MAD_BANDS = [
  { max: 0.006, conformity: "close" },
  { max: 0.012, conformity: "acceptable" },
  { max: 0.015, conformity: "marginal" },
];

/**
 * Leading (first significant) digit of a positive integer minor-unit amount.
 * @param {number} amountMinor must be a positive integer; zero/negative have no leading digit.
 * @returns {number} 1-9
 */
export function firstDigit(amountMinor) {
  const abs = Math.abs(amountMinor);
  if (!Number.isInteger(abs) || abs === 0) {
    throw new RangeError(`firstDigit requires a nonzero integer amount: ${amountMinor}`);
  }
  let n = abs;
  while (n >= 10) n = Math.floor(n / 10);
  return n;
}

/** Expected Benford frequency of leading digit d (1-9). */
export function expectedBenfordFrequency(d) {
  if (!Number.isInteger(d) || d < 1 || d > 9) throw new RangeError(`digit must be 1-9: ${d}`);
  return Math.log10(1 + 1 / d);
}

/**
 * Observed first-digit distribution over a set of amounts.
 * @param {number[]} amountsMinor nonzero integer minor-unit amounts
 * @returns {{counts: number[], frequencies: number[], n: number}} index 0 = digit 1, ... index 8 = digit 9
 */
export function benfordDigitDistribution(amountsMinor) {
  const counts = new Array(9).fill(0);
  for (const amount of amountsMinor) counts[firstDigit(amount) - 1]++;
  const n = amountsMinor.length;
  const frequencies = counts.map((c) => (n === 0 ? 0 : c / n));
  return { counts, frequencies, n };
}

/**
 * Mean Absolute Deviation between the observed and expected first-digit distributions, with
 * the published conformity band it falls into.
 * @param {number[]} amountsMinor
 * @returns {{mad: number, conformity: "close"|"acceptable"|"marginal"|"nonconforming", distribution: object}}
 */
export function benfordMeanAbsoluteDeviation(amountsMinor) {
  const distribution = benfordDigitDistribution(amountsMinor);
  let sumAbsDiff = 0;
  for (let i = 0; i < 9; i++) {
    sumAbsDiff += Math.abs(distribution.frequencies[i] - expectedBenfordFrequency(i + 1));
  }
  const mad = sumAbsDiff / 9;
  const band = MAD_BANDS.find((b) => mad <= b.max);
  return { mad, conformity: band ? band.conformity : "nonconforming", distribution };
}
