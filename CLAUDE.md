# AuditMate Copilot — rules for AI coding assistants

Portfolio project: an AI Audit & Controls Copilot. Public GitHub repo. Read this before changing code.

## Non-negotiable rules

1. **Synthetic data only.** Fictional company, fictional counterparties. Never add real company names, real client data, or data derived from a real engagement.
2. **Clean room.** Build only from public standards (`docs/STANDARDS.md`). Do not port methodology, scoring formulas, checklists, document schemas, report wording or thresholds from the legacy `auditmate-v13.jsx` in the parent folder: parts of it may derive from proprietary firm material. Generic math (double entry, Benford, HHI) is fine but must be rewritten from scratch with a public source cited.
3. **The LLM never does math.** All amounts, sums, comparisons, tolerances and scores are computed in `src/engines/`. The LLM receives computed facts and only extracts fields from documents or writes commentary.
4. **Money is integer minor units.** Use `src/engines/money.js` (`parseAmount`, `sumMinor`, `withinTolerance`). Never sum raw floats. Format only at the UI/export edge.
5. **Every AI statement cites its source** (row IDs, document IDs, field names) and every extraction carries a confidence value.
6. **No audit opinions.** The tool flags and documents; a human reviewer decides.
7. **Cite the standard** above each rule: `// Source: <standard>, <section>`. Thresholds are configurable assumptions.
8. **Secrets** live only in `.env` (git-ignored) and are used only by the dev proxy. Production builds run in demo mode.

## Structure

- `src/engines/` pure functions, no React, no I/O. Each engine has a test in `test/`.
- `src/ai/` prompt builders, response schemas, demo-mode replay.
- `src/ui/` React components. `src/i18n/` EN (default) + IT; every user-facing string goes through `t()` and must exist in both dictionaries.
- `data/generator/` seeded generator + answer key of planted anomalies. Tests assert the engines find every planted anomaly.

## Commands

```bash
npm run dev     # Vite, http://localhost:3000
npm test        # node --test test/*.test.mjs
npm run build
```

## Conventions

- JavaScript (ES modules) + JSX, no TypeScript for now. React 18, Vite 5, Tailwind 3, lucide-react.
- Small modules; no file over ~400 lines.
- Add or update a test with every engine change. Tests use hand-computed expected values, never values copied from engine output.
