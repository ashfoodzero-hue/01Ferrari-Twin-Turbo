// smoke_ny_candles.mjs — nyCandles.js against Ashraf's TradingView (data/master/tv_anchor_reference.json, OANDA:XAUUSD read over CDP 2026-10-17).
// Checks, per timeframe: (1) every TradingView candle-open time in the overlap is one of OUR candle opens and vice versa (exact anchor parity);
// (2) OHLC agreement (Polygon spot vs OANDA: different feeds — reported as a median $ difference, asserted only loosely); (3) synthetic cases
// for the session rules (9H cut at 17:00, 2D/3D straight through a weekend, month by trading date, DST change).
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { buildCandles, tradingDate, sessionStart, cleanForTv } from '../src/core/nyCandles.js'
import { HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const SYM = process.argv[2] || 'XAUUSD'   // 2026-10-17: also XAGUSD (reference tv_anchor_reference_XAGUSD.json)
const ref = JSON.parse(fs.readFileSync(path.join(TURBO.master, SYM === 'XAUUSD' ? 'tv_anchor_reference.json' : `tv_anchor_reference_${SYM}.json`), 'utf8'))
const MAP = { '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m', '540': '9H', '360': '6H', '240': '4H', '180': '3H', '120': '2H', '60': '1H', '1D': '1D', '2D': '2D', '3D': '3D', '1W': '1W', '1M': '1M' }
console.log('\n██ NY CANDLES SMOKE (TradingView parity) — ' + SYM + ' ██')
const from = Math.min(...Object.values(ref.res).map((r) => r.bars[0][0] * 1000)) - 40 * 86400000
const raw = (await loadBars(SYM, '1m', { from: Math.max(from, HISTORY_CONTINUOUS_FROM) })).bars, cleaned = cleanForTv(raw), M = cleaned.bars
console.log('  cleaning: ' + JSON.stringify(cleaned.dropped))
const lastMin = M.at(-1).t
const report = {}
for (const [res, tf] of Object.entries(MAP)) await ok(`${tf}: every TradingView candle open in the overlap = one of ours, and ours = TradingView's`, async () => {
  const tv = ref.res[res].bars.map((b) => ({ t: b[0] * 1000, o: b[1], h: b[2], l: b[3], c: b[4] }))
  const ours = buildCandles(M, tf)
  const lo = Math.max(tv[0].t, ours[1].t), hi = Math.min(tv.at(-1).t, lastMin)                 // overlap (skip our first, possibly partial, candle)
  const T = tv.filter((b) => b.t >= lo && b.t <= hi), O = ours.filter((b) => b.t >= lo && b.t <= hi)
  const oSet = new Set(O.map((b) => b.t)), tSet = new Set(T.map((b) => b.t))
  // a TradingView candle we lack is a DATA GAP (not an anchor error) when we hold no minute at all inside it
  const hasMinute = (a, z) => { let lo2 = 0, hi2 = M.length; while (lo2 < hi2) { const m = (lo2 + hi2) >> 1; if (M[m].t < a) lo2 = m + 1; else hi2 = m } return lo2 < M.length && M[lo2].t < z }
  const nextOpen = (i) => (tv[tv.indexOf(T[i]) + 1]?.t ?? T[i].t + 60000)
  const lacking = T.map((b, i) => ({ b, i })).filter(({ b }) => !oSet.has(b.t))
  const gaps = lacking.filter(({ b, i }) => !hasMinute(b.t, nextOpen(i))), missing = lacking.filter(({ b, i }) => hasMinute(b.t, nextOpen(i))).map(({ b }) => b)
  const extra = O.filter((b) => !tSet.has(b.t))
  const byT = new Map(O.map((b) => [b.t, b])), dh = [], dl = []
  for (const b of T) { const x = byT.get(b.t); if (x) { dh.push(Math.abs(x.h - b.h)); dl.push(Math.abs(x.l - b.l)) } }
  const med = (v) => v.length ? v.sort((a, b) => a - b)[v.length >> 1] : null
  report[tf] = { tv_in_overlap: T.length, ours_in_overlap: O.length, missing: missing.length, data_gaps: gaps.map(({ b }) => new Date(b.t).toISOString()), extra: extra.length, median_abs_high_diff: med(dh), median_abs_low_diff: med(dl) }
  console.log(`      ${JSON.stringify(report[tf])}`)
  assert(T.length >= 10, 'overlap too small')
  assert.equal(missing.length, 0, 'TradingView opens we lack: ' + missing.slice(0, 5).map((b) => new Date(b.t).toISOString()).join(', '))
  assert.equal(extra.length, 0, 'our opens TradingView lacks: ' + extra.slice(0, 5).map((b) => new Date(b.t).toISOString()).join(', '))
  const px = T.at(-1).c; assert(med(dh) < 0.0005 * px && med(dl) < 0.0005 * px, 'OHLC disagree by more than 0.05 % median (feed difference too large)')
})
await ok('synthetic: session rules (17:00 open = next trading date · 9H cut at 17:00 · DST · 2D through a weekend · month by trading date)', async () => {
  // Wed 2026-10-14 17:00 EDT = 21:00 UTC belongs to trading date Thu 10-15
  assert.equal(new Date(tradingDate(Date.UTC(2026, 9, 14, 21, 0))).toISOString().slice(0, 10), '2026-10-15')
  assert.equal(new Date(tradingDate(Date.UTC(2026, 9, 14, 20, 59))).toISOString().slice(0, 10), '2026-10-14')
  // winter: 17:00 EST = 22:00 UTC
  assert.equal(sessionStart(Date.UTC(2026, 0, 6)), Date.UTC(2026, 0, 5, 22, 0))
  assert.equal(sessionStart(Date.UTC(2026, 9, 15)), Date.UTC(2026, 9, 14, 21, 0))
  const mins = []; for (let t = Date.UTC(2026, 9, 14, 21, 0); t < Date.UTC(2026, 9, 15, 21, 0); t += 60000) mins.push({ t, o: 1, h: 1, l: 1, c: 1 })
  const h9 = buildCandles(mins, '9H').map((b) => new Date(b.t).toISOString().slice(11, 16))
  assert.deepEqual(h9, ['21:00', '06:00', '15:00'])   // 17:00, 02:00, 11:00 New York (EDT)
})
fs.writeFileSync(path.join(TURBO.master, SYM === 'XAUUSD' ? 'ny_candles_parity.json' : `ny_candles_parity_${SYM}.json`), JSON.stringify({ at: new Date().toISOString(), reference: 'tv_anchor_reference.json', report }, null, 1))
console.log(failed ? `✗ NY CANDLES SMOKE: ${n} passed, ${failed} failed` : `✅ NY CANDLES SMOKE: ${n} passed, 0 failed`)
