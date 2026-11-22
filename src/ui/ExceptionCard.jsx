import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { formatMinor } from "../engines/money.js";
import { getDemoExtraction } from "../ai/demoReplay.js";

function toDisplayParams(detail) {
  const params = {};
  for (const [key, value] of Object.entries(detail)) {
    params[key] = key.endsWith("Minor") ? formatMinor(value) : value;
  }
  return params;
}

function AiEvidencePanel({ invoiceId }) {
  const { t } = useI18n();
  const extraction = getDemoExtraction(invoiceId);
  if (!extraction) return <p className="text-sm text-slate-500">{t("match.ai.unavailable")}</p>;

  const fields = [
    { label: t("match.ai.field.invoice"), field: extraction.invoiceId },
    { label: t("match.ai.field.po"), field: extraction.poId },
    { label: t("match.ai.field.vendor"), field: extraction.vendorId },
    { label: t("match.ai.field.issueDate"), field: extraction.issueDate },
    { label: t("match.ai.field.taxableAmount"), field: extraction.taxableAmountMinor, money: true },
    { label: t("match.ai.field.vatAmount"), field: extraction.vatAmountMinor, money: true },
    { label: t("match.ai.field.total"), field: extraction.totalMinor, money: true },
  ];

  return (
    <div className="space-y-2">
      {fields.map(({ label, field, money }) => (
        <div key={label} className="flex items-start justify-between gap-3 text-sm">
          <div>
            <span className="font-medium text-slate-700">{label}: </span>
            <span className="text-slate-900">{money ? formatMinor(field.value) : String(field.value)}</span>
            <div className="text-xs text-slate-500">{t("match.ai.citation", { citation: field.citation })}</div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {t("match.ai.confidence", { pct: Math.round(field.confidenceScore * 100) })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ExceptionCard({ exception, decision, onDecide }) {
  const { t } = useI18n();
  const [showEvidence, setShowEvidence] = useState(false);
  const [reviewer, setReviewer] = useState("");

  const displayParams = toDisplayParams(exception.detail);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {t(`match.reason.${exception.reasonCode}`)}
        </span>
        {decision && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${decision.status === "accepted" ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-800"}`}>
            {decision.reviewer
              ? t(`match.decision.${decision.status}.by`, { reviewer: decision.reviewer })
              : t(`match.decision.${decision.status}`)}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-700">{t(`match.detail.${exception.reasonCode}`, displayParams)}</p>

      <button
        type="button"
        onClick={() => setShowEvidence((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
      >
        {showEvidence ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        {showEvidence ? t("match.ai.hideEvidence") : t("match.ai.showEvidence")}
      </button>
      {showEvidence && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("match.ai.panelTitle")}</div>
          {exception.invoiceId ? <AiEvidencePanel invoiceId={exception.invoiceId} /> : <p className="text-sm text-slate-500">{t("match.ai.noInvoiceDocument")}</p>}
        </div>
      )}

      {!decision && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder={t("match.reviewerPlaceholder")}
            aria-label={t("match.reviewerLabel")}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onDecide(exception.exceptionId, "accepted", reviewer)}
            className="flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> {t("match.action.accept")}
          </button>
          <button
            type="button"
            onClick={() => onDecide(exception.exceptionId, "rejected", reviewer)}
            className="flex items-center gap-1 rounded-md border border-rose-300 px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> {t("match.action.reject")}
          </button>
        </div>
      )}
    </article>
  );
}
