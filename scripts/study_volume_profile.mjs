// ════════════════════════════════════════════════════════════════════════════════
// study_volume_profile.mjs — TOOL 4, TESTS A1 + A2: the PREVIOUS DAY's VOLUME PROFILE (POC / VAH / VAL) on gold (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot 1m BID, FROZEN TAPE. Profiles: src/master/volumeProfile.js (uniform spread over each
// minute's range, bin = 0.02·ATR14(1d), value area 70 %). Days: dayLevels rules (UTC, a profiled day needs ≥ 600 minutes).
//   SOURCES: SPOT = XAU tick activity (2013-07-21 → TO) · FUT = CME GC real volume (data/history/GOLD_FUT, 2024-10 → TO), levels moved to
//            spot with the BASIS = GC close − XAU close on the profiled day's last minute where both exist (no common minute → no levels)
//   levels in force during day D = the profile of the last full day before D (dayLevels.prevDays)
// A1 BOUNCE (6 cells: {SPOT, FUT} × {POC, VAH, VAL}; z 2.39 = one-sided α 0.05/6): the first touch in day D from its opening side —
//   scripts/lib/day_level_events.mjs (the same race / control / money as tools 1-3); HOLDS ⇔ study_stats.levelVerdict.
// A2 MAGNET (2 cells: SPOT POC, FUT POC — the "naked POC" idea; z 2.24): reached during day D vs the mirror level; MAGNET ⇔ OOS n ≥ 100
//   AND hit Wilson LB > mirror AND TRAIN hit > TRAIN mirror.
// Split TRAIN 60 % / OOS 40 % of each source's own window. Output: data/master/volume_profile_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { dailyStats, prevDays, DAY_MS, MIN_DAY_MINUTES } from '../src/master/dayLevels.js'
import { volumeProfile } from '../src/master/volumeProfile.js'
import { dayLevelRunner } from './lib/day_level_events.mjs'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), Z1 = 2.39, Z2 = 2.24, MIN_N = 100, BIN_ATR = 0.02
const spreadAt = makeSpreadAt()
const D1 = (await loadBars('XAUUSD', '1d', { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A1 = atrArr(D1, 14)
const atrAtClose = (day) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY_MS <= day + DAY_MS) lo = m + 1; else hi = m } return lo ? A1[lo - 1] : null }   // ATR of the profiled day itself (closed)
const G = fs.readFileSync(path.join(TURBO.historyAsset('GOLD_FUT'), '1m.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => b.t < TO)
const gByDay = new Map(); for (const b of G) { const d = Math.floor(b.t / DAY_MS) * DAY_MS; let a = gByDay.get(d); if (!a) gByDay.set(d, (a = [])); a.push(b) }

async function source(name, from) {
  const SPLIT = from + 0.6 * (TO - from), rnd = seeded(name === 'SPOT' ? 60606 : 70707)
  const M = (await loadBars('XAUUSD', '1m', { from: from - 20 * DAY_MS, to: TO })).bars, { list } = dailyStats(M)
  const R = dayLevelRunner({ M, TO, SPLIT, HZ: DAY_MS, rnd, spreadAt })
  const profiles = new Map()   // profiled day → { poc, vah, val } in SPOT prices
  for (const S of list) { if (S.minutes < MIN_DAY_MINUTES) continue; const a = atrAtClose(S.day); if (!(a > 0)) continue
    if (name === 'SPOT') { const p = volumeProfile(M.slice(S.firstK, S.lastK + 1), BIN_ATR * a); if (p) profiles.set(S.day, p); continue }
    const g = gByDay.get(S.day); if (!g) continue
    const xs = new Map(); for (let k = S.firstK; k <= S.lastK; k++) xs.set(M[k].t, M[k].c)
    let basis = null; for (let j = g.length - 1; j >= 0; j--) if (xs.has(g[j].t)) { basis = g[j].c - xs.get(g[j].t); break }
    if (basis == null) continue
    const p = volumeProfile(g, BIN_ATR * a); if (p) profiles.set(S.day, { poc: p.poc - basis, vah: p.vah - basis, val: p.val - basis, basis })
  }
  const EV = { POC: [], VAH: [], VAL: [] }, MAG = []
  for (let j = 0; j < list.length; j++) {
    const S = list[j]; if (S.day < from || S.day + DAY_MS > TO) continue
    const P = prevDays(list.slice(Math.max(0, j - 10), j), S.day); if (!P) continue
    const prof = profiles.get(P.pd.day), a = atrAtClose(P.pd.day); if (!prof || !(a > 0)) continue
    const magPOC = []
    R.priorDayLevel(S, prof.poc, a, EV.POC, magPOC); MAG.push(...magPOC)
    R.priorDayLevel(S, prof.vah, a, EV.VAH, [])
    R.priorDayLevel(S, prof.val, a, EV.VAL, [])
  }
  const stat = (E) => levelStat(E, rnd, Z1), cells = {}
  for (const [lv, E] of Object.entries(EV)) { const TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS')); cells[lv] = { train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N) }
    console.log(`${name} ${lv}: OOS bounce ${OOS.bounce} (LB ${OOS.bounce_lb}) vs control ${OOS.control} · TRAIN ${TR.bounce} vs ${TR.control} · $/t ${OOS.net} (${OOS.net_R} R, n ${OOS.trades}) → ${cells[lv].verdict}`) }
  const mstat = (E) => { const n = E.length, h = E.filter((e) => e.hit).length; return { n, hit: n ? +(h / n).toFixed(4) : null, hit_lb: n ? +wilsonLowerBound(h, n, Z2).toFixed(4) : null, mirror: n ? +(E.filter((e) => e.hitM).length / n).toFixed(4) : null } }
  const mTR = mstat(MAG.filter((e) => e.part === 'TRAIN')), mO = mstat(MAG.filter((e) => e.part === 'OOS'))
  const magnet = { train: mTR, oos: mO, verdict: mO.n < MIN_N ? 'UNDERPOWERED' : mO.hit_lb > mO.mirror && mTR.hit > mTR.mirror ? 'MAGNET' : 'NOT_A_MAGNET' }
  console.log(`${name} POC magnet: OOS hit ${mO.hit} (LB ${mO.hit_lb}) vs mirror ${mO.mirror} · TRAIN ${mTR.hit} vs ${mTR.mirror} · n ${mO.n} → ${magnet.verdict}`)
  return { window: new Date(from).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10), profiled_days: profiles.size, cells, magnet }
}
const spot = await source('SPOT', HISTORY_CONTINUOUS_FROM + 7 * DAY_MS)
const fut = await source('FUT', Date.parse('2024-10-11T00:00:00Z'))
const holds = [...Object.entries(spot.cells).map(([k, c]) => ['SPOT ' + k, c]), ...Object.entries(fut.cells).map(([k, c]) => ['FUT ' + k, c])].filter(([, c]) => c.verdict === 'HOLDS').map(([k]) => k)
const out = { at: new Date().toISOString(), rules: { bin_atr1d: BIN_ATR, value_area: 0.7, z_bounce: Z1, z_magnet: Z2, min_n: MIN_N, spot_volume: 'tick activity (quote updates)', fut_volume: 'CME GC contracts, basis-adjusted' },
  spot, fut, holding: holds, verdict_bounce: holds.length ? 'SOME_PROFILE_LEVELS_HOLD' : 'PROFILE_LEVELS_DO_NOT_HOLD',
  verdict_magnet: [spot.magnet, fut.magnet].some((m) => m.verdict === 'MAGNET') ? 'POC_IS_A_MAGNET' : 'NO_MAGNET' }
fs.writeFileSync(path.join(TURBO.master, 'volume_profile_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 4 A1: ${out.verdict_bounce}${holds.length ? ' (' + holds.join(', ') + ')' : ''} · A2: ${out.verdict_magnet}`)
