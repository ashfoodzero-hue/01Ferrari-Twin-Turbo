// inv90/part7_freq.mjs — Part 7b (docs/INVESTIGATION_90WR_2026-10-11.md, pre-registered): FREQUENCY-ANCHORED threshold. For year Y the threshold is
// the HIGHEST score whose D1 policy trades over the pooled earlier OOS years (2016 … Y−1) average ≥ 1.0 per trading day; the WR this frequency
// gets in Y is then measured. Books: BUY_D1-x (Part 5b scores), BUY_D1-xs, SELL_D1-xs (Part 7a), and the two-sided xs book (a row where both
// sides qualify takes neither). D1 policy: ≤ 5 open, ≤ 5 new/day, ≥ 1 h apart. Weekly block bounds, α = 0.05/67. Output: part7_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, DIR } from './gate.mjs'

const ds = loadDataset(), O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0))
const DAY = 86400000, WEEK = 7 * DAY, ALPHA = 0.05 / 67, SWAP = 0.3, YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const oc = (r, side, k) => OD[r * O.width + O.cols.indexOf(`${side}_D1_${k}`)]
const byYear = {}; for (let r = 0; r < ds.n; r++) (byYear[new Date(ds.T[r]).getUTCFullYear()] ||= []).push(r)
const daysOf = (rows) => new Set(rows.map((r) => Math.floor(ds.T[r] / DAY))).size
const load = (f) => new Float32Array(fs.readFileSync(path.join(DIR, f)).buffer.slice(0))
// sideOf(r) → 'BUY' | 'SELL' | null given per-side thresholds
function policy(rows, sideOf) {
  const out = [], open = []; let day = -1, nd = 0, last = -Infinity
  for (const r of rows) { const t = ds.T[r], d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 }
    const side = sideOf(r); if (!side) continue; const net = oc(r, side, 'net'); if (!Number.isFinite(net)) continue
    while (open.length && open[0] <= t) open.shift(); if (nd >= 5 || open.length >= 5 || t - last < 3600000) continue
    open.push(t + oc(r, side, 'dur') * 60000); open.sort((a, b) => a - b); nd++; last = t; out.push({ t, side, net, net15: oc(r, side, 'net15'), nights: oc(r, side, 'nights') }) }
  return out
}
const QG = Array.from({ length: 80 }, (_, i) => 0.0005 * Math.pow(1.11, i)).filter((q) => q <= 0.9)   // threshold quantiles, high → low
function anchor(prev, S, side) {   // highest threshold giving ≥ 1.0 trade/day on the pooled earlier years
  const sc = prev.map((r) => S[r]).filter(Number.isFinite).sort((a, b) => b - a), days = daysOf(prev)
  for (const q of QG) { const th = sc[Math.max(0, Math.floor(q * sc.length) - 1)]; if (th == null) continue
    const tr = policy(prev, (r) => (S[r] >= th ? side : null)); if (tr.length / days >= 1.0) return { q: +q.toFixed(5), thr: th, prev_per_day: +(tr.length / days).toFixed(3), prev_wr: +(tr.filter((x) => x.net > 0).length / tr.length).toFixed(4) } }
  return null
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function blockLB(tr, f) { const wk = new Map(); for (const x of tr) { const k = Math.floor(x.t / WEEK); (wk.get(k) || wk.set(k, []).get(k)).push(x) }
  const B = [...wk.values()], rnd = seeded(31), bs = []; for (let b = 0; b < 5000; b++) { let s = 0, n = 0; for (let i = 0; i < B.length; i++) for (const x of B[(rnd() * B.length) | 0]) { s += f(x); n++ } bs.push(s / n) }
  bs.sort((a, b) => a - b); return bs[Math.floor(ALPHA * bs.length)] }
function summarize(tr) {
  const n = tr.length, w = tr.filter((x) => x.net > 0).length, mean = n ? tr.reduce((s, x) => s + x.net, 0) / n : 0, td = daysOf(YEARS.flatMap((Y) => byYear[Y]))
  const yr = {}; for (const Y of YEARS) yr[Y] = [0, 0, 0]; for (const x of tr) { const y = yr[new Date(x.t).getUTCFullYear()]; y[0]++; y[2] += x.net; if (x.net > 0) y[1]++ }
  const posY = Object.values(yr).filter((v) => v[0] && v[2] > 0).length, m15 = n ? tr.reduce((s, x) => s + x.net15, 0) / n : 0, mSw = n ? tr.reduce((s, x) => s + x.net - SWAP * x.nights, 0) / n : 0
  const res = { n, per_day: +(n / td).toFixed(3), wr: n ? +(w / n).toFixed(4) : null, wr_lb_block: n ? +blockLB(tr, (x) => (x.net > 0 ? 1 : 0)).toFixed(4) : null, net: +mean.toFixed(3), net_lb_block: n ? +blockLB(tr, (x) => x.net).toFixed(3) : null,
    net_swap_0_30: +mSw.toFixed(3), net_x1_5: +m15.toFixed(3), positive_years: `${posY}/10`, by_year: Object.fromEntries(Object.entries(yr).map(([y, [k, ww, s]]) => [y, k ? `${k} t ${(100 * ww / k).toFixed(1)}% $${(s / k).toFixed(2)}` : '0'])) }
  const G = { G1_freq: res.per_day >= 1, G2_wr: res.wr >= 0.9 && res.wr_lb_block >= 0.88, G3_money: res.net_lb_block > 0, G4_years: posY >= 8, G5_spread: m15 > 0 }
  res.G = G; const core = G.G2_wr && G.G3_money && G.G4_years && G.G5_spread
  res.verdict = !core ? 'FAIL' : !(mSw > 0) ? 'PASS (swap-dependent)' : G.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY'
  res.ashraf_target_92_and_1_per_day = res.wr >= 0.92 && res.per_day >= 1
  return res
}
const books = { 'BUY_D1-x': { BUY: 'scores_BUY_D1_x.bin' }, 'BUY_D1-xs': { BUY: 'scores_BUY_D1_xs.bin' }, 'SELL_D1-xs': { SELL: 'scores_SELL_D1_xs.bin' }, 'TWO_SIDED_D1-xs': { BUY: 'scores_BUY_D1_xs.bin', SELL: 'scores_SELL_D1_xs.bin' } }
const out = { at: new Date().toISOString(), alpha: ALPHA, books: {} }
for (const [name, files] of Object.entries(books)) {
  const S = Object.fromEntries(Object.entries(files).map(([sd, f]) => [sd, load(f)])), tr = [], picks = {}
  for (const Y of YEARS) { const prev = Object.keys(byYear).map(Number).filter((y) => y >= 2016 && y < Y).flatMap((y) => byYear[y])
    const th = Object.fromEntries(Object.keys(S).map((sd) => [sd, anchor(prev, S[sd], sd)])); picks[Y] = th
    tr.push(...policy(byYear[Y], (r) => { const q = Object.keys(S).filter((sd) => th[sd] && S[sd][r] >= th[sd].thr); return q.length === 1 ? q[0] : null })) }
  const res = summarize(tr); out.books[name] = { picks, ...res }
  console.log(`${name.padEnd(16)} n ${res.n} (${res.per_day}/day) WR ${res.wr} (blockLB ${res.wr_lb_block}) $/t ${res.net} [blockLB ${res.net_lb_block}] swap0.3 ${res.net_swap_0_30} x1.5 ${res.net_x1_5} years+ ${res.positive_years} → ${res.verdict} · 92%&1/day: ${res.ashraf_target_92_and_1_per_day}`)
  console.log('                ', JSON.stringify(res.by_year))
}
fs.writeFileSync(path.join(DIR, 'part7_results.json'), JSON.stringify(out, null, 1))
