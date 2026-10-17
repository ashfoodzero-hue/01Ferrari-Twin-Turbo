// import_gld_1m.mjs — GLD (SPDR Gold Shares ETF) 1m bars with REAL exchange volume, the full window our Polygon stocks plan allows (≈ 2 years,
// measured 2026-10-17: 2024-10-01 open) (2026-10-17; Ashraf: "use the last 2 years from Polygon … real exchange volume (futures / GLD ETF)").
// US equity hours incl. extended (Polygon v2 aggregates). Context/volume only — the trade target stays spot XAUUSD.
// Output: data/history/GLD/1m.jsonl { t, o, h, l, c, v, vw, n } + manifest_1m.json. Re-runnable (rebuilds the file).
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const KEY = process.env.POLYGON_API_KEY, sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = [], start = Date.UTC(2024, 9, 1), now = Date.now()
for (let m = start; m < now;) { const d = new Date(m), next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
  const a = d.toISOString().slice(0, 10), z = new Date(Math.min(next, now) - 86400000).toISOString().slice(0, 10)
  let url = `https://api.polygon.io/v2/aggs/ticker/GLD/range/1/minute/${a}/${z}?adjusted=true&sort=asc&limit=50000&apiKey=${KEY}`, k = 0
  while (url) { const r = await fetch(url); if (r.status === 429) { await sleep(15000); continue } const j = await r.json(); if (!r.ok) throw new Error(`GLD ${a}: HTTP ${r.status} ${j.message ?? ''}`)
    for (const x of j.results ?? []) out.push({ t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v, vw: x.vw ?? null, n: x.n ?? null }); k += j.results?.length ?? 0
    url = j.next_url ? j.next_url + '&apiKey=' + KEY : null; await sleep(250) }
  console.log(`  GLD ${a.slice(0, 7)}: ${k} bars`); m = next }
out.sort((a, b) => a.t - b.t); const seen = new Set(), clean = out.filter((b) => !seen.has(b.t) && seen.add(b.t))
const dir = TURBO.historyAsset('GLD'); fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, '1m.jsonl.tmp'), clean.map((b) => JSON.stringify(b)).join('\n') + '\n'); fs.renameSync(path.join(dir, '1m.jsonl.tmp'), path.join(dir, '1m.jsonl'))
fs.writeFileSync(path.join(dir, 'manifest_1m.json'), JSON.stringify({ symbol: 'GLD', source: 'polygon /v2/aggs GLD 1 minute (adjusted, incl. extended hours)', note: 'REAL exchange volume (shares). Context only; the trade target is spot XAUUSD.', first: new Date(clean[0].t).toISOString(), last: new Date(clean.at(-1).t).toISOString(), bars: clean.length, generated_utc: new Date().toISOString() }, null, 1))
console.log(`✅ GLD: ${clean.length.toLocaleString()} 1m bars ${new Date(clean[0].t).toISOString()} → ${new Date(clean.at(-1).t).toISOString()}`)
