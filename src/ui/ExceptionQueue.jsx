import React, { useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import ExceptionCard from "./ExceptionCard.jsx";
import { downloadFindingsCsv } from "./csvExport.js";

/**
 * Renders the list of 3-way-match exceptions with an accept/reject action per exception. A
 * human reviewer's decision is kept in-memory for the session (CLAUDE.md: "a human reviewer
 * approves or rejects every exception"); nothing here computes or re-decides anything the
 * engine already decided — it only records what the reviewer chose.
 * @param {{exceptions: Array<object>, invoicesById: object, vendorNameById: object, buyerName: string}} props
 */
export default function ExceptionQueue({ exceptions, invoicesById, vendorNameById, buyerName }) {
  const { t } = useI18n();
  const [decisions, setDecisions] = useState({});

  function handleDecide(exceptionId, status, reviewer) {
    setDecisions((prev) => ({ ...prev, [exceptionId]: { status, reviewer: reviewer?.trim() || null, timestamp: new Date().toISOString() } }));
  }

  function handleExport() {
    downloadFindingsCsv("match-exceptions.csv", exceptions, decisions, {
      idKey: (e) => e.exceptionId,
      reasonLabel: (e) => t(`match.reason.${e.reasonCode}`),
    });
  }

  const pending = exceptions.filter((e) => !decisions[e.exceptionId]);
  const reviewed = exceptions.filter((e) => decisions[e.exceptionId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("match.queue.title")} — {pending.length === 0 ? t("match.queue.empty") : t("match.queue.pendingCount", { count: pending.length })}
          </h3>
          <button type="button" onClick={handleExport} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900">
            <Download className="h-3.5 w-3.5" aria-hidden /> {t("common.exportCsv")}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {pending.map((exception) => (
            <ExceptionCard key={exception.exceptionId} exception={exception} onDecide={handleDecide} invoicesById={invoicesById} vendorNameById={vendorNameById} buyerName={buyerName} />
          ))}
        </div>
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("match.reviewed.title")}</h3>
          <div className="mt-3 space-y-3">
            {reviewed.map((exception) => (
              <ExceptionCard key={exception.exceptionId} exception={exception} decision={decisions[exception.exceptionId]} onDecide={handleDecide} invoicesById={invoicesById} vendorNameById={vendorNameById} buyerName={buyerName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
