// study_matrix_wr92.mjs — MATRIX_ALIGNED_SPEC ADDENDUM B (written before its numbers, 2026-10-22; Ashraf: "checking the scalp until you reach 92% WR in
// both buy and sell"): the same entries (BUY: V1H book, B1-B4; SELL: S1-S3 structure-aligned) re-priced with single-target exits — target {0.10,0.15,
// 0.20,0.25}×risk, stop {2,3,4}×risk — by the LIVE resolver (resolveMatrixTrade via matrix_trades.mjs), one trade at a time per cell. K = 96.
// Pass per side: WR ≥ 92 % (Wilson LB ≥ 88 %) in TRAIN and OOS, $/t > 0 with week-block LB > 0 at α/96, OOS n ≥ 30, 13 y WR ≥ 92 % and $/t > 0.
// READ-ONLY research. → data/master/matrix_wr92_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades, wti1m } from './lib/matrix_trades.mjs'
import { makeAligned, withExit } from './lib/matrix_aligned.mjs'
import { matrixSignals } from '../src/master/ferrariMatrix.js'
import { blockBootstrapMean, wilson } from '../src/core/studyStats.js'

const TO = Date.parse('2026-10-21T21:00:00Z'), spreadAt = makeSpreadAt(), K = 96, LEVEL = 1 - (2 * 0.05) / K
const WINDOWS = { PRIMARY: { from: Date.parse('2024-10-10T00:00:00Z'), useWti: true, split: Date.parse('2025-12-26T03:00:00Z') },
  ROBUST_13Y: { from: Date.parse('2013-07-21T00:00:00Z'), useWti: false, split: Date.parse('2021-06-30T12:36:00Z') } }
const TGT = [0.10, 0.15, 0.20, 0.25], STOP = [2, 3, 4]
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), KT = kit('XAUUSD', { reopenClamp: false })
const { BUY_CELLS, sellSignals } = makeAligned(M, KT)
const ENTRIES = { ...Object.fromEntries(Object.keys(BUY_CELLS).map((c) => [c, 'BUY'])), S1: 'SELL', S2: 'SELL', S3: 'SELL' }

const stat = (F) => { const n = F.length, w = F.filter((f) => f.net > 0).length, s = F.reduce((a, f) => a + f.net, 0)
  return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilson(w, n).lo.toFixed(4) : null, usd: n ? +(s / n).toFixed(3) : null,
    lb: n ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null } }
const out = { spec: 'docs/MATRIX_ALIGNED_SPEC.md#addendum-b', built_at: new Date().toISOString(), tape_to: new Date(TO).toISOString(), K, cells: {} }

for (const [wname, W] of Object.entries(WINDOWS)) {
  const first = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt }), data = { B: first.B, D: first.D, m1: first.m1 }   // the tape, loaded once
  const Wt = W.useWti ? wti1m(TO) : []
  for (const [entry, side] of Object.entries(ENTRIES)) {
    // the entry set's signals (BUY: live signals that pass the filter, BUYs only; SELL: the structure-aligned rule)
    const base = side === 'BUY'
      ? (B, D, s0) => matrixSignals(B, D, Wt, { from: s0, useWti: W.useWti }).filter((s) => s.side === 'BUY' && BUY_CELLS[entry](s, { B }))
      : sellSignals(entry, true)
    for (const tg of TGT) for (const sp of STOP) {
      const key = `${entry}|${tg}R/${sp}R`, F = (await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, data, signals: (B, D, s0) => base(B, D, s0).map((s) => withExit(s, tg, sp)) })).fires
      const c = (out.cells[key] ??= { entry, side, exit: `${tg}R/${sp}R` })
      c[wname] = wname === 'PRIMARY' ? { TRAIN: stat(F.filter((f) => f.t < W.split)), OOS: stat(F.filter((f) => f.t >= W.split)) } : { ALL: stat(F) } }
    console.log(wname, entry, 'done') }
}
for (const c of Object.values(out.cells)) { const P = c.PRIMARY, R = c.ROBUST_13Y?.ALL
  c.checks = { train_wr92: P.TRAIN.wr >= 0.92 && P.TRAIN.wr_lb >= 0.88, oos_wr92: P.OOS.wr >= 0.92 && P.OOS.wr_lb >= 0.88, train_money: P.TRAIN.usd > 0 && P.TRAIN.lb > 0,
    oos_money: P.OOS.usd > 0 && P.OOS.lb > 0, oos_n30: P.OOS.n >= 30, robust_wr92: R?.wr >= 0.92, robust_money: R?.usd > 0 }
  c.pass = Object.values(c.checks).every(Boolean); c.missed = Object.entries(c.checks).filter(([, v]) => !v).map(([k]) => k) }
const cells = Object.entries(out.cells)
out.passes = { BUY: cells.filter(([, c]) => c.side === 'BUY' && c.pass).map(([k]) => k), SELL: cells.filter(([, c]) => c.side === 'SELL' && c.pass).map(([k]) => k) }
// closest per side: most checks met, then OOS $/t
for (const side of ['BUY', 'SELL']) out[`closest_${side}`] = cells.filter(([, c]) => c.side === side).sort((a, b) => a[1].missed.length - b[1].missed.length || b[1].PRIMARY.OOS.usd - a[1].PRIMARY.OOS.usd).slice(0, 5)
  .map(([k, c]) => ({ cell: k, missed: c.missed, oos: c.PRIMARY.OOS, train: c.PRIMARY.TRAIN, robust: c.ROBUST_13Y?.ALL }))
fs.writeFileSync(path.join(TURBO.master, 'matrix_wr92_study.json'), JSON.stringify(out, null, 1))
console.log('PASSES', JSON.stringify(out.passes)); for (const s of ['BUY', 'SELL']) for (const c of out[`closest_${s}`]) console.log(s, c.cell, 'missed', c.missed.join(','), 'OOS', JSON.stringify(c.oos), 'TRAIN', JSON.stringify(c.train), '13y', JSON.stringify(c.robust))
