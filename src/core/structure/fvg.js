// ════════════════════════════════════════════════════════════════════════════════
// fvg.js — Fair Value Gaps (3-bar imbalance).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// Bullish FVG: bar[i-1].high < bar[i+1].low → unfilled gap [bar[i-1].high, bar[i+1].low].
// Bearish FVG: bar[i-1].low  > bar[i+1].high → unfilled gap [bar[i+1].high, bar[i-1].low].
// The gap is only KNOWN once the third bar (i+1) closes → confirmed_t = bar[i+1].t.
// formed_t = the middle bar's time. Fill lifecycle is resolved later from future bars.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Bar[]} bars
 * @param {{minSize?:number}} opts  minSize = minimum gap height to keep (price units; 0 = all)
 * @returns {FVG[]} { kind:'fvg', direction:'BULL'|'BEAR', low, high, formed_t, confirmed_t, status }
 */
export function detectFVGs(bars, { minSize = 0 } = {}) {
  const out = []
  for (let i = 1; i < bars.length - 1; i++) {
    const a = bars[i - 1], c = bars[i + 1]
    if (a.h < c.l && c.l - a.h > minSize) {
      out.push({ kind: 'fvg', direction: 'BULL', low: a.h, high: c.l, formed_t: bars[i].t, confirmed_t: c.t, status: 'unfilled' })
    } else if (a.l > c.h && a.l - c.h > minSize) {
      out.push({ kind: 'fvg', direction: 'BEAR', low: c.h, high: a.l, formed_t: bars[i].t, confirmed_t: c.t, status: 'unfilled' })
    }
  }
  return out
}
