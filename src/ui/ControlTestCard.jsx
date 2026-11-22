import React, { useState } from "react";
import { Check, Archive } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { formatMinor } from "../engines/money.js";

function toDisplayParams(detail) {
  const params = {};
  for (const [key, value] of Object.entries(detail)) {
    params[key] = key.endsWith("Minor") ? formatMinor(value) : value;
  }
  return params;
}

/**
 * A test-of-controls finding card: unlike ExceptionCard (3-way match), there is no AI evidence
 * panel here — every test checks structured evidence fields directly, nothing for a model to
 * extract (see controls.noAiNotice). Actions use audit-appropriate language: a human reviewer
 * either confirms a finding as a true deviation or clears it, and that decision is logged
 * (CLAUDE.md rule 6).
 * @param {{finding: object, decision?: object, onDecide: (testId:string, status:string, reviewer:string) => void}} props
 */
export default function ControlTestCard({ finding, decision, onDecide }) {
  const { t } = useI18n();
  const [reviewer, setReviewer] = useState("");
  const displayParams = toDisplayParams(finding.detail);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {t(`controls.reason.${finding.reasonCode}`)}
        </span>
        {decision && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${decision.status === "confirmed" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-700"}`}>
            {decision.reviewer
              ? t(`controls.decision.${decision.status}.by`, { reviewer: decision.reviewer })
              : t(`controls.decision.${decision.status}`)}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-700">{t(`controls.detail.${finding.reasonCode}`, displayParams)}</p>

      {!decision && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder={t("controls.reviewerPlaceholder")}
            aria-label={t("controls.reviewerLabel")}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onDecide(finding.testId, "confirmed", reviewer)}
            className="flex items-center gap-1 rounded-md bg-rose-700 px-3 py-1 text-sm font-medium text-white hover:bg-rose-800"
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> {t("controls.action.confirm")}
          </button>
          <button
            type="button"
            onClick={() => onDecide(finding.testId, "cleared", reviewer)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden /> {t("controls.action.clear")}
          </button>
        </div>
      )}
    </article>
  );
}
