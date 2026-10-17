// ════════════════════════════════════════════════════════════════════════════════
// study_swing_footprint.mjs — Phase 2 of the swing study: the CME footprint at swing points (2026-10-17). Pre-registered: docs/SWING_FOOTPRINT_SPEC.md.
// The SAME events as Phase 1 (spot swings at 3× ATR, failed extremes, random candles — atlasEvents, same seeds), restricted to the footprint window
// 2024-10-01 → 2026-10-08; footprints joined by candle OPEN time. Holm family = footprint measures only; `cdl:` rows = the candle-shape reference.
// Output: data/master/swing_footprint_atlas.json (+ the book appendix via build_swing_book_appendix.mjs). Optional TF=… subset.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv, buildCandles } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { footprintCandles } from '../src/master/footprintTf.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'
import { compareRates, holm } from '../src/core/studyStats.js'
import { atlasEvents } from './lib/swing_atlas.mjs'
import { fpTerciles, fpCounts } from './lib/swing_footprint.mjs'

const FP_FROM = Date.parse('2024-10-01T00:00:00Z'), FP_TO = Date.parse('2026-10-08T00:00:00Z'), SPLIT = FP_FROM + 0.6 * (FP_TO - FP_FROM), MIN_OOS = 30
const TFS = process.env.TF ? process.env.TF.split(',') : ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '3H', '4H', '6H', '9H', '1D']
const inWin = (t) => t >= FP_FROM && t < FP_TO, isTrain = (t) => t < SPLIT
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
console.log('loading spot 1m (full history, so the swings are exactly Phase 1\'s) …')
const G = cleanForTv((await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM, to: Date.parse('2026-10-09T06:00:00Z') })).bars).bars, holes = findHoles(G)
const res = { at: new Date().toISOString(), spec: 'docs/SWING_FOOTPRINT_SPEC.md', window: [new Date(FP_FROM).toISOString(), new Date(FP_TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), timeframes: {} }
for (const tf of TFS) {
  const t0 = Date.now(), C = buildCandles(G, tf); markIncomplete(C, holes)
  const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0))
  const FPL = await footprintCandles(tf, { from: FP_FROM - 40 * 86400000, to: FP_TO }), byT = new Map(FPL.map((fc, k) => [fc.t, { fc, k }])), fpAt = (t) => byT.get(t)
  const run = (k, withRandom) => { const ev = atlasEvents(C, { k, breaks, seed: 17, nRandom: withRandom ? 3 : 0, nyHour }); const opts = { inWin, isTrain, fpAt, fpList: FPL, breaks }
    const cuts = fpTerciles(C, ev, opts); return fpCounts(C, ev, { ...opts, cuts }) }
  const main = run(3, true), k2 = run(2, false), k5 = run(5, false)
  const R = { candles_in_window: C.filter((c) => inWin(c.t)).length, footprint_candles: FPL.length, roll_candles: FPL.filter((x) => x.roll).length, swings: main.n, sides: {} }
  for (const side of ['H', 'L']) {
    const oosN = main.n[side].S.O, rows = []
    for (const [key, c] of Object.entries(main.cells[side])) {
      const O = compareRates(c.S.O[0], c.S.O[1], c.C1.O[0], c.C1.O[1]), T = compareRates(c.S.T[0], c.S.T[1], c.C1.T[0], c.C1.T[1])
      const R2 = c.C2.O[1] ? compareRates(c.S.O[0], c.S.O[1], c.C2.O[0], c.C2.O[1]) : null, d2 = k2.cells[side][key], d5 = k5.cells[side][key]
      rows.push({ key, ref: key.startsWith('cdl:'), swing_oos: O.p1, c1_oos: O.p2, c2_oos: R2 ? R2.p2 : null, ratio_c1: O.ratio, diff_c1: O.diff, p: O.p, n_s: c.S.O[1], n_c1: c.C1.O[1], train_diff: T.diff, train_swing: T.p1, train_c1: T.p2, diff_c2: R2?.diff ?? null,
        k2_diff: d2 ? compareRates(d2.S.O[0], d2.S.O[1], d2.C1.O[0], d2.C1.O[1]).diff : null, k5_diff: d5 ? compareRates(d5.S.O[0], d5.S.O[1], d5.C1.O[0], d5.C1.O[1]).diff : null }) }
    holm(rows.filter((r) => !r.ref))   // the Holm family = footprint measures only (spec §3)
    for (const r of rows) { const sg = Math.sign(r.diff_c1 ?? 0), same = (x) => x == null || Math.sign(x) === sg
      if (r.ref) { r.verdict = 'REFERENCE (candle shape)'; continue }
      r.verdict = oosN < MIN_OOS ? 'DESCRIBED_ONLY' : r.holm_pass && sg !== 0 && Math.sign(r.train_diff ?? 0) === sg && same(r.diff_c2) && r.k2_diff != null && r.k5_diff != null && Math.sign(r.k2_diff) === sg && Math.sign(r.k5_diff) === sg ? 'FINDING'
        : r.holm_pass && Math.sign(r.train_diff ?? 0) !== sg ? 'INCONSISTENT' : r.holm_pass ? 'FAILS_ROBUSTNESS' : 'NO_DIFFERENCE' }
    R.sides[side] = { oos_swings: oosN, findings: rows.filter((r) => r.verdict === 'FINDING').length, rows: rows.sort((a, b) => (a.p ?? 1) - (b.p ?? 1)) } }
  res.timeframes[tf] = R
  console.log(`${tf.padEnd(4)} window candles ${R.candles_in_window} · footprint candles ${R.footprint_candles} (roll ${R.roll_candles}) · swings H ${R.swings.H.S.T}+${R.swings.H.S.O} L ${R.swings.L.S.T}+${R.swings.L.S.O} · failed H ${R.swings.H.C1.T + R.swings.H.C1.O} L ${R.swings.L.C1.T + R.swings.L.C1.O} · FOOTPRINT FINDINGS H ${R.sides.H.findings} L ${R.sides.L.findings} · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
fs.writeFileSync(path.join(TURBO.master, 'swing_footprint_atlas.json'), JSON.stringify(res))
console.log('→ data/master/swing_footprint_atlas.json')
