// build_footprints.mjs — CME gold (GC front month) FOOTPRINTS from Databento tbbo (2026-10-11; TEST-ONLY research data, R0 exception approved by
// Ashraf 2026-10-11 — never used for live signals). Spec: docs/ORDERFLOW_FOOTPRINT_SPEC.md.
// ────────────────────────────────────────────────────────────────────────────────
// Input : data/orderflow/gc_tbbo/*.tbbo.csv.zst — every trade (action T) with the exchange AGGRESSOR side (B = buyer hit the ask, A = seller hit
//         the bid, N = none) and the best bid/ask just before it (bid_px_00 / ask_px_00).
// Output: data/orderflow/gc_5m_footprints.jsonl — one closed 5m footprint per line:
//           { t, iid, o, h, l, c, v, delta, n, cells: [[priceTicks, bidVol, askVol, bidVolInferred, askVolInferred], …] }
//           price ticks = round(price / 0.1); bid = seller-aggressor volume, ask = buyer-aggressor volume (N trades skipped from bid/ask, kept in v)
//         data/orderflow/gc_1m.jsonl — { t, iid, o, h, l, c, v } per minute (the money path)
//         data/orderflow/gc_footprint_build.json — counts + the INFERENCE agreement (what Massive would see live: price ≥ ask → buy,
//           ≤ bid → sell, else the tick rule) vs the exchange flag.
// A bar never mixes two contracts: when instrument_id changes inside a bar (the roll), the bar is closed and the partial bar is dropped.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'

const DIR = path.join(TURBO.root, 'data', 'orderflow'), IN = path.join(DIR, 'gc_tbbo'), TICK = 0.1, M5 = 300000, M1 = 60000
const files = fs.readdirSync(IN).filter((f) => f.endsWith('.tbbo.csv.zst')).sort()
const out5 = fs.createWriteStream(path.join(DIR, 'gc_5m_footprints.jsonl')), out1 = fs.createWriteStream(path.join(DIR, 'gc_1m.jsonl'))
const stats = { trades: 0, buyer: 0, seller: 0, none: 0, inferredAgree: 0, inferredCompared: 0, byRule: { quote: [0, 0], tick: [0, 0] }, bars5: 0, bars1: 0, rollDrops: 0, files: files.length }
let b5 = null, b1 = null, lastPx = null, lastDir = 0
const flush5 = () => { if (!b5) return; const cells = [...b5.cells.entries()].sort((a, b) => a[0] - b[0]).map(([p, x]) => [p, x[0], x[1], x[2], x[3]])
  out5.write(JSON.stringify({ t: b5.t, iid: b5.iid, o: b5.o, h: b5.h, l: b5.l, c: b5.c, v: b5.v, delta: b5.delta, n: b5.n, cells }) + '\n'); stats.bars5++; b5 = null }
const flush1 = () => { if (!b1) return; out1.write(JSON.stringify(b1) + '\n'); stats.bars1++; b1 = null }
for (const f of files) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(IN, f)).pipe(zlib.createZstdDecompress()), crlfDelay: Infinity })
  let header = true
  for await (const line of rl) {
    if (header) { header = false; continue }
    const p = line.split(','); if (p[5] !== 'T') continue
    const t = Math.floor(Number(BigInt(p[1]) / 1000000n)), iid = +p[4], side = p[6], px = +p[8], sz = +p[9], bid = +p[13], ask = +p[14]
    if (!(px > 0) || !(sz > 0)) continue
    stats.trades++; if (side === 'B') stats.buyer++; else if (side === 'A') stats.seller++; else stats.none++
    // inferred side (what a quote-only feed would allow): quote rule, else tick rule
    let inf = 0, rule = 'quote'
    if (ask > 0 && px >= ask) inf = 1; else if (bid > 0 && px <= bid) inf = -1
    else { rule = 'tick'; if (lastPx != null && px !== lastPx) lastDir = px > lastPx ? 1 : -1; inf = lastDir }
    lastPx = px
    if (side !== 'N' && inf !== 0) { const ok = (inf > 0) === (side === 'B'); stats.inferredCompared++; if (ok) stats.inferredAgree++; stats.byRule[rule][0]++; if (ok) stats.byRule[rule][1]++ }
    // 5m footprint
    const k5 = Math.floor(t / M5) * M5
    if (b5 && (b5.t !== k5 || b5.iid !== iid)) { if (b5.iid !== iid && b5.t === k5) { stats.rollDrops++; b5 = null } else flush5() }
    if (!b5) b5 = { t: k5, iid, o: px, h: px, l: px, c: px, v: 0, delta: 0, n: 0, cells: new Map() }
    b5.h = Math.max(b5.h, px); b5.l = Math.min(b5.l, px); b5.c = px; b5.v += sz; b5.n++
    const pt = Math.round(px / TICK); let cell = b5.cells.get(pt); if (!cell) b5.cells.set(pt, (cell = [0, 0, 0, 0]))
    if (side === 'A') { cell[0] += sz; b5.delta -= sz } else if (side === 'B') { cell[1] += sz; b5.delta += sz }
    if (inf < 0) cell[2] += sz; else if (inf > 0) cell[3] += sz
    // 1m bars
    const k1 = Math.floor(t / M1) * M1
    if (b1 && (b1.t !== k1 || b1.iid !== iid)) flush1()
    if (!b1) b1 = { t: k1, iid, o: px, h: px, l: px, c: px, v: 0 }
    b1.h = Math.max(b1.h, px); b1.l = Math.min(b1.l, px); b1.c = px; b1.v += sz
  }
  console.log(`  ${f}: trades so far ${stats.trades.toLocaleString()} · 5m bars ${stats.bars5.toLocaleString()}`)
}
flush5(); flush1(); out5.end(); out1.end()
stats.inference_agreement = +(stats.inferredAgree / stats.inferredCompared).toFixed(4)
stats.inference_by_rule = Object.fromEntries(Object.entries(stats.byRule).map(([k, [n, a]]) => [k, { n, agreement: n ? +(a / n).toFixed(4) : null }]))
delete stats.byRule
fs.writeFileSync(path.join(DIR, 'gc_footprint_build.json'), JSON.stringify({ at: new Date().toISOString(), ...stats }, null, 1))
console.log(JSON.stringify(stats, null, 1))
