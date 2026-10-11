// ════════════════════════════════════════════════════════════════════════════════
// emaLevels.js — EMA 20 / 50 / 200 on any timeframe (2026-10-09; TOOL 2 of Ashraf's one-by-one plan). ONE module for the studies
// (study_ema_levels.mjs, study_ema_matrix_filter.mjs) and the chart.
// ────────────────────────────────────────────────────────────────────────────────
// EMA(n) over CLOSES of closed bars: seeded with the SMA of the first n closes (at index n − 1), then e = c·k + e·(1 − k), k = 2/(n + 1).
// VALID from index 2n − 1 (n more bars after the seed — the seed's weight has decayed below (1 − k)^n ≈ e^−2 ≈ 13 %).
//   → monthly EMA200 needs 399 months: NOT computable on our 13 y history (159 months) — it is reported as unavailable, never faked.
// The EMA of bar i is known at the CLOSE of bar i and is the level until the next close.
// TREND(tf) at a time T = from the last bar closed by T: BULL ⇔ close > EMA20 > EMA50 > EMA200 · BEAR ⇔ close < EMA20 < EMA50 < EMA200 ·
// MIXED otherwise · null if any of the three is not valid there.
// ════════════════════════════════════════════════════════════════════════════════
export const EMA_N = Object.freeze([20, 50, 200])

/** Float64Array of the EMA over closes (NaN before it is valid). */
export function emaArray(B, n) {
  const out = new Float64Array(B.length).fill(NaN), k = 2 / (n + 1)
  if (B.length < n) return out
  let e = 0; for (let i = 0; i < n; i++) e += B[i].c; e /= n
  for (let i = n; i < B.length; i++) { e = B[i].c * k + e * (1 - k); if (i >= 2 * n - 1) out[i] = e }
  return out
}

/** All three EMAs + the trend per bar. */
export function emaStack(B) {
  const E = Object.fromEntries(EMA_N.map((n) => [n, emaArray(B, n)]))
  const trend = B.map((b, i) => { const a = E[20][i], m = E[50][i], z = E[200][i]; if (![a, m, z].every(Number.isFinite)) return null
    return b.c > a && a > m && m > z ? 'BULL' : b.c < a && a < m && m < z ? 'BEAR' : 'MIXED' })
  return { E, trend }
}
