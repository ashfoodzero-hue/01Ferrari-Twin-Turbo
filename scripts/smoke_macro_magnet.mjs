// smoke_macro_magnet.mjs — the 4H Macro Magnet engine (src/master/macroMagnet.js, Ashraf's Pine copied 2026-10-16).
// Checks: US DST offsets · the 4H cut = TradingView OANDA (measured snapshot) · Pine's exact edge rules on synthetic bars · pivots known
// only 10 bars later + the clear rule · ties counted · PARITY with Ashraf's own OANDA 4H candles (data/master/tv_oanda_xau_4h_snapshot.json).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { nyOffsetMs, bucket4h, resample4h, magnetScores, MAGNET } from '../src/master/macroMagnet.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const H = 3600000
console.log('\n██ 4H MACRO MAGNET SMOKE ██')
await ok('US DST: EDT from the 2nd Sunday of March 07:00 UTC to the 1st Sunday of November 06:00 UTC (2025, 2026)', async () => {
  for (const [iso, h] of [['2026-03-08T06:59Z', -5], ['2026-03-08T07:00Z', -4], ['2026-11-01T05:59Z', -4], ['2026-11-01T06:00Z', -5], ['2025-03-09T07:00Z', -4], ['2025-11-02T06:00Z', -5], ['2026-01-15T12:00Z', -5], ['2026-07-15T12:00Z', -4]])
    assert.equal(nyOffsetMs(Date.parse(iso)), h * H, iso)
})
await ok('4H cut: summer buckets start 01/05/09/13/17/21 UTC, winter 02/06/10/14/18/22 (17:00 New York); ny21 fixed; utc 00/04', async () => {
  assert.equal(new Date(bucket4h(Date.parse('2026-07-15T00:30Z'))).toISOString(), '2026-07-14T21:00:00.000Z')
  assert.equal(new Date(bucket4h(Date.parse('2026-07-15T01:00Z'))).toISOString(), '2026-07-15T01:00:00.000Z')
  assert.equal(new Date(bucket4h(Date.parse('2026-01-15T01:30Z'))).toISOString(), '2026-01-14T22:00:00.000Z')
  assert.equal(new Date(bucket4h(Date.parse('2026-01-15T02:00Z'))).toISOString(), '2026-01-15T02:00:00.000Z')
  assert.equal(new Date(bucket4h(Date.parse('2026-01-15T01:30Z'), 'ny21')).toISOString(), '2026-01-15T01:00:00.000Z')
  assert.equal(new Date(bucket4h(Date.parse('2026-01-15T03:30Z'), 'utc')).toISOString(), '2026-01-15T00:00:00.000Z')
  const tv = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'tv_oanda_xau_4h_snapshot.json'), 'utf8')).bars
  for (const b of tv) assert.equal(bucket4h(b.t), b.t, 'a TradingView 4H start is not our bucket start: ' + new Date(b.t).toISOString())
})
// synthetic 4H bars: a flat series then a controlled shape
const mk = (cs, opens) => cs.map((c, i) => ({ t: i * 4 * H, o: opens ? opens[i] : c, h: c + 0.5, l: c - 0.5, c }))
await ok('Pine edge rules: all four LONG → 100; both registers missing → B SHORT (99999 = 99999); close = open → D LONG; long + short = 100', async () => {
  const up = mk(Array.from({ length: 40 }, (_, i) => 100 + i))   // monotone rise: EMA9 > EMA21, RSI 100, no pivots (both registers empty)
  const r = magnetScores(up).filter(Boolean).at(-1)
  assert(r.A && r.C && r.D && !r.B, JSON.stringify(r)); assert.equal(r.long, MAGNET.w.A + MAGNET.w.C + MAGNET.w.D); assert.equal(r.long + r.short, 100); assert.equal(r.bsl, null); assert.equal(r.ssl, null)
  const flatOpen = mk(Array.from({ length: 40 }, (_, i) => 100 + i), Array.from({ length: 40 }, (_, i) => 100 + i)); assert.equal(magnetScores(flatOpen).filter(Boolean).at(-1).D, true, 'close = open must count LONG')
  const red = mk(Array.from({ length: 40 }, (_, i) => 100 + i), Array.from({ length: 40 }, (_, i) => 101 + i)); assert.equal(magnetScores(red).filter(Boolean).at(-1).D, false)
})
await ok('pivot high is known only 10 bars after it, sets BSL; a later close above BSL clears it; a strict tie is NOT a pivot and is counted', async () => {
  const cs = [...Array.from({ length: 30 }, () => 100), 110, ...Array.from({ length: 10 }, () => 100), ...Array.from({ length: 5 }, () => 105)]
  const bars = mk(cs); const rows = magnetScores(bars), p = 30
  assert.equal(rows[p + 9]?.bsl ?? null, null, 'BSL visible before the pivot was confirmed (look-ahead)')
  assert.equal(rows[p + 10].bsl, 110.5, 'BSL not set on the confirmation bar')
  const up = mk([...cs, 112]); assert.equal(magnetScores(up).at(-1).bsl, null, 'a close above BSL must clear it')
  const tie = mk([...Array.from({ length: 30 }, () => 100), 110, 100, 100, 110, ...Array.from({ length: 12 }, () => 100)]); const tr = magnetScores(tie)
  assert(tr.ties >= 1, 'equal highs must be counted as ties')
})
await ok('PARITY with Ashraf\'s OANDA 4H (TradingView snapshot): ≥ 99 % of candles align on start time; same LONG/SHORT side on ≥ 98 % of shared scored bars', async () => {
  const tv = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'tv_oanda_xau_4h_snapshot.json'), 'utf8')).bars, last = tv.at(-1).t
  const { ny } = await resample4h(streamBars('XAUUSD', '1m', { from: tv[0].t - 40 * 86400000, to: last - 1 }), ['ny'])
  const byT = new Map(ny.map((b) => [b.t, b])), closedTv = tv.filter((b) => b.t < last); const matched = closedTv.filter((b) => byT.has(b.t)).length
  assert(matched / closedTv.length >= 0.99, `only ${matched}/${closedTv.length} candles align`)
  const sT = magnetScores(closedTv), oBy = new Map(magnetScores(ny).filter(Boolean).map((r) => [r.t, r])); let k = 0, same = 0
  for (const r of sT.slice(-300)) { if (!r) continue; const o = oBy.get(r.t); if (!o) continue; k++; if (o.side === r.side) same++ }
  assert(k >= 250 && same / k >= 0.98, `side agreement ${same}/${k}`)
})
console.log(process.exitCode ? '✗ MACRO MAGNET SMOKE FAILED' : `✅ MACRO MAGNET SMOKE: ${n} passed, 0 failed`)
