// ════════════════════════════════════════════════════════════════════════════════
// calendar.js — the ECONOMIC CALENDAR for gold, USD only (2026-10-09; Ashraf: "options 1 … also polygon … check also forex factory, only
// the data related for XAU and USD"). ONE module: the fetcher (scripts/fetch_calendar.mjs), the event study, the chart.
// ────────────────────────────────────────────────────────────────────────────────
// SOURCES (each measured 2026-10-09):
//   Forex Factory  www.forexfactory.com/calendar[?week=next] — the page embeds every event as JSON: UTC `dateline`, currency, impact
//                  (low/medium/high/holiday), actual / forecast / previous. USD rows only (FF has no XAU events). Polled gently
//                  (the JSON feed nfs.faireconomy.media rate-limits with 429).
//   Fed            federalreserve.gov/monetarypolicy/fomccalendars.htm (2021 → next year) + fomchistorical{YYYY}.htm (2013-2020):
//                  meeting dates; the decision = the LAST day, statement 14:00 ET (since 2013).
//   BLS            data/calendar/bls_releases.json — saved via the browser (BLS returns 403 to automated clients): 13 y of CPI / NFP /
//                  PPI / JOLTS dates + the upcoming .ics schedule. 08:30 ET (JOLTS 10:00 ET).
//   Polygon        /v1/marketstatus/upcoming — US market holidays and early closes.
// Times are converted ET → UTC with the America/New_York rules (DST-aware) — never a fixed offset.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { TURBO } from '../core/paths.js'
import { polygonKey } from './liveFeed.js'
import { fetchJsonResilient } from './netResolve.js'

export const CAL_DIR = path.join(TURBO.root, 'data', 'calendar')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** month number from a full or abbreviated name ('Feb', 'Sept', 'November') — the Fed writes two-month meetings as 'Jan/Feb 31-1' */
const monthNo = (w) => MONTHS.findIndex((m) => m.slice(0, 3).toLowerCase() === String(w).slice(0, 3).toLowerCase()) + 1

/** America/New_York wall time → UTC ms (DST-aware, by Intl). */
export function etToUtc(y, mo, d, hh, mm) {
  const guess = Date.UTC(y, mo - 1, d, hh + 5, mm)
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(new Date(guess)).map((x) => [x.type, x.value]))
  const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute)
  return guess + (Date.UTC(y, mo - 1, d, hh, mm) - shown)
}

// RESILIENT (2026-10-19, Ashraf: "we need to solve issues of stales never happen again"): the Fed site failed ONE attempt now and then (fetch failed /
// HTTP 406 on 10-17, 10-18, 10-19 08:09 + 11:59) and each blip raised a 30-min DATA WARNING. Now: up to `attempts` tries (backoff 2 s, 6 s), the right
// Accept header per resource (the speeches JSON was asked for as text/html → 406), then curl (another network stack) as the last try.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getText(url, { accept = 'text/html', attempts = 3, timeoutMs = 20000 } = {}) {
  let last = { status: 0, text: '' }
  for (let k = 0; k < attempts; k++) {
    if (k) await sleep(k === 1 ? 2000 : 6000)
    const c = new AbortController(), t = setTimeout(() => c.abort(), timeoutMs)
    try { const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: c.signal }); last = { status: r.status, text: r.ok ? await r.text() : '' }; if (r.ok) return last }
    catch { last = { status: 0, text: '' } } finally { clearTimeout(t) }
  }
  const viaCurl = await curlText(url); return viaCurl.status === 200 ? viaCurl : last
}

// Forex Factory answers Node's built-in fetch with 403 (bot protection on its TLS fingerprint) but serves curl — measured 2026-10-09.
const CURL = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'curl.exe') : 'curl'
const curlText = (url) => new Promise((resolve) => execFile(CURL, ['-s', '-L', '--max-time', '25', '-A', UA, '-w', '\n%{http_code}', url], { maxBuffer: 16 << 20, windowsHide: true },
  (err, stdout) => { const s = String(stdout || ''), i = s.lastIndexOf('\n'); resolve({ status: err ? 0 : +s.slice(i + 1), text: s.slice(0, i) }) }))

/** Forex Factory week → USD events [{ src:'FF', id, t, name, impact, actual, forecast, previous }] (deduped). */
export async function fetchForexFactory(week = 'this') {   // week: 'this' | 'next' | an FF week key such as 'mar3.2014' (history backfill, 2026-10-17)
  const { status, text } = await curlText('https://www.forexfactory.com/calendar' + (week === 'next' ? '?week=next' : week === 'this' ? '' : '?week=' + week))
  if (status !== 200) throw new Error('Forex Factory HTTP ' + status)
  const seen = new Set(), out = []
  for (const m of text.matchAll(/\{"id":\d+,"ebaseId".*?\}(?=,\{"id"|\])/g)) {
    let e; try { e = JSON.parse(m[0]) } catch { continue }
    if (e.currency !== 'USD' || seen.has(e.id) || !e.dateline) continue; seen.add(e.id)
    out.push({ src: 'FF', id: e.id, t: e.dateline * 1000, name: e.name, impact: e.impactName, timeMasked: !!e.timeMasked, actual: e.actual || null, forecast: e.forecast || null, previous: e.previous || null, revision: e.revision || null, better: e.actualBetterWorse || 0 })
  }
  if (!out.length) throw new Error('Forex Factory: no USD events parsed (page layout changed?)')
  return out.sort((a, b) => a.t - b.t)
}

/** FOMC decisions (statement 14:00 ET on the last meeting day) from the Fed's calendar pages. */
export async function fetchFomc({ historyFrom = 2013 } = {}) {
  const out = []
  const cur = await getText('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'); if (cur.status !== 200) throw new Error('Fed calendar HTTP ' + cur.status)
  const panels = cur.text.split(/<h4><a id="\d+">/).slice(1)
  for (const p of panels) { const y = +(p.match(/^(\d{4}) FOMC Meetings/) || [])[1]; if (!y) continue
    for (const m of p.matchAll(/fomc-meeting__month[^>]*><strong>(\w+)(?:\/(\w+))?<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([^<]+)</g)) {
      const mon2 = m[2] || m[1], dates = m[3].trim(), lastDay = +(dates.match(/(\d+)\D*$/) || [])[1], mo = monthNo(mon2)
      if (!(mo > 0 && lastDay > 0) || /notation|unscheduled/i.test(dates)) continue
      out.push({ src: 'FED', type: 'FOMC', name: 'FOMC rate decision' + (dates.includes('*') ? ' + projections & press conference' : ''), t: etToUtc(y, mo, lastDay, 14, 0), impact: 'high' }) } }
  for (let y = historyFrom; y <= 2020; y++) {
    const h = await getText(`https://www.federalreserve.gov/monetarypolicy/fomchistorical${y}.htm`, { attempts: 2 }); if (h.status !== 200) continue
    for (const m of h.text.matchAll(/([A-Z][a-z]{2,8})(?:\/([A-Z][a-z]{2,8}))? (\d+)(?:-(\d+))? Meeting - (\d{4})/g)) {
      const mo = monthNo(m[2] || m[1]), d = +(m[4] || m[3]); if (!(mo > 0)) continue; out.push({ src: 'FED', type: 'FOMC', name: 'FOMC rate decision', t: etToUtc(+m[5], mo, d, 14, 0), impact: 'high' }) } }
  const seen = new Set(); return out.filter((e) => !seen.has(e.t) && seen.add(e.t)).sort((a, b) => a.t - b.t)
}

/** BLS releases from the browser-saved file: history (CPI/NFP/PPI/JOLTS) + upcoming (.ics). */
export function blsEvents() {
  const f = path.join(CAL_DIR, 'bls_releases.json'); if (!fs.existsSync(f)) return { events: [], fetched: null }
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), out = []
  for (const [type, list] of Object.entries(j.history)) { const [hh, mm] = j.release_time_et[type].split(':').map(Number)
    for (const d of list.split(',')) out.push({ src: 'BLS', type, name: { CPI: 'CPI', NFP: 'Employment Situation (NFP)', PPI: 'PPI', JOLTS: 'JOLTS' }[type], t: etToUtc(+d.slice(0, 4), +d.slice(4, 6), +d.slice(6, 8), hh, mm), impact: type === 'JOLTS' ? 'medium' : 'high' }) }
  for (const row of j.upcoming_from_ics) { const [d, name] = row.split('|'), t = etToUtc(+d.slice(0, 4), +d.slice(4, 6), +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13))
    const type = /^Consumer Price Index/.test(name) ? 'CPI' : /^Employment Situation$/.test(name) ? 'NFP' : /^Producer Price Index/.test(name) ? 'PPI' : /^JOLTS/.test(name) ? 'JOLTS' : 'BLS_OTHER'
    if (!out.some((e) => e.t === t && (e.type === type || e.name.startsWith(name.slice(0, 3))))) out.push({ src: 'BLS', type, name, t, impact: ['CPI', 'NFP', 'PPI'].includes(type) ? 'high' : 'medium' }) }
  return { events: out.sort((a, b) => a.t - b.t), fetched: j.fetched_utc }
}

/** Polygon: upcoming US market holidays / early closes. */
export async function polygonHolidays() {
  const r = await fetchJsonResilient(`https://api.polygon.io/v1/marketstatus/upcoming?apiKey=${polygonKey()}`, { timeoutMs: 10000 })
  const seen = new Set(); return (Array.isArray(r.json) ? r.json : []).filter((x) => x.exchange === 'NYSE' && !seen.has(x.date) && seen.add(x.date)).map((x) => ({ src: 'POLYGON', date: x.date, name: x.name, status: x.status, open: x.open ?? null, close: x.close ?? null }))
}

/** Retail Sales (Census advance report, 08:30 ET) — release dates from data/calendar/retail_sales_releases.json (ALFRED new-month vintages). */
export function retailEvents() {
  const f = path.join(CAL_DIR, 'retail_sales_releases.json'); if (!fs.existsSync(f)) return []
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), [hh, mm] = j.release_time_et.split(':').map(Number)
  return [...j.releases.split(','), ...(j.upcoming ? j.upcoming.split(',') : [])].map((d) => ({ src: 'CENSUS', type: 'RETAIL', name: 'Retail Sales', t: etToUtc(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10), hh, mm), impact: 'high' }))
}

/** history.json events MERGED per source (bug 2026-10-17: one Fed-site failure — fetch failed / HTTP 406 — rewrote history without every FOMC
 *  decision and Fed speech, 2003 → 836 events). fresh = { fomc, bls, retail, speeches } (raw source rows); a source with no rows keeps ITS types
 *  from prev. Returns { events (sorted), kept: [source names kept from prev] }. ONE place: fetch_calendar.mjs + smoke_calendar.mjs. */
export const HISTORY_SOURCES = Object.freeze({ fed_fomc: ['FOMC'], bls_file: ['CPI', 'NFP', 'PPI', 'JOLTS'], retail_file: ['RETAIL'], fed_speeches: ['FED_CHAIR', 'FED_GOV'] })
export function mergeHistory(prev, { fomc = [], bls = [], retail = [], speeches = [] }) {
  const fresh = { fed_fomc: fomc.map((e) => ({ type: 'FOMC', t: e.t })), bls_file: bls.filter((e) => e.type !== 'BLS_OTHER').map((e) => ({ type: e.type, t: e.t })),
    retail_file: retail.map((e) => ({ type: 'RETAIL', t: e.t })), fed_speeches: speeches.map((e) => ({ type: e.type, t: e.t, who: e.name })) }
  const kept = [], events = []
  for (const [src, types] of Object.entries(HISTORY_SOURCES)) { if (fresh[src].length) events.push(...fresh[src]); else { kept.push(src); events.push(...prev.filter((e) => types.includes(e.type))) } }
  return { events: events.sort((a, b) => a.t - b.t), kept }
}

/** Fed Board speeches (Chair / Vice Chairs / Governors) with their start time — federalreserve.gov/json/ne-speeches.json (times are ET:
 *  measured 2026-10-09 against Forex Factory UTC, 2/2 agree). Entries without a time are dropped (never guessed). */
export async function fetchFedSpeeches() {
  const { status, text } = await getText('https://www.federalreserve.gov/json/ne-speeches.json', { accept: 'application/json, */*' }); if (status !== 200) throw new Error('Fed speeches HTTP ' + status)
  const out = []
  for (const x of JSON.parse(text.replace(/^\uFEFF/, ''))) {
    const m = String(x.d).match(/^(\d+)\/(\d+)\/(\d{4}) (\d+):(\d+):\d+ (AM|PM)$/); if (!m) continue
    const h = (+m[4] % 12) + (m[6] === 'PM' ? 12 : 0), s = String(x.s || '')
    const type = /^Chair(man)?\b/.test(s) ? 'FED_CHAIR' : /^(Vice Chair|Governor)\b/.test(s) ? 'FED_GOV' : null; if (!type) continue
    out.push({ src: 'FED', type, name: s.replace(/&[a-z]+;/g, '') + ' speaks', t: etToUtc(+m[3], +m[1], +m[2], h, +m[5]), impact: type === 'FED_CHAIR' ? 'high' : 'medium' })
  }
  return out.sort((a, b) => a.t - b.t)
}
