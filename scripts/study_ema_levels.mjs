// ════════════════════════════════════════════════════════════════════════════════
// study_ema_levels.mjs — TOOL 2, TEST A: do EMA 20 / 50 / 200 HOLD as support / resistance on gold, per timeframe? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot, Polygon BID 1m, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. EMAs: src/master/emaLevels.js
//   (valid from bar 2n−1; monthly EMA200 = NOT COMPUTABLE on 159 months — reported, never faked). 9 tf × 3 EMAs = 27 cells.
//   level   = EMA(n) of the last CLOSED bar i, in force from the close of i until the close of i + 1
//   arming  = bar i closed CLEAR of its EMA (low > EMA → above; high < EMA → below); one event per approach: after an event, no new one
//             until a bar closes not clear or on the other side and a clear bar re-arms
//   event   = the first 1m touch of the level, from the armed side, inside its interval (above → support test, bounce = up)
//   bounce / control / money / split = exactly as tool 1 (scripts/study_fib_levels.mjs): D = 0.25·ATR14(tf) at bar i, horizon
//             min(10 tf-bars, 30 days), 1m bid, random-level control ±2 weeks, bounceTest.limitTrade, TRAIN 60 % / OOS 40 %
//   cell HOLDS ⇔ OOS resolved ≥ 100 AND OOS bounce Wilson LB (z 2.90 = one-sided α 0.05/27) > control AND TRAIN bounce > control AND
//             OOS money bootstrap 2.5 % bound > 0 (scripts/lib/study_stats.levelVerdict); OOS < 100 → UNDERPOWERED.
//   reported: "with the trend" (support test while the tf trend is BULL / resistance while BEAR) vs the rest.
// Output: data/master/ema_levels_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS, CALENDAR_TF } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { emaStack, EMA_N } from '../src/master/emaLevels.js'
import { FIB_TFS } from '../src/master/fibLevels.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), Z = 2.9, DMULT = 0.25, HZB = 10, MIN_N = 100
const spreadAt = makeSpreadAt(), rnd = seeded(97531)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars   // frozen tape
const MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const stat = (E) => levelStat(E, rnd, Z)
console.log(`1m bars ${M.length.toLocaleString()} · ${new Date(FROM).toISOString().slice(0, 10)} → ${new Date(TO).toISOString().slice(0, 16)}`)

const cells = {}
for (const tf of FIB_TFS) {
  const grid = RESAMPLE_TF_MS[tf] ? { key: (t) => Math.floor(t / RESAMPLE_TF_MS[tf]) * RESAMPLE_TF_MS[tf], end: (k) => k + RESAMPLE_TF_MS[tf] } : CALENDAR_TF[tf]
  const B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A = atrArr(B, 14), closeT = (i) => grid.end(B[i].t)
  const tfMs = grid.end(B[0].t) - B[0].t, { E, trend } = emaStack(B)
  const line = []
  for (const n of EMA_N) {
    const e = E[n], ev = []; let firedSide = null
    if (!e.some(Number.isFinite)) { cells[`${tf}|${n}`] = { tf, n, verdict: 'NOT_COMPUTABLE', why: `${B.length} ${tf} bars < ${2 * n} needed` }; line.push(`EMA${n} n/a`); continue }
    for (let i = 0; i + 1 < B.length; i++) {
      const lvl = e[i], a = A[i]; if (!Number.isFinite(lvl) || !(a > 0)) { firedSide = null; continue }
      const side = B[i].l > lvl ? 'above' : B[i].h < lvl ? 'below' : null
      if (!side || side !== firedSide) firedSide = side === firedSide ? firedSide : null
      if (!side || firedSide) continue
      const t0 = closeT(i), t1 = Math.min(closeT(i + 1), TO); if (t0 < FROM || t0 >= TO) continue
      let kT = -1; for (let k = lb(t0); k < M.length && M[k].t < t1; k++) { if (side === 'above' ? M[k].l <= lvl : M[k].h >= lvl) { kT = k; break } }
      if (kT < 0) continue
      firedSide = side
      const up = side === 'above', D = DMULT * a, hz = Math.min(HZB * tfMs, 30 * 86400000), tEnd = M[kT].t + hz; if (tEnd > TO) continue
      const tgt = up ? lvl + D : lvl - D, stop = up ? lvl - D : lvl + D
      const bounce = (up ? M[kT].l <= stop : M[kT].h >= stop) ? false : race(M, kT + 1, up, tgt, stop, tEnd)
      const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
      const ctrl = race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + hz)
      const net = limitTrade(M, kT, up, lvl, stop, tgt, spreadAt, Math.min(0.3, 0.05 * a), tEnd)
      ev.push({ t: M[kT].t, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', up, withTrend: (up && trend[i] === 'BULL') || (!up && trend[i] === 'BEAR'), bounce, ctrl, net, D })
    }
    const TR = stat(ev.filter((x) => x.part === 'TRAIN')), O = ev.filter((x) => x.part === 'OOS'), OOS = stat(O)
    cells[`${tf}|${n}`] = { tf, n, train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N), oos_with_trend: stat(O.filter((x) => x.withTrend)), oos_other: stat(O.filter((x) => !x.withTrend)) }
    const c = cells[`${tf}|${n}`]; line.push(`EMA${n} ${OOS.bounce}/${OOS.control} $${OOS.net} n${OOS.resolved} [trend ${c.oos_with_trend.bounce}/${c.oos_with_trend.control}] ${c.verdict[0]}`)
  }
  console.log(`${tf.padEnd(3)}: ` + line.join(' · '))
}
const holds = Object.values(cells).filter((c) => c.verdict === 'HOLDS')
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { emas: EMA_N, d_atr: DMULT, horizon_bars: HZB, z: Z, min_resolved: MIN_N }, cells, holding_cells: holds.map((c) => `${c.tf} EMA${c.n}`),
  underpowered: Object.values(cells).filter((c) => c.verdict === 'UNDERPOWERED').map((c) => `${c.tf} EMA${c.n}`), not_computable: Object.values(cells).filter((c) => c.verdict === 'NOT_COMPUTABLE').map((c) => `${c.tf} EMA${c.n}`),
  verdict: holds.length ? 'SOME_EMA_LEVELS_HOLD' : 'EMA_LEVELS_DO_NOT_HOLD' }
fs.writeFileSync(path.join(TURBO.master, 'ema_levels_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> EMA TEST A: ${out.verdict}${holds.length ? ' — ' + out.holding_cells.join(', ') : ''} · underpowered ${out.underpowered.length} · not computable ${out.not_computable.join(', ') || 'none'}  (cells: bounce/control, H holds D does not U underpowered)`)
