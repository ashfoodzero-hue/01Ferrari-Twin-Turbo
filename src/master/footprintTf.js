// footprintTf.js — roll CME gold 1m footprints (data/orderflow/gc_1m_footprints.jsonl) up to ANY timeframe on the TradingView New York grid
// (nyCandles.candleOpen — the one timing rule), plus the footprint READ of one candle (2026-10-17; swing-candle study). TEST-ONLY research data.
// Futures ≠ spot: footprints are matched to spot candles by TIME only, never by price. A candle never mixes two contracts: if the contract
// changes inside a candle, the candle is marked `roll: true` (prices are not comparable across the roll) and a study should skip it.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../core/paths.js'
import { candleOpen } from '../core/nyCandles.js'

export const FP1M_FILE = path.join(TURBO.root, 'data', 'orderflow', 'gc_1m_footprints.jsonl')
const TICK = 0.1

/** Stream the 1m footprints (ascending). */
export async function* streamFootprints1m({ from = -Infinity, to = Infinity, file = FP1M_FILE } = {}) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const line of rl) { if (!line) continue; const b = JSON.parse(line); if (b.t < from) continue; if (b.t > to) break; yield b }
}
/** Roll 1m footprints into `tf` candles: { t, o, h, l, c, v, delta, n, roll, cells: Map(priceTicks → [bidVol, askVol]) }. */
export async function footprintCandles(tf, opts = {}) {
  const out = []; let cur = null
  for await (const b of streamFootprints1m(opts)) { const k = candleOpen(b.t, tf)
    if (!cur || cur.t !== k) { if (cur) out.push(cur); cur = { t: k, iid: b.iid, o: b.o, h: b.h, l: b.l, c: b.c, v: 0, delta: 0, n: 0, roll: false, cells: new Map() } }
    else { if (b.iid !== cur.iid) cur.roll = true; if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c }
    cur.v += b.v; cur.delta += b.delta; cur.n += b.n
    for (const [p, bid, ask] of b.cells) { const c = cur.cells.get(p); if (c) { c[0] += bid; c[1] += ask } else cur.cells.set(p, [bid, ask]) } }
  if (cur) out.push(cur)
  return out
}
/**
 * The footprint READ of one candle (definitions fixed here, cited by the study spec):
 *  • delta, delta_frac (delta / volume)
 *  • poc_loc: where the highest-volume price sits in the candle (0 = at the low, 1 = at the high)
 *  • extreme_vol_frac: share of volume traded in the bottom / top 10 % of the candle's range (thin = "unfinished", heavy = absorption)
 *  • stacked_buy / stacked_sell: the longest run of consecutive price levels where one side beats the other diagonally by ≥ ratio (3:1)
 *  • absorption_low / absorption_high: heavy SELLING at the low (bid volume in the bottom 10 %) while the candle closes in its upper half,
 *    and the mirror at the high — passive buyers / sellers soaking up aggression
 */
export function footprintRead(fc, { ratio = 3 } = {}) {
  const ps = [...fc.cells.keys()].sort((a, b) => a - b); if (!ps.length || !(fc.v > 0)) return null
  const lo = ps[0], hi = ps.at(-1), span = Math.max(1, hi - lo), vol = (p) => { const c = fc.cells.get(p); return c ? c[0] + c[1] : 0 }
  let poc = lo, pv = -1; for (const p of ps) { const v = vol(p); if (v > pv) { pv = v; poc = p } }
  const band = Math.max(1, Math.round(span * 0.1)), bot = ps.filter((p) => p <= lo + band), top = ps.filter((p) => p >= hi - band)
  const sum = (arr, f) => arr.reduce((a, p) => a + f(p), 0), bidAt = (p) => fc.cells.get(p)?.[0] ?? 0, askAt = (p) => fc.cells.get(p)?.[1] ?? 0
  // diagonal imbalance (standard footprint read): ask at price p vs bid at p − 1 tick (buyers), bid at p vs ask at p + 1 tick (sellers)
  let runB = 0, runS = 0, bestB = 0, bestS = 0
  for (const p of ps) { const a = askAt(p), b1 = bidAt(p - 1), b = bidAt(p), a1 = askAt(p + 1)
    runB = a > 0 && a >= ratio * Math.max(b1, 1e-9) ? runB + 1 : 0; runS = b > 0 && b >= ratio * Math.max(a1, 1e-9) ? runS + 1 : 0
    bestB = Math.max(bestB, runB); bestS = Math.max(bestS, runS) }
  const closeUpper = fc.c >= (fc.h + fc.l) / 2
  return { delta: fc.delta, delta_frac: fc.delta / fc.v, poc_loc: (poc - lo) / span, low_vol_frac: sum(bot, vol) / fc.v, high_vol_frac: sum(top, vol) / fc.v,
    low_sell_frac: sum(bot, bidAt) / fc.v, high_buy_frac: sum(top, askAt) / fc.v, stacked_buy: bestB, stacked_sell: bestS,
    absorption_low: closeUpper && sum(bot, bidAt) / fc.v >= 0.15, absorption_high: !closeUpper && sum(top, askAt) / fc.v >= 0.15, roll: fc.roll, tick: TICK }
}
