// ════════════════════════════════════════════════════════════════════════════════
// rng.js — THE deterministic RNG for every bootstrap/resample in this project.
// (2026-08-29, self-caught.)
//
// 🚨 WHY THIS FILE EXISTS. Every study this week used the same inline LCG:
//     seed = (seed * 1103515245 + 12345) & 0x7fffffff
// In JavaScript that multiply exceeds 2^53, so floating-point rounding silently corrupts the sequence; at
// bootstrap volumes (2,000 resamples x thousands of trades ≈ 10^7 draws) it degenerates into short, biased
// cycles. THE TELL THAT CAUGHT IT: a bootstrap 95% CI of [+0.0157, +0.0190] around a sample mean of +0.0127 —
// a correct bootstrap of the mean MUST bracket the sample mean, so the number was arithmetically impossible.
// (Same reflex as the WR-below-break-even-yet-profitable catch: when a statistic violates its own identity,
// the harness is broken, not the market.)
//
// mulberry32 stays inside 32-bit integer ops via Math.imul — no precision loss, full 2^32 state cycle,
// excellent uniformity for this purpose, and byte-reproducible across runs and machines.
// EVERY consumer must import this; an inline RNG in a validator is now a bug by definition (guarded).
// ════════════════════════════════════════════════════════════════════════════════

/** Deterministic uniform [0,1) generator. Same seed -> same sequence, always. */
export function mulberry32(seed = 12345) {
  let a = seed | 0
  return function () {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Bootstrap CI of the mean — the one implementation every validator shares, so a fix lands everywhere at once.
 * @returns {{lb:number, ub:number, center:number}} 5th/95th percentile of 2,000 resampled means (default)
 */
export function bootstrapMeanCI(values, { resamples = 2000, seed = 12345, lo = 0.05, hi = 0.95 } = {}) {
  const n = values.length
  if (!n) return { lb: 0, ub: 0, center: 0 }
  const rnd = mulberry32(seed)
  const means = []
  for (let b = 0; b < resamples; b++) {
    let s = 0
    for (let i = 0; i < n; i++) s += values[(rnd() * n) | 0]
    means.push(s / n)
  }
  means.sort((a, b) => a - b)
  const sample = values.reduce((s, x) => s + x, 0) / n
  const out = { lb: +means[Math.floor(lo * resamples)].toFixed(5), ub: +means[Math.floor(hi * resamples)].toFixed(5), center: +sample.toFixed(5) }
  // the identity that caught the broken LCG — enforced forever: the CI must bracket the sample mean
  if (sample < out.lb || sample > out.ub) throw new Error(`bootstrap CI [${out.lb}, ${out.ub}] does not bracket the sample mean ${out.center} — the resampler is broken`)
  return out
}
