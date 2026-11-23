import React, { useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import GLFindingCard from "./GLFindingCard.jsx";
import { downloadFindingsCsv } from "./csvExport.js";

/**
 * Renders the list of GL journal-entry-testing findings with a confirm/clear disposition per
 * finding, same in-memory decision pattern as ControlTestQueue.jsx/ExceptionQueue.jsx.
 * @param {{findings: Array<{id:string, reasonCode:string, detail:object}>}} props
 */
export default function GLFindingQueue({ findings }) {
  const { t } = useI18n();
  const [decisions, setDecisions] = useState({});

  function handleDecide(id, status, reviewer) {
    setDecisions((prev) => ({ ...prev, [id]: { status, reviewer: reviewer?.trim() || null, timestamp: new Date().toISOString() } }));
  }

  function handleExport() {
    downloadFindingsCsv("gl-findings.csv", findings, decisions, {
      idKey: (f) => f.id,
      reasonLabel: (f) => t(`gl.reason.${f.reasonCode}`),
    });
  }

  const pending = findings.filter((f) => !decisions[f.id]);
  const reviewed = findings.filter((f) => decisions[f.id]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("gl.queue.title")} — {pending.length === 0 ? t("gl.queue.empty") : t("gl.queue.pendingCount", { count: pending.length })}
          </h3>
          <button type="button" onClick={handleExport} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900">
            <Download className="h-3.5 w-3.5" aria-hidden /> {t("common.exportCsv")}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {pending.map((finding) => (
            <GLFindingCard key={finding.id} finding={finding} onDecide={handleDecide} />
          ))}
        </div>
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("gl.reviewed.title")}</h3>
          <div className="mt-3 space-y-3">
            {reviewed.map((finding) => (
              <GLFindingCard key={finding.id} finding={finding} decision={decisions[finding.id]} onDecide={handleDecide} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
