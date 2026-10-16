// ════════════════════════════════════════════════════════════════════════════════
// study_magnet_liquidity.mjs — is the nearer 4H liquidity pool taken first BECAUSE it is liquidity? Matched-placebo test (2026-10-16).
// Pre-registered: docs/MAGNET_LIQUIDITY_SPEC.md. Output: data/master/magnet_liquidity_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'
import { zOf } from './inv90/gate.mjs'

const FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
// ROBUSTNESS switches (post-hoc audit of the pre-registered verdict, 2026-10-16 — results go to magnet_liquidity_robustness.json):
//   MAG_DEDUP=1  one event per distinct (BSL, SSL) pair (its first bar) — consecutive bars sharing levels are not independent
//   MAG_REGIME=1 placebo times drawn ONLY from bars that also have both pools set (same range regime, other levels)
//   MAG_WEEKBLOCK=1 bootstrap resamples whole calendar weeks of events (overlapping paths stay together)
const DEDUP = process.env.MAG_DEDUP === '1', REGIME = process.env.MAG_REGIME === '1', WEEKBLOCK = process.env.MAG_WEEKBLOCK === '1', ROBUST = DEDUP || REGIME || WEEKBLOCK
const H4 = 4 * 3600000, M = 20, HS = [30, 6], K = HS.length, ALPHA = 0.05 / K, Y2020 = Date.UTC(2020, 0, 1)
// one pass over the 1m store: keep t/h/l for the 1m resolution AND build the NY 4H candles from the same minutes
const T = [], Hh = [], Ll = []
async function* tee(src) { for await (const b of src) { T.push(b.t); Hh.push(b.h); Ll.push(b.l); yield b } }
console.log('loading 13 y of gold 1m + building NY 4H …')
const g = (await resample4h(tee(streamBars('XAUUSD', '1m', { from: FROM - 120 * 86400000, to: TO + 70 * 86400000 })), ['ny'])).ny
const Tm = Float64Array.from(T), Hm = Float64Array.from(Hh), Lm = Float64Array.from(Ll)
const lb = (t) => { let lo = 0, hi = Tm.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Tm[m] < t) lo = m + 1; else hi = m } return lo }
const S = magnetScores(g), A = atrArr(g, 14)
console.log(`${g.length} 4H candles, ${Tm.length} minutes`)
/** first touch after bar k's close within H bars: 'U' (up level) | 'D' | 'AMB' (same minute) | 'CENS' */
function firstTouch(k, up, dn, H) {
  for (let j = k + 1; j <= k + H && j < g.length; j++) { const b = g[j], hu = b.h >= up, hd = b.l <= dn
    if (hu && !hd) return 'U'; if (hd && !hu) return 'D'
    if (hu && hd) { for (let i = lb(b.t), e = lb(b.t + H4); i < e; i++) { const mu = Hm[i] >= up, md = Lm[i] <= dn; if (mu && md) return 'AMB'; if (mu) return 'U'; if (md) return 'D' } return 'AMB' } }
  return 'CENS' }
let seed = 20261016; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const res = { at: new Date().toISOString(), spec: 'docs/MAGNET_LIQUIDITY_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], placebos_per_event: M, horizons: {} }
for (const H of HS) {
  const ok = (k) => A[k] > 0 && k + H < g.length && g[k].t >= FROM && g[k].t + H * H4 <= TO + 3 * 86400000
  const pool = { train: [], oos: [] }; for (let k = 0; k < g.length; k++) if (ok(k) && (!REGIME || (S[k] && S[k].bsl != null && S[k].ssl != null))) (g[k].t < SPLIT ? pool.train : pool.oos).push(k)
  const seenPair = new Set()
  const ev = []
  for (let k = 0; k < g.length; k++) { const s = S[k]; if (!s || s.bsl == null || s.ssl == null || !ok(k)) continue
    const c = g[k].c, a = A[k], dB = (s.bsl - c) / a, dS = (c - s.ssl) / a; if (!(dB > 0 && dS > 0)) continue
    if (DEDUP) { const key = s.bsl + '|' + s.ssl; if (seenPair.has(key)) continue; seenPair.add(key) }
    const nearUp = dB < dS, out = firstTouch(k, s.bsl, s.ssl, H), split = g[k].t < SPLIT ? 'train' : 'oos', P = pool[split]
    let pr = 0, pn = 0, pc = 0
    for (let m = 0; m < M; m++) { let q; do { q = P[(rnd() * P.length) | 0] } while (q === k)
      const cq = g[q].c, aq = A[q], o = firstTouch(q, cq + dB * aq, cq - dS * aq, H)
      if (o === 'U' || o === 'D') { pr++; if ((o === 'U') === nearUp) pn++ } else if (o === 'CENS') pc++ }
    ev.push({ t: g[k].t, split, nearUp, ratio: Math.min(dB, dS) / (dB + dS), expect: Math.max(dB, dS) / (dB + dS), out, real: out === 'U' || out === 'D' ? ((out === 'U') === nearUp ? 1 : 0) : null, pr, pn, pc }) }
  const agg = (xs) => { const r = xs.filter((e) => e.real != null), rn = r.length, rw = r.reduce((s, e) => s + e.real, 0), pr = xs.reduce((s, e) => s + e.pr, 0), pn = xs.reduce((s, e) => s + e.pn, 0)
    return { events: xs.length, resolved: rn, censored: xs.filter((e) => e.out === 'CENS').length, ambiguous: xs.filter((e) => e.out === 'AMB').length, real_near_first: rn ? +(rw / rn).toFixed(4) : null,
      placebo_near_first: pr ? +(pn / pr).toFixed(4) : null, formula: rn ? +(r.reduce((s, e) => s + e.expect, 0) / rn).toFixed(4) : null, lift: rn && pr ? +(rw / rn - pn / pr).toFixed(4) : null } }
  const boot = (xs) => { const wk = new Map(); for (const e of xs) { const w = WEEKBLOCK ? Math.floor((e.t + 4 * 86400000) / (7 * 86400000)) : e.t; if (!wk.has(w)) wk.set(w, []); wk.get(w).push(e) }
    const blocks = [...wk.values()], n = blocks.length, ls = []; for (let b = 0; b < 4000; b++) { let rw = 0, rn = 0, pn = 0, pr = 0
      for (let i = 0; i < n; i++) for (const e of blocks[(rnd() * n) | 0]) { if (e.real != null) { rw += e.real; rn++ } pn += e.pn; pr += e.pr }
      ls.push(rn && pr ? rw / rn - pn / pr : 0) } ls.sort((x, y) => x - y); return +ls[Math.floor(ALPHA * ls.length)].toFixed(4) }
  const tr = ev.filter((e) => e.split === 'train'), oo = ev.filter((e) => e.split === 'oos'), TR = agg(tr), OO = { ...agg(oo), lift_lb: boot(oo) }
  const verdict = OO.resolved >= 300 && OO.lift >= 0.03 && OO.lift_lb > 0 && TR.lift > 0 ? 'MAGNET_REAL' : OO.resolved < 300 ? 'UNDERPOWERED' : 'NOT_LIQUIDITY'
  const buckets = {}; for (const [lo, hi] of [[0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.3, 0.4], [0.4, 0.5001]]) { const b = oo.filter((e) => e.ratio >= lo && e.ratio < hi); buckets[`${lo}-${Math.min(hi, 0.5)}`] = agg(b) }
  res.horizons[H] = { train: TR, oos: OO, verdict, by_near_side: { near_BSL: agg(oo.filter((e) => e.nearUp)), near_SSL: agg(oo.filter((e) => !e.nearUp)) },
    era: { pre2020: agg(ev.filter((e) => e.t < Y2020)), post2020: agg(ev.filter((e) => e.t >= Y2020)) }, calibration_oos: buckets }
  console.log(`\n── H = ${H} bars (${H * 4} h): OOS events ${OO.events} (resolved ${OO.resolved}, censored ${OO.censored}, same-minute ${OO.ambiguous})`)
  console.log(`   OOS  real near-first ${OO.real_near_first} · placebo ${OO.placebo_near_first} · formula ${OO.formula} · LIFT ${(OO.lift * 100).toFixed(1)} pp (LB ${(OO.lift_lb * 100).toFixed(1)})`)
  console.log(`   TRAIN real ${TR.real_near_first} · placebo ${TR.placebo_near_first} · lift ${(TR.lift * 100).toFixed(1)} pp  → ${verdict}`)
  for (const [k, b] of Object.entries(buckets)) console.log(`   ratio ${k.padEnd(9)} n ${String(b.resolved).padStart(4)}  real ${b.real_near_first}  placebo ${b.placebo_near_first}  formula ${b.formula}`) }
res.verdict = Object.values(res.horizons).some((h) => h.verdict === 'MAGNET_REAL') ? 'MAGNET_REAL' : 'NOT_LIQUIDITY'
res.robustness = ROBUST ? { dedup: DEDUP, regime_matched_placebo: REGIME, week_block_bootstrap: WEEKBLOCK } : null
fs.writeFileSync(path.join(TURBO.master, ROBUST ? `magnet_liquidity_robustness_${+DEDUP}${+REGIME}${+WEEKBLOCK}.json` : 'magnet_liquidity_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> LIQUIDITY MAGNET: ${res.verdict}`)
