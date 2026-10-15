// ════════════════════════════════════════════════════════════════════════════════
// retestSetup.js — the BREAK → RETEST → REJECTION 3m setup (2026-10-15), for the chart's "RETEST (unvalidated)" box.
// The rule is docs/RETEST_SCALP_SPEC.md (the same rule as scripts/study_retest_scalp.mjs): swing levels = the Matrix's confirmed 5/5
// pivots; SELL = a 3m close below the last confirmed swing low L, then within 10 bars a bar trading back to ≥ L − 0.1·ATR14(3m) that closes
// RED below L (a close above L first cancels); BUY mirrored at the last swing high. Entry = that close; SL = its high + 0.50 (low − 0.50).
// MEASURED (retest_scalp_study.json, 13 y OOS): 37.1 % WR at 1 R, −$0.59/trade — DISPLAY ONLY, never a validated signal.
// ════════════════════════════════════════════════════════════════════════════════
import { atr as atrArr } from '../core/indicators.js'
import { confirmedPivots } from './ferrariMatrix.js'
export const RETEST = Object.freeze({ win: 10, tol: 0.1, pad: 0.5, tfMs: 180000 })

/** Every setup on ascending CLOSED 3m bars B: [{ side, t (decision = close time), entry, sl, level, risk }]. */
export function retestSetups(B) {
  const A = atrArr(B, 14), P = confirmedPivots(B), out = [], act = { SELL: null, BUY: null }
  for (let i = 20; i < B.length; i++) { const b = B[i], a = A[i]; if (!(a > 0)) continue
    for (const side of ['SELL', 'BUY']) { const st = act[side], sell = side === 'SELL'
      if (st) { const L = st.L
        if (i - st.i0 > RETEST.win) act[side] = null
        else if (sell ? b.c > L : b.c < L) act[side] = null
        else if (sell ? b.h >= L - RETEST.tol * a && b.c < b.o && b.c < L : b.l <= L + RETEST.tol * a && b.c > b.o && b.c > L) {
          const sl = sell ? b.h + RETEST.pad : b.l - RETEST.pad
          out.push({ side, t: b.t + RETEST.tfMs, entry: b.c, sl, level: L, risk: +Math.abs(sl - b.c).toFixed(2) }); act[side] = null }
        continue }
      const L = sell ? P.lastLowAt[i] : P.lastHighAt[i]; if (Number.isFinite(L) && (sell ? b.c < L : b.c > L)) act[side] = { L, i0: i } } }
  return out
}
