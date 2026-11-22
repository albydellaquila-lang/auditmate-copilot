import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flagQuantityMismatches,
  flagPriceVariances,
  flagMissingGoodsReceipts,
  flagMissingInvoices,
  flagDuplicateInvoices,
  flagInvoiceBeforePO,
  flagVatMismatches,
  runThreeWayMatch,
} from "../src/engines/threeWayMatch.js";

test("flagQuantityMismatches: flags only lines invoiced beyond what was received", () => {
  const poLines = [
    { poId: "PO-1", lineNo: 1, qtyOrdered: 10 },
    { poId: "PO-2", lineNo: 1, qtyOrdered: 5 },
  ];
  const grLines = [
    { poId: "PO-1", lineNo: 1, qtyReceived: 10 },
    { poId: "PO-2", lineNo: 1, qtyReceived: 5 },
  ];
  const invoiceLines = [
    { poId: "PO-1", lineNo: 1, qtyInvoiced: 12 }, // over-invoiced
    { poId: "PO-2", lineNo: 1, qtyInvoiced: 5 }, // matches
  ];
  const flagged = flagQuantityMismatches(poLines, grLines, invoiceLines);
  assert.deepEqual(flagged, [
    {
      exceptionId: "QTY_MISMATCH:PO-1:1:",
      reasonCode: "QTY_MISMATCH",
      poId: "PO-1",
      lineNo: 1,
      detail: { poId: "PO-1", lineNo: 1, qtyOrdered: 10, qtyReceived: 10, qtyInvoiced: 12 },
    },
  ]);
});

test("flagQuantityMismatches: a tolerance allows small over-invoicing", () => {
  const poLines = [{ poId: "PO-1", lineNo: 1, qtyOrdered: 10 }];
  const grLines = [{ poId: "PO-1", lineNo: 1, qtyReceived: 10 }];
  const invoiceLines = [{ poId: "PO-1", lineNo: 1, qtyInvoiced: 11 }];
  assert.deepEqual(flagQuantityMismatches(poLines, grLines, invoiceLines, { qtyToleranceUnits: 1 }), []);
});

test("flagPriceVariances: flags an invoice unit price outside the tolerance band", () => {
  const poLines = [{ poId: "PO-1", lineNo: 1, unitPriceMinor: 10000 }];
  const invoiceLines = [
    { poId: "PO-1", lineNo: 1, invoiceId: "INV-1", unitPriceMinor: 12000 }, // 20% above
    { poId: "PO-1", lineNo: 1, invoiceId: "INV-2", unitPriceMinor: 10300 }, // 3% above, within 5% tolerance
  ];
  const flagged = flagPriceVariances(poLines, invoiceLines, { priceVarianceBps: 500 });
  assert.deepEqual(flagged, [
    {
      exceptionId: "PRICE_VARIANCE:PO-1:1:INV-1",
      reasonCode: "PRICE_VARIANCE",
      poId: "PO-1",
      lineNo: 1,
      invoiceId: "INV-1",
      detail: { poId: "PO-1", lineNo: 1, invoiceId: "INV-1", poUnitPriceMinor: 10000, invoiceUnitPriceMinor: 12000 },
    },
  ]);
});

test("flagMissingGoodsReceipts: flags invoice lines with no matching GR line", () => {
  const grLines = [{ poId: "PO-1", lineNo: 1 }];
  const invoiceLines = [
    { poId: "PO-1", lineNo: 1, invoiceId: "INV-1" }, // has a GR
    { poId: "PO-2", lineNo: 1, invoiceId: "INV-2" }, // no GR at all
  ];
  const flagged = flagMissingGoodsReceipts(grLines, invoiceLines);
  assert.deepEqual(flagged, [
    {
      exceptionId: "MISSING_GR:PO-2:1:INV-2",
      reasonCode: "MISSING_GR",
      poId: "PO-2",
      lineNo: 1,
      invoiceId: "INV-2",
      detail: { poId: "PO-2", lineNo: 1, invoiceId: "INV-2" },
    },
  ]);
});

test("flagMissingInvoices: flags a fully-received, never-invoiced line past the grace period", () => {
  const poLines = [
    { poId: "PO-1", lineNo: 1, qtyOrdered: 10 }, // fully received, never invoiced, old receipt
    { poId: "PO-2", lineNo: 1, qtyOrdered: 10 }, // fully received, never invoiced, recent receipt
    { poId: "PO-3", lineNo: 1, qtyOrdered: 10 }, // partially received only
  ];
  const goodsReceipts = {
    headers: [
      { grId: "GR-1", receiptDate: "2026-01-01" },
      { grId: "GR-2", receiptDate: "2026-12-20" },
      { grId: "GR-3", receiptDate: "2026-06-01" },
    ],
    lines: [
      { grId: "GR-1", poId: "PO-1", lineNo: 1, qtyReceived: 10 },
      { grId: "GR-2", poId: "PO-2", lineNo: 1, qtyReceived: 10 },
      { grId: "GR-3", poId: "PO-3", lineNo: 1, qtyReceived: 4 },
    ],
  };
  const invoiceLines = [];
  const flagged = flagMissingInvoices(poLines, goodsReceipts, invoiceLines, { asOfDate: "2026-12-31", missingInvoiceGraceDays: 30 });
  assert.deepEqual(flagged, [
    {
      exceptionId: "MISSING_INVOICE:PO-1:1:",
      reasonCode: "MISSING_INVOICE",
      poId: "PO-1",
      lineNo: 1,
      detail: { poId: "PO-1", lineNo: 1, receiptDate: "2026-01-01", daysSinceReceipt: 364 },
    },
  ]);
});

test("flagDuplicateInvoices: flags every invoice in a same-vendor/PO/amount group of 2+", () => {
  const invoiceHeaders = [
    { invoiceId: "INV-1", vendorId: "V-1", poId: "PO-1", totalMinor: 10000 },
    { invoiceId: "INV-2", vendorId: "V-1", poId: "PO-1", totalMinor: 10000 }, // duplicate of INV-1
    { invoiceId: "INV-3", vendorId: "V-2", poId: "PO-2", totalMinor: 10000 }, // unique
  ];
  const flagged = flagDuplicateInvoices(invoiceHeaders);
  assert.deepEqual(
    flagged.map((f) => f.invoiceId).sort(),
    ["INV-1", "INV-2"]
  );
  assert.equal(flagged[0].detail.duplicateCount, 2);
});

test("flagInvoiceBeforePO: flags an invoice dated before its PO", () => {
  const poHeaders = [{ poId: "PO-1", poDate: "2026-06-15" }];
  const invoiceHeaders = [
    { invoiceId: "INV-1", poId: "PO-1", issueDate: "2026-06-10" }, // before
    { invoiceId: "INV-2", poId: "PO-1", issueDate: "2026-06-20" }, // after
  ];
  const flagged = flagInvoiceBeforePO(poHeaders, invoiceHeaders);
  assert.deepEqual(flagged, [
    {
      exceptionId: "INVOICE_BEFORE_PO:PO-1::INV-1",
      reasonCode: "INVOICE_BEFORE_PO",
      poId: "PO-1",
      invoiceId: "INV-1",
      detail: { poId: "PO-1", invoiceId: "INV-1", poDate: "2026-06-15", issueDate: "2026-06-10" },
    },
  ]);
});

test("flagVatMismatches: flags declared VAT that doesn't match the recomputed amount", () => {
  const invoiceHeaders = [
    { invoiceId: "INV-1", poId: "PO-1", taxableAmountMinor: 100000, vatAmountMinor: 5000 }, // correct (5%)
    { invoiceId: "INV-2", poId: "PO-2", taxableAmountMinor: 100000, vatAmountMinor: 0 }, // forgot VAT
  ];
  const flagged = flagVatMismatches(invoiceHeaders);
  assert.deepEqual(flagged, [
    {
      exceptionId: "VAT_MISCALC:PO-2::INV-2",
      reasonCode: "VAT_MISCALC",
      poId: "PO-2",
      invoiceId: "INV-2",
      detail: { poId: "PO-2", invoiceId: "INV-2", taxableAmountMinor: 100000, declaredVatMinor: 0, expectedVatMinor: 5000 },
    },
  ]);
});

test("runThreeWayMatch: combines every check into one flat list", () => {
  const dataset = {
    purchaseOrders: { headers: [{ poId: "PO-1", poDate: "2026-06-15" }], lines: [{ poId: "PO-1", lineNo: 1, qtyOrdered: 10, unitPriceMinor: 10000 }] },
    goodsReceipts: { headers: [{ grId: "GR-1", receiptDate: "2026-06-16" }], lines: [{ grId: "GR-1", poId: "PO-1", lineNo: 1, qtyReceived: 10 }] },
    invoices: {
      headers: [{ invoiceId: "INV-1", poId: "PO-1", vendorId: "V-1", issueDate: "2026-06-10", taxableAmountMinor: 120000, vatAmountMinor: 0, totalMinor: 120000 }],
      lines: [{ poId: "PO-1", lineNo: 1, invoiceId: "INV-1", qtyInvoiced: 12, unitPriceMinor: 10000 }],
    },
  };
  const reasonCodes = runThreeWayMatch(dataset, { priceVarianceBps: 500, vatRateBps: 500, vatToleranceMinor: 1, asOfDate: "2026-12-31", missingInvoiceGraceDays: 30 })
    .map((f) => f.reasonCode)
    .sort();
  // qty 12 > received 10 -> QTY_MISMATCH; price 10000 matches PO -> no PRICE_VARIANCE;
  // invoice dated before PO -> INVOICE_BEFORE_PO; vat declared 0 vs expected 6000 -> VAT_MISCALC.
  assert.deepEqual(reasonCodes, ["INVOICE_BEFORE_PO", "QTY_MISMATCH", "VAT_MISCALC"]);
});
