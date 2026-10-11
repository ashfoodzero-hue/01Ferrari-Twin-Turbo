// reconcile_1m.mjs — nightly: the twin's 1m store vs Polygon's CURRENT 1m bars (2026-10-08, R0). Polygon re-issues minutes (late quotes,
// whole ranges — measured); the store is append-only, so every minute Polygon now serves differently gets a CORRECTION line
// (src/data/corrections.js, ver 'reconcile'); minutes missing on either side are REPORTED, never invented. Window: the last N days up to
// 15 minutes ago (the newest minutes belong to the streamer's own late re-check). Output: data/master/reconcile_1m.json.
// Run by run_twin.mjs at 00:20 UTC; by hand: node scripts/reconcile_1m.mjs [days=2]
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, correctionsFile } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'
import { loadBars } from '../src/data/backfillReader.js'
import { fetchAggs } from '../src/data/liveFeed.js'
import { diffMinutes, appendCorrection } from '../src/data/corrections.js'

const DAYS = +(process.argv[2] || 2), now = Date.now(), to = Math.floor((now - 15 * 60000) / 60000) * 60000 - 1, from = Math.floor((now - DAYS * 86400000) / 60000) * 60000
const out = { at: new Date(now).toISOString(), window: [new Date(from).toISOString(), new Date(to).toISOString()], symbols: {} }
for (const s of SYMBOLS) {
  try {
    const store = (await loadBars(s.sym, '1m', { from, to })).bars
    const rest = (await fetchAggs(s.poly, '1m', from, to)).filter((b) => b.t >= from && b.t <= to)
    const d = diffMinutes(store, rest)
    for (const c of d.corrections) appendCorrection(correctionsFile(s.sym), c, { src: 'rest', ver: 'reconcile' })
    out.symbols[s.sym] = { store: store.length, rest: rest.length, same: d.same, corrected: d.corrections.length, missing: d.missing.length, extra: d.extra.length,
      missing_sample: d.missing.slice(0, 5).map((t) => new Date(t).toISOString()), extra_sample: d.extra.slice(0, 5).map((t) => new Date(t).toISOString()) }
  } catch (e) { out.symbols[s.sym] = { error: String(e.message).slice(0, 200) } }
}
fs.writeFileSync(path.join(TURBO.master, 'reconcile_1m.json'), JSON.stringify(out, null, 1))
for (const [k, v] of Object.entries(out.symbols)) console.log(k.padEnd(7), JSON.stringify(v))
