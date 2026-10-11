// ════════════════════════════════════════════════════════════════════════════════
// study_ema_matrix_filter.mjs — TOOL 2, TEST B: does EMA 20/50/200 TREND ALIGNMENT across the timeframes give the Ferrari Matrix a
// higher-confidence trade? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run):
//   trades  = the Matrix sequence (scripts/lib/matrix_trades.mjs): PRIMARY with WTI 2024-10-10 → VAL_TO; REPORT without WTI, 13 y;
//             TRAIN folds 0-4 / OOS folds 5-7 (as the gate). FROZEN TAPE.
//   per tf, from the last bar CLOSED by the decision: trend = BULL / BEAR / MIXED (emaLevels.emaStack: close and EMA20 > 50 > 200 stacked)
//   ALIGNED(tf) ⇔ BULL for a BUY / BEAR for a SELL. Monthly is excluded (EMA200 not computable on 159 months) → 8 timeframes.
//   filters (4 tests): score ≥ 2 · score ≥ 4 · score ≥ 6 · HTF = 1w AND 1d AND 4h all aligned
//   PASS ⇔ OOS n ≥ 100 AND OOS mean $/trade bootstrap 2.5 % bound > 0 AND TRAIN mean $/trade > 0 (study_stats.filterVerdict).
//   reported: lift in OOS win rate and $/trade vs all trades; COUNTER-TREND trades (any of 1w/1d/4h opposite); per-tf descriptive.
// Output: data/master/ema_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS, CALENDAR_TF } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { emaStack } from '../src/master/emaLevels.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), MIN_N = 100
const TFS = ['1w', '1d', '4h', '1h', '30m', '15m', '5m', '3m'], HTF = ['1w', '1d', '4h'], spreadAt = makeSpreadAt()
const CTX = {}
for (const tf of TFS) {
  const grid = RESAMPLE_TF_MS[tf] ? { key: (t) => Math.floor(t / RESAMPLE_TF_MS[tf]) * RESAMPLE_TF_MS[tf], end: (k) => k + RESAMPLE_TF_MS[tf] } : CALENDAR_TF[tf]
  const B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
  CTX[tf] = { trend: emaStack(B).trend, CT: Float64Array.from(B.map((b) => grid.end(b.t))) }
}
const trendAt = (tf, T) => { const c = CTX[tf]; let lo = 0, hi = c.CT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.CT[m] <= T) lo = m + 1; else hi = m } return lo ? c.trend[lo - 1] : null }

async function arm(name, from, useWti) {
  const { fires } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(445566)
  const F = fires.filter((f) => f.fold >= 0).map((f) => { const tr = Object.fromEntries(TFS.map((tf) => [tf, trendAt(tf, f.t)])), want = f.side === 'BUY' ? 'BULL' : 'BEAR', against = f.side === 'BUY' ? 'BEAR' : 'BULL'
    const al = Object.fromEntries(TFS.map((tf) => [tf, tr[tf] === want])); return { ...f, tr, al, score: Object.values(al).filter(Boolean).length, htf: HTF.every((tf) => al[tf]), counter: HTF.some((tf) => tr[tf] === against) } })
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: tradeSummary(part(F, true), rnd), train: tradeSummary(part(F, false), rnd) }
  const defs = { 'score>=2': (f) => f.score >= 2, 'score>=4': (f) => f.score >= 4, 'score>=6': (f) => f.score >= 6, 'HTF 1w+1d+4h': (f) => f.htf }
  const filters = {}
  for (const [k, fn] of Object.entries(defs)) { const X = F.filter(fn), o = tradeSummary(part(X, true), rnd), t = tradeSummary(part(X, false), rnd)
    filters[k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null, verdict: filterVerdict(o, t, MIN_N) } }
  const counter = { oos: tradeSummary(part(F.filter((f) => f.counter), true), rnd), oos_not_counter: tradeSummary(part(F.filter((f) => !f.counter), true), rnd) }
  const per_tf = Object.fromEntries(TFS.map((tf) => [tf, { aligned_share: +(F.filter((f) => f.al[tf]).length / F.length).toFixed(4), oos_aligned: tradeSummary(part(F.filter((f) => f.al[tf]), true), rnd), oos_not: tradeSummary(part(F.filter((f) => !f.al[tf]), true), rnd) }]))
  const dist = {}; for (const f of F) dist[f.score] = (dist[f.score] || 0) + 1
  console.log(`\n── ${name}: trades ${F.length} · score distribution ${JSON.stringify(dist)}`)
  console.log(`   ALL          OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(13)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  console.log(`   counter-trend (HTF against): OOS n ${counter.oos.n} WR ${counter.oos.wr} $/t ${counter.oos.net} · the rest n ${counter.oos_not_counter.n} WR ${counter.oos_not_counter.wr} $/t ${counter.oos_not_counter.net}`)
  console.log('   per tf aligned vs not (OOS WR): ' + TFS.map((tf) => `${tf} ${per_tf[tf].oos_aligned.wr}/${per_tf[tf].oos_not.wr}`).join(' · '))
  return { arm: name, trades: F.length, score_distribution: dist, all: base, filters, counter_trend: counter, per_tf }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { tfs: TFS, htf: HTF, min_n: MIN_N, monthly: 'excluded — EMA200 not computable (159 months)' }, primary, report,
  verdict: pass.length ? 'EMA_ALIGNMENT_PASSES' : 'EMA_ALIGNMENT_DOES_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'ema_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> EMA TEST B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
