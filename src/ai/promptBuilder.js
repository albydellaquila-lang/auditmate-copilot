// Source: CLAUDE.md rule 3 ("the LLM never does math") and rule 5 (citations + confidence on
// every extraction). The prompt below is the enforcement mechanism for both rules at the model
// boundary: it asks only for transcription with evidence, and explicitly forbids totaling,
// verifying or correcting any number — all of that is the matching engine's job
// (src/engines/threeWayMatch.js), not the model's.
const SCHEMA_DESCRIPTION = `Return ONLY JSON matching this shape (no prose, no markdown fences):
{
  "sourceDocumentId": string,
  "invoiceId": Field, "poId": Field, "vendorId": Field, "issueDate": Field, "currencyCode": Field,
  "lines": [ { "lineNo": Field, "itemDescription": Field, "qtyInvoiced": Field, "unitPriceMinor": Field, "lineAmountMinor": Field }, ... ],
  "taxableAmountMinor": Field, "vatAmountMinor": Field, "totalMinor": Field,
  "overallConfidence": number (0-1)
}
where Field = { "value": <the transcribed value>, "confidenceScore": number (0-1), "citation": string (a short human-readable locator, e.g. "line 2, Qty column") }.
All *Minor amounts are integer minor currency units (e.g. fils for AED): multiply the printed decimal amount by 100 and round to the nearest integer.`;

/**
 * @param {string} rawDocumentText plain-text transcript of the invoice to extract from
 * @param {{schemaVersion?: string}} [opts]
 * @returns {string} the full prompt to send to the model
 */
export function buildInvoiceExtractionPrompt(rawDocumentText, { schemaVersion = "p2p-invoice-v1" } = {}) {
  return [
    `You are extracting structured fields from an invoice document (schema version: ${schemaVersion}).`,
    "Transcribe exactly what is printed on the document, even if the numbers look internally inconsistent.",
    "Do NOT total, verify, recompute or correct any amount, quantity or tax figure — a separate deterministic system does all matching and arithmetic.",
    "Every field must carry a confidenceScore and a citation pointing to where on the document you read it.",
    "If a field is illegible or absent, still include it with a low confidenceScore and a citation describing where you looked.",
    "",
    SCHEMA_DESCRIPTION,
    "",
    "--- DOCUMENT TEXT ---",
    rawDocumentText,
  ].join("\n");
}
