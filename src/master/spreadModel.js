// ════════════════════════════════════════════════════════════════════════════════
// spreadModel.js — the MEASURED gold bid/ask spread (2026-10-08). One place; the resolver's spreadAt comes from here.
// ────────────────────────────────────────────────────────────────────────────────
// History: data/master/spread_table.json (scripts/measure_spread_polygon.mjs — Polygon /v3/quotes, one sampled minute per
// (month, UTC hour), 2013-07 →): spread(t) = the (year, hour) median; a missing cell falls back to THAT YEAR's measured median
// (counted, never silent). A year with no measurement THROWS — another year's spread is never borrowed (R0). Live: the streamer's quotes_1m.jsonl carries
// the ACTUAL spread of every minute (sp_avg); makeSpreadAt({ live }) prefers it where present.
// No table and no live quote → THROWS (R0: never an assumed spread).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'

export const SPREAD_TABLE_FILE = path.join(TURBO.master, 'spread_table.json')

export function loadSpreadTable(file = SPREAD_TABLE_FILE) {
  if (!fs.existsSync(file)) throw new Error(`spreadModel: ${file} missing — run scripts/measure_spread_polygon.mjs (R0: no assumed spread)`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/**
 * @param {{table?:object, live?:Map<number,number>}} o  live = minute → measured average spread (quotes_1m sp_avg)
 * @returns {((t:number)=>number) & {stats:object}}
 */
export function makeSpreadAt({ table = loadSpreadTable(), live = null } = {}) {
  const stats = { live: 0, cell: 0, year: 0 }
  const fn = (t) => {
    if (live) { const x = live.get(Math.floor(t / 60000) * 60000); if (x != null) { stats.live++; return x } }
    const d = new Date(t), y = d.getUTCFullYear(), h = d.getUTCHours()
    const c = table.by_year_hour?.[y]?.[h]; if (c?.median != null) { stats.cell++; return c.median }
    const yr = table.by_year?.[y]; if (yr?.median != null) { stats.year++; return yr.median }
    throw new Error(`spreadModel: no measured spread for ${d.toISOString()}`)
  }
  fn.stats = stats
  return fn
}

/** The streamer's per-minute measured spreads for a symbol (quotes_1m.jsonl) as Map(minute → sp_avg). */
export function loadLiveSpreads(file, { from = -Infinity } = {}) {
  const m = new Map(); if (!fs.existsSync(file)) return m
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) { if (!l) continue; const q = JSON.parse(l); if (q.t >= from && q.sp_avg != null) m.set(q.t, q.sp_avg) }
  return m
}
