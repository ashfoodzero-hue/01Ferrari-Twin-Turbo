// matrix_nowall.mjs — ONE place for the no-wall continuation SELL (docs/MATRIX_NOWALL_SELL_SPEC.md §1, 2026-11-01), used by
// study_matrix_nowall_sell.mjs (§7 (fo)) and study_down_day_detector.mjs. Moved here unchanged from study_matrix_nowall_sell.mjs.
import { MATRIX, confirmedPivots, emaSeries, wtiHourAt } from '../../src/master/ferrariMatrix.js'
import { atr as atrArr } from '../../src/core/indicators.js'

/** stateAt = makeAligned(...).stateAt; WT = WTI 1m (wti1m(to)); audit = object whose lookahead_violations counter is incremented.
 *  Returns nwSignals({ wti, struct, mode }) → (B, D, startI) → signals in matrixSignals' shape. mode 'choch' = the control (choch alone). */
export function makeNowall({ stateAt, WT, audit = { lookahead_violations: 0 } }) {
  return function nwSignals({ wti, struct, mode = 'nw' }) {
    return (B, D, startI) => {
      const A = atrArr(B, 14), dEma = emaSeries(D, MATRIX.dxyEma), dByT = new Map(D.map((b) => [b.t, b])), PL = confirmedPivots(B).lastLowAt, out = []
      for (let i = Math.max(startI, MATRIX.look + 20); i < B.length; i++) {
        const b = B[i], a = A[i]; if (!a) continue
        const decisionT = b.t + MATRIX.tfMs
        if (!(Number.isFinite(PL[i]) && b.c < PL[i])) continue
        if (mode === 'nw') {
          const d = dByT.get(b.t), de = dEma.get(b.t); if (!d || de == null || !(d.c > de)) continue
          if (wti) { const w = wtiHourAt(WT, decisionT); if (!w || !w.bullish) continue
            if (w.lastMinuteT + 60000 > decisionT - MATRIX.wtiDelayMs) audit.lookahead_violations++ }
          if (struct && stateAt('1H', decisionT) !== -1) continue
        }
        let hi5 = -Infinity; for (let k = i - 4; k <= i; k++) if (B[k].h > hi5) hi5 = B[k].h
        const entry = b.c, sl = hi5 + MATRIX.slPad, risk = Math.abs(entry - sl), reward = Math.max(MATRIX.minReward, MATRIX.rr * risk)
        out.push({ i, t: b.t, decisionT, side: 'SELL', entry, sl, tp1: entry - reward, tp2: entry - MATRIX.tp2Mult * reward, risk, reward, atr: a, ctx: { mode, wti, struct } })
      }
      return out
    }
  }
}
