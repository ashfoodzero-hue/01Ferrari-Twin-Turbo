// fetch_calendar.mjs — refresh the USD economic calendar for gold (src/data/calendar.js) → data/calendar/upcoming.json + history.json (2026-10-09).
// run_twin.mjs runs it every 30 min, and again 2 and 6 minutes after every HIGH-impact USD release (to capture the ACTUAL value).
// Each source is independent: one failing source is reported in `sources`, never silently replaced (R0).
// CROSS-CHECK: every FF high-impact CPI / NFP / PPI / FOMC row is matched to the official BLS / Fed time; a disagreement is reported.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { CAL_DIR, fetchForexFactory, fetchFomc, blsEvents, polygonHolidays, retailEvents, fetchFedSpeeches } from '../src/data/calendar.js'

const now = Date.now(), sources = {}
const tryRun = async (name, fn) => { try { const v = await fn(); sources[name] = { ok: true, at: new Date().toISOString(), n: Array.isArray(v) ? v.length : v?.events?.length ?? null }; return v } catch (e) { sources[name] = { ok: false, at: new Date().toISOString(), error: String(e.message).slice(0, 160) }; return null } }
const ff = [...((await tryRun('forexfactory_this_week', () => fetchForexFactory('this'))) ?? []), ...((await tryRun('forexfactory_next_week', () => fetchForexFactory('next'))) ?? [])]
const fomc = (await tryRun('fed_fomc', () => fetchFomc())) ?? []
const bls = blsEvents(); sources.bls_file = { ok: bls.events.length > 0, fetched: bls.fetched, age_days: bls.fetched ? +((now - Date.parse(bls.fetched)) / 86400000).toFixed(1) : null, n: bls.events.length }
const holidays = (await tryRun('polygon_holidays', () => polygonHolidays())) ?? []
const retail = retailEvents(); sources.retail_file = { ok: retail.length > 0, n: retail.length }
const speeches = (await tryRun('fed_speeches', () => fetchFedSpeeches())) ?? []

// cross-check official times against Forex Factory (same release within ±5 min)
const official = [...bls.events.filter((e) => ['CPI', 'NFP', 'PPI'].includes(e.type)), ...fomc].filter((e) => e.t > now - 7 * 86400000 && e.t < now + 14 * 86400000)
const pat = { CPI: /^CPI m\/m/, NFP: /Non-Farm Employment Change/, PPI: /^PPI m\/m/, FOMC: /Federal Funds Rate|FOMC Statement/ }
const crosscheck = official.map((o) => { const m = ff.find((f) => pat[o.type]?.test(f.name) && Math.abs(f.t - o.t) <= 5 * 60000), near = ff.find((f) => pat[o.type]?.test(f.name) && Math.abs(f.t - o.t) < 2 * 86400000)
  return { type: o.type, official_utc: new Date(o.t).toISOString(), ff_utc: m ? new Date(m.t).toISOString() : near ? new Date(near.t).toISOString() : null, agree: !!m, in_ff_window: ff.some((f) => Math.abs(f.t - o.t) < 3 * 86400000) } })

// upcoming = FF USD rows (with actual/forecast/previous) + official events FF lacks (FOMC/BLS beyond FF's two weeks)
const up = ff.filter((e) => e.t >= now - 6 * 3600000).map((e) => ({ ...e, type: Object.entries(pat).find(([, r]) => r.test(e.name))?.[0] ?? null }))
for (const o of [...fomc, ...bls.events].filter((e) => e.t >= now - 6 * 3600000 && e.t <= now + 60 * 86400000)) if (!up.some((u) => Math.abs(u.t - o.t) <= 5 * 60000 && (u.type === o.type || o.type === 'BLS_OTHER'))) up.push({ ...o, actual: null, forecast: null, previous: null })
up.sort((a, b) => a.t - b.t)
fs.mkdirSync(CAL_DIR, { recursive: true })
const write = (f, o) => { fs.writeFileSync(path.join(CAL_DIR, f + '.tmp'), JSON.stringify(o, null, 1)); fs.renameSync(path.join(CAL_DIR, f + '.tmp'), path.join(CAL_DIR, f)) }
write('upcoming.json', { at: new Date(now).toISOString(), scope: 'USD events only (Forex Factory has no XAU rows; USD releases are what move gold)', sources, crosscheck, events: up, holidays })
if (fomc.length || bls.events.length) write('history.json', { at: new Date(now).toISOString(), note: 'official release times (FOMC + Board speeches from the Fed; CPI / NFP / PPI / JOLTS from BLS; Retail Sales from Census/ALFRED) — used by study_event_reaction.mjs', events: [...fomc.map((e) => ({ type: 'FOMC', t: e.t })), ...bls.events.filter((e) => e.type !== 'BLS_OTHER').map((e) => ({ type: e.type, t: e.t })), ...retail.map((e) => ({ type: 'RETAIL', t: e.t })), ...speeches.map((e) => ({ type: e.type, t: e.t, who: e.name }))].sort((a, b) => a.t - b.t) })
const bad = Object.entries(sources).filter(([, v]) => !v.ok).map(([k]) => k), dis = crosscheck.filter((c) => c.in_ff_window && !c.agree)
console.log(`  📅 calendar: ${up.length} upcoming USD events · sources ${bad.length ? 'FAILED: ' + bad.join(', ') : 'all ok'} · cross-check ${crosscheck.filter((c) => c.agree).length}/${crosscheck.filter((c) => c.in_ff_window).length} agree${dis.length ? ' · DISAGREE: ' + dis.map((d) => d.type + ' ' + d.official_utc).join(', ') : ''}`)
