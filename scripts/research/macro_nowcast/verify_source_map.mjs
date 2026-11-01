// Source Map v1 (2026-11-01): checks every candidate leaf source before it is named in the map.
// FRED: exists, frequency, first observation, ALFRED vintage count since 2013-07 + first vintage. Other sites: reachable (HTTP status) only.
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'
const KEY = process.env.FRED_API_KEY
const FRED = process.argv.slice(2).length ? process.argv.slice(2) : JSON.parse(fs.readFileSync(0, 'utf8')).fred
const OUT = path.join(TURBO.root, 'data', 'research', 'macro_nowcast', 'inputs', '2026-11-01_source_map_fred_check.json')
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
for (const id of FRED) {
  try {
    const s = await (await fetch(`https://api.stlouisfed.org/fred/series?series_id=${id}&api_key=${KEY}&file_type=json`)).json()
    if (!s.seriess?.length) { out[id] = { ok: false, why: s.error_message ?? 'not found' }; continue }
    const v = await (await fetch(`https://api.stlouisfed.org/fred/series/vintagedates?series_id=${id}&api_key=${KEY}&file_type=json&realtime_start=2013-07-01&limit=10000`)).json()
    const x = s.seriess[0]
    out[id] = { ok: true, title: x.title, freq: x.frequency_short, start: x.observation_start, end: x.observation_end, vintages: v.vintage_dates?.length ?? 0, first_vintage: v.vintage_dates?.[0] ?? null }
  } catch (e) { out[id] = { ok: false, why: String(e) } }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
for (const [k, v] of Object.entries(out).filter(([k]) => FRED.includes(k))) console.log(k, v.ok ? `${v.freq} ${v.start}→${v.end} vint ${v.vintages} (${v.first_vintage}) | ${v.title}` : 'MISSING ' + v.why)
