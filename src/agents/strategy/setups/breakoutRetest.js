// ════════════════════════════════════════════════════════════════════════════════
// breakoutRetest — a level just broke; arm the RETEST of the broken level (now flipped role).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. Setup library completion (2026-06-27, R7 autonomous).
// Audit-flagged missing. UP: price closed above an active resistance within the last K bars → arm a
// BUY limit back at that level (now support) for the retest. Mirror for downside. R4 ahead-of-time
// (entry below price for UP). Distinct from fvg-continuation (this keys off an S/R level break).
// ════════════════════════════════════════════════════════════════════════════════
import { mkArmed } from '../_util.js'
export const meta = Object.freeze({ id: 'breakout_retest', owns: ['market_structure', 'support_resistance'] })

export function evaluate(s, cfg) {
  const { price, atr, bars, idx, q } = s
  if (!price || !atr || idx == null || idx < 30 || !q?.levels?.length) return null
  const K = 12, win = bars.slice(Math.max(0, idx - K), idx + 1)
  // UP: a level now BELOW price that price was below within the window (recent upside break) → retest = support
  let bull = null
  for (const l of q.levels) {
    if (!(l.price < price) || (price - l.price) > cfg.maxDistAtr * atr) continue
    if (!win.some((b) => b.c < l.price)) continue                 // price recently below it → it was resistance, now broken
    if (!bull || l.price > bull.price) bull = l                    // nearest broken level below
  }
  if (bull) {
    const entry = bull.price, sl = bull.price - cfg.slBufferAtr * atr - 0.5 * atr, tp = entry + cfg.targetR * (entry - sl)
    const armed = mkArmed({ direction: 'UP', setup: meta.id, entry, sl, tp, score: 54, confidence: 50, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'breakout retest (broke resistance → buy retest)', weight: 1 }, { label: 'level', value: +bull.price.toFixed(2), weight: 1 }] })
    if (armed) return armed
  }
  // DOWN: a level now ABOVE price that price was above within the window (recent downside break) → retest = resistance
  let bear = null
  for (const l of q.levels) {
    if (!(l.price > price) || (l.price - price) > cfg.maxDistAtr * atr) continue
    if (!win.some((b) => b.c > l.price)) continue
    if (!bear || l.price < bear.price) bear = l
  }
  if (bear) {
    const entry = bear.price, sl = bear.price + cfg.slBufferAtr * atr + 0.5 * atr, tp = entry - cfg.targetR * (sl - entry)
    return mkArmed({ direction: 'DOWN', setup: meta.id, entry, sl, tp, score: 54, confidence: 50, s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr, evidence: [{ label: 'setup', value: 'breakout retest (broke support → sell retest)', weight: 1 }, { label: 'level', value: +bear.price.toFixed(2), weight: 1 }] })
  }
  return null
}
