// ════════════════════════════════════════════════════════════════════════════════
// study_magnet_confirm.mjs — the four confirmation checks of the 1H liquidity magnet (2026-10-16). Pre-registered: docs/MAGNET_CONFIRMATION_SPEC.md.
//   C1 timing-matched placebo · C2 family-wise α = 0.05/18 · C3 DXY replication · C4 DXY as a confirmer of gold's magnet.
// Same mechanics as study_magnet_liquidity.mjs (1H UTC bars, magnetScores pools, ATR14 distances, 1m touch order, dedup, week blocks).
// Output: data/master/magnet_confirm.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { streamDxy1m } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { magnetScores } from '../src/master/macroMagnet.js'

const FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
const HR = 3600000, M = 20, HS = [30, 120], FAMILY = 18, Y2020 = Date.UTC(2020, 0, 1)
let seed = 7072026; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
async function series(src, name) {   // 1H UTC candles + the 1m t/h/l arrays from ONE pass
  const T = [], Hh = [], Ll = [], g = []; let c = null
  for await (const b of src) { T.push(b.t); Hh.push(b.h); Ll.push(b.l); const t = Math.floor(b.t / HR) * HR
    if (!c || c.t !== t) { if (c) g.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } }
  const Tm = Float64Array.from(T), Hm = Float64Array.from(Hh), Lm = Float64Array.from(Ll)
  const lb = (t) => { let lo = 0, hi = Tm.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Tm[m] < t) lo = m + 1; else hi = m } return lo }
  const S = magnetScores(g), A = atrArr(g, 14), idx = new Map(g.map((b, i) => [b.t, i]))
  const firstTouch = (k, up, dn, H) => { for (let j = k + 1; j <= k + H && j < g.length; j++) { const b = g[j], hu = b.h >= up, hd = b.l <= dn
      if (hu && !hd) return 'U'; if (hd && !hu) return 'D'
      if (hu && hd) { for (let i = lb(b.t), e = lb(b.t + HR); i < e; i++) { const mu = Hm[i] >= up, md = Lm[i] <= dn; if (mu && md) return 'AMB'; if (mu) return 'U'; if (md) return 'D' } return 'AMB' } } return 'CENS' }
  console.log(`  ${name}: ${g.length} 1H candles, ${Tm.length} minutes`)
  return { g, S, A, idx, firstTouch }
}
console.log('loading 13 y of 1m (gold + DXY) …')
const GOLD = await series(streamBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 30 * 86400000 }), 'gold')
const DXY = await series(streamDxy1m({ from: FROM - 60 * 86400000, to: TO + 30 * 86400000 }), 'DXY')
/** dedup events (first close of each new (BSL, SSL) pair) + their placebo outcomes. placebo: 'regime' (any close with both pools) | 'timing' (other first-of-pair closes) */
function run(X, H, placebo, tag = null) {
  const { g, S, A, firstTouch } = X, ok = (k) => A[k] > 0 && k + H < g.length && g[k].t >= FROM && g[k].t + H * HR <= TO + 3 * 86400000
  const both = (k) => S[k] && S[k].bsl != null && S[k].ssl != null && g[k].c < S[k].bsl && g[k].c > S[k].ssl
  const firsts = [], seen = new Set(); for (let k = 0; k < g.length; k++) if (ok(k) && both(k)) { const key = S[k].bsl + '|' + S[k].ssl; if (!seen.has(key)) { seen.add(key); firsts.push(k) } }
  const pool = { train: [], oos: [] }
  for (const k of placebo === 'timing' ? firsts : [...Array(g.length).keys()].filter((k) => ok(k) && both(k))) (g[k].t < SPLIT ? pool.train : pool.oos).push(k)
  return firsts.map((k) => { const s = S[k], c = g[k].c, a = A[k], dB = (s.bsl - c) / a, dS = (c - s.ssl) / a, nearUp = dB < dS, out = firstTouch(k, s.bsl, s.ssl, H), split = g[k].t < SPLIT ? 'train' : 'oos', P = pool[split]
    let pr = 0, pn = 0; for (let m = 0; m < M; m++) { let q; do { q = P[(rnd() * P.length) | 0] } while (q === k)
      const o = firstTouch(q, g[q].c + dB * A[q], g[q].c - dS * A[q], H); if (o === 'U' || o === 'D') { pr++; if ((o === 'U') === nearUp) pn++ } }
    return { t: g[k].t, split, nearUp, real: out === 'U' || out === 'D' ? ((out === 'U') === nearUp ? 1 : 0) : null, pr, pn, tag: tag ? tag(k, nearUp) : null } })
}
const lift = (xs) => { let rw = 0, rn = 0, pn = 0, pr = 0; for (const e of xs) { if (e.real != null) { rw += e.real; rn++ } pn += e.pn; pr += e.pr } return rn && pr ? { n: rn, real: rw / rn, placebo: pn / pr, lift: rw / rn - pn / pr } : { n: rn, real: null, placebo: null, lift: null } }
const weeks = (xs) => { const m = new Map(); for (const e of xs) { const w = Math.floor((e.t + 4 * 86400000) / (7 * 86400000)); if (!m.has(w)) m.set(w, []); m.get(w).push(e) } return [...m.values()] }
function bootQ(xs, stat, alphas) { const B = weeks(xs), n = B.length, v = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < n; i++) s.push(...B[(rnd() * n) | 0]); const x = stat(s); if (x != null) v.push(x) }
  v.sort((a, b) => a - b); return Object.fromEntries(alphas.map((a) => [`lb_${a}`, +v[Math.floor(a * v.length)].toFixed(4)])) }
const f4 = (x) => x == null ? null : +x.toFixed(4)
const summary = (ev, alphas) => { const tr = ev.filter((e) => e.split === 'train'), oo = ev.filter((e) => e.split === 'oos'), L = lift(oo), T = lift(tr)
  return { oos: { n: L.n, real: f4(L.real), placebo: f4(L.placebo), lift: f4(L.lift), ...bootQ(oo, (s) => lift(s).lift, alphas) }, train: { n: T.n, lift: f4(T.lift) },
    era: { pre2020: f4(lift(ev.filter((e) => e.t < Y2020)).lift), post2020: f4(lift(ev.filter((e) => e.t >= Y2020)).lift) } } }
const A2 = 0.05 / 2, AF = 0.05 / FAMILY, res = { at: new Date().toISOString(), spec: 'docs/MAGNET_CONFIRMATION_SPEC.md', family_cells: FAMILY }
// DXY state at a gold event's hour (causal: DXY's own 1H pools at that close)
const dxyTag = (k, goldNearUp) => { const j = DXY.idx.get(GOLD.g[k].t); if (j == null) return 'none'; const s = DXY.S[j], c = DXY.g[j].c
  if (!s || s.bsl == null || s.ssl == null || !(c < s.bsl && c > s.ssl)) return 'none'; const dxyNearUp = (s.bsl - c) < (c - s.ssl); return dxyNearUp !== goldNearUp ? 'agree' : 'disagree' }
for (const H of HS) {
  const R = {}
  const goldRegime = run(GOLD, H, 'regime', dxyTag)
  R.C2_gold_regime = summary(goldRegime, [A2, AF])                                   // = (aw) recomputed with a fresh seed, now also at α/18
  R.C1_gold_timing = summary(run(GOLD, H, 'timing'), [A2, AF])
  R.C3_dxy_regime = summary(run(DXY, H, 'regime'), [A2, AF])
  const grp = (g) => goldRegime.filter((e) => e.tag === g), diff = (s) => { const a = lift(s.filter((e) => e.tag === 'agree')).lift, d = lift(s.filter((e) => e.tag === 'disagree')).lift; return a == null || d == null ? null : a - d }
  const oo = goldRegime.filter((e) => e.split === 'oos'), tr = goldRegime.filter((e) => e.split === 'train')
  R.C4_dxy_confirm = { groups: Object.fromEntries(['agree', 'disagree', 'none'].map((g) => { const x = grp(g); const o = lift(x.filter((e) => e.split === 'oos')), t = lift(x.filter((e) => e.split === 'train')); return [g, { oos_n: o.n, oos_real: f4(o.real), oos_placebo: f4(o.placebo), oos_lift: f4(o.lift), train_lift: f4(t.lift) }] })),
    oos_diff: f4(diff(oo)), ...bootQ(oo, diff, [A2]), train_diff: f4(diff(tr)) }
  res[`H${H}`] = R
  const p = (x) => x == null ? '—' : (x * 100).toFixed(1) + 'pp'
  console.log(`\n── H = ${H} bars (${H} h)`)
  for (const k of ['C2_gold_regime', 'C1_gold_timing', 'C3_dxy_regime']) { const r = R[k]; console.log(`  ${k.padEnd(15)} OOS n ${String(r.oos.n).padStart(5)} real ${r.oos.real} placebo ${r.oos.placebo} lift ${p(r.oos.lift)} LB(α/2) ${p(r.oos['lb_' + A2])} LB(α/18) ${p(r.oos['lb_' + AF])} · TRAIN ${p(r.train.lift)} · pre/post2020 ${p(r.era.pre2020)} / ${p(r.era.post2020)}`) }
  const c4 = R.C4_dxy_confirm; console.log(`  C4 DXY confirm  agree ${JSON.stringify(c4.groups.agree)}\n                  disagree ${JSON.stringify(c4.groups.disagree)}\n                  none ${JSON.stringify(c4.groups.none)}\n                  OOS diff ${p(c4.oos_diff)} LB ${p(c4['lb_' + A2])} · TRAIN diff ${p(c4.train_diff)}`)
}
// verdicts (spec): H30 is the cell
const h = res.H30, pass = (r, lbk) => r.oos.n >= 300 && r.oos.lift >= 0.03 && r.oos[lbk] > 0 && r.train.lift > 0
res.verdicts = { C1_timing_matched: pass(h.C1_gold_timing, 'lb_' + A2) ? 'PASS' : 'FAIL', C2_family_wise_gold: h.C2_gold_regime.oos['lb_' + AF] > 0 ? 'PASS' : 'FAIL', C2_family_wise_timing: h.C1_gold_timing.oos['lb_' + AF] > 0 ? 'PASS' : 'FAIL',
  C3_dxy_replicates: pass(h.C3_dxy_regime, 'lb_' + A2) ? 'REPLICATES' : 'NO', C4_dxy_adds_strength: h.C4_dxy_confirm.oos_diff >= 0.03 && h.C4_dxy_confirm['lb_' + A2] > 0 && h.C4_dxy_confirm.train_diff > 0 ? 'YES' : 'NO' }
res.magnet_confirmed = res.verdicts.C1_timing_matched === 'PASS' && res.verdicts.C2_family_wise_timing === 'PASS'
fs.writeFileSync(path.join(TURBO.master, 'magnet_confirm.json'), JSON.stringify(res, null, 1))
console.log('\nVERDICTS', JSON.stringify(res.verdicts), '→ MAGNET CONFIRMED:', res.magnet_confirmed)
