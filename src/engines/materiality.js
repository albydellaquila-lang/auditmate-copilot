// Source: ISA 320, Materiality in Planning and Performing an Audit — ISA 320 requires materiality
// to be determined but deliberately leaves the benchmark and percentage to professional
// judgment. The benchmark percentages and the performance-materiality/clearly-trivial ratios
// below are configurable assumptions reflecting common practice, not figures ISA 320 mandates.
import { percentageOfMinor } from "./money.js";

// 1% of revenue, 1.5% of total assets, 5% of net income before tax — common practice ranges.
const BENCHMARK_BPS = { revenue: 100, totalAssets: 150, netIncomeBeforeTax: 500 };

export const BENCHMARK_TYPES = Object.keys(BENCHMARK_BPS);

/**
 * @param {{benchmarkType: "revenue"|"totalAssets"|"netIncomeBeforeTax", benchmarkValueMinor: number,
 *   performanceMaterialityBps?: number, clearlyTrivialBps?: number}} opts
 * @returns {{materialityMinor:number, performanceMaterialityMinor:number, clearlyTrivialMinor:number, benchmarkType:string, benchmarkBps:number}}
 */
export function computeMateriality({ benchmarkType, benchmarkValueMinor, performanceMaterialityBps = 7500, clearlyTrivialBps = 500 }) {
  const benchmarkBps = BENCHMARK_BPS[benchmarkType];
  if (benchmarkBps === undefined) throw new RangeError(`Unknown benchmarkType: ${benchmarkType}`);
  if (!Number.isSafeInteger(benchmarkValueMinor) || benchmarkValueMinor < 0) {
    throw new TypeError(`Not a non-negative integer minor-unit amount: ${benchmarkValueMinor}`);
  }
  const materialityMinor = percentageOfMinor(benchmarkValueMinor, benchmarkBps);
  return {
    materialityMinor,
    performanceMaterialityMinor: percentageOfMinor(materialityMinor, performanceMaterialityBps),
    clearlyTrivialMinor: percentageOfMinor(materialityMinor, clearlyTrivialBps),
    benchmarkType,
    benchmarkBps,
  };
}
