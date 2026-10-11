// ════════════════════════════════════════════════════════════════════════════════
// fibZones.js — Fibonacci retracement / extension + OTE + premium-discount (item: OTE/Fib).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Agent 1 · Structure (2026-06-25).
//
// Given an impulse leg (legStart → legEnd), compute the standard retracement levels, the
// extension targets, the EQUILIBRIUM (50% — the premium/discount divider), and the OTE zone
// (0.618–0.786, sweet spot 0.705 — the SMC "optimal trade entry" pullback). `fibFromSwings`
// auto-picks the most recent leg from confirmed swings (look-ahead-free). Pure geometry; the
// caller maps these to entries (a discount-zone tap on a bullish leg = a long setup).
// ════════════════════════════════════════════════════════════════════════════════

import { detectSwings } from '../../core/structure/swings.js'

const RETR = [0.236, 0.382, 0.5, 0.618, 0.705, 0.786]
const EXT = [1.272, 1.414, 1.618, 2.0, 2.618]

/** Fib levels for a signed leg legStart → legEnd. */
export function fib(legStart, legEnd) {
  const range = legEnd - legStart            // signed (UP leg → positive)
  if (range === 0) return null
  const dir = range > 0 ? 'UP' : 'DOWN'
  const retr = RETR.map((r) => ({ r, price: +(legEnd - r * range).toFixed(3) }))
  const ext = EXT.map((e) => ({ e, price: +(legStart + e * range).toFixed(3) }))
  const p618 = legEnd - 0.618 * range, p786 = legEnd - 0.786 * range, p705 = legEnd - 0.705 * range
  return {
    dir, legStart: +legStart.toFixed(3), legEnd: +legEnd.toFixed(3), range: +Math.abs(range).toFixed(3),
    equilibrium: +(legStart + 0.5 * range).toFixed(3),   // 50% — premium above / discount below (for an UP leg)
    retr, ext,
    ote: { lo: +Math.min(p618, p786).toFixed(3), hi: +Math.max(p618, p786).toFixed(3), sweet: +p705.toFixed(3) },
  }
}

/** Where does `price` sit relative to the leg? PREMIUM (>50%) / DISCOUNT (<50%) / EQUILIBRIUM, + in-OTE. */
export function zoneOf(f, price) {
  if (!f) return null
  // fraction retraced from legEnd back toward legStart (0 at legEnd, 1 at legStart)
  const frac = (f.legEnd - price) / (f.legEnd - f.legStart)
  const side = frac < 0.5 ? (f.dir === 'UP' ? 'PREMIUM' : 'DISCOUNT') : frac > 0.5 ? (f.dir === 'UP' ? 'DISCOUNT' : 'PREMIUM') : 'EQUILIBRIUM'
  const inOte = price >= f.ote.lo && price <= f.ote.hi
  return { frac: +frac.toFixed(3), side, inOte }
}

/**
 * Build the Fib of the most recent impulse leg from confirmed swings (≤ at), look-ahead-free.
 * @returns {object|null} fib(...) result + {legStartT, legEndT}, or null if no leg.
 */
export function fibFromSwings(bars, at, { left = 3, right = 3 } = {}) {
  const visible = bars.filter((b) => b.t <= at)
  const swings = detectSwings(visible, { left, right }).filter((s) => s.confirmed_t <= at).sort((a, b) => a.confirmed_t - b.confirmed_t)
  if (swings.length < 2) return null
  // the last two ALTERNATING pivots define the most recent leg
  let last = swings[swings.length - 1]
  let prev = null
  for (let i = swings.length - 2; i >= 0; i--) { if (swings[i].type !== last.type) { prev = swings[i]; break } }
  if (!prev) return null
  const f = fib(prev.price, last.price)
  if (!f) return null
  return { ...f, legStartT: prev.confirmed_t, legEndT: last.confirmed_t }
}
