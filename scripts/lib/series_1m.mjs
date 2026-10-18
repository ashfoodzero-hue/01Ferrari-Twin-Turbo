// series_1m.mjs — the analysed instruments, each with its OWN TradingView-exact candle kit (2026-10-18; Ashraf: "after complete for XAU please
// do same exact for Silver, DXY, WTI"; DXY: "i need both … make sure that we can do the analysis and comparison perfectly at later stage").
// ONE loader for the swing tables, the TradingView check, the reasons checklist and the structure studies.
//   XAUUSD / XAGUSD : Polygon spot 1m (bid), gold session (nyCandles)                         → OANDA:XAUUSD / OANDA:XAGUSD
//   WTI             : CME crude front month 1m (real volume, 10 min delayed live), CME session → NYMEX:CL1!
//   DXY             : rebuilt each minute from the 6 pairs, on the GOLD grid (aligned with gold for joint analysis) → TVC:DXY
//   DXY_ICE         : the same DXY minutes on TradingView's own DXY session (sessionCandles dxyIce)   → TVC:DXY (exact candle times)
// REOPEN_CLAMP: switched on per instrument only after it was MEASURED to bring candles closer to TradingView.
import { loadBars } from '../../src/data/backfillReader.js'
import { loadDxyBars } from '../../src/data/dxy.js'
import { cleanForTv, buildCandles as nyBuild, clampReopen } from '../../src/core/nyCandles.js'
import { makeSession, SESSIONS } from '../../src/core/sessionCandles.js'
import { HISTORY_CONTINUOUS_FROM } from '../../src/core/paths.js'

export const TV_SYMBOL = Object.freeze({ XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD', DXY: 'TVC:DXY', DXY_ICE: 'TVC:DXY', WTI: 'NYMEX:CL1!' })
export const SHORT = Object.freeze({ XAUUSD: 'xau', XAGUSD: 'xag', DXY: 'dxy', DXY_ICE: 'dxy_ice', WTI: 'wti' })
export const REOPEN_CLAMP = new Set(['XAUUSD', 'XAGUSD'])   // XAGUSD measured 2026-10-18: low-diff p90 vs TradingView 15m $1.46 → $0.28, 1H $1.33 → $0.26, 4H $0.58 → $0.15
const SES = { WTI: makeSession(SESSIONS.cme), DXY_ICE: makeSession(SESSIONS.dxyIce) }

/** Raw 1m bars of an instrument (before cleaning). */
export async function raw1m(sym, from = HISTORY_CONTINUOUS_FROM) {
  if (sym === 'DXY' || sym === 'DXY_ICE') return (await loadDxyBars('1m', { from })).bars
  return (await loadBars(sym, '1m', { from })).bars
}
/** The candle kit of an instrument: { clean(raw) → minutes, build(minutes, tf) → candles, session } */
// live: true (2026-10-19) keeps the forming session even while it has < 60 minutes (keepLastDate) — for the LIVE jobs only; studies keep the default.
export function kit(sym, { reopenClamp = REOPEN_CLAMP.has(sym), live = false } = {}) {
  if (SES[sym]) { const S = SES[sym]; return { session: S.spec.name, clean: (raw) => { const b = S.clean(raw, { realVolume: sym === 'WTI', keepLastDate: live }).bars; if (reopenClamp) clampReopen(b); return b }, build: (M, tf) => S.buildCandles(M, tf) } }
  return { session: 'gold', clean: (raw) => cleanForTv(raw, { reopenClamp, keepLastDate: live }).bars, build: (M, tf) => nyBuild(M, tf) }
}
/** Cleaned 1m bars for an instrument's TradingView-style candles. */
export async function clean1m(sym, { from = HISTORY_CONTINUOUS_FROM, reopenClamp, live = false } = {}) { return kit(sym, { ...(reopenClamp === undefined ? {} : { reopenClamp }), live }).clean(await raw1m(sym, from)) }
