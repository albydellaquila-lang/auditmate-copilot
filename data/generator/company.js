// Static, fictional synthetic-company profile. No real company, no real counterparties.
// Source: AICPA Audit Data Standards — GL Standard (company/account identifier fields);
// UAE VAT standard rate 5% / Peppol PINT AE context motivates the AED/UAE flavour.
import { parseAmount } from "../../src/engines/money.js";

export const COMPANY = {
  id: "FGH-DEMO",
  name: "Falcon Gulf Holdings LLC",
  currency: "AED",
  fiscalYear: 2026,
  fiscalYearStart: "2026-01-01",
  fiscalYearEnd: "2026-12-31",
};

// Source: AICPA ADS GL Standard account-segment concept; account types follow the standard
// balance-sheet / income-statement classification used by the engines below.
export const CHART_OF_ACCOUNTS = [
  { id: "1000", name: "Cash and Bank", type: "asset" },
  { id: "1100", name: "Accounts Receivable", type: "asset" },
  { id: "1500", name: "Inventory", type: "asset" },
  { id: "2000", name: "Accounts Payable", type: "liability" },
  { id: "2100", name: "Accrued Expenses", type: "liability" },
  { id: "2200", name: "VAT Payable", type: "liability" },
  { id: "3900", name: "Retained Earnings", type: "equity" },
  { id: "4000", name: "Revenue - Services", type: "revenue" },
  { id: "5000", name: "Cost of Services", type: "expense" },
  { id: "5100", name: "Payroll Expense", type: "expense" },
  { id: "5200", name: "Facilities Expense", type: "expense" },
  { id: "5300", name: "Travel & Entertainment", type: "expense" },
];

// Source: AICPA ADS Procure-to-Pay Subledger Standard (vendor identifier field). Fictional.
export const VENDORS = [
  { id: "V-01", name: "Desert Rose Facilities Services LLC" },
  { id: "V-02", name: "Al Noor Office Supplies Trading" },
  { id: "V-03", name: "Gulf Horizon IT Solutions FZE" },
  { id: "V-04", name: "Marina Fleet Logistics LLC" },
  { id: "V-05", name: "Sandstone Consulting Partners" },
  { id: "V-06", name: "Blue Falcon Catering Services" },
  { id: "V-07", name: "Emirates Skyline Printing LLC" },
  { id: "V-08", name: "Dune Valley Maintenance Co." },
  { id: "V-09", name: "Pearl Coast Travel & Tourism" },
  { id: "V-10", name: "Al Rawda Legal Advisory" },
  { id: "V-11", name: "Crescent Bay Insurance Brokers" },
  { id: "V-12", name: "Oryx Telecom Networks LLC" },
  { id: "V-13", name: "Khaleej Security Systems" },
  { id: "V-14", name: "Palm Ridge Interiors LLC" },
  { id: "V-15", name: "Hamra Freight & Customs Clearance" },
];

// Fictional preparer roster. Roles drive the "unusual preparer for this account" JET check.
export const PREPARERS = [
  { id: "P-01", name: "Amal Hassan", role: "AP Clerk" },
  { id: "P-02", name: "Rashid Khoury", role: "AR Clerk" },
  { id: "P-03", name: "Priya Nair", role: "Staff Accountant" },
  { id: "P-04", name: "Yusuf Al Marzooqi", role: "Payroll Admin" },
  { id: "P-05", name: "Fatima Idris", role: "Controller" },
  { id: "P-06", name: "David Fernandes", role: "CFO" },
];

// Source: ISA 240 (Revised), journal entry testing requirements — a defined population of
// "normal" account pairings and preparer roles is what makes a pairing/preparer "unusual".
// These are configurable assumptions describing routine processing, not a proprietary formula.
export const NORMAL_ACCOUNT_PAIRS = [
  ["5000", "2000"], // cost of services on credit -> payable
  ["2000", "1000"], // pay a payable from cash
  ["5100", "1000"], // payroll paid from cash
  ["1100", "4000"], // revenue billed on account
  ["1000", "1100"], // cash collected against receivable
  ["5200", "2000"], // facilities expense on credit
  ["5300", "1000"], // travel expense paid from cash
  ["2100", "1000"], // accrued expense settled in cash
  ["1500", "2000"], // inventory purchased on credit
  ["5000", "1500"], // inventory consumed into cost of services
  ["4000", "2200"], // VAT output on revenue
  ["2200", "1000"], // VAT remitted in cash
];

export const NORMAL_PREPARER_ROLES_BY_ACCOUNT = {
  "1000": ["Controller", "CFO", "Staff Accountant"],
  "1100": ["AR Clerk", "Staff Accountant"],
  "1500": ["AP Clerk", "Staff Accountant"],
  "2000": ["AP Clerk", "Staff Accountant"],
  "2100": ["AP Clerk", "Controller"],
  "2200": ["Controller", "Staff Accountant"],
  "3900": ["Controller", "CFO"],
  "4000": ["AR Clerk", "Staff Accountant"],
  "5000": ["AP Clerk", "Staff Accountant"],
  "5100": ["Payroll Admin", "Controller"],
  "5200": ["AP Clerk", "Staff Accountant"],
  "5300": ["AP Clerk", "Staff Accountant"],
};

// Configurable assumption: management-approval threshold used by the "just under threshold" check.
export const APPROVAL_THRESHOLD_MINOR = parseAmount("10000.00");
