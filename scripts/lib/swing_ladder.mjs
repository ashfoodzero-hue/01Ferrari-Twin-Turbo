// swing_ladder.mjs — the matching core of Phase 3 (docs/SWING_LADDER_SPEC.md, 2026-10-17). Pure functions.
//   "timeframe X flipped at the same low": X has a confirmed swing of the same type with EXACTLY the same extreme price, whose extreme candle
//   overlaps the anchor's extreme candle; flip time = the CLOSE of X's confirming candle. All timeframes come from the same 1m data, so the
//   same low carries the same price on every timeframe.

/** Index one timeframe's confirmed swings: Map(type → Map(price → [{ t0, t1, flipT }])) — t0/t1 = extreme candle span, flipT = confirm-candle close. */
export function indexSwings(C, swings) {
  const idx = { H: new Map(), L: new Map() }
  for (const s of swings) { const conf = C[s.knownI]; if (!conf) continue
    const m = idx[s.type], k = s.px; if (!m.has(k)) m.set(k, []); m.get(k).push({ t0: C[s.i].t, t1: C[s.i].close_t, flipT: conf.close_t }) }
  return idx
}
/** Earliest flip of X at the anchor extreme (type, price, anchor candle span [a0, a1)), or null. */
export function flipAt(idx, type, px, a0, a1) {
  const list = idx[type].get(px); if (!list) return null
  let best = null; for (const x of list) if (x.t0 < a1 && x.t1 > a0 && (best == null || x.flipT < best)) best = x.flipT
  return best
}
/** Nearest swing of `type` in another series (same candle clock) whose extreme candle open is within ±w candles of anchor index time.
 *  byT: Map(candle open t → index) of that series; S: its swings (with i, knownI, type); C2: its candles. Returns { dCandles, flipT } or null. */
export function nearestSwing(C2, S, byT, type, t0, w) {
  const j0 = byT.get(t0); if (j0 == null) return null
  let best = null
  for (const s of S) { if (s.type !== type) continue; const d = s.i - j0; if (Math.abs(d) > w) continue
    if (!best || Math.abs(d) < Math.abs(best.dCandles)) best = { dCandles: d, flipT: C2[s.knownI]?.close_t ?? null } }
  return best
}
/** Faster nearestSwing over swings sorted by i (binary search on i). */
export function nearestSwingSorted(C2, S, byT, type, t0, w) {
  const j0 = byT.get(t0); if (j0 == null) return null
  let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m].i < j0 - w) lo = m + 1; else hi = m }
  let best = null; for (let k = lo; k < S.length && S[k].i <= j0 + w; k++) { const s = S[k]; if (s.type !== type) continue; const d = s.i - j0
    if (!best || Math.abs(d) < Math.abs(best.dCandles)) best = { dCandles: d, flipT: C2[s.knownI]?.close_t ?? null } }
  return best
}
