import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_EXTRACTIONS } from "../data/demo/invoiceExtractions.js";
import { getDemoExtraction } from "../src/ai/demoReplay.js";
import { validateExtraction } from "../src/ai/extractionSchema.js";
import { getAiMode } from "../src/ai/mode.js";

test("DEMO_EXTRACTIONS: every recorded fixture is schema-valid", () => {
  for (const [id, extraction] of Object.entries(DEMO_EXTRACTIONS)) {
    const { valid, errors } = validateExtraction(extraction);
    assert.ok(valid, `${id}: ${errors.join("; ")}`);
  }
});

test("DEMO_EXTRACTIONS: has at least 10 fixtures covering normal invoices and exception categories", () => {
  assert.ok(Object.keys(DEMO_EXTRACTIONS).length >= 10);
});

test("getDemoExtraction: returns the fixture for a known id, null for an unknown one", () => {
  assert.equal(getDemoExtraction("INV-0001"), DEMO_EXTRACTIONS["INV-0001"]);
  assert.equal(getDemoExtraction("INV-DOES-NOT-EXIST"), null);
});

test("getAiMode: defaults to demo with no env override", () => {
  assert.equal(getAiMode(), "demo");
});
