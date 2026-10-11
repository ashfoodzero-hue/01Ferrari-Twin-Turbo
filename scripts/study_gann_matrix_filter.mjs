// ════════════════════════════════════════════════════════════════════════════════
// study_gann_matrix_filter.mjs — TOOL 6, TEST B: does the GANN BOX (time turns / price eighths) make Ferrari Matrix trades higher-confidence?
// (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run): trades = scripts/lib/matrix_trades.mjs (PRIMARY with WTI 2y; REPORT no-WTI 13y; TRAIN folds 0-4 /
// OOS 5-7; FROZEN TAPE). Boxes on 1h / 4h / 1d from the swing state in force at the decision (closed bars only).
//   NEAR_TIME_TURN  the decision lies within ±3 bars of a projected Gann time (½, 1, 2 × the swing duration) on any of the 3 tf
//   AT_GANN_LEVEL   the swing direction agrees with the trade (UP ↔ BUY) AND the entry is within 0.25·ATR14(tf) of a Gann eighth, any tf
//   BOTH            NEAR_TIME_TURN and AT_GANN_LEVEL
//   PASS ⇔ study_stats.filterVerdict. Lift vs all trades reported.
// Output: data/master/gann_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { swingStates, stateAt } from '../src/master/fibLevels.js'
import { GANN_PRICE, gannPrice, gannTimes } from '../src/master/gannBox.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), MIN_N = 100, TOL = 0.25, WIN = 3, spreadAt = makeSpreadAt()
const TFS = ['1h', '4h', '1d'], CTX = {}
for (const tf of TFS) { const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
  CTX[tf] = { ms, states: swingStates(B, (i) => B[i].t + ms), A: atrArr(B, 14), CT: Float64Array.from(B.map((b) => b.t + ms)) } }
function features(T, side, entry) {
  let near = false, at = false
  for (const tf of TFS) { const c = CTX[tf], s = stateAt(c.states, T); if (!s) continue
    if (gannTimes(s).some(({ t }) => Math.abs(T - t) <= WIN * c.ms)) near = true
    let lo = 0, hi = c.CT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.CT[m] <= T) lo = m + 1; else hi = m }
    const a = lo ? c.A[lo - 1] : null
    if (a > 0 && (s.dir === 'UP') === (side === 'BUY') && GANN_PRICE.some((f) => Math.abs(entry - gannPrice(s, f)) <= TOL * a)) at = true }
  return { near, at }
}
async function arm(name, from, useWti) {
  const { fires } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(343434)
  const F = fires.filter((f) => f.fold >= 0).map((f) => ({ ...f, ...features(f.t, f.side, f.sig.entry) }))
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: tradeSummary(part(F, true), rnd), train: tradeSummary(part(F, false), rnd) }, filters = {}
  for (const [k, fn] of Object.entries({ NEAR_TIME_TURN: (f) => f.near, AT_GANN_LEVEL: (f) => f.at, BOTH: (f) => f.near && f.at })) {
    const X = F.filter(fn), o = tradeSummary(part(X, true), rnd), t = tradeSummary(part(X, false), rnd)
    filters[k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null, verdict: filterVerdict(o, t, MIN_N) }
  }
  console.log(`\n── ${name}: trades ${F.length} · near time turn ${F.filter((f) => f.near).length} · at Gann level ${F.filter((f) => f.at).length}`)
  console.log(`   ALL            OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(15)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  return { arm: name, trades: F.length, all: base, filters }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { tfs: TFS, window_bars: WIN, tol_atr: TOL, min_n: MIN_N }, primary, report,
  verdict: pass.length ? 'GANN_FILTER_PASSES' : 'GANN_DOES_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'gann_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 6 B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
