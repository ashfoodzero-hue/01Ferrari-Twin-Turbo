// ════════════════════════════════════════════════════════════════════════════════
// execution.js — P4.5 realistic COST & FILL model (so every WR is cost-true, R3/R6).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P4.5 (2026-06-25).
//
// The 98%-WR small-TP config died to cost (§cost_stress). Before we can claim ANY WR toward 97%,
// the cost model must be REAL — not a flat guess. This module makes cost honest and look-ahead-free:
//
//  · SPREAD by session — XAU spot half-spread is tight in London/NY-overlap, wider in Asian/rollover.
//  · STOP-EXIT SLIPPAGE — market stops slip in fast moves; slippage scales with volatility (ATR),
//    capped. LIMIT/target exits are maker fills → no slippage (you set the price).
//  · ENTRY as a LIMIT (maker) — the Swing-Catcher pre-places a limit at the wick tip (R4), so the
//    entry pays ~0 spread (you provide liquidity). We do NOT assume a rebate (conservative): entry
//    cost = 0, exit cost = spread (+ slippage if stopped). This is the honest cost of a maker-in /
//    taker-or-maker-out trade. All assumptions are CONFIGURABLE so they can be tightened per broker.
//
// Look-ahead-free: every input (session hour, ATR at entry) is known at decision time. `exitType`
// is only used at SCORING time to decide whether stop-slippage applies — that is scoring, not deciding.
// ════════════════════════════════════════════════════════════════════════════════

/** Default, deliberately CONSERVATIVE XAU-spot cost assumptions (USD per oz). Tighten per broker. */
export const COST_MODEL = Object.freeze({
  // half-spread by session (USD); round-trip taker would be ~2× — but we enter maker (0) + exit (spread)
  spreadLondon: 0.15,      // 07–12 UTC London
  spreadOverlap: 0.13,     // 12–16 UTC London/NY overlap — tightest
  spreadNy: 0.18,          // 16–21 UTC NY
  spreadAsian: 0.30,       // 21–07 UTC Asian / illiquid
  spreadRollover: 0.45,    // 21–22 UTC daily rollover spike
  slipStopAtrFrac: 0.05,   // stop-exit slippage = this × ATR …
  slipStopCap: 0.30,       // … capped here (USD)
  entryMaker: true,        // limit entry pays ~0 spread (maker). false → add a spread on entry too.
})

/** UTC hour → session spread (USD half-spread). Look-ahead-free (hour is known at entry). */
export function sessionSpread(hourUtc, m = COST_MODEL) {
  const h = ((hourUtc % 24) + 24) % 24
  if (h >= 21 && h < 22) return m.spreadRollover
  if (h >= 21 || h < 7) return m.spreadAsian
  if (h >= 7 && h < 12) return m.spreadLondon
  if (h >= 12 && h < 16) return m.spreadOverlap
  return m.spreadNy                                  // 16–21
}

/**
 * Round-trip cost (USD) for one trade.
 * @param {object} p
 * @param {number} p.entryHourUtc  UTC hour of the entry bar (session → spread)
 * @param {number} p.atr           ATR at entry (USD) — scales stop slippage
 * @param {'target'|'stop'|'scratch'|'time'} p.exitType  how the trade closed
 * @param {object} [m]             cost model overrides
 * @returns {number} total round-trip cost in USD (always ≥ 0)
 */
export function roundTripCost({ entryHourUtc, atr = 0, exitType = 'stop' }, m = COST_MODEL) {
  const spread = sessionSpread(entryHourUtc, m)
  const entryCost = m.entryMaker ? 0 : spread          // maker entry → 0
  // exit: a STOP is a market order → spread + slippage; a TARGET/SCRATCH is a resting limit → spread only.
  // a TIME exit is a market order at the horizon → spread + slippage (treated like a stop, conservative).
  const slips = exitType === 'stop' || exitType === 'time'
  const slip = slips ? Math.min(m.slipStopCap, m.slipStopAtrFrac * (atr || 0)) : 0
  const exitCost = spread + slip
  return +(entryCost + exitCost).toFixed(4)
}

/** Convenience: net $ of a resolved trade given its gross move and exit type (cost subtracted). */
export function netDollars({ grossMove, entryHourUtc, atr, exitType }, m = COST_MODEL) {
  return +(grossMove - roundTripCost({ entryHourUtc, atr, exitType }, m)).toFixed(4)
}

/**
 * BID/ASK mode (Ferrari Twin Turbo 2026-10-08). When the resolver ran with spreadAt (bars are BID; ask-side orders compared
 * with bid + the MEASURED spread), the spread is already inside grossMove — charging the session half-spread again would
 * double-count it. What remains is stop/time-exit SLIPPAGE (a market order in a fast move), same rule as roundTripCost.
 */
export function roundTripCostBidAsk({ atr = 0, exitType = 'stop' }, m = COST_MODEL) {
  const slips = exitType === 'stop' || exitType === 'time'
  return +(slips ? Math.min(m.slipStopCap, m.slipStopAtrFrac * (atr || 0)) : 0).toFixed(4)
}
export function netDollarsBidAsk({ grossMove, atr, exitType }, m = COST_MODEL) {
  return +(grossMove - roundTripCostBidAsk({ atr, exitType }, m)).toFixed(4)
}
