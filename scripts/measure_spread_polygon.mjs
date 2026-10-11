// ════════════════════════════════════════════════════════════════════════════════
// measure_spread_polygon.mjs — gold's bid/ask spread MEASURED from Polygon's historical quotes (2026-10-08, R0).
// ────────────────────────────────────────────────────────────────────────────────
// WHY: the twin's bars are BID bars (tick parity 35/35), so every order that fills against the ASK must clear the
// spread. The old cost model ASSUMED a session half-spread (0.13-0.45). This measures it: for every year 2013→2026,
// every month, every UTC hour, one sample minute (the 2nd Wednesday of the month, hh:30) is fetched from
// /v3/quotes/C:XAUUSD and its quotes' spreads (ask − bid) summarised. Output: data/master/spread_table.json with
// per (year, hour) the median of the monthly minute-medians + p75 + n, and per year/overall rollups.
// SAMPLING (stated, not hidden): one weekday minute per (month, hour) — Wednesdays avoid the Monday open / Friday close;
// the live streamer's quotes_1m.jsonl measures every minute going forward and is the check on this table.
// Usage: node scripts/measure_spread_polygon.mjs [fromYear] [toYear]
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'

const KEY = polygonKey(); if (!KEY) { console.error('no POLYGON_API_KEY'); process.exit(1) }
const Y0 = +(process.argv[2] || 2013), Y1 = +(process.argv[3] || new Date().getUTCFullYear())
// MEASURED 2026-10-08: Polygon's quote archive carries only ~2-3 quotes/minute in 2021-2025 (~150 in other years), so a 1-minute
// sample is too thin there. SPREAD_WIN_MIN widens each sample window (same hours/days); re-run those years with 10.
const WIN_MIN = +(process.env.SPREAD_WIN_MIN || 1)
const OUT = path.join(TURBO.master, 'spread_table.json'), RAW = path.join(TURBO.master, 'spread_samples.jsonl')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)] }
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] }
const secondWednesday = (y, m) => { const d = new Date(Date.UTC(y, m, 1)); const off = (3 - d.getUTCDay() + 7) % 7; return Date.UTC(y, m, 1 + off + 7) }

const done = new Set(fs.existsSync(RAW) ? fs.readFileSync(RAW, 'utf8').trim().split('\n').filter(Boolean).map((l) => { const x = JSON.parse(l); return `${x.y}-${x.m}-${x.h}` }) : [])
let last = 0, calls = 0
for (let y = Y0; y <= Y1; y++) for (let m = 0; m < 12; m++) {
  const day = secondWednesday(y, m); if (day > Date.now() - 2 * 86400000) continue
  if (y === 2013 && m < 7) continue                                       // continuous Polygon gold starts 2013-07-14
  for (let h = 0; h < 24; h++) {
    if (done.has(`${y}-${m}-${h}`)) continue
    const t0 = day + h * 3600000 + 30 * 60000
    const wait = last + 260 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now()
    let j = null
    for (let a = 0; a < 3 && !j; a++) {
      try { const r = await fetchJsonResilient(`https://api.polygon.io/v3/quotes/C:XAUUSD?timestamp.gte=${t0 * 1e6}&timestamp.lt=${(t0 + WIN_MIN * 60000) * 1e6}&limit=1000&order=asc&apiKey=${KEY}`, { timeoutMs: 15000 }); if (r.status === 429) { await sleep(10000); continue } j = r.json } catch { await sleep(3000) }
    }
    calls++
    const sp = (j?.results ?? []).map((q) => q.ask_price - q.bid_price).filter((x) => Number.isFinite(x) && x >= 0)
    fs.appendFileSync(RAW, JSON.stringify({ y, m, h, t: t0, win_min: WIN_MIN, n: sp.length, med: med(sp), p75: pct(sp, 0.75), max: sp.length ? Math.max(...sp) : null }) + '\n')
    if (calls % 200 === 0) console.log(`  ${y}-${String(m + 1).padStart(2, '0')} h${h} (${calls} samples)`)
  }
}
// ── summarise ──
const rows = fs.readFileSync(RAW, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.n >= 5 && r.med != null)
const table = {}; const byYear = {}; const byHour = {}
for (const r of rows) {
  ((table[r.y] ??= {})[r.h] ??= []).push(r.med); (byYear[r.y] ??= []).push(r.med); (byHour[r.h] ??= []).push(r.med)
}
const sum = (a) => ({ median: +med(a).toFixed(4), p75: +pct(a, 0.75).toFixed(4), n: a.length })
const out = { generated_utc: new Date().toISOString(), source: 'polygon /v3/quotes/C:XAUUSD', unit: 'USD full spread (ask − bid)',
  sampling: 'one window starting hh:30 per (2nd Wednesday of each month, UTC hour) — 1 minute, or 10 minutes for 2021-2025 where the quote archive is thin (win_min per sample); statistic = median of the window-medians; samples with < 5 quotes dropped', samples: rows.length,
  dropped_thin: fs.readFileSync(RAW, 'utf8').trim().split('\n').length - rows.length,
  by_year_hour: Object.fromEntries(Object.entries(table).map(([y, hs]) => [y, Object.fromEntries(Object.entries(hs).map(([h, a]) => [h, sum(a)]))])),
  by_year: Object.fromEntries(Object.entries(byYear).map(([y, a]) => [y, sum(a)])),
  by_hour: Object.fromEntries(Object.entries(byHour).map(([h, a]) => [h, sum(a)])) }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(`✅ ${rows.length} samples → ${OUT}`); console.log('by year (median full spread $):', Object.entries(out.by_year).map(([y, s]) => `${y}:${s.median}`).join(' '))
console.log('by hour:', Object.entries(out.by_hour).map(([h, s]) => `${h}:${s.median}`).join(' '))
