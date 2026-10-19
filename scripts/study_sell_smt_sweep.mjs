// ════════════════════════════════════════════════════════════════════════════════
// study_sell_smt_sweep.mjs — SELL when gold sweeps a confirmed high and silver does NOT confirm (spec docs/SELL_SMT_SWEEP_SPEC.md + ADDENDUM A;
// Ashraf 2026-10-19 "Yes, run it as written"). Signals + trades: scripts/lib/sell_smt.mjs (ONE implementation).
// K = 24 cells: TF {1H,4H} × {SWEEP, SWEEP+SMT} × entry {T1 candle close, T2 3m break} × exit {E1 1R, E2 0.5R, E3 0.25R}.
// Report-only: silver-CONFIRMS mirror, random SELL at the same geometry (5×, same UTC hour + window), oracle positive control.
// Output: data/master/sell_smt_sweep_study.json (+ trades in sell_smt_sweep_trades.json for the audit).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wilson, holm, rng } from '../src/core/studyStats.js'
import { SMT, findSweeps, t2Entry, simulateSell, pivotLows } from './lib/sell_smt.mjs'

const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a)
const K_CELLS = 24, ALPHA = 0.05 / K_CELLS, SPLIT = Date.parse('2021-07-01T00:00:00Z'), WEEK = 7 * 86400000
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
const KG = kit('XAUUSD', { reopenClamp: false }), KS = kit('XAGUSD', { reopenClamp: false })
const M = await clean1m('XAUUSD', { reopenClamp: false }), MS = await clean1m('XAGUSD', { reopenClamp: false })
log('minutes gold', M.length, 'silver', MS.length, new Date(M[0].t).toISOString(), '→', new Date(M.at(-1).t).toISOString())
const hG = findHoles(M), hS = findHoles(MS)
const build = (K, Mx, h, tf) => { const c = K.build(Mx, tf); markIncomplete(c, h); return c }
const C3 = build(KG, M, hG, '3m'), PL3 = pivotLows(C3)
const spreadAt = makeSpreadAt()
const FROM = M[0].t + 30 * 86400000

function bootOneSided(items, { B = 10000, seed = 11 } = {}) {   // ADDENDUM A.7: one-sided week-block; lo = α quantile; p = share ≤ 0
  if (!items.length) return { mean: null, lo: null, p: null }
  const g = new Map(); for (const it of items) { const k = Math.floor(it.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(it.x) }
  const blocks = [...g.values()], r = rng(seed), v = new Float64Array(B)
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let k = 0; k < blocks.length; k++) for (const x of blocks[(r() * blocks.length) | 0]) { s += x; n++ } v[b] = n ? s / n : 0 }
  v.sort(); let le = 0; for (const x of v) if (x <= 0) le++
  return { mean: items.reduce((s, it) => s + it.x, 0) / items.length, lo: v[Math.floor(ALPHA * B)], p: Math.max(le, 1) / B }
}
function summ(T, win) {
  const X = T.filter((x) => (win === 'TRAIN' ? x.entryT < SPLIT : x.entryT >= SPLIT)); const n = X.length
  if (!n) return { n: 0 }
  const w = X.filter((x) => x.pnl > 0).length, wl = wilson(w, n), span = (Math.max(...X.map((x) => x.entryT)) - Math.min(...X.map((x) => x.entryT))) / WEEK
  const bs = bootOneSided(X.map((x) => ({ t: x.entryT, x: x.pnl })))
  const byY = {}; for (const x of X) { const y = new Date(x.entryT).getUTCFullYear(); (byY[y] ??= []).push(x.pnl) }
  const yrs = Object.entries(byY).filter(([, v]) => v.length >= 10).map(([y, v]) => ({ y: +y, n: v.length, pnl: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) }))
  const how = {}; for (const x of X) how[x.how] = (how[x.how] ?? 0) + 1
  return { n, per_week: +(n / Math.max(span, 1)).toFixed(3), wr: +(w / n).toFixed(4), wr_lo: +wl.lo.toFixed(4), usd: +bs.mean.toFixed(3), usd_lo: bs.lo != null ? +bs.lo.toFixed(3) : null, p: bs.p,
    R: +(X.reduce((s, x) => s + x.r, 0) / n).toFixed(4), years: yrs, years_pos: yrs.length ? +(yrs.filter((y) => y.pnl > 0).length / yrs.length).toFixed(3) : null, exits: how }
}
// sequential trades of one cell (one at a time)
function runCell(events, tf, G, entry, mult) {
  const T = []; let busyUntil = -Infinity, skippedOverlap = 0, noEntry = 0
  for (const ev of events) {
    const eT = entry === 'T1' ? ev.decisionT : t2Entry(ev, G, C3, PL3, M); if (eT == null) { noEntry++; continue }
    if (eT <= busyUntil) { skippedOverlap++; continue }
    const stop = ev.sweepHigh + SMT.STOP_ATR * ev.atr, s = simulateSell(M, eT, stop, mult, spreadAt)
    if (!s || s.open || s.skipped) { if (s?.skipped) noEntry++; continue }
    busyUntil = s.exitT; T.push({ sweepT: ev.t, entryT: eT, exitT: s.exitT, entry: s.entry, stop: s.stop, tp: s.tp, R: s.R, pnl: +s.pnl.toFixed(4), r: +s.r.toFixed(4), how: s.how, stop_atr: s.R / ev.atr, i: ev.i, smt: ev.smt, sweepHigh: ev.sweepHigh, close: ev.close, ref: ev.ref, refPivT: ev.refPivT, atr: ev.atr, xagRef: ev.xagRef, xagMax: ev.xagMax })
  }
  return { T, skippedOverlap, noEntry }
}
// random SELL control (ADDENDUM A.8)
function randomControl(T, G, A, mult, seed) {
  const pool = {}; for (let i = 20; i < G.length - 1; i++) { const c = G[i]; if (c.incomplete || !(A[i] > 0) || c.t < FROM) continue; const k = `${new Date(c.t).getUTCHours()}|${c.t < SPLIT ? 'T' : 'O'}`; (pool[k] ??= []).push(i) }
  const r = rng(seed), out = []
  for (const tr of T) { const P = pool[`${new Date(tr.sweepT).getUTCHours()}|${tr.entryT < SPLIT ? 'T' : 'O'}`]; if (!P) continue
    for (let k = 0; k < 5; k++) { const i = P[(r() * P.length) | 0], e = lb(M, G[i + 1].t); if (e >= M.length) continue
      const s = simulateSell(M, M[e].t, M[e].o + tr.stop_atr * A[i], mult, spreadAt); if (!s || s.open || s.skipped) continue
      out.push({ entryT: M[e].t, pnl: s.pnl, r: s.r, how: s.how }) } }
  return out
}

const cells = [], report = [], tradesOut = {}
for (const tf of ['1H', '4H']) {
  const G = build(KG, M, hG, tf), S = build(KS, MS, hS, tf), A = atrArr(G, 14)
  const ev = findSweeps(G, S, M, { from: FROM })
  log(tf, 'candles', G.length, 'sweeps', ev.length, 'SMT', ev.filter((e) => e.smt).length, 'matched pivot', ev.filter((e) => e.matched).length)
  const groups = { SWEEP: ev, SMT: ev.filter((e) => e.smt), CONFIRMS: ev.filter((e) => !e.smt), ORACLE: ev.filter((e) => e.i + 4 < G.length && G[e.i + 4].c < G[e.i].c) }
  for (const [cond, E] of Object.entries(groups)) for (const entry of ['T1', 'T2']) for (const [ex, mult] of SMT.TARGETS) {
    if (cond === 'ORACLE' && entry === 'T2') continue
    const key = `${tf}|${cond}|${entry}|${ex}`, { T, skippedOverlap, noEntry } = runCell(E, tf, G, entry, mult)
    const row = { key, tf, cond, entry, exit: ex, in_K: cond === 'SWEEP' || cond === 'SMT', signals: E.length, trades: T.length, skippedOverlap, noEntry, TRAIN: summ(T, 'TRAIN'), OOS: summ(T, 'OOS') }
    if (row.in_K) { const RC = randomControl(T, G, A, mult, 1000 + cells.length); row.random = { TRAIN: summ(RC, 'TRAIN'), OOS: summ(RC, 'OOS') } }
    tradesOut[key] = T
    ;(row.in_K ? cells : report).push(row); log(key, 'trades', T.length, 'OOS', row.OOS.n, 'WR', row.OOS.wr, '$', row.OOS.usd)
  }
}
// pass rule §6
holm(cells.map((c) => Object.assign(c, { p: c.OOS.p ?? null })), 0.05)
for (const c of cells) {
  const o = c.OOS, t = c.TRAIN, base = c.cond === 'SMT' ? cells.find((x) => x.key === c.key.replace('|SMT|', '|SWEEP|')) : null
  const chk = { n100: o.n >= 100, wr85: o.n > 0 && o.wr >= 0.85 && o.wr_lo >= 0.80, money_oos: o.n > 0 && o.usd > 0 && o.usd_lo > 0, money_train: t.n > 0 && t.usd > 0,
    smt_lift: base ? (t.usd > base.TRAIN.usd && o.usd > base.OOS.usd) : null, years60: o.years_pos != null && o.years_pos >= 0.6 }
  c.checks = chk; c.pass = Object.values(chk).every((v) => v === true || v === null)
}
const out = { spec: 'docs/SELL_SMT_SWEEP_SPEC.md (+ ADDENDUM A)', built_at: new Date().toISOString(), data: { from: new Date(M[0].t).toISOString(), to: new Date(M.at(-1).t).toISOString(), split: new Date(SPLIT).toISOString(), spread: { ...spreadAt.stats } },
  K: K_CELLS, alpha_per_cell: ALPHA, passes: cells.filter((c) => c.pass).map((c) => c.key), cells, report_only: report }
fs.writeFileSync(path.join(TURBO.master, 'sell_smt_sweep_study.json'), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(TURBO.master, 'sell_smt_sweep_trades.json'), JSON.stringify(tradesOut))
log('PASSES', out.passes.length, out.passes)
