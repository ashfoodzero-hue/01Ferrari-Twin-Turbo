// ════════════════════════════════════════════════════════════════════════════════
// inv90/build_dataset.mjs — the 90 % WR investigation dataset (2026-10-11; plan: docs/INVESTIGATION_90WR_2026-10-11.md, pre-registered).
// One row per closed 15m XAU bar (2014-06 → frozen tape): causal FEATURES + the measured money outcome of BUY and SELL in brackets B1-B4,
// at the measured spread and at spread × 1.5. Research only — nothing live reads this.
// Output: data/inv90/dataset.bin (Float32 rows) + dataset_meta.json (feature names, outcome columns, row count).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { loadBars } from '../../src/data/backfillReader.js'
import { atr, ema, rsi, adx } from '../../src/core/indicators.js'
import { makeSpreadAt } from '../../src/master/spreadModel.js'

const OUT = path.join(TURBO.root, 'data', 'inv90'); fs.mkdirSync(OUT, { recursive: true })
const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), START = Date.UTC(2014, 5, 1), LOAD = Date.UTC(2013, 6, 14)
const DAY = 86400000, H24 = DAY, BR = [[0.25, 2], [0.5, 3], [0.5, 2], [1, 1]], spread = makeSpreadAt()
const load = async (tf) => (await loadBars('XAUUSD', tf, { from: LOAD, to: TO })).bars
const M = await load('1m'), N = M.length
const mt = new Float64Array(N), mo = new Float64Array(N), mh = new Float64Array(N), ml = new Float64Array(N), mc = new Float64Array(N), mv = new Float64Array(N)
for (let i = 0; i < N; i++) { const b = M[i]; mt[i] = b.t; mo[i] = b.o; mh[i] = b.h; ml[i] = b.l; mc[i] = b.c; mv[i] = b.v || 0 }
const lbT = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
console.log('1m bars', N.toLocaleString())

// higher timeframes with their CLOSE times
const TF = {}
for (const [tf, ms] of [['15m', 900000], ['1h', 3600000], ['4h', 14400000], ['1d', DAY], ['1w', 7 * DAY]]) {
  const B = await load(tf), close = Float64Array.from(B.map((b) => b.t + ms))
  const e = Object.fromEntries([20, 50, 200].map((n) => [n, ema(B, n)])), r = rsi(B, 14), a = atr(B, 14)
  let bz = null; if (tf === '15m' || tf === '1h') { bz = new Float64Array(B.length).fill(NaN); for (let i = 19; i < B.length; i++) { let s = 0, q = 0; for (let k = i - 19; k <= i; k++) { s += B[k].c; q += B[k].c * B[k].c } const m = s / 20, sd = Math.sqrt(Math.max(0, q / 20 - m * m)); bz[i] = sd > 0 ? (B[i].c - m) / sd : 0 } }
  const ad = tf === '1h' ? adx(B, 14) : null
  TF[tf] = { B, close, e, r, a, bz, ad: ad ? (ad.adx ?? ad) : null }
  console.log(tf, B.length)
}
const lastClosed = (tf, T) => lbT(TF[tf].close, T + 1) - 1   // index of the last bar closed at or before T
const stack = (tf, i) => { const { B, e } = TF[tf]; const c = B[i].c, a = e[20][i], m = e[50][i], z = e[200][i]; if (a == null || m == null || z == null) return NaN; return c > a && a > m && m > z ? 1 : c < a && a < m && m < z ? -1 : 0 }
const wtrend = (i) => { const { B, e } = TF['1w']; const a = e[20][i], p = e[20][i - 4]; if (a == null || p == null) return NaN; return B[i].c > a && a > p ? 1 : B[i].c < a && a < p ? -1 : 0 }

// daily stats (UTC days ≥ 600 minutes) for previous-day H/L
const days = new Map(); for (let i = 0; i < N; i++) { const d = Math.floor(mt[i] / DAY) * DAY; let s = days.get(d); if (!s) days.set(d, (s = { d, n: 0, h: -Infinity, l: Infinity })); s.n++; if (mh[i] > s.h) s.h = mh[i]; if (ml[i] < s.l) s.l = ml[i] }
const fullDays = [...days.values()].filter((s) => s.n >= 600).sort((a, b) => a.d - b.d), fdT = Float64Array.from(fullDays.map((s) => s.d))
const prevDay = (d) => { const k = lbT(fdT, d) - 1; return k >= 0 ? fullDays[k] : null }
// calendar: high-impact releases
const CAL = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events.filter((e) => ['NFP', 'CPI', 'FOMC', 'PPI', 'RETAIL'].includes(e.type)).map((e) => e.t).sort((a, b) => a - b), CT = Float64Array.from(CAL)

const FEAT = ['r1', 'r4', 'r16', 'r96', ...['15m', '1h', '4h', '1d'].flatMap((tf) => [20, 50, 200].map((n) => `d_ema${n}_${tf}`)), 'sl_1h', 'sl_4h', 'sl_1d',
  'st_15m', 'st_1h', 'st_4h', 'st_1d', 'st_1w', 'rsi_15m', 'rsi_1h', 'rsi_4h', 'rsi_1d', 'bz_15m', 'bz_1h', 'adx_1h', 'd_vwap', 'pos_day', 'rng_day', 'd_pdh', 'd_pdl', 'd_pwh', 'd_pwl',
  'd_asiah', 'd_asial', 'sweep_bull', 'sweep_bear', 'atr15_rel', 'atr1h_rel', 'atr1d_pct', 'vol_rel', 'hour', 'wday', 'cal_since', 'cal_until', 'A']
const OUTC = []; for (const m of [1, 1.5]) for (const side of ['BUY', 'SELL']) for (let b = 0; b < 4; b++) OUTC.push(`${side}_B${b + 1}${m === 1 ? '' : '_x1.5'}`)
const DUR = ['BUY', 'SELL'].flatMap((sd) => [1, 2, 3, 4].map((b) => `dur_${sd}_B${b}`))
const W = FEAT.length + OUTC.length + DUR.length + 1   // + durations (minutes, measured spread) + time
console.log('features', FEAT.length, 'outcomes', OUTC.length)

// bracket simulation: one pass per (side, spread mult) over the 1m path, all four brackets at once. Returns net $ per oz.
function sim(k0, T, c, up, A, mult, out, off, doff = -1) {
  const s0 = mult * spread(T), entry = up ? c + s0 : c, slip = Math.min(0.3, 0.05 * A)
  const tg = BR.map(([t]) => (up ? entry + t * A : entry - t * A)), sp = BR.map(([, s]) => (up ? entry - s * A : entry + s * A)), done = [false, false, false, false]; let left = 4, k = k0
  for (; k < N && mt[k] < T + H24 && left; k++) { const s = mult * spread(mt[k])
    for (let b = 0; b < 4; b++) { if (done[b]) continue
      if (up ? ml[k] <= sp[b] : mh[k] + s >= sp[b]) { out[off + b] = -(Math.abs(entry - sp[b]) + slip); if (doff >= 0) out[doff + b] = (mt[k] - T) / 60000 + 1; done[b] = true; left--; continue }
      if (up ? mh[k] >= tg[b] : ml[k] + s <= tg[b]) { out[off + b] = BR[b][0] * A; if (doff >= 0) out[doff + b] = (mt[k] - T) / 60000 + 1; done[b] = true; left-- } } }
  if (left) { const j = Math.min(k, N) - 1, s = mult * spread(mt[j]), px = up ? mc[j] : mc[j] + s; for (let b = 0; b < 4; b++) if (!done[b]) { out[off + b] = up ? px - entry : entry - px; if (doff >= 0) out[doff + b] = 1440 } }
}

const B15 = TF['15m'].B, rows = [], times = []
let vwD = -1, vwPV = 0, vwV = 0, dayH = -Infinity, dayL = Infinity, asH = -Infinity, asL = Infinity, mk = 0
const a15 = TF['15m'].a, a1d = TF['1d'].a
for (let i = 100; i < B15.length; i++) {
  const T = TF['15m'].close[i]; if (T < START || T + H24 > TO) continue
  const k0 = lbT(mt, T); if (k0 <= 0 || k0 >= N || mt[k0 - 1] < T - 900000) continue   // the last minute of the bar must exist
  // advance the day accumulators through minute k0-1
  for (; mk < k0; mk++) { const d = Math.floor(mt[mk] / DAY) * DAY; if (d !== vwD) { vwD = d; vwPV = 0; vwV = 0; dayH = -Infinity; dayL = Infinity; asH = -Infinity; asL = Infinity }
    const tp = (mh[mk] + ml[mk] + mc[mk]) / 3, v = mv[mk] || 1; vwPV += tp * v; vwV += v; if (mh[mk] > dayH) dayH = mh[mk]; if (ml[mk] < dayL) dayL = ml[mk]
    if (mt[mk] - d < 7 * 3600000) { if (mh[mk] > asH) asH = mh[mk]; if (ml[mk] < asL) asL = ml[mk] } }
  const j1 = lastClosed('1h', T), j4 = lastClosed('4h', T), jd = lastClosed('1d', T), jw = lastClosed('1w', T)
  if (j1 < 30 || j4 < 30 || jd < 210 || jw < 30) continue
  const A = TF['1h'].a[j1]; if (!(A > 0) || a15[i] == null) continue
  const c = B15[i].c, f = new Float32Array(W).fill(NaN), x = (v) => (v == null || !Number.isFinite(v) ? NaN : v)
  let q = 0
  for (const n of [1, 4, 16, 96]) f[q++] = (c - B15[i - n].c) / A
  for (const [tf, j] of [['15m', i], ['1h', j1], ['4h', j4], ['1d', jd]]) for (const n of [20, 50, 200]) { const e = TF[tf].e[n][j]; f[q++] = e == null ? NaN : (c - e) / A }
  for (const [tf, j] of [['1h', j1], ['4h', j4], ['1d', jd]]) { const e = TF[tf].e[20]; f[q++] = e[j] != null && e[j - 5] != null ? (e[j] - e[j - 5]) / A : NaN }
  f[q++] = stack('15m', i); f[q++] = stack('1h', j1); f[q++] = stack('4h', j4); f[q++] = stack('1d', jd); f[q++] = wtrend(jw)
  f[q++] = x(TF['15m'].r[i]); f[q++] = x(TF['1h'].r[j1]); f[q++] = x(TF['4h'].r[j4]); f[q++] = x(TF['1d'].r[jd])
  f[q++] = x(TF['15m'].bz[i]); f[q++] = x(TF['1h'].bz[j1]); f[q++] = x(Array.isArray(TF['1h'].ad) ? TF['1h'].ad[j1] : NaN)
  f[q++] = vwV > 0 ? (c - vwPV / vwV) / A : NaN; f[q++] = dayH > dayL ? (c - dayL) / (dayH - dayL) : NaN; f[q++] = (dayH - dayL) / A
  const P = prevDay(vwD); f[q++] = P ? (c - P.h) / A : NaN; f[q++] = P ? (c - P.l) / A : NaN
  const pw = TF['1w'].B[jw]; f[q++] = (c - pw.h) / A; f[q++] = (c - pw.l) / A
  const afterAsia = T - vwD >= 7 * 3600000; f[q++] = afterAsia && asH > -Infinity ? (c - asH) / A : NaN; f[q++] = afterAsia && asL < Infinity ? (c - asL) / A : NaN
  let sb = 0, sr = 0; if (P) for (let k = i - 3; k <= i; k++) { if (B15[k].l < P.l && c > P.l) sb = 1; if (B15[k].h > P.h && c < P.h) sr = 1 }
  f[q++] = sb; f[q++] = sr
  let m15 = 0; for (let k = i - 99; k <= i; k++) m15 += a15[k] ?? 0; f[q++] = m15 > 0 ? a15[i] / (m15 / 100) : NaN
  let m1 = 0, n1 = 0; for (let k = j1 - 499; k <= j1; k++) if (k >= 0 && TF['1h'].a[k] != null) { m1 += TF['1h'].a[k]; n1++ } f[q++] = n1 ? A / (m1 / n1) : NaN
  let below = 0, nn = 0; for (let k = jd - 249; k <= jd; k++) if (k >= 0 && a1d[k] != null) { nn++; if (a1d[k] <= a1d[jd]) below++ } f[q++] = nn ? below / nn : NaN
  let vs = 0; for (let k = i - 20; k < i; k++) vs += B15[k].v || 0; f[q++] = vs > 0 ? (B15[i].v || 0) / (vs / 20) : NaN
  const dt = new Date(T); f[q++] = dt.getUTCHours() + dt.getUTCMinutes() / 60; f[q++] = dt.getUTCDay()
  const ce = lbT(CT, T + 1); f[q++] = ce > 0 ? Math.min(1440, (T - CT[ce - 1]) / 60000) : 1440; f[q++] = ce < CT.length ? Math.min(1440, (CT[ce] - T) / 60000) : 1440
  f[q++] = A
  if (q !== FEAT.length) throw new Error('feature count ' + q)
  let o = FEAT.length
  for (const m of [1, 1.5]) for (const up of [true, false]) { sim(k0, T, c, up, A, m, f, o, m === 1 ? FEAT.length + OUTC.length + (up ? 0 : 4) : -1); o += 4 }
  o += DUR.length
  f[o] = (T - START) / 60000   // minutes since START (exact in Float32 up to 2^24 min ≈ 31 y)
  rows.push(f); times.push(T); if (rows.length % 50000 === 0) console.log('rows', rows.length, new Date(T).toISOString().slice(0, 10))
}
const buf = Buffer.alloc(rows.length * W * 4); rows.forEach((r, n) => Buffer.from(r.buffer).copy(buf, n * W * 4))
fs.writeFileSync(path.join(OUT, 'dataset.bin'), buf)
fs.writeFileSync(path.join(OUT, 'dataset_times.bin'), Buffer.from(Float64Array.from(times).buffer))
fs.writeFileSync(path.join(OUT, 'dataset_meta.json'), JSON.stringify({ at: new Date().toISOString(), rows: rows.length, width: W, features: FEAT, outcomes: OUTC, durations: DUR, time_col: W - 1, time_unit: 'minutes since START', start: START, brackets: BR, plan: 'docs/INVESTIGATION_90WR_2026-10-11.md', spread_stats: spread.stats }, null, 1))
console.log('done rows', rows.length, 'width', W)
