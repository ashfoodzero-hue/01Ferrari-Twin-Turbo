// swing_silver.mjs — Phase 3C core (docs/SWING_SILVER_SPEC.md, 2026-10-17). Pure functions.
/** Prepare another symbol's swings on one timeframe for time-window lookups: [{ te (extreme candle open), conf (confirm candle close), type }] sorted by te. */
export function prepSwings(C, swings) { return swings.map((s) => ({ te: C[s.i].t, conf: C[s.knownI]?.close_t ?? null, type: s.type })).filter((x) => x.conf != null).sort((a, b) => a.te - b.te) }
/** Earliest confirmation time of a swing of `type` whose extreme lies within [t0 − w, t0 + w] (ms). null if none. */
export function earliestConfirm(P, type, t0, w) {
  let lo = 0, hi = P.length; while (lo < hi) { const m = (lo + hi) >> 1; if (P[m].te < t0 - w) lo = m + 1; else hi = m }
  let best = null; for (let k = lo; k < P.length && P[k].te <= t0 + w; k++) if (P[k].type === type && (best == null || P[k].conf < best)) best = P[k].conf
  return best
}
