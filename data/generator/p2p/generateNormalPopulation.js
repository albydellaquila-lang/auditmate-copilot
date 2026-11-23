// "Normal" Procure-to-Pay population: every PO is fully received and fully invoiced at the
// PO's own price and quantity, so it is a perfect 3-way match with zero engine flags — the
// P2P analogue of Sprint 1's "normal GL population balances" invariant.
import { VENDORS, PREPARERS } from "../company.js";
import { addDays } from "../jeUtils.js";
import { ITEM_CATALOG } from "./catalog.js";
import { buildPo, buildGr, buildInvoice } from "./p2pUtils.js";

/**
 * @param {import("../rng.js").createRng extends (...a:any)=>infer R ? R : never} rng
 * @param {{poCount?: number}} [opts]
 */
export function generateNormalP2PPopulation(rng, { poCount = 40 } = {}) {
  const purchaseOrders = { headers: [], lines: [] };
  const goodsReceipts = { headers: [], lines: [] };
  const invoices = { headers: [], lines: [] };

  for (let i = 1; i <= poCount; i++) {
    const poId = `PO-${String(i).padStart(4, "0")}`;
    const vendorId = rng.pick(VENDORS).id;
    const month = rng.int(1, 10);
    const day = rng.int(1, 28);
    const poDate = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const lineCount = rng.int(1, 3);
    const items = rng.shuffle(ITEM_CATALOG).slice(0, lineCount);
    const lines = items.map((item) => ({ itemCode: item.itemCode, qtyOrdered: rng.int(1, 20) }));

    const po = buildPo(poId, { vendorId, poDate, lines });
    purchaseOrders.headers.push(po.header);
    purchaseOrders.lines.push(...po.lines);

    const qtyByLine = Object.fromEntries(po.lines.map((l) => [l.lineNo, l.qtyOrdered]));
    const receiptDate = addDays(poDate, rng.int(3, 10));
    const gr = buildGr(`GR-${String(i).padStart(4, "0")}`, poId, {
      receiptDate, receivedBy: rng.pick(PREPARERS).id, poLines: po.lines, qtyReceivedByLine: qtyByLine,
    });
    goodsReceipts.headers.push(gr.header);
    goodsReceipts.lines.push(...gr.lines);

    const issueDate = addDays(receiptDate, rng.int(1, 5));
    const invoice = buildInvoice(`INV-${String(i).padStart(4, "0")}`, poId, {
      vendorId, issueDate, poLines: po.lines, qtyInvoicedByLine: qtyByLine,
    });
    invoices.headers.push(invoice.header);
    invoices.lines.push(...invoice.lines);
  }

  return { purchaseOrders, goodsReceipts, invoices };
}
