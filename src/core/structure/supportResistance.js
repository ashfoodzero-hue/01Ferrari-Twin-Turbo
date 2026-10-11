// ════════════════════════════════════════════════════════════════════════════════
// supportResistance.js — horizontal S/R levels by clustering confirmed swings.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// Causal, incremental clustering: walk swings in confirmation order; a swing either
// joins an existing level within ATR-scaled tolerance (a "touch") or seeds a new
// candidate. A candidate becomes a real level on its `minTouches`-th touch — and its
// confirmed_t is that touch's time (look-ahead-free). Support vs resistance is decided
// at QUERY time from where current price sits, not baked in here.
//
// STRICT CAUSALITY (P4.7c fix, 2026-06-25): a level's `price` is FROZEN at confirmation
// (the centroid of its first `minTouches` touches). Later touches still add STRENGTH but
// MUST NOT move the price — otherwise a future touch would shift the centroid, which the
// World-Model uses to compute the level's break (`broken_t`), making a past bar's active/
// broken status depend on future bars (a 0.56% candidate-existence look-ahead, traced in
// the P4.7b Method-E audit). Freezing the price makes query(at) for levels look-ahead-free.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Swing[]} swings
 * @param {(idx:number)=>number|null} atrAt  ATR at a bar index (for tolerance scaling)
 * @param {{tolAtrMult?:number,minTouches?:number}} opts
 * @returns {Level[]} { kind:'level', price, touches:[{t,price,type}], formed_t, confirmed_t, strength, status }
 */
export function detectLevels(swings, atrAt, { tolAtrMult = 0.5, minTouches = 2 } = {}) {
  const sorted = [...swings].sort((a, b) => a.confirmed_t - b.confirmed_t)
  const cands = []
  for (const s of sorted) {
    const a = atrAt(s.idx)
    const tol = tolAtrMult * (a && a > 0 ? a : s.price * 0.001)
    // nearest candidate within tolerance
    let best = null, bestD = Infinity
    for (const c of cands) {
      const d = Math.abs(c.price - s.price)
      if (d <= tol && d < bestD) { best = c; bestD = d }
    }
    if (best) {
      best.touches.push({ t: s.confirmed_t, price: s.price, type: s.type })
      best.strength = best.touches.length
      // freeze price at confirmation: update only while still forming (≤ minTouches touches),
      // never after — later touches add strength, not price drift (strict causality, P4.7c).
      if (best.touches.length <= minTouches) best.price = best.touches.reduce((acc, t) => acc + t.price, 0) / best.touches.length
      if (best.touches.length === minTouches) best.confirmed_t = s.confirmed_t
    } else {
      cands.push({ kind: 'level', price: s.price, touches: [{ t: s.confirmed_t, price: s.price, type: s.type }], formed_t: s.confirmed_t, confirmed_t: null, strength: 1, status: 'active' })
    }
  }
  return cands.filter((c) => c.touches.length >= minTouches)
}
