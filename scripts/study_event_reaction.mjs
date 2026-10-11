// ════════════════════════════════════════════════════════════════════════════════
// study_event_reaction.mjs — how does GOLD react to USD releases? (2026-10-09; Ashraf: news/macro must show the reflection on XAU direction)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). Events: data/calendar/history.json (official times: FOMC from the Fed, CPI / NFP / PPI / JOLTS from
// BLS). XAU spot 1m BID, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. An event counts only if gold has the release minute's previous bar.
//   M1 SIZE      range (max high − min low) of [T, T+60m) ÷ the MEDIAN of the same UTC window on the 20 previous weekdays that are not
//                release days → median ratio + share > 2×; also [T−30m, T) and [T+60m, T+240m)
//   M2 DIRECTION share of events where close(T+60m) > close(T−1m) — vs 50 % (Wilson 95 %)
//   M3 FIRST-REACTION PERSISTENCE: sign of the first 5 minutes (close T+5 − close T−1) vs the next 55 (close T+60 − close T+5):
//                continuation share (zero moves excluded). Split TRAIN 60 % / OOS 40 % by time.
//                PERSISTS ⇔ OOS n ≥ 40 AND OOS Wilson LB > 50 % AND TRAIN share > 50 % AND the MONEY test passes: enter at T+5 in the
//                first move's direction (BUY pays the ask, measured spread), exit at T+60 at the market → OOS mean $/trade bootstrap
//                2.5 % bound > 0. (5 event types → Bonferroni noted; the money bound is the binding test.)
//   NOTE: the measured spread table is per hour of the week — the spread AT a release minute is wider in reality, so the money test is
//   optimistic, never pessimistic.
// ADDED 2026-10-09 (before its run): RETAIL (Census, 08:30 ET), FED_CHAIR and FED_GOV (Board speeches, start time). A speech counts only if
//   no scheduled release (FOMC / CPI / NFP / PPI / JOLTS / RETAIL) lies within ±2 h and it is not on an FOMC decision day. The quiet-day
//   baseline excludes days of every SCHEDULED release (now incl. RETAIL); speeches do not mark a day (they happen almost daily).
// Output: data/master/event_reaction_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM), MIN = 60000
const ALL = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events, SCHED = ['FOMC', 'CPI', 'NFP', 'PPI', 'JOLTS', 'RETAIL']
const schedT = ALL.filter((e) => SCHED.includes(e.type)).map((e) => e.t), fomcDays = new Set(ALL.filter((e) => e.type === 'FOMC').map((e) => Math.floor(e.t / 86400000)))
const isolated = (e) => !SCHED.includes(e.type) ? !schedT.some((t) => Math.abs(t - e.t) <= 2 * 3600000) && !fomcDays.has(Math.floor(e.t / 86400000)) : true
const H = ALL.filter((e) => e.t >= FROM && e.t + 240 * MIN <= TO && isolated(e))
const spreadAt = makeSpreadAt(), rnd = seeded(2468)
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 40 * 86400000, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const closeAt = (t) => { const k = lb(t + 1) - 1; return k >= 0 && t - M[k].t < 5 * MIN ? M[k].c : null }   // last close at/before t (≤ 5 min stale)
const range = (t0, t1) => { let hi = -Infinity, lo = Infinity; for (let k = lb(t0); k < M.length && M[k].t < t1; k++) { if (M[k].h > hi) hi = M[k].h; if (M[k].l < lo) lo = M[k].l } return Number.isFinite(hi) ? hi - lo : null }
const eventDays = new Set(ALL.filter((e) => SCHED.includes(e.type)).map((e) => Math.floor(e.t / 86400000)))
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null }
function baseline(T, w0, w1) {   // same UTC window on the 20 previous non-release weekdays
  const out = []; for (let d = 1; out.length < 20 && d < 60; d++) { const t = T - d * 86400000, dow = new Date(t).getUTCDay(); if (dow === 0 || dow === 6 || eventDays.has(Math.floor(t / 86400000))) continue; const r = range(t + w0, t + w1); if (r != null && r > 0) out.push(r) }
  return out.length >= 10 ? median(out) : null
}
const res = {}
for (const type of ['CPI', 'NFP', 'PPI', 'JOLTS', 'FOMC', 'RETAIL', 'FED_CHAIR', 'FED_GOV']) {
  const E = []
  for (const e of H.filter((x) => x.type === type)) {
    const c0 = closeAt(e.t - MIN), c5 = closeAt(e.t + 5 * MIN), c60 = closeAt(e.t + 60 * MIN); if (c0 == null || c5 == null || c60 == null) continue
    const r60 = range(e.t, e.t + 60 * MIN), b60 = baseline(e.t, 0, 60 * MIN), rPre = range(e.t - 30 * MIN, e.t), bPre = baseline(e.t, -30 * MIN, 0), rPost = range(e.t + 60 * MIN, e.t + 240 * MIN), bPost = baseline(e.t, 60 * MIN, 240 * MIN)
    const first = Math.sign(c5 - c0), next = Math.sign(c60 - c5), up = first > 0, k5 = lb(e.t + 5 * MIN)
    const entry = up ? c5 + spreadAt(e.t + 5 * MIN) : c5, exit = up ? c60 : c60 + spreadAt(e.t + 60 * MIN)
    E.push({ t: e.t, part: e.t < SPLIT ? 'TRAIN' : 'OOS', ratio60: b60 ? r60 / b60 : null, ratioPre: bPre && rPre != null ? rPre / bPre : null, ratioPost: bPost && rPost != null ? rPost / bPost : null,
      up60: c60 > c0, cont: first === 0 || next === 0 ? null : first === next, net: first === 0 ? null : up ? exit - entry : entry - exit, move60: Math.abs(c60 - c0) })
  }
  const share = (xs) => { const n = xs.length, w = xs.filter(Boolean).length; return { n, share: n ? +(w / n).toFixed(4) : null, lb: n ? +wilsonLowerBound(w, n).toFixed(4) : null } }
  const money = (xs) => { const v = xs.filter((x) => x.net != null), n = v.length, mean = n ? v.reduce((s, x) => s + x.net, 0) / n : null, b = []
    for (let i = 0; i < 2000 && n; i++) { let s = 0; for (let j = 0; j < n; j++) s += v[(rnd() * n) | 0].net; b.push(s / n) }; b.sort((x, y) => x - y); return { n, net: mean == null ? null : +mean.toFixed(3), net_lb: n ? +b[50].toFixed(3) : null } }
  const part = (p) => E.filter((x) => x.part === p)
  const r = { events: E.length,
    size: { median_ratio_60m: +median(E.map((x) => x.ratio60)).toFixed(2), share_over_2x: +(E.filter((x) => x.ratio60 > 2).length / E.filter((x) => x.ratio60 != null).length).toFixed(3), median_ratio_pre30: +median(E.map((x) => x.ratioPre)).toFixed(2), median_ratio_60_240: +median(E.map((x) => x.ratioPost)).toFixed(2), median_abs_move_60m: +median(E.map((x) => x.move60)).toFixed(2) },
    direction_up_60m: share(E.map((x) => x.up60)),
    persistence: { train: share(part('TRAIN').filter((x) => x.cont != null).map((x) => x.cont)), oos: share(part('OOS').filter((x) => x.cont != null).map((x) => x.cont)), money_oos: money(part('OOS')), money_train: money(part('TRAIN')) } }
  const p = r.persistence; r.persistence.verdict = p.oos.n >= 40 && p.oos.lb > 0.5 && p.train.share > 0.5 && p.money_oos.net_lb > 0 ? 'PERSISTS' : 'DOES_NOT_PERSIST'
  res[type] = r
  console.log(`${type.padEnd(9)} n ${E.length} · 1h range ${r.size.median_ratio_60m}× normal (${(100 * r.size.share_over_2x).toFixed(0)}% > 2×) · 30m before ${r.size.median_ratio_pre30}× · 1-4h after ${r.size.median_ratio_60_240}× · median |move| $${r.size.median_abs_move_60m} · up-after ${r.direction_up_60m.share} · first-5m persists OOS ${p.oos.share} (LB ${p.oos.lb}, n ${p.oos.n}) TRAIN ${p.train.share} · $/t OOS ${p.money_oos.net} [${p.money_oos.net_lb}] → ${p.verdict}`)
}
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10), results: res,
  persisting: Object.entries(res).filter(([, r]) => r.persistence.verdict === 'PERSISTS').map(([k]) => k) }
fs.writeFileSync(path.join(TURBO.master, 'event_reaction_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> EVENT REACTION: first-reaction persistence ${out.persisting.length ? 'PERSISTS for ' + out.persisting.join(', ') : 'does not persist for any release type'}`)
