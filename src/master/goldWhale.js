// ════════════════════════════════════════════════════════════════════════════════
// goldWhale.js — "WHALES" on gold, 15m: BIG-VOLUME PRESSURE in CME gold futures (GC front month) — ONE module for the study
// (scripts/study_gold_whale.mjs) and the chart (/api/bias). Ashraf 2026-10-09: "check whales direction for XAU, bullish or bearish on 15m".
// ────────────────────────────────────────────────────────────────────────────────
// WHAT THE DATA CAN AND CANNOT SAY (measured 2026-10-09): Polygon gives us GC 1m bars with REAL exchange volume, 10 min delayed;
// futures trades / quotes are NOT entitled (403) → no aggressor side, no true buyer/seller split, no positions. So this is NOT "whale
// positioning". It is: where did the heavy, whale-size volume close inside its bar — near the high (bought) or near the low (sold)?
// PRE-REGISTERED RULE (fixed before the first measurement):
//   delivered at decision T = GC 15m bars (resampled from 1m, closed) with t + 15m ≤ T − 10 min (what we actually have live)
//   window   = the last 4 delivered 15m bars (1 hour);  baseline = median volume of the 96 delivered bars before them (1 day)
//   big bar  = volume ≥ 2 × baseline;  close location CLV = (2c − h − l) / (h − l)  (+1 closed at the high … −1 at the low; 0 if h = l)
//   pressure = Σ v·CLV / Σ v over the big bars in the window;  BULLISH > +0.2 · BEARISH < −0.2 · else MIXED;  no big bar → QUIET
// ════════════════════════════════════════════════════════════════════════════════
export const WHALE = Object.freeze({ tfMs: 900000, delayMs: 10 * 60000, window: 4, baseBars: 96, bigMult: 2, thr: 0.2 })

/** Sync 1m → 15m closed buckets (same rule as backfillReader.resampleClosed: a trailing bucket only once its final minute exists). */
export function bucket15(m1) {
  const out = []; let cur = null, lastMinute = null
  for (const b of m1) { const k = Math.floor(b.t / WHALE.tfMs) * WHALE.tfMs
    if (cur && k !== cur.t) { out.push(cur); cur = null }
    if (!cur) { cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 } } else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.v += b.v || 0 }
    lastMinute = b.t }
  if (cur && lastMinute + 60000 === cur.t + WHALE.tfMs) out.push(cur)
  return out
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN }
const clv = (b) => (b.h > b.l ? (2 * b.c - b.h - b.l) / (b.h - b.l) : 0)

/**
 * Whale reading at decision time T from GC 15m bars (ascending). `upto` = index one past the last DELIVERED bar (caller may pass it for
 * speed; computed otherwise). Returns null when there is not enough history for the baseline.
 */
export function whaleAt(gc15, T, upto = null) {
  const W = WHALE
  let n = upto
  if (n == null) { let lo = 0, hi = gc15.length; while (lo < hi) { const m = (lo + hi) >> 1; if (gc15[m].t + W.tfMs <= T - W.delayMs) lo = m + 1; else hi = m } n = lo }
  if (n < W.window + W.baseBars) return null
  const win = gc15.slice(n - W.window, n), base = median(gc15.slice(n - W.window - W.baseBars, n - W.window).map((b) => b.v))
  if (!(base > 0)) return null
  const big = win.filter((b) => b.v >= W.bigMult * base)
  const last = win.at(-1)
  if (!big.length) return { dir: 'QUIET', pressure: 0, big: 0, baseVol: base, lastDeliveredT: last.t, maxMult: +Math.max(...win.map((b) => b.v / base)).toFixed(2) }
  const sv = big.reduce((s, b) => s + b.v, 0), p = big.reduce((s, b) => s + b.v * clv(b), 0) / sv
  return { dir: p > W.thr ? 'BULLISH' : p < -W.thr ? 'BEARISH' : 'MIXED', pressure: +p.toFixed(3), big: big.length, baseVol: base, lastDeliveredT: last.t,
    maxMult: +Math.max(...win.map((b) => b.v / base)).toFixed(2), bigBars: big.map((b) => ({ t: b.t, v: b.v, clv: +clv(b).toFixed(2), mult: +(b.v / base).toFixed(2) })) }
}
