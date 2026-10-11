// ════════════════════════════════════════════════════════════════════════════════
// setupQuality.js — P7.1 quality-selection grader (the conjunctive structural+trend confluence).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P7 /ULTRADEEPTHINK (2026-06-26).
//
// The raw multi-engine tiered product CATCHES moves but is ~breakeven (33/70 NOFILL, 7 stops). The
// missing piece (doc §4.8, never built): a FAST CONJUNCTIVE CONFLUENCE that takes a setup ONLY when
// HTF trend + side-of-range agree — the practitioner's real edge (trade WITH the trend, BUY discount /
// SELL premium). This is the STRONGEST selection method that is also fast enough for a 23y sweep:
//   GRADE A = both HTFs (1h AND 4h) align with the direction AND price on the right side of range
//   GRADE B = one HTF aligns AND right side          C = aligned but wrong side    D = counter-trend (reject)
// Look-ahead-free: HTF trend uses only CLOSED HTF bars (close_t ≤ the 15m bar's time); range is trailing.
// R3: grades are MEASURED levers, validated per tier × direction × 23y before any claim of lift.
// ════════════════════════════════════════════════════════════════════════════════

import { resample } from '../core/resample.js'
import { ema } from '../core/indicators.js'

/** Per-15m-bar HTF trend (UP/DOWN/FLAT) from EMA20 vs EMA50 on CLOSED HTF bars only (causal). */
function htfTrendByBar(bars, tf) {
  const h = resample(bars, tf)
  const e20 = ema(h, 20, 'c'), e50 = ema(h, 50, 'c')
  const trend = h.map((_, k) => (k < 50 ? 'FLAT' : (e20[k] > e50[k] ? 'UP' : e20[k] < e50[k] ? 'DOWN' : 'FLAT')))
  const out = new Array(bars.length).fill('FLAT')
  let p = -1
  for (let i = 0; i < bars.length; i++) {
    while (p + 1 < h.length && h[p + 1].close_t <= bars[i].t) p++   // latest CLOSED HTF bar
    out[i] = p >= 0 ? trend[p] : 'FLAT'
  }
  return out
}

/** Precompute the grading context (HTF trends + trailing range position) aligned to each 15m bar. */
export function prepareQuality(bars, { rangeLook = 96 } = {}) {
  const trend1h = htfTrendByBar(bars, '1h')
  const trend4h = htfTrendByBar(bars, '4h')
  const rangePos = new Array(bars.length).fill(0.5)
  for (let i = 0; i < bars.length; i++) {
    const s = Math.max(0, i - rangeLook + 1)
    let lo = Infinity, hi = -Infinity
    for (let k = s; k <= i; k++) { if (bars[k].l < lo) lo = bars[k].l; if (bars[k].h > hi) hi = bars[k].h }
    rangePos[i] = hi > lo ? (bars[i].c - lo) / (hi - lo) : 0.5
  }
  return { trend1h, trend4h, rangePos }
}

/** Grade a candidate by conjunctive confluence. @returns {{grade:'A'|'B'|'C'|'D', ...}} */
export function gradeSetup(c, prep) {
  const i = c.i, up = c.direction === 'UP'
  const t1 = prep.trend1h[i] ?? 'FLAT', t4 = prep.trend4h[i] ?? 'FLAT', rp = prep.rangePos[i] ?? 0.5
  const want = up ? 'UP' : 'DOWN'
  const align2 = t1 === want && t4 === want
  const align1 = t1 === want || t4 === want
  const rightSide = up ? rp <= 0.55 : rp >= 0.45            // BUY in/below mid (discount), SELL in/above mid (premium)
  let grade
  if (align2 && rightSide) grade = 'A'
  else if (align1 && rightSide) grade = 'B'
  else if (align1) grade = 'C'
  else grade = 'D'                                          // counter-trend → reject
  return { grade, trend1h: t1, trend4h: t4, rangePos: +rp.toFixed(2), align2, align1, rightSide }
}

export const TAKE_GRADES = Object.freeze({ A: true, B: true, C: false, D: false })   // default: take A+B
