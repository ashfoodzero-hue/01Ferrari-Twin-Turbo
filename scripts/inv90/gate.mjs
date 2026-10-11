// inv90/gate.mjs — the ONE trade policy + the pre-registered gate of docs/INVESTIGATION_90WR_2026-10-11.md (G1-G5). 2026-10-11.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'

export const K = 28, ALPHA = 0.05 / K
export const Z = 2.9135   // one-sided normal quantile at 1 − 0.05/28
export const DIR = path.join(TURBO.root, 'data', 'inv90')
export function loadDataset() {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'dataset_meta.json'), 'utf8')), W = meta.width, n = meta.rows
  const raw = fs.readFileSync(path.join(DIR, 'dataset.bin')), D = new Float32Array(raw.buffer, raw.byteOffset, n * W)
  const T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0))
  const col = (name) => { const i = meta.features.indexOf(name); if (i >= 0) return i; const o = meta.outcomes.indexOf(name); if (o >= 0) return meta.features.length + o
    const d = meta.durations.indexOf(name); if (d >= 0) return meta.features.length + meta.outcomes.length + d; throw new Error('no column ' + name) }
  return { meta, W, n, D, T, col, get: (r, c) => D[r * W + c] }
}
/** Policy: rows in time order; a row with sig(r) true is taken if no position is open (open until T + duration) and < 5 trades that UTC day. */
export function policy(ds, rows, sig, cand) {
  const net = ds.col(cand), net15 = ds.col(cand + '_x1.5'), dur = ds.col('dur_' + cand), out = []; let busy = -Infinity, day = -1, nd = 0
  for (const r of rows) { const t = ds.T[r], d = Math.floor(t / 86400000); if (d !== day) { day = d; nd = 0 }
    if (t < busy || nd >= 5 || !sig(r)) continue
    out.push({ t, net: ds.get(r, net), net15: ds.get(r, net15) }); nd++; busy = t + ds.get(r, dur) * 60000 }
  return out
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
export const zOf = (k) => { const a = 0.05 / k; let lo = 0, hi = 10; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, t = 1 / (1 + 0.2316419 * m), d = 0.3989423 * Math.exp(-m * m / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); if (q > a) lo = m; else hi = m } return (lo + hi) / 2 }
export function wilsonLB(w, n, z = Z) { if (!n) return 0; const p = w / n, z2 = z * z; return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n) }
/** G1-G5 on OOS trades. tradingDays = the number of UTC days with data in the OOS window; years = the OOS years. */
export function gate(trades, tradingDays, years, k = K) {
  const alpha = 0.05 / k, z = k === K ? Z : zOf(k)
  const n = trades.length, w = trades.filter((x) => x.net > 0).length, mean = n ? trades.reduce((s, x) => s + x.net, 0) / n : 0, rnd = seeded(99)
  const boots = []; for (let b = 0; b < 10000 && n; b++) { let s = 0; for (let j = 0; j < n; j++) s += trades[(rnd() * n) | 0].net; boots.push(s / n) }; boots.sort((a, b) => a - b)
  const byYear = {}; for (const y of years) byYear[y] = { n: 0, w: 0, net: 0 }
  for (const x of trades) { const y = new Date(x.t).getUTCFullYear(); if (byYear[y]) { byYear[y].n++; byYear[y].net += x.net; if (x.net > 0) byYear[y].w++ } }
  const posYears = Object.values(byYear).filter((v) => v.n && v.net > 0).length, m15 = n ? trades.reduce((s, x) => s + x.net15, 0) / n : 0
  const res = { n, per_day: +(n / tradingDays).toFixed(3), wr: n ? +(w / n).toFixed(4) : null, wr_lb: +wilsonLB(w, n, z).toFixed(4), net: +mean.toFixed(4), net_lb: n ? +boots[Math.floor(alpha * boots.length)].toFixed(4) : null, k,
    net_x1_5: +m15.toFixed(4), positive_years: `${posYears}/${years.length}`,
    by_year: Object.fromEntries(Object.entries(byYear).map(([y, v]) => [y, { n: v.n, wr: v.n ? +(v.w / v.n).toFixed(3) : null, net: v.n ? +(v.net / v.n).toFixed(3) : null }])) }
  res.G = { G1_freq: res.per_day >= 1, G2_wr: res.wr >= 0.9 && res.wr_lb >= 0.88, G3_money: res.net_lb > 0, G4_years: posYears >= Math.ceil(0.8 * years.length), G5_spread: m15 > 0 }
  const g = res.G; res.verdict = g.G2_wr && g.G3_money && g.G4_years && g.G5_spread ? (g.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY') : 'FAIL'
  return res
}
