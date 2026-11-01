// gdelt_events.mjs — GEOPOLITICS layer from the GDELT 1.0 DAILY EVENT FILES (2026-11-01; Ashraf: "Use GPR + GDELT" after ACLED refused API data to a
// Gmail account = Open level). The static files at data.gdeltproject.org/events/ have no request budget (the doc API is throttled per address, and Turbo 2's
// live news backfill spends that budget daily) and a dated archive from 2013-04 → history AND daily collection from ONE builder.
// One row per day: events re-reported that day, counted by country (where it happened = ActionGeo) and by country pair (actor → actor):
//   q[0..3] = CAMEO QuadClass 1 verbal cooperation · 2 material cooperation · 3 VERBAL conflict (words: threats, demands, accusations) · 4 MATERIAL conflict (actions)
//   r = root codes 13 threaten · 14 protest · 15 force posture (troop / ship moves) · 16 reduce relations · 17 coerce (sanctions, arrests) · 18 assault · 19 fight · 20 mass violence
//   a = articles (attention), aq4 = articles about material conflict, g = mean Goldstein (−10 conflict … +10 cooperation), tone = mean article tone
// Only FRESH events count (event date ≥ file day − 7): GDELT re-codes years-old events when an article mentions them; they are counted in stale only.
// known_t: a day's file is published the next morning (measured 2026-11-01: 20261031 file Last-Modified 2026-11-01 07:00:06 UTC). Archive files carry 2014
// re-upload dates, so history uses the RULE known_t = day + 1 at 08:00 UTC (one hour after the measured publish time); new days also keep last_modified.
// GDELT's source coverage grows over the years: use shares / own-history z-scores in studies, never raw counts across years.
// Usage: node scripts/research/geo/gdelt_events.mjs [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--par=4]   (no --from = catch up after the last stored day)
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../../../src/core/paths.js'

export const GEO_DIR = path.join(TURBO.root, 'data', 'research', 'geo'), OUT = path.join(GEO_DIR, 'gdelt_events_daily.jsonl')
// watch list: ActionGeo uses FIPS 10-4, actors use ISO 3 → one key (ISO 3); Gaza + West Bank = PSE
const FIPS = { IR: 'IRN', IS: 'ISR', SA: 'SAU', YM: 'YEM', IZ: 'IRQ', SY: 'SYR', LE: 'LBN', JO: 'JOR', EG: 'EGY', QA: 'QAT', AE: 'ARE', KU: 'KWT', MU: 'OMN', BA: 'BHR',
  GZ: 'PSE', WE: 'PSE', RS: 'RUS', UP: 'UKR', CH: 'CHN', TW: 'TWN', KN: 'PRK', KS: 'KOR', PK: 'PAK', IN: 'IND', TU: 'TUR', VE: 'VEN', LY: 'LBY', US: 'USA' }
const ISO = new Set(Object.values(FIPS))
const ROOTS = ['13', '14', '15', '16', '17', '18', '19', '20']
const C = { SQLDATE: 1, A1C: 7, A2C: 17, ROOT: 28, QUAD: 29, GOLD: 30, ART: 33, TONE: 34, GEO: 51, ADDED: 56 }   // GDELT 1.0 export (58 columns since 2013-04-01)

/** The one file of a single-entry zip, via its central directory (sizes are there even when the local header defers them). */
export function unzipOne(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--
  if (e < 0) throw new Error('zip: no end record')
  const cd = buf.readUInt32LE(e + 16); if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error('zip: bad central directory')
  const method = buf.readUInt16LE(cd + 10), csize = buf.readUInt32LE(cd + 20), usize = buf.readUInt32LE(cd + 24), loc = buf.readUInt32LE(cd + 42)
  const data = buf.subarray(loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28)).subarray(0, csize)
  const out = method === 0 ? data : zlib.inflateRawSync(data); if (out.length !== usize) throw new Error(`zip: size ${out.length} ≠ ${usize}`)
  return out }

const blank = () => ({ n: 0, a: 0, aq4: 0, q: [0, 0, 0, 0], r: Object.fromEntries(ROOTS.map((k) => [k, 0])), gs: 0, ts: 0 })
function add(b, root, quad, gold, art, tone) { b.n++; b.a += art; b.q[quad - 1]++; if (quad === 4) b.aq4 += art; if (root in b.r) b.r[root]++; b.gs += gold; b.ts += tone }
const fin = (b) => { const { gs, ts, ...o } = b; return { ...o, g: b.n ? +(gs / b.n).toFixed(3) : null, tone: b.n ? +(ts / b.n).toFixed(3) : null } }

/** Aggregate one day's export text (pure: used by the smoke test). */
export function aggregateDay(day, text) {
  const ymd = day.replaceAll('-', ''), freshFrom = +new Date(Date.parse(day) - 7 * 86400000).toISOString().slice(0, 10).replaceAll('-', '')
  const world = blank(), by = {}, dy = {}; let rows = 0, bad = 0, stale = 0, other_day = 0
  for (const line of text.split('\n')) { if (!line) continue; rows++
    const f = line.split('\t'); if (f.length !== 58) { bad++; continue }
    if (f[C.ADDED] !== ymd) { other_day++; continue }
    if (+f[C.SQLDATE] < freshFrom) { stale++; continue }
    const quad = +f[C.QUAD], gold = +f[C.GOLD], art = +f[C.ART] || 0, tone = +f[C.TONE] || 0, root = f[C.ROOT]
    if (!(quad >= 1 && quad <= 4) || !Number.isFinite(gold)) { bad++; continue }
    add(world, root, quad, gold, art, tone)
    const g = FIPS[f[C.GEO]]; if (g) add(by[g] ??= blank(), root, quad, gold, art, tone)
    const a1 = f[C.A1C], a2 = f[C.A2C]
    if (quad >= 3 && ISO.has(a1) && ISO.has(a2) && a1 !== a2) add(dy[`${a1}>${a2}`] ??= blank(), root, quad, gold, art, tone) }
  return { day, rows, bad, stale, other_day, world: fin(world), by_country: Object.fromEntries(Object.entries(by).sort().map(([k, v]) => [k, fin(v)])),
    dyads: Object.fromEntries(Object.entries(dy).sort().map(([k, v]) => [k, fin(v)])) } }

async function fetchDay(day) {
  const url = `https://data.gdeltproject.org/events/${day.replaceAll('-', '')}.export.CSV.zip`
  for (let k = 0; k < 3; k++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (FerrariTwinTurbo research)' }, signal: AbortSignal.timeout(120000) })
      if (r.status === 404) return { day, missing: true, status: 404 }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      const known = new Date(Date.parse(day) + 32 * 3600000).toISOString()   // day + 1 at 08:00 UTC (header comment)
      return { ...aggregateDay(day, unzipOne(buf).toString('utf8')), file: url, zip_bytes: buf.length, last_modified: r.headers.get('last-modified'), fetched_at: new Date().toISOString(), known_t: known }
    } catch (e) { if (k === 2) return { day, error: String(e.cause?.code || e.message).slice(0, 120) }; await new Promise((s) => setTimeout(s, 10000 * (k + 1))) } } }

/** Stored rows, one per day (last write wins). */
export function loadGdeltDays() { if (!fs.existsSync(OUT)) return new Map()
  const m = new Map(); for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) if (l) { const r = JSON.parse(l); m.set(r.day, r) } return m }

const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10)
/** Fetch every day from..to not yet stored (a 404 older than 3 days is stored as missing; a recent 404 = not published yet → retried next run). */
export async function catchUp({ from, to, par = 4 } = {}) {
  fs.mkdirSync(GEO_DIR, { recursive: true })
  const have = loadGdeltDays(), today = new Date().toISOString().slice(0, 10)
  to ??= addDays(today, -1); from ??= have.size ? addDays([...have.keys()].sort().at(-1), 1) : addDays(to, -6)
  const days = []; for (let d = from; d <= to; d = addDays(d, 1)) { const h = have.get(d); if (!h || h.error) days.push(d) }
  const sum = { from, to, asked: days.length, stored: 0, missing: 0, not_yet: [], errors: {} }
  for (let i = 0; i < days.length; i += par) {
    const got = await Promise.all(days.slice(i, i + par).map(fetchDay))
    for (const r of got) {
      if (r.error) { sum.errors[r.day] = r.error; continue }
      if (r.missing && r.day >= addDays(today, -3)) { sum.not_yet.push(r.day); continue }
      fs.appendFileSync(OUT, JSON.stringify(r) + '\n'); r.missing ? sum.missing++ : sum.stored++ }
    if (days.length > 20 && (i / par) % 25 === 0) console.log(`gdelt_events ${days[i]} … ${sum.stored} stored, ${sum.missing} missing, ${Object.keys(sum.errors).length} errors`) }
  return sum }

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').split('=')[1]
  const sum = await catchUp({ from: arg('from'), to: arg('to'), par: +(arg('par') ?? 4) })
  console.log(JSON.stringify(sum))
  process.exit(Object.keys(sum.errors).length ? 1 : 0) }
