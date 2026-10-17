// ════════════════════════════════════════════════════════════════════════════════
// study_swing_trade.mjs — Phase 4B: the ladder sign as a trade rule, money test after spread (2026-10-17). Pre-registered: docs/SWING_TRADE_SPEC.md.
// Live causal trigger (lib/swing_trade.mjs liveSignals) · entry next 1m open · stop P ∓ 0.10 × ATR14(anchor) · E1 = 1R, E2 = P ± 3 × ATR14(anchor)
// · time stop 20 anchor candles · stop first · one trade at a time per anchor and exit · random-entry control (3 per trade, same geometry in ATR).
// Output: data/master/swing_trade_atlas.json + data/master/swing_trades.csv (every trade).
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

const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), K = 12, ALPHA = 0.05 / K
const LADDER = { '15m': '5m', '1H': '30m', '4H': '3H', '1D': '9H' }, DUR = { '15m': 15, '1H': 60, '4H': 240, '1D': 1440 }, MIN_N = { '15m': 100, '1H': 100, '4H': 30, '1D': Infinity }
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
console.log('loading gold 1m …')
const M = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars, holes = findHoles(M), R = rangeIndex(M), spreadAt = makeSpreadAt()
const holeMs = holes.map((h) => [h.from - 2 * 86400000, h.to + 2 * 86400000])
const series = (tf) => { const C = buildCandles(M, tf); markIncomplete(C, holes); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); return { C, swings: zigzag(C, { k: 3, breaks }).swings, A: atrArr(C, 14) } }
const pool = new Map(); for (let i = 0; i < M.length - 1; i++) { const key = new Date(M[i].t).getUTCFullYear() + '|' + nyHour(M[i].t); if (!pool.has(key)) pool.set(key, []); pool.get(key).push(i) }
const r = rng(4242), trades = [], res = { at: new Date().toISOString(), spec: 'docs/SWING_TRADE_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const [A, X] of Object.entries(LADDER)) {
  const a = series(A), x = series(X), sig = liveSignals({ M, R, CA: a.C, swA: a.swings, CX: x.C, swX: x.swings })
  const closeIdx = (t) => { let lo = 0, hi = a.C.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a.C[m].close_t <= t) lo = m + 1; else hi = m } return lo - 1 }   // last anchor candle closed by t
  const atrAt = (t) => { const k = closeIdx(t); return k >= 0 ? a.A[k] : null }
  const out = { anchor: A, one_step: X, signals: sig.length, cells: {} }
  for (const exit of ['E1', 'E2']) { let openUntil = -Infinity, skipped = { busy: 0, hole: 0, no_atr: 0, target_passed: 0 }
    for (const s of sig) { if (s.t < openUntil) { skipped.busy++; continue }
      const atr = atrAt(s.t); if (!(atr > 0)) { skipped.no_atr++; continue }
      const tEnd = s.t + 20 * DUR[A] * 60000; if (holeMs.some(([h0, h1]) => s.t < h1 && tEnd > h0)) { skipped.hole++; continue }
      const k = R.at(s.t); if (k >= M.length) continue
      const long = s.side === 'long', entry = long ? M[k].o + spreadAt(M[k].t) : M[k].o, stop = long ? s.P - 0.1 * atr : s.P + 0.1 * atr
      const target = exit === 'E1' ? (long ? entry + (entry - stop) : entry - (stop - entry)) : (long ? s.P + 3 * atr : s.P - 3 * atr)
      if (long ? entry >= target : entry <= target) { skipped.target_passed++; continue }
      const t = simulate(M, k, { side: s.side, stop, target, tEnd, spreadAt }); if (!t) continue
      openUntil = t.exitT + 60000
      // random control: same side, same stop / target distances in ATR, same NY hour + year, same duration
      const dS = Math.abs(entry - stop) / atr, dT = Math.abs(target - entry) / atr, pl = pool.get(new Date(s.t).getUTCFullYear() + '|' + nyHour(s.t)) ?? [], rr = []
      for (let q = 0; q < 3 && pl.length; q++) { const j = pl[(r() * pl.length) | 0], at2 = atrAt(M[j].t); if (!(at2 > 0)) continue
        const e2 = long ? M[j].o + spreadAt(M[j].t) : M[j].o, st2 = long ? e2 - dS * at2 : e2 + dS * at2, tg2 = long ? e2 + dT * at2 : e2 - dT * at2
        const z = simulate(M, j, { side: s.side, stop: st2, target: tg2, tEnd: M[j].t + 20 * DUR[A] * 60000, spreadAt }); if (z) rr.push(z.R) }
      trades.push({ anchor: A, exit, side: s.side, t: s.t, sp: s.t < SPLIT ? 'T' : 'O', P: s.P, atr, entry, stop, target, ...t, exit_px: t.exit, exit, rand_R: rr.length ? rr.reduce((p, v) => p + v, 0) / rr.length : null }) }
    out.skipped = { ...(out.skipped ?? {}), [exit]: skipped } }
  for (const exit of ['E1', 'E2']) for (const side of ['long', 'short']) { const key = `${A} ${side} ${exit}`, cell = { key }
    for (const sp of ['T', 'O']) { const T = trades.filter((t) => t.anchor === A && t.exit === exit && t.side === side && t.sp === sp).sort((p, q) => p.t - q.t)
      const days = ((sp === 'T' ? SPLIT - FROM : TO - SPLIT) / 86400000) * 5 / 7, Rs = T.map((t) => t.R), pos = T.filter((t) => t.usd > 0).reduce((p, t) => p + t.usd, 0), neg = -T.filter((t) => t.usd < 0).reduce((p, t) => p + t.usd, 0)
      let cum = 0, peak = 0, dd = 0; for (const v of Rs) { cum += v; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum) }
      const bs = blockBootstrapMean(T.map((t) => ({ t: t.t, x: t.R })), { level: 1 - 2 * ALPHA }), ex = T.filter((t) => t.rand_R != null), bx = blockBootstrapMean(ex.map((t) => ({ t: t.t, x: t.R - t.rand_R })), { level: 1 - 2 * ALPHA })
      const years = {}; for (const t of T) { const y = new Date(t.t).getUTCFullYear(); (years[y] ??= []).push(t.R) }
      cell[sp] = { n: T.length, per_day: T.length / days, wr: T.length ? T.filter((t) => t.usd > 0).length / T.length : null, mean_usd: T.length ? T.reduce((p, t) => p + t.usd, 0) / T.length : null,
        mean_R: bs.mean, R_lb: bs.lo, pf: neg > 0 ? pos / neg : null, max_dd_R: dd, excess_R: bx.mean, excess_lb: bx.lo, random_mean_R: ex.length ? ex.reduce((p, t) => p + t.rand_R, 0) / ex.length : null,
        exits: Object.fromEntries(['target', 'stop', 'time', 'end'].map((h) => [h, T.filter((t) => t.how === h).length])), mean_risk_usd: T.length ? T.reduce((p, t) => p + t.risk, 0) / T.length : null,
        years: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, { n: v.length, mean_R: v.reduce((p, q) => p + q, 0) / v.length }])) } }
    const o = cell.O, tr = cell.T
    cell.verdict = A === '1D' || o.n < MIN_N[A] ? 'DESCRIBED_ONLY' : o.mean_R > 0 && o.R_lb > 0 && o.excess_R > 0 && o.excess_lb > 0 && tr.mean_R > 0 ? 'PASS' : 'FAIL'
    out.cells[key] = cell
    console.log(`${key.padEnd(18)} OOS n ${o.n} (${o.per_day?.toFixed(2)}/day) WR ${(100 * (o.wr ?? 0)).toFixed(1)}% meanR ${o.mean_R?.toFixed(3)} LB ${o.R_lb?.toFixed(3)} $/t ${o.mean_usd?.toFixed(2)} PF ${o.pf?.toFixed(2)} excess ${o.excess_R?.toFixed(3)} LB ${o.excess_lb?.toFixed(3)} · TRAIN n ${tr.n} meanR ${tr.mean_R?.toFixed(3)} WR ${(100 * (tr.wr ?? 0)).toFixed(1)}% → ${cell.verdict}`) }
  res.anchors[A] = out }
fs.writeFileSync(path.join(TURBO.master, 'swing_trade_atlas.json'), JSON.stringify(res, null, 1))
const cols = ['anchor', 'exit', 'side', 'sp', 't', 'P', 'atr', 'entry', 'stop', 'target', 'exit_px', 'how', 'exitT', 'R', 'usd', 'risk', 'rand_R']
fs.writeFileSync(path.join(TURBO.master, 'swing_trades.csv'), [cols.join(','), ...trades.map((t) => [t.anchor, t.exit, t.side, t.sp, new Date(t.t).toISOString(), t.P, t.atr.toFixed(4), t.entry.toFixed(3), t.stop.toFixed(3), t.target.toFixed(3), t.exit_px.toFixed(3), t.how, new Date(t.exitT).toISOString(), t.R.toFixed(4), t.usd.toFixed(3), t.risk.toFixed(3), t.rand_R == null ? '' : t.rand_R.toFixed(4)].join(','))].join('\n') + '\n')
console.log(`→ data/master/swing_trade_atlas.json · swing_trades.csv (${trades.length} trades)`)
