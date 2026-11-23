import React, { useMemo } from "react";
import { useI18n } from "../i18n/index.jsx";
import { benfordMeanAbsoluteDeviation, expectedBenfordFrequency } from "../engines/benford.js";

const CONFORMITY_STYLE = {
  close: "bg-teal-100 text-teal-800",
  acceptable: "bg-teal-100 text-teal-800",
  marginal: "bg-amber-100 text-amber-800",
  nonconforming: "bg-rose-100 text-rose-800",
};
const CHART_HEIGHT_PX = 96;
const MAX_FREQUENCY = 0.32; // just above digit 1's expected ~0.301, a fixed scale so bars are comparable across seeds

/**
 * Benford's Law first-digit distribution: observed vs. expected frequency per leading digit,
 * plus the Mean Absolute Deviation conformity band (src/engines/benford.js already cites its
 * sources — Newcomb-Benford Law, Nigrini 2012 MAD bands).
 * @param {{amountsMinor: number[]}} props nonzero integer minor-unit amounts to analyze
 */
export default function BenfordPanel({ amountsMinor }) {
  const { t } = useI18n();
  const { mad, conformity, distribution } = useMemo(() => benfordMeanAbsoluteDeviation(amountsMinor), [amountsMinor]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t("gl.benford.title")}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFORMITY_STYLE[conformity]}`}>
          {t(`gl.benford.conformity.${conformity}`)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t("gl.benford.mad", { mad: mad.toFixed(4) })}</p>

      <div className="mt-4 flex items-end justify-between gap-2" style={{ height: CHART_HEIGHT_PX }}>
        {distribution.frequencies.map((freq, i) => {
          const digit = i + 1;
          const expected = expectedBenfordFrequency(digit);
          return (
            <div key={digit} className="flex flex-1 items-end justify-center gap-0.5" style={{ height: "100%" }}>
              <div className="w-2.5 rounded-t bg-teal-600" style={{ height: `${Math.min(1, freq / MAX_FREQUENCY) * 100}%` }} title={`observed ${(freq * 100).toFixed(1)}%`} />
              <div className="w-2.5 rounded-t border border-dashed border-slate-400" style={{ height: `${Math.min(1, expected / MAX_FREQUENCY) * 100}%` }} title={`expected ${(expected * 100).toFixed(1)}%`} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        {distribution.frequencies.map((_, i) => (
          <span key={i} className="flex-1 text-center">{i + 1}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-teal-600" /> {t("gl.benford.observed")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm border border-dashed border-slate-400" /> {t("gl.benford.expected")}</span>
      </div>
    </div>
  );
}
