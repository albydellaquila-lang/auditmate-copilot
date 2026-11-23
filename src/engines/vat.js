// Source: UAE VAT, standard rate 5% (in force). Generic percentage-of-amount math rewritten
// from scratch; the rate is expressed in basis points for integer-safe math. rateBps is a
// configurable assumption point whose default matches the current UAE standard rate.
import { percentageOfMinor } from "./money.js";

/**
 * @param {number} taxableMinor non-negative integer minor-unit amount
 * @param {{rateBps?: number}} [opts]
 * @returns {number} VAT amount in integer minor units, rounded half-up to the nearest unit
 */
export function computeVatMinor(taxableMinor, { rateBps = 500 } = {}) {
  if (!Number.isSafeInteger(taxableMinor) || taxableMinor < 0) {
    throw new TypeError(`Not a non-negative integer minor-unit amount: ${taxableMinor}`);
  }
  return percentageOfMinor(taxableMinor, rateBps);
}
