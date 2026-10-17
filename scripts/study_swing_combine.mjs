// ════════════════════════════════════════════════════════════════════════════════
// study_swing_combine.mjs — Phase 3B: the ladder (Phase 3) combined with the next anchor candle (Phase 1) (2026-10-17).
// Pre-registered: docs/SWING_COMBINE_SPEC.md. A combination counts only for candidates still UNDECIDED at T* = the latest sign's known time.
// Output: data/master/swing_combine_atlas.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { compareRates, holm, wilson } from '../src/core/studyStats.js'
import { indexSwings, flipAt } from './lib/swing_ladder.mjs'
import { undecided, strongPlus1, dirPlus1 } from './lib/swing_combine.mjs'

const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM), MIN_OOS = 30
const LADDER = { '15m': ['5m', '3m'], '1H': ['30m', '15m'], '4H': ['3H', '2H'], '1D': ['9H', '6H'] }
const med = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[s.length >> 1] }
console.log('loading 1m gold …')
const G = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars, holes = findHoles(G)
const series = (tf) => { const C = buildCandles(G, tf); markIncomplete(C, holes); const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); const z = zigzag(C, { k: 3, breaks }); return { C, ...z, idx: indexSwings(C, z.swings) } }
const cache = {}, get = (tf) => (cache[tf] ??= series(tf))
const res = { at: new Date().toISOString(), spec: 'docs/SWING_COMBINE_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), anchors: {} }
for (const [A, [X1, X2]] of Object.entries(LADDER)) {
  const { C, swings, failed } = get(A), i1 = get(X1).idx, i2 = get(X2).idx, out = { anchor: A, one_step: X1, two_steps: X2, sides: {} }
  for (const side of ['L', 'H']) {
    const cands = [...swings.filter((s) => s.type === side).map((s) => ({ real: true, i: s.i, px: s.px, conf: C[s.knownI]?.close_t })),
      ...failed.filter((f) => f.type === side && f.pullback_atr >= 1).map((f) => ({ real: false, i: f.i, px: f.px, brk: C[f.supersededI]?.t }))].filter((c) => (c.real ? c.conf : c.brk) != null)
    for (const c of cands) { c.sp = C[c.i].t < SPLIT ? 'T' : 'O'; const a0 = C[c.i].t, a1 = C[c.i].close_t
      c.tX = flipAt(i1, side, c.px, a0, a1); c.tX2 = flipAt(i2, side, c.px, a0, a1); c.t1 = C[c.i + 1]?.close_t ?? null; c.strong = strongPlus1(C, c.i, side); c.dir = dirPlus1(C, c.i, side) }
    const mx = (...t) => (t.some((x) => x == null) ? null : Math.max(...t))
    // each cell: a decision time T* and a condition; the comparison group for the test = same T* and base sign, with the extra sign FALSE
    const CELLS = {
      R1: { T: (c) => c.tX, cond: () => true },
      C1: { T: (c) => mx(c.tX, c.t1), cond: (c) => c.strong === true, base: 'X1' },
      C2: { T: (c) => mx(c.tX, c.t1), cond: (c) => c.dir === true, base: 'X1' },
      C3: { T: (c) => mx(c.tX, c.t1), cond: (c) => c.strong === true && c.dir === true, base: 'X1' },
      C4: { T: (c) => mx(c.tX2, c.t1), cond: (c) => c.strong === true, base: 'X2' },
      C5: { T: (c) => c.t1, cond: (c) => c.strong === true, base: 'none' },
      M1: { T: (c) => mx(c.tX, c.t1), cond: (c) => c.strong === false, base: 'X1' },   // the mirror: ladder AND a WEAK next candle
    }
    const cells = {}
    for (const [k, def] of Object.entries(CELLS)) { const row = { key: k }
      for (const sp of ['T', 'O']) { const pool = cands.filter((c) => c.sp === sp && undecided(c, def.T(c))), yes = pool.filter(def.cond), no = pool.filter((c) => !def.cond(c))
        const ry = yes.filter((c) => c.real).length, rn = no.filter((c) => c.real).length, w = wilson(ry, yes.length), cmp = compareRates(ry, yes.length, rn, no.length)
        row[sp] = { n: yes.length, real: ry, p_real: yes.length ? ry / yes.length : null, wilson_lo: w.lo, wilson_hi: w.hi, n_without_sign: no.length, p_real_without_sign: no.length ? rn / no.length : null, p: cmp.p,
          lead_min_median: med(yes.filter((c) => c.real).map((c) => (c.conf - def.T(c)) / 60000)) } }
      cells[k] = row }
    const r1 = cells.R1.O.p_real, tests = ['C1', 'C2', 'C3', 'C4'].map((k) => ({ key: k, p: cells[k].O.p }))
    holm(tests); for (const t of tests) cells[t.key].holm_pass = t.holm_pass
    for (const [k, row] of Object.entries(cells)) { if (k === 'R1') { row.verdict = 'REFERENCE'; continue }
      row.lift_vs_R1 = row.O.p_real != null && r1 != null ? row.O.p_real - r1 : null; row.lead_cost_min = row.O.lead_min_median != null && cells.R1.O.lead_min_median != null ? cells.R1.O.lead_min_median - row.O.lead_min_median : null
      if (['C5', 'M1'].includes(k)) { row.verdict = 'REPORTED'; continue }
      row.verdict = row.O.n < MIN_OOS ? 'DESCRIBED_ONLY' : row.holm_pass && row.lift_vs_R1 > 0 && row.O.wilson_lo > r1 && row.T.p_real != null && cells.R1.T.p_real != null && row.T.p_real > cells.R1.T.p_real ? 'FINDING' : row.holm_pass ? 'NOT_ABOVE_LADDER' : 'NO_EVIDENCE' }
    out.sides[side] = { candidates: { T: cands.filter((c) => c.sp === 'T').length, O: cands.filter((c) => c.sp === 'O').length }, cells } }
  res.anchors[A] = out
  for (const side of ['L', 'H']) { const c = out.sides[side].cells; console.log(`${A} ${side}: R1 ${(100 * c.R1.O.p_real).toFixed(0)}% (n ${c.R1.O.n}) · C1 ${(100 * c.C1.O.p_real).toFixed(0)}% (n ${c.C1.O.n}) ${c.C1.verdict} · C3 ${(100 * c.C3.O.p_real).toFixed(0)}% ${c.C3.verdict} · C4 ${(100 * c.C4.O.p_real).toFixed(0)}% ${c.C4.verdict} · M1 weak ${(100 * c.M1.O.p_real).toFixed(0)}%`) } }
fs.writeFileSync(path.join(TURBO.master, 'swing_combine_atlas.json'), JSON.stringify(res))
console.log('→ data/master/swing_combine_atlas.json')
