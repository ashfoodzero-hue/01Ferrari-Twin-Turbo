// ════════════════════════════════════════════════════════════════════════════════
// audit_timeframes.mjs — is the history for EVERY timeframe built perfectly? (2026-10-18; Ashraf: "confirm that … our history for each time
// frame is built perfectly"). Whole history, all 12 stored series × the 16 TradingView timeframes (src/core/nyCandles.js) + the live loader's
// timeframes (backfillReader.loadBars 3m / 15m / 1h, which the live ticks read).
// ────────────────────────────────────────────────────────────────────────────────
// The candle TIMING rule (candleOpen) is proven against Ashraf's TradingView by smoke_ny_candles. This audit proves the CONSTRUCTION on all data,
// by an independent method (group-by candle key, order-free), per series and timeframe:
//   A  every candle's open/high/low/close/minute-count (+ real volume) = an independent re-aggregation of its minutes — exactly
//   B  candle opens strictly increasing (no duplicate / overlapping / out-of-order candle)
//   C  every minute is in exactly one candle (Σ candle minutes = minutes)
//   D  each candle lies inside its own window: open ≤ its first minute, last minute < the next candle's open, span ≤ the timeframe's maximum
//   E  real volume (GOLD_FUT, SILVER_FUT, WTI, GLD): Σ candle volume = Σ minute volume
//   F  LIVE LOADER parity (XAUUSD, XAGUSD): loadBars 3m / 15m / 1h candles = nyCandles candles wherever both hold the same full set of minutes
//      (they differ only by design on the 17:00 New York break minutes and holiday stubs that cleanForTv drops for TradingView parity)
// Output: data/master/timeframe_audit.json. Exit 1 on any failure.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { TFS, cleanForTv, buildCandles, candleOpen } from '../src/core/nyCandles.js'

const H = 3600000, D = 24 * H
const MAX_SPAN = { '1m': 60000, '3m': 3 * 60000, '5m': 5 * 60000, '15m': 15 * 60000, '30m': 30 * 60000, '1H': H, '2H': 2 * H, '3H': 3 * H, '4H': 4 * H, '6H': 6 * H, '9H': 9 * H,
  '1D': 26 * H, '2D': 4 * D + 2 * H, '3D': 5 * D + 2 * H, '1W': 7 * D + 2 * H, '1M': 32 * D }   // DST days are 23/25 h; 2D/3D count weekdays through weekends
const SERIES = [['XAUUSD'], ['XAGUSD'], ['EURUSD'], ['USDJPY'], ['GBPUSD'], ['USDCAD'], ['USDSEK'], ['USDCHF'],
  ['GOLD_FUT', { realVolume: true }], ['SILVER_FUT', { realVolume: true }], ['WTI', { realVolume: true }], ['GLD', { realVolume: true, keepBreakHour: true }]]
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

/** The checker (A-E) for one series × timeframe. C = the candles under test (normally buildCandles(M, tf)). */
function checkTf(M, tf, vol, C) {
  const agg = new Map()
  for (const b of M) { const k = candleOpen(b.t, tf), a = agg.get(k)                       // independent, order-free group-by
    if (!a) agg.set(k, { o: b.o, h: b.h, l: b.l, c: b.c, n: 1, v: b.v || 0, first: b.t, last: b.t })
    else { if (b.h > a.h) a.h = b.h; if (b.l < a.l) a.l = b.l; if (b.t < a.first) { a.first = b.t; a.o = b.o } if (b.t >= a.last) { a.last = b.t; a.c = b.c } a.n++; a.v += b.v || 0 } }
  let A = 0, B = 0, Dd = 0, sumN = 0, sumV = 0, ex = null
  for (let i = 0; i < C.length; i++) { const c = C[i], a = agg.get(c.t); sumN += c.n; sumV += c.v || 0
    if (!a || a.o !== c.o || a.h !== c.h || a.l !== c.l || a.c !== c.c || a.n !== c.n || (vol && Math.abs(a.v - c.v) > 1e-6)) { A++; ex ??= { t: new Date(c.t).toISOString(), candle: c, regroup: a } }
    if (i && !(c.t > C[i - 1].t)) B++
    const nextT = C[i + 1]?.t ?? Infinity
    if (!a || !(c.t <= a.first) || !(a.last < nextT) || a.last + 60000 - c.t > MAX_SPAN[tf]) Dd++ }
  const vMin = vol ? M.reduce((s, b) => s + (b.v || 0), 0) : 0
  return { candles: C.length, A, B, C: sumN === M.length && agg.size === C.length, D: Dd, E: !vol || Math.abs(sumV - vMin) < 1e-6 * Math.max(1, vMin), ex, sumN, groups: agg.size, sumV, vMin }
}
// SELF-TEST — a checker that cannot fail proves nothing: five corruptions of real-shaped candles must each be caught, the clean build must pass
{ const t0 = Date.parse('2026-10-13T13:00:00Z'), M = Array.from({ length: 240 }, (_, i) => ({ t: t0 + i * 60000, o: 100 + i, h: 101 + i, l: 99 + i, c: 100.5 + i, v: 10 + i }))
  const good = buildCandles(M, '15m'), clean = checkTf(M, '15m', true, good)
  const bad = (f) => { const C = good.map((c) => ({ ...c })); f(C); return checkTf(M, '15m', true, C) }
  const caught = [clean.A === 0 && clean.B === 0 && clean.C && clean.D === 0 && clean.E,
    bad((C) => { C[3].h += 0.01 }).A > 0, bad((C) => { C.splice(5, 0, { ...C[5] }) }).B > 0, bad((C) => { C[7].n -= 1 }).C === false,
    bad((C) => { C[2].v += 5 }).E === false, bad((C) => { C[4].t -= 15 * 60000 }).D > 0]
  if (!caught.every(Boolean)) { console.log('✗ SELF-TEST: the checker missed a corruption ' + JSON.stringify(caught)); process.exit(1) }
  console.log('  self-test: clean build passes · wrong high, duplicate candle, dropped minute, wrong volume, candle outside its window → all 5 caught') }
const res = { at: new Date().toISOString(), from: new Date(HISTORY_CONTINUOUS_FROM).toISOString(), series: {}, failures: [] }
const fail = (s, why) => { res.failures.push(`${s}: ${why}`); console.log(`    ✗ ${why}`) }

for (const [sym, opt = {}] of SERIES) { if (only.length && !only.includes(sym)) continue
  const raw = (await loadBars(sym, '1m', { from: HISTORY_CONTINUOUS_FROM })).bars, { bars: M } = cleanForTv(raw, opt), vol = !!opt.realVolume
  const r = { minutes: M.length, first: new Date(M[0].t).toISOString(), last: new Date(M.at(-1).t).toISOString(), tf: {} }
  console.log(`  ${sym}: ${M.length.toLocaleString()} minutes ${r.first.slice(0, 10)} → ${r.last.slice(0, 16)}`)
  for (const tf of TFS) {
    const k = checkTf(M, tf, vol, buildCandles(M, tf))
    r.tf[tf] = { candles: k.candles, A_bad: k.A, B_bad: k.B, C_ok: k.C, D_bad: k.D, ...(vol ? { E_ok: k.E } : {}) }
    if (k.A) fail(sym, `${tf}: ${k.A} candles differ from the independent re-aggregation (e.g. ${JSON.stringify(k.ex).slice(0, 200)})`)
    if (k.B) fail(sym, `${tf}: ${k.B} candles out of order / duplicated`)
    if (!k.C) fail(sym, `${tf}: minutes in candles ${k.sumN} vs minutes ${M.length} · groups ${k.groups} vs candles ${k.candles}`)
    if (k.D) fail(sym, `${tf}: ${k.D} candles outside their own window`)
    if (!k.E) fail(sym, `${tf}: candle volume ${k.sumV} ≠ minute volume ${k.vMin}`) }
  console.log(`    16 timeframes: ${TFS.map((tf) => `${tf} ${r.tf[tf].candles.toLocaleString()}`).join(' · ')}`)
  // F — the LIVE loader's timeframes (UTC epoch grid, causal) vs nyCandles on fully-shared candles
  if (sym === 'XAUUSD' || sym === 'XAGUSD') { r.live = {}
    for (const [ltf, ntf] of [['3m', '3m'], ['15m', '15m'], ['1h', '1H']]) {
      const L = (await loadBars(sym, ltf, { from: HISTORY_CONTINUOUS_FROM })).bars, N = new Map(buildCandles(M, ntf).map((c) => [c.t, c]))
      const rawN = new Map(); for (const b of raw) { const k = Math.floor(b.t / (ltf === '3m' ? 180000 : ltf === '15m' ? 900000 : H)) * (ltf === '3m' ? 180000 : ltf === '15m' ? 900000 : H); rawN.set(k, (rawN.get(k) || 0) + 1) }
      let compared = 0, diff = 0, skipped = 0, ex = null
      for (const b of L) { const n = N.get(b.t); if (!n || n.n !== rawN.get(b.t)) { skipped++; continue }   // break minutes / stubs dropped → not the same minutes
        compared++; if (n.o !== b.o || n.h !== b.h || n.l !== b.l || n.c !== b.c) { diff++; ex ??= { t: new Date(b.t).toISOString(), live: b, ny: n } } }
      r.live[ltf] = { live_candles: L.length, compared, identical: compared - diff, different: diff, not_comparable: skipped }
      console.log(`    live loader ${ltf}: ${compared - diff}/${compared} candles identical to the TradingView build (${skipped.toLocaleString()} hold break/stub minutes by design)`)
      if (diff) fail(sym, `live ${ltf}: ${diff} candles differ (e.g. ${JSON.stringify(ex).slice(0, 200)})`) } }
  res.series[sym] = r
}
res.ok = res.failures.length === 0
if (!only.length) fs.writeFileSync(path.join(TURBO.master, 'timeframe_audit.json'), JSON.stringify(res, null, 1))
console.log(res.ok ? '✅ TIMEFRAMES VERIFIED: every candle on every timeframe = its minutes (12 series × 16 timeframes + live loader)' : `✗ TIMEFRAME AUDIT FAILED: ${res.failures.length} problem(s)`)
if (!res.ok) process.exitCode = 1
