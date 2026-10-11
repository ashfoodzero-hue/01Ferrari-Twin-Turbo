// ════════════════════════════════════════════════════════════════════════════════
// symbols.js — the ONE table of instruments the twin reads (2026-10-08). Importer, streamer and readers use only this.
// ────────────────────────────────────────────────────────────────────────────────
// Every row was MEASURED live on the app's Polygon key (docs/POLYGON_DATA_REACH.md): real-time forex WebSocket,
// 1m history, tick-built BID bars = Polygon's 1m bars 35/35. XAUUSD is the only trade target; the rest are context
// (silver; the six ICE dollar-index constituents). Inputs Polygon cannot supply live (I:DXY, CL futures, USO) are NOT
// here — under R0 they are BLOCKED, never proxied.
// ════════════════════════════════════════════════════════════════════════════════
export const SYMBOLS = Object.freeze([
  { sym: 'XAUUSD', poly: 'C:XAUUSD', ws: 'C:XAU-USD', pair: 'XAU/USD', role: 'trade' },
  { sym: 'XAGUSD', poly: 'C:XAGUSD', ws: 'C:XAG-USD', pair: 'XAG/USD', role: 'context' },
  { sym: 'EURUSD', poly: 'C:EURUSD', ws: 'C:EUR-USD', pair: 'EUR/USD', role: 'dxy' },
  { sym: 'USDJPY', poly: 'C:USDJPY', ws: 'C:USD-JPY', pair: 'USD/JPY', role: 'dxy' },
  { sym: 'GBPUSD', poly: 'C:GBPUSD', ws: 'C:GBP-USD', pair: 'GBP/USD', role: 'dxy' },
  { sym: 'USDCAD', poly: 'C:USDCAD', ws: 'C:USD-CAD', pair: 'USD/CAD', role: 'dxy' },
  { sym: 'USDSEK', poly: 'C:USDSEK', ws: 'C:USD-SEK', pair: 'USD/SEK', role: 'dxy' },
  { sym: 'USDCHF', poly: 'C:USDCHF', ws: 'C:USD-CHF', pair: 'USD/CHF', role: 'dxy' },
])
export const BY_SYM = Object.freeze(Object.fromEntries(SYMBOLS.map((s) => [s.sym, s])))
export const BY_PAIR = Object.freeze(Object.fromEntries(SYMBOLS.map((s) => [s.pair, s])))

/**
 * RESEARCH CANDIDATES (2026-10-09; Ashraf: "find others that have similar direction on XAU … give % for each"). Each was MEASURED live
 * on the app's key (1-min lag). They are imported (1m history) for the lead/agreement study and join the live stream ONLY if that
 * study measures them useful — never by assumption. Crypto trades 24/7 on a different WebSocket cluster (live display needs its own
 * connection). Not available live on our plan (measured): I:DXY (delayed — rebuilt from the six pairs instead), I:VIX, I:SPX
 * (not entitled), XPT/XPD (no bars), CL/GC futures (10 min delayed).
 */
export const RESEARCH = Object.freeze([
  { sym: 'AUDUSD', poly: 'C:AUDUSD', ws: 'C:AUD-USD', pair: 'AUD/USD', role: 'candidate' },
  { sym: 'NZDUSD', poly: 'C:NZDUSD', ws: 'C:NZD-USD', pair: 'NZD/USD', role: 'candidate' },
  { sym: 'USDCNH', poly: 'C:USDCNH', ws: 'C:USD-CNH', pair: 'USD/CNH', role: 'candidate' },
  { sym: 'USDZAR', poly: 'C:USDZAR', ws: 'C:USD-ZAR', pair: 'USD/ZAR', role: 'candidate' },
  { sym: 'USDMXN', poly: 'C:USDMXN', ws: 'C:USD-MXN', pair: 'USD/MXN', role: 'candidate' },
  { sym: 'USDINR', poly: 'C:USDINR', ws: 'C:USD-INR', pair: 'USD/INR', role: 'candidate' },
  { sym: 'USDTRY', poly: 'C:USDTRY', ws: 'C:USD-TRY', pair: 'USD/TRY', role: 'candidate' },
  { sym: 'BTCUSD', poly: 'X:BTCUSD', ws: 'X:BTC-USD', pair: 'BTC-USD', role: 'candidate', cluster: 'crypto' },
  { sym: 'ETHUSD', poly: 'X:ETHUSD', ws: 'X:ETH-USD', pair: 'ETH-USD', role: 'candidate', cluster: 'crypto' },
])
export const ALL_SYMBOLS = Object.freeze([...SYMBOLS, ...RESEARCH])
