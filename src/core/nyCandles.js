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
// REOPEN CLAMP (2026-10-18; Ashraf: "Measure 2 rules, keep best"). At the 18:00 New York reopen the bid spread blows out for a few minutes and
// Polygon's bid prints dip / spike (e.g. 2026-03-26 22:01Z low 4297.44 vs TradingView 4375). Measured vs TradingView on 1 year of reopen candles,
// > $2 off: 15m 123/226 as stored → 39 clamped (31 dropped); 1H 115 → 39 (39); 4H 99 → 38 (38); 5m 50/75 → 37 (dropping deletes all 75
// candles). Rule kept: the minutes 18:00-18:04 NY are CLAMPED to the low / high range of the next 10 non-reopen minutes (within 16 min).
// Uses later minutes → TradingView-style STUDY candles only (opt in: reopenClamp: true). The live signal feed (loadBars) stays raw = causal.
const NY_HM = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const reopenMinute = (t) => { const p = NY_HM.formatToParts(new Date(t)); const h = +p.find((x) => x.type === 'hour').value % 24, m = +p.find((x) => x.type === 'minute').value; return h === 18 && m < 5 }
export function clampReopen(bars) {   // exported: series_1m applies it to non-gold sessions where measured
  let n = 0
  for (let i = 0; i < bars.length; i++) { const b = bars[i]; if (!reopenMinute(b.t)) continue
    let lo = Infinity, hi = -Infinity, k = 0
    for (let j = i + 1; j < bars.length && bars[j].t < b.t + 16 * 60000 && k < 10; j++) { if (reopenMinute(bars[j].t)) continue; lo = Math.min(lo, bars[j].l); hi = Math.max(hi, bars[j].h); k++ }
    if (!k) continue
    const cl = (x) => Math.min(hi, Math.max(lo, x)), o = cl(b.o), c = cl(b.c), h = Math.max(cl(b.h), o, c), l = Math.min(cl(b.l), o, c)
    if (o !== b.o || c !== b.c || h !== b.h || l !== b.l) { bars[i] = { ...b, o, h, l, c }; n++ } }
  return n
}
export function cleanForTv(m1, { realVolume = false, keepBreakHour = false, reopenClamp = false, keepLastDate = false } = {}) {   // keepBreakHour: GLD (US extended hours trade 17:00-18:00 New York)
  const nyHour = (t) => { const local = t + nyOffsetMs(t); return Math.floor((local % DAY + DAY) % DAY / H) }
  // NO WEEKEND SESSIONS (2026-10-18, audit_timeframes.mjs): a minute whose trading date is a Saturday or Sunday belongs to no TradingView candle
  // (Polygon prints Sunday-afternoon quotes before the 18:00 New York open on some weeks; GLD trades Friday 18:00-20:00 ET). Kept, they formed
  // 1M / 3H / 4H / 6H candles outside their own window (USDCAD, USDCHF, GLD). Dropped and counted (dropped.weekend_minutes).
  const wkd = (t) => { const d = new Date(tradingDate(t)).getUTCDay(); return d === 0 || d === 6 }
  const noWeekend = m1.filter((b) => !wkd(b.t)), weekendMinutes = m1.length - noWeekend.length
  const kept = keepBreakHour ? noWeekend : noWeekend.filter((b) => nyHour(b.t) !== 17), per = new Map()
  for (const b of kept) { const d = tradingDate(b.t); per.set(d, (per.get(d) || 0) + 1) }
  // SPOT `v` IS NOT VOLUME (audit 2026-10-17): it is Polygon's quote/tick count and Polygon's own spot-gold quote feed thinned ~100× in
  // 2021-2025 (14:00-15:00 UTC: 18-35 k quotes/h in 2014-19, 150-200 in 2021-25, 12.7 k in 2026). It is DROPPED here so no study can read it
  // as volume. Real volume = GOLD_FUT (Polygon CME) / Databento footprints / GLD — 2024-10 onward only (Ashraf: no purchase for older years).
  // realVolume: true ONLY for exchange series (GOLD_FUT, SILVER_FUT, WTI, GLD) — keeps their real `v` and contract `tk`.
  // keepLastDate (2026-10-19, LIVE use only): the forming session has < 60 minutes for its whole first hour; dropping it as a "stub" hid every
  // session's first hour from the live jobs (trendline alerts, S/R refresh). History / studies keep the default (holiday stubs dropped).
  const lastD = keepLastDate && kept.length ? tradingDate(kept.at(-1).t) : null
  const bars = kept.filter((b) => per.get(tradingDate(b.t)) >= MIN_SESSION_MINUTES || tradingDate(b.t) === lastD).map((b) => realVolume ? { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v ?? 0, ...(b.tk ? { tk: b.tk } : {}) } : { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c })
  const reopenClamped = reopenClamp ? clampReopen(bars) : 0
  return { bars, dropped: { reopen_clamped: reopenClamped, weekend_minutes: weekendMinutes, break_minutes: noWeekend.length - kept.length, stub_minutes: kept.length - bars.length, stub_sessions: [...per.values()].filter((v) => v < MIN_SESSION_MINUTES).length } }
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
  // real volume (exchange series only — spot bars carry no `v` after cleanForTv) is summed; a candle spanning a contract change is `roll: true`
  for (const b of m1) { const k = candleOpen(b.t, tf)
    if (cur && k === curKey) { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.n++; cur.close_t = b.t + MIN
      if (b.v != null) cur.v += b.v; if (b.tk && b.tk !== cur.tk) { cur.roll = true; cur.tk = b.tk }; continue }
    if (cur) out.push(cur)
    cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, n: 1, open_t: k, close_t: b.t + MIN, td: tradingDate(b.t), ...(b.v != null ? { v: b.v } : {}), ...(b.tk ? { tk: b.tk, roll: false } : {}) }; curKey = k }
  if (cur) out.push(cur)
  return out
}
/** All timeframes in one call, from RAW 1m (cleaned here for TradingView parity). */
export function buildAll(m1, tfs = TFS) { const { bars } = cleanForTv(m1); return Object.fromEntries(tfs.map((tf) => [tf, buildCandles(bars, tf)])) }
