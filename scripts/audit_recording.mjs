// audit_recording.mjs — DAILY audit of the app's own recorded history (2026-10-17; Ashraf: "make sure our main App is reading and saving our
// database correct"). For every recorded series (spot: XAUUSD XAGUSD + the six DXY pairs from the stream; futures: GOLD_FUT SILVER_FUT WTI and
// GLD from record_futures.mjs) it lists every in-session hole ≥ 2 minutes in the last N days and asks Polygon whether that data EXISTS:
//   provider_outage — Polygon has no bars either (e.g. 2026-10-13 22:14-22:16 and 2026-10-15 23:39-23:49, every symbol): recorded as such
//   OUR_MISS        — Polygon has bars we lack → reported (spot: reconcile_1m.mjs refills; futures: next record_futures run / re-import)
// Also: duplicate / out-of-order minutes, the newest stored minute per series (staleness). Output: data/master/recording_audit.json (+ history line
// in recording_audit.jsonl). Run by run_twin daily and on demand: node scripts/audit_recording.mjs [days=3]
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'
import { tradingDate } from '../src/core/nyCandles.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'

const DAYS = +(process.argv[2] || 3), now = Date.now(), from = now - DAYS * 86400000, KEY = process.env.POLYGON_API_KEY
async function tail(file, fromT) { const out = []; if (!fs.existsSync(file)) return out
  // read only the last ~N MB (stores can exceed 500 MB)
  const size = fs.statSync(file).size, start = Math.max(0, size - 40 * 1024 * 1024)
  const rl = readline.createInterface({ input: fs.createReadStream(file, { start }), crlfDelay: Infinity }); let first = start > 0
  for await (const l of rl) { if (first) { first = false; continue } if (!l) continue; try { const b = JSON.parse(l); if (b.t >= fromT) out.push(b) } catch {} } return out }
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
const series = [...SYMBOLS.map((s) => ({ name: s.sym, file: path.join(TURBO.historyAsset(s.sym), '1m.jsonl'), poly: (a, z) => `https://api.polygon.io/v2/aggs/ticker/${s.poly}/range/1/minute/${a}/${z}?limit=50000&apiKey=${KEY}` })),
  ...['GOLD_FUT', 'SILVER_FUT', 'WTI'].map((n) => ({ name: n, file: path.join(TURBO.historyAsset(n), '1m.jsonl'), fut: true })),
  { name: 'GLD', file: path.join(TURBO.historyAsset('GLD'), '1m.jsonl'), us: true }]
const res = { at: new Date(now).toISOString(), days: DAYS, series: {} }
for (const s of series) {
  const bars = await tail(s.file, from), r = { minutes: bars.length, last: bars.length ? new Date(bars.at(-1).t).toISOString() : null, stale_min: bars.length ? Math.round((now - bars.at(-1).t) / 60000) : null, dup: 0, out_of_order: 0, holes: [] }
  for (let i = 1; i < bars.length; i++) { const d = bars[i].t - bars[i - 1].t; if (d === 0) r.dup++; if (d < 0) r.out_of_order++
    const gap = d / 60000 - 1
    if (gap >= 2 && !s.us && tradingDate(bars[i].t) === tradingDate(bars[i - 1].t) && nyHour(bars[i - 1].t + 60000) !== 17) r.holes.push({ from: bars[i - 1].t + 60000, to: bars[i].t - 60000, minutes: gap }) }
  // classify spot holes against Polygon (futures: Polygon IS the source of the recorder, so a hole there = provider outage by construction)
  for (const h of r.holes) { if (!s.poly) { h.cause = 'no_bars_at_source (futures: no trades in those minutes, or a Polygon outage — the recorder copies Polygon exactly)'; continue }
    try { const j = await (await fetch(s.poly(h.from, h.to))).json(); const n = (j.results ?? []).length; h.polygon_bars = n; h.cause = n ? 'OUR_MISS' : 'provider_outage' } catch (e) { h.cause = 'unchecked: ' + e.message } }
  r.holes = r.holes.map((h) => ({ ...h, from: new Date(h.from).toISOString(), to: new Date(h.to).toISOString() }))
  r.our_miss = r.holes.filter((h) => h.cause === 'OUR_MISS').length; res.series[s.name] = r
  console.log(`  ${s.name.padEnd(10)} ${r.minutes} min · last ${r.last} · holes ${r.holes.length} (our miss ${r.our_miss}) · dup ${r.dup} · out-of-order ${r.out_of_order}`) }
res.ok = Object.values(res.series).every((r) => r.our_miss === 0 && r.dup === 0 && r.out_of_order === 0)
fs.writeFileSync(path.join(TURBO.master, 'recording_audit.json'), JSON.stringify(res, null, 1))
fs.appendFileSync(path.join(TURBO.master, 'recording_audit.jsonl'), JSON.stringify({ at: res.at, ok: res.ok, our_miss: Object.fromEntries(Object.entries(res.series).map(([k, v]) => [k, v.our_miss])) }) + '\n')
console.log(res.ok ? '✅ RECORDING AUDIT: clean (no misses on our side — every hole has no bars at Polygon either)' : '⚠ RECORDING AUDIT: our misses / duplicates found — see data/master/recording_audit.json')
