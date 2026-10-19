// ════════════════════════════════════════════════════════════════════════════════
// audit_sell_smt_sweep.mjs — the §7 audit of study_sell_smt_sweep.mjs (spec docs/SELL_SMT_SWEEP_SPEC.md):
//   A. independent second evaluator: 300 random in-K trades re-derived from the minutes with its own loops (sweep candle OHLC, reference pivot
//      high, stop, silver highs, and the whole exit path) — 0 differences required
//   B. prefix (look-ahead) check: 200 random cut times; signals + T2 entries rebuilt from data cut at T must equal the full run's signals
//      decided before T
//   C. positive control: the ORACLE rows of the study must show WR far above the matching SWEEP rows
// Output: data/master/sell_smt_sweep_audit.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { rng } from '../src/core/studyStats.js'
import { findSweeps, t2Entry, pivotLows, SMT } from './lib/sell_smt.mjs'

const NA = process.argv.includes('--quick') ? 40 : 200
const study = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'sell_smt_sweep_study.json'), 'utf8'))
const TR = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'sell_smt_sweep_trades.json'), 'utf8'))
const M = await clean1m('XAUUSD', { reopenClamp: false }), MS = await clean1m('XAGUSD', { reopenClamp: false })
const spreadAt = makeSpreadAt(), TFMS = { '1H': 3600000, '4H': 4 * 3600000 }, H = 3600000
const lbT = (arr, t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m].t < t) a = m + 1; else b = m } return a }
const agg = (Mx, a, b) => { let h = -Infinity, l = Infinity, c = null; for (let k = lbT(Mx, a); k < Mx.length && Mx[k].t < b; k++) { h = Math.max(h, Mx[k].h); l = Math.min(l, Mx[k].l); c = Mx[k].c } return { h, l, c } }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps
const r = rng(4242), diffs = [], checked = []

// ── A. independent evaluator ──
const keys = Object.keys(TR).filter((k) => /\|(SWEEP|SMT)\|/.test(k)), pool = keys.flatMap((k) => TR[k].map((t) => [k, t]))
for (let n = 0; n < 300 && pool.length; n++) {
  const [key, t] = pool[(r() * pool.length) | 0], [tf, , , ex] = key.split('|'), mult = SMT.TARGETS.find((x) => x[0] === ex)[1], d = []
  const sw = agg(M, t.sweepT, t.sweepT + TFMS[tf]); if (!near(sw.h, t.sweepHigh) || !near(sw.c, t.close)) d.push('sweep candle OHLC')
  if (!(t.close < t.ref && t.ref < t.sweepHigh)) d.push('sweep condition')
  if (!near(agg(M, t.refPivT, t.refPivT + TFMS[tf]).h, t.ref)) d.push('reference high')
  if (!near(t.stop, t.sweepHigh + 0.1 * t.atr, 1e-6)) d.push('stop')
  if (t.smt !== (t.xagMax < t.xagRef)) d.push('smt flag')
  const xs = agg(MS, t.sweepT, t.sweepT + TFMS[tf]); if (!(xs.h <= t.xagMax + 1e-9)) d.push('silver max excludes the sweep candle')
  if (!(t.entryT > t.sweepT)) d.push('entry not after sweep')
  // own exit loop
  let k = lbT(M, t.entryT); const entry = M[k].o, R = t.stop - entry, tp = entry - mult * R, end = M[k].t + 48 * 60 * 60000; let got = null
  for (let j = k; j < M.length && M[j].t < end; j++) { const b = M[j], sp = spreadAt(b.t)
    if (j > k && b.o + sp >= t.stop) { got = { how: 'stop_gap', exitT: b.t, pnl: entry - (b.o + sp) }; break }
    if (b.h + sp >= t.stop) { got = { how: 'stop', exitT: b.t, pnl: entry - t.stop }; break }
    if (b.l + sp <= tp) { got = { how: 'target', exitT: b.t, pnl: entry - tp }; break } }
  if (!got) { let j = lbT(M, end) - 1; got = { how: 'time', exitT: M[j].t, pnl: entry - (M[j].c + spreadAt(M[j].t)) } }
  if (got.how !== t.how || got.exitT !== t.exitT || !near(got.pnl, t.pnl, 1e-3)) d.push(`exit ${got.how}/${got.pnl.toFixed(3)} vs ${t.how}/${t.pnl}`)
  checked.push(key); if (d.length) diffs.push({ key, sweepT: new Date(t.sweepT).toISOString(), d })
}
console.log('A. independent evaluator:', checked.length, 'trades,', diffs.length, 'with differences'); for (const x of diffs.slice(0, 10)) console.log('  ', JSON.stringify(x))

// ── B. prefix check ──
const KG = kit('XAUUSD', { reopenClamp: false }), KS = kit('XAGUSD', { reopenClamp: false })
const bld = (K, Mx, tf) => { const c = K.build(Mx, tf); markIncomplete(c, findHoles(Mx)); return c }
const FROM = M[0].t + 30 * 86400000, full = {}
for (const tf of ['1H', '4H']) { const G = bld(KG, M, tf), S = bld(KS, MS, tf); full[tf] = { G, ev: findSweeps(G, S, M, { from: FROM }) } }
const C3f = bld(KG, M, '3m'), PL3f = pivotLows(C3f)
const sig = (e) => `${e.t}|${e.decisionT}|${e.ref}|${e.smt}|${e.xagRef}|${e.xagMax}`
const pre = { cuts: 0, events_compared: 0, event_diffs: 0, t2_compared: 0, t2_diffs: 0, samples: [] }, r2 = rng(777)
const tStart = Date.parse('2014-06-01'), tEnd = M.at(-1).t
for (let c = 0; c < NA; c++) {
  const T = tStart + r2() * (tEnd - tStart), Mp = M.slice(0, lbT(M, T)), MSp = MS.slice(0, lbT(MS, T))
  const C3p = bld(KG, Mp, '3m'), PL3p = pivotLows(C3p)
  for (const tf of ['1H', '4H']) {
    const Gp = bld(KG, Mp, tf), Sp = bld(KS, MSp, tf), evp = findSweeps(Gp, Sp, Mp, { from: FROM }), a = full[tf].ev.filter((e) => e.decisionT < T)
    const A = new Set(a.map(sig)), B = new Set(evp.map(sig)); pre.events_compared += a.length
    for (const s of A) if (!B.has(s)) { pre.event_diffs++; if (pre.samples.length < 10) pre.samples.push({ cut: new Date(T).toISOString(), tf, missing_in_prefix: s }) }
    for (const s of B) if (!A.has(s)) { pre.event_diffs++; if (pre.samples.length < 10) pre.samples.push({ cut: new Date(T).toISOString(), tf, extra_in_prefix: s }) }
    // T2 entries decided before T (last 30 events before the cut)
    const byT = new Map(evp.map((e) => [e.t, e]))
    for (const e of a.slice(-30)) { const ef = t2Entry(e, full[tf].G, C3f, PL3f, M); if (ef == null || ef >= T) continue
      const ep = byT.get(e.t); pre.t2_compared++
      const ev2 = ep ? t2Entry(ep, Gp, C3p, PL3p, Mp) : null
      if (ev2 !== ef) { pre.t2_diffs++; if (pre.samples.length < 10) pre.samples.push({ cut: new Date(T).toISOString(), tf, t2: [ef, ev2] }) } } }
  pre.cuts++; if (c % 20 === 0) console.log('  prefix cut', c, JSON.stringify({ ...pre, samples: pre.samples.length }))
}
console.log('B. prefix:', JSON.stringify(pre))

// ── C. positive control ──
const pc = study.report_only.filter((x) => x.cond === 'ORACLE').map((o) => { const s = study.cells.find((c) => c.key === o.key.replace('ORACLE', 'SWEEP'))
  return { key: o.key, oracle_wr: o.OOS.wr, oracle_usd: o.OOS.usd, sweep_wr: s?.OOS.wr, sweep_usd: s?.OOS.usd } })
console.log('C. positive control:', JSON.stringify(pc))
const out = { built_at: new Date().toISOString(), independent: { trades: checked.length, with_differences: diffs.length, diffs }, prefix: pre, positive_control: pc,
  clean: diffs.length === 0 && pre.event_diffs === 0 && pre.t2_diffs === 0 && pc.every((p) => p.oracle_wr > p.sweep_wr + 0.1) }
fs.writeFileSync(path.join(TURBO.master, 'sell_smt_sweep_audit.json'), JSON.stringify(out, null, 1))
console.log('AUDIT CLEAN:', out.clean)
