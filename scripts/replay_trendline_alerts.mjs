// ════════════════════════════════════════════════════════════════════════════════
// replay_trendline_alerts.mjs <SYM> [days=60] — PROOF of the live major-trendline alerts (2026-10-18). Replays the last `days` minute by minute with the
// LIVE code (scripts/lib/trendline_live.mjs: liveLines at every new 4H candle, tickCheck 20 s after every minute) and compares every alert it would
// send with the TRUTH = the study's rules on the full history (src/master/trendlines.js evaluateLine on closed candles, major lines, 4H + 1D):
//   every touch → 📐 AT on that candle · every respect → ✅ BOUNCED · every break (touched or unarmed) → ❌ BROKEN.
// Must be: missing 0, extra 0. Writes data/master/trendline_alerts_replay_<short>.json.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { majorPivots, buildLines, evaluateLine } from '../src/master/trendlines.js'
import { liveLines, tickCheck, openOf } from './lib/trendline_live.mjs'
import { TL_ALERT_TFS } from './lib/trendline_alerts.mjs'

const SYM = process.argv[2] || 'XAUUSD', DAYS = +(process.argv[3] || 60), K = kit(SYM), M = await clean1m(SYM), holes = findHoles(M)
const CF = {}; for (const tf of TL_ALERT_TFS) { CF[tf] = K.build(M, tf); markIncomplete(CF[tf], holes) }
const END = M.at(-1).t + 60000, START = END - DAYS * 86400000, lag = SYM === 'WTI' ? 15 : 5
// ── truth: the study's rules on the full history, events whose decision candle lies in the replay window ──
const truth = new Map()
for (const tf of TL_ALERT_TFS) { const C = CF[tf].filter((c) => c.t < openOf(SYM, END, tf)), breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14)
  for (const ln of buildLines(C, majorPivots(C, breaks), A)) { const e = evaluateLine(C, A, ln); if (!e.born) continue
    const id = `${SYM}|${tf}|${ln.side}|${C[ln.i1].t}|${C[ln.i2].t}`, inW = (i) => C[i].t >= START
    for (const t of e.touches) { if (inW(t.i)) truth.set(`T:${id}:${C[t.i].t}`, { tf, candle: C[t.i].t }); if (t.outcome === 'respect' && inW(t.resolvedI)) truth.set(`R:${id}:${C[t.i].t}`, { tf, candle: C[t.resolvedI].t }) }
    if ((e.end === 'break' || e.end === 'break_unarmed') && inW(e.endI)) truth.set(`B:${id}`, { tf, candle: C[e.endI].t }) } }
// ── replay with the live code ──
const got = new Map(); let L = null, lastKey = null, ticks = 0
const lb = (t) => { let a = 0, b = M.length; while (a < b) { const m = (a + b) >> 1; if (M[m].t < t) a = m + 1; else b = m } return a }
for (let k = lb(START); k < M.length; k++) { const now = M[k].t + 60000 + 20000
  const key = openOf(SYM, now, '4H')
  if (key !== lastKey) { lastKey = key; const r = liveLines(SYM, [], now, { candles: CF }); L = r.live; for (const e of r.events) if (!got.has(e.key)) got.set(e.key, { tf: e.tf, candle: e.candle, at: now, by: 'close' }) }
  const from = Math.min(...TL_ALERT_TFS.map((tf) => L.tf[tf].last_closed)) - 60000, r = tickCheck(SYM, L, M.slice(lb(from), k + 1), now, { lagMin: lag }); ticks++
  for (const e of r.events) if (!got.has(e.key)) got.set(e.key, { tf: e.tf, candle: e.candle, at: now, by: 'tick' }) }
// lines refreshed after the last candle closes (the live 4H-close run) — catches breaks / bounces decided on the final closed candle
{ const r = liveLines(SYM, [], END + 3 * 86400000, { candles: CF }); for (const e of r.events) if (!got.has(e.key)) got.set(e.key, { tf: e.tf, candle: e.candle, at: END, by: 'close' }) }
// The ONE explained difference: a live ✅ BOUNCED on candle j (price reached 1 ATR away during j) whose candle j then CLOSED ≥ 0.25 ATR through —
// the study cannot see the order inside a candle and counts it as BROKEN (conservative); live sends BOUNCED when it happens, then BROKEN at the close.
// Allowed ONLY if a ❌ BROKEN for the same line on the same candle is also sent.
const missing = [...truth.keys()].filter((k) => !got.has(k)), extraAll = [...got.keys()].filter((k) => !truth.has(k) && got.get(k).candle >= START)
const lineOf = (k) => k.slice(2).split(':')[0], sameCandleBreak = (k) => k[0] === 'R' && got.get(k).by === 'tick' && got.has(`B:${lineOf(k)}`) && got.get(`B:${lineOf(k)}`).candle === got.get(k).candle
const explained = extraAll.filter(sameCandleBreak), extra = extraAll.filter((k) => !sameCandleBreak(k))
const by = (keys, m) => { const o = {}; for (const k of keys) { const x = `${k[0]} ${m.get(k).tf}`; o[x] = (o[x] || 0) + 1 } return o }
const lagMin = [...got.entries()].filter(([k, v]) => k[0] === 'T' && truth.has(k)).map(([, v]) => Math.round((v.at - v.candle) / 60000)).sort((a, b) => a - b)
const res = { at: new Date().toISOString(), symbol: SYM, days: DAYS, window: [new Date(START).toISOString(), new Date(END).toISOString()], ticks, truth: truth.size, truth_by_type: by([...truth.keys()], truth), alerts: got.size, missing: missing.length, extra: extra.length, bounced_then_broken_same_candle: explained.length, explained_keys: explained.slice(0, 20),
  missing_keys: missing.slice(0, 20), extra_keys: extra.slice(0, 20), at_alert_minutes_after_candle_open: { p50: lagMin[lagMin.length >> 1] ?? null, n: lagMin.length } }
fs.writeFileSync(path.join(TURBO.master, `trendline_alerts_replay_${SHORT[SYM]}.json`), JSON.stringify(res, null, 1))
console.log(`  replay ${SYM} ${DAYS} d: ${ticks} minute ticks · truth ${truth.size} ${JSON.stringify(res.truth_by_type)} · alerts ${got.size} · MISSING ${missing.length} · EXTRA ${extra.length} (+ ${explained.length} bounced-then-broken on the same candle, BROKEN also sent)`)
for (const k of missing.slice(0, 5)) console.log('   missing', k, new Date(truth.get(k).candle).toISOString())
for (const k of extra.slice(0, 5)) console.log('   extra  ', k, new Date(got.get(k).candle).toISOString(), got.get(k).by)
process.exit(missing.length || extra.length ? 1 : 0)
