import { DEMO_EXTRACTIONS } from "../../data/demo/invoiceExtractions.js";
import { getAiMode } from "./mode.js";
import { requestLiveExtraction } from "./liveClient.js";

/**
 * @param {string} documentId
 * @returns {import("./extractionSchema.js").InvoiceExtraction | null} the recorded fixture, or
 *   null if none exists for this id (the UI must handle this — it never throws).
 */
export function getDemoExtraction(documentId) {
  return DEMO_EXTRACTIONS[documentId] ?? null;
}

/**
 * @param {string} documentId
 * @param {string} [rawDocumentText] only used in live mode
 * @returns {Promise<import("./extractionSchema.js").InvoiceExtraction | null>}
 */
export async function extractInvoice(documentId, rawDocumentText) {
  if (getAiMode() === "live") return requestLiveExtraction(rawDocumentText);
  return getDemoExtraction(documentId);
}
