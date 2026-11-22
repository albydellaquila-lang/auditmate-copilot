import { createRng } from "../rng.js";
import { generateNormalP2PPopulation } from "./generateNormalPopulation.js";
import { injectP2PAnomalies } from "./injectP2PAnomalies.js";

/**
 * @param {{seed?: number, poCount?: number}} [opts]
 * @returns {{purchaseOrders:object, goodsReceipts:object, invoices:object, answerKey:object[], config:object}}
 */
export function generateP2PDataset({ seed = 7, poCount = 40 } = {}) {
  const rng = createRng(seed);
  const normal = generateNormalP2PPopulation(rng, { poCount });
  const { purchaseOrders, goodsReceipts, invoices, answerKey } = injectP2PAnomalies(normal, rng);

  const config = {
    priceVarianceBps: 500, // 5% — configurable assumption
    qtyToleranceUnits: 0,
    vatRateBps: 500, // UAE VAT standard rate
    vatToleranceMinor: 1,
    missingInvoiceGraceDays: 30,
    asOfDate: "2026-12-31",
  };

  return { purchaseOrders, goodsReceipts, invoices, answerKey, config };
}
