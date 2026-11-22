import { test } from "node:test";
import assert from "node:assert/strict";
import { validateExtraction } from "../src/ai/extractionSchema.js";

function field(value, confidenceScore = 0.9, citation = "somewhere on the document") {
  return { value, confidenceScore, citation };
}

function validExtraction() {
  return {
    sourceDocumentId: "INV-0001",
    invoiceId: field("INV-0001"),
    poId: field("PO-0001"),
    vendorId: field("V-03"),
    issueDate: field("2026-01-18"),
    currencyCode: field("AED"),
    lines: [{ lineNo: field(1), itemDescription: field("Laptop docking station"), qtyInvoiced: field(10), unitPriceMinor: field(32000), lineAmountMinor: field(320000) }],
    taxableAmountMinor: field(320000),
    vatAmountMinor: field(16000),
    totalMinor: field(336000),
    overallConfidence: 0.95,
  };
}

test("validateExtraction: accepts a well-formed extraction", () => {
  assert.deepEqual(validateExtraction(validExtraction()), { valid: true, errors: [] });
});

test("validateExtraction: rejects a missing header field", () => {
  const bad = validExtraction();
  delete bad.poId;
  const { valid, errors } = validateExtraction(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.startsWith("poId:")));
});

test("validateExtraction: rejects an out-of-range confidence score", () => {
  const bad = validExtraction();
  bad.vendorId.confidenceScore = 1.5;
  const { valid, errors } = validateExtraction(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("vendorId.confidenceScore")));
});

test("validateExtraction: rejects an empty citation", () => {
  const bad = validExtraction();
  bad.issueDate.citation = "  ";
  const { valid, errors } = validateExtraction(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("issueDate.citation")));
});

test("validateExtraction: rejects a string value for a numeric field", () => {
  const bad = validExtraction();
  bad.totalMinor.value = "336000";
  const { valid, errors } = validateExtraction(bad);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("totalMinor.value")));
});

test("validateExtraction: rejects empty or malformed line arrays", () => {
  assert.equal(validateExtraction({ ...validExtraction(), lines: [] }).valid, false);
  assert.equal(validateExtraction({ ...validExtraction(), lines: "not an array" }).valid, false);
});

test("validateExtraction: rejects a missing/out-of-range overallConfidence", () => {
  const bad = validExtraction();
  delete bad.overallConfidence;
  assert.equal(validateExtraction(bad).valid, false);
  assert.equal(validateExtraction({ ...validExtraction(), overallConfidence: 2 }).valid, false);
});

test("validateExtraction: rejects a non-object input", () => {
  assert.equal(validateExtraction(null).valid, false);
  assert.equal(validateExtraction("not json").valid, false);
});
