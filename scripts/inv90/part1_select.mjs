// inv90/part1_select.mjs — Part 1 selection + gate (docs/INVESTIGATION_90WR_2026-10-11.md). Reads scores_<cand>.bin from walkforward.mjs.
// Threshold for year Y = the LOWEST score (largest trade set) whose policy trades in year Y−1 (that year's own out-of-sample scores) had
// WR ≥ 92 %, mean $ > 0 and ≥ 30 trades. None → no trades in Y. OOS = 2017 … 2026. Output: data/inv90/part1_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, policy, gate, DIR } from './gate.mjs'
const POOLED = process.argv.includes('--pooled'), SFX = process.argv.includes('--x') ? '_x' : ''   // --x: Part 5b scores (cross-market features)   // Part 5a: threshold from ALL earlier OOS years (2016 … Y−1)

const ds = loadDataset(), CANDS = ['BUY', 'SELL'].flatMap((s) => [1, 2, 3, 4].map((b) => `${s}_B${b}`)), YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const QS = [0.0005, 0.001, 0.002, 0.003, 0.005, 0.0075, 0.01, 0.015, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.5]
const yearRows = (Y) => { const a = []; for (let r = 0; r < ds.n; r++) { const y = new Date(ds.T[r]).getUTCFullYear(); if (y === Y) a.push(r) } return a }
const rowsBy = Object.fromEntries([2016, ...YEARS].map((Y) => [Y, yearRows(Y)]))
const daysIn = (rows) => new Set(rows.map((r) => Math.floor(ds.T[r] / 86400000))).size
const out = { at: new Date().toISOString(), rule: 'threshold from year Y-1 OOS scores: lowest with WR ≥ 92 %, mean > 0, n ≥ 30', candidates: {} }
for (const cand of CANDS) {
  const f = path.join(DIR, `scores_${cand}${SFX}.bin`); if (!fs.existsSync(f)) { console.log('missing', cand); continue }
  const S = new Float32Array(fs.readFileSync(f).buffer.slice(0)), trades = [], picks = {}
  for (const Y of YEARS) {
    const prev = POOLED ? Object.keys(rowsBy).map(Number).filter((y) => y < Y).flatMap((y) => rowsBy[y]) : rowsBy[Y - 1], sc = prev.map((r) => S[r]).filter(Number.isFinite).sort((a, b) => b - a); let thr = null
    for (const q of [...QS].reverse()) { const th = sc[Math.max(0, Math.floor(q * sc.length) - 1)]; if (th == null) continue
      const tr = policy(ds, prev, (r) => S[r] >= th, cand), w = tr.filter((x) => x.net > 0).length, m = tr.reduce((s, x) => s + x.net, 0) / Math.max(1, tr.length)
      if (tr.length >= 30 && w / tr.length >= 0.92 && m > 0) { thr = th; picks[Y] = { q, thr: +th.toFixed(4), prev_n: tr.length, prev_wr: +(w / tr.length).toFixed(3), prev_net: +m.toFixed(3) }; break } }
    if (thr == null) { picks[Y] = null; continue }
    trades.push(...policy(ds, rowsBy[Y], (r) => S[r] >= thr, cand))
  }
  const res = gate(trades, daysIn(YEARS.flatMap((Y) => rowsBy[Y])), YEARS, POOLED ? 59 : 28)
  out.candidates[cand] = { picks, ...res }
  console.log(`${cand.padEnd(8)} n ${res.n} (${res.per_day}/day) WR ${res.wr} (LB ${res.wr_lb}) $/t ${res.net} [LB ${res.net_lb}] x1.5 ${res.net_x1_5} years+ ${res.positive_years} → ${res.verdict} · thresholds set in ${Object.values(picks).filter(Boolean).length}/10 years`)
}
fs.writeFileSync(path.join(DIR, (POOLED ? 'part1_pooled' : 'part1') + SFX + '_results.json'), JSON.stringify(out, null, 1))
