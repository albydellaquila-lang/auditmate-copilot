# Standards map

Every rule, threshold and check in AuditMate Copilot must trace to a **public** standard or guide.
Proprietary audit-firm methodologies, templates and wording are out of scope by design ("clean room").

## Citation convention

Put the source directly above the rule in code:

```js
// Source: ISA 240 (Revised), journal entry testing requirements. Threshold is a configurable assumption.
```

Thresholds that a standard leaves to professional judgment are **configurable assumptions**, documented in the UI and README, never hardcoded as "the rule".

## Map

| Area | Standard / guide | Status (Nov 2026) | Used for |
|---|---|---|---|
| Fraud & journal entries | **ISA 240 (Revised)** — IAASB | Issued July 2025; effective for periods beginning on or after 15 Dec 2026 | JET risk criteria |
| | PCAOB AS 2401 | In force (US) | Cross-reference for US readers |
| Audit evidence | ISA 500 | In force. *Revised ISA 330/500/520 are proposals only — do not cite as effective* | Evidence review framing |
| Materiality | ISA 320 | In force | Materiality / performance-materiality calculator |
| Analytical procedures | ISA 520 | In force | YoY / variance analysis |
| Sampling | ISA 530 + AICPA Audit Guide *Audit Sampling* | In force | Monetary unit sampling with confidence factors |
| Risk assessment | ISA 315 (Revised 2019) | In force | Risk factors (no proprietary scoring formula) |
| Audit data format | **AICPA Audit Data Standards** — GL Standard, Procure-to-Pay Subledger Standard | Voluntary standard | Schema of the synthetic dataset |
| Invoices (UAE) | UAE e-invoicing, Peppol **PINT AE** data dictionary | Pilot from July 2026; mandatory in phases from Jan 2027 | Field names of synthetic invoices |
| VAT (UAE) | UAE VAT, standard rate 5% | In force | Synthetic tax lines |
| Internal control | COSO Internal Control — Integrated Framework (2013); PCAOB AS 2201 | In force | Controls testing module (stretch) |
| AI governance | NIST AI RMF 1.0; ISO/IEC 42001 | Published | Human-in-the-loop, traceability, limitations section |

## Re-verify before release

Standards change. Before each public release, re-check the "Status" column against the issuing body's website.
