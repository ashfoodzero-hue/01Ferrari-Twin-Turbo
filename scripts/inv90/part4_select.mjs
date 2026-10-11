// inv90/part4_select.mjs — Part 4 selection + gate (docs/INVESTIGATION_90WR_2026-10-11.md, pre-registered before the first run).
// I brackets: one position at a time, ≤ 5/day. D brackets: ≤ 5 open at once, ≤ 5 new per day, ≥ 1 h between entries.
// Threshold for Y from Y−1's own OOS scores (lowest with WR ≥ 92 %, mean > 0, n ≥ 30). Bounds: weekly BLOCK bootstrap at α = 0.05/36.
// Swap (unmeasured): D results at swap 0 and $0.30/oz/night; positive only at 0 → "PASS (swap-dependent)". Output: part4_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, DIR } from './gate.mjs'
const POOLED = process.argv.includes('--pooled'), SFX = process.argv.includes('--x') ? '_x' : '', WRQ = +((process.argv.find((a) => a.startsWith('--wr=')) || '--wr=0.92').slice(5))   // Part 6a: --wr=0.90   // --x: Part 5b scores (cross-market features)   // Part 5a: threshold from ALL earlier OOS years (2016 … Y−1)

const ds = loadDataset(), O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0))
const oc = (r, name) => OD[r * O.width + O.cols.indexOf(name)], ALPHA = 0.05 / (WRQ !== 0.92 ? 61 : POOLED ? 59 : 36), WEEK = 7 * 86400000, DAY = 86400000, SWAP = 0.3
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], QS = [0.0005, 0.001, 0.002, 0.003, 0.005, 0.0075, 0.01, 0.015, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.5]
const byYear = {}; for (let r = 0; r < ds.n; r++) (byYear[new Date(ds.T[r]).getUTCFullYear()] ||= []).push(r)
const tradingDays = new Set(YEARS.flatMap((Y) => byYear[Y]).map((r) => Math.floor(ds.T[r] / DAY))).size
function policy(rows, sig, cand) {
  const D = /D\d$/.test(cand), out = [], open = []; let day = -1, nd = 0, last = -Infinity
  for (const r of rows) { const t = ds.T[r], d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 }
    const net = oc(r, cand + '_net'); if (!Number.isFinite(net) || !sig(r)) continue
    while (open.length && open[0] <= t) open.shift()
    if (nd >= 5 || (D ? open.length >= 5 || t - last < 3600000 : open.length >= 1)) continue
    const end = t + oc(r, cand + '_dur') * 60000; open.push(end); open.sort((a, b) => a - b); nd++; last = t
    out.push({ t, net, net15: oc(r, cand + '_net15'), nights: oc(r, cand + '_nights') }) }
  return out
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function blockLB(trades, f) {   // weekly block bootstrap of the mean of f(trade) → the α quantile
  const wk = new Map(); for (const x of trades) { const k = Math.floor(x.t / WEEK); (wk.get(k) || wk.set(k, []).get(k)).push(x) }
  const B = [...wk.values()], rnd = seeded(31), bs = []
  for (let b = 0; b < 5000; b++) { let s = 0, n = 0; for (let i = 0; i < B.length; i++) { const blk = B[(rnd() * B.length) | 0]; for (const x of blk) { s += f(x); n++ } } bs.push(s / n) }
  bs.sort((a, b) => a - b); return bs[Math.floor(ALPHA * bs.length)]
}
const out = { at: new Date().toISOString(), alpha: ALPHA, swap_per_night_sensitivity: SWAP, candidates: {} }
for (const cand of ['BUY', 'SELL'].flatMap((s) => ['I1', 'I2', 'D1', 'D2'].map((b) => `${s}_${b}`))) {
  if (!fs.existsSync(path.join(DIR, `scores_${cand}${SFX}.bin`))) continue
  const S = new Float32Array(fs.readFileSync(path.join(DIR, `scores_${cand}${SFX}.bin`)).buffer.slice(0)), trades = [], picks = {}
  for (const Y of YEARS) {
    const prev = POOLED ? Object.keys(byYear).map(Number).filter((y) => y >= 2016 && y < Y).flatMap((y) => byYear[y]) : byYear[Y - 1], sc = prev.map((r) => S[r]).filter(Number.isFinite).sort((a, b) => b - a); picks[Y] = null
    for (const q of [...QS].reverse()) { const th = sc[Math.max(0, Math.floor(q * sc.length) - 1)]; if (th == null) continue
      const tr = policy(prev, (r) => S[r] >= th, cand), w = tr.filter((x) => x.net > 0).length, m = tr.reduce((s, x) => s + x.net, 0) / Math.max(1, tr.length)
      if (tr.length >= 30 && w / tr.length >= WRQ && m > 0) { picks[Y] = { q, thr: th, prev_n: tr.length, prev_wr: +(w / tr.length).toFixed(3) }; break } }
    if (picks[Y]) trades.push(...policy(byYear[Y], (r) => S[r] >= picks[Y].thr, cand))
  }
  const n = trades.length, w = trades.filter((x) => x.net > 0).length, mean = n ? trades.reduce((s, x) => s + x.net, 0) / n : 0, isD = /D\d$/.test(cand)
  const meanSwap = n ? trades.reduce((s, x) => s + x.net - SWAP * x.nights, 0) / n : 0, m15 = n ? trades.reduce((s, x) => s + x.net15, 0) / n : 0
  const yr = {}; for (const Y of YEARS) yr[Y] = { n: 0, w: 0, net: 0 }; for (const x of trades) { const y = yr[new Date(x.t).getUTCFullYear()]; y.n++; y.net += x.net; if (x.net > 0) y.w++ }
  const posY = Object.values(yr).filter((v) => v.n && v.net > 0).length
  const res = { n, per_day: +(n / tradingDays).toFixed(3), wr: n ? +(w / n).toFixed(4) : null, wr_lb_block: n ? +blockLB(trades, (x) => (x.net > 0 ? 1 : 0)).toFixed(4) : null, net: +mean.toFixed(3),
    net_lb_block: n ? +blockLB(trades, (x) => x.net).toFixed(3) : null, net_swap_0_30: isD ? +meanSwap.toFixed(3) : null, net_x1_5: +m15.toFixed(3), positive_years: `${posY}/10`, thresholds_set: Object.values(picks).filter(Boolean).length,
    by_year: Object.fromEntries(Object.entries(yr).map(([y, v]) => [y, v.n ? `${v.n} t ${(100 * v.w / v.n).toFixed(1)}% $${(v.net / v.n).toFixed(2)}` : '0'])) }
  const G = { G1_freq: res.per_day >= 1, G2_wr: res.wr >= 0.9 && res.wr_lb_block >= 0.88, G3_money: res.net_lb_block > 0, G4_years: posY >= 8, G5_spread: m15 > 0 }
  const core = G.G2_wr && G.G3_money && G.G4_years && G.G5_spread
  res.G = G; res.verdict = !core ? 'FAIL' : (isD && !(meanSwap > 0) ? 'PASS (swap-dependent)' : G.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY')
  out.candidates[cand] = { picks, ...res }
  console.log(`${cand.padEnd(8)} n ${n} (${res.per_day}/day) WR ${res.wr} (blockLB ${res.wr_lb_block}) $/t ${res.net} [blockLB ${res.net_lb_block}]${isD ? ' swap0.3 ' + res.net_swap_0_30 : ''} x1.5 ${res.net_x1_5} years+ ${res.positive_years} thr ${res.thresholds_set}/10 → ${res.verdict}`)
  console.log('         ', JSON.stringify(res.by_year))
}
fs.writeFileSync(path.join(DIR, (POOLED ? 'part4_pooled' : 'part4') + SFX + (WRQ !== 0.92 ? '_wr' + WRQ : '') + '_results.json'), JSON.stringify(out, null, 1))
