// study_matrix_structure_gate.mjs — skip a Matrix SCALP BUY while the 1H / 4H pivot structure is bearish (spec docs/MATRIX_STRUCTURE_GATE_SPEC.md, written
// before any number; Ashraf 2026-10-20 "the market confirm reversal to Bearish trend and we keep sending signal to buy"). State = choch4h.findChochs
// state on gold-session candles (closed candle at the decision). Money path = scripts/lib/matrix_trades.mjs. Output: data/master/matrix_structure_gate_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { findChochs } from './lib/choch4h.mjs'

const TO = Date.parse('2026-10-16T21:00:00Z'), spreadAt = makeSpreadAt()
const WINDOWS = { PRIMARY: { from: Date.parse('2024-10-10T00:00:00Z'), useWti: true }, ROBUST_13Y: { from: Date.parse('2013-07-21T00:00:00Z'), useWti: false } }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), holes = findHoles(M), K = kit('XAUUSD', { reopenClamp: false })
const TL = {}
// --choch (ADDENDUM A): C1H / C4H = the most recent CHoCH (decision ≤ the signal) is bearish → state −1 (a later bullish CHoCH → +1)
const CHO = process.argv.includes('--choch')
for (const tf of ['1H', '4H']) { const C = K.build(M, tf); markIncomplete(C, holes); const { state, events } = findChochs(C, M, {})
  // closed = close_t AND the whole candle period passed (the live rule, choch4h.structureStateAt, 2026-10-20)
  const tfMs = tf === '1H' ? 3600000 : 4 * 3600000
  TL[tf] = CHO ? { T: events.map((e) => e.decisionT), S: events.map((e) => (e.side === 'SELL' ? -1 : 1)) } : { T: C.map((c) => Math.max(c.close_t, c.t + tfMs)), S: state } }
const stateAt = (tf, t) => { const { T, S } = TL[tf]; let a = 0, b = T.length; while (a < b) { const m = (a + b) >> 1; if (T[m] <= t) a = m + 1; else b = m } return a ? S[a - 1] : 0 }
const CELLS = CHO ? { C1H: '1H', C4H: '4H' } : { V1H: '1H', V4H: '4H' }
const stat = (F) => { const n = F.length, s = F.reduce((a, f) => a + f.net, 0); return { n, usd: n ? +(s / n).toFixed(3) : null, wr: n ? +(F.filter((f) => f.outcome === 'WIN').length / n).toFixed(3) : null, total: +s.toFixed(1) } }
const out = { spec: 'docs/MATRIX_STRUCTURE_GATE_SPEC.md', built_at: new Date().toISOString(), windows: {} }
for (const [wname, W] of Object.entries(WINDOWS)) {
  const base = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt }), split = W.from + 0.6 * (TO - W.from), buys = base.fires.filter((f) => f.side === 'BUY')
  const res = { split: new Date(split).toISOString(), baseline: { TRAIN: stat(buys.filter((f) => f.t < split)), OOS: stat(buys.filter((f) => f.t >= split)) }, cells: {} }
  for (const [cname, tf] of Object.entries(CELLS)) {
    const veto = (s) => s.side === 'BUY' && stateAt(tf, s.decisionT) === -1
    const tagged = buys.map((f) => ({ ...f, v: veto(f.sig) })), filt = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, keep: (s) => !veto(s) }), fb = filt.fires.filter((f) => f.side === 'BUY'), r = {}
    for (const [arm, test] of [['TRAIN', (t) => t < split], ['OOS', (t) => t >= split]]) r[arm] = { vetoed: stat(tagged.filter((f) => f.v && test(f.t))), kept: stat(tagged.filter((f) => !f.v && test(f.t))), filtered_book: stat(fb.filter((f) => test(f.t))) }
    r.checks = { vetoed_worse_train: r.TRAIN.vetoed.usd < r.TRAIN.kept.usd, vetoed_worse_oos: r.OOS.vetoed.usd < r.OOS.kept.usd, book_better_train: r.TRAIN.filtered_book.usd > res.baseline.TRAIN.usd, book_better_oos: r.OOS.filtered_book.usd > res.baseline.OOS.usd }
    if (wname === 'PRIMARY') r.checks.vetoed_n30_oos = r.OOS.vetoed.n >= 30
    res.cells[cname] = r; console.log(wname, cname, JSON.stringify(r)) }
  out.windows[wname] = res }
for (const c of Object.keys(CELLS)) { const p = out.windows.PRIMARY.cells[c].checks, q = out.windows.ROBUST_13Y.cells[c].checks; out.windows.PRIMARY.cells[c].pass = Object.values(p).every(Boolean) && Object.values(q).every(Boolean) }
out.passes = Object.keys(CELLS).filter((c) => out.windows.PRIMARY.cells[c].pass)
fs.writeFileSync(path.join(TURBO.master, CHO ? 'matrix_structure_gate_choch_study.json' : 'matrix_structure_gate_study.json'), JSON.stringify(out, null, 1))
console.log('BASELINE', JSON.stringify(out.windows.PRIMARY.baseline), '| PASSES', out.passes)
