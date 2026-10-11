// ════════════════════════════════════════════════════════════════════════════════
// study_release_bracket_ticks.mjs — the RELEASE BRACKET replayed on REAL TICKS (2026-10-09). The 1m version (study_release_bracket.mjs)
// FAILED, but its diagnostic measured that the verdict is decided inside the release minute, where 1m bars cannot tell whether the stop
// was touched before or after the fill (the release bar opens AT the stop). Real ticks settle it — and carry the REAL release spread.
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). Ticks: data/calendar/release_ticks (fetch_release_ticks.mjs, Polygon /v3/quotes, T−2 … T+30 min).
//   USABLE event ⇔ ≥ 200 quotes in [T−1 min, T+5 min) (2021-2024 carry ~3 quotes / min → excluded, counted).
//   P0 = the last BID before T; a = ATR14 of the last closed 1h bar. Orders live from T to T+15 min, one-cancels-other:
//     BUY STOP P0 + k·a fills at the first tick whose ASK ≥ it, at that ask + 0.02·a; SELL STOP P0 − k·a at the first BID ≤ it, minus 0.02·a.
//   EXITS on ticks until T+30 min (long: stop when the BID ≤ P0 → at that bid − 0.02·a; target when the BID ≥ entry + TM·k·a → at the
//     target; short mirrored on the ASK), then on 1m bars (measured spread table, stop-first) until T+4 h, then at the market.
//   12 cells = {FOMC, NFP, CPI} × k {0.25, 0.5} × TM {1, 2}. Split TRAIN 60 % / OOS 40 % by time (same date as the 1m study).
//   PASS ⇔ OOS usable n ≥ 30 AND OOS mean $/event one-sided bootstrap bound (α 0.05/12) > 0 AND TRAIN mean > 0.
// Output: data/master/release_bracket_ticks_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM), MIN = 60000
const KS = [0.25, 0.5], TMS = [1, 2], LAT = 0.02, Q = 0.05 / 12, rnd = seeded(808080), spreadAt = makeSpreadAt()
const DIR = path.join(TURBO.root, 'data', 'calendar', 'release_ticks')
const EV = fs.readdirSync(DIR).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))).filter((e) => e.t >= FROM && e.t + 4 * 3600000 <= TO).sort((a, b) => a.t - b.t)
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const B1 = (await loadBars('XAUUSD', '1h', { from: FROM - 30 * 86400000, to: TO })).bars, A1 = atrArr(B1, 14), BT = Float64Array.from(B1.map((b) => b.t + 3600000))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const usable = (e) => e.q.filter(([t]) => t >= e.t - MIN && t < e.t + 5 * MIN).length >= 200

function bracket(e, k, TM) {
  const q = e.q, T = e.t, before = q.filter(([t]) => t < T); if (!before.length) return null
  const P0 = before.at(-1)[1], ia = lb(BT, T + 1) - 1, a = ia >= 0 ? A1[ia] : null; if (!(a > 0)) return null
  const buyE = P0 + k * a, sellE = P0 - k * a, lat = LAT * a
  let side = 0, fill = 0, tgt = 0, i = 0
  for (; i < q.length; i++) { const [t, bid, ask] = q[i]; if (t < T) continue; if (t >= T + 15 * MIN) break
    if (ask >= buyE) { side = 1; fill = ask + lat; tgt = fill + TM * k * a; break }
    if (bid <= sellE) { side = -1; fill = bid - lat; tgt = fill - TM * k * a; break } }
  if (!side) return { v: 0, how: 'unfilled' }
  for (i = i + 1; i < q.length; i++) { const [t, bid, ask] = q[i]; if (t >= T + 30 * MIN) break
    if (side > 0 ? bid <= P0 : ask >= P0) return { v: side > 0 ? bid - lat - fill : fill - (ask + lat), how: 'stop (ticks)' }
    if (side > 0 ? bid >= tgt : ask <= tgt) return { v: side > 0 ? tgt - fill : fill - tgt, how: 'target (ticks)' } }
  // after T+30 min: 1m bars (stop-first), measured spread, to T+4 h
  let last = null, slip = Math.min(0.3, 0.05 * a)
  for (let j = lb(MT, T + 30 * MIN); j < M.length && M[j].t < T + 4 * 3600000; j++) { const b = M[j], s = spreadAt(b.t); last = b
    if (side > 0 ? b.l <= P0 : b.h + s >= P0) return { v: side > 0 ? P0 - slip - fill : fill - (P0 + slip), how: 'stop (1m)' }
    if (side > 0 ? b.h >= tgt : b.l + s <= tgt) return { v: side > 0 ? tgt - fill : fill - tgt, how: 'target (1m)' } }
  if (!last) return null
  return { v: side > 0 ? last.c - fill : fill - (last.c + spreadAt(last.t)), how: 'time' }
}
const summ = (xs) => { const n = xs.length, mean = n ? xs.reduce((s, x) => s + x, 0) / n : null, b = []
  for (let i = 0; i < 4000 && n; i++) { let s = 0; for (let j = 0; j < n; j++) s += xs[(rnd() * n) | 0]; b.push(s / n) }; b.sort((x, y) => x - y)
  return { n, wins: xs.filter((x) => x > 0).length, net: mean == null ? null : +mean.toFixed(3), net_lb: n ? +b[Math.floor(Q * b.length)].toFixed(3) : null } }

const use = EV.filter(usable), excl = {}; for (const e of EV) if (!usable(e)) { const y = new Date(e.t).getUTCFullYear(); excl[y] = (excl[y] || 0) + 1 }
console.log(`release events ${EV.length} · usable ${use.length} · excluded (thin / empty ticks) by year ${JSON.stringify(excl)}`)
const cells = {}
for (const type of ['FOMC', 'NFP', 'CPI']) for (const k of KS) for (const TM of TMS) {
  const res = use.filter((e) => e.type === type).map((e) => ({ part: e.t < SPLIT ? 'TRAIN' : 'OOS', r: bracket(e, k, TM) })).filter((x) => x.r)
  const how = {}; for (const x of res) how[x.r.how] = (how[x.r.how] || 0) + 1
  const r = { type, k, TM, train: summ(res.filter((x) => x.part === 'TRAIN').map((x) => x.r.v)), oos: summ(res.filter((x) => x.part === 'OOS').map((x) => x.r.v)), how }
  r.verdict = r.oos.n >= 30 && r.oos.net_lb > 0 && r.train.net > 0 ? 'PASS' : r.oos.n < 30 ? 'UNDERPOWERED' : 'FAIL'
  cells[`${type}|${k}|${TM}`] = r
  console.log(`${type.padEnd(4)} k${k} TM${TM}: TRAIN n ${r.train.n} $/event ${r.train.net} (wins ${r.train.wins}) · OOS n ${r.oos.n} $/event ${r.oos.net} [LB ${r.oos.net_lb}] (wins ${r.oos.wins}) · ${JSON.stringify(how)} → ${r.verdict}`)
}
const pass = Object.values(cells).filter((c) => c.verdict === 'PASS').map((c) => `${c.type} k${c.k} TM${c.TM}`)
const out = { at: new Date().toISOString(), split: new Date(SPLIT).toISOString().slice(0, 10), usable: use.length, excluded_by_year: excl, rules: { ks: KS, tms: TMS, latency_atr: LAT, min_quotes: 200, alpha: Q }, cells, passing: pass,
  verdict: pass.length ? 'RELEASE_BRACKET_PASSES_ON_TICKS' : Object.values(cells).every((c) => c.verdict === 'UNDERPOWERED') ? 'UNDERPOWERED' : 'RELEASE_BRACKET_FAILS_ON_TICKS' }
fs.writeFileSync(path.join(TURBO.master, 'release_bracket_ticks_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> RELEASE BRACKET (ticks): ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
