// study_matrix_wti_threshold.mjs — the Matrix with a %-thresholded WTI filter (2026-10-15). Pre-registered: docs/MATRIX_WTI_THRESHOLD_SPEC.md.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixSignals, resolveMatrixTrade, wtiHourAt, MATRIX } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'
const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.parse('2024-10-10T00:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), spreadAt = makeSpreadAt()
const B = (await loadBars('XAUUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars, D = (await loadDxyBars('3m', { from: FROM - 3 * 86400000, to: TO })).bars
const m1 = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, T1 = m1.map((b) => b.t), W = wti1m(TO)
const lb = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
const startI = B.findIndex((b) => b.t >= FROM), sigs = matrixSignals(B, D, [], { from: startI, useWti: false })
console.log(`signals without WTI: ${sigs.length}`)
const withChange = sigs.map((s) => { const w = wtiHourAt(W, s.decisionT); return { s, c: w ? (w.c - w.o) / w.o : null } })
function run(filter) { const tr = []; let busy = -Infinity
  for (const { s, c } of withChange) { if (s.decisionT <= busy || !filter(s, c)) continue
    const k = lb(s.decisionT), r = resolveMatrixTrade(s, m1.slice(k, k + MATRIX.horizonMin + 5), spreadAt); if (!r.done) continue
    busy = r.exitT + 60000; tr.push({ t: s.decisionT, net: r.pnl, tp1: r.outcome.startsWith('TP1') }) }
  let sd = 21; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
  const S = (xs) => { const n = xs.length, m = n ? xs.reduce((a, x) => a + x.net, 0) / n : 0, bs = []; for (let q = 0; q < 4000 && n; q++) { let t = 0; for (let i = 0; i < n; i++) t += xs[(rnd() * n) | 0].net; bs.push(t / n) } bs.sort((a, b) => a - b)
    return { n, tp1_rate: n ? +(xs.filter((x) => x.tp1).length / n).toFixed(4) : null, win_rate: n ? +(xs.filter((x) => x.net > 0).length / n).toFixed(4) : null, net: +m.toFixed(3), net_lb: n ? +bs[Math.floor((0.05 / 3) * bs.length)].toFixed(3) : null } }
  const days = ((TO - SPLIT) / 86400000) * 5 / 7, OOS = S(tr.filter((x) => x.t >= SPLIT)); return { train: S(tr.filter((x) => x.t < SPLIT)), oos: { ...OOS, per_day: +(OOS.n / days).toFixed(2) } } }
const cell = (x) => (s, c) => c != null && (s.side === 'BUY' ? !(c >= x) : c >= x)   // x = 0 → any non-negative rise blocks a BUY (≈ the Pine 'not bullish')
const res = { current_rule_x0: run((s, c) => c != null && (s.side === 'BUY' ? !(c > 0) : c > 0)), x0_10: run(cell(0.001)), x0_25: run(cell(0.0025)), x0_50: run(cell(0.005)), no_wti: run(() => true) }
const base = res.current_rule_x0.oos.net; for (const k of ['x0_10', 'x0_25', 'x0_50']) { const c = res[k]; c.verdict = c.oos.net > base && c.oos.net_lb > 0 && c.train.net > 0 ? 'BETTER' : 'NOT_BETTER' }
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(16), `OOS ${v.oos.n} t (${v.oos.per_day}/d) TP1-hit ${v.oos.tp1_rate} win ${v.oos.win_rate} $/t ${v.oos.net} [LB ${v.oos.net_lb}] · TRAIN $/t ${v.train.net}${v.verdict ? ' → ' + v.verdict : ''}`)
fs.writeFileSync(path.join(TURBO.master, 'matrix_wti_threshold.json'), JSON.stringify({ at: new Date().toISOString(), spec: 'docs/MATRIX_WTI_THRESHOLD_SPEC.md', ...res }, null, 1))
