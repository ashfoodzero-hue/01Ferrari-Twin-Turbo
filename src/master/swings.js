// swings.js — ATR-scaled ZigZag swings for ANY timeframe, with the FAILED extremes that serve as controls (2026-10-17; swing-candle study).
// ONE rule, used by every study that needs swing points:
//   • a leg's running extreme is the highest high (up-leg) / lowest low (down-leg) since the last confirmed swing
//   • a SWING is confirmed when price moves k × ATR(atrLen) of that timeframe away from the running extreme (high → low, low → high);
//     the swing point is the bar of that extreme; `knownI` is the bar that confirmed it (causal: nothing before knownI may use it)
//   • a FAILED extreme is a bar that WAS the running extreme and then got exceeded before any reversal confirmed — the same leg, the same
//     context, but it did NOT become the swing. `pullback_atr` = how far price came back from it before it was exceeded (in ATR), so a
//     study can pick "looked like a turn, then failed" controls (e.g. pullback ≥ 1 ATR) in its pre-registered spec.
//   • ATR is the Wilder ATR of the CLOSED bar before the reversal test (atrAt = ATR[i]); sizes are in ATR units, never dollars.
//   • `breaks` (bar indices, e.g. candles that overlap a data hole) reset the ZigZag: no swing or failed extreme spans a break.
import { atr as atrArr } from '../core/indicators.js'

/**
 * @param bars ascending candles {t,o,h,l,c}
 * @param opts { k = 3, atrLen = 14, breaks = Set<index> }
 * @returns { swings: [{ i, type: 'H'|'L', px, t, knownI, knownT, amp_atr, atr }], failed: [{ i, type, px, t, supersededI, pullback_atr, atr }] }
 */
export function zigzag(bars, { k = 3, atrLen = 14, breaks = new Set() } = {}) {
  const A = atrArr(bars, atrLen), swings = [], failed = []
  let dir = 0, ext = -1, extPx = null, lastSwingPx = null, worst = null   // dir +1 = up-leg (tracking highs), −1 = down-leg (lows); worst = deepest pullback since ext
  const start = (i) => { dir = 0; ext = -1; extPx = null; lastSwingPx = null; worst = null; return i }
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], a = A[i]
    if (breaks.has(i)) { start(i); continue }
    if (a == null || !(a > 0)) continue
    if (dir === 0) {   // seed: wait for a k-ATR move from the first bar's range to fix the first direction
      if (ext < 0) { ext = i; extPx = { h: b.h, l: b.l, hi: i, li: i }; continue }
      if (b.h > extPx.h) { extPx.h = b.h; extPx.hi = i } if (b.l < extPx.l) { extPx.l = b.l; extPx.li = i }
      if (extPx.h - b.l >= k * a && extPx.hi < i) { dir = -1; ext = extPx.hi; push('H', extPx.hi, extPx.h, i, a); ext = i; extPx = b.l; worst = b.l }
      else if (b.h - extPx.l >= k * a && extPx.li < i) { dir = 1; ext = extPx.li; push('L', extPx.li, extPx.l, i, a); ext = i; extPx = b.h; worst = b.h }
      continue }
    if (dir > 0) {   // up-leg: tracking the highest high
      if (b.h > extPx) { if (ext >= 0 && worst != null) failed.push({ i: ext, type: 'H', px: extPx, t: bars[ext].t, supersededI: i, pullback_atr: (extPx - worst) / (A[ext] || a), atr: A[ext] || a })
        ext = i; extPx = b.h; worst = b.h; continue }
      if (b.l < worst) worst = b.l
      if (extPx - b.l >= k * a) { push('H', ext, extPx, i, a); dir = -1; ext = i; extPx = b.l; worst = b.l } }
    else {           // down-leg: tracking the lowest low
      if (b.l < extPx) { if (ext >= 0 && worst != null) failed.push({ i: ext, type: 'L', px: extPx, t: bars[ext].t, supersededI: i, pullback_atr: (worst - extPx) / (A[ext] || a), atr: A[ext] || a })
        ext = i; extPx = b.l; worst = b.l; continue }
      if (b.h > worst) worst = b.h
      if (b.h - extPx >= k * a) { push('L', ext, extPx, i, a); dir = 1; ext = i; extPx = b.h; worst = b.h } }
  }
  function push(type, i, px, knownI, a) {
    const prev = swings.at(-1)
    swings.push({ i, type, px, t: bars[i].t, knownI, knownT: bars[knownI].t, amp_atr: prev && prev.type !== type ? Math.abs(px - prev.px) / a : null, atr: A[i] ?? a })
    lastSwingPx = px }
  return { swings, failed }
}
