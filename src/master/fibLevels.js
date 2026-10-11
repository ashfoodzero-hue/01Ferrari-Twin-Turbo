// ════════════════════════════════════════════════════════════════════════════════
// fibLevels.js — Fibonacci + INVERSE Fibonacci of the last CONFIRMED swing, on any timeframe (2026-10-09). ONE module for the studies
// (study_fib_levels.mjs, study_fib_matrix_filter.mjs) and the chart. Ashraf: Fib on 1mo/1w/1d/4h/1h/30m/15m/5m/3m, swing = "last confirmed
// swing", inverse = "the same swing drawn the other way".
// ────────────────────────────────────────────────────────────────────────────────
// SWING: the latest confirmed 5/5 pivot high H and pivot low L (ferrariMatrix.confirmedPivots — a pivot is known only once its 5 right
// bars have CLOSED). UP swing = L came before H (price went L → H); DOWN swing = H before L.
// NORMAL Fib (retracement from the swing END): UP → H − r·(H − L); DOWN → L + r·(H − L), r ∈ {0.236, 0.382, 0.5, 0.618, 0.786}.
// INVERSE Fib (drawn the other way, from the swing START): UP → L + r·(H − L); DOWN → H − r·(H − L).
// ARITHMETIC FACT: inverse r = normal (1 − r), so the two sets share 0.382↔0.618 and 0.5; inverse adds only 0.214 and 0.764 (as normal
// positions). The 7 DISTINCT prices are tested, each labelled with both names.
// Expected direction at a retracement: UP swing → support → BUY; DOWN swing → resistance → SELL.
// ════════════════════════════════════════════════════════════════════════════════
import { confirmedPivots } from './ferrariMatrix.js'

export const FIB_R = Object.freeze([0.236, 0.382, 0.5, 0.618, 0.786])
/** the 7 distinct positions, as NORMAL retracement ratios, with both names */
export const FIB_POS = Object.freeze([0.214, 0.236, 0.382, 0.5, 0.618, 0.764, 0.786].map((p) => ({ p,
  name: [FIB_R.includes(p) ? 'N' + p : null, FIB_R.some((r) => Math.abs(1 - r - p) < 1e-9) ? 'I' + +(1 - p).toFixed(3) : null].filter(Boolean).join('/') })))
export const FIB_TFS = Object.freeze(['1mo', '1w', '1d', '4h', '1h', '30m', '15m', '5m', '3m'])

/** Price of normal-retracement position p for a swing. */
export const fibPrice = (sw, p) => (sw.dir === 'UP' ? sw.H - p * (sw.H - sw.L) : sw.L + p * (sw.H - sw.L))

/**
 * Every swing state over the bars: [{ fromI, knownT, dir, H, L, hT, lT }] — a new state starts at the bar where a new pivot becomes
 * known (its close), valid until the next state. knownT = close time of that bar = B[i].t + tfMs (or the next bar's open for calendar TFs).
 */
export function swingStates(B, closeT) {
  const P = confirmedPivots(B), ev = [...P.highs.map((x) => ({ ...x, k: 'H' })), ...P.lows.map((x) => ({ ...x, k: 'L' }))].sort((a, b) => a.knownAt - b.knownAt || (a.k < b.k ? -1 : 1))
  const out = []; let H = null, L = null
  for (const e of ev) { if (e.k === 'H') H = e; else L = e
    if (!H || !L) continue
    const st = { fromI: e.knownAt, knownT: closeT(e.knownAt), dir: L.j < H.j ? 'UP' : 'DOWN', H: H.px, L: L.px, hT: H.t, lT: L.t }
    if (out.length && out.at(-1).fromI === st.fromI) out[out.length - 1] = st; else out.push(st) }
  return out
}

/** The swing state in force at time T (the last one with knownT ≤ T), by binary search. */
export function stateAt(states, T) {
  let lo = 0, hi = states.length; while (lo < hi) { const m = (lo + hi) >> 1; if (states[m].knownT <= T) lo = m + 1; else hi = m }
  return lo ? states[lo - 1] : null
}
