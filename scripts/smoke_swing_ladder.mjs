// smoke_swing_ladder.mjs — Phase 3 matching core (scripts/lib/swing_ladder.mjs), 2026-10-17:
//   (1) synthetic: an anchor low and a faster timeframe's low at the SAME price inside the anchor candle → flip time = the fast confirm close (exact);
//       a different price or a non-overlapping candle → no match; the earliest of several matches wins
//   (2) REAL invariant: on real 1H gold, X = the anchor itself flips at 100 % of its swings, exactly at its own confirmation close;
//       a faster timeframe (15m) flips at the same low for most 1H swings and never AFTER… (no assertion on timing beyond existence)
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import { indexSwings, flipAt, nearestSwingSorted } from './lib/swing_ladder.mjs'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { zigzag } from '../src/master/swings.js'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING LADDER SMOKE ██')
await ok('synthetic: exact price + overlapping candle → flip = the confirming candle close; earliest wins; wrong price / time → none', async () => {
  const C = [{ t: 0, close_t: 60 }, { t: 60, close_t: 120 }, { t: 120, close_t: 180 }, { t: 180, close_t: 240 }, { t: 240, close_t: 300 }]
  const idx = indexSwings(C, [{ type: 'L', i: 1, knownI: 3, px: 100 }, { type: 'L', i: 1, knownI: 2, px: 100 }, { type: 'L', i: 4, knownI: 4, px: 99 }])
  assert.equal(flipAt(idx, 'L', 100, 0, 180), 180)       // earliest of the two matches (knownI 2 → close 180)
  assert.equal(flipAt(idx, 'L', 101, 0, 180), null)       // different price
  assert.equal(flipAt(idx, 'L', 100, 200, 400), null)     // no overlap
  assert.equal(flipAt(idx, 'H', 100, 0, 180), null)       // wrong type
  const near = nearestSwingSorted(C, [{ type: 'H', i: 2, knownI: 4 }], new Map(C.map((c, k) => [c.t, k])), 'H', 60, 3); assert.deepEqual(near, { dCandles: 1, flipT: 300 })
})
await ok('REAL 1H gold (2025-26): the anchor itself flips at 100 % of its swings exactly at its own confirmation; 15m flips at the same low for most', async () => {
  const { bars } = cleanForTv((await loadBars('XAUUSD', '1m', { from: Date.parse('2025-01-01'), to: Date.parse('2026-10-01') })).bars)
  const H1 = buildCandles(bars, '1H'), M15 = buildCandles(bars, '15m'), s1 = zigzag(H1, { k: 3 }).swings, s15 = zigzag(M15, { k: 3 }).swings
  const i1 = indexSwings(H1, s1), i15 = indexSwings(M15, s15); let self = 0, fast = 0, before = 0
  for (const s of s1) { const a0 = H1[s.i].t, a1 = H1[s.i].close_t, own = H1[s.knownI].close_t
    if (flipAt(i1, s.type, s.px, a0, a1) === own) self++
    const f = flipAt(i15, s.type, s.px, a0, a1); if (f != null) { fast++; if (f <= own) before++ } }
  console.log(`      1H swings ${s1.length} · self-match ${self} · 15m flipped at the same extreme ${fast} (${(100 * fast / s1.length).toFixed(0)} %), of which at/before 1H confirmation ${before}`)
  assert.equal(self, s1.length); assert(fast / s1.length > 0.5)
})
console.log(failed ? `✗ SWING LADDER SMOKE: ${n} passed, ${failed} failed` : `✅ SWING LADDER SMOKE: ${n} passed, 0 failed`)
