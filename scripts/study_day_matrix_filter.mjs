// ════════════════════════════════════════════════════════════════════════════════
// study_day_matrix_filter.mjs — TOOL 3, TEST B: do the previous-2-days / today's HIGH-LOW make Ferrari Matrix trades higher-confidence?
// (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run): trades = scripts/lib/matrix_trades.mjs (PRIMARY with WTI 2y; REPORT no-WTI 13y; TRAIN folds 0-4,
// OOS 5-7; FROZEN TAPE). Levels at the decision time from src/master/dayLevels.dayLevelsAt (closed days; today's H/L to the last closed hour).
// tol = 0.25·ATR14(1d) of the last closed day. Filters (3 tests):
//   AT_LEVEL    BUY with the entry within tol ABOVE PDL or P2DL (buying the prior lows) · SELL within tol BELOW PDH or P2DH
//   BREAKOUT48  BUY with the entry above H48 (both prior highs taken) · SELL below L48
//   TARGET48    the 48 h level lies BEYOND TP2 in the trade's direction (BUY: H48 ≥ TP2; SELL: L48 ≤ TP2) — "room to the target"
//   PASS ⇔ study_stats.filterVerdict (OOS n ≥ 100, OOS $/t bootstrap 2.5 % > 0, TRAIN $/t > 0). Lift vs all trades reported.
// Output: data/master/day_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { dailyStats, dayLevelsAt, DAY_MS } from '../src/master/dayLevels.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), MIN_N = 100, spreadAt = makeSpreadAt()
const D1 = (await loadBars('XAUUSD', '1d', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars, A1 = atrArr(D1, 14)
const atrBefore = (T) => { const d = Math.floor(T / DAY_MS) * DAY_MS; let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY_MS <= d) lo = m + 1; else hi = m } return lo ? A1[lo - 1] : null }

async function arm(name, from, useWti) {
  const { fires, m1 } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(778899), { list } = dailyStats(m1)
  const F = []
  for (const f of fires.filter((x) => x.fold >= 0)) {
    const L = dayLevelsAt(m1, list, f.t), tol = 0.25 * atrBefore(f.t), s = f.sig; if (!L || !(tol > 0)) { F.push({ ...f, ok: false }); continue }
    const buy = f.side === 'BUY'
    const at = buy ? [L.PDL, L.P2DL].some((x) => s.entry >= x && s.entry - x <= tol) : [L.PDH, L.P2DH].some((x) => s.entry <= x && x - s.entry <= tol)
    const brk = buy ? s.entry > L.H48 : s.entry < L.L48
    const room = buy ? L.H48 >= s.tp2 : L.L48 <= s.tp2
    F.push({ ...f, ok: true, at, brk, room })
  }
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: tradeSummary(part(F, true), rnd), train: tradeSummary(part(F, false), rnd) }, filters = {}
  for (const [k, fn] of Object.entries({ AT_LEVEL: (f) => f.at, BREAKOUT48: (f) => f.brk, TARGET48: (f) => f.room })) {
    const X = F.filter((f) => f.ok && fn(f)), o = tradeSummary(part(X, true), rnd), t = tradeSummary(part(X, false), rnd)
    filters[k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null, verdict: filterVerdict(o, t, MIN_N) }
  }
  console.log(`\n── ${name}: trades ${F.length} (levels available ${F.filter((f) => f.ok).length})`)
  console.log(`   ALL         OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(12)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  return { arm: name, trades: F.length, all: base, filters }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { tol_atr1d: 0.25, min_n: MIN_N, filters: ['AT_LEVEL', 'BREAKOUT48', 'TARGET48'] }, primary, report,
  verdict: pass.length ? 'DAY_LEVEL_FILTER_PASSES' : 'DAY_LEVELS_DO_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'day_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 3 B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
