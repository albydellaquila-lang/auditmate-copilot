// Shared Procure-to-Pay document builders and helpers, used by both the normal-population
// generator and the anomaly injector, so "a PO/GR/Invoice" has exactly one definition across
// both. Each builder computes its own totals via sumMinor/computeVatMinor so an anomaly fixture
// can deliberately override just one field without hand-recomputing the rest.
//
// Schema contract: every PO line, GR line and Invoice line carries poId + lineNo, where lineNo
// is the PO's own 1..N line numbering — GR and Invoice lines reference the PO line they
// fulfil/bill, never introduce their own numbering. A PO line may be received/invoiced across
// multiple GR/Invoice documents (partial/staged delivery); aggregate across documents by
// (poId, lineNo) via sumQtyByPoLine. All money fields are integer minor units (AED fils).
import { sumMinor } from "../../../src/engines/money.js";
import { computeVatMinor } from "../../../src/engines/vat.js";
import { ITEM_CATALOG } from "./catalog.js";

export function poLineKey(poId, lineNo) {
  return `${poId}|${lineNo}`;
}

/** @param {Array<{poId:string,lineNo:number}>} poLines @returns {Map<string, Map<number, object>>} poId -> lineNo -> poLine */
export function groupPoLines(poLines) {
  const map = new Map();
  for (const line of poLines) {
    let byLineNo = map.get(line.poId);
    if (!byLineNo) { byLineNo = new Map(); map.set(line.poId, byLineNo); }
    byLineNo.set(line.lineNo, line);
  }
  return map;
}

/**
 * Sum a quantity field across GR or Invoice lines, keyed by (poId, lineNo), so staged/partial
 * documents against the same PO line aggregate correctly.
 * @param {Array<{poId:string,lineNo:number}>} docLines
 * @param {string} qtyField e.g. "qtyReceived" or "qtyInvoiced"
 * @returns {Map<string, number>}
 */
export function sumQtyByPoLine(docLines, qtyField) {
  const totals = new Map();
  for (const line of docLines) {
    const key = poLineKey(line.poId, line.lineNo);
    totals.set(key, (totals.get(key) ?? 0) + line[qtyField]);
  }
  return totals;
}

function lookupItem(itemCode) {
  const item = ITEM_CATALOG.find((c) => c.itemCode === itemCode);
  if (!item) throw new RangeError(`Unknown itemCode: ${itemCode}`);
  return item;
}

function findPoLine(poLines, lineNo) {
  const line = poLines.find((l) => l.lineNo === lineNo);
  if (!line) throw new RangeError(`No PO line ${lineNo} in the given poLines`);
  return line;
}

/**
 * @param {string} poId
 * @param {{companyId?:string, vendorId:string, poDate:string, lines:Array<{itemCode:string, qtyOrdered:number}>}} opts
 */
export function buildPo(poId, { companyId = "FGH-DEMO", vendorId, poDate, lines }) {
  const builtLines = lines.map(({ itemCode, qtyOrdered }, i) => {
    const item = lookupItem(itemCode);
    const lineNo = i + 1;
    return {
      poId, lineNo, itemCode, itemDescription: item.description,
      qtyOrdered, unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: qtyOrdered * item.unitPriceMinor,
    };
  });
  const totalMinor = sumMinor(builtLines.map((l) => l.lineTotalMinor));
  return { header: { poId, companyId, vendorId, poDate, currency: "AED", totalMinor }, lines: builtLines };
}

/**
 * @param {string} grId
 * @param {string} poId
 * @param {{receiptDate:string, receivedBy:string, poLines:object[], qtyReceivedByLine:Record<number,number>}} opts
 */
export function buildGr(grId, poId, { receiptDate, receivedBy, poLines, qtyReceivedByLine }) {
  const builtLines = Object.entries(qtyReceivedByLine).map(([lineNoStr, qtyReceived]) => {
    const lineNo = Number(lineNoStr);
    const poLine = findPoLine(poLines, lineNo);
    return { grId, poId, lineNo, itemCode: poLine.itemCode, qtyReceived };
  });
  return { header: { grId, poId, receiptDate, receivedBy }, lines: builtLines };
}

/**
 * @param {string} invoiceId
 * @param {string} poId
 * @param {{vendorId:string, issueDate:string, currencyCode?:string, poLines:object[],
 *   qtyInvoicedByLine:Record<number,number>, unitPriceOverrideByLine?:Record<number,number>,
 *   vatAmountOverrideMinor?:number|null, vatRateBps?:number}} opts
 */
export function buildInvoice(invoiceId, poId, {
  vendorId, issueDate, currencyCode = "AED", poLines, qtyInvoicedByLine,
  unitPriceOverrideByLine = {}, vatAmountOverrideMinor = null, vatRateBps = 500,
}) {
  const builtLines = Object.entries(qtyInvoicedByLine).map(([lineNoStr, qtyInvoiced]) => {
    const lineNo = Number(lineNoStr);
    const poLine = findPoLine(poLines, lineNo);
    const unitPriceMinor = unitPriceOverrideByLine[lineNo] ?? poLine.unitPriceMinor;
    return {
      invoiceId, poId, lineNo, itemCode: poLine.itemCode, itemDescription: poLine.itemDescription,
      qtyInvoiced, unitPriceMinor, lineAmountMinor: qtyInvoiced * unitPriceMinor,
    };
  });
  const taxableAmountMinor = sumMinor(builtLines.map((l) => l.lineAmountMinor));
  const vatAmountMinor = vatAmountOverrideMinor ?? computeVatMinor(taxableAmountMinor, { rateBps: vatRateBps });
  const totalMinor = sumMinor([taxableAmountMinor, vatAmountMinor]);
  return {
    header: { invoiceId, poId, vendorId, issueDate, currencyCode, taxableAmountMinor, vatRateBps, vatAmountMinor, totalMinor },
    lines: builtLines,
  };
}
