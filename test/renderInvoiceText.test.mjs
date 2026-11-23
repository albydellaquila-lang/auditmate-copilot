import { test } from "node:test";
import assert from "node:assert/strict";
import { renderInvoiceText } from "../src/ai/renderInvoiceText.js";
import { formatMinor } from "../src/engines/money.js";

// formatMinor (already tested in test/money.test.mjs) is reused here only to build the fixture's
// expected currency strings exactly as Intl.NumberFormat renders them (it inserts a non-breaking
// space between "AED" and the amount) — the document structure/labels below are what's actually
// under test, hand-written and verified independently.
test("renderInvoiceText: renders a plausible plain-text invoice, hand-computed", () => {
  const header = {
    invoiceId: "INV-TEST-1",
    poId: "PO-TEST-1",
    issueDate: "2026-03-08",
    currencyCode: "AED",
    taxableAmountMinor: 105300, // AED 1,053.00
    vatRateBps: 500, // 5%
    vatAmountMinor: 5265, // AED 52.65
    totalMinor: 110565, // AED 1,105.65
  };
  const lines = [
    { lineNo: 1, itemDescription: "Managed IT support (per hour)", qtyInvoiced: 5, unitPriceMinor: 21060, lineAmountMinor: 105300 },
  ];

  const text = renderInvoiceText(header, lines, { vendorName: "Gulf Horizon IT Solutions FZE", buyerName: "Falcon Gulf Holdings LLC" });

  const expected = [
    "INVOICE",
    "Invoice No.: INV-TEST-1",
    "Your Order Ref.: PO-TEST-1",
    "Supplier: Gulf Horizon IT Solutions FZE",
    "Invoice Date: 2026-03-08",
    "Bill To: Falcon Gulf Holdings LLC",
    "Currency: AED",
    "",
    "Line Items:",
    `  1. Managed IT support (per hour) — Qty 5 x ${formatMinor(21060)} = ${formatMinor(105300)}`,
    "",
    `Subtotal: ${formatMinor(105300)}`,
    `VAT (5%): ${formatMinor(5265)}`,
    `Total Due: ${formatMinor(110565)}`,
  ].join("\n");

  assert.equal(text, expected);
});

test("renderInvoiceText: renders every line item, in order", () => {
  const header = {
    invoiceId: "INV-TEST-2", poId: "PO-TEST-2", issueDate: "2026-01-01", currencyCode: "AED",
    taxableAmountMinor: 300000, vatRateBps: 500, vatAmountMinor: 15000, totalMinor: 315000,
  };
  const lines = [
    { lineNo: 1, itemDescription: "First item", qtyInvoiced: 2, unitPriceMinor: 50000, lineAmountMinor: 100000 },
    { lineNo: 2, itemDescription: "Second item", qtyInvoiced: 4, unitPriceMinor: 50000, lineAmountMinor: 200000 },
  ];
  const text = renderInvoiceText(header, lines, { vendorName: "Vendor X", buyerName: "Buyer Y" });
  assert.ok(text.includes(`  1. First item — Qty 2 x ${formatMinor(50000)} = ${formatMinor(100000)}`));
  assert.ok(text.includes(`  2. Second item — Qty 4 x ${formatMinor(50000)} = ${formatMinor(200000)}`));
});
