// ════════════════════════════════════════════════════════════════════════════════
// study_fib_levels.mjs — TOOL 1, TEST A: do Fibonacci / inverse-Fibonacci levels of the last confirmed swing HOLD on gold, per timeframe?
// (2026-10-09; Ashraf: Fib on 1mo/1w/1d/4h/1h/30m/15m/5m/3m, swing = last confirmed, inverse = drawn the other way; "one by one")
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot, Polygon BID 1m store, 2013-07-21 → TURBO_VAL_TO (13 y). Levels: src/master/fibLevels.js
//   (7 distinct positions per swing; a swing state is in force from the close of the bar that confirms its newest pivot until the next).
//   event   = the FIRST 1m touch of each level while its swing state is in force (cap 100 tf-bars), approached from the side price was on when
//             the state began (above → support test, bounce = up; below → resistance test, bounce = down)
//   bounce  = from the minute after the touch: level ± D before level ∓ D, D = 0.25·ATR14(tf) at the confirming bar, horizon
//             min(10 tf-bars, 30 days), 1m bid, stop first (bounceTest.race); a touch minute already reaching the stop line = fail
//   control = the same race at the close of a random 1m bar within ±2 weeks (seeded)
//   money   = bounceTest.limitTrade: limit at the level, stop D beyond (+ slip min(0.30, 0.05·ATR)), target D, measured spread
//   split   = TRAIN first 60 % / OOS last 40 % · FROZEN TAPE: data stop at TO; an event counts only if its horizon ends before TO
//   cell (tf × position) HOLDS ⇔ OOS resolved ≥ 100 AND OOS bounce Wilson LB (z 3.17 = one-sided α 0.05/63) > OOS control AND
//             TRAIN bounce > TRAIN control AND OOS money bootstrap 2.5 % bound > 0.  OOS resolved < 100 → UNDERPOWERED (never "holds").
//   reported too: per tf (all positions), and "with the Fib's expected direction" (UP swing touched from above / DOWN from below).
// Output: data/master/fib_levels_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS, CALENDAR_TF } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { swingStates, fibPrice, FIB_POS, FIB_TFS } from '../src/master/fibLevels.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), Z = 3.17, DMULT = 0.25, CAP = 100, HZB = 10, MIN_N = 100
const spreadAt = makeSpreadAt(), rnd = seeded(24680)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars   // frozen tape: nothing after TO (reproducible)
const MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log(`1m bars ${M.length.toLocaleString()} · ${new Date(FROM).toISOString().slice(0, 10)} → ${new Date(TO).toISOString().slice(0, 16)}`)

const stat = (E) => levelStat(E, rnd, Z)   // scripts/lib/study_stats.mjs (one scoring for every tool)

const cells = {}, perTf = {}
for (const tf of FIB_TFS) {
  const grid = RESAMPLE_TF_MS[tf] ? { key: (t) => Math.floor(t / RESAMPLE_TF_MS[tf]) * RESAMPLE_TF_MS[tf], end: (k) => k + RESAMPLE_TF_MS[tf] } : CALENDAR_TF[tf]
  const B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A = atrArr(B, 14), closeT = (i) => grid.end(B[i].t)
  const tfMs = grid.end(B[0].t) - B[0].t, states = swingStates(B, closeT), ev = []
  for (let q = 0; q < states.length; q++) {
    const s = states[q], a = A[s.fromI]; if (!(a > 0) || s.knownT < FROM || s.knownT > TO) continue
    const until = Math.min(q + 1 < states.length ? states[q + 1].knownT : Infinity, s.knownT + CAP * tfMs, TO)
    const k0 = lb(s.knownT); if (k0 >= M.length || M[k0].t >= until) continue
    const startPx = M[k0].o, D = DMULT * a, hz = Math.min(HZB * tfMs, 30 * 86400000), slip = Math.min(0.3, 0.05 * a)
    for (const { p, name } of FIB_POS) {
      const px = fibPrice(s, p), support = startPx > px
      let kT = -1; for (let k = k0; k < M.length && M[k].t < until; k++) { if (support ? M[k].l <= px : M[k].h >= px) { kT = k; break } }
      if (kT < 0) continue
      const up = support, tgt = up ? px + D : px - D, stop = up ? px - D : px + D, tEnd = M[kT].t + hz; if (tEnd > TO) continue   // fully resolvable inside the frozen tape
      const bounce = (up ? M[kT].l <= stop : M[kT].h >= stop) ? false : race(M, kT + 1, up, tgt, stop, tEnd)
      const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
      const ctrl = race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + hz)
      const net = limitTrade(M, kT, up, px, stop, tgt, spreadAt, slip, tEnd)
      ev.push({ t: M[kT].t, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', p, name, up, expected: (s.dir === 'UP') === up, bounce, ctrl, net, D })
    }
  }
  for (const { p, name } of FIB_POS) {
    const E = ev.filter((e) => e.p === p), TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS'))
    const verdict = levelVerdict(TR, OOS, MIN_N)
    cells[`${tf}|${p}`] = { tf, p, name, train: TR, oos: OOS, verdict }
  }
  const O = ev.filter((e) => e.part === 'OOS')
  perTf[tf] = { states: states.length, events: ev.length, oos_all: stat(O), oos_expected_dir: stat(O.filter((e) => e.expected)), oos_against_dir: stat(O.filter((e) => !e.expected)) }
  const a = perTf[tf].oos_all, x = perTf[tf].oos_expected_dir
  console.log(`${tf.padEnd(3)}: states ${states.length} · events ${ev.length} · OOS bounce ${a.bounce} vs control ${a.control} · expected-dir ${x.bounce} vs ${x.control} · $/t ${a.net} (${a.net_R} R) · cells ${FIB_POS.map(({ p }) => cells[`${tf}|${p}`].verdict[0]).join('')}`)
}
const holds = Object.values(cells).filter((c) => c.verdict === 'HOLDS')
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { positions: FIB_POS, d_atr: DMULT, cap_bars: CAP, horizon_bars: HZB, z: Z, min_resolved: MIN_N }, per_tf: perTf, cells,
  holding_cells: holds.map((c) => `${c.tf} ${c.name}`), underpowered: Object.values(cells).filter((c) => c.verdict === 'UNDERPOWERED').map((c) => `${c.tf} ${c.name}`),
  verdict: holds.length ? 'SOME_FIB_LEVELS_HOLD' : 'FIB_LEVELS_DO_NOT_HOLD' }
fs.writeFileSync(path.join(TURBO.master, 'fib_levels_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> FIB TEST A: ${out.verdict}${holds.length ? ' — ' + out.holding_cells.join(', ') : ''} · underpowered: ${out.underpowered.length} cells (legend H=holds D=does not U=underpowered)`)
