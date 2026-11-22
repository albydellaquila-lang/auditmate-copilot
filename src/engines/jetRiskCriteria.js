// Source: ISA 240 (Revised), journal entry testing requirements — risk criteria for selecting
// journal entries for further testing (unusual preparer/account combinations, unusual account
// pairings, round-number amounts, amounts clustering just under an approval threshold, and
// postings outside normal business hours/days). Every threshold, role map and account-pairing
// list below is a configurable assumption describing "normal" processing, not a fixed rule.
import { groupByJe, jeTotals, isWeekendOrAfterHours } from "../../data/generator/jeUtils.js";

/**
 * Flag lines posted to an account by a preparer whose role is not normally seen on that account.
 * @param {Array<{jeId:string, accountId:string}>} lines
 * @param {Array<{jeId:string, preparerId:string}>} headers
 * @param {{normalRolesByAccount: Record<string,string[]>, preparerRoleById: Record<string,string>}} opts
 * @returns {Array<{jeId:string, reasonCode:string, detail:object}>}
 */
export function flagUnusualPreparers(lines, headers, { normalRolesByAccount, preparerRoleById }) {
  const preparerByJe = new Map(headers.map((h) => [h.jeId, h.preparerId]));
  const flagged = [];
  for (const line of lines) {
    const allowedRoles = normalRolesByAccount[line.accountId];
    if (!allowedRoles) continue; // no rule defined for this account
    const preparerId = preparerByJe.get(line.jeId);
    const role = preparerRoleById[preparerId];
    if (role && !allowedRoles.includes(role)) {
      flagged.push({
        jeId: line.jeId,
        reasonCode: "JET_UNUSUAL_PREPARER",
        detail: { accountId: line.accountId, preparerId, role, allowedRoles },
      });
    }
  }
  return flagged;
}

/**
 * Flag two-line journal entries whose debit/credit account pairing is not in the normal list.
 * Multi-line entries (more than one debit or credit line) are out of scope for this check.
 * @param {Array<{jeId:string, accountId:string, debitMinor:number, creditMinor:number}>} lines
 * @param {{normalPairs: Array<[string,string]>}} opts
 */
export function flagUnusualAccountPairings(lines, { normalPairs }) {
  const normalSet = new Set(normalPairs.map(([d, c]) => `${d}|${c}`));
  const flagged = [];
  for (const [jeId, group] of groupByJe(lines)) {
    if (group.length !== 2) continue;
    const [a, b] = group;
    const debitLine = a.debitMinor > 0 ? a : b.debitMinor > 0 ? b : null;
    const creditLine = a.creditMinor > 0 ? a : b.creditMinor > 0 ? b : null;
    if (!debitLine || !creditLine || debitLine === creditLine) continue;
    const pairKey = `${debitLine.accountId}|${creditLine.accountId}`;
    if (!normalSet.has(pairKey)) {
      flagged.push({
        jeId,
        reasonCode: "JET_UNUSUAL_PAIRING",
        detail: { debitAccountId: debitLine.accountId, creditAccountId: creditLine.accountId },
      });
    }
  }
  return flagged;
}

/**
 * Flag lines whose (nonzero) amount is both at/above a floor and an exact multiple of a
 * round-number granularity — a classic indicator of manual or fabricated entries.
 * @param {Array<{jeId:string, debitMinor:number, creditMinor:number}>} lines
 * @param {{minMinor?: number, granularityMinor?: number}} [opts]
 */
export function flagRoundAmounts(lines, { minMinor = 1000000, granularityMinor = 100000 } = {}) {
  const flagged = [];
  for (const line of lines) {
    const amount = line.debitMinor || line.creditMinor;
    if (amount >= minMinor && amount % granularityMinor === 0) {
      flagged.push({ jeId: line.jeId, reasonCode: "JET_ROUND_AMOUNT", detail: { amountMinor: amount } });
    }
  }
  return flagged;
}

/**
 * Flag journal entries whose total amount sits just under an approval threshold, which can
 * indicate structuring to avoid a review step.
 * @param {Array<{jeId:string, debitMinor:number, creditMinor:number}>} lines
 * @param {{thresholdMinor: number, bandMinor?: number}} opts
 */
export function flagJustUnderThreshold(lines, { thresholdMinor, bandMinor = 100000 }) {
  const flagged = [];
  for (const [jeId, { debitMinor }] of jeTotals(lines)) {
    if (debitMinor < thresholdMinor && debitMinor >= thresholdMinor - bandMinor) {
      flagged.push({
        jeId,
        reasonCode: "JET_JUST_UNDER_THRESHOLD",
        detail: { amountMinor: debitMinor, thresholdMinor },
      });
    }
  }
  return flagged;
}

/**
 * Flag journal entries created outside normal business hours/days.
 * @param {Array<{jeId:string, createdAt:string}>} headers
 * @param {{businessStartHour?: number, businessEndHour?: number}} [opts]
 */
export function flagWeekendOrAfterHoursPostings(headers, opts = {}) {
  const flagged = [];
  for (const h of headers) {
    if (isWeekendOrAfterHours(h.createdAt, opts)) {
      flagged.push({ jeId: h.jeId, reasonCode: "JET_WEEKEND_AFTER_HOURS", detail: { createdAt: h.createdAt } });
    }
  }
  return flagged;
}

/**
 * Run all ISA 240 journal-entry risk criteria and return one combined, flat list.
 * @param {{headers: object[], lines: object[]}} dataset
 * @param {object} config see each flag function above for the keys it reads from this object.
 */
export function runJetRiskCriteria({ headers, lines }, config) {
  return [
    ...flagUnusualPreparers(lines, headers, config),
    ...flagUnusualAccountPairings(lines, config),
    ...flagRoundAmounts(lines, config),
    ...flagJustUnderThreshold(lines, config),
    ...flagWeekendOrAfterHoursPostings(headers, config),
  ];
}
