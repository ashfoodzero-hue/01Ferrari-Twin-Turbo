// ════════════════════════════════════════════════════════════════════════════════
// twinRoster.js — Ferrari Twin Turbo: the live emitter for the ONE validated book (IMPULSE_CONT).
// ────────────────────────────────────────────────────────────────────────────────
// Carried from Turbo2's src/master/liveSignalRoster.js emitSignalTiers() with everything that is not the validated
// IMPULSE_CONT path REMOVED: the reversal-v2 SCALP/SWING tiers (measured −$/t), DIAMOND (refuted, look-ahead), SWEEP
// (refuted), the nine shadow books (fail C2/C3/C4), the trade-wave panel (tracks a suppressed engine), the control
// consensus (measured non-predictive), the trend-agreement / HTF-sweep / off-hours stamps (record-only, unpowered)
// and the news pre-arm line (measured NO LIFT). What remains is EXACTLY the selection the validator measured:
//
//     fresh RAW A+ stream (findProSetups rawOut) → setup ∈ ISET → |close[i] − close[i−8]| ≥ 4·ATR, direction-matched
//     → maker limit at the setup entry · stop 1.5·ATR · target 0.5R · BE +0.05R / lock +0.10R
//
// scripts/smoke_twin_parity.mjs proves this emitter and Turbo2's agree fire-for-fire on the same bars.
//
// THE MARKET-STATE GATE. Turbo2 wraps every tier in gate(): a signal whose side disagrees with readMarketState() is
// emitted with blocked:true and the paper recorder files it as REFUSED. That gate was measured on the reversal-v2
// entry (project_state_gate_measured: keeps money there because every arm loses) — it was NEVER part of the
// IMPULSE_CONT validator (validate_impulse_cont_ship.mjs applies no state read), and in Turbo2's live journal it has
// refused 20 of 42 IMPULSE_CONT rows. The twin therefore carries the state read on every fire as `stateRead` and
// decides blocking by STATE_GATE_MODE, which is set from a MEASUREMENT (scripts/study_state_gate_on_impulse.mjs →
// data/master/state_gate_on_impulse.json), never from the anecdote. 'block' = Turbo2's live behaviour; 'stamp' =
// the validated book as measured, state recorded for the journal to score.
// MEASURED 2026-10-08 (validator loop, 1m-sequenced, per-arm one-at-a-time, state read at the signal bar): the gate
// vetoes 39% of fires (1,001 of 2,587; equilibrium 44% / wrong-side 56%); the VETOED arm is break-even and UNPOWERED
// (all $0.08/t [−0.09, +0.24] · OOS $0.11/t [−0.38, +0.50]); the ALLOWED arm pays $0.34/t [0.25, 0.44] all-era, OOS
// $0.44/t [0.26, 0.62], 20/24 years. Pre-registered rule → the gate neither costs nor proves money ⇒ keep 'block'
// (Turbo2's live behaviour) and let the journal's REFUSED rows (priced via wouldBe) keep scoring it.
// ════════════════════════════════════════════════════════════════════════════════
import { findProSetups } from './proSignal.js'
import { readMarketState, stateAllows } from './marketState.js'
import { signalLife } from './signalLife.js'
import { TIER_STATS, shippingLabel } from './tierStats.js'

export { TIER_STATS, shippingLabel }

/** The setup families the validator admitted (pre-registered; impulse_continuation_gate.json). */
export const ISET = Object.freeze(['sweep_reclaim', 'fvg_continuation', 'ob_discount_tap', 'trend_pullback'])
/** The impulse predicate: |8-bar close move| ≥ 4 × ATR14, in the candidate's direction. */
export const IMPULSE = Object.freeze({ lookBars: 8, minAtrMult: 4 })
/** 'block' = refuse a state-disagreeing fire (Turbo2 live) · 'stamp' = fire as validated, state recorded only. */
export const STATE_GATE_MODE = 'block'

/** True when candidate c (from the raw fresh stream) passes the impulse predicate on bars15. ONE copy of the rule. */
export function isImpulseCandidate(bars15, c) {
  if (!c || !ISET.includes(c.setup) || !(c.atr > 0) || c.i == null || c.i < IMPULSE.lookBars + 1) return false
  const move = bars15[c.i].c - bars15[c.i - IMPULSE.lookBars].c
  if (Math.abs(move) < IMPULSE.minAtrMult * c.atr) return false
  return (move > 0) === (c.direction === 'UP')
}

/** The newest impulse candidate in the raw fresh stream (the roster takes the freshest, exactly as Turbo2 does). */
export function impulseCandidate(bars15, frontierRaw) {
  return [...frontierRaw].reverse().find((c) => isImpulseCandidate(bars15, c)) || null
}

/** Build the IMPULSE_CONT signal from a candidate — same fields, same rounding, same geometry as Turbo2. */
export function buildImpulseSignal(cand) {
  const P = TIER_STATS.IMPULSE_CONT
  const up = cand.direction === 'UP', risk = P.slAtr * cand.atr
  return { ...P, tier: 'IMPULSE_CONT', side: up ? 'BUY' : 'SELL', direction: cand.direction, t: cand.t, i: cand.i,
    entry: +cand.entry.toFixed(2),
    stop: +(up ? cand.entry - risk : cand.entry + risk).toFixed(2),
    target: +(up ? cand.entry + P.tgtR * risk : cand.entry - P.tgtR * risk).toFixed(2),
    riskUsd: +risk.toFixed(2), targetUsd: +(P.tgtR * risk).toFixed(2), atr: +cand.atr.toFixed(2),
    setup: cand.setup, beTriggerR: P.beTriggerR, beLockR: P.beLockR, outcomes: P.outcomes,
    reasons: [`${cand.setup} after a fresh 2h impulse ≥4×ATR (continuation, direction-matched)`, 'ALL-HOURS book (impulse = the liquidity event, measured)', `stop ${P.slAtr}·ATR = $${risk.toFixed(2)}`, `target ${P.tgtR}R = $${(P.tgtR * risk).toFixed(2)}`, 'PAPER-ONLY — never sent to an EA'] }
}

/**
 * The twin roster on CLOSED 15m bars (the provider never returns the forming bar).
 * @param {Bar[]} bars15 ascending closed 15m bars (≥ 60; the roster window is 400 days in the tick)
 * @param {{freshBars?:number, now?:number, stateGate?:'block'|'stamp'}} opts
 *   freshBars — the same 4-bar fresh window Turbo2's emitter uses · now — injectable clock for signalLife (replays)
 */
export function emitTwinRoster(bars15, { freshBars = 4, now = Date.now(), stateGate = STATE_GATE_MODE } = {}) {
  const out = { at: bars15?.at(-1)?.t ?? null, impulseCont: null, marketState: null, frontierRaw: [], book: shippingLabel(), summary: 'no live signal' }
  if (!Array.isArray(bars15) || bars15.length < 60) return out
  out.marketState = readMarketState(bars15)
  const frontierRaw = []
  findProSetups(bars15, bars15.at(-1).t, { freshBars, rawOut: frontierRaw })   // one scan; the raw stream is the input
  out.frontierRaw = frontierRaw
  const cand = impulseCandidate(bars15, frontierRaw)
  if (!cand) { if (out.marketState && !out.marketState.canTrade) out.summary = out.marketState.message; return out }
  const sig = buildImpulseSignal(cand)
  const g = stateAllows(sig, out.marketState)
  sig.stateRead = { state: out.marketState?.state ?? null, canTrade: out.marketState?.canTrade ?? null, allowedSide: out.marketState?.allowedSide ?? null,
    agrees: !!g.allow, why: g.allow ? null : g.why, mode: stateGate }
  sig.blocked = stateGate === 'block' ? !g.allow : false
  sig.blockedWhy = sig.blocked ? g.why : null
  const spot = bars15.at(-1).c
  Object.assign(sig, signalLife({ side: sig.side, tf: '15m', t: sig.t, target: sig.target }, { now, spot }))
  out.impulseCont = sig
  out.summary = sig.blocked ? `IMPULSE_CONT ${sig.side} refused — ${sig.blockedWhy}` : `IMPULSE_CONT ${sig.side} @ ${sig.entry} · stop ${sig.stop} · target ${sig.target}${sig.stateRead.agrees ? '' : ' · state disagrees (stamped)'}`
  return out
}
