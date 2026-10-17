// nyCandles.js — TradingView-exact gold candles for every timeframe, built from 1m (2026-10-17; Ashraf's swing-candle study).
// Anchors MEASURED from Ashraf's TradingView (OANDA:XAUUSD, CDP 9222, 2026-10-17; scripts/measure_tv_anchors.cjs →
// data/master/tv_anchor_reference.json):
//   • the trading SESSION opens 17:00 New York (EST/EDT) and carries the NEXT calendar date (the "trading date")
//   • 1m…30m and 1H/2H/3H/4H/6H: a continuous grid anchored at 17:00 New York (24 h divides evenly)
//   • 9H: restarts every session → 17:00, 02:00, 11:00 New York (the 11:00 candle is 6 h, cut by the 17:00 close)
//   • 1D = one session · 2D / 3D = groups of weekdays (holidays counted) straight through weekends, count restarting every 1 January
//   • 1W = Monday-Friday trading dates (opens Sunday 17:00) · 1M = sessions whose trading date falls in the month
// Causal by construction: a candle is built only from the minutes inside it; `close_t` lets a consumer tell closed from forming.
import { nyOffsetMs } from '../master/macroMagnet.js'

const MIN = 60000, H = 3600000, DAY = 86400000
export const TFS = ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '3H', '4H', '6H', '9H', '1D', '2D', '3D', '1W', '1M']
const GRID = { '1m': MIN, '3m': 3 * MIN, '5m': 5 * MIN, '15m': 15 * MIN, '30m': 30 * MIN, '1H': H, '2H': 2 * H, '3H': 3 * H, '4H': 4 * H, '6H': 6 * H }
// (2D / 3D need no phase constant: the weekday count restarts every 1 January — measured 2026-10-17.)


/** Trading date (UTC-midnight ms of the New York calendar date the session belongs to) for minute t. */
export function tradingDate(t) { const local = t + nyOffsetMs(t); return Math.floor((local + 7 * H) / DAY) * DAY }
/** UTC ms of 17:00 New York on the evening before trading date d. */
export function sessionStart(d) { const local = d - 7 * H; let t = local + 5 * H; t = local - nyOffsetMs(t); return local - nyOffsetMs(t) }
// weekday calendar (Mon-Fri), counted from Monday 1970-01-05
const MON0 = Date.UTC(1970, 0, 5)
export function weekdayIndex(d) { const days = Math.round((d - MON0) / DAY), w = Math.floor(days / 7), r = days - 7 * w; return w * 5 + Math.min(r, 5) - (r >= 5 ? 1 : 0) }
export function weekdayAt(i) { const w = Math.floor(i / 5), r = i - 5 * w; return MON0 + (w * 7 + r) * DAY }
const firstWeekday = (d) => { const dow = new Date(d).getUTCDay(); return d + (dow === 6 ? 2 : dow === 0 ? 1 : 0) * DAY }
const gridStart = (t, ms) => { const off = nyOffsetMs(t), local = t + off; return Math.floor((local - 17 * H) / ms) * ms + 17 * H - off }

/** TradingView parity cleaning (measured 2026-10-17): Polygon prints a few stray minutes that OANDA/TradingView do not have —
 *  (1) inside the daily 17:00-17:59 New York break (TradingView's 1H has no 17:00 candle) and (2) holiday "stub" sessions
 *  (Christmas, New Year, Good Friday: 1-2 minutes each; TradingView has no candle and does NOT count them for 2D/3D).
 *  Drops break minutes and every trading date with fewer than MIN_SESSION_MINUTES minutes. Returns { bars, dropped }. */
export const MIN_SESSION_MINUTES = 60
export function cleanForTv(m1) {
  const nyHour = (t) => { const local = t + nyOffsetMs(t); return Math.floor((local % DAY + DAY) % DAY / H) }
  const kept = m1.filter((b) => nyHour(b.t) !== 17), per = new Map()
  for (const b of kept) { const d = tradingDate(b.t); per.set(d, (per.get(d) || 0) + 1) }
  const bars = kept.filter((b) => per.get(tradingDate(b.t)) >= MIN_SESSION_MINUTES)
  return { bars, dropped: { break_minutes: m1.length - kept.length, stub_minutes: kept.length - bars.length, stub_sessions: [...per.values()].filter((v) => v < MIN_SESSION_MINUTES).length } }
}

/** The TradingView candle OPEN (UTC ms) of the `tf` candle that holds minute t — the ONE timing rule (candles, footprints, everything).
 *  2D / 3D: TradingView counts every WEEKDAY (holidays included) straight through weekends, RESTARTING the count every 1 January; a candle
 *  is dated by its first weekday's session open even when that weekday had no trading. 1M is dated by the first weekday of the month the
 *  same way. (Measured 2026-10-17.) */
export function candleOpen(t, tf) {
  if (GRID[tf]) return gridStart(t, GRID[tf])
  const d = tradingDate(t)
  if (tf === '9H') { const s = sessionStart(d); return s + Math.floor((t - s) / (9 * H)) * 9 * H }
  if (tf === '1D') return sessionStart(d)
  if (tf === '1W') { const dow = (new Date(d).getUTCDay() + 6) % 7; return sessionStart(d - dow * DAY) }   // Monday's session (opens Sunday 17:00)
  if (tf === '1M') { const x = new Date(d); return sessionStart(firstWeekday(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1))) }
  if (tf === '2D' || tf === '3D') { const N = tf === '2D' ? 2 : 3, y0 = weekdayIndex(firstWeekday(Date.UTC(new Date(d).getUTCFullYear(), 0, 1)))
    return sessionStart(weekdayAt(y0 + Math.floor((weekdayIndex(d) - y0) / N) * N)) }
  throw new Error('nyCandles: unsupported tf ' + tf)
}

/**
 * Build candles for one timeframe from ascending 1m bars (pass them through cleanForTv first for TradingView parity).
 * @returns Array<{ t, o, h, l, c, n, open_t, close_t, td }>  t = candle open (what TradingView shows); td = first trading date inside.
 */
export function buildCandles(m1, tf) {
  if (!TFS.includes(tf)) throw new Error('nyCandles: unsupported tf ' + tf)
  const out = []; let cur = null, curKey = null
  for (const b of m1) { const k = candleOpen(b.t, tf)
    if (cur && k === curKey) { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.n++; cur.close_t = b.t + MIN; continue }
    if (cur) out.push(cur)
    cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, n: 1, open_t: k, close_t: b.t + MIN, td: tradingDate(b.t) }; curKey = k }
  if (cur) out.push(cur)
  return out
}
/** All timeframes in one call, from RAW 1m (cleaned here for TradingView parity). */
export function buildAll(m1, tfs = TFS) { const { bars } = cleanForTv(m1); return Object.fromEntries(tfs.map((tf) => [tf, buildCandles(bars, tf)])) }
