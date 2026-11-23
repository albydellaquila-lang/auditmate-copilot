import React, { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { generateGlDataset } from "../../data/generator/index.js";
import { jeTotals } from "../../data/generator/jeUtils.js";
import { parseAmount, formatMinor } from "../engines/money.js";
import { computeMateriality, BENCHMARK_TYPES } from "../engines/materiality.js";
import { computeSampleSize, selectMusSample, RELIABILITY_FACTORS_ZERO_ERRORS } from "../engines/monetaryUnitSampling.js";

const PLANNING_SEED = 42;
const CONFIDENCE_LEVELS = Object.keys(RELIABILITY_FACTORS_ZERO_ERRORS).map(Number).sort((a, b) => a - b);

function parseOrNull(raw) {
  try {
    return parseAmount(raw);
  } catch {
    return null;
  }
}

export default function PlanningModule({ onBack }) {
  const { t } = useI18n();

  // Reused only to pre-fill the materiality calculator with a real figure (booked revenue) and
  // to give the sampling calculator a real population of JE totals to select from — the
  // calculators themselves are otherwise plain, input-driven "what-if" tools.
  const dataset = useMemo(() => generateGlDataset({ seed: PLANNING_SEED }), []);
  const bookedRevenueMinor = useMemo(() => {
    // Gross credits to the revenue account — both normal VAT-output contra-entries and planted
    // anomalies can legitimately debit this account too, so a net figure could go negative
    // (which computeMateriality refuses); gross credits is also the more standard definition
    // of "revenue" as a materiality benchmark anyway.
    return dataset.lines.filter((l) => l.accountId === "4000").reduce((sum, l) => sum + l.creditMinor, 0);
  }, [dataset]);
  const jePopulation = useMemo(
    () => [...jeTotals(dataset.lines)].map(([jeId, { debitMinor }]) => ({ id: jeId, valueMinor: debitMinor })),
    [dataset]
  );
  const populationValueMinor = useMemo(() => jePopulation.reduce((sum, i) => sum + i.valueMinor, 0), [jePopulation]);

  const [benchmarkType, setBenchmarkType] = useState("revenue");
  const [benchmarkValueRaw, setBenchmarkValueRaw] = useState((bookedRevenueMinor / 100).toFixed(2));
  const benchmarkValueMinor = parseOrNull(benchmarkValueRaw);
  const materiality = benchmarkValueMinor != null && benchmarkValueMinor >= 0 ? computeMateriality({ benchmarkType, benchmarkValueMinor }) : null;

  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [tolerableRaw, setTolerableRaw] = useState("");
  const tolerableMisstatementMinor = parseOrNull(tolerableRaw) ?? materiality?.materialityMinor ?? null;
  const sampleSize = tolerableMisstatementMinor > 0 ? computeSampleSize({ populationValueMinor, tolerableMisstatementMinor, confidenceLevel }) : null;
  const selected = sampleSize && sampleSize < jePopulation.length ? selectMusSample(jePopulation, { sampleSize, populationValueMinor }) : [];

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("planning.backToDashboard")}
      </button>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("module.planning.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("module.planning.body")}</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t("planning.materiality.title")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("planning.materiality.body")}</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            {t("planning.materiality.benchmarkType")}
            <select value={benchmarkType} onChange={(e) => setBenchmarkType(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {BENCHMARK_TYPES.map((bt) => (
                <option key={bt} value={bt}>{t(`planning.materiality.benchmark.${bt}`)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            {t("planning.materiality.benchmarkValue")}
            <input
              type="text"
              value={benchmarkValueRaw}
              onChange={(e) => setBenchmarkValueRaw(e.target.value)}
              className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">{t("planning.materiality.prefillNote", { revenue: formatMinor(bookedRevenueMinor) })}</p>

        {materiality ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{t("planning.materiality.result.materiality")}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900">{formatMinor(materiality.materialityMinor)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{t("planning.materiality.result.performance")}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900">{formatMinor(materiality.performanceMaterialityMinor)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{t("planning.materiality.result.clearlyTrivial")}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900">{formatMinor(materiality.clearlyTrivialMinor)}</div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-rose-700">{t("planning.materiality.invalid")}</p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t("planning.sampling.title")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("planning.sampling.body", { population: formatMinor(populationValueMinor), count: jePopulation.length })}</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            {t("planning.sampling.tolerableMisstatement")}
            <input
              type="text"
              value={tolerableRaw}
              onChange={(e) => setTolerableRaw(e.target.value)}
              placeholder={materiality ? (materiality.materialityMinor / 100).toFixed(2) : ""}
              className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            {t("planning.sampling.confidenceLevel")}
            <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(Number(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {CONFIDENCE_LEVELS.map((cl) => (
                <option key={cl} value={cl}>{cl}%</option>
              ))}
            </select>
          </label>
        </div>

        {!sampleSize ? (
          <p className="mt-4 text-sm text-rose-700">{t("planning.sampling.invalid")}</p>
        ) : sampleSize >= jePopulation.length ? (
          // The required sample size can exceed the population when tolerable misstatement is
          // small relative to total population value — standard MUS behaviour, not a bug, but
          // repeating 30+ hits per item is a meaningless way to show it: real practice at this
          // point is to examine the whole population directly instead of "sampling" all of it.
          <p className="mt-4 text-sm text-amber-700">{t("planning.sampling.exceedsPopulation", { sampleSize, count: jePopulation.length })}</p>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-slate-700">{t("planning.sampling.result", { sampleSize })}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <span key={s.id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
                  {s.id}{s.hitCount > 1 ? ` ×${s.hitCount}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
