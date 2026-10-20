// study_choch_drift_control.mjs — CHOCH_4H_ADX_SPEC ADDENDUM F (written before its numbers, 2026-10-20): is the ADDENDUM E gold-BUY profit the setup or
// gold's drift? Every E trade (G0, X1/X2/X3, both sides) vs 5 random 4H candles of the same year, same stop distance in ATR(4H), same exit rule.
// Trades: choch4h.trade (one simulator). Output: data/master/choch_drift_control.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { rng } from '../src/core/studyStats.js'
import { CH, findChochs, trade } from './lib/choch4h.mjs'

const END = Date.parse('2026-10-16T21:00:00Z'), SPLIT = Date.parse('2021-07-01T00:00:00Z'), WEEK = 7 * 86400000
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < END), C = kit('XAUUSD', { reopenClamp: false }).build(M, '4H'); markIncomplete(C, findHoles(M))
const A = atrArr(C, 14), spreadAt = makeSpreadAt(), { events } = findChochs(C, M, { from: M[0].t + 60 * 86400000 })
const TR = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'choch_retest_ob_long_trades.json'), 'utf8')).trades
const byYear = {}; for (let i = 20; i < C.length - 2; i++) if (!C[i].incomplete && A[i] > 0) (byYear[new Date(C[i].t).getUTCFullYear()] ??= []).push(i)
const capEnd = (i) => (C[i + 1 + 120] ?? C.at(-1)).t
const oppAfter = (side, t) => { const o = events.find((e) => e.side !== side && e.decisionT > t); return o ? o.decisionT + 60000 : Infinity }
function boot(X, Y, B = 5000, seed = 5) {   // week-block bootstrap of mean(X) − mean(Y), 95 %
  const blocks = (Z) => { const g = new Map(); for (const z of Z) { const k = Math.floor(z.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(z.x) } return [...g.values()] }
  const bx = blocks(X), by = blocks(Y), r = rng(seed), mean = (bs) => { let s = 0, n = 0; for (let k = 0; k < bs.length; k++) for (const v of bs[(r() * bs.length) | 0]) { s += v; n++ } return n ? s / n : 0 }, d = []
  for (let b = 0; b < B; b++) d.push(mean(bx) - mean(by)); d.sort((p, q) => p - q); return [+d[Math.floor(0.025 * B)].toFixed(3), +d[Math.floor(0.975 * B)].toFixed(3)] }
const out = { spec: 'docs/CHOCH_4H_ADX_SPEC.md ADDENDUM F', built_at: new Date().toISOString(), cells: {} }, r = rng(77)
for (const side of ['BUY', 'SELL']) for (const [x, tg] of [['X1', ['X1', 'R', 3]], ['X2', ['X2', 'R', 5]], ['X3', ['X3', 'R', 1e9]]]) {
  const key = `${side}|G0|${x}`, T = TR[key] ?? [], s = side === 'BUY' ? 1 : -1, rand = []
  for (const t of T) { const d = t.R / t.atr, P = byYear[new Date(t.entryT).getUTCFullYear()]; if (!P) continue
    for (let k = 0; k < 5; k++) { const i = P[(r() * P.length) | 0], e0 = lb(M, C[i + 1].t); if (e0 >= M.length) continue
      const b = M[e0], entry = s > 0 ? b.o + spreadAt(b.t) : b.o, stop = entry - s * d * A[i], ev = { side, decisionT: b.t, tip: stop + s * CH.STOP_ATR * A[i], atr: A[i] }
      const endT = x === 'X3' ? Math.min(capEnd(i), oppAfter(side, b.t)) : capEnd(i), z = trade(M, ev, 'E1', tg, spreadAt, endT, 0)
      if (z && !z.open && !z.skipped) rand.push({ entryT: z.entryT, pnl: z.pnl }) } }
  const row = {}
  for (const [w, f] of [['TRAIN', (q) => q.entryT < SPLIT], ['OOS', (q) => q.entryT >= SPLIT]]) { const a = T.filter(f), b = rand.filter(f), m = (Z) => (Z.length ? +(Z.reduce((s2, z) => s2 + z.pnl, 0) / Z.length).toFixed(3) : null)
    row[w] = { setup: { n: a.length, usd: m(a) }, random: { n: b.length, usd: m(b) }, diff: a.length && b.length ? +(m(a) - m(b)).toFixed(3) : null, ci95: a.length && b.length ? boot(a.map((q) => ({ t: q.entryT, x: q.pnl })), b.map((q) => ({ t: q.entryT, x: q.pnl }))) : null } }
  row.adds_beyond_drift = !!(row.TRAIN.ci95 && row.OOS.ci95 && row.TRAIN.ci95[0] > 0 && row.OOS.ci95[0] > 0)
  out.cells[key] = row; console.log(key, JSON.stringify(row)) }
fs.writeFileSync(path.join(TURBO.master, 'choch_drift_control.json'), JSON.stringify(out, null, 1))
