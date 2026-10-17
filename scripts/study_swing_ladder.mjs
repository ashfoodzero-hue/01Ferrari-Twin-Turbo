// ════════════════════════════════════════════════════════════════════════════════
// study_swing_ladder.mjs — Phase 3 of the swing study: the flip ladder (2026-10-17). Pre-registered: docs/SWING_LADDER_SPEC.md.
// A: the ladder on real anchor swings (which timeframes flip at the same low, delay, before-anchor share, order matrix)
// B: is a lower-timeframe flip evidence? P(real | X flipped before the anchor's outcome was known) vs the base rate, vs failed extremes
// C: DXY (opposite swing) and silver (same swing) vs gold: matching share, lead/lag of extreme and confirmation; control at failed gold extremes
// Output: data/master/swing_ladder_atlas.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { cleanForTv, buildCandles, TFS } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { compareRates, holm, wilson } from '../src/core/studyStats.js'
import { indexSwings, flipAt, nearestSwingSorted } from './lib/swing_ladder.mjs'

const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), MIN_OOS = 30
const ANCHORS = process.env.ANCHORS ? process.env.ANCHORS.split(',') : ['15m', '1H', '4H', '1D']
const DUR = { '1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30, '1H': 60, '2H': 120, '3H': 180, '4H': 240, '6H': 360, '9H': 540, '1D': 1440, '2D': 2880, '3D': 4320, '1W': 10080, '1M': 43200 }
const split = (t) => (t < SPLIT ? 'T' : 'O'), med = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[s.length >> 1] }
const q = (v, p) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
console.log('loading 1m gold, DXY, silver …')
const G = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars
const D = cleanForTv((await loadDxyBars('1m', { from: FROM, to: TO })).bars).bars, S = cleanForTv((await loadBars('XAGUSD', '1m', { from: FROM, to: TO })).bars).bars
const series = (bars, tf) => { const C = buildCandles(bars, tf); markIncomplete(C, findHoles(bars)); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); const z = zigzag(C, { k: 3, breaks }); return { C, ...z } }
// gold swings on all 16 timeframes (index for the exact-price match)
const GX = {}; for (const tf of TFS) { const s = series(G, tf); GX[tf] = { ...s, idx: indexSwings(s.C, s.swings) }; console.log(`  gold ${tf}: ${s.swings.length} swings`) }
const res = { at: new Date().toISOString(), spec: 'docs/SWING_LADDER_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const A of ANCHORS) {
  const { C, swings, failed } = GX[A], c1 = failed.filter((f) => f.pullback_atr >= 1), lower = TFS.filter((x) => DUR[x] < DUR[A])
  const DX = series(D, A), SV = series(S, A), dxBy = new Map(DX.C.map((c, k) => [c.t, k])), svBy = new Map(SV.C.map((c, k) => [c.t, k]))
  const out = { anchor: A, sides: {} }
  for (const side of ['L', 'H']) {
    // candidates: real swings (cutoff = anchor confirmation close) + failed extremes (cutoff = the open of the breaking candle)
    const cands = [...swings.filter((s) => s.type === side).map((s) => ({ real: true, i: s.i, px: s.px, cut: C[s.knownI]?.close_t, conf: C[s.knownI]?.close_t })),
      ...c1.filter((f) => f.type === side).map((f) => ({ real: false, i: f.i, px: f.px, cut: C[f.supersededI]?.t }))].filter((x) => x.cut != null)
    for (const x of cands) { x.t0 = C[x.i].t; x.a1 = C[x.i].close_t; x.sp = split(x.t0); x.flip = {}
      for (const X of TFS) { const f = flipAt(GX[X].idx, side, x.px, x.t0, x.a1); if (f != null) x.flip[X] = f } }
    // A — the ladder on real swings
    const real = cands.filter((x) => x.real), ladder = {}
    for (const X of TFS) { const row = { T: {}, O: {} }
      for (const sp of ['T', 'O']) { const R = real.filter((x) => x.sp === sp), got = R.filter((x) => x.flip[X] != null)
        const delay = got.map((x) => (x.flip[X] - x.a1) / 60000), rel = got.map((x) => (x.flip[X] - x.conf) / 60000)
        row[sp] = { n: R.length, flipped: got.length, share: R.length ? got.length / R.length : null, delay_min_median: med(delay), delay_min_q1: q(delay, 0.25), delay_min_q3: q(delay, 0.75),
          vs_anchor_conf_min_median: med(rel), before_anchor_share: got.length ? got.filter((x) => x.flip[X] < x.conf).length / got.length : null } }
      row.flag = row.T.share != null && row.O.share != null && Math.abs(row.T.share - row.O.share) > 0.1 ? 'PERIODS DIFFER > 10 pt' : ''
      ladder[X] = row }
    // order matrix (all data): for X < Y both flipped, share X first
    const order = {}; for (let a = 0; a < TFS.length; a++) for (let b = a + 1; b < TFS.length; b++) { const X = TFS[a], Y = TFS[b]; let both = 0, xFirst = 0, tie = 0
      for (const x of real) if (x.flip[X] != null && x.flip[Y] != null) { both++; if (x.flip[X] < x.flip[Y]) xFirst++; else if (x.flip[X] === x.flip[Y]) tie++ }
      if (both) order[`${X}<${Y}`] = { both, x_first: xFirst / both, tie: tie / both } }
    // B — evidence: P(real | X flipped before the outcome was known) vs not
    const flippedBefore = (x, X) => x.flip[X] != null && x.flip[X] < x.cut
    const evid = []; const tests = [...lower.map((X) => [X]), ...lower.slice(0, -1).map((X, k) => [X, lower[k + 1]])]
    for (const set of tests) { const key = set.join('+'), row = { key, T: {}, O: {} }
      for (const sp of ['T', 'O']) { const P = cands.filter((x) => x.sp === sp), yes = P.filter((x) => set.every((X) => flippedBefore(x, X))), no = P.filter((x) => !set.every((X) => flippedBefore(x, X)))
        const ry = yes.filter((x) => x.real).length, rn = no.filter((x) => x.real).length, rAll = P.filter((x) => x.real).length, cmp = compareRates(ry, yes.length, rn, no.length), wl = wilson(ry, yes.length)
        const lead = yes.filter((x) => x.real).map((x) => (x.conf - Math.max(...set.map((X) => x.flip[X]))) / 60000)
        row[sp] = { candidates: P.length, base: P.length ? rAll / P.length : null, n_flipped: yes.length, p_real_given_flip: yes.length ? ry / yes.length : null, wilson_lo: wl.lo, p_real_not_flipped: no.length ? rn / no.length : null, p: cmp.p, lead_min_median: med(lead) } }
      row.lift = row.O.p_real_given_flip != null && row.O.base != null ? row.O.p_real_given_flip - row.O.base : null; row.p = row.O.p; evid.push(row) }
    holm(evid)
    for (const r of evid) { const o = r.O, t = r.T
      r.verdict = (o.n_flipped ?? 0) < MIN_OOS ? 'DESCRIBED_ONLY' : r.holm_pass && o.wilson_lo > o.base && t.p_real_given_flip != null && t.base != null && Math.sign(t.p_real_given_flip - t.base) === Math.sign(r.lift) && r.lift > 0 ? 'FINDING'
        : r.holm_pass && r.lift < 0 && t.p_real_given_flip != null && t.p_real_given_flip < t.base ? 'FINDING (LOWERS the odds)' : r.holm_pass ? 'INCONSISTENT' : 'NO_EVIDENCE' }
    // C — DXY (opposite swing) and silver (same swing), within ±3 anchor candles; control at failed gold extremes
    const dSwings = DX.swings.slice().sort((a, b) => a.i - b.i), sSwings = SV.swings.slice().sort((a, b) => a.i - b.i), opp = side === 'L' ? 'H' : 'L'
    const cross = {}; for (const [name, CC, SS, by, typ] of [['DXY', DX.C, dSwings, dxBy, opp], ['silver', SV.C, sSwings, svBy, side]]) { const row = {}
      for (const grp of ['real', 'failed']) for (const sp of ['T', 'O']) { const P = cands.filter((x) => x.real === (grp === 'real') && x.sp === sp), hits = []
        for (const x of P) { const m = nearestSwingSorted(CC, SS, by, typ, x.t0, 3); if (m) hits.push({ d: m.dCandles, confLead: grp === 'real' && m.flipT != null ? (x.conf - m.flipT) / 60000 : null }) }
        row[`${grp}_${sp}`] = { n: P.length, matched: hits.length, share: P.length ? hits.length / P.length : null, extreme_lead_candles_median: med(hits.map((h) => -h.d)), extreme_earlier_share: hits.length ? hits.filter((h) => h.d < 0).length / hits.length : null, extreme_same_candle_share: hits.length ? hits.filter((h) => h.d === 0).length / hits.length : null,
          confirm_lead_min_median: med(hits.map((h) => h.confLead).filter((v) => v != null)), confirm_earlier_share: hits.filter((h) => h.confLead != null).length ? hits.filter((h) => h.confLead > 0).length / hits.filter((h) => h.confLead != null).length : null } }
      cross[name] = row }
    out.sides[side] = { real_swings: { T: real.filter((x) => x.sp === 'T').length, O: real.filter((x) => x.sp === 'O').length }, failed: { T: cands.filter((x) => !x.real && x.sp === 'T').length, O: cands.filter((x) => !x.real && x.sp === 'O').length }, ladder, order, evidence: evid, cross } }
  res.anchors[A] = out
  const e = out.sides.L.evidence.filter((r) => r.verdict.startsWith('FINDING')).length + out.sides.H.evidence.filter((r) => r.verdict.startsWith('FINDING')).length
  console.log(`${A}: real lows ${out.sides.L.real_swings.T}+${out.sides.L.real_swings.O} · failed lows ${out.sides.L.failed.T}+${out.sides.L.failed.O} · evidence findings ${e}`) }
fs.writeFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), JSON.stringify(res))
console.log('→ data/master/swing_ladder_atlas.json')
