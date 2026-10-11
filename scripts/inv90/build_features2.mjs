// inv90/build_features2.mjs — Part 5b cross-market features (pre-registered in docs/INVESTIGATION_90WR_2026-10-11.md), aligned to the dataset rows.
// From CLOSED 15m / 1h bars at each row's decision time T: XAG r1/r4/r16, EURUSD r4/r16, USDJPY r4/r16 (each in its own ATR14(15m)), USD composite
// r16 = (USDJPY r16 − EURUSD r16)/2, gold/silver ratio z-score over 100 × 1h, gold − silver % return over 16 × 15m ÷ its 500-bar std.
// Output: data/inv90/features2.bin (Float32, 10 per row) + features2_meta.json
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { atr } from '../../src/core/indicators.js'
import { loadDataset, DIR } from './gate.mjs'

const ds = loadDataset(), L = { from: Date.UTC(2013, 6, 14), to: Date.parse('2026-10-09T06:00:00Z') }, NAMES = ['xag_r1', 'xag_r4', 'xag_r16', 'eur_r4', 'eur_r16', 'jpy_r4', 'jpy_r16', 'usd_r16', 'gsr_z', 'rel_gold_xag16']
const prep = async (sym, tf, ms) => { const B = (await loadBars(sym, tf, L)).bars; return { B, a: atr(B, 14), close: Float64Array.from(B.map((b) => b.t + ms)) } }
const idx = (X, T) => { let lo = 0, hi = X.close.length; while (lo < hi) { const m = (lo + hi) >> 1; if (X.close[m] <= T) lo = m + 1; else hi = m } return lo - 1 }
const S = { xag: await prep('XAGUSD', '15m', 900000), eur: await prep('EURUSD', '15m', 900000), jpy: await prep('USDJPY', '15m', 900000), gold: await prep('XAUUSD', '15m', 900000),
  xag1h: await prep('XAGUSD', '1h', 3600000), gold1h: await prep('XAUUSD', '1h', 3600000) }
const ret = (X, i, n) => (i - n >= 0 && X.a[i] > 0 ? (X.B[i].c - X.B[i - n].c) / X.a[i] : NaN)
const fresh = (X, i, T) => i >= 0 && T - X.close[i] <= 3600000   // the closed bar must be within the last hour (else the market was shut)
// rolling std of the gold − silver 16-bar % return difference (on gold's 15m index, aligned by close time)
const out = new Float32Array(ds.n * NAMES.length).fill(NaN), relHist = []
for (let r = 0; r < ds.n; r++) {
  const T = ds.T[r], f = (k, v) => { out[r * NAMES.length + k] = Number.isFinite(v) ? v : NaN }
  const ix = idx(S.xag, T), ie = idx(S.eur, T), ij = idx(S.jpy, T), ig = idx(S.gold, T)
  if (fresh(S.xag, ix, T)) { f(0, ret(S.xag, ix, 1)); f(1, ret(S.xag, ix, 4)); f(2, ret(S.xag, ix, 16)) }
  if (fresh(S.eur, ie, T)) { f(3, ret(S.eur, ie, 4)); f(4, ret(S.eur, ie, 16)) }
  if (fresh(S.jpy, ij, T)) { f(5, ret(S.jpy, ij, 4)); f(6, ret(S.jpy, ij, 16)) }
  if (fresh(S.eur, ie, T) && fresh(S.jpy, ij, T)) f(7, (ret(S.jpy, ij, 16) - ret(S.eur, ie, 16)) / 2)
  const hx = idx(S.xag1h, T), hg = idx(S.gold1h, T)
  if (hx >= 100 && hg >= 100 && fresh(S.xag1h, hx, T) && fresh(S.gold1h, hg, T)) { const rs = []; for (let k = 0; k < 100; k++) { const g = S.gold1h.B[hg - k], x = S.xag1h.B[hx - k]; if (x.c > 0) rs.push(g.c / x.c) }
    const m = rs.reduce((a, b) => a + b, 0) / rs.length, sd = Math.sqrt(rs.reduce((a, b) => a + (b - m) ** 2, 0) / rs.length); f(8, sd > 0 ? (rs[0] - m) / sd : NaN) }
  if (fresh(S.xag, ix, T) && ig >= 16 && ix >= 16) { const d = S.gold.B[ig].c / S.gold.B[ig - 16].c - S.xag.B[ix].c / S.xag.B[ix - 16].c
    if (relHist.length >= 100) { const m = relHist.reduce((a, b) => a + b, 0) / relHist.length, sd = Math.sqrt(relHist.reduce((a, b) => a + (b - m) ** 2, 0) / relHist.length); f(9, sd > 0 ? d / sd : NaN) }
    relHist.push(d); if (relHist.length > 500) relHist.shift() }
  if (r % 50000 === 0) console.log('row', r)
}
fs.writeFileSync(path.join(DIR, 'features2.bin'), Buffer.from(out.buffer)); fs.writeFileSync(path.join(DIR, 'features2_meta.json'), JSON.stringify({ at: new Date().toISOString(), names: NAMES, width: NAMES.length }, null, 1))
const cover = NAMES.map((nm, k) => [nm, +(out.filter((_, q) => q % NAMES.length === k && Number.isFinite(out[q])).length / ds.n).toFixed(3)]); console.log('coverage', JSON.stringify(cover))
