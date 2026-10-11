// ════════════════════════════════════════════════════════════════════════════════
// study_day_levels.mjs — TOOL 3, TESTS A1 + A2: previous-2-days and today's HIGH / LOW on gold (2026-10-09; Ashraf: "identification for
// the previous 2 days H/L and current day H/L … where the trend is targeting … backtest if it gives great results")
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot, Polygon BID 1m, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. Levels: src/master/dayLevels.js.
//   D = 0.25·ATR14(1d) of the last closed day · horizon 24 h · split TRAIN 60 % / OOS 40 %
// A1 BOUNCE (6 cells: PDH, PDL, P2DH, P2DL, TDH, TDL; z 2.39 = one-sided α 0.05/6):
//   prior-day levels: the FIRST touch during day D, approached from the side of day D's first minute (above → support, bounce = up)
//   TDH / TDL: level = today's high / low as of the last closed hour; armed when that hour did NOT touch it (price had moved away);
//              event = the first touch in the next hour (TDH → resistance, bounce = down; TDL → support); one event per level value
//   bounce / control / money: exactly as tools 1-2 (bounceTest.race, random-level control ±2 weeks, bounceTest.limitTrade)
//   cell HOLDS ⇔ study_stats.levelVerdict (OOS ≥ 100, Wilson LB > control, TRAIN > control, OOS money LB > 0)
// A2 MAGNET (4 cells: PDH, PDL, P2DH, P2DL; z 2.24 = α 0.05/4): at day D's first minute, with the level NOT yet reached, does price touch
//   it during day D? CONTROL = the mirror level (same distance on the other side of the open). MAGNET ⇔ OOS n ≥ 100 AND hit-rate Wilson
//   LB > mirror hit-rate AND TRAIN hit-rate > TRAIN mirror. (A magnet says WHERE price tends to go; it is not a trade by itself.)
// Output: data/master/day_levels_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { dayLevelRunner } from './lib/day_level_events.mjs'
import { dailyStats, prevDays, DAY_MS } from '../src/master/dayLevels.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), Z1 = 2.39, Z2 = 2.24, HZ = DAY_MS, MIN_N = 100
const spreadAt = makeSpreadAt(), rnd = seeded(31415)
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 20 * DAY_MS, to: TO })).bars   // frozen tape
const D1 = (await loadBars('XAUUSD', '1d', { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A1 = atrArr(D1, 14)
const atrBefore = (d) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY_MS <= d) lo = m + 1; else hi = m } return lo ? A1[lo - 1] : null }
const { list } = dailyStats(M)
console.log(`1m bars ${M.length.toLocaleString()} · days ${list.length} · full days (≥600 min) ${list.filter((s) => s.minutes >= 600).length}`)

const EV = { PDH: [], PDL: [], P2DH: [], P2DL: [], TDH: [], TDL: [] }, MAG = { PDH: [], PDL: [], P2DH: [], P2DL: [] }
const R = dayLevelRunner({ M, TO, SPLIT, HZ, rnd, spreadAt })   // scripts/lib/day_level_events.mjs (shared with tool 4)
const levelEvent = (type, kT, up, lvl, a) => R.levelEvent(EV[type], kT, up, lvl, a)
for (let j = 0; j < list.length; j++) {
  const S = list[j]; if (S.day < FROM || S.day + DAY_MS > TO) continue
  const P = prevDays(list.slice(Math.max(0, j - 10), j), S.day), a = atrBefore(S.day); if (!P || !(a > 0)) continue
  for (const [type, lvl] of [['PDH', P.pd.h], ['PDL', P.pd.l], ['P2DH', P.p2d.h], ['P2DL', P.p2d.l]]) R.priorDayLevel(S, lvl, a, EV[type], MAG[type])
  // TDH / TDL: per closed hour of the day
  let tdh = -Infinity, tdl = Infinity, firedH = null, firedL = null
  for (let hStart = S.day; hStart < S.day + DAY_MS; hStart += 3600000) {
    let hh = -Infinity, hl = Infinity, kEnd = -1
    for (let k = S.firstK; k <= S.lastK; k++) { if (M[k].t < hStart) continue; if (M[k].t >= hStart + 3600000) break; if (M[k].h > hh) hh = M[k].h; if (M[k].l < hl) hl = M[k].l; kEnd = k }
    if (kEnd < 0) continue
    const prevH = tdh, prevL = tdl; tdh = Math.max(tdh, hh); tdl = Math.min(tdl, hl)
    if (!Number.isFinite(prevH)) continue
    // the level after this hour's close; armed if this hour did not touch it (made it earlier and moved away)
    const nextStart = hStart + 3600000
    const scan = (lvl, isHigh) => { for (let k = kEnd + 1; k <= S.lastK && M[k].t < nextStart + 3600000; k++) { if (isHigh ? M[k].h >= lvl : M[k].l <= lvl) return k } return -1 }
    if (hh < tdh && firedH !== tdh) { const k = scan(tdh, true); if (k >= 0) { firedH = tdh; levelEvent('TDH', k, false, tdh, a) } }
    if (hl > tdl && firedL !== tdl) { const k = scan(tdl, false); if (k >= 0) { firedL = tdl; levelEvent('TDL', k, true, tdl, a) } }
  }
}

const stat = (E) => levelStat(E, rnd, Z1), A1out = {}
for (const [type, E] of Object.entries(EV)) { const TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS')); A1out[type] = { train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N) }
  console.log(`A1 ${type.padEnd(4)}: OOS bounce ${OOS.bounce} (LB ${OOS.bounce_lb}) vs control ${OOS.control} · TRAIN ${TR.bounce} vs ${TR.control} · $/t ${OOS.net} (${OOS.net_R} R, n ${OOS.trades}) → ${A1out[type].verdict}`) }
const mstat = (E) => { const n = E.length, h = E.filter((e) => e.hit).length, hm = E.filter((e) => e.hitM).length
  return { n, hit: n ? +(h / n).toFixed(4) : null, hit_lb: n ? +wilsonLowerBound(h, n, Z2).toFixed(4) : null, mirror: n ? +(hm / n).toFixed(4) : null, avg_dist_atr: n ? +(E.reduce((s, e) => s + e.dist, 0) / n).toFixed(3) : null } }
const A2out = {}
for (const [type, E] of Object.entries(MAG)) { const TR = mstat(E.filter((e) => e.part === 'TRAIN')), OOS = mstat(E.filter((e) => e.part === 'OOS'))
  A2out[type] = { train: TR, oos: OOS, verdict: OOS.n < MIN_N ? 'UNDERPOWERED' : OOS.hit_lb > OOS.mirror && TR.hit > TR.mirror ? 'MAGNET' : 'NOT_A_MAGNET' }
  console.log(`A2 ${type.padEnd(4)}: OOS hit ${OOS.hit} (LB ${OOS.hit_lb}) vs mirror ${OOS.mirror} · TRAIN ${TR.hit} vs ${TR.mirror} · n ${OOS.n} · dist ${OOS.avg_dist_atr} ATR → ${A2out[type].verdict}`) }
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { day: 'UTC', min_day_minutes: 600, d_atr1d: 0.25, horizon_h: 24, z_bounce: Z1, z_magnet: Z2, min_n: MIN_N }, bounce: A1out, magnet: A2out,
  verdict_bounce: Object.values(A1out).some((c) => c.verdict === 'HOLDS') ? 'SOME_DAY_LEVELS_HOLD' : 'DAY_LEVELS_DO_NOT_HOLD',
  verdict_magnet: Object.values(A2out).some((c) => c.verdict === 'MAGNET') ? 'SOME_DAY_LEVELS_ARE_MAGNETS' : 'NO_MAGNET' }
fs.writeFileSync(path.join(TURBO.master, 'day_levels_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 3 A1: ${out.verdict_bounce} · A2: ${out.verdict_magnet}`)
