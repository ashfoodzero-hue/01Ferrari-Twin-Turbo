// inv90/audit_outcomes2.mjs — independent re-simulation of 150 random rows of outcomes2 (I1/I2/D1/D2, both sides) + base rates by year and the
// spread / swap share. Plain loop; shares only the loaders with build_outcomes2.mjs. Output: data/inv90/audit_outcomes2.json
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { atr } from '../../src/core/indicators.js'
import { makeSpreadAt } from '../../src/master/spreadModel.js'
import { loadDataset, DIR } from './gate.mjs'
const ds = loadDataset(), O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0)), DAY = 86400000, HR = 3600000
const sp = makeSpreadAt(), L = { from: Date.UTC(2013, 6, 14), to: Date.parse('2026-10-09T06:00:00Z') }
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t)), lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const atrX = async (tf, ms) => { const B = (await loadBars('XAUUSD', tf, L)).bars, a = atr(B, 14), c = B.map((b) => b.t + ms); return (T) => { let i = -1; for (let lo = 0, hi = c.length; lo < hi;) { const m = (lo + hi) >> 1; if (c[m] <= T) { i = m; lo = m + 1 } else hi = m } return a[i] } }
const H4 = await atrX('4h', 4 * HR), D1 = await atrX('1d', DAY)
let s = 777; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
let checked = 0; const bad = []
for (let q = 0; q < 150; q++) { const r = Math.floor(rnd() * ds.n), T = ds.T[r], k0 = lb(MT, T), c = M[k0 - 1].c
  for (const [bi, [name, tm, sm, u]] of O.brackets.entries()) for (const up of [true, false]) {
    const stored = OD[r * O.width + O.cols.indexOf(`${up ? 'BUY' : 'SELL'}_${name}_net`)]
    const U = u === 'H' ? H4(T) : D1(T), hour = (T % DAY) / HR, end = u === 'H' ? Math.floor(T / DAY) * DAY + 20 * HR + 55 * 60000 : T + 7 * DAY
    if (u === 'H' ? hour >= 18 : T + 7 * DAY > MT[MT.length - 1]) { if (Number.isFinite(stored)) bad.push({ r, name, up, why: 'should be NaN' }); continue }
    const e = up ? c + sp(T) : c, tg = up ? e + tm * U : e - tm * U, st = up ? e - sm * U : e + sm * U; let res = null, k = k0
    for (; k < M.length; k++) { const b = M[k], s1 = sp(b.t); if (b.t >= end) { const j = M[k - 1]; res = up ? j.c - e : e - (j.c + sp(j.t)); break }
      if (up ? b.l <= st : b.h + s1 >= st) { res = -(sm * U + Math.min(0.3, 0.05 * U)); break } if (up ? b.h >= tg : b.l + s1 <= tg) { res = tm * U; break } }
    checked++; if (!(Math.abs(res - stored) <= 1e-3 * Math.max(1, Math.abs(res)))) bad.push({ r, name, up, stored, res }) } }
console.log('re-simulated', checked, 'mismatches', bad.length, JSON.stringify(bad.slice(0, 3)))
const base = {}
for (const c of O.cols.filter((x) => x.endsWith('_net'))) { const ci = O.cols.indexOf(c), ni = O.cols.indexOf(c.replace('_net', '_nights')), y = {}
  for (let r = 0; r < ds.n; r++) { const v = OD[r * O.width + ci]; if (!Number.isFinite(v)) continue; const yr = new Date(ds.T[r]).getUTCFullYear(); (y[yr] ||= [0, 0, 0, 0]); y[yr][0]++; if (v > 0) y[yr][1]++; y[yr][2] += v; y[yr][3] += OD[r * O.width + ni] }
  base[c] = Object.fromEntries(Object.entries(y).map(([k, [n, w, sum, ng]]) => [k, `${(100 * w / n).toFixed(1)}% $${(sum / n).toFixed(2)} nights ${(ng / n).toFixed(2)}`])) }
for (const [c, v] of Object.entries(base)) console.log(c.padEnd(12), Object.entries(v).map(([y, x]) => `${y}:${x}`).join(' | '))
fs.writeFileSync(path.join(DIR, 'audit_outcomes2.json'), JSON.stringify({ at: new Date().toISOString(), checked, mismatches: bad.length, examples: bad.slice(0, 5), base }, null, 1))
