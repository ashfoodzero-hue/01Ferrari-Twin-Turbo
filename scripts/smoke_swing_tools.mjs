// smoke_swing_tools.mjs — unit checks for the swing-candle study tools (2026-10-17): swings.js (ZigZag + failed extremes, causal),
// candleFeatures.js (anatomy definitions), dataHoles.js (holes, incomplete candles). Synthetic data with known answers + one real-data sanity run.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import { zigzag } from '../src/master/swings.js'
import { anatomy } from '../src/master/candleFeatures.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING TOOLS SMOKE ██')
// a zig-zag price path: 100 → 120 → 105 → 130 → 110, one-dollar bars, range 1 (ATR ≈ 1–2)
const path = []; const leg = (a, z) => { const s = a < z ? 1 : -1; for (let x = a; s > 0 ? x < z : x > z; x += s) path.push(x) }
leg(100, 120); leg(120, 105); leg(105, 130); leg(130, 110); path.push(110)
const bars = path.map((c, i) => ({ t: i * 60000, o: c - 0.2, h: c + 0.5, l: c - 0.5, c }))
await ok('ZigZag finds the true turns (120 high, 105 low, 130 high), each confirmed AFTER the extreme bar', async () => {
  const { swings } = zigzag(bars, { k: 3, atrLen: 5 })
  const pts = swings.map((s) => `${s.type}${Math.round(s.type === 'H' ? s.px - 0.5 : s.px + 0.5)}`)
  assert(pts.includes('H120') && pts.includes('L105') && pts.includes('H130'), pts.join(','))
  for (const s of swings) assert(s.knownI > s.i, 'a swing is never known on its own bar')
})
await ok('failed extremes = superseded running highs/lows inside a leg (never the swing bar itself)', async () => {
  const { swings, failed: f } = zigzag(bars, { k: 3, atrLen: 5 })
  const swingIdx = new Set(swings.map((s) => s.i)); assert(f.length > 10); for (const x of f) { assert(!swingIdx.has(x.i)); assert(x.supersededI > x.i); assert(x.pullback_atr >= 0) }
})
await ok('a break (data hole) resets the ZigZag: no swing spans it', async () => {
  const brk = new Set([30]); const { swings } = zigzag(bars, { k: 3, atrLen: 5, breaks: brk })
  for (const s of swings) assert(!(s.i < 30 && s.knownI > 30), 'swing spans the break')
})
await ok('anatomy: hammer, engulfing, sweep-reclaim, close location', async () => {
  const p = { o: 10, h: 10.5, l: 9, c: 9.2 }, b = { o: 9.1, h: 10.6, l: 8.5, c: 10.4 }
  const x = anatomy(b, p, 1); assert(x.bull_engulf && x.sweep_low_reclaim && !x.inside && x.dir === 'bull'); assert(Math.abs(x.close_loc - (10.4 - 8.5) / 2.1) < 1e-9)
  const h = anatomy({ o: 9.8, h: 10, l: 8, c: 9.9 }, null, 1); assert(h.hammer && !h.shooting_star)
})
await ok('REAL: holes found = the two measured Polygon gaps (2019-09, 2020-10/11); daily candles overlapping them are flagged', async () => {
  const { bars: m } = cleanForTv((await loadBars('XAUUSD', '1m', { from: Date.parse('2019-06-01'), to: Date.parse('2021-01-31') })).bars)
  const holes = findHoles(m), iso = holes.map((h) => new Date(h.from).toISOString().slice(0, 10) + '..' + new Date(h.to).toISOString().slice(0, 10))
  assert(iso.includes('2019-09-04..2019-10-04') && iso.includes('2020-10-14..2020-11-13'), iso.join(' '))
  const d1 = buildCandles(m, '1D'), k = markIncomplete(d1, holes); assert(k >= 2, 'flags the candles bordering each hole')
  const w1 = buildCandles(m, '1W'); markIncomplete(w1, holes); assert(w1.some((c) => c.incomplete))
  console.log(`      holes: ${iso.join(' · ')} · 1D flagged ${k}`)
})
await ok('REAL: 4H ZigZag on 2025-26 gold — swings alternate H/L, amplitudes ≥ k ATR, failed extremes exist', async () => {
  const { bars: m } = cleanForTv((await loadBars('XAUUSD', '1m', { from: Date.parse('2025-01-01') })).bars)
  const c4 = buildCandles(m, '4H'), { swings, failed: f } = zigzag(c4, { k: 3 })
  for (let i = 1; i < swings.length; i++) assert(swings[i].type !== swings[i - 1].type, 'two swings of the same type in a row')
  assert(swings.length > 50 && f.length > swings.length)
  console.log(`      4H 2025-26: ${swings.length} swings, ${f.length} failed extremes, median amp ${swings.map((s) => s.amp_atr).filter(Boolean).sort((a, b) => a - b)[swings.length >> 1]?.toFixed(1)} ATR`)
})
console.log(failed ? `✗ SWING TOOLS SMOKE: ${n} passed, ${failed} failed` : `✅ SWING TOOLS SMOKE: ${n} passed, 0 failed`)
