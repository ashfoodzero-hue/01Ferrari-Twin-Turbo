// ════════════════════════════════════════════════════════════════════════════════
// rangeFade — in a contained RANGE, fade the extremes (buy the low / sell the high).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. Setup library completion (2026-06-27, R7 autonomous).
// The regime classifier DETECTS RANGE but no setup exploited it (audit gap). Detects a contained
// range (1.5–6×ATR wide over the recent window) and arms a fade of the NEARER extreme: price in the
// lower half → BUY limit near the range low; upper half → SELL limit near the range high. Target the
// opposite side of the range. R4 ahead-of-time. (Designed to fire only in RANGE — the regime gate is
// the natural filter; mean-reverts the box.)
// ════════════════════════════════════════════════════════════════════════════════
import { mkArmed } from '../_util.js'
export const meta = Object.freeze({ id: 'range_fade', owns: ['market_structure', 'support_resistance'] })

export function evaluate(s, cfg) {
  const { price, atr, bars, idx } = s
  if (!price || !atr || idx == null || idx < 40) return null
  const win = bars.slice(Math.max(0, idx - 30), idx + 1)
  let hi = -Infinity, lo = Infinity
  for (const b of win) { if (b.h > hi) hi = b.h; if (b.l < lo) lo = b.l }
  const range = hi - lo
  if (range > 6 * atr || range < 1.5 * atr) return null            // not a contained, tradeable range
  const pos = (price - lo) / range
  if (pos < 0.5) {                                                 // lower half → BUY the range low
    const entry = lo + 0.1 * range
    const sl = lo - cfg.slBufferAtr * atr - 0.3 * atr, tp = lo + 0.6 * range
    return mkArmed({ direction: 'UP', setup: meta.id, entry, sl, tp, score: 52, confidence: 48, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'range fade — buy the range low', weight: 1 }, { label: 'range', value: `${+lo.toFixed(2)}-${+hi.toFixed(2)}`, weight: 1 }] })
  }
  const entry = hi - 0.1 * range                                  // upper half → SELL the range high
  const sl = hi + cfg.slBufferAtr * atr + 0.3 * atr, tp = hi - 0.6 * range
  return mkArmed({ direction: 'DOWN', setup: meta.id, entry, sl, tp, score: 52, confidence: 48, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'range fade — sell the range high', weight: 1 }, { label: 'range', value: `${+lo.toFixed(2)}-${+hi.toFixed(2)}`, weight: 1 }] })
}
