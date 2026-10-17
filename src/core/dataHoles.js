// dataHoles.js — find the trading days a symbol's 1m history is MISSING, and flag every candle that overlaps one (2026-10-17).
// Measured 2026-10-17: Polygon has NO XAUUSD data (not even daily) 2019-09-04 → 2019-10-04 and 2020-10-14 → 2020-11-13; silver and four of
// the six DXY pairs have holes in the same months. These cannot be filled from Polygon (RED RULE: never guess), so a study must EXCLUDE
// candles and swings that touch them. A single missing weekday is a market holiday (Christmas, New Year, Good Friday) — not a hole.
import { tradingDate } from './nyCandles.js'

const DAY = 86400000
/** Holes = runs of ≥ minRun consecutive missing weekdays inside the data's span. bars = ascending 1m (cleaned). Returns [{ from, to, days }] (trading dates, UTC-midnight ms). */
export function findHoles(bars, { minRun = 2 } = {}) {
  if (!bars.length) return []
  const have = new Set(); for (const b of bars) have.add(tradingDate(b.t))
  const first = tradingDate(bars[0].t), last = tradingDate(bars.at(-1).t), runs = []
  let cur = null
  for (let d = first; d <= last; d += DAY) { const w = new Date(d).getUTCDay(); if (w === 0 || w === 6) continue
    if (!have.has(d)) { if (cur) { cur.to = d; cur.days++ } else cur = { from: d, to: d, days: 1 } }
    else if (cur) { runs.push(cur); cur = null } }
  if (cur) runs.push(cur)
  return runs.filter((r) => r.days >= minRun)
}
/** True if a candle (td = its first trading date, close_t = end of its last minute) overlaps a hole. Holes are trading-date ranges. */
export function overlapsHole(candle, holes, nextCandle = null) {
  const a = candle.td, z = nextCandle ? nextCandle.td - DAY : tradingDate(candle.close_t - 60000)
  return holes.some((h) => a <= h.to && z >= h.from)
}
/** Mark candles in place: c.incomplete = true when the candle (or the span to the next candle) overlaps a hole. Returns the count. */
export function markIncomplete(candles, holes) {
  let k = 0
  for (let i = 0; i < candles.length; i++) { const c = candles[i]; c.incomplete = overlapsHole(c, holes, candles[i + 1]); if (c.incomplete) k++ }
  return k
}
