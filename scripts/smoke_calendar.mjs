// smoke_calendar.mjs — the USD economic calendar (src/data/calendar.js + fetch_calendar.mjs) and the gold event-reaction study.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { etToUtc, blsEvents, mergeHistory } from '../src/data/calendar.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), J = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8'))
console.log('\n██ USD CALENDAR SMOKE ██')
await ok('ET → UTC follows US daylight saving (never a fixed offset)', () => {
  assert.equal(new Date(etToUtc(2026, 10, 14, 8, 30)).toISOString(), '2026-10-14T12:30:00.000Z')   // EDT
  assert.equal(new Date(etToUtc(2026, 12, 10, 8, 30)).toISOString(), '2026-12-10T13:30:00.000Z')   // EST
  assert.equal(new Date(etToUtc(2017, 2, 1, 14, 0)).toISOString(), '2017-02-01T19:00:00.000Z')
})
await ok('history: FOMC 8 decisions every full year 2013-2026 (2020: 7, March replaced by an emergency cut); BLS CPI/NFP/PPI/JOLTS ≥ 160 each', () => {
  const H = J('data', 'calendar', 'history.json').events, y = {}; for (const e of H.filter((x) => x.type === 'FOMC')) { const k = new Date(e.t).getUTCFullYear(); y[k] = (y[k] || 0) + 1 }
  for (let k = 2013; k <= 2026; k++) assert.equal(y[k], k === 2020 ? 7 : 8, 'FOMC ' + k)
  for (const t of ['CPI', 'NFP', 'PPI', 'JOLTS']) assert(H.filter((x) => x.type === t).length >= 160, t)
  assert(blsEvents().fetched, 'BLS file provenance')
})
await ok('upcoming: USD only, every source reported, official times agree with Forex Factory', () => {
  const U = J('data', 'calendar', 'upcoming.json'); assert(U.events.every((e) => e.src !== 'FF' || e.currency === undefined))
  for (const k of ['forexfactory_this_week', 'forexfactory_next_week', 'fed_fomc', 'bls_file', 'polygon_holidays']) assert(k in U.sources, k)
  for (const c of U.crosscheck.filter((x) => x.in_ff_window)) assert(c.agree, 'FF and official time disagree for ' + c.type + ' ' + c.official_utc)
})
await ok('event-reaction study: verdicts follow the pre-registered rule; FOMC is the biggest mover (measured, not assumed)', () => {
  const S = J('data', 'master', 'event_reaction_study.json')
  for (const r of Object.values(S.results)) { const p = r.persistence; assert.equal(p.verdict, p.oos.n >= 40 && p.oos.lb > 0.5 && p.train.share > 0.5 && p.money_oos.net_lb > 0 ? 'PERSISTS' : 'DOES_NOT_PERSIST') }
  assert(S.results.FOMC.size.median_ratio_60m > S.results.CPI.size.median_ratio_60m)
})
await ok('Retail Sales + Fed speeches: ALFRED-derived releases include every Census-scheduled date; speech times are ET (Waller 2026-10-08 4:30 AM ET = 08:30 UTC, as Forex Factory); the study measures all 8 types', () => {
  const R = J('data', 'calendar', 'retail_sales_releases.json'), rel = R.releases.split(',')
  for (const d of ['2025-11-25', '2025-12-16', '2026-01-14', '2026-02-10', '2026-03-06', '2026-04-01', '2026-04-21', '2026-05-14', '2026-06-17', '2026-07-16', '2026-08-14', '2026-09-16']) assert(rel.includes(d), 'Census date missing ' + d)
  assert(!rel.includes('2025-04-25') && !rel.includes('2026-08-01'), 'a revision vintage leaked in')
  const H = J('data', 'calendar', 'history.json').events
  assert(H.filter((e) => e.type === 'RETAIL').length >= 160 && H.filter((e) => e.type === 'FED_CHAIR').length > 100 && H.filter((e) => e.type === 'FED_GOV').length > 500)
  assert(H.some((e) => e.type === 'FED_GOV' && e.t === Date.parse('2026-10-08T08:30:00Z') && /Waller/.test(e.who)), 'Waller 10-08 08:30 UTC')
  const S = J('data', 'master', 'event_reaction_study.json'); for (const t of ['RETAIL', 'FED_CHAIR', 'FED_GOV']) assert(S.results[t]?.events > 50, t)
})
await ok('history merge (bug 2026-10-17): a failed Fed source keeps every FOMC decision + speech from the previous file; fresh sources replace theirs; all fail → unchanged', () => {
  const prev = [{ type: 'FOMC', t: 1 }, { type: 'FED_GOV', t: 2, who: 'W' }, { type: 'CPI', t: 3 }, { type: 'RETAIL', t: 4 }, { type: 'FED_CHAIR', t: 5, who: 'P' }]
  const a = mergeHistory(prev, { bls: [{ type: 'CPI', t: 30 }, { type: 'BLS_OTHER', t: 31 }], retail: [{ t: 40 }] })   // Fed site down (as at 17:59 UTC)
  assert.deepEqual(a.kept, ['fed_fomc', 'fed_speeches']); assert.deepEqual(a.events.map((e) => e.type + e.t), ['FOMC1', 'FED_GOV2', 'FED_CHAIR5', 'CPI30', 'RETAIL40'])
  const b = mergeHistory(prev, { fomc: [{ t: 10 }], bls: [{ type: 'NFP', t: 20 }], retail: [{ t: 40 }], speeches: [{ type: 'FED_GOV', t: 50, name: 'X speaks' }] })
  assert.deepEqual(b.kept, []); assert.deepEqual(b.events.map((e) => e.type + e.t), ['FOMC10', 'NFP20', 'RETAIL40', 'FED_GOV50']); assert.equal(b.events[3].who, 'X speaks')
  const c = mergeHistory(prev, {}); assert.deepEqual(c.events.map((e) => e.t), [1, 2, 3, 4, 5]); assert.equal(c.kept.length, 4)
})
console.log(process.exitCode ? '✗ USD CALENDAR SMOKE FAILED' : `✅ USD CALENDAR SMOKE: ${n} passed, 0 failed`)
