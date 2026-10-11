// ════════════════════════════════════════════════════════════════════════════════
// study_gann.mjs — TOOL 6, TESTS A1 (price) + A2 (time): does the GANN BOX work on gold? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot 1m BID, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. Box: src/master/gannBox.js. tf 1h, 4h, 1d.
// A1 PRICE (18 cells = 3 tf × 6 eighths; z 2.77 = one-sided α 0.05/18): exactly the tool-1 Fib level test (scripts/study_fib_levels.mjs):
//   first 1m touch while the swing state is in force (cap 100 bars), from the side price was on; D = 0.25·ATR14(tf); horizon
//   min(10 bars, 30 days); random-level control; bounceTest.limitTrade money; HOLDS ⇔ study_stats.levelVerdict.
// A2 TIME (9 cells = 3 tf × {½, 1, 2}; z 2.54 = α 0.05/9): for each swing state, each projected time t* (gannTimes) that lies AFTER the state
//   became known: HIT ⇔ a confirmed 5/5 pivot (high or low) of that tf has its bar inside t* ± 3 bars (judged after the fact — the
//   projection itself uses only the known swing). CONTROL: the same ±3-bar window at swingEnd + f′·duration, f′ uniform in [0.25, 2.5]
//   (seeded), also after the state became known. TIME_TURNS ⇔ OOS n ≥ 100 AND hit Wilson LB > control rate AND TRAIN hit > TRAIN control.
// Split TRAIN 60 % / OOS 40 % by the projected time. Output: data/master/gann_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { swingStates } from '../src/master/fibLevels.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { GANN_PRICE, GANN_TIME, gannPrice, gannTimes } from '../src/master/gannBox.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), Z1 = 2.77, Z2 = 2.54, CAP = 100, HZB = 10, MIN_N = 100, WIN = 3, TFS = ['1h', '4h', '1d']
const spreadAt = makeSpreadAt(), rnd = seeded(80808)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const stat = (E) => levelStat(E, rnd, Z1)
console.log(`1m bars ${M.length.toLocaleString()}`)

const price = {}, time = {}
for (const tf of TFS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A = atrArr(B, 14)
  const states = swingStates(B, (i) => B[i].t + ms), P = confirmedPivots(B)
  const pivT = [...P.highs, ...P.lows].map((p) => p.t).sort((a, b) => a - b), PT = Float64Array.from(pivT)
  const pivotIn = (t0, t1) => { let lo = 0, hi = PT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (PT[m] < t0) lo = m + 1; else hi = m } return lo < PT.length && PT[lo] <= t1 }
  const lastPivotKnownT = B.length ? B.at(-1).t - 5 * ms : 0   // a pivot needs 5 closed bars after it — windows later than this cannot be judged
  const EV = Object.fromEntries(GANN_PRICE.map((f) => [f, []])), TE = Object.fromEntries(GANN_TIME.map((f) => [f, []]))
  for (let q = 0; q < states.length; q++) {
    const s = states[q], a = A[s.fromI]; if (!(a > 0) || s.knownT < FROM || s.knownT > TO) continue
    // A1 price
    const until = Math.min(q + 1 < states.length ? states[q + 1].knownT : Infinity, s.knownT + CAP * ms, TO), k0 = lb(s.knownT)
    if (k0 < M.length && M[k0].t < until) { const startPx = M[k0].o, D = 0.25 * a, hz = Math.min(HZB * ms, 30 * 86400000)
      for (const f of GANN_PRICE) { const px = gannPrice(s, f), support = startPx > px
        let kT = -1; for (let k = k0; k < M.length && M[k].t < until; k++) { if (support ? M[k].l <= px : M[k].h >= px) { kT = k; break } }
        if (kT < 0) continue
        const up = support, tgt = up ? px + D : px - D, stop = up ? px - D : px + D, tEnd = M[kT].t + hz; if (tEnd > TO) continue
        const bounce = (up ? M[kT].l <= stop : M[kT].h >= stop) ? false : race(M, kT + 1, up, tgt, stop, tEnd)
        const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
        const ctrl = race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + hz)
        EV[f].push({ t: M[kT].t, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', bounce, ctrl, net: limitTrade(M, kT, up, px, stop, tgt, spreadAt, Math.min(0.3, 0.05 * a), tEnd), D }) } }
    // A2 time
    const end = Math.max(s.hT, s.lT), dur = Math.abs(s.hT - s.lT); if (!(dur > 0)) continue
    for (const { f, t } of gannTimes(s)) {
      const w0 = t - WIN * ms, w1 = t + WIN * ms; if (w0 < s.knownT || w1 > lastPivotKnownT || w1 > TO) continue
      const fc = 0.25 + rnd() * 2.25, tc = end + fc * dur, c0 = tc - WIN * ms, c1 = tc + WIN * ms
      const ctrl = c0 >= s.knownT && c1 <= lastPivotKnownT ? pivotIn(c0, c1) : null
      TE[f].push({ part: t < SPLIT ? 'TRAIN' : 'OOS', hit: pivotIn(w0, w1), ctrl })
    }
  }
  for (const f of GANN_PRICE) { const TR = stat(EV[f].filter((e) => e.part === 'TRAIN')), OOS = stat(EV[f].filter((e) => e.part === 'OOS')); price[`${tf}|${f}`] = { tf, f, train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N) } }
  const tstat = (E) => { const n = E.length, h = E.filter((e) => e.hit).length, c = E.filter((e) => e.ctrl != null); return { n, hit: n ? +(h / n).toFixed(4) : null, hit_lb: n ? +wilsonLowerBound(h, n, Z2).toFixed(4) : null, control: c.length ? +(c.filter((e) => e.ctrl).length / c.length).toFixed(4) : null } }
  for (const f of GANN_TIME) { const TR = tstat(TE[f].filter((e) => e.part === 'TRAIN')), OOS = tstat(TE[f].filter((e) => e.part === 'OOS'))
    time[`${tf}|${f}`] = { tf, f, train: TR, oos: OOS, verdict: OOS.n < MIN_N ? 'UNDERPOWERED' : OOS.hit_lb > OOS.control && TR.hit > TR.control ? 'TIME_TURNS' : 'NO_TIME_EFFECT' } }
  console.log(`${tf.padEnd(3)} PRICE: ` + GANN_PRICE.map((f) => { const c = price[`${tf}|${f}`]; return `${f} ${c.oos.bounce}/${c.oos.control} $${c.oos.net} ${c.verdict[0]}` }).join(' · '))
  console.log(`${tf.padEnd(3)} TIME : ` + GANN_TIME.map((f) => { const c = time[`${tf}|${f}`]; return `${f}× turn ${c.oos.hit}/${c.oos.control} (n ${c.oos.n}, TRAIN ${c.train.hit}/${c.train.control}) ${c.verdict}` }).join(' · '))
}
const holds = Object.values(price).filter((c) => c.verdict === 'HOLDS').map((c) => `${c.tf} ${c.f}`), turns = Object.values(time).filter((c) => c.verdict === 'TIME_TURNS').map((c) => `${c.tf} ${c.f}×`)
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { tfs: TFS, price: GANN_PRICE, time: GANN_TIME, window_bars: WIN, z_price: Z1, z_time: Z2, min_n: MIN_N }, price, time, holding: holds, time_turns: turns,
  verdict_price: holds.length ? 'SOME_GANN_LEVELS_HOLD' : 'GANN_LEVELS_DO_NOT_HOLD', verdict_time: turns.length ? 'GANN_TIME_TURNS_FOUND' : 'NO_GANN_TIME_EFFECT' }
fs.writeFileSync(path.join(TURBO.master, 'gann_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> TOOL 6 A1: ${out.verdict_price}${holds.length ? ' (' + holds.join(', ') + ')' : ''} · A2: ${out.verdict_time}${turns.length ? ' (' + turns.join(', ') + ')' : ''}`)
