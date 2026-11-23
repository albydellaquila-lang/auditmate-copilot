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
 * A GL journal-entry-testing finding card — same no-AI, confirm/clear pattern as
 * ControlTestCard.jsx (there is no document to extract here either, every check runs directly
 * on structured GL fields), kept as a parallel component rather than a shared generalization.
 * @param {{finding: {id:string, reasonCode:string, detail:object}, decision?: object, onDecide: (id:string, status:string, reviewer:string) => void}} props
 */
export default function GLFindingCard({ finding, decision, onDecide }) {
  const { t } = useI18n();
  const [reviewer, setReviewer] = useState("");
  const displayParams = toDisplayParams(finding.detail);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {t(`gl.reason.${finding.reasonCode}`)}
        </span>
        {decision && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${decision.status === "confirmed" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-700"}`}>
            {decision.reviewer
              ? t(`gl.decision.${decision.status}.by`, { reviewer: decision.reviewer })
              : t(`gl.decision.${decision.status}`)}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-700">{t(`gl.detail.${finding.reasonCode}`, displayParams)}</p>

      {!decision && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder={t("gl.reviewerPlaceholder")}
            aria-label={t("gl.reviewerLabel")}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onDecide(finding.id, "confirmed", reviewer)}
            className="flex items-center gap-1 rounded-md bg-rose-700 px-3 py-1 text-sm font-medium text-white hover:bg-rose-800"
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> {t("gl.action.confirm")}
          </button>
          <button
            type="button"
            onClick={() => onDecide(finding.id, "cleared", reviewer)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden /> {t("gl.action.clear")}
          </button>
        </div>
      )}
    </article>
  );
}
