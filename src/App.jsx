import React, { useState } from "react";
import { ShieldCheck, FileSearch, ListChecks, Scale } from "lucide-react";
import { useI18n, LANGUAGES } from "./i18n/index.jsx";
import MatchModule from "./ui/MatchModule.jsx";

const MODULES = [
  { id: "gl", icon: Scale, status: "inProgress" },
  { id: "match", icon: FileSearch, status: "inProgress" },
  { id: "controls", icon: ListChecks, status: "stretch" },
];

// Modules without a dedicated view yet just show their dashboard card; "match" is the only one
// wired to a real screen so far.
const MODULE_VIEWS = { match: true };

const STATUS_STYLE = {
  inProgress: "bg-amber-100 text-amber-800",
  planned: "bg-slate-200 text-slate-700",
  stretch: "bg-indigo-100 text-indigo-800",
};

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [view, setView] = useState("dashboard");

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-teal-700" aria-hidden />
            <div>
              <div className="text-lg font-semibold tracking-tight">AuditMate Copilot</div>
              <div className="text-xs text-slate-500">{t("app.tagline")}</div>
            </div>
          </div>
          <div role="group" aria-label={t("lang.label")} className="flex rounded-md border border-slate-300 p-0.5 text-xs font-medium">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={`rounded px-2.5 py-1 ${lang === l.code ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "match" ? (
          <MatchModule onBack={() => setView("dashboard")} />
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">{t("app.tagline")}</h1>
            <p className="mt-2 max-w-2xl text-slate-600">{t("app.subtitle")}</p>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {MODULES.map(({ id, icon: Icon, status }) => {
                const hasView = Boolean(MODULE_VIEWS[id]);
                const Tag = hasView ? "button" : "div";
                return (
                  <Tag
                    key={id}
                    type={hasView ? "button" : undefined}
                    onClick={hasView ? () => setView(id) : undefined}
                    className={`rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm ${hasView ? "cursor-pointer hover:border-teal-300 hover:shadow-md" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <Icon className="h-6 w-6 text-teal-700" aria-hidden />
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
                        {t(`status.${status}`)}
                      </span>
                    </div>
                    <h2 className="mt-4 font-semibold">{t(`module.${id}.title`)}</h2>
                    <p className="mt-1 text-sm text-slate-600">{t(`module.${id}.body`)}</p>
                  </Tag>
                );
              })}
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("principles.title")}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>• {t("principles.math")}</li>
                <li>• {t("principles.cite")}</li>
                <li>• {t("principles.human")}</li>
              </ul>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        {t("app.syntheticOnly")}
      </footer>
    </div>
  );
}
