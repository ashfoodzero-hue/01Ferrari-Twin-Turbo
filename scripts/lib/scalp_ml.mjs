// scalp_ml.mjs — ONE place for SCALP_SELL_ML_SPEC (2026-10-24): the causal 3m feature matrix (gold, 1m spikes, silver, DXY, time, cost), the per-row
// SELL labels priced by the live resolver, and the walk-forward GBDT (fit < Y−1, threshold on Y−1, trade Y). Used by study_scalp_sell_ml.mjs + its audit.
import { atr as atrArr } from '../../src/core/indicators.js'
import { resolveMatrixTrade } from '../../src/master/ferrariMatrix.js'
import { fitBins, binAll, train, predict } from '../inv90/gbdt.mjs'
import { EXITS } from './scalp_v2.mjs'

const MIN = 60000, BAR = 180000, DAY = 86400000
export const FEATURES = ['r1', 'r5', 'r20', 'r60', 'ema20', 'ema50', 'ema200', 'rsi14', 'rsi56', 'range_A', 'atr3_A', 'A_price', 'dayPos', 'prevH', 'prevL',
  'spike', 'spikeDir', 'goldOnly', 'sr1', 'sr5', 'sr20', 'sMinusG5', 'dr1', 'dr5', 'dr20', 'dxyBull', 'dxySlope', 'hour', 'weekday', 'dayMin', 'cost']
const ema = (c, n) => { const k = 2 / (n + 1), o = new Float64Array(c.length); let e = c[0]; for (let i = 0; i < c.length; i++) { e = i ? c[i] * k + e * (1 - k) : c[0]; o[i] = e } return o }
const rsi = (c, n) => { const o = new Float64Array(c.length).fill(NaN); let g = 0, l = 0
  for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0)
    if (i <= n) { g += up / n; l += dn / n; if (i === n) o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l) } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l) } }
  return o }
const series = (bars) => { const c = bars.map((b) => b.c), A = atrArr(bars, 14), at = new Map(bars.map((b, i) => [b.t, i])); return { c, A, at } }

/** Causal features for every 3m gold bar i (decision = B[i].t + 3 min). B = gold 3m, m1 = gold 1m, S3 / S1 = silver 3m / 1m, D = DXY 3m, ha = hourAtr(m1). */
export function buildFeatures({ B, m1, S1, S3, D, ha, spreadAt }) {
  const n = B.length, F = FEATURES.length, X = new Float32Array(n * F).fill(NaN), T = new Float64Array(n), Aarr = new Float64Array(n).fill(NaN)
  const c = B.map((b) => b.c), A3 = atrArr(B, 14), e20 = ema(c, 20), e50 = ema(c, 50), e200 = ema(c, 200), r14 = rsi(c, 14), r56 = rsi(c, 56)
  const S = series(S3), Dx = series(D), dE = ema(Dx.c, 10)
  // 1m spike ratio / direction / gold-only per minute (the v2 spike measures: range / ATR14(1m) of the bars BEFORE it, body ≥ 60 % for a direction)
  const A1 = atrArr(m1, 14), SA1 = atrArr(S1, 14), sAt = new Map(S1.map((b, k) => [b.t, k]))
  const mAt = (t) => { let a = 0, b = m1.length; while (a < b) { const m = (a + b) >> 1; if (m1[m].t < t) a = m + 1; else b = m } return a }
  // UTC-day high / low so far + previous day's
  let day = null, dHi = -Infinity, dLo = Infinity, pHi = NaN, pLo = NaN
  for (let i = 0; i < n; i++) { const b = B[i], t = b.t + BAR, o = i * F, d = Math.floor(b.t / DAY); T[i] = t
    if (d !== day) { if (day !== null) { pHi = dHi; pLo = dLo } day = d; dHi = -Infinity; dLo = Infinity }
    dHi = Math.max(dHi, b.h); dLo = Math.min(dLo, b.l)
    const h = ha.at(t); if (!h || i < 60) continue; const A = h.A; Aarr[i] = A
    const set = (k, v) => { X[o + k] = Number.isFinite(v) ? v : NaN }
    set(0, (c[i] - c[i - 1]) / A); set(1, (c[i] - c[i - 5]) / A); set(2, (c[i] - c[i - 20]) / A); set(3, (c[i] - c[i - 60]) / A)
    set(4, (c[i] - e20[i]) / A); set(5, (c[i] - e50[i]) / A); set(6, (c[i] - e200[i]) / A); set(7, r14[i]); set(8, r56[i])
    set(9, (b.h - b.l) / A); set(10, A3[i] / A); set(11, A / b.c); set(12, dHi > dLo ? (b.c - dLo) / (dHi - dLo) : NaN); set(13, (b.c - pHi) / A); set(14, (b.c - pLo) / A)
    let best = 0, dir = 0, only = 0
    for (let j = mAt(b.t); j < m1.length && m1[j].t < b.t + BAR; j++) { const m = m1[j], p = m1[j - 1]; if (!p || p.t !== m.t - MIN || !A1[j - 1]) continue
      const r = (m.h - m.l) / A1[j - 1]; if (r <= best) continue; best = r; dir = Math.abs(m.c - m.o) >= 0.6 * (m.h - m.l) ? Math.sign(m.c - m.o) : 0
      const k = sAt.get(m.t); only = k != null && k > 0 && S1[k - 1].t === m.t - MIN && SA1[k - 1] ? ((S1[k].h - S1[k].l) < 1.5 * SA1[k - 1] ? 1 : 0) : NaN }
    set(15, best); set(16, dir); set(17, only)
    const si = S.at.get(b.t); if (si != null && si >= 20 && S.A[si]) { const sa = S.A[si]; set(18, (S.c[si] - S.c[si - 1]) / sa); set(19, (S.c[si] - S.c[si - 5]) / sa); set(20, (S.c[si] - S.c[si - 20]) / sa)
      set(21, (S.c[si] - S.c[si - 5]) / sa - (c[i] - c[i - 5]) / A3[i]) }
    const di = Dx.at.get(b.t); if (di != null && di >= 20 && Dx.A[di]) { const da = Dx.A[di]; set(22, (Dx.c[di] - Dx.c[di - 1]) / da); set(23, (Dx.c[di] - Dx.c[di - 5]) / da); set(24, (Dx.c[di] - Dx.c[di - 20]) / da)
      set(25, Dx.c[di] > dE[di] ? 1 : 0); set(26, (dE[di] - dE[di - 1]) / da) }
    const dt = new Date(b.t); set(27, dt.getUTCHours()); set(28, dt.getUTCDay()); set(29, (b.t - d * DAY) / MIN); set(30, spreadAt(t - MIN) / (0.25 * A)) }
  return { X, F, n, T, A: Aarr }
}

/** SELL row → the live resolver's signal shape, for an exit. */
export function sellSig(B, i, A, exit, T) { const x = EXITS[exit], e = B[i].c
  return { i, t: B[i].t, decisionT: T, side: 'SELL', entry: e, sl: e + x.stop * A, tp1: e - x.tgt * A, tp2: e - x.tgt * A, risk: x.stop * A, reward: x.tgt * A, atr: A, ctx: {} } }
/** Per-row SELL net $ (unsequenced) by the live resolver; NaN where no A or the path is too short. */
export function labelRows({ B, m1, fe, exit, spreadAt, horizonMin = 1440 }) {
  const net = new Float64Array(fe.n).fill(NaN), T1 = m1.map((b) => b.t)
  const at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
  for (let i = 0; i < fe.n; i++) { if (!Number.isFinite(fe.A[i])) continue; const s = sellSig(B, i, fe.A[i], exit, fe.T[i]), k = at(s.decisionT)
    const r = resolveMatrixTrade(s, m1.slice(k, k + horizonMin + 5), spreadAt, { horizonMin }); if (r.done) net[i] = r.pnl }
  return net
}

/** Walk-forward (spec): for each Y, fit on rows ending ≥ 1 day before Y−1, threshold on Y−1, select in Y. Returns { selected rows, per-year log }.
 *  yOverride: labels used for TRAINING only (the shuffle control); extraX: an extra feature column (the oracle control). */
// capture (2026-10-25, the live paper test): years whose model + bin edges + threshold + selected rows (decision time, score) are returned in the log,
// so the LIVE model is exactly the walk-forward model measured for that year. Default none (results unchanged).
export function walkForward({ fe, net, years, maxTrain = 200000, seed = 7, yOverride = null, extraX = null, capture = [] }) {
  let { X, F, n, T } = fe
  if (extraX) { const X2 = new Float32Array(n * (F + 1)); for (let r = 0; r < n; r++) { for (let f = 0; f < F; f++) X2[r * (F + 1) + f] = X[r * F + f]; X2[r * (F + 1) + F] = extraX[r] } X = X2; F = F + 1 }
  const y = new Uint8Array(n); for (let r = 0; r < n; r++) y[r] = net[r] > 0 ? 1 : 0
  const yTrain = yOverride ?? y, ys = (Y) => Date.UTC(Y, 0, 1), sel = [], log = []; let s = seed >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  for (const Y of years) {
    const fitEnd = ys(Y - 1) - DAY, calFrom = ys(Y - 1), calEnd = ys(Y) - DAY, testFrom = ys(Y), testTo = ys(Y + 1)
    let rows = []; for (let r = 0; r < n; r++) if (T[r] + DAY < fitEnd + DAY && T[r] < fitEnd && Number.isFinite(net[r])) rows.push(r)
    if (rows.length > maxTrain) { for (let k = rows.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [rows[k], rows[j]] = [rows[j], rows[k]] } rows = rows.slice(0, maxTrain) }
    const leak = rows.some((r) => T[r] + DAY > calFrom)   // a training row's 24 h label window reaching the calibration year
    const edges = fitBins(X, n, F, rows), Xb = binAll(X, n, F, edges), model = train(Xb, n, F, yTrain, rows, { trees: 150, depth: 4, lr: 0.05, minLeaf: 300, sub: 0.5, seed: seed + Y })
    const cal = [], test = []; for (let r = 0; r < n; r++) { if (!Number.isFinite(net[r])) continue; if (T[r] >= calFrom && T[r] < calEnd) cal.push(r); else if (T[r] >= testFrom && T[r] < testTo) test.push(r) }
    const cs = cal.map((r) => predict(model, Xb, n, r)), sorted = [...cs].sort((a, b) => b - a); let cut = null, best = null
    for (const q of [0.001, 0.002, 0.005, 0.01, 0.02, 0.05]) { const thr = sorted[Math.max(0, Math.floor(q * sorted.length) - 1)]; if (thr == null) continue
      const pick = cal.filter((r, k) => cs[k] >= thr), w = pick.filter((r) => net[r] > 0).length, m = pick.reduce((a, r) => a + net[r], 0) / (pick.length || 1)
      if (pick.length >= 30 && w / pick.length >= 0.93 && m > 0 && (!best || pick.length > best.n)) { best = { q, thr, n: pick.length, wr: w / pick.length, usd: m }; cut = thr } }
    const picked = cut == null ? [] : test.filter((r) => predict(model, Xb, n, r) >= cut); sel.push(...picked)
    log.push({ year: Y, train_rows: rows.length, leak, cal_rows: cal.length, threshold: best, test_rows: test.length, selected: picked.length,
      ...(capture.includes(Y) ? { frozen: { model, edges: edges.map((e) => Array.from(e)), cut, fit_end: new Date(fitEnd).toISOString(), picked: picked.map((r) => [T[r], predict(model, Xb, n, r)]) } } : {}) }) }
  return { selected: sel.sort((a, b) => a - b), log }
}
