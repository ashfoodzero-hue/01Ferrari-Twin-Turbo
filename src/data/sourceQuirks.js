// ════════════════════════════════════════════════════════════════════════════════
// sourceQuirks.js — MEASURED defects in Polygon's own history, corrected at read time in ONE place (backfillReader.streamBars, 1m).
// The stored files stay byte-identical to what Polygon serves (verify_database / reconcile compare them to Polygon); every reader sees the fix.
// ────────────────────────────────────────────────────────────────────────────────
// 1. NEW-YORK-LOCAL TIMESTAMPS, 2020-11-15 → 2020-12-31 (measured 2026-10-18; Ashraf: "Measure 2020 first", then fix with the right rule):
//    • inside the window the empty weekday hour is 17:00 "UTC" and the Sunday open 17:00 (forex) / 18:00 (gold) "UTC" — exactly New York's
//      17:00 break and Sunday open; Christmas Eve gold stops at 13:45 "UTC" = the real 13:45 New York early close
//    • our store = Polygon's current minutes exactly (2020-11-18, 12-09, 2021-01-13: all minutes identical at shift 0) → the stamps are Polygon's
//    • vs Ashraf's TradingView (OANDA:XAUUSD daily, read over CDP): median |close − TV| $3.32 as stored vs $0.45 / $0.75 / $0.27 in the control
//      periods; shifted +5 h → $0.60 (back in range); +6 h → $0.98. +4 h also gives $0.60 on dailies, but puts the winter break at 21:00Z (wrong);
//      +5 h = EST → UTC (no DST change inside the window) puts it at 22:00Z, the true winter break.
//    • gaps of ≥ 3 days on BOTH sides (Polygon holes) → the shifted minutes cannot collide with any other minute.
//    • XAGUSD and USDSEK hold no minute in the window (Polygon gap) — nothing to shift.
// ════════════════════════════════════════════════════════════════════════════════
const H = 3600000
export const QUIRKS = Object.freeze([
  { id: 'polygon-2020-winter-ny-local', symbols: ['XAUUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDCHF'],
    from: Date.parse('2020-11-14T00:00:00Z'), to: Date.parse('2021-01-01T00:00:00Z'), shiftMs: 5 * H },
])
/** The quirks that apply to a symbol (for a reader to short-circuit when none do). RESEARCH ONLY: TWIN_RAW_POLYGON_TIMES=1 reads Polygon's raw
 *  stamps — used to prove that a reproduction mismatch of an artifact computed before 2026-10-18 comes from this fix and nothing else. */
export const quirksFor = (symbol) => (process.env.TWIN_RAW_POLYGON_TIMES === '1' ? [] : QUIRKS.filter((q) => q.symbols.includes(symbol)))
/** Corrected timestamp of a stored minute (unchanged outside every quirk window). The reader seeks with a 7-day margin and filters AFTER the
 *  fix, so a shift of hours needs no window arithmetic; order is preserved because each window is bounded by multi-day Polygon gaps. */
export function fixTime(t, qs) { for (const q of qs) if (t >= q.from && t < q.to) return t + q.shiftMs; return t }
