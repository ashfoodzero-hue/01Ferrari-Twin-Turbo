// ════════════════════════════════════════════════════════════════════════════════
// import_history_1m.mjs — Ferrari Twin Turbo: the app's OWN 1-minute history, downloaded fresh from Polygon (2026-10-08).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf 2026-10-08: "import any history u need for the app to use it as separate full App" + "history is built on
// 1m only". Under RED RULE R0 (Polygon live, zero guessing) the history is NOT copied from Turbo2's store (that file
// carries an unexplained 2026-10-04/05 open/close mismatch vs Polygon, and its 15m body is Dukascopy). It is fetched
// month by month from Polygon with the app's own fetcher (src/data/liveFeed.js: pacing, 429 backoff, resilient DNS),
// written to data/history/<SYM>/1m.jsonl, and every month's provenance is recorded in data/history/<SYM>/manifest_1m.json.
// Every higher timeframe is RESAMPLED from this file — no other timeframe is stored.
//
// Resumable: finished months live in data/history/<SYM>/_parts/YYYY-MM.jsonl and are skipped on re-run; the current
// (incomplete) month is always re-fetched. Only CLOSED bars are written (t + 60 s <= fetch time).
// Usage: node scripts/import_history_1m.mjs [SYM,SYM,...] [fromYYYY-MM]
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { fetchAggs, hasLiveKey } from '../src/data/liveFeed.js'
import { pidAlive } from '../src/core/pidAlive.js'

import { ALL_SYMBOLS as SYMBOLS } from '../src/data/symbols.js'
const HISTORY_SYMBOLS = SYMBOLS.filter((x) => x.role !== 'candidate').map((x) => x.sym)   // default = the live set; pass candidates explicitly
const POLY = Object.fromEntries(SYMBOLS.map((x) => [x.sym, x.poly]))
const syms = (process.argv[2] || HISTORY_SYMBOLS.join(',')).split(',')
const [fy, fm] = (process.argv[3] || '2004-01').split('-').map(Number)

// the streamer owns the LIVE symbols' stores — refuse only when a requested symbol is one it writes (research candidates are not streamed)
const streamed = syms.filter((s) => SYMBOLS.find((x) => x.sym === s && x.role !== 'candidate'))
try { const l = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'run_stream.lock'), 'utf8')); if (streamed.length && pidAlive(l.pid)) { console.error(`the tick streamer (pid ${l.pid}) owns the 1m store of ${streamed.join(', ')} — stop it first; the importer reassembles 1m.jsonl from month parts`); process.exit(2) } } catch { /* no streamer */ }
const unknown = syms.filter((s) => !POLY[s]); if (unknown.length) { console.error('unknown symbol(s): ' + unknown.join(', ')); process.exit(1) }
if (!hasLiveKey()) { console.error('POLYGON_API_KEY not set (.env) — R0: no key, no history'); process.exit(1) }
const ym = (y, m) => `${y}-${String(m).padStart(2, '0')}`
const sane = (b) => [b.o, b.h, b.l, b.c].every((x) => Number.isFinite(x) && x > 0) && b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c)

for (const sym of syms) {
  const dir = TURBO.historyAsset(sym), parts = path.join(dir, '_parts'); fs.mkdirSync(parts, { recursive: true })
  const manFile = path.join(dir, 'manifest_1m.json')
  const man = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : { symbol: sym, ticker: POLY[sym], source: 'polygon', endpoint: '/v2/aggs/ticker/{ticker}/range/1/minute/{from}/{to}?adjusted=true', months: {} }
  const now = new Date(); const curKey = ym(now.getUTCFullYear(), now.getUTCMonth() + 1)
  let y = fy, m = fm, fetched = 0, t0 = Date.now()
  while (ym(y, m) <= curKey) {
    const key = ym(y, m), part = path.join(parts, `${key}.jsonl`)
    if (key === curKey || !fs.existsSync(part)) {
      const from = Date.UTC(y, m - 1, 1), to = Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1) - 1
      const fetchedAt = Date.now()
      const raw = await fetchAggs(POLY[sym], '1m', from, Math.min(to, fetchedAt))
      const seen = new Set(); const bars = []; let rejected = 0
      for (const b of raw) {
        if (b.t < from || b.t > to || b.t + 60000 > fetchedAt || seen.has(b.t)) continue
        if (!sane(b)) { rejected++; continue }
        seen.add(b.t); bars.push(b)
      }
      bars.sort((a, b) => a.t - b.t)
      fs.writeFileSync(part + '.tmp', bars.map((b) => JSON.stringify({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })).join('\n') + (bars.length ? '\n' : ''))
      fs.renameSync(part + '.tmp', part)
      man.months[key] = { n: bars.length, rejected_insane: rejected, first: bars[0]?.t ?? null, last: bars.at(-1)?.t ?? null, fetched_utc: new Date(fetchedAt).toISOString(), complete: key !== curKey }
      fetched++
      if (fetched % 12 === 0) { fs.writeFileSync(manFile, JSON.stringify(man, null, 1)); console.log(`  ${sym} … ${key} (${fetched} months, ${((Date.now() - t0) / 1000).toFixed(0)} s)`) }
    }
    m++; if (m > 12) { m = 1; y++ }
  }
  // assemble data/history/<SYM>/1m.jsonl from the month parts (atomic replace), strictly ascending, no duplicates
  const out = path.join(dir, '1m.jsonl'), tmp = out + '.tmp'
  const fd = fs.openSync(tmp, 'w'); let n = 0, last = -Infinity, first = null, disorder = 0
  for (const f of fs.readdirSync(parts).filter((x) => /^\d{4}-\d{2}\.jsonl$/.test(x)).sort()) {
    const txt = fs.readFileSync(path.join(parts, f), 'utf8'); if (!txt) continue
    for (const l of txt.split('\n')) { if (!l) continue; const t = JSON.parse(l).t; if (t <= last) { disorder++; continue } last = t; first ??= t; fs.writeSync(fd, l + '\n'); n++ }
  }
  fs.closeSync(fd); fs.renameSync(tmp, out)
  Object.assign(man, { assembled_utc: new Date().toISOString(), total: n, first: first && new Date(first).toISOString(), last: last > 0 ? new Date(last).toISOString() : null, dropped_out_of_order: disorder,
    note: 'Polygon 1m aggregates only (R0). Higher timeframes are resampled from this file; no other timeframe is stored.' })
  fs.writeFileSync(manFile, JSON.stringify(man, null, 1))
  console.log(`✅ ${sym}: ${n.toLocaleString()} 1m bars ${man.first} → ${man.last} (${fetched} months fetched, ${((Date.now() - t0) / 1000).toFixed(0)} s, out-of-order dropped ${disorder})`)
}
