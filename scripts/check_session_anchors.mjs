// check_session_anchors.mjs — every TradingView candle open (in the overlap) = one of ours, and ours = TradingView's, per timeframe, for a session
// rule (src/core/sessionCandles.js). Usage: node scripts/check_session_anchors.mjs <tv_history.json> <XAUUSD|XAGUSD|DXY|WTI> <gold|cme|dxyIce>
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import { raw1m } from './lib/series_1m.mjs'
import { makeSession, SESSIONS, TFS } from '../src/core/sessionCandles.js'

const TV = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).res, SYM = process.argv[3], SES = makeSession({ ...SESSIONS[process.argv[4]], ...JSON.parse(process.env.SPEC || '{}') })
const RES = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '2H': '120', '3H': '180', '4H': '240', '6H': '360', '9H': '540', '1D': '1D', '2D': '2D', '3D': '3D', '1W': '1W', '1M': '1M' }
const M = SES.clean(await raw1m(SYM, Date.parse('2020-01-01')), { realVolume: SYM === 'WTI' }).bars, MT = Float64Array.from(M.map((b) => b.t)), last = M.at(-1).t, CHECK_FROM = process.argv[5] ? Date.parse(process.argv[5]) : -Infinity
const hasMinute = (a, z) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < a) lo = m + 1; else hi = m } return lo < MT.length && MT[lo] < z }
const out = {}
for (const tf of TFS) { const bars = TV[RES[tf]]; if (!bars?.length) { console.log(`  ${tf}: no TradingView bars`); continue }
  const tv = bars.map((b) => b[0] * 1000), ours = SES.buildCandles(M, tf), lo = Math.max(tv[0], ours[1].t, CHECK_FROM), hi = Math.min(tv.at(-1), last)
  const T = tv.filter((t) => t >= lo && t <= hi), O = ours.filter((c) => c.t >= lo && c.t <= hi).map((c) => c.t), oS = new Set(O), tS = new Set(T)
  const lack = T.map((t, i) => [t, tv[tv.indexOf(t) + 1] ?? t + 60000]).filter(([t]) => !oS.has(t)), gaps = lack.filter(([a, z]) => !hasMinute(a, z)), missing = lack.filter(([a, z]) => hasMinute(a, z)), extra = O.filter((t) => !tS.has(t))
  out[tf] = { tv: T.length, ours: O.length, missing: missing.length, data_gaps: gaps.length, extra: extra.length }
  console.log(`  ${tf.padEnd(3)} TradingView ${String(T.length).padStart(6)} · ours ${String(O.length).padStart(6)} · TV opens we lack (with our data inside) ${missing.length}${missing.length ? ' e.g. ' + missing.slice(0, 2).map(([t]) => new Date(t).toISOString().slice(0, 16)).join(' ') : ''} · our opens TV lacks ${extra.length}${extra.length ? ' e.g. ' + extra.slice(0, 2).map((t) => new Date(t).toISOString().slice(0, 16)).join(' ') : ''} · data gaps ${gaps.length}`) }
