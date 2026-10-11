// ════════════════════════════════════════════════════════════════════════════════
// deflation.js — multiple-testing DEFLATION for backtest claims (R8 Validation Charter).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P7 foundation (2026-06-27).
//
// When you try N configs and report the BEST, the best one looks good BY CHANCE even with
// zero true edge. R8 mandates we DEFLATE every edge claim for the number of trials tried:
//   · Deflated Sharpe Ratio (DSR) — Bailey & López de Prado (2014): the probability the TRUE
//     Sharpe is > 0 AFTER accounting for N trials, sample length T, skew & kurtosis of returns.
//   · Minimum Track Record Length (MinTRL) — Bailey & LdP (2012): how many observations are
//     needed before an observed Sharpe is statistically > a benchmark at confidence α.
//   · PBO via CSCV — Bailey, Borwein, LdP & Zhu (2017): Probability of Backtest Overfitting =
//     P(the IS-best config underperforms the OOS median) over combinatorial train/test splits.
//
// All are PURE functions. Self-contained normal CDF / inverse-CDF (no deps). Look-ahead-free
// by nature (they consume already-measured statistics). Unit-proven in smoke_deflation.mjs.
// ════════════════════════════════════════════════════════════════════════════════

export const EULER_MASCHERONI = 0.5772156649015329

/** Standard normal CDF Φ(x) via the Abramowitz-Stegun erf approximation (|err| < 1.5e-7). */
export function normalCdf(x) {
  // Φ(x) = 0.5·(1 + erf(x/√2))
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp(-x * x / 2)   // pdf
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  p = 1 - p
  return x >= 0 ? p : 1 - p
}

/** Inverse standard normal CDF Φ⁻¹(p) via Acklam's rational approximation (|err| < 1.15e-9). */
export function invNormalCdf(p) {
  if (p <= 0 || p >= 1) {
    if (p === 0) return -Infinity
    if (p === 1) return Infinity
    return NaN
  }
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]
  const pLow = 0.02425, pHigh = 1 - pLow
  let q, r
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
}

/** Sample mean. */
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }
/** Sample standard deviation (ddof=1). */
function std(xs, m = mean(xs)) {
  if (xs.length < 2) return 0
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}

/**
 * Per-observation Sharpe ratio of a return stream + its higher moments (skew, kurtosis).
 * NOT annualized — DSR/MinTRL operate in the observation frequency you pass in.
 * @param {number[]} returns  per-trade (or per-period) returns
 * @returns {{ sharpe, mean, sd, skew, kurtosis, n }}
 */
export function sharpeStats(returns) {
  const n = returns.length
  if (n < 2) return { sharpe: 0, mean: mean(returns), sd: 0, skew: 0, kurtosis: 3, n }
  const m = mean(returns)
  const sd = std(returns, m)                          // sample sd (ddof=1) — for the Sharpe ratio
  if (sd === 0) return { sharpe: 0, mean: m, sd: 0, skew: 0, kurtosis: 3, n }
  // Standardized 3rd/4th moments use the POPULATION sd (ddof=0), per Bailey & LdP's DSR variance
  // term (textbook standardized moments: Gaussian kurtosis = 3, symmetric two-point kurtosis = 1).
  const sdPop = Math.sqrt(returns.reduce((a, x) => a + (x - m) ** 2, 0) / n)
  let m3 = 0, m4 = 0
  for (const x of returns) { const z = (x - m) / sdPop; m3 += z ** 3; m4 += z ** 4 }
  const skew = m3 / n
  const kurtosis = m4 / n   // raw kurtosis (Gaussian = 3)
  return { sharpe: m / sd, mean: m, sd, skew, kurtosis, n }
}

/**
 * Expected MAXIMUM Sharpe ratio under N INDEPENDENT trials with zero true edge, given the
 * cross-trial variance of the estimated Sharpes (Bailey & LdP 2014, eq. for E[max]).
 *   SR0 = √V · [ (1-γ)·Φ⁻¹(1 − 1/N) + γ·Φ⁻¹(1 − 1/(N·e)) ]
 * @param {number} varSR  variance of the SRs across the N trials
 * @param {number} nTrials
 */
export function expectedMaxSharpe(varSR, nTrials) {
  if (nTrials <= 1) return 0
  const s = Math.sqrt(Math.max(varSR, 0))
  const g = EULER_MASCHERONI
  return s * ((1 - g) * invNormalCdf(1 - 1 / nTrials) + g * invNormalCdf(1 - 1 / (nTrials * Math.E)))
}

/**
 * Deflated Sharpe Ratio — P(true SR > benchmark) after deflating for N trials & non-normality.
 *   DSR = Φ( (SR̂ − SR0)·√(T−1) / √(1 − skew·SR̂ + (kurt−1)/4·SR̂²) )
 * @param {object} o
 * @param {number} o.observedSharpe  the BEST config's per-observation Sharpe (SR̂)
 * @param {number} o.nObs            number of observations T (trades/periods)
 * @param {number} [o.skew=0]
 * @param {number} [o.kurtosis=3]
 * @param {number} [o.nTrials=1]
 * @param {number} [o.varTrials]     variance of SRs across the trials tried (drives SR0)
 * @param {number} [o.benchmarkSharpe] explicit SR0 to deflate against (overrides nTrials/varTrials)
 * @returns {{ dsr, sr0, observedSharpe, nObs, nTrials, passes }}  passes = dsr ≥ 0.95
 */
export function deflatedSharpe({ observedSharpe, nObs, skew = 0, kurtosis = 3, nTrials = 1, varTrials, benchmarkSharpe }) {
  const T = nObs
  if (!(T > 1)) return { dsr: 0, sr0: 0, observedSharpe, nObs: T, nTrials, passes: false }
  const sr0 = benchmarkSharpe != null ? benchmarkSharpe
    : (nTrials > 1 && varTrials != null ? expectedMaxSharpe(varTrials, nTrials) : 0)
  const denom = Math.sqrt(Math.max(1 - skew * observedSharpe + ((kurtosis - 1) / 4) * observedSharpe ** 2, 1e-12))
  const z = (observedSharpe - sr0) * Math.sqrt(T - 1) / denom
  const dsr = normalCdf(z)
  return { dsr: +dsr.toFixed(6), sr0: +sr0.toFixed(6), observedSharpe: +observedSharpe.toFixed(6), nObs: T, nTrials, passes: dsr >= 0.95 }
}

/**
 * Minimum Track Record Length — observations needed for SR̂ to be statistically > a benchmark
 * SR* at confidence α (Bailey & LdP 2012):
 *   MinTRL = 1 + (1 − skew·SR̂ + (kurt−1)/4·SR̂²) · ( Z_α / (SR̂ − SR*) )²
 * @returns {{ minTRL, achievable, observedSharpe, benchmarkSharpe, confidence }}
 */
export function minTrackRecordLength({ observedSharpe, benchmarkSharpe = 0, skew = 0, kurtosis = 3, confidence = 0.95 }) {
  if (observedSharpe <= benchmarkSharpe) return { minTRL: Infinity, achievable: false, observedSharpe, benchmarkSharpe, confidence }
  const za = invNormalCdf(confidence)
  const variTerm = 1 - skew * observedSharpe + ((kurtosis - 1) / 4) * observedSharpe ** 2
  const minTRL = 1 + variTerm * (za / (observedSharpe - benchmarkSharpe)) ** 2
  return { minTRL: +minTRL.toFixed(2), achievable: true, observedSharpe, benchmarkSharpe, confidence }
}

/**
 * Probability of Backtest Overfitting via CSCV (Combinatorially-Symmetric Cross-Validation).
 * Given a performance MATRIX M[s][c] = the in-sample performance metric of config c on sub-period
 * (slice) s, split the S slices into all C(S, S/2) train/test partitions; for each, pick the
 * IS-best config on train, look up its rank on test; PBO = P(that rank lands in the BOTTOM half)
 * = P(the IS-winner is below the OOS median). LdP: PBO near 0 = robust, near 0.5+ = overfit.
 * @param {number[][]} matrix  rows = slices (S, even), cols = configs (C); higher = better
 * @returns {{ pbo, n_splits, logits, median_logit }}
 */
export function pboCSCV(matrix) {
  const S = matrix.length
  if (S < 2 || S % 2 !== 0) throw new Error(`pboCSCV: need an even number of slices ≥2 (got ${S})`)
  const C = matrix[0].length
  if (C < 2) throw new Error(`pboCSCV: need ≥2 configs (got ${C})`)
  const idx = [...Array(S).keys()]
  const half = S / 2
  // all combinations C(S, half) choosing the TRAIN slices; the complement is TEST
  const combos = []
  const pick = (start, chosen) => {
    if (chosen.length === half) { combos.push([...chosen]); return }
    for (let i = start; i < S; i++) { chosen.push(i); pick(i + 1, chosen); chosen.pop() }
  }
  pick(0, [])
  const colMean = (rows, c) => rows.reduce((a, r) => a + matrix[r][c], 0) / rows.length
  const logits = []
  for (const train of combos) {
    const test = idx.filter((i) => !train.includes(i))
    // IS-best config = argmax average over train slices
    let best = 0, bestV = -Infinity
    for (let c = 0; c < C; c++) { const v = colMean(train, c); if (v > bestV) { bestV = v; best = c } }
    // its OOS performance + rank among all configs on test (1=worst .. C=best)
    const testPerf = []
    for (let c = 0; c < C; c++) testPerf.push({ c, v: colMean(test, c) })
    testPerf.sort((a, b) => a.v - b.v)
    const rank = testPerf.findIndex((x) => x.c === best) + 1
    // relative rank ω ∈ (0,1); logit λ = ln(ω/(1−ω)); overfit ⇒ ω<0.5 ⇒ λ<0
    let omega = rank / (C + 1)
    omega = Math.min(Math.max(omega, 1e-6), 1 - 1e-6)
    logits.push(Math.log(omega / (1 - omega)))
  }
  logits.sort((a, b) => a - b)
  const median_logit = logits[Math.floor(logits.length / 2)]
  const pbo = logits.filter((l) => l <= 0).length / logits.length
  return { pbo: +pbo.toFixed(4), n_splits: combos.length, median_logit: +median_logit.toFixed(4), logits }
}
