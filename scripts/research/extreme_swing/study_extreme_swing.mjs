// study_extreme_swing.mjs — EXTREME SWING spec §6 steps 2-3 (docs/research/extreme_swing/2026-11-01_EXTREME_SWING_SPEC.md, addenda A + B,
// all written before any number; Ashraf 2026-11-01: "where is this move going to end … look the big whales where they are positioning").
// A leg catalog · B where legs ended vs the path's own control · C positioning / flows at ends vs inside legs · D exhaustion signs · E pullbacks.
// READ-ONLY research: no trade rule, nothing live. → data/research/extreme_swing/2026-11-01_extreme_swing.json + legs.jsonl
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'
import { clean1m, kit, raw1m } from '../../lib/series_1m.mjs'
import { loadBars } from '../../../src/data/backfillReader.js'
import { findHoles, markIncomplete } from '../../../src/core/dataHoles.js'
import { zigzag } from '../../../src/master/swings.js'
import { atr as atrArr, rsi as rsiArr, sma as smaArr } from '../../../src/core/indicators.js'
import { normCdf, holm, rng, blockBootstrapMean } from '../../../src/core/studyStats.js'
import { MODERN, r2, mkLegs, makeDFeat, rate } from './extreme_lib.mjs'

const DAY = 86400000, ES = path.join(TURBO.root, 'data', 'research', 'extreme_swing'), RAW = path.join(ES, 'raw'), IN = path.join(ES, 'inputs')
const TRAIN_END = MODERN, FUT_FROM = Date.parse('2024-10-09T00:00:00Z'), NCTRL = 200, NSHUF = 1000
const iso = (t) => (t == null ? null : new Date(t).toISOString().replace('.000Z', 'Z'))
const q = (arr, p) => { const s = arr.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const k = (s.length - 1) * p, lo = Math.floor(k); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (k - lo) }
const last = (A, cut, key) => { let lo = 0, hi = A.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (key(A[m]) <= cut) { r = m; lo = m + 1 } else hi = m - 1 } return r }
const audit = { known_violations: 0 }

// ── candles + swings (addendum B.1) ──
const M = await clean1m('XAUUSD'), KT = kit('XAUUSD'), holes = findHoles(M)
const build = (tf) => { const C = KT.build(M, tf); markIncomplete(C, holes); return { C, breaks: new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)) } }
const { C: W, breaks: bW } = build('1W'), { C: D, breaks: bD } = build('1D')
const AW = atrArr(W, 14), AD = atrArr(D, 14), RW = rsiArr(W, 14), SW20 = smaArr(W, 20)
const SWW = zigzag(W, { k: 3, breaks: bW }).swings, SWD = zigzag(D, { k: 3, breaks: bD }).swings
console.log(`weekly ${W.length} candles, ${SWW.length} pivots · daily ${D.length} candles, ${SWD.length} pivots · last minute ${iso(M.at(-1).t)}`)

// ── audit: pivots = the published 1W table (addendum B.2) ──
{ const L = fs.readFileSync(path.join(TURBO.root, 'docs', 'swing_book', 'xau_1y_swings', '1W.csv'), 'utf8').trim().split(/\r?\n/), H = L[0].split(',')
  const rows = L.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [H[i], v])))
  const from = Date.parse(rows[0].candle_open), to = Date.parse(rows.at(-1).confirmed_at)
  const mine = SWW.filter((s) => s.t >= from && W[s.knownI].close_t <= to + 60000).map((s) => `${s.type === 'H' ? 'HIGH' : 'LOW'}|${iso(s.t)}|${s.px.toFixed(2)}`)
  const pub = rows.map((r) => `${r.type}|${r.candle_open}|${(+r.price).toFixed(2)}`)
  audit.pivots_vs_published_1W = { published: pub.length, rebuilt: mine.length, equal: mine.join() === pub.join(), only_published: pub.filter((x) => !mine.includes(x)), only_rebuilt: mine.filter((x) => !pub.includes(x)) }
  console.log('PIVOT AUDIT', JSON.stringify(audit.pivots_vs_published_1W)) }

// ── legs (addendum B.3) ──
const legs = mkLegs(SWW, W, bW, AW), legsD = mkLegs(SWD, D, bD, AD)
const robust = legsD.filter((l) => l.sizeAtr >= 10)
console.log(`weekly legs ${legs.length} (MODERN ${legs.filter((l) => l.era === 'MODERN').length}) · robust 1D legs ${robust.length}`)

// ── C inputs (addendum B.8) ──
const jl = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const COT = jl(path.join(IN, 'cot_gold_088691.jsonl')).filter((r) => r.known_t).sort((a, b) => a.known_t - b.known_t)
const GLD = jl(path.join(IN, 'gld_holdings.jsonl')).sort((a, b) => a.known_t - b.known_t)
const GPR = jl(path.join(IN, 'gpr_daily.jsonl')).map((r) => ({ ...r, known_t: Date.parse(r.date + 'T00:00:00Z') + DAY })).sort((a, b) => a.known_t - b.known_t)
const fred = async (id, file) => { if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, await (await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=2012-01-01`)).text()) }
  return JSON.parse(fs.readFileSync(file, 'utf8')).observations.filter((o) => o.value !== '.').map((o) => ({ date: o.date, known_t: Date.parse(o.date + 'T00:00:00Z') + DAY, v: +o.value })) }
const DF = await fred('DFII10', path.join(TURBO.root, 'data', 'research', 'down_day', 'raw', 'DFII10.json')), VIX = await fred('VIXCLS', path.join(RAW, 'VIXCLS.json'))
const DX = (await raw1m('DXY')).map((b) => ({ known_t: b.t + 60000, c: b.c }))
const chk = (rec, cut) => { if (rec && rec.known_t > cut) audit.known_violations++; return rec }
const ITEMS = {
  C1_cot_mm_net_pct3y: (cut) => { const k = last(COT, cut, (r) => r.known_t); if (k < 0) return null; const r = chk(COT[k], cut); if (cut - Date.parse(r.report_date + 'T00:00:00Z') > 21 * DAY) return null
    const win = COT.slice(Math.max(0, k - 155), k + 1); if (win.length < 104) return null; return win.filter((x) => x.mm_net <= r.mm_net).length / win.length },
  C2_gld_tonnes_chg4w_pct: (cut) => { const a = last(GLD, cut, (r) => r.known_t), b = last(GLD, cut - 28 * DAY, (r) => r.known_t); if (a < 0 || b < 0) return null; chk(GLD[a], cut); return (GLD[a].tonnes / GLD[b].tonnes - 1) * 100 },
  C3_dfii10_chg4w: (cut) => { const a = last(DF, cut, (r) => r.known_t), b = last(DF, cut - 28 * DAY, (r) => r.known_t); if (a < 0 || b < 0) return null; chk(DF[a], cut); return DF[a].v - DF[b].v },
  C4_dxy_chg4w_pct: (cut) => { const a = last(DX, cut, (r) => r.known_t), b = last(DX, cut - 28 * DAY, (r) => r.known_t); if (a < 0 || b < 0 || cut - DX[a].known_t > 4 * DAY) return null; chk(DX[a], cut); return (DX[a].c / DX[b].c - 1) * 100 },
  C5_vix_level: (cut) => { const a = last(VIX, cut, (r) => r.known_t); if (a < 0) return null; return chk(VIX[a], cut).v },
  C6_gpr_7d_mean: (cut) => { const a = last(GPR, cut, (r) => r.known_t); if (a < 6) return null; chk(GPR[a], cut); let s = 0; for (let k = a - 6; k <= a; k++) s += GPR[k].gprd; return s / 7 },
}
const valuesAt = (cut) => Object.fromEntries(Object.entries(ITEMS).map(([k, f]) => [k, f(cut)]))
const weekVals = W.map((w) => valuesAt(w.close_t))

// ── B candidates (addendum B.3-B.6) ──
const pivK = [...SWW.map((s) => ({ px: s.px, known: W[s.knownI].close_t })), ...SWD.map((s) => ({ px: s.px, known: D[s.knownI].close_t }))].sort((a, b) => a.known - b.known)
let FUT = null
const futures = async () => { if (FUT) return FUT
  const spot = new Map(); for (const b of M) if (b.t >= FUT_FROM) spot.set(b.t, b.c)
  FUT = []; for (const b of (await loadBars('GOLD_FUT', '1m', { from: FUT_FROM })).bars) { const s = spot.get(b.t); if (s != null && b.v > 0) FUT.push({ t: b.t, px: s, v: b.v }) }
  return FUT }
const nearest = (sorted, x) => { if (!sorted.length) return Infinity; let lo = 0, hi = sorted.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < x) lo = m + 1; else hi = m }
  let d = Math.abs(sorted[lo] - x); if (lo > 0) d = Math.min(d, Math.abs(sorted[lo - 1] - x)); return d }
async function candidates(leg, prev, C, cut, atrRef) {
  const out = {}
  out.B2_prior_pivots = pivK.filter((p) => p.known <= cut).map((p) => p.px)
  const lo = Math.min(leg.sPx, leg.ePx) - 20 * atrRef, hi = Math.max(leg.sPx, leg.ePx) + 20 * atrRef, R = []; for (let x = Math.ceil(lo / 100) * 100; x <= hi; x += 100) R.push(x); out.B3_round_100 = R
  out.B4_retrace_prev_leg = prev && prev.ei === leg.si && prev.endKnownT <= cut ? [0.382, 0.5, 0.618].map((f) => prev.ePx - f * (prev.ePx - prev.sPx)) : null
  if (C === W) { const di = last(D, cut - 1, (d) => d.t); const from = di >= 60 ? D[di - 59].t : -Infinity
    if (from >= FUT_FROM) { const F = await futures(), bw = 0.05 * atrRef, vol = new Map()
      for (const m of F) if (m.t >= from && m.t < cut) { const k = Math.floor(m.px / bw); vol.set(k, (vol.get(k) || 0) + m.v) }
      const bins = [...vol].sort((a, b) => b[1] - a[1]), top = bins.slice(0, Math.max(1, Math.ceil(bins.length * 0.05)))
      out.B1_volume_nodes = top.map(([k]) => (k + 0.5) * bw) } else out.B1_volume_nodes = null }
  for (const k of Object.keys(out)) if (out[k]) out[k] = out[k].slice().sort((a, b) => a - b)
  return out }
const ctrlPrices = (leg, seed) => { const r = rng(seed), d = leg.ePx - leg.sPx, P = []; for (let j = 0; j < NCTRL; j++) P.push(leg.sPx + r() * 0.9 * d); return P }
const pctile = (dEnd, dC) => { let k = 0; for (const x of dC) k += x < dEnd ? 1 : x === dEnd ? 0.5 : 0; return k / dC.length }

async function testB(L, C, A, label) {
  const rows = []
  for (let j = 0; j < L.length; j++) { const leg = L[j], prev = j > 0 ? L[j - 1] : null, cut = C[leg.ei].t, atrRef = A[leg.ei - 1]; if (!atrRef) continue
    const cand = await candidates(leg, prev, C, cut, atrRef), P = ctrlPrices(leg, 1000 + j), row = { leg: j, t: leg.eT, era: leg.era, atrRef, sets: {} }
    for (const [set, S] of Object.entries(cand)) { if (!S || !S.length) continue
      const dC = P.map((x) => nearest(S, x) / atrRef), dE = nearest(S, leg.ePx) / atrRef
      row.sets[set] = { S, dC, dE, pct: pctile(dE, dC), P } }
    rows.push(row) }
  const cell = (set, era) => { const R = rows.filter((r) => r.sets[set] && (era === 'ALL' || r.era === era)), x = R.map((r) => r.sets[set].pct), n = x.length
    if (!n) return { n: 0 }
    const mean = x.reduce((a, b) => a + b, 0) / n, p = normCdf((mean - 0.5) / Math.sqrt(1 / (12 * n))), bs = blockBootstrapMean(R.map((r) => ({ t: r.t, x: r.sets[set].pct })))
    const old = R.filter((r) => r.era === 'OLD').map((r) => r.sets[set].pct), mod = R.filter((r) => r.era === 'MODERN').map((r) => r.sets[set].pct), m = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null)
    return { n, mean_pct: r2(mean, 3), p: +p.toPrecision(3), ub95: r2(bs.hi, 3), median_dist_end_atr: r2(q(R.map((r) => r.sets[set].dE), 0.5), 3), median_dist_ctrl_atr: r2(q(R.flatMap((r) => r.sets[set].dC), 0.5), 3),
      era_2013_2019: { n: old.length, mean_pct: r2(m(old), 3) }, era_2020_on: { n: mod.length, mean_pct: r2(m(mod), 3) },
      era_dependent: old.length && mod.length ? (m(old) < 0.5) !== (m(mod) < 0.5) : null } }
  // audits (addendum B.7) on ALL legs, per set
  const audits = {}
  for (const set of ['B1_volume_nodes', 'B2_prior_pivots', 'B3_round_100', 'B4_retrace_prev_leg']) { const R = rows.filter((r) => r.sets[set]); const n = R.length; if (n < 2) continue
    const passes = (vals) => { const mean = vals.reduce((a, b) => a + b, 0) / n; return mean < 0.5 && normCdf((mean - 0.5) / Math.sqrt(1 / (12 * n))) < 0.05 }
    const r = rng(77); let shufPass = 0, placPass = 0, shufZero = 0   // post-hoc diagnostic (after run 1 VOID): share of shuffled ends sitting exactly on a candidate
    for (let s = 0; s < NSHUF; s++) { const perm = R.map((_, i) => i); for (let i = n - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [perm[i], perm[k]] = [perm[k], perm[i]] }
      const endPx = perm.map((k) => L[R[k].leg].ePx); R.forEach((x, i) => { if (nearest(x.sets[set].S, endPx[i]) < 1e-9) shufZero++ })
      if (passes(R.map((x, i) => pctile(nearest(x.sets[set].S, endPx[i]) / x.atrRef, x.sets[set].dC)))) shufPass++
      if (passes(R.map((x) => { const leg = L[x.leg], px = leg.sPx + r() * 0.9 * (leg.ePx - leg.sPx); return pctile(nearest(x.sets[set].S, px) / x.atrRef, x.sets[set].dC) }))) placPass++ }
    audits[set] = { n, shuffle_pass_rate: shufPass / NSHUF, placebo_pass_rate: placPass / NSHUF, void: shufPass / NSHUF > 0.05 || placPass / NSHUF > 0.05,
      diag_shuffled_end_exactly_on_candidate: r2(shufZero / (NSHUF * n), 3), diag_real_end_exactly_on_candidate: r2(R.filter((x) => x.sets[set].dE < 1e-9).length / n, 3) } }
  const cells = {}; for (const set of ['B1_volume_nodes', 'B2_prior_pivots', 'B3_round_100', 'B4_retrace_prev_leg']) for (const era of ['ALL', 'MODERN']) cells[`${set}|${era}`] = cell(set, era)
  console.log(label, JSON.stringify(Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, [c.n, c.mean_pct, c.p]]))), 'AUDITS', JSON.stringify(audits))
  return { cells, audits, rows } }

const B = await testB(legs, W, AW, 'B weekly')
const BR = await testB(robust, D, AD, 'B robust 1D')

// ── C + D: ends vs in-leg weeks (addendum B.8-B.9) ──
const thr = {}; for (const k of Object.keys(ITEMS)) { const v = W.map((w, i) => (w.close_t < TRAIN_END ? weekVals[i][k] : null)).filter((x) => x != null && Number.isFinite(x)); thr[k] = { n_train_weeks: v.length, p05: q(v, 0.05), p95: q(v, 0.95) } }
const isExt = (k, v) => (v == null || !Number.isFinite(v) ? null : v <= thr[k].p05 ? 'LOW' : v >= thr[k].p95 ? 'HIGH' : '')
const dFeat = makeDFeat({ W, AW, RW, SW20 })
const WK = []   // one row per (leg, week): end or in-leg control
for (const leg of legs) for (let w = leg.si + 1; w <= leg.ei; w++) WK.push({ leg, w, end: w === leg.ei, era: leg.era, vals: weekVals[w], feat: dFeat(leg, w) })
const CD = { C: {}, D: {} }
for (const k of Object.keys(ITEMS)) { const g = (r) => { const e = isExt(k, r.vals[k]); return e == null ? null : e !== '' }
  CD.C[k] = { ALL: rate(WK, k, g), MODERN: rate(WK.filter((r) => r.era === 'MODERN'), k, g), OLD: rate(WK.filter((r) => r.era === 'OLD'), k, g), threshold: thr[k],
    tails_at_ends: ['tops', 'bottoms'].map((side) => { const E = WK.filter((r) => r.end && (side === 'tops' ? r.leg.dir > 0 : r.leg.dir < 0)); return { side, n: E.length, HIGH: E.filter((r) => isExt(k, r.vals[k]) === 'HIGH').length, LOW: E.filter((r) => isExt(k, r.vals[k]) === 'LOW').length } }),
    median_at_tops: r2(q(WK.filter((r) => r.end && r.leg.dir > 0).map((r) => r.vals[k]), 0.5), 3), median_at_bottoms: r2(q(WK.filter((r) => r.end && r.leg.dir < 0).map((r) => r.vals[k]), 0.5), 3),
    median_in_up_legs: r2(q(WK.filter((r) => !r.end && r.leg.dir > 0).map((r) => r.vals[k]), 0.5), 3), median_in_down_legs: r2(q(WK.filter((r) => !r.end && r.leg.dir < 0).map((r) => r.vals[k]), 0.5), 3) } }
for (const k of ['D1_rsi_divergence', 'D2_vol_climax', 'D3_stretch', 'D4_run6']) { const g = (r) => (r.feat ? r.feat[k] : null)
  CD.D[k] = { ALL: rate(WK, k, g), MODERN: rate(WK.filter((r) => r.era === 'MODERN'), k, g), OLD: rate(WK.filter((r) => r.era === 'OLD'), k, g),
    // post-hoc diagnostic (after run 1 VOID; gold-measured-study §0b "built-in-by-definition"): every end week is a new in-leg extreme, so compare only with control weeks that were too
    diag_ctrl_new_extreme_weeks_only: rate(WK.filter((r) => r.feat && r.feat.newExt), k, g) } }

// ── Holm K = 18 (addendum B.13) + pass rules ──
const fam = []
for (const [k, c] of Object.entries(B.cells)) fam.push({ key: 'B:' + k, p: c.n ? c.p : null, c })
for (const [k, c] of Object.entries(CD.C)) fam.push({ key: 'C:' + k, p: c.ALL.p, c })
for (const [k, c] of Object.entries(CD.D)) fam.push({ key: 'D:' + k, p: c.ALL.p, c })
holm(fam)
const anyVoid = Object.values(B.audits).some((a) => a.void) || audit.known_violations > 0 || !audit.pivots_vs_published_1W.equal
for (const f of fam) { const isB = f.key.startsWith('B:'), c = f.c
  if (isB) { f.verdict = c.n < 30 ? 'DESCRIBED ONLY (n < 30)' : c.mean_pct < 0.5 && c.ub95 < 0.5 && f.holm_pass ? 'PASS' : 'FAIL' }
  else { const a = c.ALL; f.verdict = a.n_end < 30 ? 'DESCRIBED ONLY (n < 30)' : a.ratio > 1 && f.holm_pass ? 'PASS' : 'FAIL'
    if (c.OLD.ratio != null && c.MODERN.ratio != null && (c.OLD.ratio > 1) !== (c.MODERN.ratio > 1)) f.era_dependent = true }
  if (anyVoid) f.verdict = 'VOID (audit failed)' }

// ── E pullbacks (addendum B.10) ──
const PB = []
for (let j = 0; j < legs.length; j++) { const leg = legs[j], t0 = W[leg.si].t, t1 = W[leg.ei].close_t
  for (const p of legsD) { if (p.dir === leg.dir || p.sT < t0 || p.eT > t1 || p.eT < t0) continue
    const base = Math.abs(p.sPx - leg.sPx); if (!(base > 0)) continue
    PB.push({ leg: j, era: leg.era, depth: p.size / base, days: p.candles }) } }
const eStats = (era) => { const P = PB.filter((p) => era === 'ALL' || p.era === era), L = legs.map((_, j) => j).filter((j) => era === 'ALL' || legs[j].era === era)
  const deepest = L.map((j) => Math.max(0, ...PB.filter((p) => p.leg === j).map((p) => p.depth)))
  return { pullbacks: P.length, legs: L.length, depth_q: [0.25, 0.5, 0.75, 0.9].map((x) => r2(q(P.map((p) => p.depth), x), 3)), depth_max: r2(Math.max(...P.map((p) => p.depth)), 3), days_median: q(P.map((p) => p.days), 0.5), days_p90: q(P.map((p) => p.days), 0.9),
    per_leg_median: q(L.map((j) => PB.filter((p) => p.leg === j).length), 0.5), deepest_over_50pct: deepest.filter((d) => d > 0.5).length, deepest_over_618pct: deepest.filter((d) => d > 0.618).length } }
const E = { ALL: eStats('ALL'), MODERN: eStats('MODERN'), OLD: eStats('OLD') }

// ── A catalog + the current open leg ──
const catalog = legs.map((l, j) => ({ leg: j, dir: l.dir > 0 ? 'UP' : 'DOWN', start: iso(W[l.si].t), end: iso(W[l.ei].t), end_confirmed: iso(l.endKnownT), start_px: r2(l.sPx), end_px: r2(l.ePx), size_usd: r2(l.size), pct: r2(l.pct), size_atr: r2(l.sizeAtr), weeks: l.candles,
  max_adverse_atr: r2(l.adverseAtr), pullbacks_1d: PB.filter((p) => p.leg === j).length, era: l.era,
  at_start: Object.fromEntries(Object.entries(weekVals[l.si]).map(([k, v]) => [k, r2(v, 3)])), at_end: Object.fromEntries(Object.entries(weekVals[l.ei]).map(([k, v]) => [k, r2(v, 3)])) }))
const aStats = (era, dir) => { const L = legs.filter((l) => (era === 'ALL' || l.era === era) && (dir == null || l.dir === dir)); return { n: L.length, size_atr_q: [0.25, 0.5, 0.75, 0.9].map((x) => r2(q(L.map((l) => l.sizeAtr), x))), pct_q: [0.25, 0.5, 0.75].map((x) => r2(q(L.map((l) => Math.abs(l.pct)), x))), weeks_q: [0.25, 0.5, 0.75].map((x) => q(L.map((l) => l.candles), x)) } }
const A = Object.fromEntries(['ALL', 'MODERN', 'OLD'].flatMap((era) => [[`${era}|UP`, aStats(era, 1)], [`${era}|DOWN`, aStats(era, -1)]]))
const lp = SWW.at(-1), cdir = lp.type === 'H' ? -1 : 1; let cext = cdir > 0 ? -Infinity : Infinity, cextI = lp.i
for (let i = lp.i + 1; i < W.length; i++) if (cdir > 0 ? W[i].h > cext : W[i].l < cext) { cext = cdir > 0 ? W[i].h : W[i].l; cextI = i }
const curAtr = AW[lp.i] ?? lp.atr, curSize = Math.abs(cext - lp.px) / curAtr, same = legs.filter((l) => l.dir === cdir), bigger = same.filter((l) => l.sizeAtr >= curSize)
const current = { dir: cdir > 0 ? 'UP' : 'DOWN', from_pivot: { type: lp.type, candle: iso(lp.t), px: r2(lp.px), confirmed: iso(W[lp.knownI].close_t) }, extreme_so_far: { px: r2(cext), candle: iso(W[cextI].t) }, last_close: r2(W.at(-1).c), last_candle: iso(W.at(-1).t),
  size_atr_so_far: r2(curSize), weeks_so_far: W.length - 1 - lp.i, atr_1w_at_start: r2(curAtr), size_pctile_vs_same_dir: r2(same.filter((l) => l.sizeAtr < curSize).length / same.length, 3),
  completed_same_dir_at_least_this_big: { n: bigger.length, final_size_atr_q: [0.25, 0.5, 0.75].map((x) => r2(q(bigger.map((l) => l.sizeAtr), x))) },
  known_now: Object.fromEntries(Object.entries(valuesAt(M.at(-1).t + 60000)).map(([k, v]) => [k, r2(v, 3)])),
  last_week_d_signs: dFeat({ si: lp.i, dir: cdir }, W.length - 1) }

const out = { spec: 'docs/research/extreme_swing/2026-11-01_EXTREME_SWING_SPEC.md (+ addenda A, B)', built_at: new Date().toISOString(), data_to: iso(M.at(-1).t), audits: { ...audit, B_weekly: B.audits, B_robust_1d: BR.audits },
  counts: { weekly_candles: W.length, weekly_pivots: SWW.length, legs: legs.length, legs_modern: legs.filter((l) => l.era === 'MODERN').length, robust_1d_legs: robust.length, robust_1d_modern: robust.filter((l) => l.era === 'MODERN').length },
  A_leg_stats: A, current_open_leg: current,
  family: fam.map((f) => ({ key: f.key, p: f.p, p_holm: f.p_holm == null ? null : +f.p_holm.toPrecision(3), holm_pass: f.holm_pass, verdict: f.verdict, era_dependent: f.era_dependent ?? f.c.era_dependent ?? null })),
  B_weekly: B.cells, B_robust_1d_beside: BR.cells, C: CD.C, D: CD.D, E_pullbacks: E, catalog }
fs.writeFileSync(path.join(ES, '2026-11-01_extreme_swing.json'), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(ES, 'legs.jsonl'), catalog.map((r) => JSON.stringify(r)).join('\n') + '\n')
console.log('FAMILY', JSON.stringify(out.family.map((f) => [f.key, f.p, f.verdict])))
console.log('CURRENT', JSON.stringify(current))
console.log('AUDITS', JSON.stringify(out.audits))
