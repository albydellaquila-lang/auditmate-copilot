# AuditMate Copilot

**AI Audit & Controls Copilot.** Deterministic audit analytics + LLM evidence review with source citations.

> 🚧 **Status: Sprint 0 (foundations).** The engines, AI evidence review and live demo land in the next sprints. See [Roadmap](#roadmap).

---

## Why this exists

Finance and audit teams still reconcile invoices, test journal entries and document control evidence by hand. LLMs can read the messy documents, but **they must never be trusted with the arithmetic**. AuditMate Copilot splits the work accordingly:

| Layer | Does | Never does |
|---|---|---|
| **Deterministic engines** (JavaScript, unit-tested) | Every calculation: balancing, matching, tolerances, sampling, thresholds | Guess or interpret free text |
| **LLM layer** | Extract fields from invoices and contracts, explain exceptions, draft working-paper commentary **with citations** to source rows and documents | Compute, sum, compare amounts or issue conclusions |
| **Human reviewer** | Approves or rejects every exception; every decision is logged | — |

## Planned modules

1. **GL Integrity & Journal Entry Testing** — double-entry balancing per document, journal-entry risk criteria aligned with ISA 240 (Revised), Benford's law, cut-off, new-vendor and concentration analysis.
2. **AI 3-Way Match** — purchase order ↔ goods receipt ↔ invoice. The LLM extracts invoice fields (PDF) with confidence scores; code performs the match within configurable tolerances.
3. **Controls Testing** *(stretch)* — test of controls against a synthetic control matrix (COSO 2013).

## Standards alignment

Every rule in the code cites the public standard it implements. Full map: [`docs/STANDARDS.md`](docs/STANDARDS.md).

ISA 240 (Revised) · ISA 500 · ISA 520 · ISA 530 · AICPA Audit Data Standards (GL, Procure-to-Pay) · UAE e-invoicing (Peppol PINT AE) · COSO 2013 · NIST AI RMF

## Data & compliance

- **100% synthetic data** for a fictional company. No real client data, no real company names.
- Methodology is built **only from public standards** (see `docs/STANDARDS.md`); no proprietary firm methodology or templates.
- This is a demonstration tool. **It does not issue audit opinions**; all output requires professional review.

## Quick start

```bash
npm install
cp .env.example .env      # optional: add an Anthropic key for live AI mode
npm run dev               # http://localhost:3000
npm test                  # deterministic engine tests
```

Without a key the app runs in **demo mode**, replaying recorded AI responses. The key is injected server-side by the dev proxy and is never shipped to the browser.

## Project structure

```
src/
  engines/   deterministic, pure functions (all amounts in integer minor units)
  ai/        LLM extraction & commentary (structured outputs, citations)
  ui/        React components
  i18n/      English / Italian
data/
  generator/ seeded synthetic dataset generator (with answer key of planted anomalies)
  demo/      recorded AI responses for demo mode
test/        node:test suites
docs/        standards map, architecture notes
```

## Roadmap

- [x] **Sprint 0** — repo, structure, bilingual shell, integer-money core
- [ ] **Sprint 1** — synthetic dataset (AICPA ADS schema) + deterministic engines + tests
- [ ] **Sprint 2** — AI extraction & 3-way match, exception review queue, demo mode
- [ ] **Sprint 3** — deployment, measured results, demo video

## License

MIT
