import React, { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";
import { generateGlDataset } from "../../data/generator/index.js";
import { CHART_OF_ACCOUNTS, VENDORS } from "../../data/generator/company.js";
import { findUnbalancedEntries } from "../engines/balancing.js";
import { runJetRiskCriteria } from "../engines/jetRiskCriteria.js";
import { flagCutoffEntries } from "../engines/cutoff.js";
import { findNewVendors } from "../engines/newVendor.js";
import GLFindingQueue from "./GLFindingQueue.jsx";
import BenfordPanel from "./BenfordPanel.jsx";
import VendorConcentrationPanel from "./VendorConcentrationPanel.jsx";
import AnalyticalProceduresPanel from "./AnalyticalProceduresPanel.jsx";

const DEFAULT_SEED = 42;

// Reason codes that already come shaped {jeId, reasonCode, detail} — just need jeId folded into
// detail (for i18n interpolation) and a stable composite id. Some checks (e.g. unusual preparer,
// round amount, new vendor) flag per LINE, so the same reasonCode+jeId can legitimately appear
// more than once (both lines of a balanced entry tripping the same rule) — an index keeps ids
// unique without discarding any of those findings.
function withId(items) {
  return items.map((f, index) => {
    const detail = { jeId: f.jeId, ...f.detail };
    if (Array.isArray(detail.allowedRoles)) detail.allowedRoles = detail.allowedRoles.join(", ");
    return { id: `${f.reasonCode}:${f.jeId}:${index}`, reasonCode: f.reasonCode, jeId: f.jeId, detail };
  });
}

export default function GLModule({ onBack }) {
  const { t } = useI18n();
  const [seed, setSeed] = useState(DEFAULT_SEED);

  const dataset = useMemo(() => generateGlDataset({ seed }), [seed]);
  const { headers, lines, config } = dataset;

  const findings = useMemo(() => {
    const balancing = findUnbalancedEntries(lines).map((f, index) => ({
      id: `BALANCING:${f.jeId}:${index}`,
      reasonCode: "BALANCING",
      jeId: f.jeId,
      detail: { jeId: f.jeId, totalDebitMinor: f.totalDebitMinor, totalCreditMinor: f.totalCreditMinor, diffMinor: f.diffMinor },
    }));
    return [
      ...balancing,
      ...withId(runJetRiskCriteria({ headers, lines }, config)),
      ...withId(flagCutoffEntries(headers, lines, config)),
      ...withId(findNewVendors(lines, headers, config)),
    ];
  }, [headers, lines, config]);

  const amountsMinor = useMemo(() => lines.flatMap((l) => [l.debitMinor, l.creditMinor]).filter((a) => a > 0), [lines]);
  const accountNameById = useMemo(() => Object.fromEntries(CHART_OF_ACCOUNTS.map((a) => [a.id, a.name])), []);
  const vendorNameById = useMemo(() => Object.fromEntries(VENDORS.map((v) => [v.id, v.name])), []);

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("gl.backToDashboard")}
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("module.gl.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("module.gl.body")}</p>
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

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <BenfordPanel amountsMinor={amountsMinor} />
        <VendorConcentrationPanel lines={lines} vendorNameById={vendorNameById} />
        <div className="md:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">{t("gl.summary.title")}</h3>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{findings.length}</p>
            <p className="text-xs text-slate-500">{t("gl.summary.body", { count: headers.length })}</p>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <AnalyticalProceduresPanel headers={headers} lines={lines} accountNameById={accountNameById} />
      </section>

      <section className="mt-6">
        <GLFindingQueue findings={findings} />
      </section>
    </div>
  );
}
