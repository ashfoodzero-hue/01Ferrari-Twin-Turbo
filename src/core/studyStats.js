// studyStats.js — the shared statistics for measured studies (2026-10-17; swing-candle study). One implementation, unit-tested in
// scripts/smoke_study_stats.mjs, so every study reports the same way: prevalence at swings vs controls with a ratio + two-sided test,
// Wilson intervals, Holm correction across a family, and a week-block bootstrap for means. Seeded RNG → reproducible numbers.

/** Normal CDF (Abramowitz-Stegun 7.1.26 via erf), accurate to ~1e-7. */
export function normCdf(z) { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2)
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2 }
/** Wilson score interval for k successes in n. */
export function wilson(k, n, z = 1.96) { if (!n) return { p: null, lo: null, hi: null }
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  return { p, lo: (c - m) / d, hi: (c + m) / d } }
/** Swing vs control prevalence: k1/n1 at swings, k2/n2 at controls → ratio, difference, two-sided pooled z-test p. */
export function compareRates(k1, n1, k2, n2) {
  const p1 = n1 ? k1 / n1 : null, p2 = n2 ? k2 / n2 : null
  if (!n1 || !n2) return { p1, p2, ratio: null, diff: null, z: null, p: null }
  const pp = (k1 + k2) / (n1 + n2), se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)), z = se > 0 ? (p1 - p2) / se : 0
  return { p1, p2, ratio: p2 > 0 ? p1 / p2 : null, diff: p1 - p2, z, p: 2 * (1 - normCdf(Math.abs(z))) } }
/** Holm step-down: input [{ key, p }] → same objects + { p_holm, holm_pass } at family-wise alpha. */
export function holm(rows, alpha = 0.05) {
  const s = rows.filter((r) => r.p != null).sort((a, b) => a.p - b.p), m = s.length; let stop = false, run = 0
  s.forEach((r, i) => { run = Math.max(run, Math.min(1, (m - i) * r.p)); r.p_holm = run; if (!stop && r.p <= alpha / (m - i)) r.holm_pass = true; else { stop = true; r.holm_pass = false } })
  for (const r of rows) if (r.p == null) { r.p_holm = null; r.holm_pass = false }
  return rows }
/** Seeded LCG in [0, 1). */
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
/** Week-block bootstrap of a mean: items [{ t, x }] → { mean, lo, hi } at the given two-sided level. */
export function blockBootstrapMean(items, { level = 0.95, B = 3000, seed = 7, blockMs = 7 * 86400000 } = {}) {
  if (!items.length) return { mean: null, lo: null, hi: null }
  const g = new Map(); for (const it of items) { const k = Math.floor(it.t / blockMs); if (!g.has(k)) g.set(k, []); g.get(k).push(it.x) }
  const blocks = [...g.values()], r = rng(seed), v = []
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let k = 0; k < blocks.length; k++) for (const x of blocks[(r() * blocks.length) | 0]) { s += x; n++ } v.push(n ? s / n : 0) }
  v.sort((a, b) => a - b); const a = (1 - level) / 2
  return { mean: items.reduce((s, it) => s + it.x, 0) / items.length, lo: v[Math.floor(a * B)], hi: v[Math.min(B - 1, Math.floor((1 - a) * B))] } }
