// Source: CLAUDE.md rule 5 — "every AI statement cites its source... and every extraction
// carries a confidence value." This module defines that shape and validates it structurally.
// validateExtraction performs shape/type checks only (required keys, confidence bounds,
// non-empty citations, numeric-typed leaves) — it never computes, sums or compares amounts,
// so it stays within the "the LLM never does math" boundary (CLAUDE.md rule 3): checking that a
// number IS a number is not arithmetic on it.
//
// Scope limitation: `citation` is a human-readable locator (e.g. "line 2, Qty column"), not a
// bounding box or OCR coordinate — there is no document-image renderer in this sprint.

/** @typedef {{value: any, confidenceScore: number, citation: string}} ExtractedField */
/**
 * @typedef {{
 *   sourceDocumentId: string,
 *   invoiceId: ExtractedField, poId: ExtractedField, vendorId: ExtractedField,
 *   issueDate: ExtractedField, currencyCode: ExtractedField,
 *   lines: Array<{ lineNo: ExtractedField, itemDescription: ExtractedField,
 *     qtyInvoiced: ExtractedField, unitPriceMinor: ExtractedField, lineAmountMinor: ExtractedField }>,
 *   taxableAmountMinor: ExtractedField, vatAmountMinor: ExtractedField, totalMinor: ExtractedField,
 *   overallConfidence: number
 * }} InvoiceExtraction
 */

const HEADER_FIELD_KEYS = ["invoiceId", "poId", "vendorId", "issueDate", "currencyCode", "taxableAmountMinor", "vatAmountMinor", "totalMinor"];
const LINE_FIELD_KEYS = ["lineNo", "itemDescription", "qtyInvoiced", "unitPriceMinor", "lineAmountMinor"];
const NUMERIC_FIELD_KEYS = new Set(["lineNo", "qtyInvoiced", "unitPriceMinor", "lineAmountMinor", "taxableAmountMinor", "vatAmountMinor", "totalMinor"]);

function validateField(field, name, errors) {
  if (field == null || typeof field !== "object") {
    errors.push(`${name}: missing or not an object`);
    return;
  }
  if (!("value" in field)) errors.push(`${name}: missing value`);
  else if (NUMERIC_FIELD_KEYS.has(name) && typeof field.value !== "number") errors.push(`${name}.value: expected a number, got ${typeof field.value}`);
  if (typeof field.confidenceScore !== "number" || field.confidenceScore < 0 || field.confidenceScore > 1) {
    errors.push(`${name}.confidenceScore: expected a number in [0,1], got ${field.confidenceScore}`);
  }
  if (typeof field.citation !== "string" || field.citation.trim() === "") {
    errors.push(`${name}.citation: expected a non-empty string`);
  }
}

/**
 * Pure shape/type validation of an LLM's structured invoice extraction output against
 * InvoiceExtraction — never math, never a match/exception decision.
 * @param {object} json
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateExtraction(json) {
  const errors = [];
  if (json == null || typeof json !== "object") return { valid: false, errors: ["extraction is not an object"] };

  if (typeof json.sourceDocumentId !== "string" || json.sourceDocumentId.trim() === "") {
    errors.push("sourceDocumentId: expected a non-empty string");
  }
  for (const key of HEADER_FIELD_KEYS) validateField(json[key], key, errors);

  if (!Array.isArray(json.lines) || json.lines.length === 0) {
    errors.push("lines: expected a non-empty array");
  } else {
    json.lines.forEach((line, i) => {
      for (const key of LINE_FIELD_KEYS) validateField(line?.[key], `lines[${i}].${key}`, errors);
    });
  }

  if (typeof json.overallConfidence !== "number" || json.overallConfidence < 0 || json.overallConfidence > 1) {
    errors.push(`overallConfidence: expected a number in [0,1], got ${json.overallConfidence}`);
  }

  return { valid: errors.length === 0, errors };
}
