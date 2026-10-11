// ════════════════════════════════════════════════════════════════════════════════
// sweepReclaim — pre-place a limit AT resting liquidity to catch the stop-hunt reversal.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Strategy agent (2026-06-24).
//
// The most genuinely ahead-of-time setup (R4): a RESTING sell-side pool (EQL) sits just
// below price — we anticipate the sweep and pre-place a BUY limit AT the pool, stop below
// the anticipated spike, target by R-multiple. We're filled exactly when the liquidity is
// grabbed, then ride the reclaim. SHORT mirror on a resting buy-side pool (EQH) above.
// ════════════════════════════════════════════════════════════════════════════════

import { mkArmed, nearestResistance, nearestSupport } from '../_util.js'

export const meta = Object.freeze({ id: 'sweep_reclaim', owns: ['liquidity', 'market_structure'] })

export function evaluate(s, cfg) {
  const { price, atr, q } = s
  if (!price || !atr) return null

  // ── LONG: nearest RESTING sell-side pool (EQL) below price ──
  let eql = null
  for (const p of q.liquidity) {
    if (p.side !== 'SELL_SIDE' || p.status !== 'resting') continue
    if (!(p.price < price)) continue
    if ((price - p.price) > cfg.maxDistAtr * atr) continue
    if (!eql || p.price > eql.price) eql = p              // nearest below
  }
  if (eql) {
    const entry = eql.price
    const sl = entry - cfg.sweepSlAtr * atr               // below the anticipated spike
    let tp = entry + cfg.targetR * (entry - sl)
    const res = nearestResistance(q, entry)
    if (res && res.price > entry && res.price < tp) tp = res.price
    const armed = mkArmed({
      direction: 'UP', setup: meta.id, entry, sl, tp,
      score: 58 + Math.min(12, 3 * (eql.count - 2)), confidence: 52 + Math.min(18, 4 * eql.count),
      s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
      evidence: [{ label: 'setup', value: `EQL sweep-reclaim (${eql.count} touches)`, weight: 1 }, { label: 'pool_price', value: eql.price, weight: 1 }],
    })
    if (armed) return armed
  }

  // ── SHORT: nearest RESTING buy-side pool (EQH) above price ──
  let eqh = null
  for (const p of q.liquidity) {
    if (p.side !== 'BUY_SIDE' || p.status !== 'resting') continue
    if (!(p.price > price)) continue
    if ((p.price - price) > cfg.maxDistAtr * atr) continue
    if (!eqh || p.price < eqh.price) eqh = p
  }
  if (eqh) {
    const entry = eqh.price
    const sl = entry + cfg.sweepSlAtr * atr
    let tp = entry - cfg.targetR * (sl - entry)
    const sup = nearestSupport(q, entry)
    if (sup && sup.price < entry && sup.price > tp) tp = sup.price
    return mkArmed({
      direction: 'DOWN', setup: meta.id, entry, sl, tp,
      score: 58 + Math.min(12, 3 * (eqh.count - 2)), confidence: 52 + Math.min(18, 4 * eqh.count),
      s, owns: meta.owns, minRr: cfg.minRr, maxLeadAtr: cfg.maxLeadAtr,
      evidence: [{ label: 'setup', value: `EQH sweep-reclaim (${eqh.count} touches)`, weight: 1 }, { label: 'pool_price', value: eqh.price, weight: 1 }],
    })
  }
  return null
}
