import React, { useMemo } from "react";
import { useI18n } from "../i18n/index.jsx";
import { formatMinor } from "../engines/money.js";
import { computeMonthlyAccountActivity, flagSignificantVariances } from "../engines/analyticalProcedures.js";

/**
 * ISA 520 analytical procedures: month-over-month net activity per account, flagging swings
 * beyond a configurable threshold (src/engines/analyticalProcedures.js cites ISA 520).
 * @param {{headers: object[], lines: object[], accountNameById: Record<string,string>}} props
 */
export default function AnalyticalProceduresPanel({ headers, lines, accountNameById }) {
  const { t } = useI18n();
  const activity = useMemo(() => computeMonthlyAccountActivity(headers, lines), [headers, lines]);
  // AED 5,000 materiality floor: excludes swings on immaterial balances, where a tiny base
  // amount would otherwise make an ordinary change read as a meaningless huge percentage.
  const flagged = useMemo(() => flagSignificantVariances(activity, { materialityFloorMinor: 500000 }), [activity]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t("gl.analytics.title")}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{t("gl.analytics.transitionsAnalyzed", { count: activity.length })}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t("gl.analytics.body")}</p>

      {flagged.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t("gl.analytics.none")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-3 font-medium">{t("gl.analytics.account")}</th>
                <th className="pb-2 pr-3 font-medium">{t("gl.analytics.period")}</th>
                <th className="pb-2 pr-3 text-right font-medium">{t("gl.analytics.previous")}</th>
                <th className="pb-2 pr-3 text-right font-medium">{t("gl.analytics.current")}</th>
                <th className="pb-2 text-right font-medium">{t("gl.analytics.variance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flagged.map((f) => (
                <tr key={`${f.accountId}-${f.period}`}>
                  <td className="py-1.5 pr-3 text-slate-700">{accountNameById[f.accountId] ?? f.accountId}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">{f.previousPeriod} → {f.period}</td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs text-slate-500">{formatMinor(Math.abs(f.previousNetMinor))}</td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs text-slate-500">{formatMinor(Math.abs(f.currentNetMinor))}</td>
                  <td className="py-1.5 text-right font-mono text-xs font-semibold text-rose-700">{(f.varianceBps / 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
