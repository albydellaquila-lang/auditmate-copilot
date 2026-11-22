// Synthetic GL journal-entry dataset generator, AICPA ADS GL Standard shape (approximated).
// Builds a deterministic, seeded "normal" population, then plants a fixed set of anomalies
// (see injectAnomalies.js) that the engines in src/engines/ must all be able to find.
import { createRng } from "./rng.js";
import {
  COMPANY,
  VENDORS,
  PREPARERS,
  NORMAL_ACCOUNT_PAIRS,
  NORMAL_PREPARER_ROLES_BY_ACCOUNT,
  APPROVAL_THRESHOLD_MINOR,
} from "./company.js";
import { injectAnomalies } from "./injectAnomalies.js";

const PAIR_SOURCE = new Map([
  ["5000|2000", "AP"], ["2000|1000", "AP"], ["5200|2000", "AP"], ["5300|1000", "AP"],
  ["2100|1000", "AP"], ["1500|2000", "AP"], ["5000|1500", "Manual"],
  ["5100|1000", "Payroll"],
  ["1100|4000", "AR"], ["1000|1100", "AR"], ["4000|2200", "AR"],
  ["2200|1000", "Treasury"],
]);
const AP_VENDOR_PAIRS = new Set(["5000|2000", "5200|2000", "1500|2000"]);
const WEEKDAY_MONTHS = { start: 1, end: 11 }; // keep December clear for the cut-off/new-vendor anomalies

function preparerIdByRole(role) {
  return PREPARERS.find((p) => p.role === role)?.id;
}

function commonRole(debitAccountId, creditAccountId) {
  const debitRoles = NORMAL_PREPARER_ROLES_BY_ACCOUNT[debitAccountId] ?? [];
  const creditRoles = NORMAL_PREPARER_ROLES_BY_ACCOUNT[creditAccountId] ?? [];
  const shared = debitRoles.find((r) => creditRoles.includes(r));
  return shared ?? debitRoles[0] ?? creditRoles[0];
}

function nextWeekday(year, month, day) {
  let d = new Date(Date.UTC(year, month - 1, day));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + 86400000);
  return d;
}

function buildNormalJe(index, rng) {
  const jeId = `JE-${String(index).padStart(4, "0")}`;
  const [debitAccountId, creditAccountId] = rng.pick(NORMAL_ACCOUNT_PAIRS);
  const pairKey = `${debitAccountId}|${creditAccountId}`;
  const role = commonRole(debitAccountId, creditAccountId);
  const preparerId = preparerIdByRole(role);

  const month = rng.int(WEEKDAY_MONTHS.start, WEEKDAY_MONTHS.end);
  const day = rng.int(1, 28);
  const date = nextWeekday(2026, month, day);
  const jeDate = date.toISOString().slice(0, 10);
  const hour = rng.int(9, 16);
  const minute = rng.int(0, 59);
  const createdAt = `${jeDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;

  // Kept well under both the round-amount floor (AED 10,000) and the just-under-threshold
  // band (AED 9,900-10,000) so the normal population does not trip those JET checks itself.
  const amountMinor = rng.int(5000, 950000);
  const vendorId = AP_VENDOR_PAIRS.has(pairKey) ? rng.pick(VENDORS).id : null;

  return {
    header: {
      jeId, companyId: COMPANY.id, fiscalYear: COMPANY.fiscalYear, period: jeDate.slice(0, 7),
      jeDate, createdAt, source: PAIR_SOURCE.get(pairKey) ?? "Manual", preparerId,
      approverId: null, description: `Routine posting ${jeId}`, isReversal: false,
    },
    lines: [
      { jeId, lineNo: 1, accountId: debitAccountId, accountType: "debit-side", debitMinor: amountMinor, creditMinor: 0, vendorId, lineDescription: jeId },
      { jeId, lineNo: 2, accountId: creditAccountId, accountType: "credit-side", debitMinor: 0, creditMinor: amountMinor, vendorId, lineDescription: jeId },
    ],
  };
}

/**
 * @param {{seed?: number, normalJeCount?: number}} [opts]
 * @returns {{headers: object[], lines: object[], answerKey: object[], config: object}}
 */
export function generateGlDataset({ seed = 42, normalJeCount = 200 } = {}) {
  const rng = createRng(seed);
  const normal = Array.from({ length: normalJeCount }, (_, i) => buildNormalJe(i + 1, rng));

  const { headers, lines, answerKey } = injectAnomalies(
    normal.map((e) => e.header),
    normal.flatMap((e) => e.lines),
    rng
  );

  const config = {
    normalRolesByAccount: NORMAL_PREPARER_ROLES_BY_ACCOUNT,
    preparerRoleById: Object.fromEntries(PREPARERS.map((p) => [p.id, p.role])),
    normalPairs: NORMAL_ACCOUNT_PAIRS,
    minMinor: 1000000,
    granularityMinor: 100000,
    thresholdMinor: APPROVAL_THRESHOLD_MINOR,
    bandMinor: 10000,
    businessStartHour: 9,
    businessEndHour: 17,
    periodEndDate: `${COMPANY.fiscalYear}-12-31`,
    windowDays: 3,
    materialityMinor: 100000,
    asOfDate: `${COMPANY.fiscalYear}-12-31`,
    lookbackDays: 30,
  };

  return { headers, lines, answerKey, config };
}
