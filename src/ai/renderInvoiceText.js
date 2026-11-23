// Renders one invoice (header+lines, already-structured ground-truth data from the P2P
// generator) as plain text, the way an OCR/text-extraction pipeline would hand it to a model.
// Pure formatting only (formatMinor is display-only, per money.js's own contract) — this file
// never computes or validates anything, it only renders what the generator already decided.
import { formatMinor } from "../engines/money.js";

/**
 * @param {{invoiceId:string, poId:string, issueDate:string, currencyCode:string,
 *   taxableAmountMinor:number, vatRateBps:number, vatAmountMinor:number, totalMinor:number}} invoiceHeader
 * @param {Array<{lineNo:number, itemDescription:string, qtyInvoiced:number, unitPriceMinor:number, lineAmountMinor:number}>} invoiceLines
 * @param {{vendorName:string, buyerName:string}} opts
 * @returns {string}
 */
export function renderInvoiceText(invoiceHeader, invoiceLines, { vendorName, buyerName }) {
  const opts = { currency: invoiceHeader.currencyCode };
  const lineItems = invoiceLines
    .map((l) => `  ${l.lineNo}. ${l.itemDescription} — Qty ${l.qtyInvoiced} x ${formatMinor(l.unitPriceMinor, opts)} = ${formatMinor(l.lineAmountMinor, opts)}`)
    .join("\n");

  return [
    "INVOICE",
    `Invoice No.: ${invoiceHeader.invoiceId}`,
    `Your Order Ref.: ${invoiceHeader.poId}`,
    `Supplier: ${vendorName}`,
    `Invoice Date: ${invoiceHeader.issueDate}`,
    `Bill To: ${buyerName}`,
    `Currency: ${invoiceHeader.currencyCode}`,
    "",
    "Line Items:",
    lineItems,
    "",
    `Subtotal: ${formatMinor(invoiceHeader.taxableAmountMinor, opts)}`,
    `VAT (${invoiceHeader.vatRateBps / 100}%): ${formatMinor(invoiceHeader.vatAmountMinor, opts)}`,
    `Total Due: ${formatMinor(invoiceHeader.totalMinor, opts)}`,
  ].join("\n");
}
