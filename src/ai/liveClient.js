// Live-mode extension point: calls the existing /api/anthropic dev proxy (vite.config.js),
// which injects the server-side ANTHROPIC_API_KEY and never exposes it to the browser. This
// path cannot be exercised without a configured key, so it is written but not covered by an
// automated test — see test/demoReplay.test.mjs for the mode this project actually ships with.
import { buildInvoiceExtractionPrompt } from "./promptBuilder.js";
import { validateExtraction } from "./extractionSchema.js";

/**
 * @param {string} rawDocumentText
 * @returns {Promise<import("./extractionSchema.js").InvoiceExtraction>}
 */
export async function requestLiveExtraction(rawDocumentText) {
  const prompt = buildInvoiceExtractionPrompt(rawDocumentText);
  const res = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: import.meta.env?.VITE_ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Live extraction request failed: ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.content?.[0]?.text ?? "{}");
  const { valid, errors } = validateExtraction(parsed);
  if (!valid) throw new Error(`Live extraction did not match the expected schema: ${errors.join("; ")}`);
  return parsed;
}
