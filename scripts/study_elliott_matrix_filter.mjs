// ════════════════════════════════════════════════════════════════════════════════
// study_elliott_matrix_filter.mjs — TOOL 5, TEST B: does the mechanical Elliott count make Ferrari Matrix trades higher-confidence? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run): trades = scripts/lib/matrix_trades.mjs (PRIMARY with WTI 2y; REPORT no-WTI 13y; TRAIN folds 0-4 /
// OOS 5-7; FROZEN TAPE). Patterns = src/master/elliott.js on 15m / 1h / 4h / 1d. A pattern is ACTIVE from the close of the bar that confirms
// it until the first 1m bar that resolves it (W5: target or invalidation; ABC: its target or the 1:1 opposite distance from price_now) —
// resolution measured on the 1m bid; only past minutes are ever used at the decision.
//   W5_WITH        an active W5 on ANY of the 4 tf points the trade's way (UP ↔ BUY)
//   W5_WITH_HTF    an active W5 on 1h, 4h or 1d points the trade's way
//   NO_ABC_AGAINST no active ABC on any tf points against the trade
//   PASS ⇔ study_stats.filterVerdict. Lift vs all trades reported.
// Output: data/master/elliott_matrix_filter.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { elliottPatterns } from '../src/master/elliott.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { tradeSummary, filterVerdict } from './lib/study_stats.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), MIN_N = 100, spreadAt = makeSpreadAt()
const TFS = ['15m', '1h', '4h', '1d'], HTF = ['1h', '4h', '1d']
const PATS = {}
for (const tf of TFS) { const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
  PATS[tf] = elliottPatterns(B).map((p) => ({ ...p, T: B[p.knownAt].t + ms })) }

async function arm(name, from, useWti) {
  const { fires, m1 } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), rnd = seeded(121212)
  const MT = Float64Array.from(m1.map((b) => b.t)), lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
  // active windows [T, end) per tf, resolved on the 1m bid
  const ACT = {}
  for (const tf of TFS) { ACT[tf] = []
    for (const p of PATS[tf]) { if (p.T < from - 60 * 86400000 || p.T >= VAL_TO) continue
      const k0 = lb(p.T); if (k0 >= m1.length) continue
      const px = m1[k0].o, up = p.dir === 'UP', target = p.target, stop = p.kind === 'W5' ? p.invalid : px + (px - p.target)
      if (up ? !(px < target && px > stop) : !(px > target && px < stop)) continue
      let end = Infinity; for (let k = k0; k < m1.length; k++) { const b = m1[k]; if (up ? b.h >= target || b.l <= stop : b.l <= target || b.h >= stop) { end = b.t + 60000; break } }
      ACT[tf].push({ kind: p.kind, dir: p.dir, T: p.T, end }) } }
  const activeAt = (tf, T) => ACT[tf].filter((a) => a.T <= T && T < a.end)
  const F = fires.filter((f) => f.fold >= 0).map((f) => { const want = f.side === 'BUY' ? 'UP' : 'DOWN'
    const w5 = (tfs) => tfs.some((tf) => activeAt(tf, f.t).some((a) => a.kind === 'W5' && a.dir === want))
    return { ...f, w5any: w5(TFS), w5htf: w5(HTF), abcAgainst: TFS.some((tf) => activeAt(tf, f.t).some((a) => a.kind === 'ABC' && a.dir !== want)) } })
  const part = (xs, oos) => xs.filter((f) => (f.fold >= 5) === oos)
  const base = { oos: tradeSummary(part(F, true), rnd), train: tradeSummary(part(F, false), rnd) }, filters = {}
  for (const [k, fn] of Object.entries({ W5_WITH: (f) => f.w5any, W5_WITH_HTF: (f) => f.w5htf, NO_ABC_AGAINST: (f) => !f.abcAgainst })) {
    const X = F.filter(fn), o = tradeSummary(part(X, true), rnd), t = tradeSummary(part(X, false), rnd)
    filters[k] = { oos: o, train: t, lift_wr: o.wr != null && base.oos.wr != null ? +(o.wr - base.oos.wr).toFixed(4) : null, lift_net: o.net != null ? +(o.net - base.oos.net).toFixed(4) : null, verdict: filterVerdict(o, t, MIN_N) }
  }
  console.log(`\n── ${name}: trades ${F.length} · W5 with ${F.filter((f) => f.w5any).length} · ABC against ${F.filter((f) => f.abcAgainst).length}`)
  console.log(`   ALL            OOS n ${base.oos.n} WR ${base.oos.wr} · $/t ${base.oos.net} [${base.oos.net_lb}, ${base.oos.net_ub}] · TRAIN $/t ${base.train.net}`)
  for (const [k, v] of Object.entries(filters)) console.log(`   ${k.padEnd(15)}OOS n ${v.oos.n} WR ${v.oos.wr} (lift ${v.lift_wr}) · $/t ${v.oos.net} [${v.oos.net_lb}, ${v.oos.net_ub}] · TRAIN $/t ${v.train.net} → ${v.verdict}`)
  return { arm: name, trades: F.length, all: base, filters }
}
const primary = await arm('PRIMARY Matrix with WTI (2y)', WTI_FROM, true)
const report = await arm('REPORT Matrix without WTI (13y)', HISTORY_CONTINUOUS_FROM + 7 * 86400000, false)
const pass = Object.entries(primary.filters).filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), rules: { tfs: TFS, htf: HTF, min_n: MIN_N }, primary, report,
  verdict: pass.length ? 'ELLIOTT_FILTER_PASSES' : 'ELLIOTT_DOES_NOT_MAKE_THE_MATRIX_PROFITABLE', passing: pass }
fs.writeFileSync(path.join(TURBO.master, 'elliott_matrix_filter.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 5 B: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
