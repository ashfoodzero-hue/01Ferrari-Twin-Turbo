// ════════════════════════════════════════════════════════════════════════════════
// swings.js — fractal swing-high / swing-low detection (the foundation).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// A swing at bar i needs `left` lower bars before and `right` lower bars after, so it
// is ONLY KNOWN once `right` more bars have closed. We record:
//   formed_t     = the pivot bar's time (where it sits on the chart)
//   confirmed_t  = the time it became knowable (pivot + right bars)
// Everything downstream keys on confirmed_t so the World-Model is look-ahead-free (R3).
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Bar[]} bars  ascending by time
 * @param {{left?:number,right?:number}} opts
 * @returns {Swing[]} { kind:'swing', type:'HIGH'|'LOW', price, idx, formed_t, confirmed_t, strength }
 */
export function detectSwings(bars, { left = 2, right = 2 } = {}) {
  const swings = []
  for (let i = left; i < bars.length - right; i++) {
    const p = bars[i]
    let isHigh = true, isLow = true
    for (let k = i - left; k <= i + right; k++) {
      if (k === i) continue
      if (bars[k].h >= p.h) isHigh = false   // strict: equal neighbours reject (no plateau dupes)
      if (bars[k].l <= p.l) isLow = false
    }
    if (isHigh) {
      // prominence vs the strongest neighbour, in price units (refined to ATR by caller)
      let maxN = -Infinity
      for (let k = i - left; k <= i + right; k++) if (k !== i) maxN = Math.max(maxN, bars[k].h)
      swings.push({ kind: 'swing', type: 'HIGH', price: p.h, idx: i, formed_t: p.t, confirmed_t: bars[i + right].t, prominence: p.h - maxN })
    }
    if (isLow) {
      let minN = Infinity
      for (let k = i - left; k <= i + right; k++) if (k !== i) minN = Math.min(minN, bars[k].l)
      swings.push({ kind: 'swing', type: 'LOW', price: p.l, idx: i, formed_t: p.t, confirmed_t: bars[i + right].t, prominence: minN - p.l })
    }
  }
  return swings
}
