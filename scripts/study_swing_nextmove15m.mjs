// ════════════════════════════════════════════════════════════════════════════════
// study_swing_nextmove15m.mjs — 15m swings: the NEXT MOVE (docs/SWING_NEXTMOVE_15M_SPEC.md, pre-registered 2026-10-18; Ashraf: "Yes, run it as
// written"). Core: scripts/lib/swing_nextmove.mjs. Writes data/master/swing_nextmove_15m.json + docs/swing_book/nextmove15m/events_k3.csv.
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
import { wilson, compareRates, holm, rng, blockBootstrapMean } from '../src/core/studyStats.js'
import { loadContext, contextFor } from '../src/master/marketContext.js'
import { indexSwings, flipAt } from './lib/swing_ladder.mjs'
import { XS, lowerBound, race, nextMoveEvents, legMeasures, levelHits, quant } from './lib/swing_nextmove.mjs'

const CUT = Date.parse('2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM, SPLIT = FROM + 0.6 * (CUT - FROM), ALPHA = 0.05
const t0run = Date.now(), log = (s) => console.log(`  [${((Date.now() - t0run) / 1000).toFixed(0)}s] ${s}`)
const M = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: CUT })).bars).bars, MT = Float64Array.from(M.map((b) => b.t))
const holes = findHoles(M)
const tf = (name) => { const C = buildCandles(M, name); markIncomplete(C, holes); return { C, breaks: new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)) } }
const T15 = tf('15m'), T1H = tf('1H'), T4H = tf('4H'), T1D = tf('1D')
log(`1m ${M.length.toLocaleString()} · 15m ${T15.C.length.toLocaleString()} · holes ${holes.length} · split ${new Date(SPLIT).toISOString().slice(0, 10)}`)
// higher-timeframe swings (same rule, k = 3) and the ladder timeframes (1m / 3m / 5m: the 15m anchor's steps, LADDER_STEPS)
const zz = (T) => zigzag(T.C, { k: 3, breaks: T.breaks }).swings
const S1H = zz(T1H), S4H = zz(T4H)
const ladderIdx = ['1m', '3m', '5m'].map((n) => { const T = tf(n); return indexSwings(T.C, zz(T)) })
log('higher-timeframe + ladder swings built')
const ctx = loadContext()
const nyFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }), hourCache = new Map()
const nyHour = (t) => { const k = Math.floor(t / 3600000); if (!hourCache.has(k)) hourCache.set(k, +nyFmt.format(new Date(k * 3600000))); return hourCache.get(k) }
const session = (h) => (h >= 18 || h < 3 ? 'ASIA' : h < 8 ? 'LONDON' : 'NEWYORK')
// binary-search helpers for "last swing known by T" on the higher timeframes (swings are in knownI order)
const knownBy = (S, C) => { const KT = Float64Array.from(S.map((s) => C[s.knownI].close_t)); return (T) => { const n = lowerBound(KT, T + 1) - 1; return n >= 0 ? n : -1 } }
const k1H = knownBy(S1H, T1H.C), k4H = knownBy(S4H, T4H.C)
const lastOfType = (S, n, type) => { for (let j = n; j >= 0 && j >= n - 3; j--) if (S[j].type === type) return S[j]; return null }
const D1T = Float64Array.from(T1D.C.map((c) => c.t))

function analyse(k, full) {
  const { events, A } = nextMoveEvents(T15.C, { k, breaks: T15.breaks }), C = T15.C
  const ev = events.filter((e) => e.t0 < CUT && e.t0 >= FROM + 30 * 86400000)
  // controls: random 15m closes, same NY hour + year, ≥ 8 candles from any confirmation, not a break, ATR known
  const confI = new Set(); for (const e of events) for (let d = -8; d <= 8; d++) confI.add(e.e + d)
  const pool = new Map(); for (let i = 20; i < C.length; i++) { if (confI.has(i) || T15.breaks.has(i) || !(A[i] > 0) || C[i].close_t >= CUT) continue
    const key = new Date(C[i].close_t).getUTCFullYear() + '|' + nyHour(C[i].close_t); if (!pool.has(key)) pool.set(key, []); pool.get(key).push(i) }
  const r = rng(181018 + k), rows = []
  for (const e of ev) {
    const part = e.t0 < SPLIT ? 'TRAIN' : 'OOS', year = new Date(e.t0).getUTCFullYear(), h = nyHour(e.t0)
    const q1 = Object.fromEntries(XS.map((x) => [x, race(M, MT, e.t0, e.p0, e.dir, x, e.a)]))
    const cands = pool.get(year + '|' + h) ?? [], ctrl = []
    for (let c = 0; c < 3 && cands.length; c++) { const i = cands[Math.floor(r() * cands.length)]; ctrl.push(Object.fromEntries(XS.map((x) => [x, race(M, MT, C[i].close_t, C[i].c, e.dir, x, A[i])]))) }
    const row = { t0: e.t0, part, side: e.s.type, dir: e.dir, a: e.a, p0: e.p0, swing_t: e.s.t, swing_px: e.s.px, lag: e.e - e.s.i, leg_so_far_atr: Math.abs(e.p0 - e.s.px) / e.a, q1, ctrl, m: legMeasures(C, e) }
    if (full) {
      // context known at the confirmation close
      const n1 = k1H(e.t0), n4 = k4H(e.t0)
      row.h1 = n1 >= 0 ? (S1H[n1].type === 'L' ? 1 : -1) : 0; row.h4 = n4 >= 0 ? (S4H[n4].type === 'L' ? 1 : -1) : 0
      row.session = session(h)
      row.ladder = ladderIdx.reduce((s, idx) => { const f = flipAt(idx, e.s.type, e.s.px, C[e.s.i].t, C[e.s.i].close_t); return s + (f != null && f <= e.t0 ? 1 : 0) }, 0)
      row.usd = contextFor(ctx, e.t0 - 3600000, e.t0 + 3600000).events.some((x) => x.impact === 'high')
      // Q4 levels known at t0
      const levels = []
      if (e.prev && e.prev.type !== e.s.type && C[e.prev.knownI].close_t <= e.t0) levels.push({ type: 'prev_opposite_15m', px: e.prev.px })
      for (const [name, S, n] of [['swing_1H', S1H, n1], ['swing_4H', S4H, n4]]) if (n >= 0) { const want = e.dir > 0 ? 'H' : 'L', s2 = lastOfType(S, n, want); if (s2) levels.push({ type: name, px: s2.px }) }
      const di = lowerBound(D1T, e.t0) - 1; const yd = di >= 1 ? T1D.C[di - 1] : null          // the PREVIOUS completed New York day
      if (yd && yd.close_t <= e.t0) levels.push({ type: 'prev_day_extreme', px: e.dir > 0 ? yd.h : yd.l })
      for (const step of [10, 50]) levels.push({ type: `round_${step}`, px: e.dir > 0 ? Math.ceil((e.p0 + 1e-9) / step) * step : Math.floor((e.p0 - 1e-9) / step) * step })
      row.q4 = levelHits(e, levels, 7000 + e.n)
    }
    rows.push(row)
  }
  return rows
}

const pct = (k, n) => (n ? +(k / n).toFixed(4) : null)
function q1Table(rows, x, side) {
  const out = {}
  for (const part of ['TRAIN', 'OOS']) { const R = rows.filter((r) => r.part === part && (!side || r.side === side) && r.q1[x] != null)
    let ck = 0, cn = 0; for (const r of R) for (const c of r.ctrl) if (c[x] != null) { cn++; if (c[x]) ck++ }
    const k = R.filter((r) => r.q1[x]).length, w = wilson(k, R.length)
    out[part] = { n: R.length, cont: pct(k, R.length), cont_lb: w.lo != null ? +w.lo.toFixed(4) : null, ctrl_n: cn, ctrl: pct(ck, cn), unresolved: rows.filter((r) => r.part === part && (!side || r.side === side) && r.q1[x] == null).length, ...compareRates(k, R.length, ck, cn) }
    if (part === 'OOS') { const items = R.filter((r) => r.ctrl.some((c) => c[x] != null)).map((r) => { const cs = r.ctrl.filter((c) => c[x] != null); return { t: r.t0, x: (r.q1[x] ? 1 : 0) - cs.filter((c) => c[x]).length / cs.length } })
      out.boot = blockBootstrapMean(items, { level: 1 - 2 * ALPHA / 6, seed: 11 }) } }
  return out
}
const claimQ1 = (t) => t.OOS.holm_pass && t.OOS.cont_lb > t.OOS.ctrl && t.TRAIN.cont > t.TRAIN.ctrl && t.boot.lo > 0

const main = analyse(3, true); log(`k=3: ${main.length.toLocaleString()} events (${main.filter((r) => r.part === 'OOS').length.toLocaleString()} OOS)`)
const res = { at: new Date().toISOString(), spec: 'docs/SWING_NEXTMOVE_15M_SPEC.md', window: [new Date(FROM).toISOString(), new Date(CUT).toISOString()], split: new Date(SPLIT).toISOString(),
  events: { k3: main.length, train: main.filter((r) => r.part === 'TRAIN').length, oos: main.filter((r) => r.part === 'OOS').length }, q1: {}, q2: {}, q3: {}, q4: {}, splits: {}, robustness: {} }
// Q1
const q1rows = []; for (const x of XS) for (const side of ['L', 'H']) { const t = q1Table(main, x, side); res.q1[`${x}|${side}`] = t; q1rows.push({ key: `${x}|${side}`, p: t.OOS.p, t }) }
holm(q1rows, ALPHA); for (const r of q1rows) { r.t.OOS.holm_pass = r.holm_pass; r.t.OOS.p_holm = r.p_holm; r.t.claim = claimQ1(r.t) }
for (const x of XS) res.q1[`${x}|both`] = q1Table(main, x, null)
// Q2 + Q3
const withNext = main.filter((r) => r.m)
for (const meas of ['full_atr', 'full_usd', 'rem_atr', 'rem_usd', 'adv_atr', 'adv_usd', 'bars_to_extreme', 'bars_to_confirm']) {
  const o = {}; for (const side of ['both', 'L', 'H']) { o[side] = {}; for (const part of ['TRAIN', 'OOS']) o[side][part] = quant(withNext.filter((r) => r.part === part && (side === 'both' || r.side === side)).map((r) => r.m[meas])) }
  o.stable = o.both.OOS && o.both.TRAIN ? o.both.OOS.p50 >= o.both.TRAIN.p25 && o.both.OOS.p50 <= o.both.TRAIN.p75 : null
  o.by_year = {}; for (const y of [...new Set(withNext.map((r) => new Date(r.t0).getUTCFullYear()))]) o.by_year[y] = quant(withNext.filter((r) => new Date(r.t0).getUTCFullYear() === y).map((r) => r.m[meas]), [0.5])?.p50
  ;(meas.startsWith('bars') ? res.q3 : res.q2)[meas] = o }
res.q3.hazard = {}; for (const part of ['TRAIN', 'OOS']) { const b = withNext.filter((r) => r.part === part).map((r) => r.m.bars_to_extreme), hz = []
  for (let n = 1; n <= 96; n++) { const atRisk = b.filter((v) => v >= n).length; hz.push(atRisk ? +(b.filter((v) => v === n).length / atRisk).toFixed(4) : null) } res.q3.hazard[part] = hz }
// Q4
const q4rows = []
for (const type of ['prev_opposite_15m', 'swing_1H', 'swing_4H', 'prev_day_extreme', 'round_10', 'round_50']) { const t = {}
  for (const part of ['TRAIN', 'OOS']) { const H = main.filter((r) => r.part === part).flatMap((r) => (r.q4 ?? []).filter((q) => q.type === type && q.hit != null))
    const k = H.filter((q) => q.hit).length, c = H.filter((q) => q.ctrl).length, w = wilson(k, H.length)
    t[part] = { n: H.length, hit: pct(k, H.length), hit_lb: w.lo != null ? +w.lo.toFixed(4) : null, ctrl: pct(c, H.length), ratio: c ? +((k / H.length) / (c / H.length)).toFixed(3) : null, ...compareRates(k, H.length, c, H.length) } }
  res.q4[type] = t; q4rows.push({ key: type, p: t.OOS.p, t }) }
holm(q4rows, ALPHA); for (const r of q4rows) { r.t.OOS.holm_pass = r.holm_pass; r.t.claim = r.holm_pass && r.t.OOS.hit_lb > r.t.OOS.ctrl && r.t.TRAIN.hit > r.t.TRAIN.ctrl && r.t.OOS.n >= 100 }
// ADDENDUM A (written after the first run, before these numbers): DISTANCE-MATCHED placebo — the same level distance d tested against the
// remaining move of a random OTHER event (same side, same part), 5 draws; plus the plain round-number test vs a uniform position in the band
{ const rp = rng(424242), plRows = []
  res.q4_addendum_a = { placebo: {}, round_uniform: {} }
  for (const type of Object.keys(res.q4)) { const t = {}
    for (const part of ['TRAIN', 'OOS']) { let k = 0, n = 0, pk = 0, pn = 0
      for (const side of ['L', 'H']) { const R = main.filter((r) => r.part === part && r.side === side && r.m), pool = R.map((r) => r.m.rem_atr)
        for (const r of R) for (const q of r.q4 ?? []) { if (q.type !== type || q.hit == null) continue; n++; if (q.hit) k++
          for (let s = 0; s < 5; s++) { const rem = pool[Math.floor(rp() * pool.length)]; pn++; if (Math.abs(rem - q.d) <= 0.25) pk++ } } }
      const w = wilson(k, n); t[part] = { n, hit: pct(k, n), hit_lb: w.lo != null ? +w.lo.toFixed(4) : null, placebo: pct(pk, pn), placebo_trials: pn, ...compareRates(k, n, pk, pn) } }
    res.q4_addendum_a.placebo[type] = t; plRows.push({ key: type, p: t.OOS.p, t }) }
  holm(plRows, ALPHA); for (const r of plRows) { r.t.OOS.holm_pass = r.holm_pass; r.t.robust = !!(r.holm_pass && r.t.OOS.hit_lb > r.t.OOS.placebo && r.t.TRAIN.hit > r.t.TRAIN.placebo && r.t.OOS.n >= 100 && r.t.OOS.diff > 0) }
  for (const step of [10, 50]) { const o = {}
    for (const part of ['TRAIN', 'OOS']) { const R = main.filter((r) => r.part === part && r.m), ev2 = R.map((r) => { const px = r.swing_px + 0, nx = r.p0 + r.m.rem_atr * r.a * r.dir, dist = Math.abs(nx - Math.round(nx / step) * step); return { hit: dist <= 0.25 * r.a, exp: Math.min(1, 0.5 * r.a / step) } })
      const k = ev2.filter((x) => x.hit).length, ex = ev2.reduce((s, x) => s + x.exp, 0), w = wilson(k, ev2.length)
      o[part] = { n: ev2.length, observed: pct(k, ev2.length), observed_lb: w.lo != null ? +w.lo.toFixed(4) : null, expected_uniform: +(ex / ev2.length).toFixed(4) } }
    res.q4_addendum_a.round_uniform[`round_${step}`] = o }
  res.q4_addendum_a.robust = plRows.filter((r) => r.t.robust).map((r) => r.key) }
// splits (Q1 at X = 1, both sides; the leg's direction is what "with / against" refers to)
const splitDefs = { h1_with_leg: (r) => (r.h1 === r.dir ? 'with' : r.h1 === -r.dir ? 'against' : 'unknown'), h4_with_leg: (r) => (r.h4 === r.dir ? 'with' : r.h4 === -r.dir ? 'against' : 'unknown'),
  ladder_flipped: (r) => String(r.ladder), session: (r) => r.session, lag: (r) => (r.lag <= 1 ? '1' : r.lag <= 3 ? '2-3' : r.lag <= 7 ? '4-7' : '8+'),
  leg_so_far: (r) => (r.leg_so_far_atr < 3.5 ? '<3.5' : r.leg_so_far_atr < 4.5 ? '3.5-4.5' : '≥4.5'), usd_release_60m: (r) => (r.usd ? 'yes' : 'no') }
const splitRows = []
for (const [name, f] of Object.entries(splitDefs)) { res.splits[name] = {}
  for (const v of [...new Set(main.map(f))].sort()) { const sub = main.filter((r) => f(r) === v), t = q1Table(sub, 1, null)
    t.rem_atr_median = { TRAIN: quant(sub.filter((r) => r.m && r.part === 'TRAIN').map((r) => r.m.rem_atr), [0.5])?.p50 ?? null, OOS: quant(sub.filter((r) => r.m && r.part === 'OOS').map((r) => r.m.rem_atr), [0.5])?.p50 ?? null }
    res.splits[name][v] = t; splitRows.push({ key: `${name}=${v}`, p: t.OOS.n >= 100 ? t.OOS.p : null, t }) } }
holm(splitRows, ALPHA); for (const r of splitRows) { r.t.OOS.holm_pass = r.holm_pass; r.t.claim = r.holm_pass && r.t.OOS.cont_lb > r.t.OOS.ctrl && r.t.TRAIN.cont > r.t.TRAIN.ctrl && r.t.boot.lo > 0 }
log('k=3 analysed')
// robustness: k = 2 and k = 5 must keep the headline signs
for (const k of [2, 5]) { const rows = analyse(k, false), o = { events: rows.length, q1: {}, q2_rem_median: {} }
  for (const side of ['L', 'H']) { const t = q1Table(rows, 1, side); o.q1[side] = { oos_diff: t.OOS.diff, train_diff: t.TRAIN.diff, same_sign_as_k3: Math.sign(t.OOS.diff) === Math.sign(res.q1[`1|${side}`].OOS.diff) } }
  for (const part of ['TRAIN', 'OOS']) o.q2_rem_median[part] = quant(rows.filter((r) => r.m && r.part === part).map((r) => r.m.rem_atr), [0.5])?.p50
  res.robustness[`k${k}`] = o; log(`k=${k}: ${rows.length.toLocaleString()} events`) }
res.claims = { q1: Object.entries(res.q1).filter(([, t]) => t.claim).map(([k]) => k), q4: Object.entries(res.q4).filter(([, t]) => t.claim).map(([k]) => k), q4_robust_addendum_a: res.q4_addendum_a.robust, splits: splitRows.filter((r) => r.t.claim).map((r) => r.key) }
fs.writeFileSync(path.join(TURBO.master, 'swing_nextmove_15m.json'), JSON.stringify(res, null, 1))
// every event row (the book: record EVERYTHING)
const dir = path.join(TURBO.root, 'docs', 'swing_book', 'nextmove15m'); fs.mkdirSync(dir, { recursive: true })
const H = ['t0_utc', 'part', 'side', 'swing_utc', 'swing_px', 'confirm_close', 'atr', 'lag_bars', 'leg_so_far_atr', 'race_0.5', 'race_1', 'race_2', 'full_atr', 'rem_atr', 'rem_usd', 'adv_atr', 'bars_to_extreme', 'bars_to_confirm', 'h1', 'h4', 'session', 'ladder_flipped', 'usd_release_60m', 'q4_hits']
const csv = [H.join(',')].concat(main.map((r) => [new Date(r.t0).toISOString(), r.part, r.side, new Date(r.swing_t).toISOString(), r.swing_px, r.p0, r.a.toFixed(4), r.lag, r.leg_so_far_atr.toFixed(3), r.q1[0.5], r.q1[1], r.q1[2],
  r.m?.full_atr?.toFixed(3) ?? '', r.m?.rem_atr?.toFixed(3) ?? '', r.m?.rem_usd?.toFixed(2) ?? '', r.m?.adv_atr?.toFixed(3) ?? '', r.m?.bars_to_extreme ?? '', r.m?.bars_to_confirm ?? '', r.h1, r.h4, r.session, r.ladder, r.usd,
  (r.q4 ?? []).filter((q) => q.hit).map((q) => q.type).join('|')].join(',')))
fs.writeFileSync(path.join(dir, 'events_k3.csv'), csv.join('\n') + '\n')
log(`written · claims: Q1 ${res.claims.q1.join(', ') || 'none'} · Q4 ${res.claims.q4.join(', ') || 'none'} · splits ${res.claims.splits.join(', ') || 'none'}`)
