// ════════════════════════════════════════════════════════════════════════════════
// volumeProfile.js — price-binned Volume Profile (POC / VAH / VAL / HVN / LVN)
//                    + an HONESTLY-LABELED bar-delta proxy (NOT true footprint).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// ✅ VOLUME PROFILE — real & feasible. Every bar carries `volume`, so a price-binned
//    profile (Point of Control, 70% Value Area High/Low, High/Low Volume Nodes) is
//    computable. CAVEAT (R3 honesty): the 23y dukascopy set's volume is TICK-normalized
//    (e.g. 0.018), not exchange contract volume — perfectly fine for the *relative*
//    profile SHAPE (POC/VA/HVN/LVN are rank-based), but absolute volume isn't comparable
//    across sources. Profiles are computed per-source; we don't mix volume units.
//
// ⚠️ FOOTPRINT — true bid/ask delta per price is NOT in this data (audited: zero
//    bid/ask/delta/buy/sell fields; OHLCV only). We do NOT fake it. `barDelta()` below
//    is an explicit PROXY (close-position-in-range × volume — the standard OHLCV proxy).
//    Real footprint requires a tick or bid/ask feed → logged as a data gap for a future
//    source, surfaced (never silently treated as real).
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Build a Volume Profile over `bars`. Each bar's volume is distributed uniformly across
 * the price bins it spans [low, high] (single-print bars land in one bin).
 * @param {Bar[]} bars
 * @param {{bins?:number, valueAreaPct?:number, hvnMult?:number, lvnMult?:number}} opts
 * @returns {{ poc, vah, val, total, binSize, lo, hi, profile:[{price,volume}], hvn:number[], lvn:number[], source:string }}
 */
export function computeVolumeProfile(bars, { bins = 50, valueAreaPct = 0.70, hvnMult = 1.5, lvnMult = 0.4 } = {}) {
  if (!bars.length) return null
  let lo = Infinity, hi = -Infinity, total = 0
  for (const b of bars) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); total += b.v }
  if (!(hi > lo)) hi = lo + 1
  const binSize = (hi - lo) / bins
  const vol = new Array(bins).fill(0)

  for (const b of bars) {
    const v = b.v || 0
    if (v <= 0) continue
    const loIdx = Math.max(0, Math.floor((b.l - lo) / binSize))
    const hiIdx = Math.min(bins - 1, Math.floor((b.h - lo) / binSize))
    const span = hiIdx - loIdx + 1
    const share = v / span
    for (let k = loIdx; k <= hiIdx; k++) vol[k] += share
  }

  const binPrice = (k) => lo + (k + 0.5) * binSize
  let pocIdx = 0
  for (let k = 1; k < bins; k++) if (vol[k] > vol[pocIdx]) pocIdx = k

  // Value Area: expand out from the POC, each step taking the richer adjacent bin,
  // until `valueAreaPct` of total volume is enclosed.
  const totVol = vol.reduce((a, b) => a + b, 0) || 1
  let lower = pocIdx, upper = pocIdx, acc = vol[pocIdx]
  const target = valueAreaPct * totVol
  while (acc < target && (lower > 0 || upper < bins - 1)) {
    const below = lower > 0 ? vol[lower - 1] : -1
    const above = upper < bins - 1 ? vol[upper + 1] : -1
    if (above >= below) { upper++; acc += vol[upper] }
    else { lower--; acc += vol[lower] }
  }

  const avg = totVol / bins
  const hvn = [], lvn = []
  for (let k = 0; k < bins; k++) {
    if (vol[k] >= avg * hvnMult) hvn.push(+binPrice(k).toFixed(3))
    else if (vol[k] > 0 && vol[k] <= avg * lvnMult) lvn.push(+binPrice(k).toFixed(3))
  }

  return {
    poc: +binPrice(pocIdx).toFixed(3),
    vah: +binPrice(upper).toFixed(3),
    val: +binPrice(lower).toFixed(3),
    total,
    binSize,
    lo,
    hi,
    profile: vol.map((v, k) => ({ price: +binPrice(k).toFixed(3), volume: v })),
    hvn,
    lvn,
    source: bars[0]?.src ?? 'unknown',
  }
}

/**
 * ⚠️ PROXY ONLY — not true footprint. Estimates per-bar buy/sell pressure from where the
 * close sits in the bar's range: delta = volume × (2·(c−l)/(h−l) − 1) ∈ [−v, +v].
 * Close near high → buy-skew; near low → sell-skew. Real footprint needs tick/bid-ask.
 */
export function barDelta(b) {
  const range = b.h - b.l
  const pos = range > 0 ? (b.c - b.l) / range : 0.5
  return { delta_proxy: (b.v || 0) * (2 * pos - 1), is_proxy: true, needs: 'tick_or_bidask_feed' }
}

/** Cumulative delta PROXY across bars (running sum of barDelta). Labeled as proxy. */
export function cumulativeDeltaProxy(bars) {
  let cum = 0
  const series = bars.map((b) => { cum += barDelta(b).delta_proxy; return { t: b.t, cum } })
  return { series, final: cum, is_proxy: true, needs: 'tick_or_bidask_feed' }
}
