// ════════════════════════════════════════════════════════════════════════════════
// study_release_bracket.mjs — the RELEASE BRACKET: trade the SIZE of USD releases without knowing the direction (2026-10-09; Ashraf chose it).
// Basis: study_event_reaction.mjs measured gold's 1 h range after FOMC 5.3× / NFP 2.6× / CPI 1.6× normal, direction a coin flip.
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). Events: data/calendar/history.json (official times), FOMC / NFP / CPI, 2013-07-21 → TURBO_VAL_TO,
// XAU spot 1m BID, FROZEN TAPE.
//   P0 = the bid close of the minute BEFORE the release; a = ATR14 of the last CLOSED 1h bar.
//   ORDERS (one-cancels-other), live from T−1 min to T+15 min: BUY STOP at P0 + k·a (fills when the ASK reaches it), SELL STOP at P0 − k·a
//   (fills when the BID reaches it); entry slippage 0.1·a (fast markets). A minute that triggers BOTH = a full loss (pessimistic).
//   EXIT: stop at P0 (risk = k·a + slippage), target = TM × k·a beyond the entry, the rest closed at the market at T+4 h; stop-first inside a
//   minute; exits on the correct side (a long sells at the bid, a short buys at the ask).
//   variants: k ∈ {0.25, 0.5} × TM ∈ {1, 2} = 4 per event type → 12 cells. SPREAD = the measured table × {1, 2, 3} (the table is hourly
//   averages — the spread AT a release is wider; ×3 is the binding test).
//   PASS ⇔ OOS n ≥ 30 AND OOS mean $/event at 3× spread, one-sided bootstrap bound (α 0.05/12) > 0 AND TRAIN mean at 3× spread > 0.
//   Split TRAIN 60 % / OOS 40 % by time. Events whose orders never fill count as $0 (no trade) and are reported.
// Output: data/master/release_bracket_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM), MIN = 60000
const KS = [0.25, 0.5], TMS = [1, 2], SPREADS = [1, 2, 3], Q = 0.05 / 12, rnd = seeded(5150)
const H = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events.filter((e) => ['FOMC', 'NFP', 'CPI'].includes(e.type) && e.t >= FROM && e.t + 4 * 3600000 <= TO)
const base = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const B1 = (await loadBars('XAUUSD', '1h', { from: FROM - 30 * 86400000, to: TO })).bars, A1 = atrArr(B1, 14), BT = Float64Array.from(B1.map((b) => b.t + 3600000))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }

// DIAGNOSTIC (added after the first run — counts only, no rule changed): how each bracket ended
let WHY = null
/** one bracket at release time T → $ result (0 = never filled), or null when the data is missing */
function bracket(T, k, TM, sm) {
  const spreadAt = (t) => sm * base(t), kp = lb(MT, T - MIN); if (kp >= M.length || M[kp].t !== T - MIN) return null
  const P0 = M[kp].c, ia = lb(BT, T + 1) - 1, a = ia >= 0 ? A1[ia] : null; if (!(a > 0)) return null
  const buyE = P0 + k * a, sellE = P0 - k * a, slip = 0.1 * a, risk = k * a, tFill = T + 15 * MIN, tEnd = T + 4 * 3600000
  let side = 0, fill = 0, stop = 0, tgt = 0, k0 = -1
  for (let j = lb(MT, T); j < M.length && M[j].t < tFill; j++) { const b = M[j], s = spreadAt(b.t), bu = b.h + s >= buyE, se = b.l <= sellE
    if (bu && se) { WHY.both++; return -(risk + slip) }                    // both triggered inside one minute → pessimistic full loss
    if (bu || se) { side = bu ? 1 : -1; fill = bu ? buyE + slip : sellE - slip; stop = P0; tgt = bu ? buyE + TM * risk : sellE - TM * risk; k0 = j
      if (bu ? b.l <= stop : b.h + s >= stop) { WHY.fillMinuteStop++; return -(Math.abs(fill - stop) + slip) }   // the fill minute also hits the stop
      break } }
  if (!side) { WHY.unfilled++; return 0 }
  let last = M[k0]
  for (let j = k0 + 1; j < M.length && M[j].t < tEnd; j++) { const b = M[j], s = spreadAt(b.t); last = b
    if (side > 0 ? b.l <= stop : b.h + s >= stop) { WHY.stopLater++; WHY.stopMin.push((b.t - T) / MIN); return -(Math.abs(fill - stop) + slip) }
    if (side > 0 ? b.h >= tgt : b.l + s <= tgt) { WHY.target++; return side > 0 ? tgt - fill : fill - tgt } }
  WHY.time++
  return side > 0 ? last.c - fill : fill - (last.c + spreadAt(last.t))
}
const summ = (xs) => { const v = xs.filter((x) => x != null), n = v.length, mean = n ? v.reduce((s, x) => s + x, 0) / n : null, b = []
  for (let i = 0; i < 4000 && n; i++) { let s = 0; for (let j = 0; j < n; j++) s += v[(rnd() * n) | 0]; b.push(s / n) }; b.sort((x, y) => x - y)
  return { n, filled: v.filter((x) => x !== 0).length, wins: v.filter((x) => x > 0).length, net: mean == null ? null : +mean.toFixed(3), net_lb: n ? +b[Math.floor(Q * b.length)].toFixed(3) : null } }

const cells = {}
for (const type of ['FOMC', 'NFP', 'CPI']) for (const k of KS) for (const TM of TMS) {
  const ev = H.filter((e) => e.type === type), r = { type, k, TM, events: ev.length }
  for (const sm of SPREADS) { if (sm === 1) WHY = { both: 0, fillMinuteStop: 0, unfilled: 0, stopLater: 0, stopMin: [], target: 0, time: 0 }
    const res = ev.map((e) => ({ part: e.t < SPLIT ? 'TRAIN' : 'OOS', v: bracket(e.t, k, TM, sm) }))
    if (sm === 1) { const sm2 = [...WHY.stopMin].sort((x, y) => x - y); r.why_x1 = { ...WHY, stopMin: undefined, median_minutes_to_later_stop: sm2.length ? sm2[Math.floor(sm2.length / 2)] : null } }
    r['spread_x' + sm] = { train: summ(res.filter((x) => x.part === 'TRAIN').map((x) => x.v)), oos: summ(res.filter((x) => x.part === 'OOS').map((x) => x.v)) } }
  const x3 = r.spread_x3; r.verdict = x3.oos.n >= 30 && x3.oos.net_lb > 0 && x3.train.net > 0 ? 'PASS' : 'FAIL'
  cells[`${type}|${k}|${TM}`] = r
  const f = (s) => `${s.oos.net} (filled ${s.oos.filled}/${s.oos.n}, wins ${s.oos.wins})`
  console.log(`   how it ended (×1, all events): ${JSON.stringify(r.why_x1)}`)
  console.log(`${type.padEnd(4)} k${k} TM${TM}: OOS $/event ×1 ${f(r.spread_x1)} · ×2 ${r.spread_x2.oos.net} · ×3 ${r.spread_x3.oos.net} [LB ${r.spread_x3.oos.net_lb}] · TRAIN ×3 ${r.spread_x3.train.net} → ${r.verdict}`)
}
const pass = Object.values(cells).filter((c) => c.verdict === 'PASS').map((c) => `${c.type} k${c.k} TM${c.TM}`)
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { ks: KS, tms: TMS, spreads: SPREADS, slip_atr1h: 0.1, order_window: 'T−1m … T+15m', horizon: '4h', alpha: Q }, cells, passing: pass, verdict: pass.length ? 'RELEASE_BRACKET_PASSES' : 'RELEASE_BRACKET_FAILS' }
fs.writeFileSync(path.join(TURBO.master, 'release_bracket_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> RELEASE BRACKET: ${out.verdict}${pass.length ? ' (' + pass.join(', ') + ')' : ''}`)
