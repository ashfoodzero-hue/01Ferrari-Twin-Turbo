// smoke_session_candles.mjs — the general session-candle builder (src/core/sessionCandles.js, 2026-10-18):
//   (1) SESSIONS.gold reproduces nyCandles EXACTLY (minutes + all 16 timeframes, 2023 → now, a 3-year slice to stay fast);
//   (2) WTI on SESSIONS.cme and DXY on SESSIONS.dxyIce: every TradingView candle open (saved references, CDP 2026-10-18) is one of ours on
//       every timeframe (where we hold minutes), and on 1D / 2D / 3D / 1W / 1M ours = TradingView's exactly.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import * as NY from '../src/core/nyCandles.js'
import { makeSession, SESSIONS, TFS } from '../src/core/sessionCandles.js'
import { raw1m } from './lib/series_1m.mjs'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SESSION CANDLES SMOKE ██')
const RES = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '2H': '120', '3H': '180', '4H': '240', '6H': '360', '9H': '540', '1D': '1D', '2D': '2D', '3D': '3D', '1W': '1W', '1M': '1M' }
await ok('SESSIONS.gold = nyCandles exactly (cleaned minutes + every candle on all 16 timeframes, 2023 → now)', async () => {
  const raw = (await loadBars('XAUUSD', '1m', { from: Date.parse('2023-01-01') })).bars, g = makeSession(SESSIONS.gold), A = NY.cleanForTv(raw).bars, B = g.clean(raw).bars
  assert.equal(A.length, B.length); for (let i = 0; i < A.length; i++) assert.equal(A[i].t, B[i].t)
  for (const tf of TFS) { const c1 = NY.buildCandles(A, tf), c2 = g.buildCandles(B, tf); assert.equal(c1.length, c2.length, tf)
    for (let i = 0; i < c1.length; i++) { const x = c1[i], y = c2[i]; assert(x.t === y.t && x.o === y.o && x.h === y.h && x.l === y.l && x.c === y.c && x.n === y.n && x.td === y.td, `${tf} candle ${new Date(x.t).toISOString()}`) } }
})
for (const [sym, ses, file, from] of [['WTI', 'cme', 'tv_anchor_reference_CL1.json', -Infinity], ['DXY', 'dxyIce', 'tv_anchor_reference_DXY.json', Date.parse('2021-07-01')]]) {
  await ok(`${sym} on SESSIONS.${ses}: every TradingView open is one of ours (all 16 TFs, where we hold minutes); 1D / 2D / 3D / 1W / 1M exactly equal`, async () => {
    const ref = JSON.parse(fs.readFileSync(path.join(TURBO.master, file), 'utf8')).res, S = makeSession(SESSIONS[ses])
    const M = S.clean(await raw1m(sym, Date.parse('2020-01-01')), { realVolume: sym === 'WTI' }).bars, MT = Float64Array.from(M.map((b) => b.t)), last = M.at(-1).t
    const hasMinute = (a, z) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < a) lo = m + 1; else hi = m } return lo < MT.length && MT[lo] < z }
    for (const tf of TFS) { const tv = (ref[RES[tf]] ?? []).map((s) => s * 1000); if (!tv.length) continue
      const ours = S.buildCandles(M, tf), lo = Math.max(tv[0], ours[1].t, from), hi = Math.min(tv.at(-1), last), oS = new Set(ours.map((c) => c.t))
      const T = tv.filter((t) => t >= lo && t <= hi), lack = T.filter((t, i) => !oS.has(t) && hasMinute(t, T[i + 1] ?? t + 60000))
      assert(lack.length <= 2, `${tf}: ${lack.length} TradingView opens we lack, e.g. ${lack.slice(0, 3).map((t) => new Date(t).toISOString()).join(' ')}`)   // ≤ 2: DXY Christmas / New Year Eve 18:00 15m/30m
      if (['1D', '2D', '3D', '1W', '1M'].includes(tf)) { const tS = new Set(T); const extra = ours.filter((c) => c.t >= lo && c.t <= hi && !tS.has(c.t)); assert.equal(extra.length, 0, `${tf}: ${extra.length} of our opens not on TradingView`); assert.equal(lack.length, 0, tf) } }
  })
}
console.log(process.exitCode ? '✗ SESSION CANDLES SMOKE FAILED' : `✅ SESSION CANDLES SMOKE: ${n} passed, 0 failed`)
