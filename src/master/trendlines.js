// trendlines.js — the ONE implementation of objective trendlines (spec docs/TRENDLINE_STUDY_SPEC.md; Ashraf 2026-10-18: "Yes, run it as written,
// WTI on 2 years only"). Used by the study (scripts/study_trendlines.mjs) AND the app's Trendlines page, so what is shown is what was measured.
//   • pivots: major = ZigZag 3 × ATR (src/master/swings.js, the swing-table rule); minor = fractal, 5 candles each side (strict left, ≥ right),
//     known at i + 5. A line uses only pivots known by its birth.
//   • a line through P1 → P2 (same type: two lows = support, two highs = resistance; x = candle index) is drawn only if NO candle strictly between
//     the anchors closes beyond it; it is BORN at P2's confirmation candle and never born if, between P2 and that candle, a close went ≥ tol beyond.
//   • candidates: each pivot P2 with each of its previous 3 same-type pivots.
//   • touch: an ARMED line (a whole candle was ≥ 1 ATR away since birth / the last touch) is touched when a candle comes within tol (0.25 ATR).
//     RESPECTED = a later candle reaches 1 ATR away (bounce side) before any candle closes ≥ tol beyond; BROKEN = that close comes first; the touch
//     candle itself can only break (its own far extreme may have printed before the touch) → one candle doing both counts as broken.
//     A line ends at its first break (an unarmed close-through also ends it, without a touch). ATR = ATR(14) of the previous closed candle.
//   • placebo: the same line shifted parallel by d × ATR(birth), d ∈ {+0.75, −0.75, +1.5, −1.5}, through the identical rules.
// Proof: scripts/smoke_trendlines.mjs.
import { zigzag } from './swings.js'

export const TL = Object.freeze({ MINOR_N: 5, MAJOR_K: 3, PREV: 3, TOL: 0.25, AWAY: 1, R: 1, PLACEBO: [0.75, -0.75, 1.5, -1.5] })

/** Fractal pivots: [{ i, type 'H'|'L', px, knownI }] ascending by i. */
export function fractalPivots(C, n = TL.MINOR_N) {
  const out = []
  for (let i = n; i < C.length - n; i++) { let isH = true, isL = true
    for (let j = 1; j <= n; j++) { if (!(C[i].h > C[i - j].h) || !(C[i].h >= C[i + j].h)) isH = false; if (!(C[i].l < C[i - j].l) || !(C[i].l <= C[i + j].l)) isL = false }
    if (isH) out.push({ i, type: 'H', px: C[i].h, knownI: i + n }); if (isL) out.push({ i, type: 'L', px: C[i].l, knownI: i + n }) }
  return out
}
/** Major pivots = the ZigZag swings (the swing-table rule). */
export function majorPivots(C, breaks = new Set(), k = TL.MAJOR_K) { return zigzag(C, { k, breaks }).swings.map((s) => ({ i: s.i, type: s.type, px: s.px, knownI: s.knownI })) }

/** Candidate lines from pivots. A = ATR array of C. */
export function buildLines(C, pivots, A, { prev = TL.PREV, tol = TL.TOL } = {}) {
  const lines = []
  for (const type of ['L', 'H']) { const P = pivots.filter((p) => p.type === type).sort((a, b) => a.i - b.i), s = type === 'L' ? 1 : -1
    for (let b = 1; b < P.length; b++) for (let a = b - 1; a >= Math.max(0, b - prev); a--) { const p1 = P[a], p2 = P[b]
      if (p1.i === p2.i) continue
      const slope = (p2.px - p1.px) / (p2.i - p1.i), v = (x) => p1.px + slope * (x - p1.i), birth = p2.knownI
      if (birth >= C.length || !(A[birth] > 0)) continue
      let ok = true; for (let k = p1.i + 1; k < p2.i; k++) if (s * (C[k].c - v(k)) < 0) { ok = false; break }
      if (!ok) continue
      const rising = slope > 0, side = type === 'L' ? 'support' : 'resistance'
      lines.push({ side, i1: p1.i, p1: p1.px, i2: p2.i, p2: p2.px, slope, birth, atrBirth: A[birth], slope_atr: slope / A[birth],
        cls: (side === 'support') === rising ? 'trend' : 'counter' }) } }
  return lines
}

/** Run one line (offset 0 = real; d × atrBirth = placebo) through the touch / outcome rules. An open line also reports its live state for the
 *  live alerts (scripts/trendline_tick.mjs): armed (a touch would count now) or pending (touched, waiting for bounce / break).
 *  → { born, touches: [{ i, test, outcome 'respect'|'break'|'open', resolvedI }], endI, end: 'break'|'break_unarmed'|'open' } */
export function evaluateLine(C, A, ln, offset = 0, { tol = TL.TOL, away = TL.AWAY, R = TL.R } = {}) {
  const s = ln.side === 'support' ? 1 : -1, v = (x) => ln.p1 + ln.slope * (x - ln.i1) + offset, N = C.length
  const beyond = (k, a) => s * (C[k].c - v(k)) <= -tol * a                     // a close ≥ tol through the line
  const near = (k) => (s > 0 ? C[k].l - v(k) : v(k) - C[k].h)                   // nearest extreme's distance on the bounce side
  const far = (k) => (s > 0 ? C[k].h - v(k) : v(k) - C[k].l)                    // far extreme's distance on the bounce side
  for (let k = ln.i2 + 1; k <= ln.birth; k++) { const a = A[k - 1] || ln.atrBirth; if (beyond(k, a)) return { born: false, touches: [], endI: k, end: 'break' } }
  const touches = []; let armed = false
  for (let k = ln.birth + 1; k < N; k++) { const a = A[k - 1]; if (!(a > 0)) continue
    if (!armed) { if (beyond(k, a)) return { born: true, touches, endI: k, end: 'break_unarmed' }; if (near(k) >= away * a) armed = true; continue }
    if (near(k) > tol * a) continue
    const t = { i: k, test: touches.length + 1, outcome: 'open', resolvedI: null }; touches.push(t)
    if (beyond(k, a)) { t.outcome = 'break'; t.resolvedI = k; return { born: true, touches, endI: k, end: 'break' } }
    let j = k + 1
    for (; j < N; j++) { const a2 = A[j - 1] || a
      if (beyond(j, a2)) { t.outcome = 'break'; t.resolvedI = j; return { born: true, touches, endI: j, end: 'break' } }
      if (far(j) >= R * a2) { t.outcome = 'respect'; t.resolvedI = j; break } }
    if (j >= N) return { born: true, touches, endI: N - 1, end: 'open', armed: false, pending: t }
    armed = false; k = j }
  return { born: true, touches, endI: N - 1, end: 'open', armed, pending: null }
}
/** Line value at candle index x (for drawing). */
export const lineAt = (ln, x, offset = 0) => ln.p1 + ln.slope * (x - ln.i1) + offset
