// sell_smt.mjs — the ONE implementation of the SELL "gold sweeps a high, silver does not confirm" signals + trade simulation
// (spec docs/SELL_SMT_SWEEP_SPEC.md + ADDENDUM A; Ashraf 2026-10-19 "Yes, run it as written"). Strictly causal:
//   • pivot high = fractal, 3 strictly lower highs left, 3 lower-or-equal highs right; known at the close of pivot + 3 (complete candles only)
//   • reference = the most recent confirmed gold pivot high not yet closed above
//   • SWEEP = complete candle i: high > reference AND close < reference
//   • silver matched high = the XAG pivot (same rule, confirmed before i) within ±2 candles of gold's pivot candle (nearest, tie → higher);
//     none → the XAG high of gold's pivot candle. SMT = max XAG high from the matched candle + 1 through i < matched high; else silver CONFIRMS.
//   • decision known at the first minute of a LATER candle (ADDENDUM A.3)
// Bars are BID: sells fill at the bid, buy-backs at the ask (bid + spread).
import { atr as atrArr } from '../../src/core/indicators.js'

export const SMT = Object.freeze({ PIV: 3, MATCH: 2, STOP_ATR: 0.10, TIME_MIN: 48 * 60, T2_CANDLES: 2, TARGETS: [['E1', 1], ['E2', 0.5], ['E3', 0.25]] })
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }

/** Fractal pivot highs (indices), only on complete candles with complete neighbours. */
export function pivotHighs(C, piv = SMT.PIV) {
  const out = []
  for (let i = piv; i < C.length - piv; i++) { let ok = !C[i].incomplete
    for (let j = 1; j <= piv && ok; j++) { if (C[i - j].incomplete || C[i + j].incomplete) ok = false; else if (!(C[i].h > C[i - j].h) || !(C[i].h >= C[i + j].h)) ok = false }
    if (ok) out.push(i) }
  return out
}
export function pivotLows(C, piv = SMT.PIV) {
  const out = []
  for (let i = piv; i < C.length - piv; i++) { let ok = true
    for (let j = 1; j <= piv && ok; j++) if (!(C[i].l < C[i - j].l) || !(C[i].l <= C[i + j].l)) ok = false
    if (ok) out.push(i) }
  return out
}

/**
 * Sweep events on one timeframe. G = gold candles, S = silver candles (same grid, both with .incomplete marked).
 * → [{ i, t, closeT, decisionT, ref, refPivT, sweepHigh, close, atr, smt (true = silver did NOT confirm), xagRef, xagMax, matched }]
 */
export function findSweeps(G, S, M1, { from = -Infinity } = {}) {
  const A = atrArr(G, 14), PH = pivotHighs(G), SPH = pivotHighs(S), sByT = new Map(S.map((c, k) => [c.t, k]))
  const out = []; let pk = 0; const active = []   // confirmed, not yet closed above: [gold pivot index]
  for (let i = 0; i < G.length; i++) { const c = G[i]
    // pivots confirmed by the close of candle i-1 (pivot + 3 ≤ i-1) become references before candle i is judged
    while (pk < PH.length && PH[pk] + SMT.PIV <= i - 1) { active.push(PH[pk]); pk++ }
    if (active.length && !c.incomplete && c.t >= from && A[i] > 0) {
      const p = active[active.length - 1], ref = G[p].h
      if (c.h > ref && c.c < ref) {
        // silver: matched pivot confirmed before candle i, within ±MATCH candles of gold's pivot candle (by time on the shared grid)
        const sp = sByT.get(G[p].t), si = sByT.get(c.t)
        if (sp != null && si != null) {
          let best = null
          for (let z = lb(SPH, sp - SMT.MATCH, (x) => x); z < SPH.length; z++) { const q = SPH[z]; if (q > sp + SMT.MATCH || q + SMT.PIV > si - 1) break; { if (!best || Math.abs(q - sp) < Math.abs(best - sp) || (Math.abs(q - sp) === Math.abs(best - sp) && S[q].h > S[best].h)) best = q } }
          const mIdx = best ?? sp, xagRef = S[mIdx].h
          let xagMax = -Infinity; for (let k = mIdx + 1; k <= si; k++) if (S[k].h > xagMax) xagMax = S[k].h
          // the first minute of a LATER candle: minute t ≥ the next candle's open (G[i+1].t); no later candle yet → unknown
          const nextT = i + 1 < G.length ? G[i + 1].t : null
          if (nextT != null) { const e = lb(M1, nextT)
            if (e < M1.length) out.push({ i, t: c.t, closeT: c.close_t, decisionT: M1[e].t, ref, refPivT: G[p].t, sweepHigh: c.h, close: c.c, atr: A[i],
              smt: xagMax < xagRef, xagRef, xagMax, matched: best != null }) } } } }
    if (!c.incomplete) for (let k = active.length - 1; k >= 0; k--) if (c.c > G[active[k]].h) active.splice(k, 1)
  }
  return out
}

/** T2: the first 3m close below the latest confirmed 3m pivot low, within the sweep candle + T2_CANDLES candles. null = no trade. */
export function t2Entry(ev, G, C3, PL3, M1) {
  const stop = ev.sweepHigh + SMT.STOP_ATR * ev.atr, endT = ev.i + 1 + SMT.T2_CANDLES < G.length ? G[ev.i + 1 + SMT.T2_CANDLES].t : Infinity
  for (let j = lb(C3, ev.decisionT); j < C3.length && C3[j].t < endT; j++) {
    if (C3[j].h >= stop) return null   // ADDENDUM A.4: the sweep failed before the break
    const k = lb(PL3, j - SMT.PIV + 1, (x) => x) - 1   // latest pivot low p with p + PIV ≤ j (PL3 holds indices)
    if (k < 0) continue
    if (C3[j].c < C3[PL3[k]].l) { const e = lb(M1, C3[j].close_t); return e < M1.length ? M1[e].t : null } }
  return null
}

/** Simulate one SELL from entry minute time eT. stop = sweep high + 0.1 ATR; target = entry − mult × R. */
export function simulateSell(M1, eT, stop, mult, spreadAt) {
  const k0 = lb(M1, eT); if (k0 >= M1.length) return null
  const entry = M1[k0].o, R = stop - entry; if (!(R > 0)) return { skipped: 'entry beyond stop' }
  const tp = entry - mult * R, end = M1[k0].t + SMT.TIME_MIN * 60000
  for (let k = k0; k < M1.length && M1[k].t < end; k++) { const b = M1[k], sp = spreadAt(b.t), aO = b.o + sp, aH = b.h + sp, aL = b.l + sp
    if (k > k0 && aO >= stop) return { exitT: b.t, pnl: entry - aO, r: (entry - aO) / R, how: 'stop_gap', entry, stop, tp, R }
    if (aH >= stop) return { exitT: b.t, pnl: entry - stop, r: -1, how: 'stop', entry, stop, tp, R }
    if (aL <= tp) return { exitT: b.t, pnl: entry - tp, r: (entry - tp) / R, how: 'target', entry, stop, tp, R } }
  const kl = lb(M1, end) - 1
  if (kl === M1.length - 1 && M1.at(-1).t < end - 60000) return { open: true }
  const b = M1[kl], x = b.c + spreadAt(b.t)
  return { exitT: b.t, pnl: entry - x, r: (entry - x) / R, how: 'time', entry, stop, tp, R }
}
