// ════════════════════════════════════════════════════════════════════════════════
// obDiscountTap — anticipate a bounce from an UNMITIGATED order block (R4 ahead-of-time).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Strategy agent (2026-06-24).
//
// LONG: an unmitigated BULL order block sits BELOW price, in discount (≤ equilibrium). We
// arm BEFORE price taps it — limit at the OB top, stop below the OB, target by R-multiple.
// SHORT: mirror — unmitigated BEAR OB above price, in premium. Entry is a level price has
// not reached → the signal fires ahead of the move and is pre-placeable.
// ════════════════════════════════════════════════════════════════════════════════

import { mkArmed, equilibrium, nearestResistance, nearestSupport } from '../_util.js'

export const meta = Object.freeze({ id: 'ob_discount_tap', owns: ['supply_demand', 'premium_discount', 'market_structure'] })

export function evaluate(s, cfg) {
  const { price, atr, q } = s
  if (!price || !atr) return null
  const eq = equilibrium(q)

  // ── LONG: nearest unmitigated BULL OB below price, in discount ──
  let bull = null
  for (const o of q.orderBlocks) {
    if (o.direction !== 'BULL' || o.status !== 'unmitigated') continue
    if (!(o.high < price)) continue
    if (eq != null && o.high > eq) continue                 // must be in discount
    if ((price - o.high) > cfg.maxDistAtr * atr) continue
    if (!bull || o.high > bull.high) bull = o               // nearest below
  }
  if (bull) {
    const entry = bull.high
    const sl = bull.low - cfg.slBufferAtr * atr
    let tp = entry + cfg.targetR * (entry - sl)
    const res = nearestResistance(q, entry)
    if (res && res.price > entry && res.price < tp) tp = res.price   // cap at real resistance if nearer
    const armed = mkArmed({
      direction: 'UP', setup: meta.id, entry, sl, tp,
      score: 55 + (eq != null && bull.high <= eq ? 15 : 0) + Math.min(15, bull.age_ms ? 0 : 0),
      confidence: 50 + Math.min(20, 5 * (q.counts.orderBlocks > 0 ? 2 : 0)),
      s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
      evidence: [{ label: 'setup', value: 'bull OB unmitigated in discount', weight: 1 }, { label: 'ob_zone', value: `${bull.low}-${bull.high}`, weight: 1 }],
    })
    if (armed) return armed
  }

  // ── SHORT: nearest unmitigated BEAR OB above price, in premium ──
  let bear = null
  for (const o of q.orderBlocks) {
    if (o.direction !== 'BEAR' || o.status !== 'unmitigated') continue
    if (!(o.low > price)) continue
    if (eq != null && o.low < eq) continue                  // must be in premium
    if ((o.low - price) > cfg.maxDistAtr * atr) continue
    if (!bear || o.low < bear.low) bear = o                 // nearest above
  }
  if (bear) {
    const entry = bear.low
    const sl = bear.high + cfg.slBufferAtr * atr
    let tp = entry - cfg.targetR * (sl - entry)
    const sup = nearestSupport(q, entry)
    if (sup && sup.price < entry && sup.price > tp) tp = sup.price
    return mkArmed({
      direction: 'DOWN', setup: meta.id, entry, sl, tp,
      score: 55 + (eq != null && bear.low >= eq ? 15 : 0),
      confidence: 50,
      s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
      evidence: [{ label: 'setup', value: 'bear OB unmitigated in premium', weight: 1 }, { label: 'ob_zone', value: `${bear.low}-${bear.high}`, weight: 1 }],
    })
  }
  return null
}
