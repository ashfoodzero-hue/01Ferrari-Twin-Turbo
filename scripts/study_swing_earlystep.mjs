// ════════════════════════════════════════════════════════════════════════════════
// study_swing_earlystep.mjs — Phase 4D: the ladder trade entered on an EARLIER step (2026-10-17). Pre-registered: docs/SWING_EARLYSTEP_SPEC.md.
// Identical engine to Phase 4B (study_swing_trade.mjs): live causal trigger, next-1m-open entry at ask, stop P ∓ 0.10 × ATR14(anchor), E1 = 1R,
// E2 = P ± 3 × ATR14(anchor), time stop 20 anchor candles, stop first, one trade at a time per cell, random control (3, same geometry in ATR).
// Steps: Z2 = two steps below, Z3 = three steps below. MODE=onestep runs Z = one step below (must reproduce Phase 4B exactly; consistency check).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'
import { blockBootstrapMean, rng } from '../src/core/studyStats.js'
import { rangeIndex, liveSignals, simulate } from './lib/swing_trade.mjs'

const MODE = process.env.MODE || 'early'
const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), K = MODE === 'onestep' ? 12 : 24, ALPHA = 0.05 / K
const STEPS = MODE === 'onestep' ? { '15m': { Z1: '5m' }, '1H': { Z1: '30m' }, '4H': { Z1: '3H' }, '1D': { Z1: '9H' } }
  : { '15m': { Z2: '3m', Z3: '1m' }, '1H': { Z2: '15m', Z3: '5m' }, '4H': { Z2: '2H', Z3: '1H' }, '1D': { Z2: '6H', Z3: '4H' } }
const DUR = { '15m': 15, '1H': 60, '4H': 240, '1D': 1440 }, MIN_N = { '15m': 100, '1H': 100, '4H': 30, '1D': Infinity }
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
const med = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[s.length >> 1] }
console.log(`loading gold 1m … (mode ${MODE})`)
const M = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars, holes = findHoles(M), R = rangeIndex(M), spreadAt = makeSpreadAt()
const holeMs = holes.map((h) => [h.from - 2 * 86400000, h.to + 2 * 86400000])
const cache = {}, series = (tf) => (cache[tf] ??= (() => { const C = buildCandles(M, tf); markIncomplete(C, holes); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); return { C, swings: zigzag(C, { k: 3, breaks }).swings, A: atrArr(C, 14) } })())
const pool = new Map(); for (let i = 0; i < M.length - 1; i++) { const key = new Date(M[i].t).getUTCFullYear() + '|' + nyHour(M[i].t); if (!pool.has(key)) pool.set(key, []); pool.get(key).push(i) }
const r = rng(4242), trades = [], res = { at: new Date().toISOString(), spec: 'docs/SWING_EARLYSTEP_SPEC.md', mode: MODE, window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const [A, steps] of Object.entries(STEPS)) {
  const a = series(A), closeIdx = (t) => { let lo = 0, hi = a.C.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a.C[m].close_t <= t) lo = m + 1; else hi = m } return lo - 1 }, atrAt = (t) => { const k = closeIdx(t); return k >= 0 ? a.A[k] : null }
  const out = { anchor: A, steps, cells: {}, skipped: {}, signals: {} }
  for (const [stepKey, Z] of Object.entries(steps)) { const z = series(Z), sig = liveSignals({ M, R, CA: a.C, swA: a.swings, CX: z.C, swX: z.swings }); out.signals[stepKey] = sig.length
    for (const exit of ['E1', 'E2']) { let openUntil = -Infinity; const skipped = { busy: 0, hole: 0, no_atr: 0, target_passed: 0 }
      for (const s of sig) { if (s.t < openUntil) { skipped.busy++; continue }
        const atr = atrAt(s.t); if (!(atr > 0)) { skipped.no_atr++; continue }
        const tEnd = s.t + 20 * DUR[A] * 60000; if (holeMs.some(([h0, h1]) => s.t < h1 && tEnd > h0)) { skipped.hole++; continue }
        const k = R.at(s.t); if (k >= M.length) continue
        const long = s.side === 'long', entry = long ? M[k].o + spreadAt(M[k].t) : M[k].o, stop = long ? s.P - 0.1 * atr : s.P + 0.1 * atr
        const target = exit === 'E1' ? (long ? entry + (entry - stop) : entry - (stop - entry)) : (long ? s.P + 3 * atr : s.P - 3 * atr)
        if (long ? entry >= target : entry <= target) { skipped.target_passed++; continue }
        const t = simulate(M, k, { side: s.side, stop, target, tEnd, spreadAt }); if (!t) continue
        openUntil = t.exitT + 60000
        const dS = Math.abs(entry - stop) / atr, dT = Math.abs(target - entry) / atr, pl = pool.get(new Date(s.t).getUTCFullYear() + '|' + nyHour(s.t)) ?? [], rr = []
        for (let q = 0; q < 3 && pl.length; q++) { const j = pl[(r() * pl.length) | 0], at2 = atrAt(M[j].t); if (!(at2 > 0)) continue
          const e2 = long ? M[j].o + spreadAt(M[j].t) : M[j].o, st2 = long ? e2 - dS * at2 : e2 + dS * at2, tg2 = long ? e2 + dT * at2 : e2 - dT * at2
          const zz = simulate(M, j, { side: s.side, stop: st2, target: tg2, tEnd: M[j].t + 20 * DUR[A] * 60000, spreadAt }); if (zz) rr.push(zz.R) }
        trades.push({ anchor: A, step: stepKey, Z, side: s.side, t: s.t, sp: s.t < SPLIT ? 'T' : 'O', P: s.P, atr, entry, stop, target, ...t, exit_px: t.exit, exit, dist_atr: Math.abs(entry - s.P) / atr, risk_atr: Math.abs(entry - stop) / atr, rr: Math.abs(target - entry) / Math.abs(entry - stop), rand_R: rr.length ? rr.reduce((p, v) => p + v, 0) / rr.length : null }) }
      out.skipped[`${stepKey} ${exit}`] = skipped }
    for (const exit of ['E1', 'E2']) for (const side of ['long', 'short']) { const key = `${A} ${side} ${stepKey}(${Z}) ${exit}`, cell = { key }
      for (const sp of ['T', 'O']) { const T = trades.filter((t) => t.anchor === A && t.step === stepKey && t.exit === exit && t.side === side && t.sp === sp).sort((p, q) => p.t - q.t)
        const days = ((sp === 'T' ? SPLIT - FROM : TO - SPLIT) / 86400000) * 5 / 7, Rs = T.map((t) => t.R), pos = T.filter((t) => t.usd > 0).reduce((p, t) => p + t.usd, 0), neg = -T.filter((t) => t.usd < 0).reduce((p, t) => p + t.usd, 0)
        let cum = 0, peak = 0, dd = 0; for (const v of Rs) { cum += v; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum) }
        const bs = blockBootstrapMean(T.map((t) => ({ t: t.t, x: t.R })), { level: 1 - 2 * ALPHA }), ex = T.filter((t) => t.rand_R != null), bx = blockBootstrapMean(ex.map((t) => ({ t: t.t, x: t.R - t.rand_R })), { level: 1 - 2 * ALPHA })
        const years = {}; for (const t of T) { const y = new Date(t.t).getUTCFullYear(); (years[y] ??= []).push(t.R) }
        cell[sp] = { n: T.length, per_day: T.length / days, wr: T.length ? T.filter((t) => t.usd > 0).length / T.length : null, mean_usd: T.length ? T.reduce((p, t) => p + t.usd, 0) / T.length : null,
          mean_R: bs.mean, R_lb: bs.lo, pf: neg > 0 ? pos / neg : null, max_dd_R: dd, excess_R: bx.mean, excess_lb: bx.lo, random_mean_R: ex.length ? ex.reduce((p, t) => p + t.rand_R, 0) / ex.length : null,
          dist_atr_median: med(T.map((t) => t.dist_atr)), risk_atr_median: med(T.map((t) => t.risk_atr)), rr_median: med(T.map((t) => t.rr)), target_hit: T.length ? T.filter((t) => t.how === 'target').length / T.length : null,
          exits: Object.fromEntries(['target', 'stop', 'time', 'end'].map((h) => [h, T.filter((t) => t.how === h).length])), years: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, { n: v.length, mean_R: v.reduce((p, q) => p + q, 0) / v.length }])) } }
      const o = cell.O, tr = cell.T
      cell.verdict = A === '1D' || o.n < MIN_N[A] ? 'DESCRIBED_ONLY' : o.mean_R > 0 && o.R_lb > 0 && o.excess_R > 0 && o.excess_lb > 0 && tr.mean_R > 0 ? 'PASS' : 'FAIL'
      out.cells[key] = cell
      console.log(`${key.padEnd(24)} OOS n ${o.n} (${o.per_day?.toFixed(2)}/d) WR ${(100 * (o.wr ?? 0)).toFixed(1)}% R ${o.mean_R?.toFixed(3)} LB ${o.R_lb?.toFixed(3)} $ ${o.mean_usd?.toFixed(2)} PF ${o.pf?.toFixed(2)} dist ${o.dist_atr_median?.toFixed(2)} risk ${o.risk_atr_median?.toFixed(2)} rr ${o.rr_median?.toFixed(2)} hit ${(100 * (o.target_hit ?? 0)).toFixed(0)}% xs ${o.excess_R?.toFixed(3)} LB ${o.excess_lb?.toFixed(3)} | TRAIN R ${tr.mean_R?.toFixed(3)} WR ${(100 * (tr.wr ?? 0)).toFixed(1)}% → ${cell.verdict}`) } }
  res.anchors[A] = out }
const base = MODE === 'onestep' ? 'swing_earlystep_onestep_check' : 'swing_earlystep'
fs.writeFileSync(path.join(TURBO.master, base + '.json'), JSON.stringify(res, null, 1))
if (MODE !== 'onestep') { const cols = ['anchor', 'step', 'Z', 'exit', 'side', 'sp', 't', 'P', 'atr', 'entry', 'stop', 'target', 'exit_px', 'how', 'exitT', 'R', 'usd', 'risk', 'dist_atr', 'risk_atr', 'rr', 'rand_R']
  fs.writeFileSync(path.join(TURBO.master, 'swing_earlystep_trades.csv'), [cols.join(','), ...trades.map((t) => cols.map((c) => { const v = t[c]; return c === 't' || c === 'exitT' ? new Date(v).toISOString() : typeof v === 'number' ? +v.toFixed(5) : v ?? '' }).join(','))].join('\n') + '\n') }
console.log(`→ data/master/${base}.json (${trades.length} trades)`)
