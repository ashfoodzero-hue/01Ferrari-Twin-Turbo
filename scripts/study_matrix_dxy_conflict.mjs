// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_dxy_conflict.mjs — veto a gold Matrix BUY when DXY's OWN Matrix BUY fires at the same time (spec docs/MATRIX_DXY_CONFLICT_SPEC.md,
// written before any number; Ashraf 2026-10-19 "that should not trigger the trade if it is true at the same time until we know which is fake").
// DXY BUY = ferrariMatrix.matrixSignals(dxy3m, dxy3m, wti1m) (the same script on DXY: its "DXY" series is DXY itself). Money path + sequencing =
// scripts/lib/matrix_trades.mjs (the gate's ONE sequence), veto applied BEFORE sequencing. Output: data/master/matrix_dxy_conflict_study.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { matrixSignals } from '../src/master/ferrariMatrix.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'

const TO = Date.parse('2026-10-16T21:00:00Z'), spreadAt = makeSpreadAt(), MIN = 60000
const WINDOWS = { PRIMARY: { from: Date.parse('2024-10-10T00:00:00Z'), useWti: true }, ROBUST_13Y: { from: Date.parse('2013-07-21T00:00:00Z'), useWti: false } }
const CELLS = { V0: 0, V15: 15 * MIN }
const lbT = (A, t) => { let a = 0, b = A.length; while (a < b) { const m = (a + b) >> 1; if (A[m] < t) a = m + 1; else b = m } return a }
const stat = (F) => { const n = F.length, s = F.reduce((a, f) => a + f.net, 0); return { n, usd: n ? +(s / n).toFixed(3) : null, wr: n ? +(F.filter((f) => f.outcome === 'WIN').length / n).toFixed(3) : null, total: +s.toFixed(1) } }

const out = { spec: 'docs/MATRIX_DXY_CONFLICT_SPEC.md', built_at: new Date().toISOString(), to: new Date(TO).toISOString(), windows: {} }
for (const [wname, W] of Object.entries(WINDOWS)) {
  let dxyBuyT = null
  const dxyTimes = ({ D, W: wti }) => { if (!dxyBuyT) { const k = D.findIndex((b) => b.t >= W.from - 86400000); dxyBuyT = matrixSignals(D, D, wti, { from: Math.max(0, k), useWti: W.useWti }).filter((s) => s.side === 'BUY').map((s) => s.decisionT) } return dxyBuyT }
  const conflict = (s, ctx, win) => { if (s.side !== 'BUY') return false; const T = dxyTimes(ctx), k = lbT(T, s.decisionT - win); return k < T.length && T[k] <= s.decisionT }
  const base = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, keep: (s, ctx) => (dxyTimes(ctx), true) })
  const split = W.from + 0.6 * (TO - W.from), buys = base.fires.filter((f) => f.side === 'BUY')
  const res = { dxy_buy_signals: dxyBuyT.length, split: new Date(split).toISOString(), baseline: { TRAIN: stat(buys.filter((f) => f.t < split)), OOS: stat(buys.filter((f) => f.t >= split)) }, cells: {} }
  for (const [cname, win] of Object.entries(CELLS)) {
    // the conflict tag on the baseline sequence (vetoed arm vs kept arm), and the re-sequenced filtered book (the real money path)
    const ctx = { D: null, W: null }, tagged = buys.map((f) => ({ ...f, conflict: (() => { const T = dxyBuyT, k = lbT(T, f.sig.decisionT - win); return k < T.length && T[k] <= f.sig.decisionT })() }))
    const filt = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, keep: (s, c) => !conflict(s, c, win) })
    const fb = filt.fires.filter((f) => f.side === 'BUY'), r = {}
    for (const [arm, test] of [['TRAIN', (t) => t < split], ['OOS', (t) => t >= split]]) {
      r[arm] = { vetoed: stat(tagged.filter((f) => f.conflict && test(f.t))), kept: stat(tagged.filter((f) => !f.conflict && test(f.t))), filtered_book: stat(fb.filter((f) => test(f.t))) } }
    const P = wname === 'PRIMARY'
    r.checks = { vetoed_n30_oos: r.OOS.vetoed.n >= 30, vetoed_worse_train: r.TRAIN.vetoed.usd < r.TRAIN.kept.usd, vetoed_worse_oos: r.OOS.vetoed.usd < r.OOS.kept.usd,
      book_better_train: r.TRAIN.filtered_book.usd > res.baseline.TRAIN.usd, book_better_oos: r.OOS.filtered_book.usd > res.baseline.OOS.usd }
    if (!P) delete r.checks.vetoed_n30_oos
    res.cells[cname] = r
    console.log(wname, cname, JSON.stringify(r)) }
  out.windows[wname] = res
}
for (const c of Object.keys(CELLS)) { const p = out.windows.PRIMARY.cells[c].checks, q = out.windows.ROBUST_13Y.cells[c].checks
  out.windows.PRIMARY.cells[c].pass = Object.values(p).every(Boolean) && q.vetoed_worse_train && q.vetoed_worse_oos && q.book_better_train && q.book_better_oos }
out.passes = Object.keys(CELLS).filter((c) => out.windows.PRIMARY.cells[c].pass)
fs.writeFileSync(path.join(TURBO.master, 'matrix_dxy_conflict_study.json'), JSON.stringify(out, null, 1))
console.log('BASELINE', JSON.stringify(out.windows.PRIMARY.baseline), '| DXY BUY signals 2y', out.windows.PRIMARY.dxy_buy_signals, '| PASSES', out.passes)
