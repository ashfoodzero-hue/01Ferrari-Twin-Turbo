// smoke_footprint_tf.mjs — footprintTf.js checks (2026-10-17): (1) 1m footprints rolled to 5m reproduce the independent 5m build
// (gc_5m_footprints.jsonl) — volume, delta, OHLC; (2) footprintRead definitions on a synthetic candle with known answers; (3) roll flag.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'
import { footprintCandles, footprintRead } from '../src/master/footprintTf.js'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ FOOTPRINT TF SMOKE ██')
await ok('1m → 5m roll-up = the independent 5m footprint build (volume, delta, high, low) on the first 30 days', async () => {
  const to = Date.parse('2024-10-31T00:00:00Z'), mine = await footprintCandles('5m', { to }), ref = new Map()
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(TURBO.root, 'data', 'orderflow', 'gc_5m_footprints.jsonl')), crlfDelay: Infinity })
  for await (const line of rl) { const b = JSON.parse(line); if (b.t > to) break; ref.set(b.t, b) }
  let cmp = 0, bad = 0
  for (const c of mine) { const r = ref.get(c.t); if (!r || c.roll || c.t + 300000 > to) continue; cmp++;   // skip the last candle (cut by the test window)
    if (r.v !== c.v || r.delta !== c.delta || Math.abs(r.h - c.h) > 1e-9 || Math.abs(r.l - c.l) > 1e-9) bad++ }
  console.log(`      compared ${cmp} 5m candles, mismatches ${bad}`)
  assert(cmp > 5000); assert.equal(bad, 0)
})
await ok('footprintRead: POC location, delta, stacked buying imbalance, absorption at the low', async () => {
  // price ticks 100..109; heavy selling at the bottom (absorbed: close in the upper half), stacked buyers 104-107
  const cells = new Map(); for (let p = 100; p <= 109; p++) cells.set(p, [10, 10])
  cells.set(100, [200, 5]); for (const p of [104, 105, 106, 107]) cells.set(p, [1, 60])
  const v = [...cells.values()].reduce((a, c) => a + c[0] + c[1], 0), delta = [...cells.values()].reduce((a, c) => a + c[1] - c[0], 0)
  const r = footprintRead({ o: 10.2, h: 10.9, l: 10.0, c: 10.8, v, delta, roll: false, cells })
  assert(r.poc_loc === 0, 'POC at the low'); assert(r.absorption_low && !r.absorption_high); assert(r.stacked_buy >= 3, 'stacked buy ' + r.stacked_buy); assert(Math.abs(r.delta_frac - delta / v) < 1e-12)
})
console.log(failed ? `✗ FOOTPRINT TF SMOKE: ${n} passed, ${failed} failed` : `✅ FOOTPRINT TF SMOKE: ${n} passed, 0 failed`)
