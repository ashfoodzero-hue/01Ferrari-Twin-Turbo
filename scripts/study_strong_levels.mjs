// ════════════════════════════════════════════════════════════════════════════════
// study_strong_levels.mjs — STEP A of the strong-S/R test (2026-10-11; pre-registered in docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 4).
// Do MULTI-TOUCH levels (src/master/strongLevels.js) make price bounce more than a random level? XAU spot 1m BID, 2013-07-21 → TURBO_VAL_TO.
// Event / control / money: exactly the day-levels method (scripts/lib/day_level_events.mjs): first touch during day D from day D's opening
// side, target / stop 0.25 × ATR14(1d), random-level control ±2 weeks, limit-order money path, 24 h, TRAIN 60 % / OOS 40 %.
// Cells S2 (≥ 2 touches), S3 (≥ 3, "strong"), S4 (≥ 4) → z 2.13 (one-sided α 0.05/3). HOLDS ⇔ study_stats.levelVerdict.
// Output: data/master/strong_levels_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { dayLevelRunner } from './lib/day_level_events.mjs'
import { dailyStats, DAY_MS } from '../src/master/dayLevels.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'
import { hourPivots, strongLevelsForDay, STRONG } from '../src/master/strongLevels.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 14 * DAY_MS
const SPLIT = FROM + 0.6 * (TO - FROM), Z = 2.13, MIN_N = 100, spreadAt = makeSpreadAt(), rnd = seeded(20261014)
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 20 * DAY_MS, to: TO })).bars
const D1 = (await loadBars('XAUUSD', '1d', { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A1 = atrArr(D1, 14)
const atrBefore = (d) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY_MS <= d) lo = m + 1; else hi = m } return lo ? A1[lo - 1] : null }
const H = (await loadBars('XAUUSD', '1h', { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars.filter((b) => b.t + 3600000 <= TO), PIV = hourPivots(H)
const { list } = dailyStats(M)
console.log(`1m ${M.length.toLocaleString()} · 1h ${H.length} · pivots ${PIV.length}`)
const R = dayLevelRunner({ M, TO, SPLIT, HZ: DAY_MS, rnd, spreadAt }), EV = { S2: [], S3: [], S4: [] }, perDay = []
let pi0 = 0
for (const S of list) { if (S.day < FROM || S.day + DAY_MS > TO || S.minutes < 600) continue
  const a = atrBefore(S.day); if (!(a > 0)) continue
  while (pi0 < PIV.length && PIV[pi0].t < S.day - (STRONG.windowDays + 2) * DAY_MS) pi0++
  const L = strongLevelsForDay(PIV.slice(pi0, pi0 + 400), S.day, a); perDay.push(L.filter((x) => x.touches >= 3).length)
  for (const lv of L) { const cells = ['S2', 'S3', 'S4'].filter((c) => lv.touches >= +c[1]); if (!cells.length) continue
    const tmp = [], mag = []; R.priorDayLevel(S, lv.price, a, tmp, mag); for (const e of tmp) { e.touches = lv.touches; for (const c of cells) EV[c].push(e) } } }
const stat = (E) => levelStat(E, rnd, Z), out = {}
for (const [c, E] of Object.entries(EV)) { const TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS')); out[c] = { train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N) }
  console.log(`${c}: OOS bounce ${OOS.bounce} (LB ${OOS.bounce_lb}) vs random ${OOS.control} · TRAIN ${TR.bounce} vs ${TR.control} · $/t ${OOS.net} [LB ${OOS.net_lb}] (${OOS.net_R} R, n ${OOS.trades}) → ${out[c].verdict}`) }
const avg = perDay.reduce((s, x) => s + x, 0) / perDay.length
const res = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { ...STRONG, d_atr1d: 0.25, z: Z, min_n: MIN_N, spec: 'docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 4' }, cells: out, strong_levels_per_day: +avg.toFixed(2),
  verdict: Object.values(out).some((c) => c.verdict === 'HOLDS') ? 'SOME_STRONG_LEVELS_HOLD' : 'STRONG_LEVELS_DO_NOT_HOLD' }
fs.writeFileSync(path.join(TURBO.master, 'strong_levels_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> STRONG LEVELS (13 y spot): ${res.verdict} · ≥3-touch levels per day ${res.strong_levels_per_day}`)
