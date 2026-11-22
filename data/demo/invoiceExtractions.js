// Recorded AI responses for demo mode (see README's "Without a key the app runs in demo mode,
// replaying recorded AI responses"). Hand-authored, not generated — these stand in for what a
// real extraction call would return, read by src/ai/demoReplay.js. A few clean/normal invoices
// plus one per 3-way-match exception category that has an invoice document (MISSING_INVOICE has
// none by definition, so it has no fixture — the UI shows a distinct empty state for it).
function field(value, confidenceScore, citation) {
  return { value, confidenceScore, citation };
}

function invoice(sourceDocumentId, { invoiceId, poId, vendorId, issueDate, lines, taxableAmountMinor, vatAmountMinor, totalMinor, overallConfidence = 0.95, vatCitation = "footer, 'VAT 5%' line", vatConfidence = 0.93 }) {
  return {
    sourceDocumentId,
    invoiceId: field(invoiceId, 0.98, "header, 'Invoice No.' field"),
    poId: field(poId, 0.95, "header, 'Your Order Ref.' field"),
    vendorId: field(vendorId, 0.9, "header, supplier block"),
    issueDate: field(issueDate, 0.97, "header, 'Invoice Date' field"),
    currencyCode: field("AED", 0.99, "header, currency code"),
    lines: lines.map((l, i) => ({
      lineNo: field(i + 1, 0.95, `line ${i + 1}`),
      itemDescription: field(l.itemDescription, 0.93, `line ${i + 1}, description`),
      qtyInvoiced: field(l.qtyInvoiced, 0.96, `line ${i + 1}, Qty column`),
      unitPriceMinor: field(l.unitPriceMinor, 0.94, `line ${i + 1}, Unit Price column`),
      lineAmountMinor: field(l.lineAmountMinor, 0.95, `line ${i + 1}, Amount column`),
    })),
    taxableAmountMinor: field(taxableAmountMinor, 0.95, "footer, 'Subtotal' line"),
    vatAmountMinor: field(vatAmountMinor, vatConfidence, vatCitation),
    totalMinor: field(totalMinor, 0.97, "footer, 'Total Due' line"),
    overallConfidence,
  };
}

export const DEMO_EXTRACTIONS = {
  "INV-0001": invoice("INV-0001", {
    invoiceId: "INV-0001", poId: "PO-0001", vendorId: "V-01", issueDate: "2026-01-18",
    lines: [{ itemDescription: "Office stationery bundle", qtyInvoiced: 10, unitPriceMinor: 4500, lineAmountMinor: 45000 }],
    taxableAmountMinor: 45000, vatAmountMinor: 2250, totalMinor: 47250,
  }),
  "INV-0002": invoice("INV-0002", {
    invoiceId: "INV-0002", poId: "PO-0002", vendorId: "V-02", issueDate: "2026-02-14",
    lines: [{ itemDescription: "Managed IT support (per hour)", qtyInvoiced: 5, unitPriceMinor: 18000, lineAmountMinor: 90000 }],
    taxableAmountMinor: 90000, vatAmountMinor: 4500, totalMinor: 94500,
  }),
  "INV-0003": invoice("INV-0003", {
    invoiceId: "INV-0003", poId: "PO-0003", vendorId: "V-04", issueDate: "2026-03-22",
    lines: [{ itemDescription: "Catering package (50 pax)", qtyInvoiced: 2, unitPriceMinor: 120000, lineAmountMinor: 240000 }],
    taxableAmountMinor: 240000, vatAmountMinor: 12000, totalMinor: 252000,
  }),
  "INV-ANOM-QTY-1": invoice("INV-ANOM-QTY-1", {
    invoiceId: "INV-ANOM-QTY-1", poId: "PO-ANOM-QTY-1", vendorId: "V-01", issueDate: "2026-02-08",
    lines: [{ itemDescription: "Office stationery bundle", qtyInvoiced: 15, unitPriceMinor: 4500, lineAmountMinor: 67500 }],
    taxableAmountMinor: 67500, vatAmountMinor: 3375, totalMinor: 70875,
  }),
  "INV-ANOM-PRICE-1": invoice("INV-ANOM-PRICE-1", {
    invoiceId: "INV-ANOM-PRICE-1", poId: "PO-ANOM-PRICE-1", vendorId: "V-03", issueDate: "2026-03-08",
    lines: [{ itemDescription: "Managed IT support (per hour)", qtyInvoiced: 5, unitPriceMinor: 21060, lineAmountMinor: 105300 }],
    taxableAmountMinor: 105300, vatAmountMinor: 5265, totalMinor: 110565,
  }),
  "INV-ANOM-NOGR-1": invoice("INV-ANOM-NOGR-1", {
    invoiceId: "INV-ANOM-NOGR-1", poId: "PO-ANOM-NOGR-1", vendorId: "V-05", issueDate: "2026-04-10",
    lines: [{ itemDescription: "Consulting hours (senior)", qtyInvoiced: 3, unitPriceMinor: 75000, lineAmountMinor: 225000 }],
    taxableAmountMinor: 225000, vatAmountMinor: 11250, totalMinor: 236250,
  }),
  "INV-ANOM-DUP-1A": invoice("INV-ANOM-DUP-1A", {
    invoiceId: "INV-ANOM-DUP-1A", poId: "PO-ANOM-DUP-1", vendorId: "V-08", issueDate: "2026-05-08",
    lines: [{ itemDescription: "Office partition panel", qtyInvoiced: 5, unitPriceMinor: 28000, lineAmountMinor: 140000 }],
    taxableAmountMinor: 140000, vatAmountMinor: 7000, totalMinor: 147000,
  }),
  "INV-ANOM-DUP-1B": invoice("INV-ANOM-DUP-1B", {
    invoiceId: "INV-ANOM-DUP-1B", poId: "PO-ANOM-DUP-1", vendorId: "V-08", issueDate: "2026-05-15",
    lines: [{ itemDescription: "Office partition panel", qtyInvoiced: 5, unitPriceMinor: 28000, lineAmountMinor: 140000 }],
    taxableAmountMinor: 140000, vatAmountMinor: 7000, totalMinor: 147000,
  }),
  "INV-ANOM-SEQ-1": invoice("INV-ANOM-SEQ-1", {
    invoiceId: "INV-ANOM-SEQ-1", poId: "PO-ANOM-SEQ-1", vendorId: "V-10", issueDate: "2026-06-10",
    lines: [{ itemDescription: "Laptop docking station", qtyInvoiced: 6, unitPriceMinor: 32000, lineAmountMinor: 192000 }],
    taxableAmountMinor: 192000, vatAmountMinor: 9600, totalMinor: 201600,
  }),
  "INV-ANOM-VAT-1": invoice("INV-ANOM-VAT-1", {
    invoiceId: "INV-ANOM-VAT-1", poId: "PO-ANOM-VAT-1", vendorId: "V-12", issueDate: "2026-08-08",
    lines: [{ itemDescription: "Laptop docking station", qtyInvoiced: 4, unitPriceMinor: 32000, lineAmountMinor: 128000 }],
    taxableAmountMinor: 128000, vatAmountMinor: 0, totalMinor: 128000,
    vatCitation: "footer, VAT line appears blank", vatConfidence: 0.6, overallConfidence: 0.82,
  }),
};
