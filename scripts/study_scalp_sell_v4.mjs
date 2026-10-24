// study_scalp_sell_v4.mjs — SCALP_SELL_V4_SPEC (written before any v4 number, 2026-10-24; Ashraf: "Keep searching for a SELL entry with 92% WR and profit
// before anything goes live"). F1k3 SELL + N2 SELL (unchanged entries, scripts/lib/scalp_v2.mjs) × exits X1 / X3 × time stops 30 / 60 / 120 min, K = 12,
// each against a random SELL control with the same exit AND horizon. Then the audit: independent resolver (same horizon) 200 trades, oracle control.
// READ-ONLY research. → data/master/scalp_sell_v4_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { EXITS, hourAtr, spikeFade, goldOnlySpike } from './lib/scalp_v2.mjs'
import { resolveIndependent } from './lib/independent_resolver.mjs'
import { blockBootstrapMean, wilson, rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), SPLIT = Date.parse('2021-06-30T12:36:00Z'), LAST2Y = Date.parse('2024-10-22T00:00:00Z')
const K = 12, LEVEL = 1 - (2 * 0.05) / K, spreadAt = makeSpreadAt(), R = rng(2412), HORIZONS = [30, 60, 120]
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1), T1 = m1.map((b) => b.t)
const silver1m = (await loadBars('XAGUSD', '1m', { from: FROM - 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const stat = (F) => { const n = F.length, w = F.filter((f) => f.net > 0).length, s = F.reduce((a, f) => a + f.net, 0)
  return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilson(w, n).lo.toFixed(4) : null, usd: n ? +(s / n).toFixed(3) : null,
    lb: n ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null } }
const halves = (F) => ({ TRAIN: stat(F.filter((f) => f.t < SPLIT)), OOS: stat(F.filter((f) => f.t >= SPLIT)), LAST2Y: stat(F.filter((f) => f.t >= LAST2Y)) })
const price = async (sigs, horizonMin) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => sigs, horizonMin })).fires
const byHourHalf = new Map(); m1.forEach((b, j) => { const k = `${new Date(b.t).getUTCHours()}|${b.t < SPLIT ? 0 : 1}`; if (!byHourHalf.has(k)) byHourHalf.set(k, []); byHourHalf.get(k).push(j) })
function control(sigs, exit) { const x = EXITS[exit]; return sigs.map((s) => { const L = byHourHalf.get(`${new Date(s.t).getUTCHours()}|${s.t < SPLIT ? 0 : 1}`), b = m1[L[Math.floor(R() * L.length)]]
  const h = ha.at(b.t + 60000); if (!h) return null; const e = b.c
  return { ...s, t: b.t, decisionT: b.t + 60000, entry: e, sl: e + x.stop * h.A, tp1: e - x.tgt * h.A, tp2: e - x.tgt * h.A, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { control: true } } })
  .filter(Boolean).sort((a, b) => a.decisionT - b.decisionT) }

const ENT = { F1k3: (x) => spikeFade(m1, data.B, { k: 3, exit: x, ha }), N2: (x) => goldOnlySpike(m1, data.B, { exit: x, silver1m, ha }) }
const out = { spec: 'docs/SCALP_SELL_V4_SPEC.md', built_at: new Date().toISOString(), K, cells: {}, audit: {} }, pool = []
for (const [ent, gen] of Object.entries(ENT)) for (const exit of ['X1', 'X3']) { const S = gen(exit).filter((s) => s.side === 'SELL'), CS = control(S, exit)
  for (const T of HORIZONS) { const F = await price(S, T), C = await price(CS, T), c = { entry: ent, side: 'SELL', exit, horizon_min: T, signals: S.length, ...halves(F), control: halves(C) }
    c.checks = { train_wr92: c.TRAIN.wr >= 0.92 && c.TRAIN.wr_lb >= 0.88, oos_wr92: c.OOS.wr >= 0.92 && c.OOS.wr_lb >= 0.88, train_money: c.TRAIN.usd > 0 && c.TRAIN.lb > 0,
      oos_money: c.OOS.usd > 0 && c.OOS.lb > 0, beats_control_train: c.TRAIN.usd > c.control.TRAIN.usd, beats_control_oos: c.OOS.usd > c.control.OOS.usd, oos_n30: c.OOS.n >= 30, last2y_money: c.LAST2Y.usd > 0 }
    c.pass = Object.values(c.checks).every(Boolean); c.missed = Object.entries(c.checks).filter(([, v]) => !v).map(([k]) => k); out.cells[`${ent}|${exit}|${T}m`] = c
    pool.push(...F.map((f) => ({ ...f, T })))
    console.log(`${ent} SELL ${exit} ${T}m: TRAIN ${JSON.stringify(c.TRAIN)} · OOS ${JSON.stringify(c.OOS)} · 2y ${c.LAST2Y.usd} · ctrl ${c.control.TRAIN.usd}/${c.control.OOS.usd} · ${c.pass ? 'PASS' : 'fail'}`) } }
out.passes = Object.entries(out.cells).filter(([, c]) => c.pass).map(([k]) => k)
// audit 1: independent resolver with the same time stop
const at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
let diff = 0; for (let k = 0; k < 200; k++) { const f = pool[Math.floor(R() * pool.length)], i = at(f.sig.decisionT), v = resolveIndependent(f.sig, m1.slice(i, i + f.T + 5), spreadAt, f.T); if (v == null || Math.abs(v - f.net) > 1e-3) diff++ }
out.audit.independent_resolver = { trades: 200, of: pool.length, differences: diff }
// audit 2: oracle SELL (look-ahead on purpose: target hit before the stop within 60 min) through the same pipeline, 60-min time stop
const O = []; for (let k = 0; k < 4000; k++) { const j = 20 + Math.floor(R() * (m1.length - 2000)), b = m1[j], h = ha.at(b.t + 60000); if (!h) continue
  const x = EXITS.X1, tp = b.c - x.tgt * h.A, sl = b.c + x.stop * h.A; let good = false
  for (let q = j + 1; q < Math.min(m1.length, j + 60); q++) { const m = m1[q]; if (m.h + 1 >= sl) break; if (m.l <= tp - 0.1) { good = true; break } }
  if (good) O.push({ i: 0, t: b.t, decisionT: b.t + 60000, side: 'SELL', entry: b.c, sl, tp1: tp, tp2: tp, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { oracle: true } }) }
const OF = await price(O.sort((a, b) => a.decisionT - b.decisionT), 60)
out.audit.oracle = { n: OF.length, wr: +(OF.filter((f) => f.net > 0).length / (OF.length || 1)).toFixed(3), usd: +(OF.reduce((s, f) => s + f.net, 0) / (OF.length || 1)).toFixed(3) }
out.audit.clean = diff === 0 && out.audit.oracle.n >= 100 && out.audit.oracle.usd > 0.5 && out.audit.oracle.wr > 0.95
fs.writeFileSync(path.join(TURBO.master, 'scalp_sell_v4_study.json'), JSON.stringify(out, null, 1))
console.log('PASSES', JSON.stringify(out.passes), '| AUDIT', JSON.stringify(out.audit))
