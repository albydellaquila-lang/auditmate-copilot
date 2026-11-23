// Shared journal-entry helpers used by both the synthetic-data generator and the engines,
// so "a journal entry" and "its total" have exactly one definition across the codebase.
import { sumMinor } from "../../src/engines/money.js";

/** Group JE lines by jeId. @param {Array<{jeId:string}>} lines @returns {Map<string, object[]>} */
export function groupByJe(lines) {
  const map = new Map();
  for (const line of lines) {
    const group = map.get(line.jeId);
    if (group) group.push(line);
    else map.set(line.jeId, [line]);
  }
  return map;
}

/**
 * Per-JE debit/credit totals in minor units.
 * @param {Array<{jeId:string, debitMinor:number, creditMinor:number}>} lines
 * @returns {Map<string, {debitMinor:number, creditMinor:number}>}
 */
export function jeTotals(lines) {
  const totals = new Map();
  for (const [jeId, group] of groupByJe(lines)) {
    totals.set(jeId, {
      debitMinor: sumMinor(group.map((l) => l.debitMinor)),
      creditMinor: sumMinor(group.map((l) => l.creditMinor)),
    });
  }
  return totals;
}

// Source: calendar/clock math only, no cited standard — "business hours" bounds are a
// configurable assumption used to flag postings outside normal processing windows.
/**
 * @param {string} isoDateTime e.g. "2026-03-14T23:10:00"
 * @param {{businessStartHour?: number, businessEndHour?: number}} [opts]
 */
export function isWeekendOrAfterHours(isoDateTime, { businessStartHour = 8, businessEndHour = 18 } = {}) {
  const d = new Date(isoDateTime);
  const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = d.getUTCHours();
  const isWeekend = day === 0 || day === 6;
  const isAfterHours = hour < businessStartHour || hour >= businessEndHour;
  return isWeekend || isAfterHours;
}

/** @param {string} isoDate e.g. "2026-03-14" @param {number} days @returns {string} ISO date */
export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** @param {number} year @param {number} month 1-12 @returns {string} ISO date of that month's last day */
export function monthEnd(year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
