// ════════════════════════════════════════════════════════════════════════════════
// setupLibrary.js — the registry of named anticipatory setups (extensible).
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Strategy agent (2026-06-24).
// Add a new setup by dropping a module in setups/ and registering it here.
// ════════════════════════════════════════════════════════════════════════════════

import * as obDiscountTap from './setups/obDiscountTap.js'
import * as fvgContinuation from './setups/fvgContinuation.js'
import * as sweepReclaim from './setups/sweepReclaim.js'
import * as trendPullback from './setups/trendPullback.js'
import * as breakoutRetest from './setups/breakoutRetest.js'
import * as rangeFade from './setups/rangeFade.js'
import { classifyRegime } from '../microstructure/marketRegime.js'
import { confirms } from '../microstructure/momentum.js'

export const SETUPS = Object.freeze([sweepReclaim, obDiscountTap, fvgContinuation, trendPullback, breakoutRetest, rangeFade])

/**
 * Regime → setup routing map (which regime each playbook belongs in). A setup mapped to `null`
 * is regime-agnostic (a sweep can happen in any regime). A setup id NOT present here is fail-open
 * (allowed everywhere) so adding a setup never silently blocks it. This is the "right playbook for
 * the regime" gate the classifier was built for; it is OPT-IN (see evaluateArmed cfg.regimeRoute)
 * so the locked, validated micro path stays byte-identical.
 */
export const REGIME_ROUTING = Object.freeze({
  range_fade:       ['RANGE'],                                                  // fade extremes only inside a box
  trend_pullback:   ['TREND_UP', 'TREND_DOWN', 'MELT_UP', 'WATERFALL'],         // needs a real trend to pull back into
  breakout_retest:  ['TREND_UP', 'TREND_DOWN', 'MELT_UP', 'WATERFALL', 'VOLATILE_CHOP'],
  fvg_continuation: ['TREND_UP', 'TREND_DOWN', 'MELT_UP', 'WATERFALL'],         // continuation = directional regimes
  ob_discount_tap:  ['TREND_UP', 'TREND_DOWN', 'MELT_UP', 'WATERFALL', 'RANGE'],
  sweep_reclaim:    null,                                                       // liquidity sweeps occur in any regime
})

/** True if `setupId` is allowed in `regime`. Fail-open on unknown regime / unmapped setup / null map. */
export function setupAllowsRegime(setupId, regime) {
  if (!regime) return true
  const allowed = REGIME_ROUTING[setupId]
  if (allowed == null) return true
  return allowed.includes(regime)
}

/** Default tuning (config-driven so the backtest can sweep without code edits). */
export const DEFAULT_CFG = Object.freeze({
  maxDistAtr: 3.0,      // how far ahead the limit may sit (× ATR) and still be armable
  maxLeadAtr: 4.0,      // hard cap on lead distance (× ATR) — else the limit won't fill
  slBufferAtr: 0.25,    // stop buffer beyond a zone (× ATR)
  sweepSlAtr: 1.0,      // stop below/above the anticipated sweep spike (× ATR)
  targetR: 1.5,         // reward:risk multiple for the take-profit
  minRr: 1.0,           // minimum reward:risk to arm
})

/** All taxonomy rows the strategy agent collectively owns (for the Completeness Critic). */
export const OWNS = Object.freeze([...new Set(SETUPS.flatMap((m) => m.meta.owns))])

/**
 * Evaluate EVERY setup against a state `s` and return the armed ones, sorted by conviction
 * (score × confidence, ties → better R:R). Single source of truth shared by the agent's
 * run() and the backtest — so live and backtest pick identically (no drift). A throwing
 * setup is skipped, never breaks the evaluation.
 */
export function evaluateArmed(s, cfg = DEFAULT_CFG) {
  const armed = []
  for (const setup of SETUPS) {
    try { const a = setup.evaluate(s, cfg); if (a) armed.push(a) } catch { /* skip bad setup */ }
  }

  // ── OPT-IN regime→setup routing (cfg.regimeRoute). Default OFF ⇒ this block is skipped and
  // the returned set is byte-identical to before — the locked, validated micro signal that flows
  // through generateCandidates with DEFAULT_CFG is therefore UNTOUCHED. ──
  let routed = armed
  if (cfg.regimeRoute && routed.length) {
    let regime = s.regime                                       // caller may pass a precomputed regime
    if (regime === undefined) {                                 // else classify causally from bars ≤ idx
      const r = classifyRegime(s.bars.slice(0, s.idx + 1))
      regime = r ? r.regime : null
    }
    routed = routed.filter((a) => setupAllowsRegime(a.setup, regime))
  }

  // ── OPT-IN momentum confirmation gate (cfg.momentumGate). Needs a momentum read on s.momentum
  // (the strategy agent computes it once); default OFF / no read ⇒ skipped. Drops a setup only when
  // momentum LEANS AGAINST it (policy not_opposed by default — NEUTRAL never blocks, per §4.2). ──
  if (cfg.momentumGate && routed.length && s.momentum) {
    const pol = cfg.momentumPolicy || { policy: 'not_opposed' }
    routed = routed.filter((a) => confirms(s.momentum, a.direction, pol))
  }

  routed.sort((a, b) => (b.score * b.confidence - a.score * a.confidence) || (b.rr - a.rr))
  return routed
}
