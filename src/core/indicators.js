// ════════════════════════════════════════════════════════════════════════════════
// indicators.js — deterministic, causal indicators (no look-ahead).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2 core framework (2026-06-24).
// Every value at index i uses ONLY bars[0..i] (rule 2: deterministic math for
// structure; R3: no look-ahead). Returned arrays are aligned to `bars`.
// ════════════════════════════════════════════════════════════════════════════════

/** True Range of bar `cur` given previous bar `prev` (or null for the first bar). */
export function trueRange(cur, prev) {
  if (!prev) return cur.h - cur.l
  return Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c))
}

/**
 * Wilder ATR aligned to bars. atr[i] is null until `period` TRs exist, then uses
 * only bars up to i (causal). Standard Wilder smoothing.
 */
export function atr(bars, period = 14) {
  const out = new Array(bars.length).fill(null)
  if (bars.length < period + 1) return out
  let sum = 0
  for (let i = 1; i <= period; i++) sum += trueRange(bars[i], bars[i - 1])
  let prev = sum / period
  out[period] = prev
  for (let i = period + 1; i < bars.length; i++) {
    const tr = trueRange(bars[i], bars[i - 1])
    prev = (prev * (period - 1) + tr) / period
    out[i] = prev
  }
  return out
}

/** Simple moving average aligned to bars over `close`. sma[i] null until enough data. */
export function sma(bars, period, key = 'c') {
  const out = new Array(bars.length).fill(null)
  let sum = 0
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i][key]
    if (i >= period) sum -= bars[i - period][key]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

/** Exponential moving average aligned to bars (seeded by SMA of the first `period`). Causal. */
export function ema(bars, period, key = 'c') {
  const out = new Array(bars.length).fill(null)
  if (bars.length < period) return out
  const k = 2 / (period + 1)
  let seed = 0
  for (let i = 0; i < period; i++) seed += bars[i][key]
  let prev = seed / period
  out[period - 1] = prev
  for (let i = period; i < bars.length; i++) { prev = bars[i][key] * k + prev * (1 - k); out[i] = prev }
  return out
}

/** Wilder RSI aligned to bars. Causal; null until `period`+1 closes exist. */
export function rsi(bars, period = 14) {
  const out = new Array(bars.length).fill(null)
  if (bars.length < period + 1) return out
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) { const d = bars[i].c - bars[i - 1].c; if (d > 0) gain += d; else loss -= d }
  let ag = gain / period, al = loss / period
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  for (let i = period + 1; i < bars.length; i++) {
    const d = bars[i].c - bars[i - 1].c
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  }
  return out
}

/** MACD (fast/slow/signal EMAs) → { line, signal, hist }, each aligned & causal. */
export function macd(bars, fast = 12, slow = 26, signal = 9) {
  const ef = ema(bars, fast), es = ema(bars, slow)
  const line = bars.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null))
  const sig = new Array(bars.length).fill(null)
  const start = line.findIndex((x) => x != null)
  if (start >= 0) {
    const k = 2 / (signal + 1)
    let seed = 0, count = 0, prev = null
    for (let i = start; i < bars.length; i++) {
      if (prev == null) { seed += line[i]; count++; if (count === signal) { prev = seed / signal; sig[i] = prev } }
      else { prev = line[i] * k + prev * (1 - k); sig[i] = prev }
    }
  }
  const hist = bars.map((_, i) => (line[i] != null && sig[i] != null ? line[i] - sig[i] : null))
  return { line, signal: sig, hist }
}

/** Stochastic oscillator → { k, d }, aligned & causal. %K over kPeriod, %D = SMA(dPeriod) of %K. */
export function stochastic(bars, kPeriod = 14, dPeriod = 3) {
  const k = new Array(bars.length).fill(null)
  for (let i = kPeriod - 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) { hh = Math.max(hh, bars[j].h); ll = Math.min(ll, bars[j].l) }
    k[i] = hh === ll ? 50 : 100 * (bars[i].c - ll) / (hh - ll)
  }
  const d = new Array(bars.length).fill(null)
  for (let i = kPeriod - 1 + dPeriod - 1; i < bars.length; i++) {
    let s = 0; for (let j = i - dPeriod + 1; j <= i; j++) s += k[j]; d[i] = s / dPeriod
  }
  return { k, d }
}

// ── VOLATILITY / PHASE indicators (Contraction↔Expansion↔Trending engine, 2026-07-03) ──────────────────
/** Rolling population standard deviation of close, aligned to bars. Causal. */
export function stddev(bars, period = 20, key = 'c') {
  const out = new Array(bars.length).fill(null)
  for (let i = period - 1; i < bars.length; i++) {
    let m = 0; for (let j = i - period + 1; j <= i; j++) m += bars[j][key]; m /= period
    let v = 0; for (let j = i - period + 1; j <= i; j++) v += (bars[j][key] - m) ** 2
    out[i] = Math.sqrt(v / period)
  }
  return out
}

/** Bollinger Bands (mid=SMA, ±mult·σ) + normalized WIDTH = (upper-lower)/mid. Causal. */
export function bollinger(bars, period = 20, mult = 2) {
  const mid = sma(bars, period), sd = stddev(bars, period)
  const upper = [], lower = [], width = []
  for (let i = 0; i < bars.length; i++) {
    if (mid[i] == null || sd[i] == null) { upper[i] = lower[i] = width[i] = null; continue }
    upper[i] = mid[i] + mult * sd[i]; lower[i] = mid[i] - mult * sd[i]; width[i] = mid[i] ? (upper[i] - lower[i]) / mid[i] : null
  }
  return { mid, upper, lower, width }
}

/** Keltner Channels (mid=EMA, ±mult·ATR). Causal. */
export function keltner(bars, period = 20, mult = 1.5, atrPeriod = 14) {
  const mid = ema(bars, period), a = atr(bars, atrPeriod)
  const upper = [], lower = []
  for (let i = 0; i < bars.length; i++) { if (mid[i] == null || a[i] == null) { upper[i] = lower[i] = null; continue } upper[i] = mid[i] + mult * a[i]; lower[i] = mid[i] - mult * a[i] }
  return { mid, upper, lower }
}

/** TTM-style SQUEEZE: true where Bollinger Bands sit INSIDE Keltner Channels (volatility compressed). Causal. */
export function squeezeOn(bars, { bbPeriod = 20, bbMult = 2, kcPeriod = 20, kcMult = 1.5 } = {}) {
  const bb = bollinger(bars, bbPeriod, bbMult), kc = keltner(bars, kcPeriod, kcMult)
  return bars.map((_, i) => (bb.lower[i] == null || kc.lower[i] == null) ? null : (bb.lower[i] > kc.lower[i] && bb.upper[i] < kc.upper[i]))
}

/** Wilder's ADX (+DI/−DI) — trend-strength; low ADX = contraction/range, rising ADX = trending. Causal. */
export function adx(bars, period = 14) {
  const n = bars.length, out = { adx: new Array(n).fill(null), plusDI: new Array(n).fill(null), minusDI: new Array(n).fill(null) }
  if (n < 2 * period) return out
  let tr = 0, plusDM = 0, minusDM = 0
  for (let i = 1; i <= period; i++) {
    const up = bars[i].h - bars[i - 1].h, dn = bars[i - 1].l - bars[i].l
    plusDM += up > dn && up > 0 ? up : 0; minusDM += dn > up && dn > 0 ? dn : 0; tr += trueRange(bars[i], bars[i - 1])
  }
  let trS = tr, pS = plusDM, mS = minusDM
  const dx = []
  for (let i = period + 1; i < n; i++) {
    const up = bars[i].h - bars[i - 1].h, dn = bars[i - 1].l - bars[i].l
    trS = trS - trS / period + trueRange(bars[i], bars[i - 1])
    pS = pS - pS / period + (up > dn && up > 0 ? up : 0)
    mS = mS - mS / period + (dn > up && dn > 0 ? dn : 0)
    const pDI = trS ? 100 * pS / trS : 0, mDI = trS ? 100 * mS / trS : 0
    out.plusDI[i] = pDI; out.minusDI[i] = mDI
    const d = (pDI + mDI) ? 100 * Math.abs(pDI - mDI) / (pDI + mDI) : 0
    dx.push({ i, d })
  }
  // ADX = smoothed DX
  if (dx.length >= period) {
    let a = dx.slice(0, period).reduce((s, x) => s + x.d, 0) / period
    out.adx[dx[period - 1].i] = a
    for (let k = period; k < dx.length; k++) { a = (a * (period - 1) + dx[k].d) / period; out.adx[dx[k].i] = a }
  }
  return out
}

/** Percentile rank (0-1) of arr[i] within the trailing `look` window. Causal. null until enough history. */
export function rollingPercentile(arr, look = 100) {
  const out = new Array(arr.length).fill(null)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null || i < look) continue
    let below = 0, cnt = 0
    for (let j = i - look; j < i; j++) { if (arr[j] == null) continue; cnt++; if (arr[j] < arr[i]) below++ }
    if (cnt) out[i] = below / cnt
  }
  return out
}
