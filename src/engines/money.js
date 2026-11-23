// Money arithmetic in integer minor units (e.g. fils for AED, cents for EUR/USD).
//
// Why: binary floating point cannot represent most decimal amounts exactly
// (0.1 + 0.2 !== 0.3). In audit analytics a 1-fil drift can flip a "balanced"
// document to "unbalanced", so every engine works on integers and converts to
// display strings only at the edge (UI / export).
//
// Safe range: Number.MAX_SAFE_INTEGER minor units ≈ 90 trillion in major units.

const MINOR_DIGITS = 2;
const SCALE = 10 ** MINOR_DIGITS;

/**
 * Parse an amount into integer minor units.
 * Accepts numbers and strings such as "1,234.56", "1.234,56" (decimal: ","),
 * "(1,234.56)" (accounting negative), "1234.56-" (trailing minus), "AED 1,234.56".
 * Throws on anything ambiguous or non-numeric instead of guessing.
 *
 * @param {number|string} raw
 * @param {{decimal?: "." | ","}} [opts] decimal separator used in the source file
 * @returns {number} integer minor units
 */
export function parseAmount(raw, { decimal = "." } = {}) {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new RangeError(`Non-finite amount: ${raw}`);
    // Route through the shortest round-trip string so 1.005 stays "1.005", not 1.00499999.
    raw = raw.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
    decimal = ".";
  }
  if (typeof raw !== "string") throw new TypeError(`Unsupported amount type: ${typeof raw}`);

  let s = raw.trim();
  if (s === "") throw new SyntaxError("Empty amount");

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1).trim(); }
  if (s.endsWith("-")) { negative = !negative; s = s.slice(0, -1).trim(); }
  s = s.replace(/^[A-Za-z]{3}\s*|\s*[A-Za-z]{3}$/g, "").replace(/[\s '€$£]/g, "");
  if (s.startsWith("-")) { negative = !negative; s = s.slice(1); }
  else if (s.startsWith("+")) { s = s.slice(1); }

  const thousands = decimal === "." ? "," : ".";
  const parts = s.split(decimal);
  if (parts.length > 2) throw new SyntaxError(`Ambiguous amount: "${raw}"`);
  const intPart = parts[0].split(thousands).join("");
  const fracPart = parts[1] ?? "";
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) {
    throw new SyntaxError(`Not a valid amount: "${raw}"`);
  }

  // Round half away from zero on the first dropped digit.
  const kept = (fracPart + "0".repeat(MINOR_DIGITS)).slice(0, MINOR_DIGITS);
  const roundUp = fracPart.length > MINOR_DIGITS && Number(fracPart[MINOR_DIGITS]) >= 5;
  let minor = Number(intPart) * SCALE + Number(kept) + (roundUp ? 1 : 0);
  if (!Number.isSafeInteger(minor)) throw new RangeError(`Amount out of safe range: "${raw}"`);
  if (negative && minor !== 0) minor = -minor;
  return minor;
}

/** Sum integer minor units, refusing non-integers so a float can never sneak in. */
export function sumMinor(values) {
  let total = 0;
  for (const v of values) {
    if (!Number.isSafeInteger(v)) throw new TypeError(`Not an integer minor-unit amount: ${v}`);
    total += v;
  }
  if (!Number.isSafeInteger(total)) throw new RangeError("Sum out of safe range");
  return total;
}

/**
 * Tolerance check used by matching engines: |actual - expected| <= max(absMinor, pct of |expected|).
 * Percentage is expressed in basis points (1% = 100 bps) to stay in integer math.
 */
export function withinTolerance(actual, expected, { absMinor = 0, bps = 0 } = {}) {
  const diff = Math.abs(actual - expected);
  if (diff <= absMinor) return true;
  return diff * 10000 <= bps * Math.abs(expected);
}

/** Integer percentage of an amount, expressed in basis points (1% = 100 bps), rounded half away from zero. */
export function percentageOfMinor(amountMinor, bps) {
  return Math.round((amountMinor * bps) / 10000);
}

/** Display only. Never feed the result back into calculations. */
export function formatMinor(minor, { locale = "en-US", currency = "AED" } = {}) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: MINOR_DIGITS,
    maximumFractionDigits: MINOR_DIGITS,
  }).format(minor / SCALE);
}
