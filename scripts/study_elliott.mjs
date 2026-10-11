// ════════════════════════════════════════════════════════════════════════════════
// study_elliott.mjs — TOOL 5, TEST A: does a mechanical Elliott count PLAY OUT on gold? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot 1m BID, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. Patterns: src/master/elliott.js.
// Timeframes 15m, 1h, 4h, 1d. A pattern is acted on at the CLOSE of the bar that confirms its last pivot (knownAt); price_now = the open of
// the first 1m bar at/after that moment; patterns already resolved at that price are skipped.
//   W5  (wave 5 expected): PLAYS OUT ⇔ price passes the wave-3 end (target) before the wave-4 extreme (invalidation)
//   ABC (correction expected after a 5-wave impulse): PLAYS OUT ⇔ price reaches the wave-4 level before moving the same distance the other way
//   horizon min(100 tf-bars, 30 days) · CONTROL = the same race (same distances, same direction) from the close of a random 1m bar within
//   ±2 weeks · MONEY = market entry at price_now (a BUY pays the ask), stop at the invalidation, target at the target (bounceTest.limitTrade)
//   8 cells (2 kinds × 4 tf), z 2.50 (one-sided α 0.05/8). PLAYS_OUT ⇔ study_stats.levelVerdict (OOS resolved ≥ 100, Wilson LB > control,
//   TRAIN > control, OOS money bootstrap 2.5 % > 0). Split TRAIN 60 % / OOS 40 %.
// Output: data/master/elliott_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { elliottPatterns } from '../src/master/elliott.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), Z = 2.5, MIN_N = 100, TFS = ['15m', '1h', '4h', '1d']
const spreadAt = makeSpreadAt(), rnd = seeded(55555)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const stat = (E) => levelStat(E, rnd, Z)
console.log(`1m bars ${M.length.toLocaleString()}`)

const cells = {}
for (const tf of TFS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A = atrArr(B, 14)
  const pats = elliottPatterns(B), EV = { W5: [], ABC: [] }
  for (const p of pats) {
    const T = B[p.knownAt].t + ms; if (T < FROM || T >= TO) continue
    const k0 = lb(T); if (k0 >= M.length) continue
    const px = M[k0].o, up = p.dir === 'UP', a = A[p.knownAt] || 0
    let target, stop
    if (p.kind === 'W5') { target = p.target; stop = p.invalid } else { target = p.target; stop = px + (px - p.target) }
    if (up ? !(px < target && px > stop) : !(px > target && px < stop)) continue   // already resolved at the moment we could act
    const hz = Math.min(100 * ms, 30 * 86400000), tEnd = M[k0].t + hz; if (tEnd > TO) continue
    const played = race(M, k0, up, target, stop, tEnd)
    const kc = Math.min(M.length - 2, Math.max(0, k0 + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
    const ctrl = race(M, kc + 1, up, up ? c0 + (target - px) : c0 - (px - target), up ? c0 - (px - stop) : c0 + (stop - px), M[kc].t + hz)
    const entry = up ? px + spreadAt(M[k0].t) : px
    const net = limitTrade(M, k0, up, entry, stop, target, spreadAt, Math.min(0.3, 0.05 * a), tEnd)
    EV[p.kind].push({ t: M[k0].t, part: M[k0].t < SPLIT ? 'TRAIN' : 'OOS', up, bounce: played, ctrl, net, D: Math.abs(entry - stop), rr: Math.abs(target - px) / Math.abs(px - stop) })
  }
  for (const kind of ['W5', 'ABC']) {
    const E = EV[kind], TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS'))
    const v = levelVerdict(TR, OOS, MIN_N), rr = E.length ? +(E.reduce((s, e) => s + e.rr, 0) / E.length).toFixed(2) : null
    cells[`${tf}|${kind}`] = { tf, kind, patterns: pats.filter((p) => p.kind === kind).length, train: TR, oos: OOS, avg_reward_to_risk: rr, verdict: v === 'HOLDS' ? 'PLAYS_OUT' : v === 'DOES_NOT_HOLD' ? 'DOES_NOT_PLAY_OUT' : v }
    console.log(`${tf.padEnd(3)} ${kind.padEnd(3)}: patterns ${cells[`${tf}|${kind}`].patterns} · OOS plays out ${OOS.bounce} (LB ${OOS.bounce_lb}) vs control ${OOS.control} · TRAIN ${TR.bounce} vs ${TR.control} · reward/risk ${rr} · $/t ${OOS.net} (${OOS.net_R} R, n ${OOS.trades}) → ${cells[`${tf}|${kind}`].verdict}`)
  }
}
const good = Object.values(cells).filter((c) => c.verdict === 'PLAYS_OUT')
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { tfs: TFS, z: Z, min_resolved: MIN_N, horizon: 'min(100 bars, 30 days)' }, cells, playing_out: good.map((c) => `${c.tf} ${c.kind}`), verdict: good.length ? 'SOME_ELLIOTT_PATTERNS_PLAY_OUT' : 'ELLIOTT_DOES_NOT_PLAY_OUT' }
fs.writeFileSync(path.join(TURBO.master, 'elliott_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 5 A: ${out.verdict}${good.length ? ' — ' + out.playing_out.join(', ') : ''}`)
