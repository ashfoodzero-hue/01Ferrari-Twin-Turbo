// futuresRule.js — the ONE front-month rule for every futures series (importer, live reader, recorder) (2026-10-17).
// Measured 2026-10-17: gold's old rule (months G J M Q V Z, ≤ 4 months ahead) let the thin OCTOBER contract win two-day runs each July because
// December was outside the window. Liquid months: GC = Feb Apr Jun Aug Dec (G J M Q Z), SI = Mar May Jul Sep Dec (H K N U Z), CL = every month.
// prevSession: history is built from the PREVIOUS session's volume winner (causal); the live reader may rank the current session (known now).
// WTI keeps its original rule (Ferrari Matrix history was validated on it — Ashraf R0 exception, unchanged).
export const CODES = 'FGHJKMNQUVXZ'
export const FUT_RULES = Object.freeze({
  GOLD_FUT: { root: 'GC', months: 'GJMQZ', maxAhead: 6, prevSession: true, note: 'CME gold futures (10 min delayed on our plan): real exchange volume; no buyer/seller split on our plan' },
  SILVER_FUT: { root: 'SI', months: 'HKNUZ', maxAhead: 6, prevSession: true, note: 'CME silver futures (10 min delayed on our plan): real exchange volume; context only' },
  WTI: { root: 'CL', months: null, maxAhead: 3, prevSession: false, note: 'Ashraf exception to R0 (2026-10-09): WTI used as delivered live (≥10 min old) by the Ferrari Matrix signal only' },
})
export const RULE_BY_ROOT = Object.freeze(Object.fromEntries(Object.values(FUT_RULES).map((r) => [r.root, r])))
/** Months-ahead of contract `tk` (e.g. GCZ6) relative to the session whose window starts at `ws` (ms). */
export function monthsAhead(tk, ws) { const dm = (2020 + +tk.at(-1)) * 12 + CODES.indexOf(tk.at(-2)), d = new Date(ws + 86400000); return dm - (d.getUTCFullYear() * 12 + d.getUTCMonth()) }
/** Candidate contracts for a rule over the given single-digit years. */
export function candidates(rule, years) { const out = []; for (const y of years) for (const c of rule.months ?? CODES) out.push(`${rule.root}${c}${y}`); return out }
/** Eligible for the session starting at ws? (1 … maxAhead months out) */
export const eligible = (rule, tk, ws) => { const a = monthsAhead(tk, ws); return a >= 1 && a <= rule.maxAhead }
