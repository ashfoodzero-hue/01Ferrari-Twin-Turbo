// bounceTest.js — the ONE "does price bounce off this level?" race (2026-10-09), shared by study_fvg.mjs and study_gamma_levels.mjs.
// race(M, k0, up, target, stop, tEnd): walking the ascending 1m BID bars from index k0, does price reach `target` before `stop`
// (long: high ≥ target / low ≤ stop; short mirrored)? Stop first inside a minute (pessimistic). true / false / null (unresolved by tEnd).
export function race(M, k0, up, target, stop, tEnd) {
  for (let k = k0; k < M.length && M[k].t < tEnd; k++) { const b = M[k]
    if (up ? b.l <= stop : b.h >= stop) return false
    if (up ? b.h >= target : b.l <= target) return true }
  return null
}
/** seeded LCG — the studies' controls and bootstraps are reproducible */
export function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

/**
 * MONEY PATH of a level trade (shared by study_fvg / study_fib_levels): a LIMIT at `entry` from 1m index kTouch — long fills when the ASK
 * reaches it (bid low ≤ entry − spread), short fills at the bid (bid high ≥ entry); stop at `stop` (+ slip), target `tgt`; exits on the
 * correct side (long sells at the bid; short buys at the ask = bid + spread); stop first inside a minute; a stop in the fill minute
 * counts; a target only after the fill minute; unfilled by tEnd = null; open at tEnd = closed at the market. Returns $ per oz.
 */
export function limitTrade(M, kTouch, up, entry, stop, tgt, spreadAt, slip, tEnd) {
  let k = kTouch, filled = false
  for (; k < M.length && M[k].t < tEnd; k++) { const b = M[k], s = spreadAt(b.t)
    if (!filled) { if (up ? b.l <= entry - s : b.h >= entry) { filled = true; if (up ? b.l <= stop : b.h + s >= stop) return -(Math.abs(entry - stop) + slip) } continue }
    if (up ? b.l <= stop : b.h + s >= stop) return -(Math.abs(entry - stop) + slip)
    if (up ? b.h >= tgt : b.l + s <= tgt) return Math.abs(tgt - entry) }
  if (!filled) return null
  const last = M[Math.min(k, M.length) - 1]; return up ? last.c - entry : entry - (last.c + spreadAt(last.t))
}

/**
 * MONEY PATH of a BREAK trade (study_break_continue.mjs): a STOP order at `entry` from 1m index k0, valid until tFill — a SELL stop fills
 * when the BID trades at/below it (sold at the bid, minus slip), a BUY stop when the ASK trades at/above it (bought at the ask, plus slip);
 * then stop / target exactly as limitTrade (exits on the correct side, stop first, the fill minute counts against, target only after it);
 * open at tEnd = closed at the market; unfilled = null. Returns $ per oz.
 */
export function stopEntryTrade(M, k0, up, entry, stop, tgt, spreadAt, slip, tFill, tEnd) {
  let k = k0, fill = null
  for (; k < M.length && M[k].t < tEnd; k++) { const b = M[k], s = spreadAt(b.t)
    if (fill == null) { if (b.t >= tFill) return null
      if (up ? b.h + s >= entry : b.l <= entry) { fill = up ? entry + slip : entry - slip; if (up ? b.l <= stop : b.h + s >= stop) return -(Math.abs(fill - stop) + slip) } continue }
    if (up ? b.l <= stop : b.h + s >= stop) return -(Math.abs(fill - stop) + slip)
    if (up ? b.h >= tgt : b.l + s <= tgt) return up ? tgt - fill : fill - tgt }
  if (fill == null) return null
  const last = M[Math.min(k, M.length) - 1]; return up ? last.c - fill : fill - (last.c + spreadAt(last.t))
}
