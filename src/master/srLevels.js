// srLevels.js — the ONE implementation of objective S/R levels (spec docs/SR_LEVELS_SPEC.md; Ashraf 2026-10-18: "Yes, run it as written",
// WTI "Show, marked DELAYED"). Used by the study (scripts/study_sr_levels.mjs), the live refresh and the app, so what is shown is what was measured.
//   • a level = a confirmed ZigZag 3 × ATR swing of its timeframe (the swing-table rule): swing high → resistance, swing low → support; born at the
//     confirmation candle (`knownI`), nothing earlier uses it. `reaction` = the swing leg into it, in ATR (known at confirmation).
//   • life on its OWN timeframe: alive until a candle CLOSES 0.5 ATR beyond → FLIPPED (support ↔ resistance, tracked once more); a second close-through
//     retires it.
//   • touch: an ARMED level (a whole candle was ≥ 1 ATR away on its side since birth / the last test / the flip) is touched when a candle comes within
//     0.25 ATR. HELD = a later candle reaches 1 ATR away before any candle closes 0.5 ATR through; BROKE = that close comes first (= the flip). The
//     touch candle itself can only break (its far extreme may have printed before the touch). ATR = ATR(14) of the previous closed candle.
//   • `held_before` = held tests of the level in its current phase before this one (the "touches" strength feature).
//   • placebo: the same level shifted by d × ATR(birth), d ∈ {+0.75, −0.75, +1.5, −1.5}, through the identical rules.
// Proof: scripts/smoke_sr_levels.mjs.
import { zigzag } from './swings.js'

export const SR = Object.freeze({ K: 3, TOUCH: 0.25, BREAK: 0.5, AWAY: 1, R: 1, PLACEBO: [0.75, -0.75, 1.5, -1.5], CONFLUENCE_ATR1D: 0.25 })
export const SR_TFS = ['1H', '4H', '1D', '1W', '1M']

/** Levels of one timeframe from its candles: [{ i, side, px, birth, reaction_atr, atr }] */
export function swingLevels(C, breaks = new Set(), k = SR.K) {
  return zigzag(C, { k, breaks }).swings.map((s) => ({ i: s.i, side: s.type === 'L' ? 'support' : 'resistance', px: s.px, birth: s.knownI, reaction_atr: s.amp_atr, atr: s.atr }))
}

/** Run one level (offset 0 = real; d × ATR(birth) = placebo).
 *  → { touches: [{ i, test, phase, side, held_before, outcome 'held'|'broke'|'open', resolvedI }], flips: [i], end 'open'|'retired', endI, phase, side, armed, pending } */
export function evaluateLevel(C, A, lv, offset = 0, { touch = SR.TOUCH, brk = SR.BREAK, away = SR.AWAY, R = SR.R } = {}) {
  const v = lv.px + offset, N = C.length, touches = [], flips = []
  let s = lv.side === 'support' ? 1 : -1, phase = 0, armed = false, held = 0, test = 0
  const side = () => (s > 0 ? 'support' : 'resistance')
  const beyond = (k, a) => s * (C[k].c - v) <= -brk * a
  const near = (k) => (s > 0 ? C[k].l - v : v - C[k].h), far = (k) => (s > 0 ? C[k].h - v : v - C[k].l)
  const flip = (k) => { flips.push(k); if (phase === 1) return true; phase = 1; s = -s; armed = false; held = 0; test = 0; return false }
  for (let k = lv.birth + 1; k < N; k++) { const a = A[k - 1]; if (!(a > 0)) continue
    if (!armed) { if (beyond(k, a)) { if (flip(k)) return { touches, flips, end: 'retired', endI: k, phase, side: side(), armed: false, pending: null }; continue }
      if (near(k) >= away * a) armed = true; continue }
    if (near(k) > touch * a) continue
    const t = { i: k, test: ++test, phase, side: side(), held_before: held, outcome: 'open', resolvedI: null }; touches.push(t)
    if (beyond(k, a)) { t.outcome = 'broke'; t.resolvedI = k; if (flip(k)) return { touches, flips, end: 'retired', endI: k, phase, side: side(), armed: false, pending: null }; continue }
    let j = k + 1, done = false
    for (; j < N; j++) { const a2 = A[j - 1] || a
      if (beyond(j, a2)) { t.outcome = 'broke'; t.resolvedI = j; if (flip(j)) return { touches, flips, end: 'retired', endI: j, phase, side: side(), armed: false, pending: null }; done = true; break }
      if (far(j) >= R * a2) { t.outcome = 'held'; t.resolvedI = j; held++; armed = false; done = true; break } }
    if (!done) return { touches, flips, end: 'open', endI: N - 1, phase, side: side(), armed: false, pending: t }
    k = j }
  return { touches, flips, end: 'open', endI: N - 1, phase, side: side(), armed, pending: null }
}
