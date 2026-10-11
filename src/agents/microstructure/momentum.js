// ════════════════════════════════════════════════════════════════════════════════
// momentum.js — Agent 7's deterministic momentum/indicator CONFIRMATION core.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Agent 7 momentum module (2026-06-24).
//
// RSI · MACD · Stochastic · ATR-regime · multi-indicator DIVERGENCE — all causal (value at
// bar i uses only bars ≤ i, R3). This is a CONFIRMATION read, NOT a trade signal: it emits a
// directional lean + strength the ensemble weights, and a `confirms()` test the Strategy
// agent's trades are filtered/weighted by. It only ships if it MEASURABLY lifts fillable WR
// (Method D) — §4.2 proved naive alignment filters can REMOVE winners, so we never assume.
// Divergence is the high-value, ANTICIPATORY read (forms before the turn → serves R4).
// ════════════════════════════════════════════════════════════════════════════════

import { rsi, macd, stochastic, atr } from '../../core/indicators.js'

/** Build all indicator arrays once (aligned to bars). Reads are O(1) per bar afterwards. */
export function momentumArrays(bars, cfg = {}) {
  return {
    rsi: rsi(bars, cfg.rsiPeriod ?? 14),
    macd: macd(bars, cfg.macdFast ?? 12, cfg.macdSlow ?? 26, cfg.macdSignal ?? 9),
    stoch: stochastic(bars, cfg.stochK ?? 14, cfg.stochD ?? 3),
    atr: atr(bars, cfg.atrPeriod ?? 14),
  }
}

/**
 * Regular divergence between price swings and RSI at bar i (anticipatory). Uses only swings
 * confirmed by bars[i].t within `lookback` bars. BULL = price lower-low + RSI higher-low;
 * BEAR = price higher-high + RSI lower-high.
 */
export function detectDivergence(bars, rsiArr, swings, i, { lookback = 60 } = {}) {
  const tNow = bars[i].t
  const recent = (type) => swings
    .filter((s) => s.type === type && s.confirmed_t <= tNow && s.idx <= i && i - s.idx <= lookback && rsiArr[s.idx] != null)
    .sort((a, b) => a.idx - b.idx)
  // lows → BULL signals (type=BULL means bullish lean for both regular-reversal and hidden-continuation)
  const lows = recent('LOW')
  if (lows.length >= 2) {
    const [p1, p2] = [lows[lows.length - 2], lows[lows.length - 1]]
    if (p2.price < p1.price && rsiArr[p2.idx] > rsiArr[p1.idx])          // price LL + RSI HL = REGULAR bull (reversal)
      return { type: 'BULL', kind: 'regular', price_lows: [p1.price, p2.price], rsi_lows: [+rsiArr[p1.idx].toFixed(1), +rsiArr[p2.idx].toFixed(1)] }
    if (p2.price > p1.price && rsiArr[p2.idx] < rsiArr[p1.idx])          // price HL + RSI LL = HIDDEN bull (continuation)
      return { type: 'BULL', kind: 'hidden', price_lows: [p1.price, p2.price], rsi_lows: [+rsiArr[p1.idx].toFixed(1), +rsiArr[p2.idx].toFixed(1)] }
  }
  const highs = recent('HIGH')
  if (highs.length >= 2) {
    const [p1, p2] = [highs[highs.length - 2], highs[highs.length - 1]]
    if (p2.price > p1.price && rsiArr[p2.idx] < rsiArr[p1.idx])          // price HH + RSI LH = REGULAR bear (reversal)
      return { type: 'BEAR', kind: 'regular', price_highs: [p1.price, p2.price], rsi_highs: [+rsiArr[p1.idx].toFixed(1), +rsiArr[p2.idx].toFixed(1)] }
    if (p2.price < p1.price && rsiArr[p2.idx] > rsiArr[p1.idx])          // price LH + RSI HH = HIDDEN bear (continuation)
      return { type: 'BEAR', kind: 'hidden', price_highs: [p1.price, p2.price], rsi_highs: [+rsiArr[p1.idx].toFixed(1), +rsiArr[p2.idx].toFixed(1)] }
  }
  return null
}

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0)

/**
 * Confirmation read at bar i. Aggregates indicator votes (RSI dist-from-50, MACD histogram,
 * Stochastic %K-%D, divergence weighted highest) into a net directional lean + strength, with
 * ATR regime context. Returns { direction, score, confidence, regime, divergence, evidence }.
 */
export function readMomentum(bars, i, arrs, swings = [], cfg = {}) {
  const r = arrs.rsi[i], h = arrs.macd.hist[i], kk = arrs.stoch.k[i], dd = arrs.stoch.d[i], a = arrs.atr[i]
  if (r == null || h == null || kk == null || dd == null) {
    return { direction: 'NEUTRAL', score: 0, confidence: 0, regime: 'UNKNOWN', divergence: null, evidence: [], ready: false }
  }
  const div = detectDivergence(bars, arrs.rsi, swings, i, { lookback: cfg.divLookback ?? 60 })

  const votes = []
  votes.push({ name: 'rsi', dir: sign(r - 50), w: Math.min(1, Math.abs(r - 50) / 20) })
  votes.push({ name: 'macd_hist', dir: sign(h), w: 0.8 })
  votes.push({ name: 'stoch', dir: sign(kk - dd), w: 0.5 })
  if (div) votes.push({ name: 'divergence', dir: div.type === 'BULL' ? 1 : -1, w: 1.5 })

  const sumW = votes.reduce((s, v) => s + v.w, 0) || 1
  const net = votes.reduce((s, v) => s + v.w * v.dir, 0)
  const direction = Math.abs(net) < 0.2 ? 'NEUTRAL' : net > 0 ? 'UP' : 'DOWN'
  const score = Math.min(100, Math.round((Math.abs(net) / sumW) * 120))

  // ATR regime: expansion (momentum more trustworthy) vs contraction (mean-reversion risk)
  const aPrev = arrs.atr[Math.max(0, i - 10)]
  const regime = a != null && aPrev != null ? (a > 1.1 * aPrev ? 'EXPANSION' : a < 0.9 * aPrev ? 'CONTRACTION' : 'STABLE') : 'UNKNOWN'
  const agree = votes.filter((v) => v.dir === sign(net) && v.dir !== 0).length
  let confidence = 35 + 12 * agree + (div ? 12 : 0) + (regime === 'EXPANSION' ? 8 : regime === 'CONTRACTION' ? -8 : 0)
  confidence = Math.max(0, Math.min(100, confidence))

  return {
    direction, score, confidence, regime, divergence: div, ready: true,
    evidence: [
      { label: 'rsi', value: +r.toFixed(1), weight: 1 },
      { label: 'macd_hist', value: +h.toFixed(4), weight: 0.8 },
      { label: 'stoch_k_d', value: `${kk.toFixed(0)}/${dd.toFixed(0)}`, weight: 0.5 },
      { label: 'atr_regime', value: regime, weight: 0.5 },
      { label: 'divergence', value: div ? div.type : 'none', weight: div ? 1.5 : 0 },
    ],
  }
}

/**
 * Does this momentum read confirm a proposed trade `direction`?
 * policy 'agree'        → momentum must lean the same way.
 * policy 'not_opposed'  → momentum must NOT lean the opposite way (NEUTRAL is allowed).
 * Always requires score ≥ minScore when momentum has a directional lean.
 */
export function confirms(read, direction, { policy = 'not_opposed', minScore = 0 } = {}) {
  if (!read.ready) return policy === 'not_opposed'   // no read → don't block under not_opposed
  const opp = direction === 'UP' ? 'DOWN' : 'UP'
  if (policy === 'agree') return read.direction === direction && read.score >= minScore
  // not_opposed:
  if (read.direction === opp && read.score >= minScore) return false
  return true
}
