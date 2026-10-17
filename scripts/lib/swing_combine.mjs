// swing_combine.mjs — Phase 3B core (docs/SWING_COMBINE_SPEC.md, 2026-10-17). Pure functions.
/** Outcome still UNKNOWN at time T? real swing: the anchor not yet confirmed (T < conf); failed extreme: not yet broken (T < brk). */
export const undecided = (c, T) => T != null && (c.real ? T < c.conf : T < c.brk)
/** STRONG +1: the anchor candle after the extreme closes in the top third (lows) / bottom third (highs) of its own range. null if missing. */
export function strongPlus1(C, i, side) { const b = C[i + 1]; if (!b) return null; const r = b.h - b.l; if (!(r > 0)) return false
  const loc = (b.c - b.l) / r; return side === 'L' ? loc >= 2 / 3 : loc <= 1 / 3 }
/** DIRECTIONAL +1: bullish after a low / bearish after a high. */
export function dirPlus1(C, i, side) { const b = C[i + 1]; if (!b) return null; return side === 'L' ? b.c > b.o : b.c < b.o }
