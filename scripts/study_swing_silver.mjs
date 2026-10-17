// ════════════════════════════════════════════════════════════════════════════════
// study_swing_silver.mjs — Phase 3C: silver (same swing) and DXY (opposite swing) CONFIRMED before the decision moment, on top of the ladder
// (2026-10-17). Pre-registered: docs/SWING_SILVER_SPEC.md. Output: data/master/swing_silver_atlas.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { compareRates, holm, wilson } from '../src/core/studyStats.js'
import { indexSwings, flipAt } from './lib/swing_ladder.mjs'
import { undecided } from './lib/swing_combine.mjs'
import { prepSwings, earliestConfirm } from './lib/swing_silver.mjs'

const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), MIN_OOS = 30
const LADDER = { '15m': '5m', '1H': '30m', '4H': '3H', '1D': '9H' }, DUR = { '15m': 15, '1H': 60, '4H': 240, '1D': 1440 }
const med = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[s.length >> 1] }
console.log('loading 1m gold, silver, DXY …')
const G = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars
const SV = cleanForTv((await loadBars('XAGUSD', '1m', { from: FROM, to: TO })).bars).bars, DX = cleanForTv((await loadDxyBars('1m', { from: FROM, to: TO })).bars).bars
const series = (bars, tf) => { const C = buildCandles(bars, tf); markIncomplete(C, findHoles(bars)); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); return { C, ...zigzag(C, { k: 3, breaks }) } }
const res = { at: new Date().toISOString(), spec: 'docs/SWING_SILVER_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const [A, X] of Object.entries(LADDER)) {
  const g = series(G, A), gx = series(G, X), idxX = indexSwings(gx.C, gx.swings), W = 3 * DUR[A] * 60000
  const other = {}; for (const [nm, bars] of [['silver', SV], ['DXY', DX]]) { const a = series(bars, A), s = series(bars, X)
    other[nm] = { anchor: prepSwings(a.C, a.swings), step: prepSwings(s.C, s.swings), has: new Set(a.C.filter((c) => !c.incomplete).map((c) => c.t)) } }
  const out = { anchor: A, one_step: X, sides: {} }
  for (const side of ['L', 'H']) {
    const cands = [...g.swings.filter((s) => s.type === side).map((s) => ({ real: true, i: s.i, px: s.px, conf: g.C[s.knownI]?.close_t })),
      ...g.failed.filter((f) => f.type === side && f.pullback_atr >= 1).map((f) => ({ real: false, i: f.i, px: f.px, brk: g.C[f.supersededI]?.t }))].filter((c) => (c.real ? c.conf : c.brk) != null)
    for (const c of cands) { c.sp = g.C[c.i].t < SPLIT ? 'T' : 'O'; c.t0 = g.C[c.i].t; c.tX = flipAt(idxX, side, c.px, c.t0, g.C[c.i].close_t)
      for (const [nm, o] of Object.entries(other)) { const typ = nm === 'silver' ? side : side === 'L' ? 'H' : 'L'
        c[nm] = { avail: o.has.has(c.t0), anchor: earliestConfirm(o.anchor, typ, c.t0, W), step: earliestConfirm(o.step, typ, c.t0, W) } } }
    const ladder = cands.filter((c) => c.tX != null && undecided(c, c.tX))   // R1 pool (Phase 3 rule)
    const cell = (pool, yesFn, T) => { const out2 = {}; for (const sp of ['T', 'O']) { const P = pool.filter((c) => c.sp === sp), yes = P.filter(yesFn), no = P.filter((c) => !yesFn(c))
        const ry = yes.filter((c) => c.real).length, rn = no.filter((c) => c.real).length, w = wilson(ry, yes.length), cmp = compareRates(ry, yes.length, rn, no.length)
        out2[sp] = { pool: P.length, n: yes.length, p_real: yes.length ? ry / yes.length : null, wilson_lo: w.lo, wilson_hi: w.hi, n_without: no.length, p_real_without: no.length ? rn / no.length : null, p: cmp.p,
          lead_min_median: med(yes.filter((c) => c.real).map((c) => (c.conf - T(c)) / 60000)) } } return out2 }
    const R1 = cell(ladder, () => true, (c) => c.tX)
    const A_CELLS = {
      'silver-anchor': (c) => c.silver.anchor != null && c.silver.anchor <= c.tX, 'silver-step': (c) => c.silver.step != null && c.silver.step <= c.tX,
      'DXY-anchor': (c) => c.DXY.anchor != null && c.DXY.anchor <= c.tX, 'DXY-step': (c) => c.DXY.step != null && c.DXY.step <= c.tX,
      'silver-step AND DXY-step': (c) => c.silver.step != null && c.silver.step <= c.tX && c.DXY.step != null && c.DXY.step <= c.tX }
    const cellsA = {}, tests = []
    for (const [k, fn] of Object.entries(A_CELLS)) { const need = k.includes('AND') ? ['silver', 'DXY'] : [k.startsWith('silver') ? 'silver' : 'DXY']
      const pool = ladder.filter((c) => need.every((nm) => c[nm].avail)); cellsA[k] = { ...cell(pool, fn, (c) => c.tX), excluded_no_data: ladder.length - pool.length }; tests.push({ key: k, p: cellsA[k].O.p }) }
    holm(tests)
    for (const t of tests) { const r = cellsA[t.key], o = r.O; r.holm_pass = t.holm_pass; r.lift_vs_R1 = o.p_real != null && R1.O.p_real != null ? o.p_real - R1.O.p_real : null
      r.verdict = o.n < MIN_OOS ? 'DESCRIBED_ONLY' : t.holm_pass && r.lift_vs_R1 > 0 && o.wilson_lo > R1.O.p_real && r.T.p_real != null && R1.T.p_real != null && r.T.p_real > R1.T.p_real ? 'FINDING'
        : t.holm_pass && r.lift_vs_R1 < 0 ? 'LOWERS (sign present → less real)' : t.holm_pass ? 'NOT_ABOVE_LADDER' : 'NO_EVIDENCE' }
    // B — waiting for silver-step
    const wait = ladder.length ? cands.filter((c) => c.tX != null && c.silver.avail && c.silver.step != null) : []
    const B = {}; for (const sp of ['T', 'O']) { const P = wait.filter((c) => c.sp === sp && undecided(c, Math.max(c.tX, c.silver.step))), r = P.filter((c) => c.real).length, w = wilson(r, P.length), waited = P.filter((c) => c.silver.step > c.tX)
      B[sp] = { n: P.length, p_real: P.length ? r / P.length : null, wilson_lo: w.lo, wilson_hi: w.hi, waited: waited.length, wait_min_median: med(waited.map((c) => (c.silver.step - c.tX) / 60000)) } }
    out.sides[side] = { candidates: { T: cands.filter((c) => c.sp === 'T').length, O: cands.filter((c) => c.sp === 'O').length }, R1, A: cellsA, B_wait_for_silver: B } }
  res.anchors[A] = out
  for (const side of ['L', 'H']) { const s = out.sides[side]; console.log(`${A} ${side}: ladder ${(100 * s.R1.O.p_real).toFixed(0)}% (n ${s.R1.O.n}) · ` + Object.entries(s.A).map(([k, v]) => `${k} ${v.O.n ? (100 * v.O.p_real).toFixed(0) + '%' : '—'} n${v.O.n} vs without ${v.O.p_real_without == null ? '—' : (100 * v.O.p_real_without).toFixed(0) + '%'} ${v.verdict}`).join(' · ') + ` · wait-for-silver ${s.B_wait_for_silver.O.p_real == null ? '—' : (100 * s.B_wait_for_silver.O.p_real).toFixed(0) + '%'} n${s.B_wait_for_silver.O.n}`) } }
fs.writeFileSync(path.join(TURBO.master, 'swing_silver_atlas.json'), JSON.stringify(res))
console.log('→ data/master/swing_silver_atlas.json')
