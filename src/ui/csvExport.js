// Working-paper export: a plain CSV of the current findings/exceptions/deviations plus their
// reviewer disposition. Browser download via Blob + a temporary <a> click — this is the real
// deployed app (GitHub Pages / local dev), not an Artifact preview, so there is no download
// sandbox to work around. No library needed for CSV, so none is added.
function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {string} filename
 * @param {Array<object>} findings
 * @param {Record<string, {status:string, reviewer:string|null, timestamp:string}>} decisions
 * @param {{idKey: (finding:object) => string, reasonLabel: (finding:object) => string}} opts
 */
export function downloadFindingsCsv(filename, findings, decisions, { idKey, reasonLabel }) {
  const header = ["id", "reason", "detail", "status", "reviewer", "timestamp"];
  const rows = findings.map((f) => {
    const id = idKey(f);
    const decision = decisions[id];
    const detail = Object.entries(f.detail ?? {}).map(([k, v]) => `${k}=${v}`).join("; ");
    return [id, reasonLabel(f), detail, decision?.status ?? "pending", decision?.reviewer ?? "", decision?.timestamp ?? ""];
  });
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
