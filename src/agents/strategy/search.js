// ════════════════════════════════════════════════════════════════════════════════
// search.js — autonomous AUTO-SOLVE-TO-97% engine (R5). Honest, look-ahead-free.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 (2026-06-24).
//
// Strongest-method search for a config that genuinely reaches ≥97% FILLABLE Wilson-LB with
// POSITIVE expectancy. Efficient by construction: GENERATE candidate signals once (the costly
// World-Model walk), PRE-RESOLVE each across TP/SL structures once, then SWEEP selection
// configs cheaply. Every number is real fillable, causal, measured — never faked (R3/R5).
// ════════════════════════════════════════════════════════════════════════════════

import { WorldModel } from '../../core/worldModel.js'
import { resolveLimitSignal } from '../../core/outcomeResolver.js'
import { wilsonLowerBound } from '../../core/stats.js'
import { evaluateArmed, DEFAULT_CFG } from './setupLibrary.js'
import { momentumArrays, readMomentum } from '../microstructure/momentum.js'

const r1 = (x) => Math.round(x * 10) / 10

/**
 * Walk the World-Model once and emit candidate signals with selection FEATURES.
 * Dedups a (setup,dir,entry) plan within `cooldown` bars so the same level isn't re-counted.
 */
/**
 * ⛔ THIS SCAN CANNOT BE SHORTENED. Both obvious optimizations are dead, and the second is dead by PROOF.
 *
 * The cost is real and was profiled (2026-07-17, wiring SWING_TRADE into the live roster made one call take 235s
 * against a 90s engine budget): `ingest(26,078 bars)` is only **333ms**, but ONE `wm.query()` is **19ms** and the
 * loop below runs it on EVERY bar ⇒ 19ms × 25,878 = **492s**. The history is nearly free. Recomputing 26,000 bars
 * of candidates to use the last 6 is the entire cost, and it looks eminently avoidable. It is not.
 *
 * 1) SLICE THE INPUT BARS — MEASURED AND REFUTED (measure_swing_slice_equivalence.mjs). No slice reproduces the
 *    full answer, not even 4,000 bars; the WorldModel's zones reach back arbitrarily far. It does not crash — it
 *    silently emits a DIFFERENT trade.
 *
 * 2) BOUND THE SCAN with a `fromIdx` (keep the full ingest, skip early iterations) — REFUTED BY CONSTRUCTION, and
 *    this one is subtle enough that it shipped for an hour before the equivalence test caught it. The `lastSeen`
 *    cooldown below suppresses a repeat key within `cooldown` bars, and A SUPPRESSED BAR DOES NOT UPDATE lastSeen.
 *    So the full scan's lastSeen can be OLDER than a bounded scan's — and an older lastSeen EMITS where a newer
 *    one suppresses. With cooldown 8 and a key at bars 6518/6524/6530:
 *      full    (start 0)    → 6518 emit (lastSeen=6518) · 6524 gap 6 <8 SUPPRESS (lastSeen STAYS 6518) · 6530 gap 12 → EMIT
 *      bounded (start 6519) →                              6524 emit (lastSeen=6524) · 6530 gap 6 <8 → SUPPRESS
 *    Bar 6530: the full scan takes the trade, the bounded scan does not. Worse, for a key recurring on every bar
 *    the emit LATTICE PHASE is fixed by the first occurrence the scan sees — shift the start by ONE bar and every
 *    later emit shifts. The phase depends on all prior history ⇒ the required lookback is UNBOUNDED. There is no
 *    correct `fromIdx`, so the parameter is gone rather than left lying around with a warning on it.
 *
 * ⚠ THE META-LESSON, worth more than the optimization: a PASSING equivalence sample would not have made (2) safe.
 * The failure depends on how densely keys recur at whichever bars you sample. Sampling could only ever FIND the
 * bug, never prove its absence — the counter-example is what settles it. When a shortcut's correctness depends on
 * data-dependent state, test-and-hope is not a validation strategy.
 *
 * The cost is paid honestly instead: the roster runs on its own cadence with its own budget, the same pattern
 * liveEngine.mjs already uses for the 105s signal engine. Slow and correct beats fast and silently different.
 */
export function generateCandidates(bars, { cfg = DEFAULT_CFG, warmup = 200, cooldown = 8, includeLastBar = false } = {}) {
  const wm = new WorldModel('XAUUSD', '15m').ingest(bars)
  const arrs = momentumArrays(bars)
  const swings = wm.swings
  const candidates = []
  const lastSeen = new Map()

  // ⏱ includeLastBar (2026-08-19) — OPT-IN, default OFF so every validator and the 421k cached-candidate file
  // stay BYTE-IDENTICAL (R6 no-drift). The bound below stops one bar short of the input, which is a SAFETY MARGIN
  // for callers that might pass a still-forming bar. MEASURED that it is only that: with a violent perturbation of
  // bar i+1, the candidates at bar i are FULL-OBJECT IDENTICAL in 25 of 25 non-vacuous probes — a candidate is
  // fully determined by bars ≤ i. The cost of the margin is paid LIVE: the roster only surfaces a candidate after
  // the NEXT bar closes, so the live book loses the first fill bar the backtest legitimately uses. Measured on
  // IMPULSE_CONT (confirm_bar_lookahead.json): losing that bar takes it from 73.59% WR / +$0.353 / SHIP to
  // 62.14% / +$0.096 with a CI lower bound BELOW ZERO / SHADOW. Live callers that pass only CLOSED bars therefore
  // set includeLastBar:true — recovering the validated entry rather than trading a slower, worse book.
  for (let i = warmup; i < bars.length - (includeLastBar ? 0 : 1); i++) {
    const atrv = wm.atr[i]
    if (!atrv || atrv <= 0) continue
    const at = bars[i].t
    const q = wm.query(at, { activeOnly: true })
    if ((q.counts.orderBlocks + q.counts.fvgs + q.counts.liquidity) === 0 || q.ref_price == null) continue
    const armed = evaluateArmed({ at, idx: i, price: q.ref_price, atr: atrv, bars, q }, cfg)
    if (!armed.length) continue
    const mom = readMomentum(bars, i, arrs, swings)
    const eq = q.volume_profile && q.volume_profile.lo != null ? (q.volume_profile.lo + q.volume_profile.hi) / 2 : null

    for (const a of armed) {
      const key = `${a.setup}|${a.direction}|${r1(a.plan.entry)}`
      if (lastSeen.has(key) && i - lastSeen.get(key) < cooldown) continue
      lastSeen.set(key, i)
      const aligned = armed.filter((x) => x.direction === a.direction).length
      candidates.push({
        i, t: at, setup: a.setup, direction: a.direction, entry: a.plan.entry, atr: atrv,
        score: a.score, confidence: a.confidence, lead_atr: a.lead.atr,
        in_discount: eq == null ? null : (a.direction === 'UP' ? a.plan.entry <= eq : a.plan.entry >= eq),
        aligned, mom_dir: mom.direction, mom_score: mom.score, outcomes: {},
      })
    }
  }
  return { candidates, wm, spanDays: bars.length ? (bars.at(-1).t - bars[0].t) / 86_400_000 : 0 }
}

/** Pre-resolve every candidate across all (tpAtr, slAtr) pairs once. `cost` (price units, e.g.
 *  round-trip spread) makes the take-profit harder → a realistic-cost WR. */
export function preResolve(candidates, bars, idxByT, pairs, { fillWindow = 8, horizon = 32, cost = 0 } = {}) {
  for (const c of candidates) {
    for (const [tpAtr, slAtr] of pairs) {
      const up = c.direction === 'UP'
      const sl = up ? c.entry - slAtr * c.atr : c.entry + slAtr * c.atr
      const tp = up ? c.entry + tpAtr * c.atr : c.entry - tpAtr * c.atr
      const res = resolveLimitSignal({ direction: c.direction, plan: { entry: c.entry, sl, tp }, ts_utc: new Date(c.t).toISOString() }, bars, idxByT, { fillWindow, horizon, cost })
      c.outcomes[`${tpAtr}|${slAtr}`] = { outcome: res.outcome, fill_bars: res.fill_bars, resolve_bars: res.resolve_bars }
    }
  }
}

/** Build a selection predicate from a config. */
function predicate(sel) {
  const subset = sel.subset
  return (c) => {
    if (subset && subset !== 'all') {
      if (subset === 'sweep+fvg') { if (c.setup !== 'sweep_reclaim' && c.setup !== 'fvg_continuation') return false }
      else if (c.setup !== subset) return false
    }
    if (sel.scoreThr && c.score < sel.scoreThr) return false
    if (sel.confThr && c.confidence < sel.confThr) return false
    if (sel.minAligned && c.aligned < sel.minAligned) return false
    if (sel.requireDiscount && c.in_discount !== true) return false
    if (sel.maxLead && c.lead_atr > sel.maxLead) return false
    if (sel.momentum === 'agree' && c.mom_dir !== c.direction) return false
    if (sel.momentum === 'not_opposed') { const opp = c.direction === 'UP' ? 'DOWN' : 'UP'; if (c.mom_dir === opp) return false }
    return true
  }
}

/**
 * Evaluate one selection config + (tpAtr,slAtr) pair with sequential one-position-at-a-time
 * gating (no overlap). Returns WR, Wilson LB, expectancy (avg R), net R, frequency.
 */
export function evaluateConfig(candidates, sel, tpAtr, slAtr, spanDays, z = 1.96, cost = 0) {
  const pred = predicate(sel)
  const key = `${tpAtr}|${slAtr}`
  let win = 0, loss = 0, neutral = 0, nofill = 0, fired = 0, nextFree = -1, net$ = 0
  for (const c of candidates) {
    if (!pred(c)) continue
    fired++
    if (c.i < nextFree) continue                       // an open trade occupies the account
    const o = c.outcomes[key]
    if (!o || o.outcome === 'NOTRADE') continue
    if (o.outcome === 'NOFILL') { nofill++; continue }  // limit not reached → no trade, no block
    nextFree = c.i + (o.fill_bars || 0) + (o.resolve_bars || 0) + 1
    if (o.outcome === 'WIN') { win++; net$ += tpAtr * c.atr - cost }       // $ net of round-trip cost
    else if (o.outcome === 'LOSS') { loss++; net$ += -slAtr * c.atr - cost }
    else neutral++
  }
  const decided = win + loss
  const wr = decided ? win / decided : 0
  const avg_R = decided ? (win * tpAtr - loss * slAtr) / decided : 0   // expectancy in R (ATR units), pre-cost
  return {
    sel: { ...sel, tpAtr, slAtr }, decided, win, loss, neutral, nofill,
    wr: +wr.toFixed(4), wilson_lb: +wilsonLowerBound(win, decided, z).toFixed(4),
    avg_R: +avg_R.toFixed(3), net_R: +(win * tpAtr - loss * slAtr).toFixed(1),
    avg_dollars: decided ? +(net$ / decided).toFixed(3) : 0, net_dollars: +net$.toFixed(0),
    trades_per_day: spanDays > 0 ? +(decided / spanDays).toFixed(3) : 0,
  }
}

/** Full sweep over a grid; returns all evaluated configs. */
export function sweep(candidates, grid, spanDays) {
  const out = []
  for (const subset of grid.subsets)
    for (const scoreThr of grid.scoreThrs)
      for (const minAligned of grid.minAligneds)
        for (const requireDiscount of grid.discounts)
          for (const momentum of grid.momenta)
            for (const [tpAtr, slAtr] of grid.pairs) {
              const sel = { subset, scoreThr, minAligned, requireDiscount, momentum, maxLead: grid.maxLead }
              out.push(evaluateConfig(candidates, sel, tpAtr, slAtr, spanDays))
            }
  return out
}
