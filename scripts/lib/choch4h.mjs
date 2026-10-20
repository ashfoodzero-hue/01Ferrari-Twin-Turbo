// choch4h.mjs — the ONE implementation of the 4H CHoCH study (spec docs/CHOCH_4H_ADX_SPEC.md; Ashraf 2026-10-20 "Yes, run it as written").
// Strictly causal, closed candles only:
//   • pivot = fractal 3 / 3 (left strict, right ≥), complete candles only, known at the close of pivot + 3
//   • downtrend = last two confirmed pivot highs descend AND last two pivot lows descend (uptrend = mirror)
//   • bullish CHoCH = in a downtrend, the first CLOSE above the last confirmed lower high (one per level); tip = lowest low since that high
//     bearish = mirror (close below the last confirmed higher low in an uptrend; tip = highest high since it)
//   • REAL = high reaches close + 2·ATR (low ≤ close − 2·ATR for bearish) before a CLOSE beyond the tip, within 30 candles; FAILED = the close first
//   • ADX / +DI / −DI = Wilder 14 at the CHoCH candle (src/core/indicators.js adx)
// Trades on 1m BID bars: buys pay the ask (bid + spread) and exit at the bid; sells the mirror. Stop first inside a minute; gaps at the open.
import { atr as atrArr, adx as adxArr } from '../../src/core/indicators.js'

export const CH = Object.freeze({ PIV: 3, REAL_ATR: 2, HORIZON: 30, LIMIT_CANDLES: 6, STOP_ATR: 0.1, ADX_BUCKETS: [[0, 20], [20, 25], [25, 30], [30, 40], [40, 1e9]] })
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
export const bucketOf = (x) => CH.ADX_BUCKETS.findIndex(([a, b]) => x >= a && x < b)

export function pivots(C, piv = CH.PIV) {
  const H = [], L = []
  for (let i = piv; i < C.length - piv; i++) { if (C[i].incomplete) continue; let h = true, l = true
    for (let j = 1; j <= piv; j++) { if (C[i - j].incomplete || C[i + j].incomplete) { h = l = false; break }
      if (!(C[i].h > C[i - j].h) || !(C[i].h >= C[i + j].h)) h = false; if (!(C[i].l < C[i - j].l) || !(C[i].l <= C[i + j].l)) l = false }
    if (h) H.push(i); if (l) L.push(i) }
  return { H, L }
}

/** All CHoCH events + the trend state of every candle (for the control). M1 = the 1m bars (decision minute = first minute of the next candle). */
export function findChochs(C, M1, { from = -Infinity } = {}) {
  const A = atrArr(C, 14), X = adxArr(C, 14), { H, L } = pivots(C), ev = [], state = new Array(C.length).fill(0)
  let ph = 0, pl = 0; const kH = [], kL = [], usedH = new Set(), usedL = new Set()
  for (let i = 0; i < C.length; i++) {
    while (ph < H.length && H[ph] + CH.PIV <= i - 1) kH.push(H[ph++])
    while (pl < L.length && L[pl] + CH.PIV <= i - 1) kL.push(L[pl++])
    if (kH.length < 2 || kL.length < 2) continue
    const h1 = kH.at(-2), h2 = kH.at(-1), l1 = kL.at(-2), l2 = kL.at(-1)
    const down = C[h2].h < C[h1].h && C[l2].l < C[l1].l, up = C[h2].h > C[h1].h && C[l2].l > C[l1].l
    state[i] = down ? -1 : up ? 1 : 0
    const c = C[i]; if (c.incomplete || !(A[i] > 0) || X.adx[i] == null || c.t < from || i + 1 >= C.length) continue
    const mk = (side, lvlI) => { const buy = side === 'BUY'; let tip = buy ? Infinity : -Infinity, tipI = -1
      for (let k = lvlI; k <= i; k++) if (buy ? C[k].l < tip : C[k].h > tip) { tip = buy ? C[k].l : C[k].h; tipI = k }
      const e = lb(M1, C[i + 1].t); if (e >= M1.length) return null
      return { side, i, t: c.t, closeT: c.close_t, decisionT: M1[e].t, close: c.c, level: buy ? C[lvlI].h : C[lvlI].l, levelT: C[lvlI].t, tip, tipT: C[tipI].t, atr: A[i],
        adx: X.adx[i], adx3: X.adx[i - 3] ?? null, pdi: X.plusDI[i], mdi: X.minusDI[i], trend: state[i] } }
    if (down && !usedH.has(h2) && c.c > C[h2].h) { usedH.add(h2); const e = mk('BUY', h2); if (e) ev.push(e) }
    if (up && !usedL.has(l2) && c.c < C[l2].l) { usedL.add(l2); const e = mk('SELL', l2); if (e) ev.push(e) }
  }
  return { events: ev, state, A, X }
}

// V1H STRUCTURE GATE (2026-10-20, docs/MATRIX_STRUCTURE_GATE_SPEC.md, PASSED 2 y + 13 y; Ashraf "Yes, wire the V1H structure gate into the live SCALP"):
// no Matrix SCALP BUY while the 1H pivot structure is DOWN (last two confirmed pivot highs AND lows descending), read on the last 1H candle CLOSED at
// the decision time. ONE rule for the study and the live tick. Live window 45 days (smoke_structure_gate: = the full-history state).
export const V1H = Object.freeze({ tf: '1H', lookbackDays: 45, spec: 'docs/MATRIX_STRUCTURE_GATE_SPEC.md' })
/** C = gold-session candles (incomplete marked), M1 = the same 1m → state (−1 DOWN / +1 UP / 0 MIXED) of the last candle closed by t, + that candle. */
// closed = its whole hour has passed (a live forming candle's close_t is only its last minute + 1 — measured 2026-10-20 08:57: the 08:00 candle passed as closed)
export function structureStateAt(C, M1, t, tfMs = 3600000) {
  const Cc = C.filter((c) => c.close_t <= t && c.t + tfMs <= t); if (Cc.length < 20) return null
  const { state } = findChochs(Cc, M1, {}); return { state: state.at(-1), barT: Cc.at(-1).t, closeT: Cc.at(-1).close_t }
}

/** REAL / FAILED / OPEN on the 4H candles after i (high/low reached intrabar happens before that candle's close). */
export function outcome(C, i, side, close, tip, atr) {
  const buy = side === 'BUY', tgt = buy ? close + CH.REAL_ATR * atr : close - CH.REAL_ATR * atr
  for (let j = i + 1; j < C.length && j <= i + CH.HORIZON; j++) {
    if (buy ? C[j].h >= tgt : C[j].l <= tgt) return 'REAL'
    if (buy ? C[j].c < tip : C[j].c > tip) return 'FAILED' }
  return i + CH.HORIZON < C.length ? 'NONE' : 'OPEN'
}

export const ADX_RULES = [...CH.ADX_BUCKETS.map((_, k) => ({ id: `bucket${k}`, f: (e) => bucketOf(e.adx) === k })), { id: 'rising', f: (e) => e.adx3 != null && e.adx > e.adx3 },
  { id: 'falling', f: (e) => e.adx3 != null && e.adx <= e.adx3 }, { id: 'di_agree', f: (e) => (e.side === 'BUY' ? e.pdi > e.mdi : e.mdi > e.pdi) }, { id: 'di_against', f: (e) => (e.side === 'BUY' ? e.pdi <= e.mdi : e.mdi <= e.pdi) }]

/**
 * ADDENDUM B (2026-10-20): CHoCH that broke an S/R level → retest of the level without trading through the order block → clear confirmation candle.
 * levels: [{ px, side0 'resistance'|'support', bornT, flipT }] (4H + 1D, first flip close time; Infinity = never flipped).
 * → { setups: [{ ...event, v, obI, ob, confI, confT, decisionT (first minute after the confirmation), tip (= OB extreme, the stop anchor), atr (at the
 *    confirmation), adxBefore, adxAfter, diBefore {p,m}, diAfter {p,m}, g1, g2 }], funnel }
 */
// levels = 'structure' (ADDENDUM C): v = the CHoCH's own broken level (the last lower high / higher low), no srLevels condition.
export function retestSetups(C, A, X, events, levels, M1) {
  const funnel = { choch: 0, broken_sr: 0, retest: 0, no_ob_cross: 0, confirmed: 0 }, setups = []
  for (const e of events) { funnel.choch++; const s = e.side === 'BUY' ? 1 : -1, i = e.i
    const lo = (C[i - 3] ?? C[0]).close_t, hi = C[i].close_t
    const lv = levels === 'structure' ? [{ px: e.level }] : levels.filter((l) => l.side0 === (s > 0 ? 'resistance' : 'support') && l.bornT <= C[i].t && l.flipT > lo && l.flipT <= hi)
    if (!lv.length) continue; funnel.broken_sr++
    const v = s > 0 ? Math.max(...lv.map((l) => l.px)) : Math.min(...lv.map((l) => l.px))
    let tipI = i; for (let k = i; k >= 0 && C[k].t >= e.tipT; k--) if (C[k].t === e.tipT) { tipI = k; break }
    let obI = tipI; for (let k = i; k >= tipI; k--) if (s > 0 ? C[k].c < C[k].o : C[k].c > C[k].o) { obI = k; break }
    const ob = s > 0 ? C[obI].l : C[obI].h
    let retested = false, crossed = false, confI = -1
    for (let j = i + 1; j <= i + CH.LIMIT_CANDLES && j < C.length; j++) { const c = C[j]
      if (s > 0 ? c.l < ob : c.h > ob) { crossed = true; break }
      if (!retested && (s > 0 ? c.l <= v + 0.1 * A[i] : c.h >= v - 0.1 * A[i])) retested = true
      if (retested) { const rg = c.h - c.l, body = s * (c.c - c.o)
        if (body > 0 && s * (c.c - v) > 0 && rg > 0 && body >= 0.5 * rg) { confI = j; break } } }
    if (!retested) continue; funnel.retest++; if (crossed) continue; funnel.no_ob_cross++; if (confI < 0 || confI + 1 >= C.length || X.adx[confI] == null || X.adx[i - 1] == null) continue; funnel.confirmed++
    const k = lb(M1, C[confI + 1].t); if (k >= M1.length) continue
    const dB = { p: X.plusDI[i - 1], m: X.minusDI[i - 1] }, dA = { p: X.plusDI[confI], m: X.minusDI[confI] }, agree = (d) => (s > 0 ? d.p > d.m : d.m > d.p)
    setups.push({ ...e, v, obI, ob, confI, confT: C[confI].t, decisionT: M1[k].t, tip: ob, atr: A[confI], adxBefore: X.adx[i - 1], adxAfter: X.adx[confI], diBefore: dB, diAfter: dA,
      g1: X.adx[confI] > X.adx[i - 1] && agree(dA), g2: !agree(dB) && agree(dA) }) }
  return { setups, funnel }
}

/**
 * ADDENDUM E (2026-10-20): retest INTO the order block, the OB extreme never broken, entry on the first 15m CHoCH inside the OB.
 * C15 = 15m candles of the same instrument (incomplete marked). → { setups: [{ ...event, ob: [lo, hi], touchT, trigT, decisionT, tip (OB extreme = stop
 *   anchor), atr (4H ATR at the CHoCH), confI (4H candle of the trigger), adxBefore, adxAfter, g1, g2 }], funnel }
 */
export function obChochSetups(C, A, X, events, C15, M1) {
  const funnel = { choch: 0, ob_retest: 0, no_ob_break: 0, choch15: 0 }, setups = [], P15 = pivots(C15), MIN15 = 900000
  for (const e of events) { funnel.choch++; const s = e.side === 'BUY' ? 1 : -1, i = e.i
    let tipI = i; for (let k = i; k >= 0 && C[k].t >= e.tipT; k--) if (C[k].t === e.tipT) { tipI = k; break }
    let obI = tipI; for (let k = i; k >= tipI; k--) if (s > 0 ? C[k].c < C[k].o : C[k].c > C[k].o) { obI = k; break }
    const obLo = C[obI].l, obHi = C[obI].h, ext = s > 0 ? obLo : obHi, near = s > 0 ? obHi : obLo
    const startT = C[i].close_t, endT = (C[i + 1 + CH.LIMIT_CANDLES] ?? C.at(-1)).t
    const PV = (s > 0 ? P15.H : P15.L).filter((p) => C15[p].t >= startT)
    let touched = false, broken = false, trig = -1, pk = 0, last = null
    for (let j = lb(C15, startT); j < C15.length && C15[j].t < endT; j++) { const c = C15[j]
      while (pk < PV.length && PV[pk] + CH.PIV <= j) last = PV[pk++]
      if (s > 0 ? c.l < ext : c.h > ext) { broken = true; break }
      if (!touched && (s > 0 ? c.l <= near : c.h >= near)) touched = true
      if (touched && last != null && (s > 0 ? c.c > C15[last].h : c.c < C15[last].l)) { trig = j; break } }
    if (!touched) continue; funnel.ob_retest++; if (broken) continue; funnel.no_ob_break++; if (trig < 0) continue
    const trigClose = C15[trig].t + MIN15, k = lb(M1, trigClose); if (k >= M1.length) continue
    const k4 = lb(C, trigClose + 1, (x) => x.close_t) - 1;   // the last 4H candle closed by the trigger if (k4 < i || X.adx[k4] == null || X.adx[i - 1] == null) continue
    funnel.choch15++
    const agree = (q) => (s > 0 ? X.plusDI[q] > X.minusDI[q] : X.minusDI[q] > X.plusDI[q])
    setups.push({ ...e, ob: [obLo, obHi], obI, trigT: C15[trig].t, decisionT: M1[k].t, tip: ext, atr: A[i], confI: lb(C, M1[k].t + 1) - 1,
      adxBefore: X.adx[i - 1], adxAfter: X.adx[k4], g1: X.adx[k4] > X.adx[i - 1] && agree(k4), g2: !agree(i - 1) && agree(k4) }) }
  return { setups, funnel }
}

/**
 * One trade from a CHoCH event. kind: 'E1' market at the decision minute · 'E2' limit at the broken level · 'E3' limit at 50 % tip→close.
 * target: ['T1', 'R', 1] | ['T2', 'R', 2] | ['T3', 'A', 2]. endT = time exit. → { skipped } | { open } | { entryT, exitT, entry, exit, pnl, r, how }
 */
export function trade(M1, ev, kind, target, spreadAt, endT, limitEndT) {
  const s = ev.side === 'BUY' ? 1 : -1, stop = ev.tip - s * CH.STOP_ATR * ev.atr
  let k = lb(M1, ev.decisionT), entry = null, entryT = null
  const askLo = (b) => b.l + spreadAt(b.t), askHi = (b) => b.h + spreadAt(b.t)
  if (kind === 'E1') { const b = M1[k]; if (!b) return { open: true }; entry = s > 0 ? b.o + spreadAt(b.t) : b.o; entryT = b.t }
  else { const L = kind === 'E2' ? ev.level : ev.tip + 0.5 * (ev.close - ev.tip)
    for (; k < M1.length && M1[k].t < limitEndT; k++) { const b = M1[k]
      if (s > 0 ? b.l <= stop : askHi(b) >= stop) return { skipped: 'tip broke before the fill' }
      if (s > 0 ? askLo(b) <= L : b.h >= L) { entry = s > 0 ? Math.min(L, b.o + spreadAt(b.t)) : Math.max(L, b.o); entryT = b.t; break } }
    if (entry == null) return k >= M1.length ? { open: true } : { skipped: 'no fill' } }
  const R = s * (entry - stop); if (!(R > 0)) return { skipped: 'entry beyond stop' }
  const tp = target[1] === 'P' ? target[2] : entry + s * (target[1] === 'R' ? target[2] * R : target[2] * ev.atr)   // 'P' = an absolute price (TOPDOWN SC, 2026-10-20)
  for (let j = k; j < M1.length && M1[j].t < endT; j++) { const b = M1[j], sp = spreadAt(b.t)
    const xo = s > 0 ? b.o : b.o + sp, xl = s > 0 ? b.l : b.l + sp, xh = s > 0 ? b.h : b.h + sp   // the side we exit on
    if (j > k && (s > 0 ? xo <= stop : xo >= stop)) return done(b.t, xo, 'stop_gap')
    if (s > 0 ? xl <= stop : xh >= stop) return done(b.t, stop, 'stop')
    if (j > k || kind === 'E1') { if (s > 0 ? xh >= tp : xl <= tp) return done(b.t, tp, 'target') } }
  const kl = lb(M1, endT) - 1; if (kl < k || (kl === M1.length - 1 && M1.at(-1).t < endT - 60000)) return { open: true }
  const b = M1[kl]; return done(b.t, s > 0 ? b.c : b.c + spreadAt(b.t), 'time')
  function done(t, x, how) { const pnl = s * (x - entry); return { entryT, exitT: t, entry, exit: x, stop, tp, R, pnl, r: pnl / R, how } }
}
