// audit_choch_4h.mjs — §7 audit of the 4H CHoCH study family (spec docs/CHOCH_4H_ADX_SPEC.md), on the ADDENDUM E gold trades (the strongest family):
//   A. independent evaluator: 200 random E trades re-derived with own loops from the minutes (CHoCH close vs level, OB never broken from the CHoCH to the
//      trigger, entry after the trigger 15m candle, the whole exit path) — 0 differences required
//   B. prefix (look-ahead) check: 100 random cut times; CHoCH events + E setups rebuilt from data cut at T equal the full run's decided before T
//   C. positive control: E BUY trades whose 4H close 6 candles after entry is above the entry (an oracle) must beat all E BUY trades clearly
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { rng } from '../src/core/studyStats.js'
import { findChochs, obChochSetups } from './lib/choch4h.mjs'

const END = Date.parse('2026-10-16T21:00:00Z'), H4 = 4 * 3600000
const lbT = (A, t) => { let a = 0, b = A.length; while (a < b) { const m = (a + b) >> 1; if (A[m].t < t) a = m + 1; else b = m } return a }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < END), K = kit('XAUUSD', { reopenClamp: false }), spreadAt = makeSpreadAt()
const bld = (Mx, tf) => { const c = K.build(Mx, tf); markIncomplete(c, findHoles(Mx)); return c }
const F = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'choch_retest_ob_long_trades.json'), 'utf8')), r = rng(99), diffs = []
const S = new Map(F.setups.map((x) => [x.decisionT, x]))
// ── A ──
const pool = Object.entries(F.trades).flatMap(([k, T]) => T.map((t) => [k, t])); let checked = 0
for (let n = 0; n < 200 && pool.length; n++) { const [key, t] = pool[(r() * pool.length) | 0], x = S.get(t.decisionT), d = []; checked++
  if (!x) { diffs.push({ key, d: ['setup not found'] }); continue }
  const s = x.side === 'BUY' ? 1 : -1, [lv, ex, tg] = key.split('|')
  let c4 = null; for (let k = lbT(M, x.t); k < M.length && M[k].t < x.t + H4; k++) c4 = M[k].c
  if (!(s * (c4 - x.level) > 0)) d.push('CHoCH close not beyond the level')
  const ext = s > 0 ? x.ob[0] : x.ob[1]
  for (let k = lbT(M, x.closeT); k < M.length && M[k].t < x.trigT + 900000; k++) if (s > 0 ? M[k].l < ext : M[k].h > ext) { d.push('OB broken before the trigger'); break }
  if (!(t.entryT >= x.trigT + 900000)) d.push('entry before the trigger candle closed')
  const stop = ext - s * 0.1 * x.atr; if (Math.abs(stop - t.stop) > 1e-6) d.push('stop')
  let k = lbT(M, t.entryT); const e0 = M[k], entry = s > 0 ? e0.o + spreadAt(e0.t) : e0.o; if (Math.abs(entry - t.entry) > 1e-6) d.push('entry price')
  const R = s * (entry - stop), mult = { X1: 3, X2: 5, X3: 1e9 }[tg], tp = entry + s * mult * R; let got = null
  for (; k < M.length && M[k].t <= t.exitT; k++) { const b = M[k], sp = spreadAt(b.t), o = s > 0 ? b.o : b.o + sp, lo = s > 0 ? b.l : b.l + sp, hi = s > 0 ? b.h : b.h + sp
    if (b.t > e0.t && (s > 0 ? o <= stop : o >= stop)) { got = ['stop_gap', b.t]; break }
    if (s > 0 ? lo <= stop : hi >= stop) { got = ['stop', b.t]; break }
    if (s > 0 ? hi >= tp : lo <= tp) { got = ['target', b.t]; break } }
  if (!got) got = ['time', t.exitT]
  if (got[0] !== t.how || got[1] !== t.exitT) d.push(`exit ${got[0]}@${got[1]} vs ${t.how}@${t.exitT}`)
  if (d.length) diffs.push({ key, t: new Date(x.t).toISOString(), d }) }
console.log('A. independent evaluator:', checked, 'trades,', diffs.length, 'with differences', JSON.stringify(diffs.slice(0, 5)))
// ── B ──
const C4 = bld(M, '4H'), C15 = bld(M, '15m'), full = findChochs(C4, M, { from: M[0].t + 60 * 86400000 }), fullE = obChochSetups(C4, full.A, full.X, full.events, C15, M).setups
const sigE = (e) => `${e.side}|${e.t}|${e.decisionT}|${e.level}`, sigS = (x) => `${x.side}|${x.t}|${x.decisionT}|${x.tip}|${x.g1}|${x.g2}`
const pre = { cuts: 0, events: 0, event_diffs: 0, setups: 0, setup_diffs: 0, samples: [] }, r2 = rng(123), t0 = Date.parse('2014-06-01')
for (let c = 0; c < 100; c++) { const T = t0 + r2() * (END - t0), Mp = M.slice(0, lbT(M, T)), C4p = bld(Mp, '4H'), C15p = bld(Mp, '15m')
  const fp = findChochs(C4p, Mp, { from: M[0].t + 60 * 86400000 }), ep = obChochSetups(C4p, fp.A, fp.X, fp.events, C15p, Mp).setups
  const a = new Set(full.events.filter((e) => e.decisionT < T).map(sigE)), b = new Set(fp.events.map(sigE)); pre.events += a.size
  for (const s of a) if (!b.has(s)) { pre.event_diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), missing: s }) }
  for (const s of b) if (!a.has(s)) { pre.event_diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), extra: s }) }
  const sa = new Set(fullE.filter((x) => x.decisionT < T).map(sigS)), sb = new Set(ep.map(sigS)); pre.setups += sa.size
  for (const s of sa) if (!sb.has(s)) { pre.setup_diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), setup_missing: s }) }
  for (const s of sb) if (!sa.has(s)) { pre.setup_diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), setup_extra: s }) }
  pre.cuts++; if (c % 20 === 0) console.log('  prefix', c, JSON.stringify({ ...pre, samples: pre.samples.length })) }
console.log('B. prefix:', JSON.stringify(pre))
// ── C ──
const buys = Object.entries(F.trades).filter(([k]) => k.startsWith('BUY|G0|')).flatMap(([, T]) => T)
const fut = (t) => { const i = lbT(C4, t); return C4[i + 6]?.c }
const orc = buys.filter((t) => fut(t.entryT) > t.entry), mean = (Z) => Z.reduce((s, z) => s + z.pnl, 0) / Z.length
const pc = { all_buys: { n: buys.length, usd: +mean(buys).toFixed(3) }, oracle: { n: orc.length, usd: +mean(orc).toFixed(3) } }
console.log('C. positive control:', JSON.stringify(pc))
const out = { built_at: new Date().toISOString(), independent: { trades: checked, with_differences: diffs.length, diffs }, prefix: pre, positive_control: pc,
  clean: diffs.length === 0 && pre.event_diffs === 0 && pre.setup_diffs === 0 && pc.oracle.usd > pc.all_buys.usd + 5 }
fs.writeFileSync(path.join(TURBO.master, 'choch_4h_audit.json'), JSON.stringify(out, null, 1)); console.log('AUDIT CLEAN:', out.clean)
