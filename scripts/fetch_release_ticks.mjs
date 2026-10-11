// fetch_release_ticks.mjs — historical XAU tick QUOTES (bid / ask) around every FOMC / NFP / CPI release (2026-10-09).
// For study_release_bracket_ticks.mjs: 1m bars cannot order a fill and a stop inside the release minute; real ticks can, and carry the REAL
// release spread. Source: Polygon /v3/quotes/C:XAU-USD (measured available on our plan back to 2015). Window: T−2 min … T+30 min.
// Cache: data/calendar/release_ticks/<TYPE>_<ISO>.json = { t0, t1, n, q: [[ms, bid, ask], …] } (sorted by time). Re-runnable (skips cached).
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'

const DIR = path.join(TURBO.root, 'data', 'calendar', 'release_ticks'), TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.parse('2013-07-28')
const H = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events.filter((e) => ['FOMC', 'NFP', 'CPI'].includes(e.type) && e.t >= FROM && e.t + 3600000 <= TO)
fs.mkdirSync(DIR, { recursive: true })
let done = 0, skipped = 0, empty = 0
for (const e of H) {
  const f = path.join(DIR, `${e.type}_${new Date(e.t).toISOString().replace(/[:.]/g, '-')}.json`); if (fs.existsSync(f)) { skipped++; continue }
  const t0 = e.t - 2 * 60000, t1 = e.t + 30 * 60000, q = []
  let url = `https://api.polygon.io/v3/quotes/C:XAU-USD?timestamp.gte=${t0 * 1e6}&timestamp.lt=${t1 * 1e6}&limit=50000&sort=timestamp.asc&apiKey=${polygonKey()}`
  for (let page = 0; page < 40 && url; page++) {
    const r = await fetchJsonResilient(url, { timeoutMs: 30000 }); if (!r.json) throw new Error(`no JSON for ${e.type} ${new Date(e.t).toISOString()}`)
    for (const x of r.json.results ?? []) { const ts = Math.round((x.participant_timestamp ?? x.sip_timestamp) / 1e6); if (x.bid_price > 0 && x.ask_price > 0) q.push([ts, x.bid_price, x.ask_price]) }
    url = r.json.next_url ? r.json.next_url + (r.json.next_url.includes('apiKey=') ? '' : `&apiKey=${polygonKey()}`) : null
  }
  q.sort((a, b) => a[0] - b[0]); if (!q.length) empty++
  fs.writeFileSync(f, JSON.stringify({ type: e.type, t: e.t, t0, t1, n: q.length, source: 'polygon /v3/quotes/C:XAU-USD', q }))
  if (++done % 25 === 0) console.log(`  ${done} fetched…`)
}
console.log(`release ticks: ${H.length} events · fetched ${done} · cached before ${skipped} · empty ${empty}`)
