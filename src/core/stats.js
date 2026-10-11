// ════════════════════════════════════════════════════════════════════════════════
// stats.js — small, exact statistics helpers (no deps).
// Ashraf Ferrari Turbo 2 — AI Trading. P2.5 core framework (2026-06-24).
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Wilson score interval LOWER bound for a binomial proportion — the honest "at least this
 * good" figure we weight agents by (penalizes small samples; R3: measured, not optimistic).
 * @param {number} wins  successes
 * @param {number} n     decided trials
 * @param {number} z     z for the confidence level (1.96 ≈ 95%)
 */
export function wilsonLowerBound(wins, n, z = 1.96) {
  if (n <= 0) return 0
  const p = wins / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = p + z2 / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)
  return Math.max(0, (centre - margin) / denom)
}

export function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }
