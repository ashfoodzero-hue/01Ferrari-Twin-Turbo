// ════════════════════════════════════════════════════════════════════════════════
// levelRadar.js — the LEVEL RADAR as ONE module (Ferrari Twin Turbo, 2026-10-08): the daily + 4H causal level map, the
// fade decision at every 4H close, and the LEVEL_FADE book's order rule. Study, validator and live tick all import this.
// ────────────────────────────────────────────────────────────────────────────────
// Extracted from scripts/study_level_radar_23y.mjs (Turbo2 2026-09-26). Pre-registered definitions unchanged: fractal k=2 pivots
// on 1d (250-day lookback) and 4h (180-bar lookback), clustered within 0.25·ATR(1d); R1/S1 = nearest cluster beyond
// 0.10·ATR(4h); fade = maker limit AT the level, stop 0.5·ATR(4h), target 1.0·ATR(4h), 24h (96 × 15m) window.
//
// 🚨 LOOK-AHEAD FOUND IN THE STUDY (code audit 2026-10-08) — fixed here, the study's behaviour kept behind `legacy: true` ONLY so
// the extraction can be proven byte-faithful and the contamination MEASURED (never used live):
//   1. pivot confirmation: a fractal pivot at bar i needs the FULL high/low of bar i+k, known at that bar's CLOSE — the study made
//      it available at its OPEN (confirmT = bars[i+k].t): daily pivots up to 24h early, 4h pivots up to 4h early.
//      Causal: confirmT = bars[i+k].t + tfMs.
//   2. daily context: trend1d (close vs SMA20), ATR(1d) (cluster width, level filters) and the 20-day range used D1[di] — the
//      day CONTAINING the decision, i.e. that day's FINAL close/high/low (hours in the future). Causal: the last COMPLETED day
//      (D1[di-1] when the decision is inside day di).
// ════════════════════════════════════════════════════════════════════════════════

export const RADAR = Object.freeze({ k: 2, clusterAtr: 0.25, touchAtr: 0.10, lookback1d: 250, lookback4h: 180, stopAtr: 0.5, tgtAtr: 1.0, windowBars: 96, minH4: 60 })
const H4MS = 4 * 3600000, DMS = 86400000

const agg = (B, ms) => { const out = []; let cur = null; for (const b of B) { const k = Math.floor(b.t / ms) * ms; if (!cur || cur.t !== k) { if (cur) out.push(cur); cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v } } else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v } } if (cur) out.push(cur); return out }
const atrOf = (bars, n) => { const out = new Array(bars.length).fill(null); let s = 0; for (let i = 1; i < bars.length; i++) { const tr = Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c)); if (i <= n) { s += tr; if (i === n) out[i] = s / n } else out[i] = (out[i - 1] * (n - 1) + tr) / n } return out }
const pivots = (bars, k, tf, tfMs, legacy) => { const out = []; for (let i = k; i < bars.length - k; i++) { let hi = true, lo = true; for (let m = 1; m <= k; m++) { if (!(bars[i].h > bars[i - m].h && bars[i].h > bars[i + m].h)) hi = false; if (!(bars[i].l < bars[i - m].l && bars[i].l < bars[i + m].l)) lo = false }
  const confirmT = legacy ? bars[i + k].t : bars[i + k].t + tfMs              // causal: the confirming bar must have CLOSED
  if (hi) out.push({ price: bars[i].h, kind: 'H', t: bars[i].t, confirmT, tf }); if (lo) out.push({ price: bars[i].l, kind: 'L', t: bars[i].t, confirmT, tf }) } return out }
const distBucket = (d) => d < 0.5 ? '<0.5' : d < 1 ? '0.5-1' : d < 2 ? '1-2' : d < 4 ? '2-4' : '≥4'

/**
 * Build the radar context over ascending CLOSED 15m bars. legacy=true reproduces the study's look-ahead (measurement only).
 * Every H4/D1 bucket aggregated here must be complete for the decisions taken on it — callers pass only closed 15m bars and decide
 * only at H4 indices whose bucket has ended (decisionIndices / lastDecisionIndex).
 */
export function buildRadar(m15, { legacy = false } = {}) {
  const B = m15.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v ?? 0 }))
  const H4 = agg(B, H4MS), D1 = agg(B, DMS), ATR4 = atrOf(H4, 14), ATR1 = atrOf(D1, 14)
  const PV = [...pivots(D1, RADAR.k, '1d', DMS, legacy), ...pivots(H4, RADAR.k, '4h', H4MS, legacy)].sort((a, b) => a.confirmT - b.confirmT)
  const sma20 = new Array(D1.length).fill(null); { let s = 0; for (let i = 0; i < D1.length; i++) { s += D1[i].c; if (i >= 20) s -= D1[i - 20].c; if (i >= 19) sma20[i] = s / 20 } }
  const lastIdx = (arr, t) => { let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m].t <= t) lo = m; else hi = m - 1 } return lo }
  // the daily bar the decision may READ: legacy = the day containing t (future close); causal = the last day that has ENDED by t
  const dayIdxAt = (t) => { const di = lastIdx(D1, t); return legacy ? di : (D1[di].t + DMS <= t + 1 ? di : di - 1) }
  const h4IdxAt = (t) => lastIdx(H4, t)
  const m15IdxAt = (t) => { let lo = 0, hi = B.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (B[m].t < t) lo = m + 1; else hi = m } return lo }
  const trend4hAt = (t) => { const hs = [], ls = []; for (let i = PV.length - 1; i >= 0 && (hs.length < 2 || ls.length < 2); i--) { const p = PV[i]; if (p.tf !== '4h' || p.confirmT > t) continue; if (p.kind === 'H' && hs.length < 2) hs.push(p.price); if (p.kind === 'L' && ls.length < 2) ls.push(p.price) } if (hs.length < 2 || ls.length < 2) return 'NA'; const hh = hs[0] > hs[1], hl = ls[0] > ls[1]; return hh && hl ? 'UP' : !hh && !hl ? 'DOWN' : 'MIXED' }
  function levelsAt(t, atr1) {
    const cutoff1d = t - RADAR.lookback1d * DMS, cutoff4h = t - RADAR.lookback4h * H4MS
    const pts = []; for (let i = PV.length - 1; i >= 0; i--) { const p = PV[i]; if (p.confirmT > t) continue; if (p.confirmT < cutoff1d) break; if (p.tf === '4h' && p.t < cutoff4h) continue; pts.push(p) }
    pts.sort((a, b) => a.price - b.price); const width = RADAR.clusterAtr * atr1; const cl = []
    for (const p of pts) { const c = cl.at(-1); if (c && p.price - c.anchor <= width) { c.members.push(p); c.price = c.members.reduce((s, m) => s + m.price, 0) / c.members.length } else cl.push({ anchor: p.price, price: p.price, members: [p] }) }
    return cl.map((c) => ({ price: c.price, n: c.members.length, has1d: c.members.some((m) => m.tf === '1d'), lastT: Math.max(...c.members.map((m) => m.t)) }))
  }
  function levelStatus(L, t, atr4) { const tol = RADAR.touchAtr * atr4; let touches = 0, beyond = false, reclaimed = false, sideB = null; const i0 = h4IdxAt(L.lastT) + 1, i1 = h4IdxAt(t); for (let i = i0; i <= i1; i++) { const b = H4[i]; if (b.l <= L.price + tol && b.h >= L.price - tol) touches++; const above = b.c > L.price + tol, below = b.c < L.price - tol; if (!beyond && (above || below)) { beyond = true; sideB = above ? 'above' : 'below' } else if (beyond && !reclaimed && ((sideB === 'above' && below) || (sideB === 'below' && above))) reclaimed = true } return { touches, status: reclaimed ? 'SWEPT_RECLAIMED' : beyond ? 'BROKEN' : touches >= 2 ? 'TESTED' : 'FRESH' } }
  return { legacy, B, H4, D1, ATR4, ATR1, PV, sma20, dayIdxAt, h4IdxAt, m15IdxAt, trend4hAt, levelsAt, levelStatus }
}

/**
 * The fade decision at the close of H4[i] (the study's loop body, decision part only). null when the study skipped the point.
 * @returns {null|{decisionT, t, px, atr4, trend1d, trend4h, orders:[{side,dir,level,stop,tgt,atr4,label,status}]}}
 */
export function decisionAt(R, i) {
  const t = R.H4[i].t + H4MS - 1, atr4 = R.ATR4[i], di = R.dayIdxAt(t)
  if (i < RADAR.minH4 || di < 0) return null
  const atr1 = R.ATR1[di]; if (!atr4 || !atr1 || R.sma20[di] == null) return null
  const px = R.H4[i].c, lv = R.levelsAt(t, atr1); if (lv.length < 4) return null
  const above = lv.filter((L) => L.price > px + RADAR.touchAtr * atr4).sort((a, b) => a.price - b.price), below = lv.filter((L) => L.price < px - RADAR.touchAtr * atr4).sort((a, b) => b.price - a.price)
  if (!above.length || !below.length) return null
  const trend1d = R.D1[di].c > R.sma20[di] ? 'UP' : 'DOWN', trend4h = R.trend4hAt(t)
  const orders = []
  for (const [side, L1] of [['R', above[0]], ['S', below[0]]]) {
    const st = R.levelStatus(L1, t, atr4), dist = Math.abs(L1.price - px) / atr4
    const strength = (L1.has1d ? 'D' : 'H4') + (st.touches >= 2 ? '+tested' : '')
    const towards = (side === 'R' && trend1d === 'UP') || (side === 'S' && trend1d === 'DOWN') ? 'WITH-1d' : 'AGAINST-1d'
    orders.push({ side, dir: side === 'S' ? 'UP' : 'DOWN', level: L1.price, stop: RADAR.stopAtr * atr4, tgt: RADAR.tgtAtr * atr4, atr4, status: st.status, label: `${towards}|${strength}|dist ${distBucket(dist)}` })
  }
  return { decisionT: t + 1, t, px, atr4, trend1d, trend4h, orders }
}

/** H4 indices whose bucket has fully closed by `nowMs` (decide only on these). */
export function closedH4Count(R, nowMs) { let n = R.H4.length; while (n > 0 && R.H4[n - 1].t + H4MS > nowMs) n--; return n }

/**
 * THE BOOK'S ORDER RULE (one place — the validator simulates it, the live tick applies it). At each closed 4H decision, for each side
 * (R = sell limit at resistance, S = buy limit at support): place a new limit ONLY if that side's lane is free (no order pending or
 * position open on that side). `laneBusyUntil[side]` = the ms until which the side is occupied (fill window or position life).
 * Pure: returns the orders to place; the caller updates the lanes from the resolution.
 */
export function ordersToPlace(dec, laneBusyUntil) {
  if (!dec) return []
  return dec.orders.filter((o) => !(laneBusyUntil[o.side] > dec.decisionT - 1))
}
