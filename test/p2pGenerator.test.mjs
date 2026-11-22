import { test } from "node:test";
import assert from "node:assert/strict";
import { generateP2PDataset } from "../data/generator/p2p/index.js";
import {
  flagQuantityMismatches,
  flagPriceVariances,
  flagMissingGoodsReceipts,
  flagMissingInvoices,
  flagDuplicateInvoices,
  flagInvoiceBeforePO,
  flagVatMismatches,
  runThreeWayMatch,
} from "../src/engines/threeWayMatch.js";

test("generateP2PDataset: is deterministic for a given seed", () => {
  const a = generateP2PDataset({ seed: 7 });
  const b = generateP2PDataset({ seed: 7 });
  assert.deepEqual(a, b);

  const c = generateP2PDataset({ seed: 8 });
  assert.notDeepEqual(a.purchaseOrders, c.purchaseOrders);
});

test("generateP2PDataset: the normal population is a perfect 3-way match (zero exceptions)", () => {
  const { purchaseOrders, goodsReceipts, invoices, answerKey, config } = generateP2PDataset({ seed: 7 });
  const anomalyPoIds = new Set(answerKey.flatMap((a) => a.poIds));
  const normal = {
    purchaseOrders: { headers: purchaseOrders.headers.filter((h) => !anomalyPoIds.has(h.poId)), lines: purchaseOrders.lines.filter((l) => !anomalyPoIds.has(l.poId)) },
    goodsReceipts: { headers: goodsReceipts.headers.filter((h) => !anomalyPoIds.has(h.poId)), lines: goodsReceipts.lines.filter((l) => !anomalyPoIds.has(l.poId)) },
    invoices: { headers: invoices.headers.filter((h) => !anomalyPoIds.has(h.poId)), lines: invoices.lines.filter((l) => !anomalyPoIds.has(l.poId)) },
  };
  assert.deepEqual(runThreeWayMatch(normal, config), []);
});

test("generateP2PDataset: every planted exception is found by its matching engine check", () => {
  const dataset = generateP2PDataset({ seed: 7 });
  const { purchaseOrders, goodsReceipts, invoices, answerKey, config } = dataset;

  for (const entry of answerKey) {
    let flagged;
    switch (entry.checkCode) {
      case "QTY_MISMATCH":
        flagged = flagQuantityMismatches(purchaseOrders.lines, goodsReceipts.lines, invoices.lines, config);
        for (const poId of entry.poIds) assert.ok(flagged.some((f) => f.poId === poId), `QTY_MISMATCH: expected ${poId} to be flagged`);
        break;
      case "PRICE_VARIANCE":
        flagged = flagPriceVariances(purchaseOrders.lines, invoices.lines, config);
        for (const invoiceId of entry.invoiceIds) assert.ok(flagged.some((f) => f.invoiceId === invoiceId), `PRICE_VARIANCE: expected ${invoiceId} to be flagged`);
        break;
      case "MISSING_GR":
        flagged = flagMissingGoodsReceipts(goodsReceipts.lines, invoices.lines);
        for (const invoiceId of entry.invoiceIds) assert.ok(flagged.some((f) => f.invoiceId === invoiceId), `MISSING_GR: expected ${invoiceId} to be flagged`);
        break;
      case "MISSING_INVOICE":
        flagged = flagMissingInvoices(purchaseOrders.lines, goodsReceipts, invoices.lines, config);
        for (const poId of entry.poIds) assert.ok(flagged.some((f) => f.poId === poId), `MISSING_INVOICE: expected ${poId} to be flagged`);
        break;
      case "DUPLICATE_INVOICE":
        flagged = flagDuplicateInvoices(invoices.headers);
        for (const invoiceId of entry.invoiceIds) assert.ok(flagged.some((f) => f.invoiceId === invoiceId), `DUPLICATE_INVOICE: expected ${invoiceId} to be flagged`);
        break;
      case "INVOICE_BEFORE_PO":
        flagged = flagInvoiceBeforePO(purchaseOrders.headers, invoices.headers);
        for (const invoiceId of entry.invoiceIds) assert.ok(flagged.some((f) => f.invoiceId === invoiceId), `INVOICE_BEFORE_PO: expected ${invoiceId} to be flagged`);
        break;
      case "VAT_MISCALC":
        flagged = flagVatMismatches(invoices.headers, config);
        for (const invoiceId of entry.invoiceIds) assert.ok(flagged.some((f) => f.invoiceId === invoiceId), `VAT_MISCALC: expected ${invoiceId} to be flagged`);
        break;
      default:
        throw new Error(`p2pGenerator.test.mjs: no engine wired for check code ${entry.checkCode}`);
    }
  }
});
