// ════════════════════════════════════════════════════════════════════════════════
// macroBubbles.js — the visionHunt "4H Macro Trend Divergence Engine" BUBBLE method ONLY (Ashraf's Pine, pasted 2026-10-16), copied exactly.
// Spec + measurement: docs/BUBBLE_SPEC.md. ONE place for the study and the chart.
// ────────────────────────────────────────────────────────────────────────────────
// Pine → here (the source has NO other rule — no volume, no walls, no trend filter; it stores pivot prices but never uses them):
//   rsi = RSI14 (Wilder) of the 4H closes
//   RSI pivots ta.pivothigh/low(rsi, 3, 3): the pivot at p is known at p + 3 (that bar's close) — strict: above/below all 6 neighbours; ties counted
//   🟡 BULL: new RSI pivot LOW  < 35 and > the previous RSI pivot low
//   🔵 BEAR: new RSI pivot HIGH > 65 and < the previous RSI pivot high
//   The Pine plots the bubble at p (offset −3 on a 4H chart); we keep pivotT (where it is drawn) AND knownT (when it was knowable) separately.
// ════════════════════════════════════════════════════════════════════════════════
import { rsi as rsiArr } from '../core/indicators.js'

export const BUBBLE = Object.freeze({ rsiLen: 14, look: 3, os: 35, ob: 65 })
const H4 = 4 * 3600000

/** @param bars ascending CLOSED 4H bars (NY-anchored) · @param barMs bar length (4H default; 1H for the robustness run)
 *  @returns { events: [{ side, pivotI, knownI, pivotT, knownT, rsi, prevRsi, level, count }], ties } */
// tie (2026-10-16 audit: 108 RSI-pivot ties on 4H — Pine does not document its tie rule): 'strict' (default) · 'leftEq' (≥ allowed on the left)
//   · 'rightEq' (≥ allowed on the right). The study runs all three; the conclusion must not depend on it.
export function bubbleEvents(bars, P = BUBBLE, barMs = H4, tie = 'strict') {
  const R = rsiArr(bars, P.rsiLen), L = P.look, ev = []
  let prevLowRsi = null, prevHighRsi = null, ties = 0, lastSide = null, run = 0
  for (let j = 0; j < bars.length; j++) { const p = j - L; if (p - L < 0 || R[p - L] == null) continue
    let isH = true, isL = true, tieH = false, tieL = false
    for (let k = p - L; k <= p + L; k++) { if (k === p) continue
      const eqOk = (tie === 'leftEq' && k < p) || (tie === 'rightEq' && k > p)
      if (R[k] > R[p] || (R[k] === R[p] && !eqOk)) { isH = false; if (R[k] === R[p]) tieH = true }
      if (R[k] < R[p] || (R[k] === R[p] && !eqOk)) { isL = false; if (R[k] === R[p]) tieL = true } }
    if (!isH && tieH) ties++; if (!isL && tieL) ties++
    const push = (side, level, prev) => { run = side === lastSide ? run + 1 : 1; lastSide = side
      ev.push({ side, pivotI: p, knownI: j, pivotT: bars[p].t, knownT: bars[j].t + barMs, rsi: +R[p].toFixed(2), prevRsi: +prev.toFixed(2), level, count: run }) }
    if (isL) { const cur = R[p]; if (prevLowRsi != null && cur < P.os && cur > prevLowRsi) push('BULL', bars[p].l, prevLowRsi); prevLowRsi = cur }
    if (isH) { const cur = R[p]; if (prevHighRsi != null && cur > P.ob && cur < prevHighRsi) push('BEAR', bars[p].h, prevHighRsi); prevHighRsi = cur }
  }
  return { events: ev, ties }
}
