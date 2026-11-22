// Deliberately planted 3-way-match exceptions, one group per deterministic engine check in
// src/engines/threeWayMatch.js. IDs are reserved static strings (not seed-derived) so the
// answer key below is a literal, reviewable table, and `npm test` can assert each engine
// actually finds every planted case. Covers the canonical AICPA ADS P2P 3-way-match failure
// modes: quantity over-billing, price variance, missing evidence (GR or invoice), duplicate
// payment risk, chronological impossibility, and VAT miscalculation.
import { computeVatMinor } from "../../../src/engines/vat.js";
import { buildPo, buildGr, buildInvoice } from "./p2pUtils.js";

/**
 * @param {{purchaseOrders:object, goodsReceipts:object, invoices:object}} normal
 * @param {import("../rng.js").createRng extends (...a:any)=>infer R ? R : never} _rng unused by
 *   this fixed fixture set, accepted for a consistent generator-stage signature (see Sprint 1's
 *   injectAnomalies.js for the same documented rationale).
 */
export function injectP2PAnomalies(normal, _rng) {
  const poHeaders = [];
  const poLinesAll = [];
  const grHeaders = [];
  const grLinesAll = [];
  const invHeaders = [];
  const invLinesAll = [];
  const answerKey = [];

  function addPo(poId, opts) {
    const po = buildPo(poId, opts);
    poHeaders.push(po.header);
    poLinesAll.push(...po.lines);
    return po.lines;
  }
  function addGr(grId, poId, opts) {
    const gr = buildGr(grId, poId, opts);
    grHeaders.push(gr.header);
    grLinesAll.push(...gr.lines);
  }
  function addInvoice(invoiceId, poId, opts) {
    const inv = buildInvoice(invoiceId, poId, opts);
    invHeaders.push(inv.header);
    invLinesAll.push(...inv.lines);
  }

  // QTY_MISMATCH: invoiced quantity exceeds received quantity.
  {
    const poLines1 = addPo("PO-ANOM-QTY-1", { vendorId: "V-01", poDate: "2026-02-02", lines: [{ itemCode: "ITM-001", qtyOrdered: 10 }] });
    addGr("GR-ANOM-QTY-1", "PO-ANOM-QTY-1", { receiptDate: "2026-02-06", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 10 } });
    addInvoice("INV-ANOM-QTY-1", "PO-ANOM-QTY-1", { vendorId: "V-01", issueDate: "2026-02-08", poLines: poLines1, qtyInvoicedByLine: { 1: 15 } });

    const poLines2 = addPo("PO-ANOM-QTY-2", { vendorId: "V-02", poDate: "2026-02-03", lines: [{ itemCode: "ITM-002", qtyOrdered: 20 }] });
    addGr("GR-ANOM-QTY-2", "PO-ANOM-QTY-2", { receiptDate: "2026-02-07", receivedBy: "P-01", poLines: poLines2, qtyReceivedByLine: { 1: 12 } });
    addInvoice("INV-ANOM-QTY-2", "PO-ANOM-QTY-2", { vendorId: "V-02", issueDate: "2026-02-09", poLines: poLines2, qtyInvoicedByLine: { 1: 20 } });

    answerKey.push({ checkCode: "QTY_MISMATCH", poIds: ["PO-ANOM-QTY-1", "PO-ANOM-QTY-2"], invoiceIds: ["INV-ANOM-QTY-1", "INV-ANOM-QTY-2"], reason: "Invoiced quantity exceeds quantity received." });
  }

  // PRICE_VARIANCE: invoice unit price deviates from the PO price beyond tolerance (5%).
  {
    const poLines1 = addPo("PO-ANOM-PRICE-1", { vendorId: "V-03", poDate: "2026-03-02", lines: [{ itemCode: "ITM-003", qtyOrdered: 5 }] });
    addGr("GR-ANOM-PRICE-1", "PO-ANOM-PRICE-1", { receiptDate: "2026-03-06", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 5 } });
    addInvoice("INV-ANOM-PRICE-1", "PO-ANOM-PRICE-1", { vendorId: "V-03", issueDate: "2026-03-08", poLines: poLines1, qtyInvoicedByLine: { 1: 5 }, unitPriceOverrideByLine: { 1: 21060 } }); // PO price 18000 * 1.17

    const poLines2 = addPo("PO-ANOM-PRICE-2", { vendorId: "V-04", poDate: "2026-03-03", lines: [{ itemCode: "ITM-004", qtyOrdered: 4 }] });
    addGr("GR-ANOM-PRICE-2", "PO-ANOM-PRICE-2", { receiptDate: "2026-03-07", receivedBy: "P-01", poLines: poLines2, qtyReceivedByLine: { 1: 4 } });
    addInvoice("INV-ANOM-PRICE-2", "PO-ANOM-PRICE-2", { vendorId: "V-04", issueDate: "2026-03-09", poLines: poLines2, qtyInvoicedByLine: { 1: 4 }, unitPriceOverrideByLine: { 1: 40000 } }); // PO price 50000 * 0.80

    answerKey.push({ checkCode: "PRICE_VARIANCE", poIds: ["PO-ANOM-PRICE-1", "PO-ANOM-PRICE-2"], invoiceIds: ["INV-ANOM-PRICE-1", "INV-ANOM-PRICE-2"], reason: "Invoice unit price deviates from the PO price beyond tolerance." });
  }

  // MISSING_GR: PO + invoice exist, no goods-receipt record at all.
  {
    const poLines1 = addPo("PO-ANOM-NOGR-1", { vendorId: "V-05", poDate: "2026-04-02", lines: [{ itemCode: "ITM-005", qtyOrdered: 3 }] });
    addInvoice("INV-ANOM-NOGR-1", "PO-ANOM-NOGR-1", { vendorId: "V-05", issueDate: "2026-04-10", poLines: poLines1, qtyInvoicedByLine: { 1: 3 } });

    const poLines2 = addPo("PO-ANOM-NOGR-2", { vendorId: "V-06", poDate: "2026-04-03", lines: [{ itemCode: "ITM-006", qtyOrdered: 2 }] });
    addInvoice("INV-ANOM-NOGR-2", "PO-ANOM-NOGR-2", { vendorId: "V-06", issueDate: "2026-04-11", poLines: poLines2, qtyInvoicedByLine: { 1: 2 } });

    answerKey.push({ checkCode: "MISSING_GR", poIds: ["PO-ANOM-NOGR-1", "PO-ANOM-NOGR-2"], invoiceIds: ["INV-ANOM-NOGR-1", "INV-ANOM-NOGR-2"], reason: "Invoice has no supporting goods-receipt record." });
  }

  // MISSING_INVOICE: fully received PO line, no invoice after the 30-day grace period.
  {
    const poLines1 = addPo("PO-ANOM-NOINV-1", { vendorId: "V-07", poDate: "2026-01-05", lines: [{ itemCode: "ITM-007", qtyOrdered: 6 }] });
    addGr("GR-ANOM-NOINV-1", "PO-ANOM-NOINV-1", { receiptDate: "2026-01-15", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 6 } });
    // no invoice at all

    answerKey.push({ checkCode: "MISSING_INVOICE", poIds: ["PO-ANOM-NOINV-1"], reason: "Fully received PO line has no invoice after the grace period." });
  }

  // DUPLICATE_INVOICE: same vendor/PO/amount invoiced more than once.
  {
    const poLines1 = addPo("PO-ANOM-DUP-1", { vendorId: "V-08", poDate: "2026-05-02", lines: [{ itemCode: "ITM-008", qtyOrdered: 5 }] });
    addGr("GR-ANOM-DUP-1", "PO-ANOM-DUP-1", { receiptDate: "2026-05-06", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 5 } });
    addInvoice("INV-ANOM-DUP-1A", "PO-ANOM-DUP-1", { vendorId: "V-08", issueDate: "2026-05-08", poLines: poLines1, qtyInvoicedByLine: { 1: 5 } });
    addInvoice("INV-ANOM-DUP-1B", "PO-ANOM-DUP-1", { vendorId: "V-08", issueDate: "2026-05-15", poLines: poLines1, qtyInvoicedByLine: { 1: 5 } });

    const poLines2 = addPo("PO-ANOM-DUP-2", { vendorId: "V-09", poDate: "2026-05-03", lines: [{ itemCode: "ITM-001", qtyOrdered: 8 }] });
    addGr("GR-ANOM-DUP-2", "PO-ANOM-DUP-2", { receiptDate: "2026-05-07", receivedBy: "P-01", poLines: poLines2, qtyReceivedByLine: { 1: 8 } });
    addInvoice("INV-ANOM-DUP-2A", "PO-ANOM-DUP-2", { vendorId: "V-09", issueDate: "2026-05-09", poLines: poLines2, qtyInvoicedByLine: { 1: 8 } });
    addInvoice("INV-ANOM-DUP-2B", "PO-ANOM-DUP-2", { vendorId: "V-09", issueDate: "2026-05-16", poLines: poLines2, qtyInvoicedByLine: { 1: 8 } });

    answerKey.push({ checkCode: "DUPLICATE_INVOICE", poIds: ["PO-ANOM-DUP-1", "PO-ANOM-DUP-2"], invoiceIds: ["INV-ANOM-DUP-1A", "INV-ANOM-DUP-1B", "INV-ANOM-DUP-2A", "INV-ANOM-DUP-2B"], reason: "Same vendor/PO/amount invoiced more than once." });
  }

  // INVOICE_BEFORE_PO: invoice is dated before the purchase order it references.
  {
    const poLines1 = addPo("PO-ANOM-SEQ-1", { vendorId: "V-10", poDate: "2026-06-15", lines: [{ itemCode: "ITM-002", qtyOrdered: 6 }] });
    addGr("GR-ANOM-SEQ-1", "PO-ANOM-SEQ-1", { receiptDate: "2026-06-20", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 6 } });
    addInvoice("INV-ANOM-SEQ-1", "PO-ANOM-SEQ-1", { vendorId: "V-10", issueDate: "2026-06-10", poLines: poLines1, qtyInvoicedByLine: { 1: 6 } });

    const poLines2 = addPo("PO-ANOM-SEQ-2", { vendorId: "V-11", poDate: "2026-07-01", lines: [{ itemCode: "ITM-003", qtyOrdered: 4 }] });
    addGr("GR-ANOM-SEQ-2", "PO-ANOM-SEQ-2", { receiptDate: "2026-07-05", receivedBy: "P-01", poLines: poLines2, qtyReceivedByLine: { 1: 4 } });
    addInvoice("INV-ANOM-SEQ-2", "PO-ANOM-SEQ-2", { vendorId: "V-11", issueDate: "2026-06-25", poLines: poLines2, qtyInvoicedByLine: { 1: 4 } });

    answerKey.push({ checkCode: "INVOICE_BEFORE_PO", poIds: ["PO-ANOM-SEQ-1", "PO-ANOM-SEQ-2"], invoiceIds: ["INV-ANOM-SEQ-1", "INV-ANOM-SEQ-2"], reason: "Invoice is dated before the purchase order it references." });
  }

  // VAT_MISCALC: declared VAT does not match the computed VAT on the taxable amount.
  {
    const poLines1 = addPo("PO-ANOM-VAT-1", { vendorId: "V-12", poDate: "2026-08-02", lines: [{ itemCode: "ITM-002", qtyOrdered: 4 }] });
    addGr("GR-ANOM-VAT-1", "PO-ANOM-VAT-1", { receiptDate: "2026-08-06", receivedBy: "P-01", poLines: poLines1, qtyReceivedByLine: { 1: 4 } });
    // taxable = 4 * 32000 = 128000; correct VAT = computeVatMinor(128000) = 6400; declared 0 (forgot VAT).
    addInvoice("INV-ANOM-VAT-1", "PO-ANOM-VAT-1", { vendorId: "V-12", issueDate: "2026-08-08", poLines: poLines1, qtyInvoicedByLine: { 1: 4 }, vatAmountOverrideMinor: 0 });

    const poLines2 = addPo("PO-ANOM-VAT-2", { vendorId: "V-13", poDate: "2026-08-03", lines: [{ itemCode: "ITM-003", qtyOrdered: 2 }] });
    addGr("GR-ANOM-VAT-2", "PO-ANOM-VAT-2", { receiptDate: "2026-08-07", receivedBy: "P-01", poLines: poLines2, qtyReceivedByLine: { 1: 2 } });
    // taxable = 2 * 18000 = 36000; declared VAT wrongly computed at 8% instead of the 5% standard rate.
    const wrongVat = computeVatMinor(36000, { rateBps: 800 });
    addInvoice("INV-ANOM-VAT-2", "PO-ANOM-VAT-2", { vendorId: "V-13", issueDate: "2026-08-09", poLines: poLines2, qtyInvoicedByLine: { 1: 2 }, vatAmountOverrideMinor: wrongVat, vatRateBps: 800 });

    answerKey.push({ checkCode: "VAT_MISCALC", poIds: ["PO-ANOM-VAT-1", "PO-ANOM-VAT-2"], invoiceIds: ["INV-ANOM-VAT-1", "INV-ANOM-VAT-2"], reason: "Declared VAT does not match the computed VAT on the taxable amount." });
  }

  return {
    purchaseOrders: { headers: [...normal.purchaseOrders.headers, ...poHeaders], lines: [...normal.purchaseOrders.lines, ...poLinesAll] },
    goodsReceipts: { headers: [...normal.goodsReceipts.headers, ...grHeaders], lines: [...normal.goodsReceipts.lines, ...grLinesAll] },
    invoices: { headers: [...normal.invoices.headers, ...invHeaders], lines: [...normal.invoices.lines, ...invLinesAll] },
    answerKey,
  };
}
