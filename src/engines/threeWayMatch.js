// Source: AICPA Audit Data Standards — Procure-to-Pay Subledger Standard (PO/goods-receipt/
// invoice document and line fields); ISA 500 evidence-sufficiency framing motivates treating a
// missing or inconsistent 3-way match as a risk indicator. Every tolerance/grace-period below is
// a configurable assumption, not mandated by a standard. This file never imports anything from
// src/ai/ and never sees AI-extracted output — it only ever matches already-structured PO/GR/
// Invoice records, satisfying the "the LLM never does math" rule by construction.
import { poLineKey, sumQtyByPoLine } from "../../data/generator/p2p/p2pUtils.js";
import { withinTolerance } from "./money.js";
import { computeVatMinor } from "./vat.js";

function exceptionId(reasonCode, poId, lineNo, invoiceId) {
  return `${reasonCode}:${poId}:${lineNo ?? ""}:${invoiceId ?? ""}`;
}

/**
 * Flag PO lines whose invoiced quantity exceeds the quantity actually received (aggregated
 * across any number of goods-receipt/invoice documents against that line).
 * @param {object[]} poLines
 * @param {object[]} grLines
 * @param {object[]} invoiceLines
 * @param {{qtyToleranceUnits?: number}} [opts]
 */
export function flagQuantityMismatches(poLines, grLines, invoiceLines, { qtyToleranceUnits = 0 } = {}) {
  const receivedByLine = sumQtyByPoLine(grLines, "qtyReceived");
  const invoicedByLine = sumQtyByPoLine(invoiceLines, "qtyInvoiced");
  const flagged = [];
  for (const poLine of poLines) {
    const key = poLineKey(poLine.poId, poLine.lineNo);
    const qtyReceived = receivedByLine.get(key) ?? 0;
    const qtyInvoiced = invoicedByLine.get(key) ?? 0;
    if (qtyInvoiced - qtyReceived > qtyToleranceUnits) {
      flagged.push({
        exceptionId: exceptionId("QTY_MISMATCH", poLine.poId, poLine.lineNo),
        reasonCode: "QTY_MISMATCH",
        poId: poLine.poId,
        lineNo: poLine.lineNo,
        detail: { poId: poLine.poId, lineNo: poLine.lineNo, qtyOrdered: poLine.qtyOrdered, qtyReceived, qtyInvoiced },
      });
    }
  }
  return flagged;
}

/**
 * Flag invoice lines whose unit price deviates from the PO line's unit price beyond tolerance.
 * @param {object[]} poLines
 * @param {object[]} invoiceLines
 * @param {{priceVarianceBps?: number}} [opts]
 */
export function flagPriceVariances(poLines, invoiceLines, { priceVarianceBps = 500 } = {}) {
  const poLineByKey = new Map(poLines.map((l) => [poLineKey(l.poId, l.lineNo), l]));
  const flagged = [];
  for (const invLine of invoiceLines) {
    const poLine = poLineByKey.get(poLineKey(invLine.poId, invLine.lineNo));
    if (!poLine) continue;
    if (!withinTolerance(invLine.unitPriceMinor, poLine.unitPriceMinor, { bps: priceVarianceBps })) {
      flagged.push({
        exceptionId: exceptionId("PRICE_VARIANCE", invLine.poId, invLine.lineNo, invLine.invoiceId),
        reasonCode: "PRICE_VARIANCE",
        poId: invLine.poId,
        lineNo: invLine.lineNo,
        invoiceId: invLine.invoiceId,
        detail: { poId: invLine.poId, lineNo: invLine.lineNo, invoiceId: invLine.invoiceId, poUnitPriceMinor: poLine.unitPriceMinor, invoiceUnitPriceMinor: invLine.unitPriceMinor },
      });
    }
  }
  return flagged;
}

/**
 * Flag invoice lines billed against a PO line with no goods-receipt record at all.
 * @param {object[]} grLines
 * @param {object[]} invoiceLines
 */
export function flagMissingGoodsReceipts(grLines, invoiceLines) {
  const linesWithGr = new Set(grLines.map((l) => poLineKey(l.poId, l.lineNo)));
  const flagged = [];
  for (const invLine of invoiceLines) {
    if (!linesWithGr.has(poLineKey(invLine.poId, invLine.lineNo))) {
      flagged.push({
        exceptionId: exceptionId("MISSING_GR", invLine.poId, invLine.lineNo, invLine.invoiceId),
        reasonCode: "MISSING_GR",
        poId: invLine.poId,
        lineNo: invLine.lineNo,
        invoiceId: invLine.invoiceId,
        detail: { poId: invLine.poId, lineNo: invLine.lineNo, invoiceId: invLine.invoiceId },
      });
    }
  }
  return flagged;
}

/**
 * Flag fully received PO lines with no invoice at all, once enough time has passed since
 * receipt that an invoice would normally be expected (a completeness / unrecorded-liability risk).
 * @param {object[]} poLines
 * @param {{headers: object[], lines: object[]}} goodsReceipts full GR document set (receiptDate
 *   lives on the header, so the line records alone are not enough for this check)
 * @param {object[]} invoiceLines
 * @param {{asOfDate: string, missingInvoiceGraceDays?: number}} opts
 */
export function flagMissingInvoices(poLines, goodsReceipts, invoiceLines, { asOfDate, missingInvoiceGraceDays = 30 }) {
  const receiptDateByGrId = new Map(goodsReceipts.headers.map((h) => [h.grId, h.receiptDate]));
  const receivedByLine = sumQtyByPoLine(goodsReceipts.lines, "qtyReceived");
  const invoicedByLine = sumQtyByPoLine(invoiceLines, "qtyInvoiced");
  const latestReceiptByLine = new Map();
  for (const grLine of goodsReceipts.lines) {
    const key = poLineKey(grLine.poId, grLine.lineNo);
    const receiptDate = receiptDateByGrId.get(grLine.grId);
    const current = latestReceiptByLine.get(key);
    if (!current || receiptDate > current) latestReceiptByLine.set(key, receiptDate);
  }

  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  const flagged = [];
  for (const poLine of poLines) {
    const key = poLineKey(poLine.poId, poLine.lineNo);
    const qtyReceived = receivedByLine.get(key) ?? 0;
    const qtyInvoiced = invoicedByLine.get(key) ?? 0;
    if (qtyReceived < poLine.qtyOrdered || qtyInvoiced > 0) continue;
    const receiptDate = latestReceiptByLine.get(key);
    if (!receiptDate) continue;
    const daysSinceReceipt = Math.floor((asOf - new Date(`${receiptDate}T00:00:00Z`)) / 86400000);
    if (daysSinceReceipt > missingInvoiceGraceDays) {
      flagged.push({
        exceptionId: exceptionId("MISSING_INVOICE", poLine.poId, poLine.lineNo),
        reasonCode: "MISSING_INVOICE",
        poId: poLine.poId,
        lineNo: poLine.lineNo,
        detail: { poId: poLine.poId, lineNo: poLine.lineNo, receiptDate, daysSinceReceipt },
      });
    }
  }
  return flagged;
}

/**
 * Flag invoices that share vendor, PO and total amount with another invoice — a classic
 * duplicate-payment risk indicator.
 * @param {object[]} invoiceHeaders
 */
export function flagDuplicateInvoices(invoiceHeaders) {
  const groups = new Map();
  for (const h of invoiceHeaders) {
    const key = `${h.vendorId}|${h.poId}|${h.totalMinor}`;
    const group = groups.get(key);
    if (group) group.push(h);
    else groups.set(key, [h]);
  }
  const flagged = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const h of group) {
      flagged.push({
        exceptionId: exceptionId("DUPLICATE_INVOICE", h.poId, undefined, h.invoiceId),
        reasonCode: "DUPLICATE_INVOICE",
        poId: h.poId,
        invoiceId: h.invoiceId,
        detail: { poId: h.poId, invoiceId: h.invoiceId, vendorId: h.vendorId, totalMinor: h.totalMinor, duplicateCount: group.length },
      });
    }
  }
  return flagged;
}

/**
 * Flag invoices dated before the purchase order they reference — chronologically impossible.
 * @param {object[]} poHeaders
 * @param {object[]} invoiceHeaders
 */
export function flagInvoiceBeforePO(poHeaders, invoiceHeaders) {
  const poDateById = new Map(poHeaders.map((h) => [h.poId, h.poDate]));
  const flagged = [];
  for (const inv of invoiceHeaders) {
    const poDate = poDateById.get(inv.poId);
    if (poDate && inv.issueDate < poDate) {
      flagged.push({
        exceptionId: exceptionId("INVOICE_BEFORE_PO", inv.poId, undefined, inv.invoiceId),
        reasonCode: "INVOICE_BEFORE_PO",
        poId: inv.poId,
        invoiceId: inv.invoiceId,
        detail: { poId: inv.poId, invoiceId: inv.invoiceId, poDate, issueDate: inv.issueDate },
      });
    }
  }
  return flagged;
}

/**
 * Flag invoices whose declared VAT does not match an independent recomputation from the
 * taxable amount at the standard rate.
 * @param {object[]} invoiceHeaders
 * @param {{vatRateBps?: number, vatToleranceMinor?: number}} [opts]
 */
export function flagVatMismatches(invoiceHeaders, { vatRateBps = 500, vatToleranceMinor = 1 } = {}) {
  const flagged = [];
  for (const inv of invoiceHeaders) {
    const expectedVatMinor = computeVatMinor(inv.taxableAmountMinor, { rateBps: vatRateBps });
    if (!withinTolerance(inv.vatAmountMinor, expectedVatMinor, { absMinor: vatToleranceMinor })) {
      flagged.push({
        exceptionId: exceptionId("VAT_MISCALC", inv.poId, undefined, inv.invoiceId),
        reasonCode: "VAT_MISCALC",
        poId: inv.poId,
        invoiceId: inv.invoiceId,
        detail: { poId: inv.poId, invoiceId: inv.invoiceId, taxableAmountMinor: inv.taxableAmountMinor, declaredVatMinor: inv.vatAmountMinor, expectedVatMinor },
      });
    }
  }
  return flagged;
}

/**
 * Run every 3-way-match check and return one combined, flat list of exceptions.
 * @param {{purchaseOrders: {headers:object[],lines:object[]}, goodsReceipts: {headers:object[],lines:object[]}, invoices: {headers:object[],lines:object[]}}} dataset
 * @param {object} config see each flag function above for the keys it reads from this object.
 */
export function runThreeWayMatch({ purchaseOrders, goodsReceipts, invoices }, config) {
  return [
    ...flagQuantityMismatches(purchaseOrders.lines, goodsReceipts.lines, invoices.lines, config),
    ...flagPriceVariances(purchaseOrders.lines, invoices.lines, config),
    ...flagMissingGoodsReceipts(goodsReceipts.lines, invoices.lines),
    ...flagMissingInvoices(purchaseOrders.lines, goodsReceipts, invoices.lines, config),
    ...flagDuplicateInvoices(invoices.headers),
    ...flagInvoiceBeforePO(purchaseOrders.headers, invoices.headers),
    ...flagVatMismatches(invoices.headers, config),
  ];
}
