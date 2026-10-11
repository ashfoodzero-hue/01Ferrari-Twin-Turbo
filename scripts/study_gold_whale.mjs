// ════════════════════════════════════════════════════════════════════════════════
// study_gold_whale.mjs — does the 15m "whale" reading (src/master/goldWhale.js: big-volume pressure in CME gold futures, as delivered
// 10 min late) tell gold's DIRECTION? (2026-10-09, Ashraf: "check whales direction for XAU, bullish or bearish on 15m")
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (written before the first run):
//   decisions  = every 15m close of XAU spot (Polygon bid) from 2024-10-20 to the tape end, while GC has delivered bars
//   event      = the reading turns BULLISH or BEARISH (it was not the same direction at the previous 15m decision) — new signals only
//   outcome    = from the decision close on the 1m bid: +$10 in the reading's direction before −$10 against, within 4 h (resolved only;
//                a minute touching both = ambiguous, excluded and counted); also the share whose 60-min return has the reading's sign
//   baseline   = gold's own drift: over ALL decisions, the share that went +$10 up first (for BULLISH) / down first (for BEARISH)
//   split      = TRAIN the first 60 % of the window, OOS the last 40 %
//   DIRECTION EDGE ⇔ OOS resolved n ≥ 100 AND OOS win share Wilson LB > OOS drift-adjusted baseline AND TRAIN win share > TRAIN baseline
//   otherwise the chart labels the gauge "measured: no direction edge — context only".
// Output: data/master/gold_whale_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { bucket15, whaleAt, WHALE } from '../src/master/goldWhale.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.parse('2024-10-20T00:00:00Z'), TGT = 10, HZ = 240
const G1 = fs.readFileSync(path.join(TURBO.historyAsset('GOLD_FUT'), '1m.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => b.t < TO)
const GC = bucket15(G1)
const X = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO + 86400000 })).bars
const XT = X.map((b) => b.t)
const lb = (t) => { let lo = 0, hi = XT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (XT[m] < t) lo = m + 1; else hi = m } return lo }
const SPLIT = FROM + 0.6 * (TO - FROM)

function outcome(k) {   // k = index of the first 1m bar at/after the decision; entry = close of the bar before
  const e = X[k - 1].c; let up = null
  for (let j = k; j < Math.min(X.length, k + HZ); j++) { const b = X[j]; if (b.t - X[k].t >= HZ * 60000) break
    const hu = b.h >= e + TGT, hd = b.l <= e - TGT
    if (hu && hd) return { first: 'AMBIG' }; if (hu) { up = 'UP'; break } if (hd) { up = 'DOWN'; break } }
  let r60 = null; const k60 = lb(X[k - 1].t + 60000 + 3600000) - 1; if (k60 > k && X[k60].t - X[k - 1].t <= 3600000 + 60000) r60 = X[k60].c - e
  return { first: up, r60 }
}

const all = { TRAIN: { n: 0, up: 0, down: 0 }, OOS: { n: 0, up: 0, down: 0 } }
const ev = []; let prev = null, gi = 0
for (let T = Math.ceil(FROM / 900000) * 900000; T <= TO; T += 900000) {
  const k = lb(T); if (k <= 0 || k >= X.length || X[k - 1].t !== T - 60000) { continue }   // gold must have the decision minute (market open)
  while (gi < GC.length && GC[gi].t + WHALE.tfMs <= T - WHALE.delayMs) gi++
  const w = whaleAt(GC, T, gi); if (!w || T - (w.lastDeliveredT + WHALE.tfMs) > 3 * 3600000) { prev = null; continue }   // GC closed / stale
  const o = outcome(k), part = T < SPLIT ? 'TRAIN' : 'OOS'
  if (o.first === 'UP' || o.first === 'DOWN') { all[part].n++; all[part][o.first === 'UP' ? 'up' : 'down']++ }
  if ((w.dir === 'BULLISH' || w.dir === 'BEARISH') && w.dir !== prev) ev.push({ T, part, dir: w.dir, pressure: w.pressure, big: w.big, first: o.first, r60: o.r60 })
  prev = w.dir
}
const stats = (part) => {
  const E = ev.filter((e) => e.part === part), res = E.filter((e) => e.first === 'UP' || e.first === 'DOWN')
  const win = res.filter((e) => (e.dir === 'BULLISH') === (e.first === 'UP')).length
  const A = all[part], pUp = A.up / A.n, nb = res.filter((e) => e.dir === 'BULLISH').length
  const base = res.length ? (nb * pUp + (res.length - nb) * (1 - pUp)) / res.length : null
  const r = E.filter((e) => e.r60 != null && e.r60 !== 0), r60 = r.length ? r.filter((e) => (e.dir === 'BULLISH') === (e.r60 > 0)).length / r.length : null
  const side = (d) => { const xs = res.filter((e) => e.dir === d); const wn = xs.filter((e) => (d === 'BULLISH') === (e.first === 'UP')).length; return { n: xs.length, win: xs.length ? +(wn / xs.length).toFixed(4) : null, base: +(d === 'BULLISH' ? pUp : 1 - pUp).toFixed(4) } }
  return { events: E.length, resolved: res.length, ambiguous: E.filter((e) => e.first === 'AMBIG').length, win_share: res.length ? +(win / res.length).toFixed(4) : null,
    win_lb: res.length ? +wilsonLowerBound(win, res.length).toFixed(4) : null, baseline: base == null ? null : +base.toFixed(4), all_decisions_up_first: +pUp.toFixed(4),
    ret60_sign_agree: r60 == null ? null : +r60.toFixed(4), bullish: side('BULLISH'), bearish: side('BEARISH') }
}
const TR = stats('TRAIN'), OOS = stats('OOS')
const edge = OOS.resolved >= 100 && OOS.win_lb > OOS.baseline && TR.win_share > TR.baseline
const out = { at: new Date().toISOString(), rule: WHALE, window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  target: TGT, horizon_min: HZ, gc_15m_bars: GC.length, train: TR, oos: OOS, verdict: edge ? 'DIRECTION_EDGE' : 'NO_DIRECTION_EDGE',
  reading: edge ? 'measured: the big-volume direction leads gold (context — not a trade rule)' : 'measured: no direction edge — the gauge shows where heavy volume closed, it does not predict gold' }
fs.writeFileSync(path.join(TURBO.master, 'gold_whale_study.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify({ train: TR, oos: OOS, verdict: out.verdict }, null, 1))
