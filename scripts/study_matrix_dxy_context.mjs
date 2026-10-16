// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_dxy_context.mjs — Ashraf's 12:24 post-mortem: do Matrix BUYs do worse when DXY's 15m trend is still UP, or when the WTI/DXY context
// flipped on the signal bar itself? (2026-10-16). Pre-registered: docs/MATRIX_DXY_CONTEXT_SPEC.md. Output: data/master/matrix_dxy_context_study.json
// Kept-vs-skipped split of the Matrix's OWN trade sequence (skipping does not re-sequence later trades — a conservative simplification).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { emaSeries, wtiHourAt, MATRIX } from '../src/master/ferrariMatrix.js'
import { matrixTrades, wti1m } from './lib/matrix_trades.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.parse('2024-10-10T00:00:00Z'), K = 2, ALPHA = 0.05 / K
const { fires, B } = await matrixTrades({ from: FROM, to: TO, useWti: true, spreadAt: makeSpreadAt() })
const D3 = (await loadDxyBars('3m', { from: FROM - 3 * 86400000, to: TO })).bars, D15 = (await loadDxyBars('15m', { from: FROM - 5 * 86400000, to: TO })).bars, W = wti1m(TO)
const e3 = emaSeries(D3, MATRIX.dxyEma), e15 = emaSeries(D15, 10), d3By = new Map(D3.map((b) => [b.t, b]))
const lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
const buys = fires.filter((f) => f.side === 'BUY' && f.fold >= 0)
for (const f of buys) { const i = f.sig.i, T = f.sig.decisionT
  const j = lastClosed(D15, 900000, T); f.dxy15up = j >= 0 && e15.get(D15[j].t) != null ? D15[j].c > e15.get(D15[j].t) : null
  const pb = B[i - 1], dp = pb && d3By.get(pb.t), ep = pb && e3.get(pb.t), wp = pb && wtiHourAt(W, pb.t + MATRIX.tfMs)
  f.prevCtx = !!(dp && ep != null && wp) && !wp.bullish && dp.c < ep; f.fresh = !f.prevCtx }
let seed = 31; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const st = (xs) => { const n = xs.length, w = xs.filter((x) => x.net > 0).length; return { n, wr: n ? +(w / n).toFixed(4) : null, net: n ? +(xs.reduce((a, x) => a + x.net, 0) / n).toFixed(3) : null } }
const diffLB = (xs, keep) => { const v = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < xs.length; i++) s.push(xs[(rnd() * xs.length) | 0]); const k = s.filter(keep); if (!k.length) continue
    v.push(k.reduce((a, x) => a + x.net, 0) / k.length - s.reduce((a, x) => a + x.net, 0) / s.length) } v.sort((a, b) => a - b); return +v[Math.floor(ALPHA * v.length)].toFixed(3) }
const res = { at: new Date().toISOString(), spec: 'docs/MATRIX_DXY_CONTEXT_SPEC.md', buys: buys.length, cells: {} }
const F = { 'F-DXY15': (f) => f.dxy15up !== true, 'F-FRESH': (f) => !f.fresh, 'BOTH (reported)': (f) => f.dxy15up !== true && !f.fresh }
for (const [k, keep] of Object.entries(F)) { const O = buys.filter((f) => f.fold >= 5), T = buys.filter((f) => f.fold < 5)
  const r = { removes_share: +(buys.filter((f) => !keep(f)).length / buys.length).toFixed(3), oos: { all: st(O), kept: st(O.filter(keep)), skipped: st(O.filter((f) => !keep(f))) }, train: { all: st(T), kept: st(T.filter(keep)), skipped: st(T.filter((f) => !keep(f))) } }
  r.oos_gain = +(r.oos.kept.net - r.oos.all.net).toFixed(3); r.train_gain = +(r.train.kept.net - r.train.all.net).toFixed(3); r.gain_lb = diffLB(O, keep)
  r.verdict = k.includes('reported') ? 'REPORTED' : r.oos.kept.n >= 100 && r.oos_gain >= 0.5 && r.gain_lb > 0 && r.train_gain > 0 ? 'HELPS' : 'NO_HELP'
  res.cells[k] = r
  console.log(`${k.padEnd(16)} removes ${(100 * r.removes_share).toFixed(0)}% of BUYs · OOS all ${r.oos.all.net} (WR ${r.oos.all.wr}) → kept ${r.oos.kept.net} (n ${r.oos.kept.n}, WR ${r.oos.kept.wr}) · skipped ${r.oos.skipped.net} (n ${r.oos.skipped.n}, WR ${r.oos.skipped.wr}) · gain ${r.oos_gain} LB ${r.gain_lb} · TRAIN gain ${r.train_gain} → ${r.verdict}`) }
fs.writeFileSync(path.join(TURBO.master, 'matrix_dxy_context_study.json'), JSON.stringify(res, null, 1))
