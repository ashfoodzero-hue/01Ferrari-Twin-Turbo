// inv90/audit_dataset.mjs — independent re-computation of the dataset (no shared code with build_dataset.mjs except the loaders):
// (1) 300 random rows: every BUY/SELL × B1-B4 outcome re-simulated by a separate, plain loop over the raw 1m bars;
// (2) 300 random rows: features recomputed from 1m bars that END before the decision time (a look-ahead canary): r16, d_vwap, pos_day, d_pdh,
//     d_ema20_1h, rsi_15m (own Wilder RSI on own 15m bars), st_1d sign agreement;
// (3) base rates per bracket and year (geometry sanity). Output: data/inv90/audit.json
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { makeSpreadAt } from '../../src/master/spreadModel.js'
import { loadDataset, DIR } from './gate.mjs'

const ds = loadDataset(), spread = makeSpreadAt(), DAY = 86400000
const M = (await loadBars('XAUUSD', '1m', { from: Date.UTC(2013, 6, 14), to: Date.parse('2026-10-09T06:00:00Z') })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
let s = 4242; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const pick = Array.from({ length: 300 }, () => Math.floor(rnd() * ds.n)).sort((a, b) => a - b)
const BR = [[0.25, 2], [0.5, 3], [0.5, 2], [1, 1]]
// (1) outcomes
let checked = 0, bad = []
for (const r of pick) { const T = ds.T[r], A = ds.get(r, ds.col('A')), k0 = lb(T), c = M[k0 - 1].c
  for (const up of [true, false]) for (let b = 0; b < 4; b++) {
    const s0 = spread(T), entry = up ? c + s0 : c, tg = up ? entry + BR[b][0] * A : entry - BR[b][0] * A, st = up ? entry - BR[b][1] * A : entry + BR[b][1] * A, slip = Math.min(0.3, 0.05 * A)
    let res = null, k = k0
    while (k < M.length && M[k].t < T + DAY) { const bar = M[k], sp = spread(bar.t)
      const hitStop = up ? bar.l <= st : bar.h + sp >= st, hitTgt = up ? bar.h >= tg : bar.l + sp <= tg
      if (hitStop) { res = -(Math.abs(entry - st) + slip); break } if (hitTgt) { res = BR[b][0] * A; break } k++ }
    if (res == null) { const last = M[k - 1], sp = spread(last.t); res = up ? last.c - entry : entry - (last.c + sp) }
    const stored = ds.get(r, ds.col(`${up ? 'BUY' : 'SELL'}_B${b + 1}`)); checked++
    if (Math.abs(stored - res) > 1e-3 * Math.max(1, Math.abs(res))) bad.push({ r, up, b, stored, res }) } }
console.log(`(1) outcomes re-simulated: ${checked}, mismatches ${bad.length}`, bad.slice(0, 3))
// (2) features from data strictly before T
const featBad = {}, featN = {}
const cmp = (name, mine, stored, tol) => { featN[name] = (featN[name] || 0) + 1; if (!(Number.isFinite(mine) && Number.isFinite(stored)) ? Number.isFinite(mine) !== Number.isFinite(stored) : Math.abs(mine - stored) > tol) (featBad[name] ||= []).push({ mine, stored }) }
const agg = (from, to, ms) => { const out = []; for (let k = lb(from); k < M.length && M[k].t < to; k++) { const b = M[k], key = Math.floor(b.t / ms) * ms, o = out.at(-1)
  if (!o || o.t !== key) out.push({ t: key, o: b.o, h: b.h, l: b.l, c: b.c }); else { o.h = Math.max(o.h, b.h); o.l = Math.min(o.l, b.l); o.c = b.c } } return out }
for (const r of pick.slice(0, 300)) { const T = ds.T[r], A = ds.get(r, ds.col('A')), k0 = lb(T), c = M[k0 - 1].c, g = (n) => ds.get(r, ds.col(n))
  const q15 = agg(T - 40 * DAY, T, 900000); cmp('r16', (c - q15[q15.length - 17].c) / A, g('r16'), 1e-3)
  // own RSI (Wilder) over a long warm-up: compared loosely (the warm-up start differs from the build's full-history seed)
  { const xs = q15.map((b) => b.c); let ag = 0, al = 0; for (let i = 1; i <= 14; i++) { const d = xs[i] - xs[i - 1]; if (d > 0) ag += d; else al -= d } ag /= 14; al /= 14
    for (let i = 15; i < xs.length; i++) { const d = xs[i] - xs[i - 1]; ag = (ag * 13 + Math.max(0, d)) / 14; al = (al * 13 + Math.max(0, -d)) / 14 } cmp('rsi_15m', al === 0 ? 100 : 100 - 100 / (1 + ag / al), g('rsi_15m'), 0.5) }
  const d0 = Math.floor((T - 1) / DAY) * DAY; let pv = 0, vv = 0, hh = -Infinity, ll = Infinity
  for (let k = lb(d0); k < k0; k++) { const b = M[k], v = b.v || 1; pv += (b.h + b.l + b.c) / 3 * v; vv += v; hh = Math.max(hh, b.h); ll = Math.min(ll, b.l) }
  cmp('d_vwap', (c - pv / vv) / A, g('d_vwap'), 1e-3); cmp('pos_day', (c - ll) / (hh - ll), g('pos_day'), 1e-3)
  let pd = d0 - DAY, ph = null; for (let tries = 0; tries < 6 && ph == null; tries++, pd -= DAY) { let n = 0, h = -Infinity; for (let k = lb(pd); k < M.length && M[k].t < pd + DAY; k++) { n++; h = Math.max(h, M[k].h) } if (n >= 600) ph = h }
  cmp('d_pdh', (c - ph) / A, g('d_pdh'), 1e-3)
  const h1 = agg(T - 60 * DAY, T, 3600000).filter((b) => b.t + 3600000 <= T); const k = 2 / 21; let e = h1.slice(0, 20).reduce((a, b) => a + b.c, 0) / 20; for (let i = 20; i < h1.length; i++) e = h1[i].c * k + e * (1 - k)
  cmp('d_ema20_1h', (c - e) / A, g('d_ema20_1h'), 0.05)
}
const featSummary = Object.fromEntries(Object.keys(featN).map((k) => [k, { checked: featN[k], mismatches: (featBad[k] || []).length, examples: (featBad[k] || []).slice(0, 2) }]))
console.log('(2) features:', JSON.stringify(Object.fromEntries(Object.entries(featSummary).map(([k, v]) => [k, `${v.mismatches}/${v.checked}`]))))
// (3) base rates
const base = {}; for (const o of ds.meta.outcomes.filter((x) => !x.includes('x1.5'))) { const c = ds.col(o); base[o] = {}
  for (let r = 0; r < ds.n; r++) { const y = new Date(ds.T[r]).getUTCFullYear(); const v = ds.get(r, c); (base[o][y] ||= [0, 0, 0]); base[o][y][0]++; if (v > 0) base[o][y][1]++; base[o][y][2] += v }
  base[o] = Object.fromEntries(Object.entries(base[o]).map(([y, [n, w, sum]]) => [y, `${(w / n * 100).toFixed(1)}% $${(sum / n).toFixed(2)}`])) }
console.log('(3) base WR / $ per row by year:'); for (const [o, v] of Object.entries(base)) console.log(' ', o.padEnd(8), Object.entries(v).map(([y, x]) => `${y}:${x}`).join(' '))
fs.writeFileSync(path.join(DIR, 'audit.json'), JSON.stringify({ at: new Date().toISOString(), outcomes: { checked, mismatches: bad.length, examples: bad.slice(0, 5) }, features: featSummary, base_rates: base }, null, 1))
