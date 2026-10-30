// ════════════════════════════════════════════════════════════════════════════════
// swings_1y.mjs <XAUUSD|XAGUSD|DXY|WTI> — swing points of the LAST YEAR on all 16 TradingView timeframes (generalised from swings_xau_1y.mjs) (2026-10-18; Ashraf: "start with XAU first … check history
// for the last 1 year only and mark the Swing points in our time frames" → "Table per timeframe", "All 16", then confirm every swing candle on
// TradingView).
// ────────────────────────────────────────────────────────────────────────────────
// Candles: nyCandles (TradingView-exact, from the verified Polygon 1m XAUUSD store). Swings: the ONE rule (src/master/swings.js) — a swing high /
// low is CONFIRMED when price moves 3 × ATR(14) of that timeframe away from the extreme; computed on the FULL history (warm ATR + ZigZag state),
// then the last year is listed. Candles touching a Polygon data hole are breaks. Output: docs/swing_book/xau_1y_swings/<tf>.csv + summary json.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { clean1m, SHORT, kit, tfFile } from './lib/series_1m.mjs'
import { TFS } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'

// --to=<ISO> pins the window end and cuts the data there (rebuilds an earlier published table exactly: no swing confirmed by later data)
const TO = process.argv.find((a) => a.startsWith('--to='))?.slice(5)
const SYM = process.argv[2] || 'XAUUSD', M = (await clean1m(SYM)).filter((b) => !TO || b.t <= Date.parse(TO)), holes = findHoles(M)
const LAST = M.at(-1).t, FROM = LAST - 365 * 86400000, K = 3
const dir = path.join(TURBO.root, 'docs', 'swing_book', `${SHORT[SYM]}_1y_swings`); fs.mkdirSync(dir, { recursive: true })
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')
const summary = { at: new Date().toISOString(), rule: `ZigZag k = ${K} × ATR(14) per timeframe, confirmed swings only`, window: [iso(FROM), iso(LAST)], data: `${SYM} 1m (scripts/lib/series_1m.mjs), nyCandles TradingView-exact`, symbol: SYM, tf: {} }
for (const tf of TFS) {
  const C = kit(SYM).build(M, tf); markIncomplete(C, holes)   // the instrument's own session (series_1m.kit)
  const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0))
  const { swings } = zigzag(C, { k: K, breaks })
  const rows = []
  for (let n = 0; n < swings.length; n++) { const s = swings[n]; if (s.t < FROM) continue
    const prev = swings[n - 1], c = C[s.i], conf = C[s.knownI]
    const r2 = (x) => +x.toFixed(SYM.startsWith('DXY') ? 4 : SYM === 'XAGUSD' ? 3 : 2)
    rows.push({ type: s.type === 'H' ? 'HIGH' : 'LOW', candle_open: iso(c.t), price: r2(s.px), o: r2(c.o), h: r2(c.h), l: r2(c.l), c: r2(c.c), atr: +s.atr.toFixed(4),
      leg_from_prev: prev && prev.type !== s.type ? +(s.px - prev.px).toFixed(2) : null, leg_atr: s.amp_atr != null ? +s.amp_atr.toFixed(2) : null,
      confirmed_by_candle: iso(conf.t), confirmed_at: iso(conf.close_t), confirm_lag_candles: s.knownI - s.i }) }
  const H = Object.keys(rows[0] ?? { type: 0 })
  fs.writeFileSync(path.join(dir, `${tfFile(tf)}.csv`), [H.join(',')].concat(rows.map((r) => H.map((k) => r[k] ?? '').join(','))).join('\n') + '\n')
  summary.tf[tf] = { candles_in_year: C.filter((c) => c.t >= FROM).length, swings: rows.length, highs: rows.filter((r) => r.type === 'HIGH').length, lows: rows.filter((r) => r.type === 'LOW').length,
    first: rows[0]?.candle_open ?? null, last: rows.at(-1)?.candle_open ?? null }
  console.log(`  ${tf.padEnd(3)} candles ${String(summary.tf[tf].candles_in_year).padStart(7)} · swings ${String(rows.length).padStart(6)} (${summary.tf[tf].highs} H / ${summary.tf[tf].lows} L)`)
}
fs.writeFileSync(path.join(TURBO.master, `${SHORT[SYM]}_1y_swings.json`), JSON.stringify(summary, null, 1))
console.log(`window ${summary.window.join(' → ')} · tables in docs/swing_book/${SHORT[SYM]}_1y_swings/`)
