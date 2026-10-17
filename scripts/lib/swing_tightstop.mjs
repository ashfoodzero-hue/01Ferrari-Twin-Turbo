// swing_tightstop.mjs — Phase 4C core (docs/SWING_TIGHTSTOP_SPEC.md, 2026-10-17). Pure functions.
/** Prepare Y swings for the structure lookup: [{ te, conf, px, type }] sorted by conf (confirmation = close of the knownI candle). */
export function prepY(C, swings) { return swings.map((s) => ({ te: C[s.i].t, conf: C[s.knownI]?.close_t ?? null, px: s.px, type: s.type })).filter((x) => x.conf != null).sort((a, b) => a.conf - b.conf) }
/**
 * S1 structure: the latest Y swing of the same type as the signal extreme (low for a long) that was CONFIRMED by tSig (conf ≤ tSig),
 * whose extreme came AFTER the signal extreme (te > tP) and lies beyond it (above P for a long, below P for a short). Returns its price or null.
 */
export function structureLevel(Y, side, P, tP, tSig) {
  const type = side === 'long' ? 'L' : 'H'
  let lo = 0, hi = Y.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Y[m].conf <= tSig) lo = m + 1; else hi = m }   // Y[0..lo) confirmed by tSig
  let best = null
  for (let k = lo - 1; k >= 0; k--) { const y = Y[k]; if (y.conf <= tP) break   // anything confirmed before the extreme cannot be after it
    if (y.type !== type || !(y.te > tP)) continue; if (side === 'long' ? y.px > P : y.px < P) { if (!best || y.te > best.te) best = y } }
  return best ? best.px : null
}
