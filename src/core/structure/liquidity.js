// ════════════════════════════════════════════════════════════════════════════════
// liquidity.js — equal-highs / equal-lows liquidity pools (EQH / EQL).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// Two+ swing highs at ~equal price = BUY-SIDE liquidity (stops resting above → EQH).
// Two+ swing lows at ~equal price  = SELL-SIDE liquidity (stops resting below → EQL).
// Tight ATR-scaled tolerance. confirmed_t = the time the pool reached `minPool` points
// (look-ahead-free). A pool is "swept" later when price wicks beyond it (resolved in
// worldModel.js). PDH/PDL/PWH/PWL (session references) are a future addition (need TF
// grouping) — flagged, not silently omitted.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @param {Swing[]} swings
 * @param {(number|null)[]} atrArr  ATR aligned to bars (tolerance scaling)
 * @param {{tolAtrMult?:number,minPool?:number}} opts
 * @returns {LiquidityPool[]} { kind:'liquidity', side:'BUY_SIDE'|'SELL_SIDE', level:'HIGH'|'LOW', price, count, formed_t, confirmed_t, status }
 */
export function detectLiquidity(swings, atrArr, { tolAtrMult = 0.15, minPool = 2 } = {}) {
  const pools = []
  for (const type of ['HIGH', 'LOW']) {
    const pts = swings.filter((s) => s.type === type).sort((a, b) => a.confirmed_t - b.confirmed_t)
    const clusters = []
    for (const s of pts) {
      const a = atrArr[s.idx]
      const tol = tolAtrMult * (a && a > 0 ? a : s.price * 0.0005)
      let best = null, bestD = Infinity
      for (const c of clusters) {
        const d = Math.abs(c.price - s.price)
        if (d <= tol && d < bestD) { best = c; bestD = d }
      }
      // freeze the pool price at confirmation (first `minPool` points) — later equal touches add
      // COUNT/strength but must NOT drift the price, else the swept status (worldModel uses p.price)
      // would depend on future touches (the P4.7c look-ahead class). Strictly causal.
      if (best) { best.pts.push(s); if (best.pts.length <= minPool) best.price = best.pts.reduce((acc, p) => acc + p.price, 0) / best.pts.length }
      else clusters.push({ price: s.price, pts: [s] })
    }
    for (const c of clusters) {
      if (c.pts.length < minPool) continue
      pools.push({
        kind: 'liquidity',
        side: type === 'HIGH' ? 'BUY_SIDE' : 'SELL_SIDE',
        level: type,
        price: c.price,
        count: c.pts.length,
        formed_t: c.pts[0].confirmed_t,
        confirmed_t: c.pts[minPool - 1].confirmed_t,
        status: 'resting',
      })
    }
  }
  return pools
}
