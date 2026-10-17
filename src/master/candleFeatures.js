// candleFeatures.js — the measurable anatomy of ONE candle against its neighbours (2026-10-17; swing-candle study). Pure functions, no
// thresholds hidden inside: every derived label (hammer, engulfing, sweep …) is defined here once, in the open, so the study spec can cite it.
// Sizes are in ATR units of the candle's own timeframe (the ATR of the PREVIOUS closed bar, so the candle never measures itself).

/** Raw anatomy of candle b (with the previous candle p and the timeframe ATR a). */
export function anatomy(b, p, a) {
  const range = b.h - b.l, body = Math.abs(b.c - b.o), up = b.h - Math.max(b.o, b.c), dn = Math.min(b.o, b.c) - b.l
  const f = (x) => (range > 0 ? x / range : 0)
  const out = {
    range_atr: a > 0 ? range / a : null,
    body_atr: a > 0 ? body / a : null,
    body_frac: f(body), upper_wick_frac: f(up), lower_wick_frac: f(dn),
    close_loc: range > 0 ? (b.c - b.l) / range : 0.5,          // 0 = closed on the low, 1 = closed on the high
    dir: body <= 0.1 * range ? 'doji' : b.c > b.o ? 'bull' : 'bear',
  }
  if (p) {
    out.inside = b.h <= p.h && b.l >= p.l
    out.outside = b.h > p.h && b.l < p.l
    out.bull_engulf = b.c > b.o && p.c < p.o && b.c >= p.o && b.o <= p.c
    out.bear_engulf = b.c < b.o && p.c > p.o && b.c <= p.o && b.o >= p.c
    out.sweep_low_reclaim = b.l < p.l && b.c > p.l                 // took the previous low, closed back above it
    out.sweep_high_reject = b.h > p.h && b.c < p.h                 // took the previous high, closed back below it
    out.gap_atr = a > 0 ? (b.o - p.c) / a : null
  }
  // labelled shapes (definitions fixed here, cited by the spec)
  out.hammer = out.lower_wick_frac >= 0.6 && out.body_frac <= 0.3 && out.close_loc >= 0.6        // long lower wick, small body, closes high
  out.shooting_star = out.upper_wick_frac >= 0.6 && out.body_frac <= 0.3 && out.close_loc <= 0.4
  out.marubozu = out.body_frac >= 0.85
  return out
}
/** Anatomy of the window around bar i: offsets −before … +after (only bars that exist). ATR array A aligned to bars. */
export function windowAnatomy(bars, A, i, { before = 3, after = 3 } = {}) {
  const out = {}
  for (let o = -before; o <= after; o++) { const j = i + o; if (j < 1 || j >= bars.length) continue
    out[o] = anatomy(bars[j], bars[j - 1], A[j - 1]) }
  return out
}
