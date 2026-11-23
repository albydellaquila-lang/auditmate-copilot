import React, { useMemo } from "react";
import { useI18n } from "../i18n/index.jsx";
import { formatMinor } from "../engines/money.js";
import { vendorConcentration } from "../engines/concentration.js";

// Source: generic HHI thresholds (US DOJ/FTC Horizontal Merger Guidelines convention, widely
// reused outside antitrust as a rule of thumb) — a configurable assumption, not a fixed rule.
function hhiBand(hhi) {
  if (hhi >= 2500) return "high";
  if (hhi >= 1500) return "moderate";
  return "low";
}
const HHI_STYLE = { high: "bg-rose-100 text-rose-800", moderate: "bg-amber-100 text-amber-800", low: "bg-teal-100 text-teal-800" };

/**
 * Vendor spend concentration (src/engines/concentration.js — HHI, cited there).
 * @param {{lines: Array<object>, vendorNameById: Record<string,string>}} props
 */
export default function VendorConcentrationPanel({ lines, vendorNameById }) {
  const { t } = useI18n();
  const { hhi, totalMinor, ranked } = useMemo(() => vendorConcentration(lines), [lines]);
  const band = hhiBand(hhi);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t("gl.concentration.title")}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${HHI_STYLE[band]}`}>{t(`gl.concentration.band.${band}`, { hhi: Math.round(hhi) })}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t("gl.concentration.total", { total: formatMinor(totalMinor) })}</p>
      <div className="mt-3 space-y-1.5">
        {ranked.slice(0, 5).map((r) => (
          <div key={r.vendorId} className="flex items-center justify-between text-sm">
            <span className="truncate text-slate-700">{vendorNameById[r.vendorId] ?? r.vendorId}</span>
            <span className="shrink-0 font-mono text-xs text-slate-500">{formatMinor(r.spendMinor)} · {(r.shareBps / 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
