// scan_store_duplicates.mjs — FULL scan of every stored 1m history file for duplicate and out-of-order minutes (2026-10-18; Ashraf: "make sure we do
// not have duplication with history database", after the Polygon outage + 56 stream reconnects + REST refills). Streams every line of
// data/history/<ASSET>/1m.jsonl (all years, not just the recent tail the daily audit reads). Read-only; writes data/master/store_duplicates_scan.json.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'

const root = path.join(TURBO.root, 'data', 'history'), out = { at: new Date().toISOString(), series: {} }
for (const a of fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, '1m.jsonl'))).sort()) {
  const f = path.join(root, a, '1m.jsonl'), seen = new Set(), dupT = []; let n = 0, prev = -Infinity, ooo = 0, bad = 0, first = null, last = null
  for await (const line of readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity })) { if (!line.trim()) continue
    let t; try { t = JSON.parse(line).t } catch { bad++; continue } if (!Number.isFinite(t)) { bad++; continue }
    n++; if (first == null) first = t; last = t
    if (seen.has(t)) { if (dupT.length < 10) dupT.push(new Date(t).toISOString()) ; out.series[a] = out.series[a] } else seen.add(t)
    if (t < prev) ooo++; prev = Math.max(prev, t) }
  const dups = n - seen.size
  out.series[a] = { minutes: n, unique: seen.size, duplicates: dups, out_of_order: ooo, unreadable_lines: bad, first: first ? new Date(first).toISOString() : null, last: last ? new Date(last).toISOString() : null, duplicate_examples: dupT }
  console.log(`  ${a.padEnd(10)} ${String(n).padStart(9)} minutes · duplicates ${dups} · out-of-order ${ooo} · unreadable ${bad} · ${out.series[a].first?.slice(0, 10)} → ${out.series[a].last?.slice(0, 16)}`) }
const tot = Object.values(out.series).reduce((s, x) => s + x.duplicates + x.out_of_order + x.unreadable_lines, 0)
out.ok = tot === 0; fs.writeFileSync(path.join(TURBO.master, 'store_duplicates_scan.json'), JSON.stringify(out, null, 1))
console.log(out.ok ? '✅ no duplicate, out-of-order or unreadable minute in any stored series' : `❌ problems found: ${tot}`)
