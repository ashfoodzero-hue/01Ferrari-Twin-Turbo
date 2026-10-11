// ════════════════════════════════════════════════════════════════════════════════
// study_vp_matrix_filter.mjs — TOOL 4, TEST B: does the previous day's VOLUME PROFILE make Ferrari Matrix trades higher-confidence? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run): trades = scripts/lib/matrix_trades.mjs (PRIMARY with WTI 2y; REPORT no-WTI 13y; TRAIN folds 0-4 /
// OOS 5-7; FROZEN TAPE). Profile = the SPOT tick-activity profile of the last full day before the decision (volumeProfile.js, bin 0.02·ATR14(1d),
// value area 70 %, dayLevels rules). tol = 0.25·ATR14(1d). Filters (3 tests):
//   AT_VAL       BUY with the entry within tol ABOVE the prior VAL · SELL within tol BELOW the prior VAH   (buying the bottom of value)
//   OUTSIDE_VAL  BUY with the entry above the prior VAH · SELL below the prior VAL                        (acceptance outside value)
//   POC_TARGET   the prior POC lies at or beyond TP1 in the trade's direction (BUY: POC ≥ TP1; SELL: POC ≤ TP1) — price "pulled to the POC"
//   PASS ⇔ study_stats.filterVerdict (OOS n ≥ 100, OOS $/t bootstrap 2.5 % > 0, TRAIN $/t > 0). Lift vs all trades reported.
// Output: data/master/vp_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { dailyStats, prevDays, DAY_MS, MIN_DAY_MINUTES } from '../src/master/dayLevels.js'
import { volumeProfile } from '../src/master/volumeProfile.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), MIN_N = 100, spreadAt = makeSpreadAt()
const D1 = (await loadBars('XAUUSD', '1d', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars, A1 = atrArr(D1, 14)
const atrAtClose = (day) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t <= day) lo = m + 1; else hi = m } return lo ? A1[lo - 1] : null }

async function arm(name, from, useWti) {
  const { fires, m1 } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(990011), { list } = dailyStats(m1)
  const cache = new Map()
  const profileFor = (T) => { const d = Math.floor(T / DAY_MS) * DAY_MS; let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].day < d) lo = m + 1; else hi = m }
    const P = prevDays(list.slice(Math.max(0, lo - 10), lo), d); if (!P || P.pd.minutes < MIN_DAY_MINUTES) return null
    if (!cache.has(P.pd.day)) { const a = atrAtClose(P.pd.day); cache.set(P.pd.day, a > 0 ? { ...volumeProfile(m1.slice(P.pd.firstK, P.pd.lastK + 1), 0.02 * a), a } : null) }
    return cache.get(P.pd.day) }
  const F = []
  for (const f of fires.filter((x) => x.fold >= 0)) {
    const p = profileFor(f.t), s = f.sig; if (!p || !(p.poc > 0)) { F.push({ ...f, ok: false }); continue }
    const tol = 0.25 * p.a, buy = f.side === 'BUY'
    F.push({ ...f, ok: true, atVal: buy ? s.entry >= p.val && s.entry - p.val <= tol : s.entry <= p.vah && p.vah - s.entry <= tol, outside: buy ? s.entry > p.vah : s.entry < p.val, pocT: buy ? p.poc >= s.tp1 : p.poc <= s.tp1 })
  }
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: tradeSummary(part(F, true), rnd), train: tradeSummary(part(F, false), rnd) }, filters = {}
  for (const [k, fn] of Object.entries({ AT_VAL: (f) => f.atVal, OUTSIDE_VAL: (f) => f.outside, POC_TARGET: (f) => f.pocT })) {
    const X = F.filter((f) => f.ok && fn(f)), o = tradeSummary(part(X, true), rnd), t = tradeSummary(part(X, false), rnd)
    filters[k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null, verdict: filterVerdict(o, t, MIN_N) }
  }
  console.log(`\n── ${name}: trades ${F.length} (profile available ${F.filter((f) => f.ok).length})`)
  console.log(`   ALL          OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(13)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  return { arm: name, trades: F.length, all: base, filters }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { profile: 'spot tick activity, prior full day', bin_atr1d: 0.02, tol_atr1d: 0.25, min_n: MIN_N }, primary, report,
  verdict: pass.length ? 'PROFILE_FILTER_PASSES' : 'PROFILE_DOES_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'vp_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 4 B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
