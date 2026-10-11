// smoke_regime_splitter.mjs — unit + causality proof for regimeSplitter.js (R6 perfection-gate).
// Verifies: bucket mapping · coverage math (hand-checked) · fold partition is a contiguous cover ·
// each real-data fold SPANS diverse regimes · assignFold correctness · and the CAUSAL-BOUNDARY proof
// (truncating bars after a fold's end cannot change that fold's regime labels / coverage).
import assert from 'node:assert'
import { loadBars } from '../src/data/backfillReader.js'
import { HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { classifyRegimeSeries } from '../src/agents/microstructure/marketRegime.js'
import { regimeBucket, regimeCoverage, buildRegimeSpannedFolds, assignFold, REGIME_BUCKETS } from '../src/core/regimeSplitter.js'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`) } else { fail++; console.error(`  ✗ ${m}`) } }

console.log('\n████ smoke_regime_splitter ████\n')

// 1 ── bucket mapping (the coarse 4-way) ──────────────────────────────────────────
console.log('1 · regimeBucket mapping')
ok(regimeBucket('TREND_UP') === 'bull' && regimeBucket('MELT_UP') === 'bull', 'TREND_UP & MELT_UP → bull')
ok(regimeBucket('TREND_DOWN') === 'bear' && regimeBucket('WATERFALL') === 'bear', 'TREND_DOWN & WATERFALL → bear')
ok(regimeBucket('RANGE') === 'range', 'RANGE → range')
ok(regimeBucket('VOLATILE_CHOP') === 'highvol', 'VOLATILE_CHOP → highvol')
ok(regimeBucket(null) === null && regimeBucket('???') === null, 'unknown/null → null (uncounted)')

// 2 ── coverage math, hand-checked on a synthetic stable series ────────────────────
console.log('\n2 · regimeCoverage math (hand-computed)')
//          idx: 0          1          2       3              4      5(null)
const synth = ['TREND_UP', 'MELT_UP', 'RANGE', 'TREND_DOWN', 'RANGE', null]
const cov = regimeCoverage(synth, 0, 5)
ok(cov.classified === 5, `classified = 5 (null excluded) [${cov.classified}]`)
ok(cov.counts.bull === 2 && cov.counts.bear === 1 && cov.counts.range === 2 && cov.counts.highvol === 0,
  `counts bull2/bear1/range2/highvol0 [${JSON.stringify(cov.counts)}]`)
ok(Math.abs(cov.fracs.bull - 0.4) < 1e-9 && Math.abs(cov.fracs.range - 0.4) < 1e-9 && Math.abs(cov.fracs.bear - 0.2) < 1e-9,
  `fracs bull0.4/range0.4/bear0.2 [${JSON.stringify(cov.fracs)}]`)
const covSub = regimeCoverage(synth, 2, 4)   // RANGE,TREND_DOWN,RANGE
ok(covSub.classified === 3 && covSub.counts.range === 2 && covSub.counts.bear === 1, 'sub-range [2..4] counts correct')

// 3 ── real-data folds: partition integrity + spanning ────────────────────────────
// 2026-10-08 (twin): the tape is the twin's Polygon 1m store resampled, from HISTORY_CONTINUOUS_FROM (2013-07-14) — the window every
// twin validator uses (~13y × ~23.5k 15m bars per year).
console.log('\n3 · buildRegimeSpannedFolds on the twin tape (Polygon 1m → 15m, 2013-07 →)')
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })
ok(bars.length > 290_000, `loaded ${bars.length.toLocaleString()} bars`)
const FOLDS = 8
const t0 = Date.now()
const res = buildRegimeSpannedFolds(bars, { folds: FOLDS })   // defaults: minFrac 0.03, minBuckets 3
console.log(`    (built ${FOLDS} folds in ${Date.now() - t0}ms)`)
ok(res.folds.length === FOLDS, `produced ${FOLDS} folds`)
// contiguous cover: fold0 starts at 0, last ends at n-1, no gap/overlap
ok(res.folds[0].fromI === 0, 'fold0 starts at bar 0')
ok(res.folds.at(-1).toI === bars.length - 1, 'last fold ends at final bar')
let contiguous = true
for (let f = 1; f < res.folds.length; f++) if (res.folds[f].fromI !== res.folds[f - 1].toI + 1) contiguous = false
ok(contiguous, 'folds are a contiguous non-overlapping partition')
const totalBars = res.folds.reduce((a, f) => a + f.bars, 0)
ok(totalBars === bars.length, `fold bars sum to total (${totalBars.toLocaleString()})`)
// print + assert spanning
console.log('    fold  span?  buckets(≥3%)              dates')
for (const f of res.folds) {
  const bk = REGIME_BUCKETS.map((k) => `${k[0]}${(f.coverage.fracs[k] * 100).toFixed(0)}`).join(' ')
  console.log(`     ${f.index}    ${f.spans ? 'YES' : 'no '}   [${f.presentBuckets.join(',').padEnd(22)}] ${f.from_iso}→${f.to_iso}  ${bk}`)
}
ok(res.allSpan, 'EVERY fold spans ≥3 buckets AND is directionally balanced (no single-regime/one-direction fold)')
ok(res.folds.every((f) => f.directionalBalanced), 'EVERY fold contains BOTH bull AND bear regimes (the P7 anti-confound)')
// MEASURED 2026-10-08: on 2013+ the classifier puts RANGE under 3% in EVERY fold on BOTH feeds (Polygon and Dukascopy agree fold for fold:
// ~81% VOLATILE_CHOP, RANGE 0-1%). RANGE reaches ≥3% only in the 2003-2009 folds of the 23y tape, so the old 4-bucket check held only for
// tapes that include them. Pinned as measured, not loosened: exactly bull/bear/highvol, and RANGE < 3% in every fold.
ok(JSON.stringify(res.summary.bucketsAcrossAllFolds) === JSON.stringify(['bull', 'bear', 'highvol']) && res.folds.every((f) => f.coverage.fracs.range < 0.03),
  `buckets across folds = bull,bear,highvol and RANGE < 3% in every 2013+ fold (got ${res.summary.bucketsAcrossAllFolds})`)

// 4 ── assignFold correctness ─────────────────────────────────────────────────────
console.log('\n4 · assignFold')
ok(assignFold(res.folds, 0) === 0, 'bar 0 → fold 0')
ok(assignFold(res.folds, bars.length - 1) === FOLDS - 1, 'last bar → last fold')
const midFold = res.folds[3]
ok(assignFold(res.folds, midFold.fromI) === 3 && assignFold(res.folds, midFold.toI) === 3, 'fold-3 endpoints → fold 3')
ok(assignFold(res.folds, -5) === -1 && assignFold(res.folds, bars.length + 5) === -1, 'out-of-range → -1')

// 5 ── CAUSAL-BOUNDARY proof (R6): truncating bars after fold k's end can't change fold k ───
console.log('\n5 · causal-boundary proof (truncate-future invariance)')
const k = 3
const cutI = res.folds[k].toI
const truncated = bars.slice(0, cutI + 1)                       // drop ALL bars after fold k's end
const fullSeries = res.series.stable
const truncSeries = classifyRegimeSeries(truncated).stable
let same = true, firstDiff = -1
for (let i = res.folds[k].fromI; i <= cutI; i++) if (fullSeries[i] !== truncSeries[i]) { same = false; if (firstDiff < 0) firstDiff = i }
ok(same, `fold-${k} stable regimes identical with/without future bars (causal)${same ? '' : ` first diff @${firstDiff}`}`)
// and the coverage recomputed on the truncated series matches
const covFull = regimeCoverage(fullSeries, res.folds[k].fromI, cutI)
const covTrunc = regimeCoverage(truncSeries, res.folds[k].fromI, cutI)
ok(JSON.stringify(covFull.counts) === JSON.stringify(covTrunc.counts), 'fold-k coverage counts unchanged by truncation')

// 6 ── guard: too-few-bars throws ─────────────────────────────────────────────────
console.log('\n6 · guards')
let threw = false
try { buildRegimeSpannedFolds(bars.slice(0, 100), { folds: 8 }) } catch { threw = true }
ok(threw, 'throws when too few bars for requested folds')

console.log(`\n${fail === 0 ? '✅' : '❌'} smoke_regime_splitter: ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
