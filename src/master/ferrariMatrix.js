// ════════════════════════════════════════════════════════════════════════════════
// ferrariMatrix.js — Ashraf's Pine "Ferrari Central Master Control Suite" as the app's SCALP signal (2026-10-09). ONE module: the
// backtest (validate_ferrari_matrix.mjs) and the live tick (matrix_tick.mjs) both call it.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf: "use the same method as in this script and open a trade Neon Box shows Entry price, TPs and use the min SL"; scalp on 3m
// candles; WTI "as it shows in current live calculation time" (explicit R0 exception for this input: WTI is 10 min delayed on our plan);
// exits "half at TP1, half at TP2"; the box shows while the trade is open and disappears when it ends.
//
// FAITHFUL TRANSLATION (Pine → JS), on CLOSED 3m gold bars (Polygon bid). Look-ahead bugs of the script FIXED: its DXY/silver series used
// `lookahead_on`, and its SELL required `barstate.islast` (it could never fire on history). Pine semantics kept:
//   htf_high/low   = ta.highest(high,45) / ta.lowest(low,45) — the 45 bars INCLUDING the current one
//   ceiling/floor  = high + span·(1.272−1) / low − span·(1.272−1);  internal buy wall = high − span·0.886
//   cushion        = 1.5 · ta.atr(14)  (Wilder)
//   sell_wall_hit  = high ≥ ceiling − cushion;  buy_wall_hit = low ≤ floor + cushion  OR  low ≤ internal wall + cushion
//   DXY bullish    = DXY 3m close > EMA10 of DXY 3m closes (DXY rebuilt from its six Polygon pairs, same 3m bucket — closed)
//   WTI bullish    = the 1h WTI candle as DELIVERED at the decision: the hour containing (decision − 10 min), open = its first minute,
//                    close = the last minute delivered (≥ 10 min old) — what the script's request.security(…,"60",…) shows live, delayed
//   whale bull/bear (gold chart) = WTI NOT bullish / WTI bullish
//   choch_short    = close < the last CONFIRMED 5/5 pivot low (a pivot exists only once its 5 right bars have closed)
//   BUY  = buy_wall_hit AND whale_bull AND NOT dxy_bullish AND close > open
//   SELL = sell_wall_hit AND whale_bear AND dxy_bullish AND choch_short
//   plan BUY  entry = close, SL = lowest(low,5) − 0.50, reward = max(10, 2·risk), TP1 = entry + reward, TP2 = entry + 1.5·reward (SELL mirrored)
// Any missing input (no DXY bar, no delivered WTI minute) = NO SIGNAL (fail closed).
// ════════════════════════════════════════════════════════════════════════════════
import { atr as atrArr } from '../core/indicators.js'

export const MATRIX = Object.freeze({ tf: '3m', tfMs: 180000, look: 45, ext: 1.272, int886: 0.886, cushionAtr: 1.5, slPad: 0.5, minReward: 10, rr: 2, tp2Mult: 1.5,
  pivot: 5, dxyEma: 10, wtiDelayMs: 10 * 60000, horizonMin: 1440 })

/** EMA over closes keyed by time (seeded by the first value — Pine's ta.ema behaviour on a full history). */
export function emaSeries(bars, n) { const k = 2 / (n + 1); const out = new Map(); let e = null; for (const b of bars) { e = e == null ? b.c : b.c * k + e * (1 - k); out.set(b.t, e) } return out }

/**
 * WTI 1h candle as DELIVERED at decision time T (ms): hour of (T − delay), open = first minute of that hour, close = last minute with
 * t + 60 s ≤ T − delay. `wti1m` ascending. Returns null if nothing delivered for that hour.
 */
export function wtiHourAt(wti1m, T, { delayMs = MATRIX.wtiDelayMs } = {}) {
  const cut = T - delayMs, H = Math.floor(cut / 3600000) * 3600000
  let lo = 0, hi = wti1m.length; while (lo < hi) { const m = (lo + hi) >> 1; if (wti1m[m].t < H) lo = m + 1; else hi = m }
  if (lo >= wti1m.length || wti1m[lo].t >= cut || wti1m[lo].t >= H + 3600000) return null
  let j = lo; while (j + 1 < wti1m.length && wti1m[j + 1].t + 60000 <= cut) j++
  if (wti1m[j].t + 60000 > cut) return null
  return { hourT: H, o: wti1m[lo].o, c: wti1m[j].c, lastMinuteT: wti1m[j].t, bullish: wti1m[j].c > wti1m[lo].o }
}

/** The Matrix walls at bar i (45 bars INCLUDING i). `a` = ATR14 at i. ONE place: the signal and the chart's 3m structure both use it. */
export function matrixLevelsAt(B, a, i) {
  const M = MATRIX; if (i < M.look - 1 || !(a > 0)) return null
  let hh = -Infinity, ll = Infinity; for (let k = i - M.look + 1; k <= i; k++) { if (B[k].h > hh) hh = B[k].h; if (B[k].l < ll) ll = B[k].l }
  const span = hh - ll; if (!(span > 0)) return null
  const ceiling = hh + span * (M.ext - 1), floor = ll - span * (M.ext - 1), intWall = hh - span * M.int886, cushion = M.cushionAtr * a
  // a BUY wall touch is low ≤ max(floor, intWall) + cushion = intWall + cushion (intWall = ll + 0.114·span > floor); SELL: high ≥ ceiling − cushion
  return { hh, ll, span, ceiling, floor, intWall, cushion, sellLine: ceiling - cushion, buyLine: Math.max(floor, intWall) + cushion }
}

/** Confirmed 5/5 pivots: a pivot at j becomes KNOWN at bar j + pivot (its right bars closed). lastLowAt[i]/lastHighAt[i] = latest known
 *  at bar i; `lows`/`highs` = every confirmed pivot { j, knownAt, px } (for the chart's swing structure). */
export function confirmedPivots(B, P = MATRIX.pivot) {
  const lastLowAt = new Float64Array(B.length).fill(NaN), lastHighAt = new Float64Array(B.length).fill(NaN), lows = [], highs = []
  let lastPL = NaN, lastPH = NaN
  for (let i = 0; i < B.length; i++) {
    const j = i - P
    if (j >= P) { let isPL = true, isPH = true
      for (let m = 1; m <= P; m++) { if (!(B[j].l < B[j - m].l && B[j].l < B[j + m].l)) isPL = false; if (!(B[j].h > B[j - m].h && B[j].h > B[j + m].h)) isPH = false; if (!isPL && !isPH) break }
      if (isPL) { lastPL = B[j].l; lows.push({ j, knownAt: i, t: B[j].t, px: B[j].l }) }
      if (isPH) { lastPH = B[j].h; highs.push({ j, knownAt: i, t: B[j].t, px: B[j].h }) } }
    lastLowAt[i] = lastPL; lastHighAt[i] = lastPH
  }
  return { lastLowAt, lastHighAt, lows, highs }
}

/**
 * Evaluate the matrix on ascending CLOSED 3m gold bars. dxy3m: ascending DXY 3m bars (same grid). wti1m: ascending WTI 1m bars.
 * @param {{from?:number}} o  evaluate only bars with index ≥ from (warm-up still uses the earlier bars)
 * @returns {Array<{i, t, decisionT, side, entry, sl, tp1, tp2, risk, reward, atr, ctx}>} every bar where BUY or SELL is true
 */
// maxMiss (default 0 = the script exactly): a TEST-ONLY variant (validate_ferrari_matrix.mjs MATRIX_VARIANT=onemiss) — the wall is always
// required; of the other three conditions (WTI, DXY, candle colour / CHoCH) up to `maxMiss` may fail. The live tick never passes it.
/**
 * WATCH ("almost ready") at closed bar i — ONE place for the live chart label (matrix_tick) and study_matrix_prep_alert.mjs (2026-10-16).
 * Context per side (WTI as delivered + DXY vs EMA10, the signal's own formulas) and the distance of the bar's extreme to the wall in ATR
 * (BUY: (low − buyLine)/ATR, SELL: (sellLine − high)/ATR; ≤ 0 = wall touched). WATCH = context aligned AND dist ≤ MATRIX.watchK, no signal.
 * MEASURED (docs §3 (ar), post-hoc, NOT a pass): at −0.25 ATR, BUY watches became a BUY signal within 20 bars (60 min) 82.3 % of the time
 * (OOS n 1815, median lead 6 min); SELL watches 0/41 (the SELL trigger almost never fires) → the live label is BUY-only. Chart only (Ashraf).
 */
export function matrixArmedAt(B, A, i, dByT, dEma, wti1m) {
  const b = B[i], a = A[i], L = a ? matrixLevelsAt(B, a, i) : null, d = dByT.get(b.t), de = dEma.get(b.t)
  if (!L || !d || de == null) return null
  const w = wtiHourAt(wti1m, b.t + MATRIX.tfMs); if (!w) return null
  return { buyCtx: !w.bullish && d.c < de, sellCtx: w.bullish && d.c > de, buyDist: (b.l - L.buyLine) / a, sellDist: (L.sellLine - b.h) / a, buyLine: L.buyLine, sellLine: L.sellLine }
}
export const WATCH = Object.freeze({ side: 'BUY', k: -0.25, bars: 20, conversion: 0.8226, oos_n: 1815, lead_min: 6, source: 'data/master/matrix_prep_alert_posthoc.json (post-hoc, not a pass)' })

// sellRule (2026-10-16, SELL study docs/MATRIX_SELL_SPEC.md): the SELL trigger condition. 'choch' = close below the last confirmed swing low
// (Ashraf's Pine rule — THE LIVE DEFAULT); 'red' = red candle (the mirror of the BUY's green candle); 'prevlow' = close below the previous bar's low.
export function matrixSignals(B, dxy3m, wti1m, { from = 0, useWti = true, maxMiss = 0, sellRule = 'choch' } = {}) {   // useWti=false: the REPORT-only variant without the whale filter
  const M = MATRIX, A = atrArr(B, 14), dEma = emaSeries(dxy3m, M.dxyEma), dByT = new Map(dxy3m.map((b) => [b.t, b]))
  const out = []
  const lastPivotLowAt = confirmedPivots(B).lastLowAt
  for (let i = Math.max(from, M.look + 20); i < B.length; i++) {
    const b = B[i], a = A[i]; if (!a) continue
    const L = matrixLevelsAt(B, a, i); if (!L) continue
    const { ceiling, floor, intWall, cushion } = L
    const sellWall = b.h >= ceiling - cushion, buyWall = b.l <= floor + cushion || b.l <= intWall + cushion
    if (!sellWall && !buyWall) continue
    const d = dByT.get(b.t), de = dEma.get(b.t); if (!d || de == null) continue          // DXY bar for the same bucket required
    const decisionT = b.t + M.tfMs
    const w = useWti ? wtiHourAt(wti1m, decisionT) : { bullish: null }; if (!w) continue    // WTI as delivered required
    const dxyBull = d.c > de, whaleBull = useWti ? !w.bullish : true, whaleBear = useWti ? w.bullish : true
    const chochShort = Number.isFinite(lastPivotLowAt[i]) && b.c < lastPivotLowAt[i]
    const fails = (xs) => xs.filter((x) => !x).length
    const buy = buyWall && fails([whaleBull, !dxyBull, b.c > b.o]) <= maxMiss
    const sellTrig = sellRule === 'red' ? b.c < b.o : sellRule === 'prevlow' ? b.c < B[i - 1].l : chochShort
    const sell = !buy && sellWall && fails([whaleBear, dxyBull, sellTrig]) <= maxMiss
    if (!buy && !sell) continue
    let lo5 = Infinity, hi5 = -Infinity; for (let k = i - 4; k <= i; k++) { if (B[k].l < lo5) lo5 = B[k].l; if (B[k].h > hi5) hi5 = B[k].h }
    const side = buy ? 'BUY' : 'SELL', entry = b.c, sl = buy ? lo5 - M.slPad : hi5 + M.slPad, risk = Math.abs(entry - sl), reward = Math.max(M.minReward, M.rr * risk)
    out.push({ i, t: b.t, decisionT, side, entry, sl, tp1: buy ? entry + reward : entry - reward, tp2: buy ? entry + M.tp2Mult * reward : entry - M.tp2Mult * reward, risk, reward, atr: a,
      ctx: { ceiling, floor, intWall, cushion, dxy: d.c, dxyEma: de, wti: useWti ? { hourT: w.hourT, o: w.o, c: w.c, lastMinuteT: w.lastMinuteT } : null, chochShort, lastPivotLow: lastPivotLowAt[i] } })
  }
  return out
}

/**
 * The 3m STRUCTURE at the last closed bar, for the chart (display — the signal itself is matrixSignals): the walls a box needs, the
 * confirmed swing points, the swing structure, and the checklist of every BUY / SELL condition with its current state (same formulas).
 */
export function matrixStructure(B, dxy3m, wti1m) {
  const M = MATRIX, i = B.length - 1; if (i < M.look + 20) return null
  const A = atrArr(B, 14), b = B[i], L = matrixLevelsAt(B, A[i], i); if (!L) return null
  const P = confirmedPivots(B), H = P.highs.slice(-2), Lo = P.lows.slice(-2)
  const swing = H.length === 2 && Lo.length === 2 ? (H[1].px > H[0].px && Lo[1].px > Lo[0].px ? 'BULLISH (higher highs + higher lows)' : H[1].px < H[0].px && Lo[1].px < Lo[0].px ? 'BEARISH (lower highs + lower lows)' : 'MIXED (range)') : 'not enough swings'
  const dEma = emaSeries(dxy3m, M.dxyEma), d = dxy3m.find((x) => x.t === b.t), de = dEma.get(b.t), decisionT = b.t + M.tfMs
  const w = wtiHourAt(wti1m, decisionT), dxyBull = d && de != null ? d.c > de : null
  const pl = P.lastLowAt[i]
  const buy = { wall: b.l <= L.floor + L.cushion || b.l <= L.intWall + L.cushion, wti_not_bullish: w ? !w.bullish : null, dxy_not_bullish: dxyBull == null ? null : !dxyBull, green_candle: b.c > b.o }
  const sell = { wall: b.h >= L.sellLine, wti_bullish: w ? w.bullish : null, dxy_bullish: dxyBull, close_below_swing_low: Number.isFinite(pl) ? b.c < pl : null }
  return { barT: b.t, close: b.c, atr: A[i], levels: { ...L }, lastSwingLow: Number.isFinite(pl) ? pl : null, lastSwingHigh: Number.isFinite(P.lastHighAt[i]) ? P.lastHighAt[i] : null,
    swing, pivots: [...P.highs.slice(-6).map((x) => ({ t: x.t, px: x.px, kind: 'H' })), ...P.lows.slice(-6).map((x) => ({ t: x.t, px: x.px, kind: 'L' }))].sort((x, y) => x.t - y.t),
    dxy: d && de != null ? { close: d.c, ema10: +de.toFixed(4), bullish: dxyBull } : null, wti: w ? { hourT: w.hourT, o: w.o, c: w.c, lastMinuteT: w.lastMinuteT, bullish: w.bullish } : null,
    buy, sell, distToBuyLine: +(b.c - L.buyLine).toFixed(2), distToSellLine: +(L.sellLine - b.c).toFixed(2) }
}

/**
 * Resolve one matrix trade on the 1m BID path (MONEY PATH): market entry at the decision (BUY pays the ask = close + spread; SELL receives
 * the bid = close); half closes at TP1 and the stop moves to the fill price (break-even); the other half runs to TP2. A SELL's exits are
 * BUY orders compared with bid + spread. Within one minute: stop first (pessimistic). Stop and break-even exits are market stops →
 * slippage min(0.30, 0.05·ATR3m). Remaining size closes at the horizon (24 h) at the market.
 * @param m1 ascending 1m bars starting at/after decisionT  @param spreadAt (t)→full spread
 * @returns {{done, outcome, pnl, legs, fill, exitT, events}}  done=false when the path ends before the trade does (live)
 */
export function resolveMatrixTrade(sig, m1, spreadAt, { horizonMin = MATRIX.horizonMin, nowT = Infinity } = {}) {
  const up = sig.side === 'BUY', s0 = spreadAt(sig.decisionT - 60000), fill = up ? sig.entry + s0 : sig.entry
  const slip = Math.min(0.30, 0.05 * (sig.atr || 0)), end = sig.decisionT + horizonMin * 60000
  const legs = [{ q: 0.5, open: true, pnl: null }, { q: 0.5, open: true, pnl: null }]
  let stop = sig.sl, tp1Hit = false, last = null; const events = []
  const pnlAt = (px) => (up ? px - fill : fill - px)
  for (const b of m1) {
    if (b.t < sig.decisionT) continue
    if (b.t >= end || b.t + 60000 > nowT) break
    last = b; const s = up ? 0 : spreadAt(b.t), hi = b.h + s, lo = b.l + s
    // 1) stop (or break-even stop) first
    if (up ? lo <= stop : hi >= stop) {
      const px = up ? stop - slip : stop + slip
      for (const L of legs) if (L.open) { L.open = false; L.pnl = pnlAt(px) }
      events.push({ t: b.t, kind: tp1Hit ? 'BE' : 'SL', px }); break
    }
    // 2) TP1 then TP2
    if (!tp1Hit && (up ? hi >= sig.tp1 : lo <= sig.tp1)) { tp1Hit = true; legs[0].open = false; legs[0].pnl = pnlAt(sig.tp1); stop = fill; events.push({ t: b.t, kind: 'TP1', px: sig.tp1 }) }
    if (tp1Hit && legs[1].open && (up ? hi >= sig.tp2 : lo <= sig.tp2)) { legs[1].open = false; legs[1].pnl = pnlAt(sig.tp2); events.push({ t: b.t, kind: 'TP2', px: sig.tp2 }); break }
  }
  const open = legs.some((L) => L.open)
  if (open && last && last.t + 60000 >= end) {   // horizon: close at the market
    const px = up ? last.c : last.c + spreadAt(last.t)
    for (const L of legs) if (L.open) { L.open = false; L.pnl = pnlAt(px) - slip }
    events.push({ t: last.t, kind: 'TIME', px })
  }
  const done = !legs.some((L) => L.open)
  const kinds = events.map((e) => e.kind)
  const outcome = !done ? 'OPEN' : kinds.includes('TP2') ? 'TP1+TP2' : kinds.includes('BE') ? 'TP1+BE' : kinds.includes('SL') ? 'SL' : kinds.includes('TP1') ? 'TP1+TIME' : 'TIME'
  const pnl = done ? +legs.reduce((sm, L) => sm + L.q * L.pnl, 0).toFixed(4) : null
  return { done, outcome, pnl, fill: +fill.toFixed(3), legs: legs.map((L) => ({ q: L.q, pnl: L.pnl == null ? null : +L.pnl.toFixed(4) })), exitT: done ? events.at(-1)?.t ?? null : null, events, tp1Hit }
}
