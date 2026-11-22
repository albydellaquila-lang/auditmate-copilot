// Source: AICPA Audit Data Standards — Procure-to-Pay Subledger Standard (vendor identifier
// field); ISA 500 evidence-sufficiency framing motivates extra scrutiny of a counterparty seen
// for the first time close to period end. Lookback window is a configurable assumption.
/**
 * Find journal-entry lines referencing a vendor whose only activity in the lookback window
 * (ending at asOfDate) is on or after its first appearance within that same window — i.e. a
 * vendor with no prior history before the window started.
 * @param {Array<{jeId:string, vendorId?:string|null}>} lines
 * @param {Array<{jeId:string, jeDate:string}>} headers
 * @param {{asOfDate: string, lookbackDays?: number}} opts
 * @returns {Array<{jeId:string, reasonCode:string, detail:object}>}
 */
export function findNewVendors(lines, headers, { asOfDate, lookbackDays = 30 }) {
  const dateByJe = new Map(headers.map((h) => [h.jeId, h.jeDate]));
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  const windowStart = new Date(asOf.getTime() - lookbackDays * 86400000);

  const firstSeenByVendor = new Map();
  for (const line of lines) {
    if (!line.vendorId) continue;
    const jeDate = dateByJe.get(line.jeId);
    if (!jeDate) continue;
    const current = firstSeenByVendor.get(line.vendorId);
    if (!current || jeDate < current) firstSeenByVendor.set(line.vendorId, jeDate);
  }

  const flagged = [];
  for (const line of lines) {
    if (!line.vendorId) continue;
    const jeDate = dateByJe.get(line.jeId);
    if (!jeDate) continue;
    const d = new Date(`${jeDate}T00:00:00Z`);
    if (d < windowStart || d > asOf) continue;
    const firstSeen = firstSeenByVendor.get(line.vendorId);
    if (new Date(`${firstSeen}T00:00:00Z`) >= windowStart) {
      flagged.push({
        jeId: line.jeId,
        reasonCode: "NEW_VENDOR",
        detail: { vendorId: line.vendorId, firstSeen, windowStart: windowStart.toISOString().slice(0, 10) },
      });
    }
  }
  return flagged;
}
