// Source: AICPA Audit Data Standards — GL Standard (journal entry header/line structure);
// double-entry bookkeeping requires each journal entry's debits to equal its credits.
// Tolerance is a configurable assumption (0 by default: exact balance required).
import { jeTotals } from "../../data/generator/jeUtils.js";
import { withinTolerance } from "./money.js";

/**
 * Find journal entries whose total debits and credits do not balance.
 * @param {Array<{jeId:string, debitMinor:number, creditMinor:number}>} lines
 * @param {{toleranceMinor?: number}} [opts]
 * @returns {Array<{jeId:string, totalDebitMinor:number, totalCreditMinor:number, diffMinor:number}>}
 */
export function findUnbalancedEntries(lines, { toleranceMinor = 0 } = {}) {
  const flagged = [];
  for (const [jeId, { debitMinor, creditMinor }] of jeTotals(lines)) {
    if (!withinTolerance(debitMinor, creditMinor, { absMinor: toleranceMinor })) {
      flagged.push({
        jeId,
        totalDebitMinor: debitMinor,
        totalCreditMinor: creditMinor,
        diffMinor: debitMinor - creditMinor,
      });
    }
  }
  return flagged;
}
