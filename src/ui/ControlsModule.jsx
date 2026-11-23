import React, { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { generateControlsDataset, CONTROL_MATRIX } from "../../data/generator/controls/index.js";
import { runControlsTesting } from "../engines/controlsTesting.js";
import ControlTestQueue from "./ControlTestQueue.jsx";

const DEFAULT_SEED = 23;

export default function ControlsModule({ onBack }) {
  const { t } = useI18n();
  const [seed, setSeed] = useState(DEFAULT_SEED);

  const dataset = useMemo(() => generateControlsDataset({ seed }), [seed]);
  const findings = useMemo(() => runControlsTesting(dataset, dataset.config), [dataset]);

  const deviationCountByControl = useMemo(() => {
    const counts = Object.fromEntries(CONTROL_MATRIX.map((c) => [c.controlId, 0]));
    for (const f of findings) counts[f.controlId] = (counts[f.controlId] ?? 0) + 1;
    return counts;
  }, [findings]);

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("controls.backToDashboard")}
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("module.controls.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("module.controls.body")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono">{t("common.seed.label", { seed })}</span>
          <button
            type="button"
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {t("common.seed.regenerate")}
          </button>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-xs text-slate-500">{t("common.seed.notice")}</p>

      <div className="mt-4 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-800">{t("controls.noAiNotice")}</div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("controls.matrix.title")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {CONTROL_MATRIX.map((control) => (
                <tr key={control.controlId}>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t(`controls.component.${control.cosoComponent}`)}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="font-medium text-slate-900">{t(`controls.control.${control.controlId}.title`)}</div>
                    <div className="text-xs text-slate-500">{t(`controls.control.${control.controlId}.description`)}</div>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-slate-600">{t("controls.matrix.sampleSize", { count: dataset[control.sampleKey].length })}</td>
                  <td className="py-2 whitespace-nowrap">
                    <span className={deviationCountByControl[control.controlId] > 0 ? "font-semibold text-rose-700" : "text-slate-500"}>
                      {t("controls.matrix.deviations", { count: deviationCountByControl[control.controlId] })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <ControlTestQueue findings={findings} />
      </section>
    </div>
  );
}
