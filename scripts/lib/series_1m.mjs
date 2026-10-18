// series_1m.mjs — the 1m series of the four analysed instruments, cleaned for TradingView-style candles (2026-10-18; Ashraf: "after complete for
// XAU please do same exact for Silver, DXY, WTI"). ONE loader for the swing tables, the TradingView check and the reasons checklist.
//   XAUUSD / XAGUSD : Polygon spot 1m (bid)            → TradingView OANDA:XAUUSD / OANDA:XAGUSD
//   DXY             : rebuilt each minute from the 6 ICE-weighted pairs (src/data/dxy.js), gold session grid → TVC:DXY
//   WTI             : CME crude front month 1m (Polygon futures, real volume, 10 min delayed live) → NYMEX:CL1!
// REOPEN_CLAMP: the reopen-spike clamp (nyCandles.cleanForTv) is switched on per instrument only after it was MEASURED to bring the candles
// closer to TradingView (XAUUSD measured 2026-10-18); the others are measured before they are added here.
import { loadBars } from '../../src/data/backfillReader.js'
import { loadDxyBars } from '../../src/data/dxy.js'
import { cleanForTv } from '../../src/core/nyCandles.js'
import { HISTORY_CONTINUOUS_FROM } from '../../src/core/paths.js'

export const TV_SYMBOL = Object.freeze({ XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD', DXY: 'TVC:DXY', WTI: 'NYMEX:CL1!' })
export const SHORT = Object.freeze({ XAUUSD: 'xau', XAGUSD: 'xag', DXY: 'dxy', WTI: 'wti' })
export const REOPEN_CLAMP = new Set(['XAUUSD', 'XAGUSD'])   // XAGUSD measured 2026-10-18: low-diff p90 vs TradingView 15m $1.46 → $0.28, 1H $1.33 → $0.26, 4H $0.58 → $0.15
/** Raw 1m bars of an instrument (before cleaning). */
export async function raw1m(sym, from = HISTORY_CONTINUOUS_FROM) {
  if (sym === 'DXY') return (await loadDxyBars('1m', { from })).bars
  return (await loadBars(sym, '1m', { from })).bars
}
/** Cleaned 1m bars for TradingView-style candles (weekend minutes dropped, break hour dropped, reopen clamp where measured). */
export async function clean1m(sym, { from = HISTORY_CONTINUOUS_FROM, reopenClamp = REOPEN_CLAMP.has(sym) } = {}) {
  return cleanForTv(await raw1m(sym, from), { realVolume: sym === 'WTI', reopenClamp }).bars
}
