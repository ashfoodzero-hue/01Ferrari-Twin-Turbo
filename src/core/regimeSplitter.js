// ════════════════════════════════════════════════════════════════════════════════
// regimeSplitter.js — regime-spanning walk-forward folds (R8 charter, point 4).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P7 item ⑦a (2026-06-27).
//
// R8.4 forbids single-regime validation windows (the P7 bull-window confound that REFUTED the
// 2019→2023 grader). This splits the bar series into contiguous time folds and proves each fold
// SPANS diverse market regimes (bull / bear / range / high-vol), so a config measured per fold is
// never accidentally read on one regime only. Regimes come from the CAUSAL classifyRegimeSeries
// (stable/hysteresis series: regime[i] uses only bars ≤ i) — so fold boundaries and labels are
// look-ahead-free. Pure functions; unit-proven in smoke_regime_splitter.mjs.
// ════════════════════════════════════════════════════════════════════════════════

import { classifyRegimeSeries } from '../agents/microstructure/marketRegime.js'

/** The 4 canonical regime BUCKETS a fold must span. Maps the fine regimes → coarse buckets. */
export const REGIME_BUCKETS = Object.freeze(['bull', 'bear', 'range', 'highvol'])

/** Coarse bucket for a fine regime label (null/unknown → null = "unclassified", not counted). */
export function regimeBucket(regime) {
  switch (regime) {
    case 'TREND_UP':
    case 'MELT_UP': return 'bull'
    case 'TREND_DOWN':
    case 'WATERFALL': return 'bear'
    case 'RANGE': return 'range'
    case 'VOLATILE_CHOP': return 'highvol'
    default: return null
  }
}

/** Bucket coverage over stable[fromI..toI] inclusive: counts, fractions (of CLASSIFIED bars), set. */
export function regimeCoverage(stable, fromI, toI) {
  const counts = { bull: 0, bear: 0, range: 0, highvol: 0 }
  let classified = 0
  for (let i = fromI; i <= toI; i++) {
    const b = regimeBucket(stable[i])
    if (b) { counts[b]++; classified++ }
  }
  const fracs = {}
  for (const k of REGIME_BUCKETS) fracs[k] = classified ? +(counts[k] / classified).toFixed(4) : 0
  return { counts, fracs, classified }
}

/**
 * Split `bars` into `folds` contiguous time slices and label each with its regime coverage +
 * whether it SPANS (≥ minBuckets buckets each holding ≥ minFrac of the fold's classified bars).
 * @param {Bar[]} bars ascending
 * @param {object} [opts]
 * @param {number} [opts.folds=8]        number of contiguous slices
 * @param {number} [opts.minFrac=0.03]   a bucket "counts as present" if it holds ≥ this fraction of classified bars
 *   (3% floor: on 15m, clean sustained EMA-trend is rare so VOLATILE_CHOP dominates ~60-83% and the
 *    directional buckets are inherently a minority — 5% would mis-flag the genuinely-diverse early-bull
 *    fold; 3% = "meaningfully present" and still excludes a directionally one-sided window.)
 * @param {number} [opts.minBuckets=3]   a fold SPANS if ≥ this many buckets are present
 * @param {object} [opts.cfg]            regime classifier overrides (passed to classifyRegimeSeries)
 * @param {{raw,stable}} [opts.series]   precomputed regime series (skip recompute)
 * @returns {{ series, folds:[fold], allSpan, summary }}
 *   fold = { index, fromI, toI, fromT, toT, bars, coverage:{counts,fracs,classified}, presentBuckets, nPresent, spans, dominant }
 */
export function buildRegimeSpannedFolds(bars, opts = {}) {
  const { folds = 8, minFrac = 0.03, minBuckets = 3, cfg = {}, series } = opts
  const n = bars.length
  if (n < folds * 250) throw new Error(`buildRegimeSpannedFolds: need ≥${folds * 250} bars for ${folds} folds (got ${n})`)
  const reg = series || classifyRegimeSeries(bars, cfg)
  const stable = reg.stable

  const out = []
  const size = Math.floor(n / folds)
  for (let f = 0; f < folds; f++) {
    const fromI = f * size
    const toI = f === folds - 1 ? n - 1 : (f + 1) * size - 1   // last fold absorbs the remainder
    const cov = regimeCoverage(stable, fromI, toI)
    const presentBuckets = REGIME_BUCKETS.filter((k) => cov.fracs[k] >= minFrac)
    const dominant = REGIME_BUCKETS.reduce((a, k) => (cov.fracs[k] > cov.fracs[a] ? k : a), REGIME_BUCKETS[0])
    // SPANS requires both DIRECTIONAL regimes present (the real anti-confound: the P7 failure was a
    // one-direction bull window) AND ≥minBuckets total — not just "3 buckets" which could omit a side.
    const directionalBalanced = presentBuckets.includes('bull') && presentBuckets.includes('bear')
    out.push({
      index: f, fromI, toI, fromT: bars[fromI].t, toT: bars[toI].t,
      from_iso: new Date(bars[fromI].t).toISOString().slice(0, 10), to_iso: new Date(bars[toI].t).toISOString().slice(0, 10),
      bars: toI - fromI + 1, coverage: { counts: cov.counts, fracs: cov.fracs, classified: cov.classified },
      presentBuckets, nPresent: presentBuckets.length, directionalBalanced,
      spans: presentBuckets.length >= minBuckets && directionalBalanced, dominant,
    })
  }
  const allSpan = out.every((f) => f.spans)
  const summary = {
    folds: out.length, allSpan, minFrac, minBuckets,
    spanning: out.filter((f) => f.spans).length,
    bucketsAcrossAllFolds: REGIME_BUCKETS.filter((k) => out.some((f) => f.presentBuckets.includes(k))),
  }
  return { series: reg, folds: out, allSpan, summary }
}

/** Index of the fold containing bar index `i` (folds are contiguous, ascending). -1 if out of range. */
export function assignFold(folds, i) {
  for (const f of folds) if (i >= f.fromI && i <= f.toI) return f.index
  return -1
}
