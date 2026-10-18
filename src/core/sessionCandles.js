// ════════════════════════════════════════════════════════════════════════════════
// sessionCandles.js — TradingView-exact candles for ANY session rule (2026-10-18; Ashraf: "do same exact for Silver, DXY, WTI" + "i need both
// [DXY on the gold grid and on TradingView's DXY session], and make sure that we can do the analysis and comparison perfectly at later stage").
// The gold rule (nyCandles.js) generalised; with SESSIONS.gold it must reproduce nyCandles EXACTLY (smoke_session_candles proves it).
// ────────────────────────────────────────────────────────────────────────────────
// Session rules MEASURED from Ashraf's TradingView (candle open times per timeframe, read over CDP 2026-10-18):
//   gold   (OANDA:XAUUSD / XAGUSD): every session opens 17:00 New York, daily break 17:00-17:59 dropped
//   cme    (NYMEX:CL1!)          : every session opens 18:00 New York (Globex), break 17:00-17:59 (no trades)
//   dxyIce (TVC:DXY)             : sessions open 19:00 New York; the WEEK's first (Monday) session opens Sunday 17:00; no break (TradingView
//                                  has minutes 17:00-18:59 on weekdays — they belong to the session still running)
// A session's intraday grid (1m … 6H, 9H) is counted from its own start; 1D = one session; 2D / 3D = weekday groups restarting every 1 January;
// 1W = the Monday session's start; 1M = the start of the first weekday's session.
// ════════════════════════════════════════════════════════════════════════════════
import { nyOffsetMs } from '../master/macroMagnet.js'
import { isNyseHoliday, easterSunday } from './usHolidays.js'

const MIN = 60000, H = 3600000, DAY = 86400000
export const SESSIONS = Object.freeze({
  gold: { name: 'gold', open: 17, mondayOpen: 17, breakHour: 17 },
  cme: { name: 'cme', open: 18, mondayOpen: 18, breakHour: 17, holidayMerge: true, count2D3D: 'tradingDays', monthByTradingDay: true },
  // TVC:DXY's holiday calendar CHANGED over the years (measured from its daily candles 2017-10 → 2026-10): 2018-22 every US holiday skipped;
  // 2023 only Jan 2; 2024-25 Good Friday + Christmas + New Year; 2026 New Year only. The measured list wins inside its range; after it,
  // Christmas + New Year (the always-closed days) are the default.
  dxyIce: { name: 'dxyIce', open: 19, mondayOpen: 17, breakHour: null, dropFullClosures: true, goodFridayTrades: true, monthByTradingDay: true, count2D3D: 'sessionDays', closedDatesTo: '2026-10-16',
    closedDates: ['2017-11-23', '2017-12-25', '2018-01-01', '2018-01-15', '2018-02-19', '2018-03-30', '2018-05-28', '2018-07-04', '2018-09-03', '2018-11-22', '2018-12-25', '2019-01-01', '2019-01-21', '2019-02-18',
      '2019-04-19', '2019-05-27', '2019-07-04', '2019-09-02', '2019-11-28', '2019-12-25', '2020-01-01', '2020-01-20', '2020-02-17', '2020-04-10', '2020-05-25', '2020-07-03', '2020-09-07', '2020-11-26', '2020-12-25',
      '2021-01-01', '2021-01-18', '2021-02-15', '2021-04-02', '2021-05-31', '2021-07-05', '2021-09-06', '2021-11-25', '2021-12-24', '2022-01-17', '2022-02-21', '2022-04-15', '2022-05-30', '2022-06-20', '2022-07-04',
      '2022-09-05', '2022-11-24', '2022-12-26', '2023-01-02', '2023-12-25', '2024-01-01', '2024-03-29', '2024-12-25', '2025-01-01', '2025-04-18', '2025-12-25', '2026-01-01'] },
})
export const TFS = ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '3H', '4H', '6H', '9H', '1D', '2D', '3D', '1W', '1M']
const GRID = { '1m': MIN, '3m': 3 * MIN, '5m': 5 * MIN, '15m': 15 * MIN, '30m': 30 * MIN, '1H': H, '2H': 2 * H, '3H': 3 * H, '4H': 4 * H, '6H': 6 * H, '9H': 9 * H }
const MON0 = Date.UTC(1970, 0, 5)
const weekdayIndex = (d) => { const days = Math.round((d - MON0) / DAY), w = Math.floor(days / 7), r = days - 7 * w; return w * 5 + Math.min(r, 5) - (r >= 5 ? 1 : 0) }
const weekdayAt = (i) => { const w = Math.floor(i / 5), r = i - 5 * w; return MON0 + (w * 7 + r) * DAY }
const firstWeekday = (d) => { const dow = new Date(d).getUTCDay(); return d + (dow === 6 ? 2 : dow === 0 ? 1 : 0) * DAY }
/** UTC ms of hh:00 New York on the calendar date `day` (UTC-midnight ms of that NY date). */
const nyAt = (day, hh) => { const local = day + hh * H; let t = local - nyOffsetMs(local); t = local - nyOffsetMs(t); return t }

// day calendars for 2D / 3D counting: weekdays minus the days `isOff` removes, indexed from 1970 — cached per (calendar, year)
function makeDayCalendar(isOff) {
  const cache = new Map()
  const ofYear = (y) => { if (!cache.has(y)) { const out = []; for (let d = Date.UTC(y, 0, 1); d < Date.UTC(y + 1, 0, 1); d += DAY) { const w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6 && !isOff(d)) out.push(d) } cache.set(y, out) } return cache.get(y) }
  const index = (d) => { const y = new Date(d).getUTCFullYear(); let n = 0; for (let k = 1970; k < y; k++) n += ofYear(k).length; const list = ofYear(y); let i = 0; while (i < list.length && list[i] < d) i++; return n + i }
  const at = (i) => { let y = 1970; while (i >= ofYear(y).length) { i -= ofYear(y).length; y++ } return ofYear(y)[i] }
  const first = (d) => { let x = d; while ([0, 6].includes(new Date(x).getUTCDay()) || isOff(x)) x += DAY; return x }
  return { index, at, first }
}
const NYSE_DAYS = makeDayCalendar(isNyseHoliday)
export function makeSession(spec) {
  const nyHour = (t) => { const local = t + nyOffsetMs(t); return Math.floor(((local % DAY) + DAY) % DAY / H) }
  /** Trading date (UTC-midnight ms of the NY date the session belongs to). A Sunday date (Sunday-evening open) belongs to Monday. */
  // FULL CLOSURES (Christmas, New Year, Good Friday — measured on CL1!): no abbreviated session, nothing to merge; the next session simply starts
  // that evening. Other US holidays (MLK, Presidents, Memorial, Juneteenth, July 4, Labor, Thanksgiving) have an abbreviated session that MERGES.
  const closedSet = spec.closedDates ? new Set(spec.closedDates.map((s) => Date.parse(s + 'T00:00:00Z'))) : null, closedTo = spec.closedDatesTo ? Date.parse(spec.closedDatesTo + 'T00:00:00Z') : -Infinity
  const fullClosure = (d) => { if (closedSet && d <= closedTo) return closedSet.has(d)   // a MEASURED calendar wins inside its range
    if (!isNyseHoliday(d)) return false; const x = new Date(d), m = x.getUTCMonth() + 1, day = x.getUTCDate()
    return (m === 12 && day >= 24 && day <= 26) || (m === 1 && day <= 2) || (m === 12 && day === 31) || (!spec.goodFridayTrades && d === easterSunday(x.getUTCFullYear()) - 2 * DAY) }
  const hol = (d) => !!spec.holidayMerge && isNyseHoliday(d) && !fullClosure(d)
  function tradingDate(t) {
    const local = t + nyOffsetMs(t), cal = Math.floor(local / DAY) * DAY, hm = local - cal, dow = new Date(cal).getUTCDay()
    const openToday = dow === 0 ? spec.mondayOpen : spec.open
    let d = hm >= openToday * H ? cal + DAY : cal          // from the open on, the NEXT date (Sunday evening → Monday); a Saturday / Sunday date = weekend
    // HOLIDAY MERGE (cme / dxyIce, measured vs TradingView): an exchange holiday is not a trading date — its minutes join the next trading date
    while (hol(d)) { d += DAY; const w = new Date(d).getUTCDay(); if (w === 6) d += 2 * DAY; else if (w === 0) d += DAY }
    return d
  }
  /** Start (UTC ms) of the session of trading date d: the evening before the first day of its (holiday-merged) span; Sunday → mondayOpen. */
  function sessionStart(d) {
    let s = d - DAY
    for (;;) { const w = new Date(s).getUTCDay()
      if (hol(s) || w === 6) { s -= DAY; continue }
      if (w === 0 && hol(s - 2 * DAY)) { s -= 2 * DAY; continue }     // a Friday holiday session merges into Monday → that span starts Thursday evening
      break }
    return nyAt(s, new Date(s).getUTCDay() === 0 ? spec.mondayOpen : spec.open)
  }
  // 2D / 3D day count (measured per instrument): 'weekdays' (holidays counted — gold) · 'tradingDays' (NYSE holidays skipped — CL1!) ·
  // 'sessionDays' (only the days the session itself drops — TVC:DXY skips Christmas / New Year, counts MLK etc.). Months start at that calendar's first day.
  const CAL = spec.count2D3D === 'tradingDays' ? NYSE_DAYS : spec.count2D3D === 'sessionDays' ? makeDayCalendar((x) => !!spec.dropFullClosures && fullClosure(x)) : null
  const MONTH_CAL = CAL ?? (spec.monthByTradingDay ? NYSE_DAYS : null)
  // the ACTUAL session start containing t, ignoring holiday merges (9H restarts there — measured on CL1! around Thanksgiving)
  function naturalStart(t) { const local = t + nyOffsetMs(t), cal = Math.floor(local / DAY) * DAY, dow = new Date(cal).getUTCDay(), oh = dow === 0 ? spec.mondayOpen : spec.open
    const day = local - cal >= oh * H ? cal : cal - DAY, w = new Date(day).getUTCDay(); return nyAt(day, w === 0 ? spec.mondayOpen : spec.open) }
  function candleOpen(t, tf) {
    const d = tradingDate(t), ss = sessionStart(d)
    if (tf === '9H' && spec.holidayMerge) { const ns = Math.max(ss, naturalStart(t)); return ns + Math.floor((t - ns) / GRID[tf]) * GRID[tf] }
    if (GRID[tf]) return ss + Math.floor((t - ss) / GRID[tf]) * GRID[tf]
    if (tf === '1D') return ss
    if (tf === '1W') { const dow = (new Date(d).getUTCDay() + 6) % 7; let m = d - dow * DAY            // the week starts at the session of its FIRST OPEN day
      while (spec.dropFullClosures && fullClosure(m) && m < d) m += DAY                                  // (TVC:DXY skipping a Monday holiday → Monday 19:00)
      return sessionStart(m) }
    if (tf === '1M') { const x = new Date(d), m0 = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1); return sessionStart(spec.monthByTradingDay && MONTH_CAL ? MONTH_CAL.first(m0) : firstWeekday(m0)) }
    if (tf === '2D' || tf === '3D') { const N = tf === '2D' ? 2 : 3, j1 = Date.UTC(new Date(d).getUTCFullYear(), 0, 1)
      if (CAL) { const y0 = CAL.index(CAL.first(j1)); return sessionStart(CAL.at(y0 + Math.floor((CAL.index(d) - y0) / N) * N)) }
      const y0 = weekdayIndex(firstWeekday(j1)); return sessionStart(weekdayAt(y0 + Math.floor((weekdayIndex(d) - y0) / N) * N)) }
    throw new Error('sessionCandles: unsupported tf ' + tf)
  }
  /** TradingView parity cleaning: weekend trading dates dropped, the break hour dropped (if the session has one), sessions < 60 minutes dropped. */
  function clean(m1, { realVolume = false } = {}) {
    const wk = (t) => { const d = tradingDate(t), w = new Date(d).getUTCDay(); return w === 0 || w === 6 || (spec.dropFullClosures && fullClosure(d)) }   // dxyIce: TradingView shows no Christmas / New Year session
    const a = m1.filter((b) => !wk(b.t)), kept = spec.breakHour == null ? a : a.filter((b) => nyHour(b.t) !== spec.breakHour), per = new Map()
    for (const b of kept) { const d = tradingDate(b.t); per.set(d, (per.get(d) || 0) + 1) }
    const bars = kept.filter((b) => per.get(tradingDate(b.t)) >= 60).map((b) => (realVolume ? { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v ?? 0, ...(b.tk ? { tk: b.tk } : {}) } : { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c }))
    return { bars, dropped: { weekend_minutes: m1.length - a.length, break_minutes: a.length - kept.length, stub_minutes: kept.length - bars.length } }
  }
  function buildCandles(m1, tf) {
    const out = []; let cur = null
    for (const b of m1) { const k = candleOpen(b.t, tf)
      if (cur && k === cur.t) { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.n++; cur.close_t = b.t + MIN; if (b.v != null) cur.v += b.v; if (b.tk && b.tk !== cur.tk) { cur.roll = true; cur.tk = b.tk } continue }
      if (cur) out.push(cur)
      cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, n: 1, open_t: k, close_t: b.t + MIN, td: tradingDate(b.t), ...(b.v != null ? { v: b.v } : {}), ...(b.tk ? { tk: b.tk, roll: false } : {}) } }
    if (cur) out.push(cur)
    return out
  }
  return { spec, tradingDate, sessionStart, candleOpen, clean, buildCandles }
}
