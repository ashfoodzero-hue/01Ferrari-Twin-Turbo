// smoke_source_quirks.mjs — the 2026-10-18 history fixes:
//   (1) Polygon's 2020-11-15 → 12-31 New-York-local stamps (src/data/sourceQuirks.js) are shifted +5 h at read time, ONE place, raw switch for
//       reproductions; (2) the corrected winter has the true New York structure; (3) its daily candles agree with Ashraf's TradingView again;
//   (4) cleanForTv drops weekend-dated minutes (no TradingView session) and counts them.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { QUIRKS, quirksFor, fixTime } from '../src/data/sourceQuirks.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SOURCE QUIRKS SMOKE ██')
const H = 3600000, q = quirksFor('XAUUSD')
await ok('fixTime: +5 h inside 2020-11-14 → 2021-01-01 for gold + 5 DXY pairs only; unchanged outside; silver / USDSEK untouched; raw switch = no shift', () => {
  assert.equal(QUIRKS.length, 1); assert.deepEqual(QUIRKS[0].symbols, ['XAUUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDCHF'])
  const inT = Date.parse('2020-12-09T12:00:00Z'); assert.equal(fixTime(inT, q), inT + 5 * H); assert.equal(fixTime(Date.parse('2021-01-04T12:00:00Z'), q), Date.parse('2021-01-04T12:00:00Z'))
  assert.equal(fixTime(Date.parse('2020-11-13T23:59:00Z'), q), Date.parse('2020-11-13T23:59:00Z')); assert.deepEqual(quirksFor('XAGUSD'), []); assert.deepEqual(quirksFor('USDSEK'), [])
  process.env.TWIN_RAW_POLYGON_TIMES = '1'; try { assert.deepEqual(quirksFor('XAUUSD'), []) } finally { delete process.env.TWIN_RAW_POLYGON_TIMES }
})
await ok('the corrected winter has New York structure: weekday break at 22:00Z (not 17:00Z) and the Sunday open at 23:00Z; order kept; bounded by Polygon gaps', async () => {
  const M = (await loadBars('XAUUSD', '1m', { from: Date.parse('2020-10-01'), to: Date.parse('2021-01-10') })).bars, wk = M.filter((b) => b.t >= Date.parse('2020-12-07') && b.t < Date.parse('2020-12-11'))
  const hours = new Array(24).fill(0); for (const b of wk) hours[new Date(b.t).getUTCHours()]++
  assert(hours[22] === 0 && hours[17] > 200, `hour 22Z ${hours[22]} · 17Z ${hours[17]}`)
  const sun = M.find((b) => b.t >= Date.parse('2020-12-06') && new Date(b.t).getUTCDay() === 0); assert.equal(new Date(sun.t).toISOString().slice(11, 16), '23:00')
  for (let i = 1; i < M.length; i++) assert(M[i].t > M[i - 1].t, 'order broken at ' + new Date(M[i].t).toISOString())
  assert(M.some((b) => b.quirk === 'ny-local-2020')); assert(!M.some((b) => b.t >= Date.parse('2020-10-13T00:00:00Z') && b.t < Date.parse('2020-11-15T23:00:00Z')), 'the Polygon gap before the window')
})
await ok('daily candles vs Ashraf\'s TradingView (OANDA, data/master/tv_daily_reference_2018_2026.json): the corrected weeks agree like the control periods', async () => {
  const tv = new Map(JSON.parse(fs.readFileSync(path.join(TURBO.master, 'tv_daily_reference_2018_2026.json'), 'utf8')).bars.map((b) => [b[0] * 1000, b[4]]))
  const C = buildCandles(cleanForTv((await loadBars('XAUUSD', '1m', { from: Date.parse('2019-09-01'), to: Date.parse('2021-04-30') })).bars).bars, '1D')
  const med = (a, z) => { const d = C.filter((c) => c.t >= Date.parse(a) && c.t < Date.parse(z) && tv.has(c.t)).map((c) => Math.abs(c.c - tv.get(c.t))).sort((x, y) => x - y); return { m: d[d.length >> 1], n: d.length } }
  const fixed = med('2020-11-15', '2021-01-01'), c1 = med('2019-10-01', '2020-04-01'), c2 = med('2021-01-04', '2021-04-01')
  assert(fixed.n >= 30 && fixed.m < 1.0, `corrected weeks median |close − TV| $${fixed.m} (raw stamps gave $3.32)`); assert(c1.m < 1.0 && c2.m < 1.0)
})
await ok('cleanForTv drops weekend-dated minutes (Saturday / Sunday trading date — no TradingView session) and counts them; weekday minutes untouched', () => {
  const sat = Date.parse('2026-10-17T15:00:00Z'), sunPre = Date.parse('2026-10-18T19:00:00Z'), sunOpen = Date.parse('2026-10-18T22:30:00Z'), mon = Date.parse('2026-10-19T10:00:00Z')
  const mk = (t0, k) => Array.from({ length: k }, (_, i) => ({ t: t0 + i * 60000, o: 1, h: 1, l: 1, c: 1 }))
  const r = cleanForTv([...mk(sat, 70), ...mk(sunPre, 70), ...mk(sunOpen, 70), ...mk(mon, 70)])
  assert.equal(r.dropped.weekend_minutes, 140); assert.equal(r.bars.length, 140); assert(r.bars.every((b) => b.t >= sunOpen))
})
console.log(process.exitCode ? '✗ SOURCE QUIRKS SMOKE FAILED' : `✅ SOURCE QUIRKS SMOKE: ${n} passed, 0 failed`)
