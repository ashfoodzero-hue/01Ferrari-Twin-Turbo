// ════════════════════════════════════════════════════════════════════════════════
// study_orderflow_combined.mjs — EVERYTHING COMBINED (spec docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 5, pre-registered 2026-10-11).
// Merges the dumped 5m events of every level family (study_orderflow_footprint.mjs --dump: base, new, strong), one event per (touch bar,
// side) with merged family flags; GBDT (scripts/inv90/gbdt.mjs) on all features; monthly walk-forward (train < month − 1 day, first 9
// months train-only); take ⇔ score ≥ the 70th percentile of the model's in-sample scores. Output: data/master/orderflow_combined_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { fitBins, binAll, train, predict, usage } from './inv90/gbdt.mjs'

const DIR = path.join(TURBO.root, 'data', 'orderflow'), DAY = 86400000
const FAMS = ['L-VP', 'L-HL', 'L-SW1H', 'L-CONF', 'L-STR2', 'L-STR3'], byKey = new Map()
for (const f of ['events_5m_base.json', 'events_5m_new.json', 'events_5m_strong.json']) for (const r of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).rows) {
  if (r.net1R == null) continue
  const k = r.i + '|' + r.short; let e = byKey.get(k); if (!e) byKey.set(k, (e = { ...r, fam: new Set() })); e.fam.add(r.family) }
const ev = [...byKey.values()].sort((a, b) => a.t - b.t)
const NAMES = [...FAMS.map((f) => 'is_' + f), 'C1', 'C2', 'C3', 'C4', 'C5', 'count', 'countF', 'dF', 'dF1', 'volRel', 'atrRel', 'distAtr', 'tr240', 'tr600', 'rsi', 'hour', 'wday', 'short']
const vec = (e) => [...FAMS.map((f) => (e.fam.has(f) ? 1 : 0)), ...['C1', 'C2', 'C3', 'C4', 'C5'].map((c) => (e.c[c] ? 1 : 0)), e.c.count, e.cF, e.x.dF, e.x.dF1, e.x.volRel, e.x.atrRel, e.x.distAtr,
  e.short ? -e.x.tr240 : e.x.tr240, e.short ? -e.x.tr600 : e.x.tr600, e.short ? 100 - e.x.rsi : e.x.rsi, e.x.hour, e.x.wday, e.short ? 1 : 0]   // trend / RSI signed in the trade's direction
const n = ev.length, F = NAMES.length, X = new Float32Array(n * F), y = new Uint8Array(n)
ev.forEach((e, r) => { vec(e).forEach((v, k) => { X[r * F + k] = v }); y[r] = e.net1R > 0 ? 1 : 0 })
console.log(`events ${n} (${ev[0] && new Date(ev[0].t).toISOString().slice(0, 10)} → ${new Date(ev.at(-1).t).toISOString().slice(0, 10)}) · base WR ${(y.reduce((s, v) => s + v, 0) / n).toFixed(4)}`)
const m0 = new Date(ev[0].t); let mStart = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() + 9, 1); const scores = new Float32Array(n).fill(NaN), take = new Uint8Array(n), use = new Array(F).fill(0)
for (; mStart <= ev.at(-1).t; ) { const d = new Date(mStart), mEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
  const tr = [], te = []; ev.forEach((e, r) => { if (e.t < mStart - DAY) tr.push(r); else if (e.t >= mStart && e.t < mEnd) te.push(r) })
  if (te.length && tr.length >= 200) { const Xb = binAll(X, n, F, fitBins(X, n, F, tr)), model = train(Xb, n, F, y, tr, { minLeaf: 30, seed: mStart % 1e6 })
    const ins = tr.map((r) => predict(model, Xb, n, r)).sort((a, b) => a - b), thr = ins[Math.floor(0.7 * ins.length)]
    for (const r of te) { scores[r] = predict(model, Xb, n, r); take[r] = scores[r] >= thr ? 1 : 0 } usage(model, F).forEach((c, k) => { use[k] += c }) }
  mStart = mEnd }
const summ = (rows) => { const v = rows.map((r) => ev[r].net1R), k = v.length, w = v.filter((x) => x > 0).length, mean = k ? v.reduce((s, x) => s + x, 0) / k : null
  let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }; const b = []; for (let q = 0; q < 2000 && k; q++) { let t = 0; for (let j = 0; j < k; j++) t += v[(rnd() * k) | 0]; b.push(t / k) } b.sort((a, c) => a - c)
  const days = k ? new Set(rows.map((r) => Math.floor(ev[r].t / DAY))).size : 0
  return { n: k, wr: k ? +(w / k).toFixed(4) : null, net: mean == null ? null : +mean.toFixed(3), net_lb: k ? +b[50].toFixed(3) : null, per_trading_day_with_events: days ? +(k / days).toFixed(2) : null } }
const oos = [...Array(n).keys()].filter((r) => Number.isFinite(scores[r])), taken = oos.filter((r) => take[r]), ranked = oos.slice().sort((a, b) => scores[b] - scores[a])
const tradingDays = new Set(oos.map((r) => Math.floor(ev[r].t / DAY))).size, spanDays = (ev.at(-1).t - ev[oos[0]].t) / DAY * 5 / 7
const res = { all_oos: summ(oos), taken: summ(taken), top50: summ(ranked.slice(0, Math.floor(ranked.length / 2))), top25: summ(ranked.slice(0, Math.floor(ranked.length / 4))), top10: summ(ranked.slice(0, Math.floor(ranked.length / 10))) }
res.taken.per_weekday = +(taken.length / spanDays).toFixed(2)
const verdict = res.taken.n >= 100 && res.taken.net_lb > 0 && res.taken.wr > res.all_oos.wr ? 'PASS' : res.taken.n < 100 ? 'UNDERPOWERED' : 'FAIL'
const out = { at: new Date().toISOString(), spec: 'docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 5', events: n, oos_from: new Date(ev[oos[0]].t).toISOString().slice(0, 10), features: NAMES, results: res,
  feature_usage: NAMES.map((nm, k) => [nm, use[k]]).sort((a, b) => b[1] - a[1]).slice(0, 12), verdict }
fs.writeFileSync(path.join(TURBO.master, 'orderflow_combined_study.json'), JSON.stringify(out, null, 1))
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(8), JSON.stringify(v))
console.log('top features', JSON.stringify(out.feature_usage.slice(0, 8)), '\n=> COMBINED:', verdict)
