import React, { useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import ControlTestCard from "./ControlTestCard.jsx";
import { downloadFindingsCsv } from "./csvExport.js";

/**
 * Renders the list of control-test findings with a confirm/clear disposition per finding. A
 * human reviewer's decision is kept in-memory for the session, same pattern as ExceptionQueue.jsx.
 * @param {{findings: Array<object>}} props
 */
export default function ControlTestQueue({ findings }) {
  const { t } = useI18n();
  const [decisions, setDecisions] = useState({});

  function handleDecide(testId, status, reviewer) {
    setDecisions((prev) => ({ ...prev, [testId]: { status, reviewer: reviewer?.trim() || null, timestamp: new Date().toISOString() } }));
  }

  function handleExport() {
    downloadFindingsCsv("controls-findings.csv", findings, decisions, {
      idKey: (f) => f.testId,
      reasonLabel: (f) => t(`controls.reason.${f.reasonCode}`),
    });
  }

  const pending = findings.filter((f) => !decisions[f.testId]);
  const reviewed = findings.filter((f) => decisions[f.testId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("controls.queue.title")} — {pending.length === 0 ? t("controls.queue.empty") : t("controls.queue.pendingCount", { count: pending.length })}
          </h3>
          <button type="button" onClick={handleExport} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900">
            <Download className="h-3.5 w-3.5" aria-hidden /> {t("common.exportCsv")}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {pending.map((finding) => (
            <ControlTestCard key={finding.testId} finding={finding} onDecide={handleDecide} />
          ))}
        </div>
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("controls.reviewed.title")}</h3>
          <div className="mt-3 space-y-3">
            {reviewed.map((finding) => (
              <ControlTestCard key={finding.testId} finding={finding} decision={decisions[finding.testId]} onDecide={handleDecide} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
