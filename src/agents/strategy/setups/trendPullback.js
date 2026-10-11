// ════════════════════════════════════════════════════════════════════════════════
// trendPullback — BUY the dip in an uptrend / sell the rally in a downtrend, at the OTE.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. Setup library completion (2026-06-27, R7 autonomous).
// The bread-and-butter continuation setup the audit flagged missing. Detects the recent impulse leg
// (cheap window scan) and arms a limit at the 0.705 OTE retracement IN the trend direction — R4
// ahead-of-time (entry below price for a long pullback). Validated for edge per R8 in the tiered WF.
// ════════════════════════════════════════════════════════════════════════════════
import { mkArmed } from '../_util.js'
export const meta = Object.freeze({ id: 'trend_pullback', owns: ['market_structure', 'premium_discount'] })

export function evaluate(s, cfg) {
  const { price, atr, bars, idx } = s
  if (!price || !atr || idx == null || idx < 60) return null
  const win = bars.slice(Math.max(0, idx - 50), idx + 1)
  let hi = -Infinity, lo = Infinity, hiIdx = 0, loIdx = 0
  win.forEach((b, k) => { if (b.h > hi) { hi = b.h; hiIdx = k } if (b.l < lo) { lo = b.l; loIdx = k } })
  const range = hi - lo
  if (range < atr) return null
  // UP-leg (high after low) + price pulled back below the high → BUY the OTE discount
  if (hiIdx > loIdx && price < hi && price > lo) {
    const entry = hi - 0.705 * range, sl = lo - cfg.slBufferAtr * atr, tp = entry + cfg.targetR * (entry - sl)
    return mkArmed({ direction: 'UP', setup: meta.id, entry, sl, tp, score: 56, confidence: 52, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'trend pullback → OTE (up-leg)', weight: 1 }, { label: 'leg', value: `${+lo.toFixed(2)}-${+hi.toFixed(2)}`, weight: 1 }] })
  }
  // DOWN-leg (low after high) + price pulled back above the low → SELL the OTE premium
  if (loIdx > hiIdx && price > lo && price < hi) {
    const entry = lo + 0.705 * range, sl = hi + cfg.slBufferAtr * atr, tp = entry - cfg.targetR * (sl - entry)
    return mkArmed({ direction: 'DOWN', setup: meta.id, entry, sl, tp, score: 56, confidence: 52, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'trend pullback → OTE (down-leg)', weight: 1 }, { label: 'leg', value: `${+lo.toFixed(2)}-${+hi.toFixed(2)}`, weight: 1 }] })
  }
  return null
}
