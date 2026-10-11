// ════════════════════════════════════════════════════════════════════════════════
// usHolidays.js — the NYSE holiday calendar, once (2026-09-08).
// ────────────────────────────────────────────────────────────────────────────────
// ORIGIN: data_flow_healthcheck raised 23 "GLD daily stale" alerts through the night after US Labor Day. Its
// expectation knew weekends but not holidays: after a Monday holiday the newest EXPECTED daily bar was computed as
// Monday's, while the newest bar that can exist is Friday's (72 h apart) — a 26-h "one missed session" allowance
// cannot cover that. The gamma collector's "US session open" window had the same gap. Every US-market-hours
// expectation in the app reads THIS calendar; a rule that exists twice will drift.
// Rules (NYSE): New Year's Day, Martin Luther King Jr. Day (3rd Mon Jan), Presidents' Day (3rd Mon Feb), Good
// Friday (Easter − 2), Memorial Day (last Mon May), Juneteenth (Jun 19), Independence Day (Jul 4), Labor Day
// (1st Mon Sep), Thanksgiving (4th Thu Nov), Christmas (Dec 25). Fixed-date holidays falling on Saturday are
// observed Friday, on Sunday observed Monday (NYSE does not observe a Saturday New Year's Day on the prior Friday —
// the Dec 31 exception is encoded).
// ════════════════════════════════════════════════════════════════════════════════

const DAY = 86400000
const utc = (y, m, d) => Date.UTC(y, m - 1, d)
const nthWeekday = (y, m, dow, n) => { const first = new Date(utc(y, m, 1)).getUTCDay(); const d = 1 + ((dow - first + 7) % 7) + (n - 1) * 7; return utc(y, m, d) }
const lastWeekday = (y, m, dow) => { const last = new Date(utc(y, m + 1, 0)); const d = last.getUTCDate() - ((last.getUTCDay() - dow + 7) % 7); return utc(y, m, d) }
/** Anonymous Gregorian algorithm — Easter Sunday (UTC midnight) for year y. */
export function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return utc(y, month, day)
}
/** Observed date of a fixed holiday: Saturday → Friday, Sunday → Monday (NYSE rule; a Saturday Jan 1 is NOT observed on Dec 31). */
function observed(y, m, d) {
  const t = utc(y, m, d), dow = new Date(t).getUTCDay()
  if (dow === 6) return (m === 1 && d === 1) ? null : t - DAY
  if (dow === 0) return t + DAY
  return t
}
/** Sorted list of NYSE full-day closures for year y, as UTC-midnight timestamps. */
export function nyseHolidays(y) {
  const list = [
    observed(y, 1, 1), nthWeekday(y, 1, 1, 3), nthWeekday(y, 2, 1, 3), easterSunday(y) - 2 * DAY, lastWeekday(y, 5, 1),
    observed(y, 6, 19), observed(y, 7, 4), nthWeekday(y, 9, 1, 1), nthWeekday(y, 11, 4, 4), observed(y, 12, 25),
  ].filter((t) => t != null)
  return [...new Set(list)].sort((a, b) => a - b)
}
const _cache = new Map()
/** Is the UTC calendar date of `ms` a full-day NYSE closure? (weekends are NOT holidays — check them separately) */
export function isNyseHoliday(ms) {
  const d = new Date(ms), y = d.getUTCFullYear(), key = utc(y, d.getUTCMonth() + 1, d.getUTCDate())
  if (!_cache.has(y)) _cache.set(y, new Set(nyseHolidays(y)))
  return _cache.get(y).has(key)
}
/** A US equity trading day: a weekday that is not a NYSE holiday (UTC calendar date of `ms`). */
export function isUsTradingDay(ms) { const dow = new Date(ms).getUTCDay(); return dow >= 1 && dow <= 5 && !isNyseHoliday(ms) }
