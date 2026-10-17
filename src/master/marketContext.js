// marketContext.js — the NEWS + MACRO + CALENDAR context of any candle, as it was KNOWN at the time (2026-10-17; Ashraf: "make sure we also have
// the news and macros at the same time of the candles reading at each time frame at the same dates"). ONE place that decides WHEN a value
// becomes known — the study never sees a number before it was published.
// Sources (all on disk, see docs/DATA_CONTRACT.md):
//   calendar  data/calendar/history.json      official release TIMES (Fed, BLS, Census) 2013+ — the time authority
//             data/calendar/ff_history.jsonl  Forex Factory USD events with actual / forecast / previous / impact 2013+ (+ upcoming.json)
//   news      data/news/polygon_news.jsonl    Polygon gold-ticker news (GLD IAU GDX NEM SLV) — the archive starts 2020-03 (none earlier)
//   macro     data/macro/*.json               Polygon /fed/v1 series by REFERENCE date
// KNOWN-AT rules (conservative, stated):
//   treasury yields (date D)          → known from the session AFTER the next one (sessionStart of trading date D+2): Treasury publishes after
//                                        the D close; one extra day removes any publication-time doubt
//   CPI (reference month M)           → known at the first official CPI release after month M ends (calendar history, 08:30 ET)
//   labour market (reference month M) → known at the first official NFP release after month M ends
//   inflation expectations (month M)  → known from the first day of month M+1 (Cleveland Fed publishes mid-month M; M+1 is certain)
//   a calendar event                  → its forecast/previous are known BEFORE it; its actual only from its release time t
//   a news item                       → from its published_utc
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'
import { sessionStart } from '../core/nyCandles.js'

const DAY = 86400000
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const readL = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) } catch { return [] } }
const ym = (s) => { const [y, m] = s.split('-').map(Number); return Date.UTC(y, m - 1, 1) }
const firstAfter = (sorted, t) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= t) lo = m + 1; else hi = m } return lo < sorted.length ? sorted[lo] : null }

/** Load every context source once. Returns an object for contextFor(). */
export function loadContext(dataDir = TURBO.data) {
  const cal = readJ(path.join(dataDir, 'calendar', 'history.json'))?.events ?? []
  const ff = readL(path.join(dataDir, 'calendar', 'ff_history.jsonl'))
  // TIME AUTHORITY (audit 2026-10-17): Forex Factory occasionally logs a release minutes late (PPI 2021-04-09 at 12:56 vs the official 12:30;
  // JOLTS 2016-08-10 at 14:03 vs 14:00). An FF event that belongs to an official release (matching name within 60 min) takes the OFFICIAL time;
  // every FF event sharing that FF timestamp (the same release batch, e.g. Unemployment Rate with NFP) moves with it. `t_ff` keeps the original.
  const RE = { CPI: /CPI/, NFP: /^Non-Farm Employment Change$/, PPI: /PPI/, RETAIL: /Retail Sales/, JOLTS: /JOLTS/, FOMC: /Federal Funds Rate|FOMC Statement/ }
  const fix = new Map()
  for (const o of cal) { const re = RE[o.type]; if (!re) continue
    const m = ff.filter((f) => re.test(f.name) && Math.abs(f.t - o.t) <= 3600000).sort((a, b) => Math.abs(a.t - o.t) - Math.abs(b.t - o.t))[0]
    if (m && m.t !== o.t) fix.set(m.t, o.t) }
  for (const f of ff) { f.t_ff = f.t; if (fix.has(f.t)) f.t = fix.get(f.t) }
  ff.sort((a, b) => a.t - b.t)
  const news = readL(path.join(dataDir, 'news', 'polygon_news.jsonl')).sort((a, b) => a.t - b.t)
  const rel = (type) => cal.filter((e) => e.type === type).map((e) => e.t).sort((a, b) => a - b)
  const cpiRel = rel('CPI'), nfpRel = rel('NFP')
  const macro = {}
  const mk = (name, rows, knownAt) => { macro[name] = rows.map((r) => ({ ...r, known_t: knownAt(r) })).filter((r) => r.known_t != null).sort((a, b) => a.known_t - b.known_t) }
  const yields = readJ(path.join(dataDir, 'macro', 'treasury-yields.json'))?.rows ?? []
  mk('yields', yields, (r) => sessionStart(Date.parse(r.date) + 2 * DAY))
  mk('cpi', readJ(path.join(dataDir, 'macro', 'inflation.json'))?.rows ?? [], (r) => { const M = ym(r.date), end = Date.UTC(new Date(M).getUTCFullYear(), new Date(M).getUTCMonth() + 1, 1); return firstAfter(cpiRel, end) })
  mk('labor', readJ(path.join(dataDir, 'macro', 'labor-market.json'))?.rows ?? [], (r) => { const M = ym(r.date), end = Date.UTC(new Date(M).getUTCFullYear(), new Date(M).getUTCMonth() + 1, 1); return firstAfter(nfpRel, end) })
  mk('infl_expect', readJ(path.join(dataDir, 'macro', 'inflation-expectations.json'))?.rows ?? [], (r) => { const M = ym(r.date); return Date.UTC(new Date(M).getUTCFullYear(), new Date(M).getUTCMonth() + 1, 1) })
  return { cal, ff, news, macro, coverage: { calendar_from: cal.length ? new Date(Math.min(...cal.map((e) => e.t))).toISOString() : null, ff_events: ff.length, ff_from: ff[0] ? new Date(ff[0].t).toISOString() : null, news: news.length, news_from: news[0]?.published_utc ?? null } }
}
const range = (arr, a, z) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < a) lo = m + 1; else hi = m } const out = []; for (let i = lo; i < arr.length && arr[i].t < z; i++) out.push(arr[i]); return out }
const asOf = (rows, T) => { let lo = 0, hi = rows.length; while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m].known_t <= T) lo = m + 1; else hi = m } return lo ? rows[lo - 1] : null }

/**
 * Context of the window [a, z) — e.g. one candle (a = open, z = close). Macro = the latest values KNOWN at `a` (the candle's open) AND at `z`.
 * @returns { events: FF events inside (with actual — known at their t), official: calendar releases inside, news: headlines inside,
 *            macro_at_open: { yields, cpi, labor, infl_expect }, macro_at_close: {…}, coverage: { news: bool } }
 */
export function contextFor(ctx, a, z) {
  const m = (T) => Object.fromEntries(Object.entries(ctx.macro).map(([k, rows]) => [k, asOf(rows, T)]))
  return {
    events: range(ctx.ff, a, z),
    official: ctx.cal.filter((e) => e.t >= a && e.t < z),
    news: range(ctx.news, a, z),
    macro_at_open: m(a), macro_at_close: m(z),
    coverage: { news: ctx.news.length > 0 && a >= ctx.news[0].t, ff: ctx.ff.length > 0 && a >= ctx.ff[0].t },
  }
}
