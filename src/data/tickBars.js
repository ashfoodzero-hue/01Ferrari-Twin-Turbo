// ════════════════════════════════════════════════════════════════════════════════
// tickBars.js — PURE tick → closed 1m bar logic for the streamer (2026-10-08). No I/O, no clock: everything injected.
// ────────────────────────────────────────────────────────────────────────────────
// MEASURED BASIS (docs/POLYGON_DATA_REACH.md § Tick parity): over 35/35 minutes on all 8 symbols, 1m bars built from
// the forex quote stream's BID equal Polygon's own 1m aggregates (CA, and the REST history) to the cent, and the
// tick count equals the aggregate's volume. So a bar built here IS the history's bar — live and backtest are one tape.
//
// SETTLE RULE (one minute at a time, strictly ascending per symbol — that is what keeps the store append-only):
//   built B (our ticks)   ·   CA (Polygon's streamed aggregate)   ·   REST (Polygon's served aggregate, the arbiter)
//   1. B and CA both present and EQUAL (o,h,l,c,v)          → write B           src 'tick'  ver 'ca'
//   2. B ≠ CA, or CA without B, or B without CA by the deadline → ask REST:
//        REST has the bar                                    → write REST        src 'rest'  ver 'arbiter' (+ agree flag)
//        REST has none after its retries, B covers the minute → write B           src 'tick'  ver 'unverified'
//   3. no B, no CA, minute fully covered by the connection   → quiet minute: no bar (Polygon has none either)
//   4. minute NOT fully covered (before connect / after a drop) → REST range refill, src 'rest' ver 'refill'
// ════════════════════════════════════════════════════════════════════════════════

export const MINUTE = 60000
export const CA_GRACE_MS = 8000            // measured CA lag p50 2.3 s, max 3.2 s → 8 s before treating CA as missing
export const floorMin = (t) => Math.floor(t / MINUTE) * MINUTE
export const ceilMin = (t) => Math.ceil(t / MINUTE) * MINUTE

const ohlc = () => ({ o: null, h: -Infinity, l: Infinity, c: null })
const upd = (x, p) => { if (x.o === null) x.o = p; if (p > x.h) x.h = p; if (p < x.l) x.l = p; x.c = p }

/** Accumulates one symbol's ticks into per-minute buckets (bid OHLC = the bar; ask OHLC + spread = the side record). */
export class MinuteBuilder {
  constructor() { this.buckets = new Map(); this.late = 0; this.lateByMinute = new Map(); this.lastTickT = null }
  /** @param {{b:number,a:number,t:number}} q  forex quote (bid, ask, ms) — settledBefore = minutes < this are closed */
  onTick(q, settledBefore = -Infinity) {
    if (!(q.b > 0) || !(q.a > 0) || !Number.isFinite(q.t)) return false
    const m = floorMin(q.t)
    if (m < settledBefore) { this.late++; this.lateByMinute.set(m, (this.lateByMinute.get(m) ?? 0) + 1); return false }   // settled — never rewritten here; the streamer re-checks the minute on REST (Polygon folds late quotes in later — measured USDSEK 16:10: 45 → 173 ticks)
    let k = this.buckets.get(m)
    if (!k) { k = { t: m, bid: ohlc(), ask: ohlc(), n: 0, spSum: 0, spMax: 0 }; this.buckets.set(m, k) }
    upd(k.bid, q.b); upd(k.ask, q.a); k.n++
    const sp = q.a - q.b; k.spSum += sp; if (sp > k.spMax) k.spMax = sp
    this.lastTickT = Math.max(this.lastTickT ?? 0, q.t)
    return true
  }
  /** Remove and return the bucket for minute m (or null). */
  take(m) { const k = this.buckets.get(m) ?? null; this.buckets.delete(m); return k }
  /** Drop every bucket older than m (partial minutes from before a reconnect). */
  dropBefore(m) { for (const t of [...this.buckets.keys()]) if (t < m) this.buckets.delete(t) }
}

/** A built bucket as a store bar (BID) — the same {t,o,h,l,c,v} shape the importer writes. */
export const bucketBar = (k) => ({ t: k.t, o: k.bid.o, h: k.bid.h, l: k.bid.l, c: k.bid.c, v: k.n })
/** The ask/spread side record for a bucket. */
export const bucketQuote = (k) => ({ t: k.t, ao: k.ask.o, ah: k.ask.h, al: k.ask.l, ac: k.ask.c, sp_avg: +(k.spSum / k.n).toFixed(5), sp_max: +k.spMax.toFixed(5), sp_close: +(k.ask.c - k.bid.c).toFixed(5), n: k.n })

const EPS = 1e-9
/** Exact bar equality on o,h,l,c and volume (the measured parity criterion). */
export function sameBar(a, b) {
  if (!a || !b) return false
  return Math.abs(a.o - b.o) < EPS && Math.abs(a.h - b.h) < EPS && Math.abs(a.l - b.l) < EPS && Math.abs(a.c - b.c) < EPS && (a.v ?? 0) === (b.v ?? 0)
}

/**
 * Decide what a minute needs, given what is known now. Pure.
 * @returns {{action:'write', bar, src, ver}|{action:'arbiter', why}|{action:'quiet'}|{action:'wait'}}
 */
export function settleDecision({ m, built, ca, now, covered }) {
  if (!covered) return { action: 'arbiter', why: 'not covered by the connection' }
  const b = built ? bucketBar(built) : null
  if (b && ca) return sameBar(b, ca) ? { action: 'write', bar: b, src: 'tick', ver: 'ca' } : { action: 'arbiter', why: 'tick bar ≠ CA' }
  if (ca && !b) return { action: 'arbiter', why: 'CA without ticks' }
  if (now < m + MINUTE + CA_GRACE_MS) return { action: 'wait' }
  if (b) return { action: 'arbiter', why: 'no CA by the deadline' }
  return { action: 'quiet' }
}
