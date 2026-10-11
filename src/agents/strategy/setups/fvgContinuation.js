// ════════════════════════════════════════════════════════════════════════════════
// fvgContinuation — anticipate a retrace-to-fill then continuation (R4 ahead-of-time).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Strategy agent (2026-06-24).
//
// LONG (trend up = price ≥ equilibrium): an UNFILLED bull FVG below price → anticipate a
// retrace into the gap then continuation up. Limit at the gap top, stop below the gap.
// SHORT mirror in a down bias. Entry is below/above current price → fires before the fill.
// ════════════════════════════════════════════════════════════════════════════════

import { mkArmed, equilibrium, nearestResistance, nearestSupport } from '../_util.js'

export const meta = Object.freeze({ id: 'fvg_continuation', owns: ['supply_demand', 'market_structure'] })

export function evaluate(s, cfg) {
  const { price, atr, q } = s
  if (!price || !atr) return null
  const eq = equilibrium(q)
  const trendUp = eq == null ? true : price >= eq         // bias from dealing-range half
  const trendDown = eq == null ? true : price <= eq

  if (trendUp) {
    let g = null
    for (const f of q.fvgs) {
      if (f.direction !== 'BULL' || f.status === 'filled') continue
      if (!(f.high < price)) continue
      if ((price - f.high) > cfg.maxDistAtr * atr) continue
      if (!g || f.high > g.high) g = f                    // nearest below
    }
    if (g) {
      const entry = g.high
      const sl = g.low - cfg.slBufferAtr * atr
      let tp = entry + cfg.targetR * (entry - sl)
      const res = nearestResistance(q, entry)
      if (res && res.price > entry && res.price < tp) tp = res.price
      const armed = mkArmed({
        direction: 'UP', setup: meta.id, entry, sl, tp,
        score: 52 + (f_isFresh(g) ? 8 : 0), confidence: 48,
        s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
        evidence: [{ label: 'setup', value: 'unfilled bull FVG, up bias', weight: 1 }, { label: 'fvg_zone', value: `${g.low}-${g.high}`, weight: 1 }],
      })
      if (armed) return armed
    }
  }

  if (trendDown) {
    let g = null
    for (const f of q.fvgs) {
      if (f.direction !== 'BEAR' || f.status === 'filled') continue
      if (!(f.low > price)) continue
      if ((f.low - price) > cfg.maxDistAtr * atr) continue
      if (!g || f.low < g.low) g = f
    }
    if (g) {
      const entry = g.low
      const sl = g.high + cfg.slBufferAtr * atr
      let tp = entry - cfg.targetR * (sl - entry)
      const sup = nearestSupport(q, entry)
      if (sup && sup.price < entry && sup.price > tp) tp = sup.price
      return mkArmed({
        direction: 'DOWN', setup: meta.id, entry, sl, tp,
        score: 52, confidence: 48,
        s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
        evidence: [{ label: 'setup', value: 'unfilled bear FVG, down bias', weight: 1 }, { label: 'fvg_zone', value: `${g.low}-${g.high}`, weight: 1 }],
      })
    }
  }
  return null
}

function f_isFresh(f) { return f.status === 'unfilled' }
