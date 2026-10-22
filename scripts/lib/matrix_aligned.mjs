// matrix_aligned.mjs — ONE place for MATRIX_ALIGNED_SPEC's definitions (2026-10-22): the 1H / 4H structure state at a decision time, the BUY filters
// (V1H book + B1-B4) and the structure-aligned SELL rules (S1-S3, matrixSignals' SELL geometry). Used by study_matrix_aligned.mjs and study_matrix_wr92.mjs.
import { findChochs } from './choch4h.mjs'
import { findHoles, markIncomplete } from '../../src/core/dataHoles.js'
import { MATRIX, matrixLevelsAt, confirmedPivots, emaSeries } from '../../src/master/ferrariMatrix.js'
import { atr as atrArr } from '../../src/core/indicators.js'

const TFMS = { '1H': 3600000, '4H': 4 * 3600000 }

/** M = cleaned gold 1m (reopenClamp false), K = its kit → { stateAt, BUY_CELLS, sellSignals }. State = the full-history findChochs state of the last
 *  candle whose whole period has passed (= the live 45-day structureStateAt — audit_matrix_aligned.mjs). */
export function makeAligned(M, K) {
  const holes = findHoles(M), TL = {}
  for (const tf of ['1H', '4H']) { const C = K.build(M, tf); markIncomplete(C, holes); TL[tf] = { T: C.map((c) => Math.max(c.close_t, c.t + TFMS[tf])), S: findChochs(C, M, {}).state } }
  const stateAt = (tf, t) => { const { T, S } = TL[tf]; let a = 0, b = T.length; while (a < b) { const m = (a + b) >> 1; if (T[m] <= t) a = m + 1; else b = m } return a ? S[a - 1] : 0 }
  const down = (tf, t) => stateAt(tf, t) === -1, up = (tf, t) => stateAt(tf, t) === 1
  const isBuy = (s) => s.side === 'BUY', floorW = (s, B) => B[s.i].l <= s.ctx.floor + s.ctx.cushion, intW = (s, B) => !floorW(s, B) && B[s.i].l <= s.ctx.intWall + s.ctx.cushion
  const V1H = (s) => !(isBuy(s) && down('1H', s.decisionT))
  const BUY_CELLS = {
    V1H,
    B1: (s) => V1H(s) && !(isBuy(s) && down('4H', s.decisionT)),
    B2: (s) => V1H(s) && (!isBuy(s) || (up('1H', s.decisionT) && up('4H', s.decisionT))),
    B3: (s, { B }) => V1H(s) && (!isBuy(s) || floorW(s, B)),
    B4: (s, { B }) => V1H(s) && (!isBuy(s) || intW(s, B)),
  }
  function sellSignals(rule, withStruct) {
    return (B, D, startI) => {
      const A = atrArr(B, 14), dEma = emaSeries(D, MATRIX.dxyEma), dByT = new Map(D.map((b) => [b.t, b])), PL = confirmedPivots(B).lastLowAt, out = []
      for (let i = Math.max(startI, MATRIX.look + 20); i < B.length; i++) {
        const b = B[i], a = A[i]; if (!a) continue
        const L = matrixLevelsAt(B, a, i); if (!L || !(b.h >= L.ceiling - L.cushion)) continue
        const d = dByT.get(b.t), de = dEma.get(b.t); if (!d || de == null) continue
        const decisionT = b.t + MATRIX.tfMs, red = b.c < b.o, choch = Number.isFinite(PL[i]) && b.c < PL[i], dxyBull = d.c > de
        if (!(rule === 'S1' ? red : rule === 'S2' ? red && dxyBull : choch)) continue
        if (withStruct && !(down('1H', decisionT) && down('4H', decisionT))) continue
        let hi5 = -Infinity; for (let k = i - 4; k <= i; k++) if (B[k].h > hi5) hi5 = B[k].h
        const entry = b.c, sl = hi5 + MATRIX.slPad, risk = Math.abs(entry - sl), reward = Math.max(MATRIX.minReward, MATRIX.rr * risk)
        out.push({ i, t: b.t, decisionT, side: 'SELL', entry, sl, tp1: entry - reward, tp2: entry - MATRIX.tp2Mult * reward, risk, reward, atr: a, ctx: { rule, ceiling: L.ceiling, cushion: L.cushion } })
      }
      return out
    }
  }
  return { stateAt, BUY_CELLS, sellSignals }
}

/** Re-price a signal with a SINGLE-target exit (ADDENDUM B): target = tgtR × risk, stop = stopR × risk from the entry; tp1 = tp2 = target, so the live
 *  resolver closes both halves at the target (or both at the stop). */
export function withExit(s, tgtR, stopR) {
  const up = s.side === 'BUY', tgt = up ? s.entry + tgtR * s.risk : s.entry - tgtR * s.risk, sl = up ? s.entry - stopR * s.risk : s.entry + stopR * s.risk
  return { ...s, sl, tp1: tgt, tp2: tgt, risk: stopR * s.risk, reward: tgtR * s.risk, exit: `${tgtR}R/${stopR}R` }
}
