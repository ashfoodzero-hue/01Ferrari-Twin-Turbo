// ════════════════════════════════════════════════════════════════════════════════
// bars.js — the canonical bar type + timeframe helpers.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2 core framework (2026-06-24).
//
// Every feed (read-only backfill JSONL, live Polygon /aggs) is normalized to ONE
// shape so agents never branch on source format. A bar is:
//   { t, o, h, l, c, v, src, live }
//     t    = open time, UTC ms (the bar's anchor; sorting key)
//     o/h/l/c = OHLC numbers
//     v    = volume (number; 0 if untrusted/absent)
//     src  = source tag ('dukascopy' | 'massive' | 'polygon' | …)
//     live = liveness ('HISTORICAL' | 'REALTIME' | 'DELAYED')
// ════════════════════════════════════════════════════════════════════════════════

/** Timeframe → milliseconds. The 9 TFs the system covers (R13). */
export const TF_MS = Object.freeze({
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
  '1mo': 30 * 24 * 60 * 60_000,   // nominal; calendar months vary
})

/** Canonical TF spelling. Accepts common aliases (1H, 4H, 1D, 1W, MON…). */
export function canonTf(tf) {
  const k = String(tf).trim().toLowerCase()
  const map = { '60m': '1h', '240m': '4h', '1hr': '1h', d: '1d', w: '1w', mo: '1mo', month: '1mo' }
  return map[k] || k
}

/**
 * Normalize one raw record (from a backfill JSONL line or a Polygon agg) to a bar.
 * Returns null for records missing the essential OHLC+time (so a bad line is dropped,
 * never silently turned into zeros — completeness rule: flag, don't fabricate).
 */
export function normalizeBar(raw) {
  if (!raw || typeof raw !== 'object') return null

  // Backfill JSONL shape: open_utc_ms / open / high / low / close / volume / source / liveness
  // Polygon /aggs result shape: t / o / h / l / c / v  (t already ms)
  const t = raw.open_utc_ms ?? raw.t ?? raw.timestamp ?? null
  const o = raw.open ?? raw.o
  const h = raw.high ?? raw.h
  const l = raw.low ?? raw.l
  const c = raw.close ?? raw.c
  if (t == null || o == null || h == null || l == null || c == null) return null

  const v = Number(raw.volume ?? raw.v ?? 0)
  return {
    t: Number(t),
    o: Number(o),
    h: Number(h),
    l: Number(l),
    c: Number(c),
    v: Number.isFinite(v) ? v : 0,
    src: raw.source ?? raw.src ?? 'unknown',
    ver: raw.ver ?? null,                       // tick-stream verification tag (ca / arbiter / refill / unverified), 2026-10-08
    live: raw.liveness ?? raw.live ?? 'HISTORICAL',
  }
}

/** True if a bar passes basic sanity (positive prices, high≥low, ohlc within [l,h]). */
export function isSaneBar(b) {
  if (!b) return false
  if (!(b.o > 0 && b.h > 0 && b.l > 0 && b.c > 0)) return false
  if (b.h < b.l) return false
  if (b.o > b.h || b.o < b.l || b.c > b.h || b.c < b.l) return false
  return true
}

/** Sort ascending by time, in place. */
export function sortBars(bars) {
  return bars.sort((a, b) => a.t - b.t)
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
// BAD-PRINT REPAIR (2026-07-18). Found live: the shared 15m history carries 2025-11-23T22:00 as
// O 4063.84 · H 4063.84 · L 1964.99 · C 1964.99 — a 51% "crash" in one thin Sunday-open bar. It is not a file
// corruption: POLYGON'S OWN AGGREGATE returns the same bar; the bad tick is upstream, so re-fetching cannot fix
// it. It poisoned every consumer of lows (a phantom 1mo/1w/1d swing low at $1,964 ranked as the strongest
// liquidity target on the board), and any backtest whose resolver scanned through that bar saw a fantasy fill.
//
// THE RULE IS MEASUREMENT-BASED AND CANNOT TOUCH A REAL CRASH:
//   repair a field ONLY when the market's own neighbours disown the bar —
//     (1) both neighbours exist (the LAST bar is never repaired: no next print, no proof, no touch);
//     (2) prev.close ≈ next.open (within NEIGHBOR_TOL) — i.e. the market itself says "nothing happened here";
//     (3) the field sits > DEVIATION_TOL away from that consensus.
//   A REAL waterfall/flash-move fails condition (2): its next bar OPENS near the crashed price, confirming it.
//   Gold's largest genuine close→next-open jump is ~2% (weekend gaps); the corrupt bar's is 107%. The gap between
//   thresholds is enormous on purpose — this fires only on prints the tape itself contradicts.
//
// Repaired fields are clamped to the neighbour envelope and the bar is marked { _repaired: [fields] } — visible,
// counted by the caller, never silent. Leaving a known-false $1,964.99 in the data is ALSO fake data; the honest
// state is "repaired to the envelope the neighbours prove, and labelled as such".
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const NEIGHBOR_TOL = 0.03    // prev.c and next.o must agree within 3% for the bar to be judged at all
const DEVIATION_TOL = 0.10   // a field must sit >10% outside the neighbour envelope to be called a bad print

/** Repair provably-false prints in an ASCENDING bar array, in place. Returns { bars, repaired } */
export function repairBadPrints(bars) {
  const repaired = []
  for (let i = 1; i < bars.length - 1; i++) {
    const prev = bars[i - 1], b = bars[i], next = bars[i + 1]
    if (!prev?.c || !next?.o) continue
    if (Math.abs(next.o - prev.c) > NEIGHBOR_TOL * prev.c) continue          // neighbours disagree → could be REAL → never touch
    const lo = Math.min(prev.c, next.o), hi = Math.max(prev.c, next.o)
    const fields = []
    if (b.l < lo * (1 - DEVIATION_TOL)) { b.l = Math.min(b.o <= hi * (1 + DEVIATION_TOL) && b.o >= lo * (1 - DEVIATION_TOL) ? b.o : lo, lo); fields.push('l') }
    if (b.h > hi * (1 + DEVIATION_TOL)) { b.h = Math.max(b.o <= hi * (1 + DEVIATION_TOL) && b.o >= lo * (1 - DEVIATION_TOL) ? b.o : hi, hi); fields.push('h') }
    if (b.c < lo * (1 - DEVIATION_TOL) || b.c > hi * (1 + DEVIATION_TOL)) { b.c = Math.max(lo, Math.min(hi, b.c < lo ? lo : hi)); fields.push('c') }
    if (fields.length) {
      // keep OHLC internally coherent after the clamp
      b.h = Math.max(b.h, b.o, b.c); b.l = Math.min(b.l, b.o, b.c)
      b._repaired = fields
      repaired.push({ t: b.t, iso: new Date(b.t).toISOString(), fields })
    }
  }
  return { bars, repaired }
}
