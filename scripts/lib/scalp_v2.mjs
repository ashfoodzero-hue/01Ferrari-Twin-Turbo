// scalp_v2.mjs — ONE place for SCALP_ENTRY_V2_SPEC's entries (2026-10-23): F1 SPIKE FADE (1m) and F2 1H SWEEP & RECLAIM (3m), both sides, and the
// single-target / single-stop exits in A = ATR14 of the closed 1H (UTC) bars. Signals come out in matrixSignals' shape so matrix_trades.mjs sequences them
// and the live resolver (resolveMatrixTrade, tp1 = tp2 = target) prices them. Causal: only bars closed at the decision time.
import { atr as atrArr } from '../../src/core/indicators.js'

const MIN = 60000, HOUR = 3600000
export const EXITS = Object.freeze({ X1: { tgt: 0.25, stop: 2 }, X2: { tgt: 0.15, stop: 2 }, X3: { tgt: 0.25, stop: 3 } })

/** Closed UTC-hour bars from 1m + ATR14 → atHour(t) = A of the last hour whose whole period ended by t (null before 15 hours exist). */
export function hourAtr(m1) {
  const H = []; for (const b of m1) { const k = Math.floor(b.t / HOUR) * HOUR, x = H.at(-1)
    if (x && x.t === k) { if (b.h > x.h) x.h = b.h; if (b.l < x.l) x.l = b.l; x.c = b.c } else H.push({ t: k, o: b.o, h: b.h, l: b.l, c: b.c }) }
  const A = atrArr(H, 14), E = H.map((h) => h.t + HOUR)
  const at = (t) => { let a = 0, b = E.length; while (a < b) { const m = (a + b) >> 1; if (E[m] <= t) a = m + 1; else b = m } const i = a - 1; return i >= 0 && A[i] ? { A: A[i], hour: H[i] } : null }
  return { H, at }
}
const sig = (side, entry, decisionT, A, x, i, t, extra) => {
  const up = side === 'BUY', tgt = x.tgt * A, stop = x.stop * A
  return { i, t, decisionT, side, entry, sl: up ? entry - stop : entry + stop, tp1: up ? entry + tgt : entry - tgt, tp2: up ? entry + tgt : entry - tgt, risk: stop, reward: tgt, atr: A, ctx: extra }
}
const bIndex = (B) => { const T = B.map((b) => b.t); return (t) => { let a = 0, b = T.length; while (a < b) { const m = (a + b) >> 1; if (T[m] <= t) a = m + 1; else b = m } return Math.max(0, a - 1) } }

/** THE spike rule (ONE place): closed 1m bar j, contiguous with j−1, range ≥ k × ATR14(1m) of the bars BEFORE it, body ≥ 60 % of range.
 *  → −1 down spike / +1 up spike / 0 none. A1 = atrArr(m1, 14). */
export function spikeAt(m1, A1, j, k) {
  const b = m1[j], p = m1[j - 1]; if (!p || p.t !== b.t - MIN || !A1[j - 1]) return 0
  const r = b.h - b.l, body = Math.abs(b.c - b.o); if (r < k * A1[j - 1] || body < 0.6 * r) return 0
  return b.c < b.o ? -1 : 1
}
/** F1 SPIKE FADE: fade a spike at its close. */
export function spikeFade(m1, B, { k, exit, from = -Infinity, to = Infinity, ha = hourAtr(m1) }) {
  const A1 = atrArr(m1, 14), bi = bIndex(B), out = []
  for (let j = 15; j < m1.length; j++) { const b = m1[j]; if (b.t < from || b.t + MIN > to) continue
    const d = spikeAt(m1, A1, j, k); if (!d) continue
    const decisionT = b.t + MIN, h = ha.at(decisionT); if (!h) continue
    out.push(sig(d < 0 ? 'BUY' : 'SELL', b.c, decisionT, h.A, EXITS[exit], bi(b.t), b.t, { fam: `F1k${k}`, range_x: +((b.h - b.l) / A1[j - 1]).toFixed(2) })) }
  return out
}
// ── v3 (SCALP_ENTRY_V3_SPEC, 2026-10-24) ──
/** P1 (post-hoc): F1 k3 BUYs whose target (tgt × A) ≥ 6 × the measured spread at the decision. */
export function costFloorBuy(m1, B, { exit, spreadAt, ha = hourAtr(m1), ...o }) {
  return spikeFade(m1, B, { ...o, k: 3, exit, ha }).filter((s) => s.side === 'BUY' && s.reward >= 6 * spreadAt(s.decisionT - MIN))
}
/** P2 (post-hoc): down spike (k3), then the next contiguous 1m bar makes no new low → BUY at that bar's close. */
export function confirmBuy(m1, B, { exit, from = -Infinity, to = Infinity, ha = hourAtr(m1) }) {
  const A1 = atrArr(m1, 14), bi = bIndex(B), out = []
  for (let j = 15; j < m1.length - 1; j++) { const s = m1[j], n = m1[j + 1]; if (n.t < from || n.t + MIN > to) continue
    if (spikeAt(m1, A1, j, 3) !== -1 || n.t !== s.t + MIN || n.l < s.l) continue
    const decisionT = n.t + MIN, h = ha.at(decisionT); if (!h) continue
    out.push(sig('BUY', n.c, decisionT, h.A, EXITS[exit], bi(n.t), n.t, { fam: 'P2' })) }
  return out
}
/** N1: spike (k3), then the next contiguous 1m bar closes back beyond the spike's midpoint → fade at that close (both sides). */
export function twoBarExhaustion(m1, B, { exit, from = -Infinity, to = Infinity, ha = hourAtr(m1) }) {
  const A1 = atrArr(m1, 14), bi = bIndex(B), out = []
  for (let j = 15; j < m1.length - 1; j++) { const s = m1[j], n = m1[j + 1]; if (n.t < from || n.t + MIN > to) continue
    const d = spikeAt(m1, A1, j, 3); if (!d || n.t !== s.t + MIN) continue
    const mid = (s.h + s.l) / 2; if (d < 0 ? !(n.c > mid) : !(n.c < mid)) continue
    const decisionT = n.t + MIN, h = ha.at(decisionT); if (!h) continue
    out.push(sig(d < 0 ? 'BUY' : 'SELL', n.c, decisionT, h.A, EXITS[exit], bi(n.t), n.t, { fam: 'N1' })) }
  return out
}
/** N2: gold spike (k3) while silver's SAME minute is not a spike (range < 1.5 × silver ATR14(1m) before it) → fade at the gold bar's close.
 *  silver1m = Polygon XAGUSD 1m; a missing silver minute (or its previous minute) = no signal. */
export function goldOnlySpike(m1, B, { exit, silver1m, from = -Infinity, to = Infinity, ha = hourAtr(m1) }) {
  const A1 = atrArr(m1, 14), S1 = atrArr(silver1m, 14), si = new Map(silver1m.map((b, k) => [b.t, k])), bi = bIndex(B), out = []
  for (let j = 15; j < m1.length; j++) { const b = m1[j]; if (b.t < from || b.t + MIN > to) continue
    const d = spikeAt(m1, A1, j, 3); if (!d) continue
    const k = si.get(b.t); if (k == null || k < 1 || silver1m[k - 1].t !== b.t - MIN || !S1[k - 1]) continue
    if (silver1m[k].h - silver1m[k].l >= 1.5 * S1[k - 1]) continue
    const decisionT = b.t + MIN, h = ha.at(decisionT); if (!h) continue
    out.push(sig(d < 0 ? 'BUY' : 'SELL', b.c, decisionT, h.A, EXITS[exit], bi(b.t), b.t, { fam: 'N2' })) }
  return out
}
/** F2 1H SWEEP & RECLAIM: within an hour, high > previous closed hour's high + 0.10 A, then a 3m bar closes back below it → SELL (mirror → BUY).
 *  First per hour per side. The previous hour must be the hour right before (no gap). */
export function sweepReclaim(m1, B, { exit, from = -Infinity, to = Infinity, ha = hourAtr(m1) }) {
  const out = [], byHour = new Map(ha.H.map((h) => [h.t, h])); let curH = null, sweptUp = false, sweptDn = false, doneUp = false, doneDn = false, prev = null, A = null
  for (let i = 0; i < B.length; i++) { const b = B[i], hk = Math.floor(b.t / HOUR) * HOUR; if (b.t + 3 * MIN > to) break
    if (hk !== curH) { curH = hk; prev = byHour.get(hk - HOUR) ?? null; const h = ha.at(hk); A = h?.A ?? null; sweptUp = sweptDn = doneUp = doneDn = false }
    if (!prev || !A || b.t < from) continue
    if (b.h > prev.h + 0.10 * A) sweptUp = true
    if (b.l < prev.l - 0.10 * A) sweptDn = true
    const decisionT = b.t + 3 * MIN
    if (sweptUp && !doneUp && b.c < prev.h) { doneUp = true; out.push(sig('SELL', b.c, decisionT, A, EXITS[exit], i, b.t, { fam: 'F2', level: prev.h })) }
    if (sweptDn && !doneDn && b.c > prev.l) { doneDn = true; out.push(sig('BUY', b.c, decisionT, A, EXITS[exit], i, b.t, { fam: 'F2', level: prev.l })) } }
  return out.sort((a, b) => a.decisionT - b.decisionT)
}
export const ENTRIES = { F1k3: (m1, B, o) => spikeFade(m1, B, { ...o, k: 3 }), F1k5: (m1, B, o) => spikeFade(m1, B, { ...o, k: 5 }), F2: (m1, B, o) => sweepReclaim(m1, B, o) }
