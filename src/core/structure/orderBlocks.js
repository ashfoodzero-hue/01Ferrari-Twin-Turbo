// ════════════════════════════════════════════════════════════════════════════════
// orderBlocks.js — Order Blocks via Break of Structure (BOS).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// Bullish BOS: a bar CLOSES above the most recent swing high that was confirmed on or
// before the PREVIOUS bar (causal — never a swing the market couldn't yet know). The
// bullish Order Block is the last down-close candle in the lookback before that break
// (the demand the impulse came from). Bearish BOS is the mirror. confirmed_t = the BOS
// bar's time; formed_t = the OB candle's time. Lifecycle (mitigated/broken) is resolved
// later in worldModel.js from future bars, but each EVENT keeps its own timestamp so a
// query never sees a state that hadn't happened yet.
// ════════════════════════════════════════════════════════════════════════════════

function findLastDown(bars, i, lookback) {
  for (let k = i - 1; k >= Math.max(0, i - lookback); k--) if (bars[k].c < bars[k].o) return k
  return -1
}
function findLastUp(bars, i, lookback) {
  for (let k = i - 1; k >= Math.max(0, i - lookback); k--) if (bars[k].c > bars[k].o) return k
  return -1
}

/**
 * @param {Bar[]} bars
 * @param {Swing[]} swings
 * @param {{lookback?:number}} opts
 * @returns {OrderBlock[]} { kind:'ob', direction:'BULL'|'BEAR', low, high, formed_t, confirmed_t, status }
 */
export function detectOrderBlocks(bars, swings, { lookback = 20 } = {}) {
  const highs = swings.filter((s) => s.type === 'HIGH').sort((a, b) => a.confirmed_t - b.confirmed_t)
  const lows = swings.filter((s) => s.type === 'LOW').sort((a, b) => a.confirmed_t - b.confirmed_t)
  const obs = []
  const seen = new Set()
  let ph = -1, pl = -1
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i], prev = bars[i - 1]
    while (ph + 1 < highs.length && highs[ph + 1].confirmed_t <= prev.t) ph++   // known by prev bar
    while (pl + 1 < lows.length && lows[pl + 1].confirmed_t <= prev.t) pl++
    const sh = ph >= 0 ? highs[ph] : null
    const sl = pl >= 0 ? lows[pl] : null
    if (sh && prev.c <= sh.price && b.c > sh.price) {            // bullish BOS (a true crossing close)
      const j = findLastDown(bars, i, lookback)
      if (j >= 0) {
        const key = `BULL|${bars[j].t}`
        if (!seen.has(key)) { seen.add(key); obs.push({ kind: 'ob', direction: 'BULL', low: bars[j].l, high: bars[j].h, formed_t: bars[j].t, confirmed_t: b.t, status: 'unmitigated' }) }
      }
    }
    if (sl && prev.c >= sl.price && b.c < sl.price) {            // bearish BOS
      const j = findLastUp(bars, i, lookback)
      if (j >= 0) {
        const key = `BEAR|${bars[j].t}`
        if (!seen.has(key)) { seen.add(key); obs.push({ kind: 'ob', direction: 'BEAR', low: bars[j].l, high: bars[j].h, formed_t: bars[j].t, confirmed_t: b.t, status: 'unmitigated' }) }
      }
    }
  }
  return obs
}
