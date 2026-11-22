// Source: .env.example's own VITE_AI_MODE convention (Sprint 0). Anything other than "live"
// (including no .env at all, which is every environment this project ships to without a key)
// is demo mode — replaying recorded responses from data/demo/, never calling the network.
export function getAiMode() {
  const mode = typeof import.meta !== "undefined" ? import.meta.env?.VITE_AI_MODE : undefined;
  return mode === "live" ? "live" : "demo";
}
