// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_prep_alert.mjs — can a "prepare" alert precede the Matrix SCALP with ≥ 98 % conversion? (2026-10-16). Pre-registered:
// docs/MATRIX_PREP_ALERT_SPEC.md. Same formulas as matrixSignals (walls, DXY EMA10, WTI as delivered). Output: data/master/matrix_prep_alert_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { matrixSignals, matrixArmedAt, emaSeries, MATRIX } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const FROM = Date.parse('2024-10-10T00:00:00Z'), TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
const KS = process.env.PREP_KS ? process.env.PREP_KS.split(',').map(Number) : [0.25, 0.5, 1.0], NS = [5, 10, 20], K = KS.length * NS.length, Z = zOf(K)
const B = (await loadBars('XAUUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars, D = (await loadDxyBars('3m', { from: FROM - 3 * 86400000, to: TO })).bars, W = wti1m(TO)
const startI = B.findIndex((b) => b.t >= FROM), sigs = matrixSignals(B, D, W, { from: startI })
const sigAt = { BUY: new Set(sigs.filter((s) => s.side === 'BUY').map((s) => s.i)), SELL: new Set(sigs.filter((s) => s.side === 'SELL').map((s) => s.i)) }
console.log(`${sigs.length} Matrix signals (BUY ${sigAt.BUY.size} / SELL ${sigAt.SELL.size}) in the 2y WTI window`)
const A = atrArr(B, 14), dEma = emaSeries(D, MATRIX.dxyEma), dByT = new Map(D.map((b) => [b.t, b]))
// per bar: context per side + distance to the wall in ATR (≤ 0 = wall touched)
const ctx = []
for (let i = startI; i < B.length; i++) ctx[i] = matrixArmedAt(B, A, i, dByT, dEma, W)   // ONE rule: the live WATCH label uses the same function
const days = (a, z) => ((z - a) / 86400000) * 5 / 7
const res = {}
for (const k of KS) for (const N of NS) { const ep = []
  for (const side of ['BUY', 'SELL']) { let open = null, prevArmed = false
    for (let i = startI; i < B.length; i++) { const c = ctx[i], isSig = sigAt[side].has(i)
      if (open && (isSig || i > open.i + N)) { if (isSig && i <= open.i + N) open.conv = i; ep.push(open); open = null }
      const armed = !!c && !isSig && (side === 'BUY' ? c.buyCtx && c.buyDist <= k : c.sellCtx && c.sellDist <= k)
      if (armed && !prevArmed && !open && B[i].t + (N + 1) * MATRIX.tfMs <= TO) open = { side, i, t: B[i].t, conv: null }
      prevArmed = armed }
    if (open) ep.push(open) }
  const S = (xs, a, z) => { const n = xs.length, w = xs.filter((e) => e.conv != null).length, leads = xs.filter((e) => e.conv != null).map((e) => (e.conv - e.i) * 3).sort((x, y) => x - y)
    return { episodes: n, per_day: +(n / days(a, z)).toFixed(2), conversion: n ? +(w / n).toFixed(4) : null, conversion_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, median_lead_min: leads.length ? leads[leads.length >> 1] : null } }
  const tr = ep.filter((e) => e.t < SPLIT), oos = ep.filter((e) => e.t >= SPLIT)
  const oosSig = sigs.filter((s) => s.t >= SPLIT), alerted = oosSig.filter((s) => oos.some((e) => e.side === s.side && e.conv === s.i)).length
  const O = { ...S(oos, SPLIT, TO), recall: oosSig.length ? +(alerted / oosSig.length).toFixed(4) : null, by_side: { BUY: S(oos.filter((e) => e.side === 'BUY'), SPLIT, TO), SELL: S(oos.filter((e) => e.side === 'SELL'), SPLIT, TO) } }, T = S(tr, FROM, SPLIT)
  const verdict = O.episodes >= 100 && O.conversion >= 0.98 && O.conversion_lb >= 0.95 && T.conversion >= 0.98 ? 'PASS' : O.episodes < 100 ? 'UNDERPOWERED' : 'FAIL'
  res[`k${k}|N${N}`] = { train: T, oos: O, verdict }
  console.log(`  k ${k} ATR · N ${N} bars: OOS ${O.episodes} alerts (${O.per_day}/d) convert ${O.conversion} (LB ${O.conversion_lb}) lead ${O.median_lead_min}m recall ${O.recall} · TRAIN ${T.conversion} → ${verdict} · BUY ${O.by_side.BUY.conversion} (n ${O.by_side.BUY.episodes}) SELL ${O.by_side.SELL.conversion} (n ${O.by_side.SELL.episodes})`) }
const pass = Object.entries(res).filter(([, c]) => c.verdict === 'PASS').map(([x]) => x)
const best = Object.entries(res).sort((a, b) => b[1].oos.conversion - a[1].oos.conversion)[0]
const out = { at: new Date().toISOString(), spec: 'docs/MATRIX_PREP_ALERT_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], signals: sigs.length, cells: res, passing: pass, verdict: pass.length ? 'SOME_PASS' : 'NO_PASS', best: { cell: best[0], ...best[1] } }
fs.writeFileSync(path.join(TURBO.master, process.env.PREP_KS ? 'matrix_prep_alert_posthoc.json' : 'matrix_prep_alert_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> PREP ALERT ≥ 98 %: ${out.verdict}${pass.length ? ' ' + pass.join(', ') : ''} · best OOS conversion ${best[1].oos.conversion} (${best[0]})`)
