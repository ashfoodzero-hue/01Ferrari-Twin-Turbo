// build_footprints_1m.mjs — 1-MINUTE CME gold footprints from Databento tbbo (2026-10-17; swing-candle study, TEST-ONLY research data —
// the same R0 exception as build_footprints.mjs, never used for live signals). Same input + side rules as build_footprints.mjs (exchange
// aggressor flag: A = seller hit the bid, B = buyer lifted the ask, N = none → kept in v only), at 1m so 1m / 3m footprints exist and every
// higher timeframe can be rolled up on the TradingView New York grid (src/master/footprintTf.js).
// Output: data/orderflow/gc_1m_footprints.jsonl — { t, iid, o, h, l, c, v, delta, n, cells: [[priceTicks, bidVol, askVol], …] } (tick = $0.10)
// A minute never mixes two contracts: an instrument change inside a minute drops that partial minute (counted as rollDrops).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'

const DIR = path.join(TURBO.root, 'data', 'orderflow'), IN = path.join(DIR, 'gc_tbbo'), TICK = 0.1, M1 = 60000
const files = fs.readdirSync(IN).filter((f) => f.endsWith('.tbbo.csv.zst')).sort()
const OUT = path.join(DIR, 'gc_1m_footprints.jsonl'), out = fs.createWriteStream(OUT + '.tmp')
const stats = { trades: 0, bars: 0, rollDrops: 0, files: files.length }
let b = null
const flush = () => { if (!b) return; const cells = [...b.cells.entries()].sort((x, y) => x[0] - y[0]).map(([p, x]) => [p, x[0], x[1]])
  out.write(JSON.stringify({ t: b.t, iid: b.iid, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, delta: b.delta, n: b.n, cells }) + '\n'); stats.bars++; b = null }
for (const f of files) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(IN, f)).pipe(zlib.createZstdDecompress()), crlfDelay: Infinity })
  let header = true
  for await (const line of rl) {
    if (header) { header = false; continue }
    const p = line.split(','); if (p[5] !== 'T') continue
    const t = Math.floor(Number(BigInt(p[1]) / 1000000n)), iid = +p[4], side = p[6], px = +p[8], sz = +p[9]
    if (!(px > 0) || !(sz > 0)) continue
    stats.trades++
    const k = Math.floor(t / M1) * M1
    if (b && (b.t !== k || b.iid !== iid)) { if (b.iid !== iid && b.t === k) { stats.rollDrops++; b = null } else flush() }
    if (!b) b = { t: k, iid, o: px, h: px, l: px, c: px, v: 0, delta: 0, n: 0, cells: new Map() }
    b.h = Math.max(b.h, px); b.l = Math.min(b.l, px); b.c = px; b.v += sz; b.n++
    const pt = Math.round(px / TICK); let cell = b.cells.get(pt); if (!cell) b.cells.set(pt, (cell = [0, 0]))
    if (side === 'A') { cell[0] += sz; b.delta -= sz } else if (side === 'B') { cell[1] += sz; b.delta += sz }
  }
  console.log(`  ${f}: trades ${stats.trades.toLocaleString()} · 1m footprints ${stats.bars.toLocaleString()}`)
}
flush(); await new Promise((r) => out.end(r)); fs.renameSync(OUT + '.tmp', OUT)
fs.writeFileSync(path.join(DIR, 'gc_1m_footprint_build.json'), JSON.stringify({ at: new Date().toISOString(), ...stats }, null, 1))
console.log(JSON.stringify(stats))
