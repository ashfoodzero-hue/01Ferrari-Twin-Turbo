// ════════════════════════════════════════════════════════════════════════════════
// marketRegime.js — price-microstructure REGIME classifier + vol-z + breakout/sweep + session.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Agent 7 · Microstructure/Regime (2026-06-25).
//
// Classifies the CURRENT regime so the Master + handlers know which playbook applies (the
// Always-Ready/opportunistic standing order): TREND_UP/DOWN · WATERFALL (sharp sustained drop —
// admit SELLs) · MELT_UP (sharp sustained rise) · RANGE · VOLATILE_CHOP. Plus a volatility regime
// (CONTRACTION/NORMAL/EXPANSION via ATR z-score), range breakout vs liquidity sweep, and the
// trading session / killzone. All CAUSAL (each value at i uses only bars ≤ i). Deterministic +
// unit-testable; thresholds are ATR-normalized so they travel across price levels.
// ════════════════════════════════════════════════════════════════════════════════

import { atr, ema } from '../../core/indicators.js'

export const REGIME_DEFAULTS = Object.freeze({
  emaFast: 20, emaSlow: 50, atrPeriod: 14,
  dispLook: 20,        // bars for the displacement (move) measure
  slopeLook: 8,        // bars for the EMA slope
  volWindow: 60,       // window for the ATR z-score
  rangeLook: 20,       // bars for the range-compression measure
  wfMoveAtr: 3.0,      // |displacement| ≥ this many ATR ⇒ waterfall/melt candidate
  trendSlope: 0.0005,  // |normalized EMA slope| ≥ this ⇒ trending (calibrated for 15m)
  flatSlope: 0.0002,   // |slope| ≤ this ⇒ flat (range)
  rangeRatio: 2.2,     // (N-bar range)/ATR ≤ this ⇒ compressed (range)
  volExpZ: 1.0, volConZ: -0.5,
})

function normalizedSlope(arr, i, look) {
  if (i + 1 < look) return null
  let sx = 0, sy = 0, sxy = 0, sx2 = 0
  for (let k = 0; k < look; k++) { const y = arr[i - look + 1 + k]; if (y == null) return null; sx += k; sy += y; sxy += k * y; sx2 += k * k }
  const n = look, slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx), meanY = sy / n
  return meanY > 0 ? slope / meanY : null
}

/** Volatility z-score of ATR[i] vs the prior `volWindow` ATRs. */
export function volZScore(atrArr, i, win) {
  const start = i - win
  if (start < 1 || atrArr[i] == null) return null
  const xs = []
  for (let j = start; j < i; j++) if (atrArr[j] != null) xs.push(atrArr[j])
  if (xs.length < Math.max(10, win / 2)) return null
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length) || 1e-9
  return (atrArr[i] - mu) / sd
}

/** Canonical regime → directional score (used by both the instantaneous + stabilized reads). */
export const REGIME_SCORE = Object.freeze({ WATERFALL: 10, MELT_UP: 90, TREND_UP: 72, TREND_DOWN: 28, RANGE: 50, VOLATILE_CHOP: 50 })

/**
 * Classify the regime AT BAR i (causal — uses only bars ≤ i via the causal arrays A/ef/es).
 * Shared core so the instantaneous read and the hysteresis walk classify IDENTICALLY (one source).
 * Returns null if i is too early to classify (near the window start).
 */
function classifyAtIndex(bars, i, A, ef, es, c) {
  if (i - c.dispLook < 0 || i - c.rangeLook < 0) return null
  const a = A[i]
  if (!a || a <= 0 || ef[i] == null || es[i] == null) return null

  const close = bars[i].c
  const dispAtr = (close - bars[i - c.dispLook].c) / a            // signed displacement in ATR
  const slope = normalizedSlope(ef, i, c.slopeLook)
  const vz = volZScore(A, i, c.volWindow)
  // N-bar range / ATR
  let hi = -Infinity, lo = Infinity
  for (let j = i - c.rangeLook + 1; j <= i; j++) { hi = Math.max(hi, bars[j].h); lo = Math.min(lo, bars[j].l) }
  const rangeRatio = (hi - lo) / a

  // prior range (exclude current bar) for breakout/sweep
  let phi = -Infinity, plo = Infinity
  for (let j = i - c.rangeLook; j <= i - 1; j++) { phi = Math.max(phi, bars[j].h); plo = Math.min(plo, bars[j].l) }
  const b = bars[i]
  const brokeUp = b.c > phi, brokeDn = b.c < plo
  const sweptUp = b.h > phi && b.c < phi, sweptDn = b.l < plo && b.c > plo   // wick beyond, close back inside
  const breakout = brokeUp ? 'UP' : brokeDn ? 'DOWN' : null
  const sweep = sweptUp ? 'UP' : sweptDn ? 'DOWN' : null

  const volRegime = vz == null ? 'UNKNOWN' : vz >= c.volExpZ ? 'EXPANSION' : vz <= c.volConZ ? 'CONTRACTION' : 'NORMAL'

  // ── regime priority ──
  let regime
  const expanding = vz != null && vz >= 0.5
  if (dispAtr <= -c.wfMoveAtr && (slope == null || slope < 0) && expanding) regime = 'WATERFALL'
  else if (dispAtr >= c.wfMoveAtr && (slope == null || slope > 0) && expanding) regime = 'MELT_UP'
  else if (slope != null && slope >= c.trendSlope && close > es[i]) regime = 'TREND_UP'
  else if (slope != null && slope <= -c.trendSlope && close < es[i]) regime = 'TREND_DOWN'
  else if (slope != null && Math.abs(slope) <= c.flatSlope && rangeRatio <= c.rangeRatio && Math.abs(dispAtr) < 1.5) regime = 'RANGE'
  else regime = 'VOLATILE_CHOP'

  return {
    regime, score: REGIME_SCORE[regime], volRegime, volZ: vz == null ? null : +vz.toFixed(2),
    dispAtr: +dispAtr.toFixed(2), emaSlope: slope == null ? null : +slope.toFixed(5), rangeRatio: +rangeRatio.toFixed(2),
    breakout, sweep, atr: +a.toFixed(3),
    ...sessionOf(b.t),
  }
}

/**
 * Classify the regime at the LAST bar of `bars` (causal). Pass bars ≤ at.
 * @returns {object|null} { regime, volRegime, volZ, dispAtr, emaSlope, rangeRatio, breakout, sweep, session, killzone, score }
 */
export function classifyRegime(bars, cfg = {}) {
  const c = { ...REGIME_DEFAULTS, ...cfg }
  const n = bars.length
  if (n < Math.max(c.emaSlow, c.volWindow) + c.dispLook + 2) return null
  const A = atr(bars, c.atrPeriod)
  const ef = ema(bars, c.emaFast), es = ema(bars, c.emaSlow)
  return classifyAtIndex(bars, n - 1, A, ef, es, c)
}

export const STABLE_DEFAULTS = Object.freeze({
  confirmBars: 3,                              // a NEW slow regime must persist this many bars before we switch
  lookbackBars: 80,                            // trailing bars the hysteresis walk evaluates
  fastRegimes: ['WATERFALL', 'MELT_UP'],       // climactic regimes admitted IMMEDIATELY (Always-Ready opportunistic order)
})

/**
 * Hysteresis-STABILIZED regime at the LAST bar of `bars` (causal). Stops the instantaneous
 * classifier whipsawing: a NEW slow regime is only adopted after it persists `confirmBars`
 * consecutive bars; a one-bar blip is ignored and the prior confirmed regime is HELD. Climactic
 * `fastRegimes` (WATERFALL / MELT_UP) bypass the delay and switch instantly — we must never be late
 * to a waterfall (the standing opportunistic-regime order). Causal: every per-bar classification
 * uses only bars ≤ that bar, and the walk reads no future bar.
 * @returns {object|null} classifyRegime fields PLUS { raw_regime, stabilized, bars_in_regime, pending, pending_streak, switches, confirmBars }
 */
export function classifyRegimeStable(bars, cfg = {}) {
  const c = { ...REGIME_DEFAULTS, ...STABLE_DEFAULTS, ...cfg }
  const n = bars.length
  const minBars = Math.max(c.emaSlow, c.volWindow) + c.dispLook + 2
  if (n < minBars) return null
  const A = atr(bars, c.atrPeriod)
  const ef = ema(bars, c.emaFast), es = ema(bars, c.emaSlow)
  const startI = Math.max(minBars - 1, n - c.lookbackBars)
  const fast = new Set(c.fastRegimes)

  let state = null, candidate = null, streak = 0, switches = 0, barsInRegime = 0, lastRaw = null
  for (let i = startI; i < n; i++) {
    const r = classifyAtIndex(bars, i, A, ef, es, c)
    if (!r) continue
    lastRaw = r
    const raw = r.regime
    if (state == null) { state = raw; barsInRegime = 1; continue }     // bootstrap
    if (raw === state) { candidate = null; streak = 0; barsInRegime++; continue }
    if (fast.has(raw)) { state = raw; candidate = null; streak = 0; switches++; barsInRegime = 1; continue }   // instant
    if (raw === candidate) streak++; else { candidate = raw; streak = 1 }
    if (streak >= c.confirmBars) { state = raw; candidate = null; streak = 0; switches++; barsInRegime = 1 }   // confirmed
    else barsInRegime++                                                // still in the prior confirmed regime
  }
  if (state == null || !lastRaw) return null

  return {
    ...lastRaw,
    regime: state,                                   // the stabilized (confirmed) regime
    score: REGIME_SCORE[state] ?? lastRaw.score,     // score follows the confirmed regime
    raw_regime: lastRaw.regime,                      // the instantaneous regime at the last bar
    stabilized: state !== lastRaw.regime,            // true when hysteresis is currently HOLDING against a blip
    bars_in_regime: barsInRegime,
    pending: candidate,                              // a new regime building toward confirmation (or null)
    pending_streak: streak,
    switches,                                        // regime switches across the evaluated window (stability metric)
    confirmBars: c.confirmBars,
  }
}

/**
 * Per-bar RAW + STABLE regime series in ONE causal O(n) pass (arrays computed once). Shares the
 * exact hysteresis rule as classifyRegimeStable. For measurement/analysis over a whole window
 * (whipsaw counting, regime timelines) — not the per-call live read.
 * @returns {{ raw:(string|null)[], stable:(string|null)[] }}
 */
export function classifyRegimeSeries(bars, cfg = {}) {
  const c = { ...REGIME_DEFAULTS, ...STABLE_DEFAULTS, ...cfg }
  const n = bars.length
  const A = atr(bars, c.atrPeriod), ef = ema(bars, c.emaFast), es = ema(bars, c.emaSlow)
  const fast = new Set(c.fastRegimes)
  const raw = new Array(n).fill(null), stable = new Array(n).fill(null)
  let state = null, candidate = null, streak = 0
  for (let i = 0; i < n; i++) {
    const r = classifyAtIndex(bars, i, A, ef, es, c)
    if (!r) { stable[i] = state; continue }
    raw[i] = r.regime
    const rr = r.regime
    if (state == null) state = rr
    else if (rr === state) { candidate = null; streak = 0 }
    else if (fast.has(rr)) { state = rr; candidate = null; streak = 0 }
    else { if (rr === candidate) streak++; else { candidate = rr; streak = 1 } ; if (streak >= c.confirmBars) { state = rr; candidate = null; streak = 0 } }
    stable[i] = state
  }
  return { raw, stable }
}

/** UTC session + killzone for a timestamp (gold/FX sessions). Pure time function. */
export function sessionOf(tMs) {
  const h = new Date(tMs).getUTCHours()
  let session
  if (h >= 0 && h < 7) session = 'ASIAN'
  else if (h >= 7 && h < 12) session = 'LONDON'
  else if (h >= 12 && h < 16) session = 'NY_OVERLAP'   // London+NY overlap — the prime window
  else if (h >= 16 && h < 21) session = 'NY'
  else session = 'LATE_NY'
  const londonKz = h >= 7 && h < 10
  const nyKz = h >= 12 && h < 15
  return { session, killzone: londonKz ? 'LONDON_KZ' : nyKz ? 'NY_KZ' : null, utc_hour: h }
}
