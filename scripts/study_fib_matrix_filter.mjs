// ════════════════════════════════════════════════════════════════════════════════
// study_fib_matrix_filter.mjs — TOOL 1, TEST B: when the Ferrari Matrix triggers, does Fibonacci ALIGNMENT across the 9 timeframes give a
// HIGHER-CONFIDENCE trade? (2026-10-09; Ashraf: "we need those Fib to be aligned as per each time frame when we trigger a trade that meets
// the trade direction expectation … does this give us a higher confidence?")
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run):
//   trades  = the Matrix sequence (scripts/lib/matrix_trades.mjs) — PRIMARY: with WTI, 2024-10-10 → VAL_TO (the live strategy);
//             REPORT: without WTI, 13 y. Regime-spanned folds as the gate: TRAIN folds 0-4, OOS folds 5-7.
//   per tf ∈ {1mo,1w,1d,4h,1h,30m,15m,5m,3m}, at the decision time T (only bars CLOSED by T): the swing state in force (fibLevels.stateAt)
//     ALIGNED(tf) ⇔ the swing direction agrees with the trade (UP swing ↔ BUY, DOWN ↔ SELL — "the Fib's expected direction") AND the entry
//                   is within 0.25·ATR14(tf) of one of its 7 Fib/inverse-Fib prices
//   score = number of ALIGNED timeframes (0-9).  Filters: score ≥ 1 · ≥ 2 · ≥ 3  (3 tests).
//   A filter PASSES (may gate the Matrix) ⇔ OOS n ≥ 100 AND OOS mean $/trade bootstrap 2.5 % bound > 0 AND TRAIN mean $/trade > 0.
//   "Higher confidence" is reported as LIFT vs all trades: OOS win rate (decisive) and $/trade, filtered vs unfiltered — measured, either way.
//   Per-timeframe alignment is reported descriptively (no verdict — 9 more looks would need their own correction).
// Output: data/master/fib_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS, CALENDAR_TF } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { swingStates, stateAt, fibPrice, FIB_POS, FIB_TFS } from '../src/master/fibLevels.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), TOL = 0.25, MIN_N = 100
const spreadAt = makeSpreadAt()

// per-tf context, built once over the full history (only CLOSED bars are ever looked up)
const CTX = {}
for (const tf of FIB_TFS) {
  const grid = RESAMPLE_TF_MS[tf] ? { key: (t) => Math.floor(t / RESAMPLE_TF_MS[tf]) * RESAMPLE_TF_MS[tf], end: (k) => k + RESAMPLE_TF_MS[tf] } : CALENDAR_TF[tf]
  const B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars, A = atrArr(B, 14), closeT = (i) => grid.end(B[i].t)
  CTX[tf] = { states: swingStates(B, closeT), A, CT: Float64Array.from(B.map((_, i) => closeT(i))) }
}
function aligned(tf, T, side, entry) {
  const c = CTX[tf], s = stateAt(c.states, T); if (!s) return false
  let lo = 0, hi = c.CT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.CT[m] <= T) lo = m + 1; else hi = m }
  const a = lo ? c.A[lo - 1] : null; if (!(a > 0)) return false
  if ((s.dir === 'UP') !== (side === 'BUY')) return false
  return FIB_POS.some(({ p }) => Math.abs(entry - fibPrice(s, p)) <= TOL * a)
}
const summary = tradeSummary   // scripts/lib/study_stats.mjs

async function arm(name, from, useWti) {
  const { fires } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(112233)
  const F = fires.filter((f) => f.fold >= 0).map((f) => { const al = Object.fromEntries(FIB_TFS.map((tf) => [tf, aligned(tf, f.t, f.side, f.sig.entry)])); return { ...f, al, score: Object.values(al).filter(Boolean).length } })
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: summary(part(F, true), rnd), train: summary(part(F, false), rnd) }
  const filters = {}
  for (const k of [1, 2, 3]) { const X = F.filter((f) => f.score >= k), o = summary(part(X, true), rnd), t = summary(part(X, false), rnd)
    filters['score>=' + k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null,
      verdict: filterVerdict(o, t, MIN_N) } }
  const per_tf = Object.fromEntries(FIB_TFS.map((tf) => { const X = part(F.filter((f) => f.al[tf]), true); return [tf, { aligned_share: +(F.filter((f) => f.al[tf]).length / F.length).toFixed(4), oos: summary(X, rnd) }] }))
  const dist = {}; for (const f of F) dist[f.score] = (dist[f.score] || 0) + 1
  console.log(`\n── ${name}: trades ${F.length} · score distribution ${JSON.stringify(dist)}`)
  console.log(`   ALL     OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(8)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  console.log('   per tf (OOS, aligned only): ' + FIB_TFS.map((tf) => `${tf} n${per_tf[tf].oos.n} WR ${per_tf[tf].oos.wr} $${per_tf[tf].oos.net}`).join(' · '))
  return { arm: name, trades: F.length, score_distribution: dist, all: base, filters, per_tf }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { tfs: FIB_TFS, tol_atr: TOL, min_n: MIN_N, filters: ['score>=1', 'score>=2', 'score>=3'] }, primary, report,
  verdict: pass.length ? 'FIB_ALIGNMENT_PASSES' : 'FIB_ALIGNMENT_DOES_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'fib_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> FIB TEST B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
