// study_matrix_aligned.mjs — Matrix SCALP aligned with structure + the right wall: BUY filters B1-B4 on the V1H book, structure-aligned SELLs S1-S3
// (spec docs/MATRIX_ALIGNED_SPEC.md + ADDENDUM A, written before any number; Ashraf 2026-10-22: "we did not take short trades … buy trades keeps running
// but with taking the correct structure and time on the correct wall levels" / "make sure you do not make errors with buy setting only fix the failing
// errors"). READ-ONLY research: nothing live is touched. Money = resolveMatrixTrade via scripts/lib/matrix_trades.mjs. → data/master/matrix_aligned_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { makeAligned } from './lib/matrix_aligned.mjs'
import { matrixSignals } from '../src/master/ferrariMatrix.js'
import { blockBootstrapMean } from '../src/core/studyStats.js'

const TO = Date.parse('2026-10-21T21:00:00Z'), spreadAt = makeSpreadAt(), LEVEL = 1 - (2 * 0.05) / 3   // one-sided α/3 lower bound
const WINDOWS = { PRIMARY: { from: Date.parse('2024-10-10T00:00:00Z'), useWti: true, split: Date.parse('2025-12-26T03:00:00Z') },
  ROBUST_13Y: { from: Date.parse('2013-07-21T00:00:00Z'), useWti: false, split: Date.parse('2021-06-30T12:36:00Z') } }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), K = kit('XAUUSD', { reopenClamp: false })
// ONE place (scripts/lib/matrix_aligned.mjs): the structure state, the V1H book + BUY filters B1-B4, the SELL rules S1-S3
const { BUY_CELLS: { V1H, ...BUY_CELLS }, sellSignals } = makeAligned(M, K)

const stat = (F) => { const n = F.length, s = F.reduce((a, f) => a + f.net, 0); return { n, usd: n ? +(s / n).toFixed(3) : null, wr: n ? +(F.filter((f) => f.net > 0).length / n).toFixed(3) : null, total: +s.toFixed(1) } }
const lb = (F) => (F.length ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null)
const out = { spec: 'docs/MATRIX_ALIGNED_SPEC.md', built_at: new Date().toISOString(), tape_to: new Date(TO).toISOString(), windows: {}, parity: {} }

for (const [wname, W] of Object.entries(WINDOWS)) {
  const arms = [['TRAIN', (t) => t < W.split], ['OOS', (t) => t >= W.split]], res = { split: new Date(W.split).toISOString(), buy: {}, sell: {} }
  // BUY: the V1H book, then each filter (removed vs kept tagged on the V1H book's BUY fires; filtered book re-sequenced)
  const base = await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, keep: V1H }), bb = base.fires.filter((f) => f.side === 'BUY')
  res.buy.V1H_book = Object.fromEntries(arms.map(([a, ok]) => [a, stat(bb.filter((f) => ok(f.t)))]))
  for (const [c, keep] of Object.entries(BUY_CELLS)) {
    const tagged = bb.map((f) => ({ ...f, rm: !keep(f.sig, { B: base.B }) })), fb = (await matrixTrades({ from: W.from, to: TO, useWti: W.useWti, spreadAt, keep })).fires.filter((f) => f.side === 'BUY'), r = {}
    for (const [a, ok] of arms) r[a] = { removed: stat(tagged.filter((f) => f.rm && ok(f.t))), kept: stat(tagged.filter((f) => !f.rm && ok(f.t))), filtered_book: stat(fb.filter((f) => ok(f.t))) }
    r.checks = { removed_worse_train: r.TRAIN.removed.usd < r.TRAIN.kept.usd, removed_worse_oos: r.OOS.removed.usd < r.OOS.kept.usd,
      book_better_train: r.TRAIN.filtered_book.usd > res.buy.V1H_book.TRAIN.usd, book_better_oos: r.OOS.filtered_book.usd > res.buy.V1H_book.OOS.usd }
    if (wname === 'PRIMARY') r.checks.removed_n30_oos = r.OOS.removed.n >= 30
    res.buy[c] = r; console.log(wname, c, JSON.stringify(r)) }
  // SELL: each rule with structure + its no-structure control, sequenced alone
  for (const rule of ['S1', 'S2', 'S3']) { const r = {}
    for (const [k, ws] of [['aligned', true], ['control', false]]) { const F = (await matrixTrades({ from: W.from, to: TO, useWti: false, spreadAt, signals: sellSignals(rule, ws) })).fires
      r[k] = Object.fromEntries([...arms, ['ALL', () => true]].map(([a, ok]) => { const G = F.filter((f) => ok(f.t)); return [a, { ...stat(G), lb: lb(G) }] })) }
    res.sell[rule] = r; console.log(wname, rule, JSON.stringify(r)) }
  out.windows[wname] = res
}
// pass rules (spec)
const P = out.windows.PRIMARY, R = out.windows.ROBUST_13Y
for (const c of Object.keys(BUY_CELLS)) P.buy[c].pass = Object.values(P.buy[c].checks).every(Boolean) && Object.values(R.buy[c].checks).every(Boolean)
for (const s of ['S1', 'S2', 'S3']) { const a = P.sell[s].aligned, c = P.sell[s].control
  P.sell[s].checks = { train_pos: a.TRAIN.usd > 0, oos_pos: a.OOS.usd > 0, train_lb_pos: a.TRAIN.lb > 0, oos_lb_pos: a.OOS.lb > 0, oos_n30: a.OOS.n >= 30,
    beats_control_train: a.TRAIN.usd > c.TRAIN.usd, beats_control_oos: a.OOS.usd > c.OOS.usd, robust13y_pos: R.sell[s].aligned.ALL.usd > 0 }
  P.sell[s].pass = Object.values(P.sell[s].checks).every(Boolean) }
out.passes = [...Object.keys(BUY_CELLS).filter((c) => P.buy[c].pass), ...['S1', 'S2', 'S3'].filter((s) => P.sell[s].pass)]
// parity (ADDENDUM A): "red + DXY bullish, no structure" = matrixSignals(useWti:false, sellRule:'red') SELLs on the PRIMARY window
{ const t = await matrixTrades({ from: WINDOWS.PRIMARY.from, to: TO, useWti: false, spreadAt, signals: (B, D, s0) => matrixSignals(B, D, [], { from: s0, useWti: false, sellRule: 'red' }).filter((x) => x.side === 'SELL') })
  const mine = await matrixTrades({ from: WINDOWS.PRIMARY.from, to: TO, useWti: false, spreadAt, signals: sellSignals('S2', false) })
  const a = t.fires.map((f) => `${f.t}|${f.net}`).join(','), b = mine.fires.map((f) => `${f.t}|${f.net}`).join(',')
  out.parity = { matrixSignals_red_sells: t.fires.length, study_S2_control: mine.fires.length, identical: a === b } }
fs.writeFileSync(path.join(TURBO.master, 'matrix_aligned_study.json'), JSON.stringify(out, null, 1))
console.log('PARITY', JSON.stringify(out.parity), '| PASSES', JSON.stringify(out.passes))
