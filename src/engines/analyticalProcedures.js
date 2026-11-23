// Source: ISA 520, Analytical Procedures — significant fluctuations period-over-period warrant
// investigation. The variance threshold is a configurable assumption, not mandated by the
// standard. Net activity per account per period (debit minus credit) is the trend measure;
// periods with no activity for an account simply have no entry (not a synthesized zero), so
// "previous period" below means the previous period that actually had activity.
import { sumMinor } from "./money.js";

/**
 * @param {Array<{jeId:string, period:string}>} headers
 * @param {Array<{jeId:string, accountId:string, debitMinor:number, creditMinor:number}>} lines
 * @returns {Array<{accountId:string, period:string, netMinor:number}>} sorted by accountId, then period
 */
export function computeMonthlyAccountActivity(headers, lines) {
  const periodByJe = new Map(headers.map((h) => [h.jeId, h.period]));
  const grouped = new Map(); // "accountId|period" -> { debits: number[], credits: number[] }
  for (const line of lines) {
    const period = periodByJe.get(line.jeId);
    if (!period) continue;
    const key = `${line.accountId}|${period}`;
    let bucket = grouped.get(key);
    if (!bucket) { bucket = { accountId: line.accountId, period, debits: [], credits: [] }; grouped.set(key, bucket); }
    bucket.debits.push(line.debitMinor);
    bucket.credits.push(line.creditMinor);
  }
  const activity = [...grouped.values()].map(({ accountId, period, debits, credits }) => ({
    accountId,
    period,
    netMinor: sumMinor(debits) - sumMinor(credits),
  }));
  activity.sort((a, b) => (a.accountId === b.accountId ? a.period.localeCompare(b.period) : a.accountId.localeCompare(b.accountId)));
  return activity;
}

/**
 * Flag account/period pairs whose net activity moved by more than a threshold versus the
 * previous period that had activity for that account. A materiality floor excludes swings on
 * immaterial balances: a tiny base amount (e.g. AED 200) makes any ordinary change read as an
 * enormous percentage, which is noise, not a real fluctuation worth investigating — immaterial
 * balances being excluded from this kind of analysis is itself standard analytical-procedure
 * practice, not just a UI filter.
 * @param {Array<{accountId:string, period:string, netMinor:number}>} monthlyActivity sorted by
 *   accountId then period (as returned by computeMonthlyAccountActivity)
 * @param {{varianceThresholdBps?: number, materialityFloorMinor?: number}} [opts]
 * @returns {Array<{accountId:string, period:string, previousPeriod:string, currentNetMinor:number, previousNetMinor:number, varianceBps:number, reasonCode:"SIGNIFICANT_VARIANCE"}>}
 */
export function flagSignificantVariances(monthlyActivity, { varianceThresholdBps = 3000, materialityFloorMinor = 0 } = {}) {
  const flagged = [];
  for (let i = 1; i < monthlyActivity.length; i++) {
    const prev = monthlyActivity[i - 1];
    const curr = monthlyActivity[i];
    if (curr.accountId !== prev.accountId) continue;
    if (prev.netMinor === 0) continue; // no baseline to compute a percentage variance against
    if (Math.max(Math.abs(curr.netMinor), Math.abs(prev.netMinor)) < materialityFloorMinor) continue;
    const varianceBps = Math.round((Math.abs(curr.netMinor - prev.netMinor) * 10000) / Math.abs(prev.netMinor));
    if (varianceBps >= varianceThresholdBps) {
      flagged.push({
        accountId: curr.accountId,
        period: curr.period,
        previousPeriod: prev.period,
        currentNetMinor: curr.netMinor,
        previousNetMinor: prev.netMinor,
        varianceBps,
        reasonCode: "SIGNIFICANT_VARIANCE",
      });
    }
  }
  return flagged;
}
