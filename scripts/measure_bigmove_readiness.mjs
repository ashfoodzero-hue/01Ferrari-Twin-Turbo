// measure_bigmove_readiness.mjs — EXTREME TRIGGER · Phase 4a: does a MEASURED condition give ≥95% precision that a
// big move STARTS within the next K days? (occurrence — the honest home of "95% correct")
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Direction-in-advance measured dead at every link. OCCURRENCE is different: the catalog shows violent clustering
// (2017:27/yr vs 2026:795/yr) — volatility is self-exciting. TEST: for every day in 23.3y, label whether a cataloged
// big event STARTS in the next K days; evaluate causal conditions (all prior-day): recent event density, realized-vol
// percentile, VIX, HY stress. For each condition sweep thresholds → PRECISION P(event within K | condition) + coverage.
// A claim only counts if precision holds in BOTH eras (2003-2014 / 2015-2026) — one hot regime must not write the rule.
import '../src/core/bootEnv.js'
import { loadBars } from '../src/data/backfillReader.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own Polygon 1m tape (resampled), from 2013-07-14

const K = 3   // "a big move starts within the next 3 days"
const readFred = (id) => { /* R0 (twin): FRED is not Polygon — VIX/HY conditions are BLOCKED, not proxied */ return []; try { return fs.readFileSync(path.join('data/fred', id + '.csv'), 'utf8').trim().split('\n').slice(1)
  .map((l) => { const [d, v] = l.split(','); return { t: Date.parse(d + 'T00:00:00Z'), v: +v } }).filter((x) => Number.isFinite(x.v)) } catch { return [] } }
const asOf = (s, t) => { let lo = 0, hi = s.length - 1, a = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (s[m].t < t - 43200000) { a = s[m].v; lo = m + 1 } else hi = m - 1 } return a }
const wilsonLo = (k, n) => { if (!n) return 0; const z = 1.96, p = k / n; return (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n) }

console.log(`\n████ EXTREME TRIGGER · Phase 4a — READINESS: ≥95%-precision that a big move starts within ${K} days? ████\n`)
const cat = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'bigmove_catalog.json'), 'utf8'))
const starts = cat.events.map((e) => Date.parse(e.start)).sort((a, b) => a - b)
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })
const vix = readFred('VIXCLS'), hy = readFred('BAMLH0A0HYM2')

// day grid + daily realized range% (from 15m bars) — causal daily aggregates
const dayMs = 86400000
const d0 = Math.ceil(bars[0].t / dayMs) * dayMs, d1 = Math.floor(bars.at(-1).t / dayMs) * dayMs
const dayAgg = new Map()
for (const b of bars) { const k = Math.floor(b.t / dayMs) * dayMs; const e = dayAgg.get(k) || { hi: -Infinity, lo: Infinity, c: b.c }
  e.hi = Math.max(e.hi, b.h); e.lo = Math.min(e.lo, b.l); e.c = b.c; dayAgg.set(k, e) }
const days = []
for (let t = d0 + 30 * dayMs; t <= d1 - K * dayMs; t += dayMs) {
  const dow = new Date(t).getUTCDay(); if (dow === 6) continue      // skip Saturdays (no market)
  // label: does an event START in (t, t+K days]?
  let lo = 0, hi2 = starts.length - 1, nxt = null
  while (lo <= hi2) { const m = (lo + hi2) >> 1; if (starts[m] > t) { nxt = starts[m]; hi2 = m - 1 } else lo = m + 1 }
  const label = nxt != null && nxt <= t + K * dayMs
  // causal features (all from BEFORE day t)
  let dens30 = 0; for (const s of starts) { if (s >= t) break; if (s > t - 30 * dayMs) dens30++ }
  let rv = 0, n = 0; for (let j = 1; j <= 10; j++) { const d = dayAgg.get(t - j * dayMs); if (d && d.hi > -Infinity) { rv += (d.hi - d.lo) / d.c; n++ } }
  const rv10 = n ? (rv / n) * 100 : null                            // avg daily range % over prior 10 days
  days.push({ t, label, dens30, rv10, vix: asOf(vix, t), hy: asOf(hy, t), era: t < Date.parse('2020-01-01T00:00:00Z') ? 'A' : 'B'   /* twin: halves of 2013-07→2026 (Turbo2 split 2015 = halves of 23y) */ })
}
const base = days.filter((d) => d.label).length / days.length
console.log(`days: ${days.length} · BASE RATE P(event within ${K}d) = ${(100 * base).toFixed(1)}%`)

const CONDS = [
  ['dens30 ≥ 3 (self-exciting)', (d) => d.dens30 >= 3], ['dens30 ≥ 6', (d) => d.dens30 >= 6], ['dens30 ≥ 10', (d) => d.dens30 >= 10],
  ['rv10 ≥ 1.5% daily range', (d) => d.rv10 != null && d.rv10 >= 1.5], ['rv10 ≥ 2.0%', (d) => d.rv10 != null && d.rv10 >= 2.0], ['rv10 ≥ 2.5%', (d) => d.rv10 != null && d.rv10 >= 2.5],
  ['VIX ≥ 25', (d) => d.vix != null && d.vix >= 25], ['VIX ≥ 35', (d) => d.vix != null && d.vix >= 35],
  ['HY spread ≥ 5', (d) => d.hy != null && d.hy >= 5],
  ['dens30≥6 AND rv10≥2%', (d) => d.dens30 >= 6 && d.rv10 != null && d.rv10 >= 2.0],
  ['dens30≥10 AND rv10≥2.5%', (d) => d.dens30 >= 10 && d.rv10 != null && d.rv10 >= 2.5],
  ['CALM: dens30=0 AND rv10<1%', (d) => d.dens30 === 0 && d.rv10 != null && d.rv10 < 1.0],   // the inverse claim: quiet stays quiet
]
console.log(`\n  condition`.padEnd(30) + 'fires   precision (LB)     era-A prec   era-B prec   coverage-of-events')
const out = []
for (const [name, f] of CONDS) {
  const hit = days.filter(f); if (hit.length < 50) { console.log(`  ${name.padEnd(28)} n=${hit.length} (too few)`); continue }
  const tp = hit.filter((d) => d.label).length
  const prec = tp / hit.length, lb = wilsonLo(tp, hit.length)
  const eA = hit.filter((d) => d.era === 'A'), eB = hit.filter((d) => d.era === 'B')
  const pA = eA.length >= 30 ? eA.filter((d) => d.label).length / eA.length : null
  const pB = eB.length >= 30 ? eB.filter((d) => d.label).length / eB.length : null
  // coverage: share of ALL event-days that the condition catches
  const evDays = days.filter((d) => d.label), cov = evDays.length ? evDays.filter(f).length / evDays.length : 0
  const tag = name.startsWith('CALM') ? (lb >= 0.95 ? '' : '') : ''
  console.log(`  ${name.padEnd(28)} ${String(hit.length).padStart(5)}   ${(100 * prec).toFixed(1)}% (${(100 * lb).toFixed(1)})    ${pA != null ? (100 * pA).toFixed(1) + '%' : '  — '}       ${pB != null ? (100 * pB).toFixed(1) + '%' : '  — '}       ${(100 * cov).toFixed(0)}%`)
  out.push({ name, fires: hit.length, precision: +(100 * prec).toFixed(1), lb: +(100 * lb).toFixed(1), eraA: pA != null ? +(100 * pA).toFixed(1) : null, eraB: pB != null ? +(100 * pB).toFixed(1) : null, coverage: +(100 * cov).toFixed(0) })
}
// CALM inverse: precision that NO event occurs
const calm = days.filter((d) => d.dens30 === 0 && d.rv10 != null && d.rv10 < 1.0)
if (calm.length >= 50) { const tn = calm.filter((d) => !d.label).length
  console.log(`\n  INVERSE (quiet stays quiet): P(NO event within ${K}d | CALM) = ${(100 * tn / calm.length).toFixed(1)}% (LB ${(100 * wilsonLo(tn, calm.length)).toFixed(1)}) on ${calm.length} days`) }
fs.writeFileSync(path.join(TURBO.master, 'bigmove_readiness.json'), JSON.stringify({ at: new Date().toISOString(), K, base_rate: +(100 * base).toFixed(1), conditions: out, source: 'measure_bigmove_readiness.mjs — era-split precision, causal features' }, null, 1))
console.log(`\n✅ wrote data/master/bigmove_readiness.json — a condition is CONFIRMED only if its Wilson-LB ≥95% AND both eras hold.\n`)
