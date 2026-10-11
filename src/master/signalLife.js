// ════════════════════════════════════════════════════════════════════════════════
// signalLife.js — IS THIS SETUP STILL TAKEABLE? One definition, every producer.
// ────────────────────────────────────────────────────────────────────────────────
// ORIGIN — Ashraf, 2026-08-26/27, twice: "why this buy wait expectation is there for more than 3 hrs now, is this
// the real prediction or is it stale now?" and again the next morning on a card whose target price had already
// been passed. Both times the answer was the same: the setup was dead and the screen said nothing.
//
// WHY THIS FILE EXISTS RATHER THAN A COPIED IF-STATEMENT. The first fix stamped the death rules onto the LIVE
// TIER path only. The card Ashraf was actually looking at is built somewhere else — readPaperBooks() renders the
// journal's PENDING rows — so it kept rendering a green, takeable BUY whose TP1 sat $25 BELOW spot. Two producers,
// one concept, and only one of them knew the rule. Copying the arithmetic into the second would have created the
// exact failure this codebase already has a name for: a term that means two things is a bug. So the rule lives
// here once, and both producers import it.
//
// TWO RULES WITH TWO DIFFERENT CONSEQUENCES. Collapsing them into one flag was my own first mistake here, and
// it pointed the wrong way — see rule 2.
//
//   1. EXPIRED -> dead. Older than the validated fill window OF ITS OWN TIMEFRAME. Not a display preference:
//      every book is measured with fillWindow=8, so a limit still unfilled past 8 bars was a NOFILL in the
//      backtest and was never counted as a trade. This is the ONLY rule that voids the order.
//      Note the wall-clock spread — 15m -> 2h, 1h -> 8h, 4h -> 32h, 1d -> 192h. An HTF card legitimately
//      lives for a day, which is why the desk must judge it on LIVENESS and not merely on being the newest.
//
//   2. TARGET PASSED -> noChase, NOT dead. Spot is already beyond the target, so entering at MARKET would open
//      beyond the exit. But these cards are RESTING MAKER LIMITS: if price returns to the entry, the trade is
//      still coherent and the validators still count it. Marking it dead would cancel an order the measured
//      book considers live.
//
// Both were real: the 6.1h H1_STRUCT card was INSIDE its 8-bar window (rule 1 said alive) while spot sat $22
// past its TP1 (rule 2 said do-not-chase). Age and reachability are different questions with different answers.
// ════════════════════════════════════════════════════════════════════════════════

/** Timeframe → ms. A signal's age is judged in ITS OWN bars: 6 hours is one bar of slack on a 4h book and six
 *  expired windows on a 15m one. */
export const TF_MS = Object.freeze({
  '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
  '1h': 3600000, '2h': 7200000, '4h': 14400000, '1d': 86400000,
})

/** The window every validator measures with. Changing this changes what the backtests meant. */
export const FILL_WINDOW_BARS = 8

/**
 * Judge whether a proposed entry is still takeable.
 * PURE — no clock, no I/O: `now` and `spot` are passed in so this is testable and so two callers reading the
 * same instant can never disagree about it.
 *
 * @param {{side:'BUY'|'SELL', tf:string, t:number, target:number|null}} sig
 * @param {{now:number, spot:number|null}} ctx
 * TWO OUTCOMES, deliberately NOT the same thing:
 *   dead    — the order is VOID. Only rule 1 (past the fill window) can set this.
 *   noChase — the order is still valid AT ITS LIMIT, but entering at market now is wrong. Only rule 2 sets this.
 * @returns {{barsSinceSignal:number|null, fillWindowBars:number, expired:boolean, targetPassed:boolean|null,
 *            spotAtRead:number|null, dead:boolean, deadWhy:string|null, noChase:boolean, noChaseWhy:string|null}}
 */
export function signalLife(sig, { now = Date.now(), spot = null } = {}) {
  const out = {
    barsSinceSignal: null, fillWindowBars: FILL_WINDOW_BARS, expired: false,
    targetPassed: null, spotAtRead: spot == null ? null : +spot.toFixed(2), dead: false, deadWhy: null,
    noChase: false, noChaseWhy: null,
  }
  if (!sig) return out

  // ── rule 1: past the validated fill window ──
  const tfMs = TF_MS[sig.tf]
  if (tfMs && Number.isFinite(sig.t)) {
    const bars = Math.floor((now - sig.t) / tfMs)
    out.barsSinceSignal = bars
    if (bars > FILL_WINDOW_BARS) {
      out.expired = true
      out.dead = true
      out.deadWhy = `${bars} bars since the signal (${sig.tf}) — past the validated ${FILL_WINDOW_BARS}-bar fill window, so this limit would have been a NOFILL, not a trade.`
    }
  }

  // ── rule 2: the move already happened without us ──
  // 🚨 THIS DOES NOT VOID THE ORDER, AND MY FIRST VERSION SAID IT DID (self-corrected 2026-08-27).
  // These cards are RESTING MAKER LIMITS, not market entries — the card's own instruction is "maker limit at
  // ENTRY ... skip if price never returns (no chase)". A BUY limit at $4558.91 with TP $4585.69 is still a
  // coherent trade if price comes back to $4558.91: the target is above the entry either way. Price having
  // touched the target in the meantime changes nothing about the resting order, and the validators agree —
  // an unfilled limit is a NOFILL in the backtest whatever price did while it waited.
  // What target-passed DOES prove is narrower and still worth shouting: entering at MARKET right now would
  // open beyond the exit. So it sets `noChase`, not `dead`. Marking it dead would have told Ashraf to cancel
  // an order the measured book still considers live — over-claiming in the safe-sounding direction is still
  // over-claiming, and it costs real trades.
  if (spot != null && Number.isFinite(sig.target) && sig.side) {
    const passed = sig.side === 'BUY' ? spot >= sig.target : spot <= sig.target
    out.targetPassed = passed
    if (passed) {
      out.noChase = true
      out.noChaseWhy = `spot $${spot.toFixed(2)} is already past the target $${sig.target} — do NOT enter at market, you would open beyond the exit. The resting limit at $${sig.entry ?? 'ENTRY'} is still valid if price returns.`
    }
  }
  return out
}
