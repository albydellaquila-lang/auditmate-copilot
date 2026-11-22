# Measured results

All figures below come from running the project's own seeded generators and test suite (`npm test`), not from a real engagement — every number here describes performance on **synthetic data with a known, planted ground truth** (each dataset's `answerKey`), which is what lets detection be measured exactly rather than estimated.

## Test suite

`npm test` (`node --test test/*.test.mjs`): **89/89 tests passing**, covering every deterministic engine, every synthetic-data generator, and the three generator-to-engine integration tests described below. Every expected value in a unit test is hand-computed (never copied from the engine's own output); every integration test asserts 100% recall against its module's literal answer key.

## GL Integrity & Journal Entry Testing

- Synthetic general ledger: 254 journal entries (509 lines), seeded and reproducible (`generateGlDataset({ seed: 42 })`).
- 54 anomalies planted across 10 categories (double-entry breaks, ISA 240 journal-entry risk criteria — unusual preparer, unusual account pairing, round amounts, just-under-threshold amounts, weekend/after-hours postings — Benford's Law deviation, cut-off, new vendor, and vendor concentration).
- `test/generator.test.mjs`: **100% of planted anomalies detected** by their corresponding engine (`src/engines/{balancing,jetRiskCriteria,benford,cutoff,newVendor,concentration}.js`), with the normal population producing zero false flags on the balancing check.

## AI 3-Way Match (Procure-to-Pay)

- Synthetic P2P cycle: 53 purchase orders, 51 goods receipts, 54 invoices (`generateP2PDataset({ seed: 7 })`).
- 13 purchase orders carry a planted 3-way-match exception across 7 categories (quantity mismatch, price variance, missing goods receipt, missing invoice, duplicate invoice, invoice-before-PO, VAT miscalculation).
- `test/p2pGenerator.test.mjs`: **100% of planted exceptions detected** by `src/engines/threeWayMatch.js`, with the normal population a perfect match (zero exceptions).
- AI invoice-field extraction runs in demo mode (10 recorded extractions replaying as if a model had read each invoice, each field carrying a confidence score and a citation) — no live model call is made or measured here; the deterministic match engine never depends on the AI layer's output.

## Controls Testing (COSO 2013)

- Synthetic control-testing population: 75 sample items across six controls spanning all five COSO 2013 components (conduct attestations, vendor-onboarding approval, PO approval above threshold, PO segregation of duties, JE review above materiality, monthly bank reconciliation).
- 10 deviations planted, one per control-failure reason code.
- `test/controlsGenerator.test.mjs`: **100% of planted deviations detected** by `src/engines/controlsTesting.js`, with the normal population producing zero findings.

## Reading these numbers

100% recall against a planted answer key demonstrates the deterministic engines are internally consistent and correctly implemented against their own synthetic ground truth — it is not a claim about detection rates on real, messy financial data, which this project does not have access to (see `CLAUDE.md`'s synthetic-data-only rule). The honest claim here is narrower and still useful for a portfolio: **given a known set of exceptions, the code finds all of them, with zero manual tuning per run** (seeded generation means these numbers are exactly reproducible, not cherry-picked).

What's still open (Sprint 3, not yet done): a deployed demo build and a walkthrough video. Both require steps outside this codebase (hosting, screen recording) and are intentionally left for the project owner rather than done unattended.
