// ════════════════════════════════════════════════════════════════════════════════
// compare_tv_swings.mjs — confirm the last-year XAU swing candles (swings_xau_1y.mjs) on Ashraf's TradingView (OANDA:XAUUSD, read by
// measure_tv_history.cjs). Ashraf 2026-10-18: "after completed please confirm it with exact Candles time frame on trading view and confirm it is same".
// Per timeframe, for every swing inside TradingView's loaded history:
//   A  SAME CANDLE    — TradingView has a candle with exactly the same open time
//   B  PRICE          — |our swing price − TradingView's high (HIGH) / low (LOW) of that candle| (two feeds: Polygon vs OANDA)
//   C  SAME EXTREME   — on TradingView, the highest high (HIGH) / lowest low (LOW) between the previous and the next swing candle is on the
//                       SAME candle (the swing would be marked at the same place on TradingView)
// Usage: node scripts/compare_tv_swings.mjs <tv_history.json>  → data/master/xau_1y_swings_tv_check.json
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { TFS, cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'

const TV = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).res
const RES = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '2H': '120', '3H': '180', '4H': '240', '6H': '360', '9H': '540', '1D': '1D', '2D': '2D', '3D': '3D', '1W': '1W', '1M': '1M' }
const M = cleanForTv((await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM })).bars, { reopenClamp: true }).bars, holes = findHoles(M), LAST = M.at(-1).t, FROM = LAST - 365 * 86400000
const med = (v) => (v.length ? v.slice().sort((a, b) => a - b)[v.length >> 1] : null), p95 = (v) => (v.length ? v.slice().sort((a, b) => a - b)[Math.floor(0.95 * (v.length - 1))] : null)
const out = { at: new Date().toISOString(), window: [new Date(FROM).toISOString(), new Date(LAST).toISOString()], tf: {} }
for (const tf of TFS) {
  const bars = TV[RES[tf]]; if (!bars?.length) { out.tf[tf] = { tv: 'not loaded' }; continue }
  const tv = new Map(bars.map((b) => [b[0] * 1000, { h: b[2], l: b[3] }])), tvT = bars.map((b) => b[0] * 1000), tv0 = tvT[0], tv1 = tvT.at(-1)
  const C = buildCandles(M, tf); markIncomplete(C, holes)
  const { swings } = zigzag(C, { k: 3, breaks: new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)) })
  let n = 0, same = 0, ext = 0, extN = 0; const dpx = [], misses = [], extMiss = []
  for (let j = 0; j < swings.length; j++) { const s = swings[j], t = C[s.i].t; if (t < FROM || t < tv0 || t > tv1) continue
    n++; const b = tv.get(t); if (!b) { misses.push(new Date(t).toISOString()); continue } same++
    dpx.push(Math.abs(s.px - (s.type === 'H' ? b.h : b.l)))
    const a = swings[j - 1] ? C[swings[j - 1].i].t : null, z = swings[j + 1] ? C[swings[j + 1].i].t : null
    if (a == null || z == null || a < tv0 || z > tv1) continue
    extN++; let bestT = null, bestV = null
    for (const tt of tvT) { if (tt <= a || tt >= z) continue; const v = s.type === 'H' ? tv.get(tt).h : tv.get(tt).l; if (bestV == null || (s.type === 'H' ? v > bestV : v < bestV)) { bestV = v; bestT = tt } }
    if (bestT === t) ext++; else extMiss.push({ swing: new Date(t).toISOString(), type: s.type, ours: s.px, tv_extreme_at: bestT && new Date(bestT).toISOString(), tv_extreme: bestV, tv_at_ours: s.type === 'H' ? b.h : b.l }) }
  out.tf[tf] = { tv_from: new Date(tv0).toISOString(), swings_checked: n, same_candle: same, same_candle_pct: n ? +(100 * same / n).toFixed(2) : null, price_diff_median: med(dpx) != null ? +med(dpx).toFixed(3) : null, price_diff_p95: p95(dpx) != null ? +p95(dpx).toFixed(3) : null,
    same_extreme: ext, same_extreme_of: extN, same_extreme_pct: extN ? +(100 * ext / extN).toFixed(2) : null, missing_candles: misses.slice(0, 10), extreme_differs: extMiss.slice(0, 20), extreme_differs_n: extMiss.length }
  const o = out.tf[tf]; console.log(`  ${tf.padEnd(3)} TV from ${o.tv_from.slice(0, 10)} · swings ${String(n).padStart(5)} · same candle ${o.same_candle_pct}% · price diff median $${o.price_diff_median} (p95 $${o.price_diff_p95}) · same extreme ${ext}/${extN} (${o.same_extreme_pct}%)`)
}
fs.writeFileSync(path.join(TURBO.master, 'xau_1y_swings_tv_check.json'), JSON.stringify(out, null, 1))
