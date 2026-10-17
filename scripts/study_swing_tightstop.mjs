// ════════════════════════════════════════════════════════════════════════════════
// study_swing_tightstop.mjs — Phase 4C: the ladder trade with a TIGHTER stop (2026-10-17). Pre-registered: docs/SWING_TIGHTSTOP_SPEC.md.
// Same live trigger, entry, fills, time stop and random control as Phase 4B (study_swing_trade.mjs). Stops: S1 = below the latest confirmed
// higher low on Y (two steps below) − 0.10 × ATR14(Y), no structure → no trade; S2 = entry ∓ 1.0 × ATR14(X). Exits E1 = 1R, E2 = P ± 3 × ATR14(anchor).
// Head-to-head: every executed trade is also simulated with Phase 4B's stop (beyond the extreme) on the very same signal (h2h_R).
// MODE=beyond reproduces Phase 4B exactly (consistency check; writes swing_tightstop_beyond_check.json only).
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
import { prepY, structureLevel } from './lib/swing_tightstop.mjs'

const MODE = process.env.MODE || 'tight'
const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), K = MODE === 'beyond' ? 12 : 24, ALPHA = 0.05 / K
const LADDER = { '15m': ['5m', '3m'], '1H': ['30m', '15m'], '4H': ['3H', '2H'], '1D': ['9H', '6H'] }, DUR = { '15m': 15, '1H': 60, '4H': 240, '1D': 1440 }, MIN_N = { '15m': 100, '1H': 100, '4H': 30, '1D': Infinity }
const STOPS = MODE === 'beyond' ? ['B'] : ['S1', 'S2']
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
console.log(`loading gold 1m … (mode ${MODE})`)
const M = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars, holes = findHoles(M), R = rangeIndex(M), spreadAt = makeSpreadAt()
const holeMs = holes.map((h) => [h.from - 2 * 86400000, h.to + 2 * 86400000])
const series = (tf) => { const C = buildCandles(M, tf); markIncomplete(C, holes); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); return { C, swings: zigzag(C, { k: 3, breaks }).swings, A: atrArr(C, 14) } }
const atrAtFn = (s) => (t) => { let lo = 0, hi = s.C.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s.C[m].close_t <= t) lo = m + 1; else hi = m } const k = lo - 1; return k >= 0 ? s.A[k] : null }
const pool = new Map(); for (let i = 0; i < M.length - 1; i++) { const key = new Date(M[i].t).getUTCFullYear() + '|' + nyHour(M[i].t); if (!pool.has(key)) pool.set(key, []); pool.get(key).push(i) }
const r = rng(4242), trades = [], res = { at: new Date().toISOString(), spec: 'docs/SWING_TIGHTSTOP_SPEC.md', mode: MODE, window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const [A, [X, Y]] of Object.entries(LADDER)) {
  const a = series(A), x = series(X), y = series(Y), sig = liveSignals({ M, R, CA: a.C, swA: a.swings, CX: x.C, swX: x.swings }), Yp = prepY(y.C, y.swings)
  const atrA = atrAtFn(a), atrX = atrAtFn(x), atrY = atrAtFn(y), out = { anchor: A, one_step: X, two_steps: Y, signals: sig.length, cells: {}, skipped: {} }
  for (const stopKind of STOPS) for (const exit of ['E1', 'E2']) { let openUntil = -Infinity; const skipped = { busy: 0, hole: 0, no_atr: 0, no_structure: 0, target_passed: 0, bad_stop: 0 }
    for (const s of sig) { if (s.t < openUntil) { skipped.busy++; continue }
      const aA = atrA(s.t); if (!(aA > 0)) { skipped.no_atr++; continue }
      const tEnd = s.t + 20 * DUR[A] * 60000; if (holeMs.some(([h0, h1]) => s.t < h1 && tEnd > h0)) { skipped.hole++; continue }
      const k = R.at(s.t); if (k >= M.length) continue
      const long = s.side === 'long', entry = long ? M[k].o + spreadAt(M[k].t) : M[k].o, beyond = long ? s.P - 0.1 * aA : s.P + 0.1 * aA
      let stop
      if (stopKind === 'B') stop = beyond
      else if (stopKind === 'S1') { const lvl = structureLevel(Yp, s.side, s.P, s.tP, s.t), aY = atrY(s.t); if (lvl == null || !(aY > 0)) { skipped.no_structure++; continue } stop = long ? lvl - 0.1 * aY : lvl + 0.1 * aY }
      else { const aX = atrX(s.t); if (!(aX > 0)) { skipped.no_atr++; continue } stop = long ? entry - aX : entry + aX }
      if (long ? stop >= entry : stop <= entry) { skipped.bad_stop++; continue }
      const target = exit === 'E1' ? (long ? entry + (entry - stop) : entry - (stop - entry)) : (long ? s.P + 3 * aA : s.P - 3 * aA)
      if (long ? entry >= target : entry <= target) { skipped.target_passed++; continue }
      const t = simulate(M, k, { side: s.side, stop, target, tEnd, spreadAt }); if (!t) continue
      openUntil = t.exitT + 60000
      // head-to-head: the same signal with Phase 4B's stop (beyond the extreme) and its own exit geometry
      const tgtB = exit === 'E1' ? (long ? entry + (entry - beyond) : entry - (beyond - entry)) : target, hB = simulate(M, k, { side: s.side, stop: beyond, target: tgtB, tEnd, spreadAt })
      const dS = Math.abs(entry - stop) / aA, dT = Math.abs(target - entry) / aA, pl = pool.get(new Date(s.t).getUTCFullYear() + '|' + nyHour(s.t)) ?? [], rr = []
      for (let q = 0; q < 3 && pl.length; q++) { const j = pl[(r() * pl.length) | 0], a2 = atrA(M[j].t); if (!(a2 > 0)) continue
        const e2 = long ? M[j].o + spreadAt(M[j].t) : M[j].o, st2 = long ? e2 - dS * a2 : e2 + dS * a2, tg2 = long ? e2 + dT * a2 : e2 - dT * a2
        const z = simulate(M, j, { side: s.side, stop: st2, target: tg2, tEnd: M[j].t + 20 * DUR[A] * 60000, spreadAt }); if (z) rr.push(z.R) }
      trades.push({ anchor: A, stopKind, side: s.side, t: s.t, sp: s.t < SPLIT ? 'T' : 'O', P: s.P, atrA: aA, entry, stop, target, ...t, exit_px: t.exit, exit, risk_atr: Math.abs(entry - stop) / aA, rr: Math.abs(target - entry) / Math.abs(entry - stop), h2h_R: hB?.R ?? null, rand_R: rr.length ? rr.reduce((p, v) => p + v, 0) / rr.length : null }) }
    out.skipped[`${stopKind} ${exit}`] = skipped }
  for (const stopKind of STOPS) for (const exit of ['E1', 'E2']) for (const side of ['long', 'short']) { const key = `${A} ${side} ${stopKind} ${exit}`, cell = { key }
    for (const sp of ['T', 'O']) { const T = trades.filter((t) => t.anchor === A && t.stopKind === stopKind && t.exit === exit && t.side === side && t.sp === sp).sort((p, q) => p.t - q.t)
      const days = ((sp === 'T' ? SPLIT - FROM : TO - SPLIT) / 86400000) * 5 / 7, Rs = T.map((t) => t.R), pos = T.filter((t) => t.usd > 0).reduce((p, t) => p + t.usd, 0), neg = -T.filter((t) => t.usd < 0).reduce((p, t) => p + t.usd, 0)
      let cum = 0, peak = 0, dd = 0; for (const v of Rs) { cum += v; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum) }
      const bs = blockBootstrapMean(T.map((t) => ({ t: t.t, x: t.R })), { level: 1 - 2 * ALPHA }), ex = T.filter((t) => t.rand_R != null), bx = blockBootstrapMean(ex.map((t) => ({ t: t.t, x: t.R - t.rand_R })), { level: 1 - 2 * ALPHA })
      const h2 = T.filter((t) => t.h2h_R != null), med = (v) => { if (!v.length) return null; const s2 = [...v].sort((p, q) => p - q); return s2[s2.length >> 1] }
      const years = {}; for (const t of T) { const yy = new Date(t.t).getUTCFullYear(); (years[yy] ??= []).push(t.R) }
      cell[sp] = { n: T.length, per_day: T.length / days, wr: T.length ? T.filter((t) => t.usd > 0).length / T.length : null, mean_usd: T.length ? T.reduce((p, t) => p + t.usd, 0) / T.length : null, mean_R: bs.mean, R_lb: bs.lo, pf: neg > 0 ? pos / neg : null, max_dd_R: dd,
        excess_R: bx.mean, excess_lb: bx.lo, random_mean_R: ex.length ? ex.reduce((p, t) => p + t.rand_R, 0) / ex.length : null, h2h_beyond_mean_R: h2.length ? h2.reduce((p, t) => p + t.h2h_R, 0) / h2.length : null,
        risk_atr_median: med(T.map((t) => t.risk_atr)), rr_median: med(T.map((t) => t.rr)), exits: Object.fromEntries(['target', 'stop', 'time', 'end'].map((h) => [h, T.filter((t) => t.how === h).length])),
        years: Object.fromEntries(Object.entries(years).map(([yy, v]) => [yy, { n: v.length, mean_R: v.reduce((p, q) => p + q, 0) / v.length }])) } }
    const o = cell.O, tr = cell.T
    cell.verdict = A === '1D' || o.n < MIN_N[A] ? 'DESCRIBED_ONLY' : o.mean_R > 0 && o.R_lb > 0 && o.excess_R > 0 && o.excess_lb > 0 && tr.mean_R > 0 ? 'PASS' : 'FAIL'
    out.cells[key] = cell
    console.log(`${key.padEnd(20)} OOS n ${o.n} (${o.per_day?.toFixed(2)}/d) WR ${(100 * (o.wr ?? 0)).toFixed(1)}% R ${o.mean_R?.toFixed(3)} LB ${o.R_lb?.toFixed(3)} $ ${o.mean_usd?.toFixed(2)} PF ${o.pf?.toFixed(2)} risk ${o.risk_atr_median?.toFixed(2)}ATR rr ${o.rr_median?.toFixed(2)} xs ${o.excess_R?.toFixed(3)} LB ${o.excess_lb?.toFixed(3)} | 4B-stop same signals ${o.h2h_beyond_mean_R?.toFixed(3)} | TRAIN R ${tr.mean_R?.toFixed(3)} WR ${(100 * (tr.wr ?? 0)).toFixed(1)}% → ${cell.verdict}`) }
  res.anchors[A] = out }
const base = MODE === 'beyond' ? 'swing_tightstop_beyond_check' : 'swing_tightstop'
fs.writeFileSync(path.join(TURBO.master, base + '.json'), JSON.stringify(res, null, 1))
if (MODE !== 'beyond') { const cols = ['anchor', 'stopKind', 'exit', 'side', 'sp', 't', 'P', 'atrA', 'entry', 'stop', 'target', 'exit_px', 'how', 'exitT', 'R', 'usd', 'risk', 'risk_atr', 'rr', 'h2h_R', 'rand_R']
  fs.writeFileSync(path.join(TURBO.master, 'swing_tightstop_trades.csv'), [cols.join(','), ...trades.map((t) => cols.map((c) => { const v = t[c]; return c === 't' || c === 'exitT' ? new Date(v).toISOString() : typeof v === 'number' ? +v.toFixed(5) : v ?? '' }).join(','))].join('\n') + '\n') }
console.log(`→ data/master/${base}.json (${trades.length} trades)`)
