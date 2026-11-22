// Source: ISA 530, cut-off testing — transactions recorded at or near a period boundary carry
// elevated risk of being recognised in the wrong period. Window size and materiality are
// configurable assumptions, not a fixed rule.
import { jeTotals } from "../../data/generator/jeUtils.js";

/**
 * Flag journal entries dated within a window before a period-end date, at or above a
 * materiality floor.
 * @param {Array<{jeId:string, jeDate:string}>} headers
 * @param {Array<{jeId:string, debitMinor:number, creditMinor:number}>} lines
 * @param {{periodEndDate: string, windowDays?: number, materialityMinor?: number}} opts
 * @returns {Array<{jeId:string, reasonCode:string, detail:object}>}
 */
export function flagCutoffEntries(headers, lines, { periodEndDate, windowDays = 3, materialityMinor = 0 }) {
  const periodEnd = new Date(`${periodEndDate}T00:00:00Z`);
  const windowStart = new Date(periodEnd.getTime() - windowDays * 86400000);
  const totals = jeTotals(lines);
  const flagged = [];
  for (const header of headers) {
    const jeDate = new Date(`${header.jeDate}T00:00:00Z`);
    if (jeDate < windowStart || jeDate > periodEnd) continue;
    const amount = totals.get(header.jeId)?.debitMinor ?? 0;
    if (amount >= materialityMinor) {
      flagged.push({
        jeId: header.jeId,
        reasonCode: "CUTOFF",
        detail: { jeDate: header.jeDate, amountMinor: amount, periodEndDate, windowDays },
      });
    }
  }
  return flagged;
}
