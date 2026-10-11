// ════════════════════════════════════════════════════════════════════════════════
// gannBox.js — the GANN BOX of the last confirmed swing: price eighths + time projections (2026-10-09; TOOL 6 of Ashraf's one-by-one plan;
// Ashraf chose "price + time"). ONE module for the studies (study_gann.mjs, study_gann_matrix_filter.mjs) and the chart.
// ────────────────────────────────────────────────────────────────────────────────
// BOX = the swing state in force (fibLevels.swingStates: last confirmed 5/5 pivot high H and low L, known only once confirmed).
// PRICE: the Gann eighths NOT already tested as Fib — 1/8, 2/8, 3/8, 5/8, 6/8, 7/8 — measured from the swing END like fibPrice
//        (UP swing: H − f·(H − L); DOWN: L + f·(H − L)). ½ is the Fib 0.5 (tool 1).
// TIME:  duration = |hT − lT| (the swing's own length in time); projected turn times = swingEnd + f·duration, f ∈ {½, 1, 2},
//        swingEnd = the later of hT / lT. Gann's claim: price turns (a swing high or low) near those times.
// ════════════════════════════════════════════════════════════════════════════════
export const GANN_PRICE = Object.freeze([0.125, 0.25, 0.375, 0.625, 0.75, 0.875])
export const GANN_TIME = Object.freeze([0.5, 1, 2])
export { fibPrice as gannPrice } from './fibLevels.js'

/** The projected turn times of a swing state (ms). */
export function gannTimes(s) {
  const end = Math.max(s.hT, s.lT), dur = Math.abs(s.hT - s.lT)
  return GANN_TIME.map((f) => ({ f, t: end + f * dur }))
}
