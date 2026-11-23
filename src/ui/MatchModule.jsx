import React, { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { generateP2PDataset } from "../../data/generator/p2p/index.js";
import { COMPANY, VENDORS } from "../../data/generator/company.js";
import { runThreeWayMatch } from "../engines/threeWayMatch.js";
import ExceptionQueue from "./ExceptionQueue.jsx";

const REASON_CODES = ["QTY_MISMATCH", "PRICE_VARIANCE", "MISSING_GR", "MISSING_INVOICE", "DUPLICATE_INVOICE", "INVOICE_BEFORE_PO", "VAT_MISCALC"];

export default function MatchModule({ onBack }) {
  const { t } = useI18n();

  const dataset = useMemo(() => generateP2PDataset(), []);
  const exceptions = useMemo(() => runThreeWayMatch(dataset, dataset.config), [dataset]);

  // Looked up by ExceptionCard to render AI evidence: the actual invoice document (for live-mode
  // extraction) plus display names for the vendor/buyer named on it.
  const invoicesById = useMemo(() => {
    const map = {};
    for (const header of dataset.invoices.headers) map[header.invoiceId] = { header, lines: [] };
    for (const line of dataset.invoices.lines) map[line.invoiceId]?.lines.push(line);
    return map;
  }, [dataset]);
  const vendorNameById = useMemo(() => Object.fromEntries(VENDORS.map((v) => [v.id, v.name])), []);

  const countsByReason = useMemo(() => {
    const counts = Object.fromEntries(REASON_CODES.map((c) => [c, 0]));
    for (const e of exceptions) counts[e.reasonCode] = (counts[e.reasonCode] ?? 0) + 1;
    return counts;
  }, [exceptions]);

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("match.backToDashboard")}
      </button>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("module.match.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("module.match.body")}</p>

      <div className="mt-4 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-800">{t("match.ai.demoModeNotice")}</div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("match.summary.title")}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {REASON_CODES.map((code) => (
            <span key={code} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
              {t(`match.reason.${code}`)}: <span className="font-semibold">{countsByReason[code]}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <ExceptionQueue exceptions={exceptions} invoicesById={invoicesById} vendorNameById={vendorNameById} buyerName={COMPANY.name} />
      </section>
    </div>
  );
}
