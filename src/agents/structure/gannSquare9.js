// ════════════════════════════════════════════════════════════════════════════════
// gannSquare9.js — items M + N: Gann Square-of-9 levels (CROSS) + the STAR levels.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Agent 1 · Structure (2026-06-25).
//
// The Square of 9 spirals numbers around a center; a price's support/resistance comes from its
// square root stepped by 45° increments and re-squared:  level = (√anchor + k·0.125)² .
//   • k·45° on a CARDINAL axis (0/90/180/270°) → the "CROSS" levels (k even).
//   • k·45° on an ORDINAL/diagonal axis (45/135/225/315°) → the "STAR" levels (k odd) —
//     this IS Ashraf's "Star method" (item N): the diagonal Sq-9 levels.
// Anchored on a significant pivot (major swing H/L). Pure deterministic math (unit-exact); the
// anchor selection is the only judgement, supplied by the caller (HTF swings).
// ════════════════════════════════════════════════════════════════════════════════

const STEP = 0.125   // 45° of one full rotation (1.0 = 360°)

/**
 * The Sq-9 ladder around an anchor: levels at ±k·45° for k=1..steps each side.
 * @returns {Array<{price,k,deg,type:'CROSS'|'STAR',dir:'up'|'down'}>}
 */
export function sq9Ladder(anchor, { steps = 24 } = {}) {
  if (!(anchor > 0)) return []
  const root = Math.sqrt(anchor)
  const out = []
  for (let k = -steps; k <= steps; k++) {
    if (k === 0) continue
    const r = root + k * STEP
    if (r <= 0) continue
    const deg = ((Math.abs(k) * 45) % 360)
    out.push({ price: +(r * r).toFixed(3), k, deg, type: deg % 90 === 0 ? 'CROSS' : 'STAR', dir: k > 0 ? 'up' : 'down' })
  }
  return out.sort((a, b) => a.price - b.price)
}

/** Just the 90° CARDINAL CROSS levels (the classic Gann Sq-9 S/R). */
export function sq9Cross(anchor, opts) { return sq9Ladder(anchor, opts).filter((l) => l.type === 'CROSS') }
/** Just the 45° diagonal STAR levels (item N — "the Star method"). */
export function sq9Star(anchor, opts) { return sq9Ladder(anchor, opts).filter((l) => l.type === 'STAR') }

/**
 * Nearest Gann levels to `price`, built from one or more anchors (major pivots). Returns the
 * closest CROSS + STAR above and below, plus the full merged ladder tagged by anchor.
 * @param {number} price
 * @param {Array<{price:number,label?:string}>} anchors
 */
export function nearestGann(price, anchors, { steps = 24, tol = 0 } = {}) {
  const all = []
  for (const a of anchors) for (const l of sq9Ladder(a.price, { steps })) all.push({ ...l, anchor: a.price, anchorLabel: a.label ?? null })
  const pick = (type, dir) => {
    const cand = all.filter((l) => l.type === type && (dir === 'up' ? l.price >= price - tol : l.price <= price + tol))
    if (!cand.length) return null
    return cand.reduce((best, l) => (Math.abs(l.price - price) < Math.abs(best.price - price) ? l : best))
  }
  return {
    price,
    crossAbove: pick('CROSS', 'up'), crossBelow: pick('CROSS', 'down'),
    starAbove: pick('STAR', 'up'), starBelow: pick('STAR', 'down'),
    all: all.sort((a, b) => a.price - b.price),
  }
}

/** Flatten the nearest Gann levels to a labelled list for the World-Model / Master. */
export function gannLevelList(ng) {
  const out = []
  for (const key of ['crossAbove', 'crossBelow', 'starAbove', 'starBelow']) {
    const l = ng[key]
    if (l) out.push({ kind: `GANN_${l.type}`, price: l.price, deg: l.deg, anchor: l.anchor, method: l.type === 'STAR' ? 'star' : 'cross' })
  }
  return out
}
