// audit_topdown_system.mjs — §7 audit of study_topdown_system.mjs (spec docs/TOPDOWN_SYSTEM_SPEC.md), gold:
//   A. independent evaluator: 200 random trades re-priced from the minutes with an own loop (entry price, stop, target / time exit) — 0 differences
//   B. prefix (look-ahead) check: 60 random cuts; CHoCH events of 15m / 1H / 4H / 1D (the regimes and every entry trigger) rebuilt from data cut at T
//      equal the full run's events decided before T
//   C. positive control: trades whose price 6 hours after entry moved their way (an oracle) must clearly beat all trades of the same layer
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { rng } from '../src/core/studyStats.js'
import { findChochs } from './lib/choch4h.mjs'

const END = Date.parse('2026-10-16T21:00:00Z')
const lbT = (A, t) => { let a = 0, b = A.length; while (a < b) { const m = (a + b) >> 1; if (A[m].t < t) a = m + 1; else b = m } return a }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < END), K = kit('XAUUSD', { reopenClamp: false }), spreadAt = makeSpreadAt()
const TR = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'topdown_system_trades.json'), 'utf8')), r = rng(55), diffs = []
// ── A ──
const pool = Object.entries(TR).flatMap(([k, T]) => T.map((t) => [k, t])); let checked = 0
for (let n = 0; n < 200 && pool.length; n++) { const [key, t] = pool[(r() * pool.length) | 0], s = t.side === 'BUY' ? 1 : -1, d = []; checked++
  let k = lbT(M, t.entryT); const e0 = M[k], entry = s > 0 ? e0.o + spreadAt(e0.t) : e0.o
  if (Math.abs(entry - t.entry) > 1e-6) d.push('entry')
  if (Math.abs(s * (t.entry - t.stop) - t.R) > 1e-6) d.push('R')
  let got = null
  for (; k < M.length && M[k].t <= t.exitT; k++) { const b = M[k], sp = spreadAt(b.t), o = s > 0 ? b.o : b.o + sp, lo = s > 0 ? b.l : b.l + sp, hi = s > 0 ? b.h : b.h + sp
    if (b.t > e0.t && (s > 0 ? o <= t.stop : o >= t.stop)) { got = ['stop_gap', b.t]; break }
    if (s > 0 ? lo <= t.stop : hi >= t.stop) { got = ['stop', b.t]; break }
    if (s > 0 ? hi >= t.tp : lo <= t.tp) { got = ['target', b.t]; break } }
  if (!got) got = ['time', t.exitT]
  if (got[0] !== t.how || got[1] !== t.exitT) d.push(`exit ${got[0]}@${got[1]} vs ${t.how}@${t.exitT}`)
  if (d.length) diffs.push({ key, at: new Date(t.entryT).toISOString(), d }) }
console.log('A. independent evaluator:', checked, 'trades,', diffs.length, 'with differences', JSON.stringify(diffs.slice(0, 5)))
// ── B ──
const TFS = ['15m', '1H', '4H', '1D'], FROM = M[0].t + 60 * 86400000, bld = (Mx, tf) => { const c = K.build(Mx, tf); markIncomplete(c, findHoles(Mx)); return c }
const full = Object.fromEntries(TFS.map((tf) => [tf, findChochs(bld(M, tf), M, { from: FROM }).events]))
const sig = (e) => `${e.side}|${e.t}|${e.decisionT}|${e.level}|${e.tip}`, pre = { cuts: 0, events: 0, diffs: 0, samples: [] }, r2 = rng(808), t0 = Date.parse('2014-06-01')
for (let c = 0; c < 60; c++) { const T = t0 + r2() * (END - t0), Mp = M.slice(0, lbT(M, T))
  for (const tf of TFS) { const ep = findChochs(bld(Mp, tf), Mp, { from: FROM }).events, a = new Set(full[tf].filter((e) => e.decisionT < T).map(sig)), b = new Set(ep.map(sig)); pre.events += a.size
    for (const s of a) if (!b.has(s)) { pre.diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), tf, missing: s }) }
    for (const s of b) if (!a.has(s)) { pre.diffs++; if (pre.samples.length < 6) pre.samples.push({ cut: new Date(T).toISOString(), tf, extra: s }) } }
  pre.cuts++; if (c % 15 === 0) console.log('  prefix', c, JSON.stringify({ ...pre, samples: pre.samples.length })) }
console.log('B. prefix:', JSON.stringify(pre))
// ── C ──
const pc = {}
for (const layer of ['S-CONT', 'SC']) { const T = Object.entries(TR).filter(([k]) => k.startsWith('4H|') && k.includes(`|${layer}|`) && (layer === 'SC' || k.endsWith('X-2R'))).flatMap(([, v]) => v)
  const later = (t) => { const k = lbT(M, t.entryT + 6 * 3600000); return M[k]?.c }, orc = T.filter((t) => (t.side === 'BUY' ? 1 : -1) * (later(t) - t.entry) > 0), m = (Z) => +(Z.reduce((s, z) => s + z.pnl, 0) / Z.length).toFixed(3)
  pc[layer] = { all: { n: T.length, usd: m(T) }, oracle: { n: orc.length, usd: m(orc) } } }
console.log('C. positive control:', JSON.stringify(pc))
const out = { built_at: new Date().toISOString(), independent: { trades: checked, with_differences: diffs.length, diffs }, prefix: pre, positive_control: pc,
  clean: diffs.length === 0 && pre.diffs === 0 && Object.values(pc).every((p) => p.oracle.usd > p.all.usd + 1) }
fs.writeFileSync(path.join(TURBO.master, 'topdown_system_audit.json'), JSON.stringify(out, null, 1)); console.log('AUDIT CLEAN:', out.clean)
