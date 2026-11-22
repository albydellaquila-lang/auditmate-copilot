// Source: Herfindahl-Hirschman Index — a generic, public-domain concentration metric (sum of
// squared market shares), applied here to vendor spend per ISA 500 evidence-sufficiency
// considerations (concentrated spend with one counterparty warrants closer evidence review).
// Not a proprietary scoring formula; the "high concentration" threshold is a configurable
// assumption.
import { sumMinor } from "./money.js";

/**
 * Herfindahl-Hirschman Index from each entity's share of the total, expressed in basis points
 * (10000 bps = 100%). Returns an HHI on the conventional 0-10000 scale (sum of squared
 * percentage shares, where a share of 100% yields 10000).
 * @param {number[]} shareBpsByEntity
 */
export function computeHHI(shareBpsByEntity) {
  const sumSquares = shareBpsByEntity.reduce((acc, bps) => acc + bps * bps, 0);
  return sumSquares / 10000;
}

/**
 * Vendor spend concentration: total debit spend per vendor, each vendor's basis-point share of
 * total vendor spend, and the resulting HHI.
 * @param {Array<{vendorId?:string|null, debitMinor:number}>} lines
 * @returns {{hhi: number, totalMinor: number, ranked: Array<{vendorId:string, spendMinor:number, shareBps:number}>}}
 */
export function vendorConcentration(lines) {
  const spendByVendor = new Map();
  for (const line of lines) {
    if (!line.vendorId || line.debitMinor <= 0) continue;
    spendByVendor.set(line.vendorId, (spendByVendor.get(line.vendorId) ?? 0) + line.debitMinor);
  }
  const totalMinor = sumMinor([...spendByVendor.values()]);
  const ranked = [...spendByVendor.entries()]
    .map(([vendorId, spendMinor]) => ({
      vendorId,
      spendMinor,
      shareBps: totalMinor === 0 ? 0 : Math.round((spendMinor * 10000) / totalMinor),
    }))
    .sort((a, b) => b.spendMinor - a.spendMinor);
  const hhi = computeHHI(ranked.map((r) => r.shareBps));
  return { hhi, totalMinor, ranked };
}
