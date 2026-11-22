import { test } from "node:test";
import assert from "node:assert/strict";
import { findNewVendors } from "../src/engines/newVendor.js";

const HEADERS = [
  { jeId: "JE-OLD", jeDate: "2026-01-15" }, // V-ESTABLISHED's real first appearance, long ago
  { jeId: "JE-1", jeDate: "2026-12-28" }, // V-NEW's only appearance, close to period end
  { jeId: "JE-3", jeDate: "2026-11-01" }, // V-ESTABLISHED again, before the 30-day window
  { jeId: "JE-4", jeDate: "2026-12-10" }, // V-ESTABLISHED again, inside the 30-day window
];
const LINES = [
  { jeId: "JE-OLD", vendorId: "V-ESTABLISHED" },
  { jeId: "JE-1", vendorId: "V-NEW" },
  { jeId: "JE-3", vendorId: "V-ESTABLISHED" },
  { jeId: "JE-4", vendorId: "V-ESTABLISHED" },
  { jeId: "JE-4", vendorId: null }, // intercompany/no-vendor line, must be ignored
];

test("findNewVendors: flags the in-window line for a vendor with no history before the window", () => {
  const flagged = findNewVendors(LINES, HEADERS, { asOfDate: "2026-12-31", lookbackDays: 30 });
  assert.deepEqual(
    flagged.map((f) => f.jeId),
    ["JE-1"]
  );
});

test("findNewVendors: a vendor with activity before the window is not flagged", () => {
  const flagged = findNewVendors(LINES, HEADERS, { asOfDate: "2026-12-31", lookbackDays: 30 });
  assert.ok(!flagged.some((f) => f.detail.vendorId === "V-ESTABLISHED"));
});

test("findNewVendors: a window too short to include the new vendor's appearance flags nothing", () => {
  // windowStart = 2026-12-31 - 2 days = 2026-12-29, which is after V-NEW's only date (12-28).
  const flagged = findNewVendors(LINES, HEADERS, { asOfDate: "2026-12-31", lookbackDays: 2 });
  assert.deepEqual(flagged, []);
});
