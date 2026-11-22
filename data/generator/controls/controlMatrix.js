// Source: COSO Internal Control — Integrated Framework (2013), five components / seventeen
// principles. Each control below cites the specific principle it instantiates; the control
// set itself, sample sizes and thresholds are configurable assumptions, not mandated by COSO.
// `sampleKey` names the one dataset array (from generateControlsDataset.js's output) this
// control's sample is drawn from, so the UI's sample-size lookup is unambiguous.
export const CONTROL_MATRIX = [
  // Source: COSO 2013, Principle 1 — the organization demonstrates a commitment to integrity
  // and ethical values.
  {
    controlId: "CTRL-ENV-01",
    cosoComponent: "controlEnvironment",
    principle: 1,
    sampleKey: "attestations",
    reasonCodes: ["CTRL_ATTESTATION_MISSING"],
  },
  // Source: COSO 2013, Principle 8 — the organization considers the potential for fraud in
  // assessing risks to the achievement of objectives.
  {
    controlId: "CTRL-RISK-01",
    cosoComponent: "riskAssessment",
    principle: 8,
    sampleKey: "vendorOnboardings",
    reasonCodes: ["CTRL_VENDOR_ONBOARDING_UNAPPROVED", "CTRL_VENDOR_ONBOARDING_LATE_APPROVAL"],
  },
  // Source: COSO 2013, Principle 12 — the organization deploys control activities through
  // policies and procedures.
  {
    controlId: "CTRL-ACT-01",
    cosoComponent: "controlActivities",
    principle: 12,
    sampleKey: "poApprovals",
    reasonCodes: ["CTRL_PO_APPROVAL_MISSING"],
  },
  // Source: COSO 2013, Principle 10 — the organization selects and develops control activities,
  // including segregation of incompatible duties.
  {
    controlId: "CTRL-ACT-02",
    cosoComponent: "controlActivities",
    principle: 10,
    sampleKey: "poApprovals",
    reasonCodes: ["CTRL_PO_SOD_VIOLATION"],
  },
  // Source: COSO 2013, Principle 14 — the organization internally communicates information,
  // including objectives and responsibilities, necessary to support internal control.
  {
    controlId: "CTRL-INFO-01",
    cosoComponent: "informationCommunication",
    principle: 14,
    sampleKey: "jeReviews",
    reasonCodes: ["CTRL_JE_REVIEW_MISSING", "CTRL_JE_REVIEW_SOD_VIOLATION"],
  },
  // Source: COSO 2013, Principle 16 — the organization conducts ongoing and/or separate
  // evaluations to ascertain whether internal control components are present and functioning.
  {
    controlId: "CTRL-MON-01",
    cosoComponent: "monitoringActivities",
    principle: 16,
    sampleKey: "bankReconciliations",
    reasonCodes: ["CTRL_BANKREC_MISSING", "CTRL_BANKREC_LATE", "CTRL_BANKREC_SOD_VIOLATION"],
  },
];
