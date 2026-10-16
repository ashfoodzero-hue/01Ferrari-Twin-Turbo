// ════════════════════════════════════════════════════════════════════════════════
// macroMagnet.js — the visionHunt "4H Macro Magnet Engine" (Ashraf's Pine v5, pasted 2026-10-16), copied rule by rule, CAUSAL.
// Spec + measurement: docs/MACRO_MAGNET_SPEC.md. ONE place for the study and the live dashboard.
// ────────────────────────────────────────────────────────────────────────────────
// Pine → here:
//   A trend   35  EMA9 > EMA21 (ta.ema: SMA-seeded — src/core/indicators.ema)          else SHORT (equal → SHORT)
//   B magnet  35  |BSL − close| < |SSL − close| (missing register = 99999)              else SHORT (equal / both missing → SHORT)
//   C RSI     20  RSI14 > 50 (Wilder — src/core/indicators.rsi)                          else SHORT (= 50 → SHORT)
//   D candle  10  close < open → SHORT                                                   else LONG (close = open → LONG)
//   BSL/SSL: ta.pivothigh/low(10,10) — known 10 bars after the pivot → set the register; then, in the same bar, close > BSL (< SSL) clears it.
//   Display: LONG when long ≥ short. Long % + Short % = 100 (points, NOT a probability — the measured hit rate is shown beside it).
// 🚨 The Pine reads request.security(..., lookahead_on): on history each bar sees its own FINAL 4H values. Here the score of bar k uses
//   bars ≤ k only, read at bar k's close. Pivot ties: the pivot must be STRICTLY above/below the 10 bars on both sides (Pine does not
//   document ties) — every tie is counted (`ties`) so its effect is measured, not assumed.
// 4H candles: TradingView OANDA 4H start at 01/05/09/13/17/21 UTC in summer = 17:00 America/New_York (MEASURED from Ashraf's chart over
//   CDP 2026-10-16: 434 bars, all on those hours). 'ny' = 17:00 New York with US DST (primary) · 'ny21' = fixed 21:00 UTC · 'utc' = 00:00.
// ════════════════════════════════════════════════════════════════════════════════
import { ema, rsi } from '../core/indicators.js'

export const MAGNET = Object.freeze({ swing: 10, emaFast: 9, emaSlow: 21, rsiLen: 14, w: { A: 35, B: 35, C: 20, D: 10 }, far: 99999 })
const H = 3600000, H4 = 4 * H

/** US Eastern offset (ms, negative) at UTC time t: EDT from the 2nd Sunday of March 07:00 UTC to the 1st Sunday of November 06:00 UTC. */
export function nyOffsetMs(t) {
  const y = new Date(t).getUTCFullYear()
  const nthSunday = (m, n) => { const d = new Date(Date.UTC(y, m, 1)); const first = (7 - d.getUTCDay()) % 7 + 1; return Date.UTC(y, m, first + 7 * (n - 1)) }
  const start = nthSunday(2, 2) + 7 * H, end = nthSunday(10, 1) + 6 * H
  return t >= start && t < end ? -4 * H : -5 * H
}
/** Start (UTC ms) of the 4H bucket holding minute t. */
export function bucket4h(t, anchor = 'ny') {
  if (anchor === 'utc') return Math.floor(t / H4) * H4
  if (anchor === 'ny21') return Math.floor((t - 21 * H) / H4) * H4 + 21 * H
  const off = nyOffsetMs(t), local = t + off
  return Math.floor((local - 17 * H) / H4) * H4 + 17 * H - off
}
/** Closed 4H candles from an ascending 1m iterable, for several anchors in ONE pass. Returns { [anchor]: bars[] }; the bucket still open
 *  at the end of the stream is dropped unless its end ≤ closedBy (live: closedBy = now). */
export async function resample4h(stream1m, anchors = ['ny'], { closedBy = -Infinity } = {}) {
  const out = Object.fromEntries(anchors.map((a) => [a, []])), cur = Object.fromEntries(anchors.map((a) => [a, null]))
  for await (const b of stream1m) {
    for (const a of anchors) { const k = bucket4h(b.t, a), c = cur[a]
      if (!c || c.t !== k) { if (c) out[a].push(c); cur[a] = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0, n: 1 } }
      else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c; c.v += b.v || 0; c.n++ } }
  }
  for (const a of anchors) if (cur[a] && cur[a].t + H4 <= closedBy) out[a].push(cur[a])
  return out
}
/**
 * FORMING preview (2026-10-16, Ashraf: "yes add the forming preview"): the score of the CURRENT, still-open NY 4H candle = the closed bars
 * + the candle built from the minutes so far (and any whole bucket the closed list lacks). PROVISIONAL by definition — it can change until
 * the close (this is what the Pine shows live with lookahead_on). The official score stays the closed-bar one.
 * @param closed ascending closed NY 4H bars · @param minutes ascending 1m bars after the last closed bar · @returns row + { partial, forming:true } | null
 */
export async function formingScore(closed, minutes, P = MAGNET) {
  if (!closed.length) return null
  const lastEnd = closed.at(-1).t + H4, after = minutes.filter((m) => m.t >= lastEnd)
  if (!after.length) return null
  async function* it() { for (const m of after) yield m }
  const extra = (await resample4h(it(), ['ny'], { closedBy: Infinity })).ny   // closedBy ∞ → the open bucket is included
  const bars = [...closed, ...extra], rows = magnetScores(bars, P), r = rows.at(-1)
  if (!r) return null
  const p = bars.at(-1)
  return { ...r, forming: true, partial: { t: p.t, o: p.o, h: p.h, l: p.l, c: p.c, minutes: p.n, closes_at: p.t + H4, last_minute: after.at(-1).t } }
}
/** The score on every closed 4H bar (causal). Returns rows aligned to bars (null until EMA21 + RSI exist). */
export function magnetScores(bars, P = MAGNET) {
  const L = P.swing, eF = ema(bars, P.emaFast), eS = ema(bars, P.emaSlow), R = rsi(bars, P.rsiLen), rows = new Array(bars.length).fill(null)
  let bsl = null, ssl = null, ties = 0
  for (let j = 0; j < bars.length; j++) {
    const p = j - L
    if (p >= L) {   // pivot at p is confirmed at j = p + L (ta.pivothigh(high, L, L) returns at the bar L after the pivot)
      let hi = true, lo = true, tieH = false, tieL = false
      for (let k = p - L; k <= p + L; k++) { if (k === p) continue
        if (bars[k].h >= bars[p].h) { hi = false; if (bars[k].h === bars[p].h) tieH = true }
        if (bars[k].l <= bars[p].l) { lo = false; if (bars[k].l === bars[p].l) tieL = true } }
      if (hi) bsl = bars[p].h; if (lo) ssl = bars[p].l
      if (!hi && tieH && bars.slice(p - L, p + L + 1).every((x) => x.h <= bars[p].h)) ties++   // would be a pivot if ties counted
      if (!lo && tieL && bars.slice(p - L, p + L + 1).every((x) => x.l >= bars[p].l)) ties++
    }
    const c = bars[j].c
    if (bsl != null && c > bsl) bsl = null
    if (ssl != null && c < ssl) ssl = null
    if (eF[j] == null || eS[j] == null || R[j] == null) continue
    const A = eF[j] > eS[j], dB = bsl != null ? Math.abs(bsl - c) : P.far, dS = ssl != null ? Math.abs(ssl - c) : P.far, B = dB < dS, C = R[j] > 50, D = !(c < bars[j].o)
    const long = (A ? P.w.A : 0) + (B ? P.w.B : 0) + (C ? P.w.C : 0) + (D ? P.w.D : 0)
    rows[j] = { t: bars[j].t, long, short: 100 - long, side: long >= 100 - long ? 'LONG' : 'SHORT', A, B, C, D, bsl, ssl, ema9: eF[j], ema21: eS[j], rsi: R[j] }
  }
  rows.ties = ties
  return rows
}
