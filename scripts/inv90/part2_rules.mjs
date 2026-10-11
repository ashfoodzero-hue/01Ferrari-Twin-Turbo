// inv90/part2_rules.mjs — Part 2 fixed rules (docs/INVESTIGATION_90WR_2026-10-11.md): R1 trend pullback, R3a RSI, R3b Bollinger, R4 sweep,
// R5 London break — each on B1-B4, BUY and SELL in ONE book (one position at a time, ≤ 5/day), 2014-06 → 2026-10. No fitting.
// Output: data/inv90/part2_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, gate, DIR } from './gate.mjs'

const ds = loadDataset(), c = (k) => ds.col(k), g = (r, k) => ds.get(r, c(k)), all = [...Array(ds.n).keys()]
const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const days = new Set(all.map((r) => Math.floor(ds.T[r] / 86400000))).size
// R5: the first 15m close outside the Asian range after 07:00 UTC, once per day
const london = new Map(); { let day = -1, done = false
  for (const r of all) { const d = Math.floor(ds.T[r] / 86400000); if (d !== day) { day = d; done = false }
    if (done || !(g(r, 'hour') >= 7)) continue; const a = g(r, 'd_asiah'), b = g(r, 'd_asial'); if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    if (a > 0) { london.set(r, 'BUY'); done = true } else if (b < 0) { london.set(r, 'SELL'); done = true } } }
const RULES = {
  R1_trend_pullback: (r) => (g(r, 'st_1d') === 1 && g(r, 'st_1w') === 1 && g(r, 'd_vwap') <= -0.5 ? 'BUY' : g(r, 'st_1d') === -1 && g(r, 'st_1w') === -1 && g(r, 'd_vwap') >= 0.5 ? 'SELL' : null),
  R3a_rsi: (r) => (g(r, 'rsi_15m') < 30 && g(r, 'st_1d') === 1 ? 'BUY' : g(r, 'rsi_15m') > 70 && g(r, 'st_1d') === -1 ? 'SELL' : null),
  R3b_bollinger: (r) => (g(r, 'bz_15m') < -2 && g(r, 'st_1d') === 1 ? 'BUY' : g(r, 'bz_15m') > 2 && g(r, 'st_1d') === -1 ? 'SELL' : null),
  R4_sweep: (r) => (g(r, 'sweep_bull') === 1 ? 'BUY' : g(r, 'sweep_bear') === 1 ? 'SELL' : null),
  R5_london_break: (r) => london.get(r) ?? null,
}
const out = { at: new Date().toISOString(), rules: Object.keys(RULES), results: {} }
for (const [name, rule] of Object.entries(RULES)) for (let b = 1; b <= 4; b++) {
  const trades = []; let busy = -Infinity, day = -1, nd = 0
  for (const r of all) { const t = ds.T[r], d = Math.floor(t / 86400000); if (d !== day) { day = d; nd = 0 }
    if (t < busy || nd >= 5) continue; const side = rule(r); if (!side) continue
    const cand = `${side}_B${b}`; trades.push({ t, side, net: g(r, cand), net15: g(r, cand + '_x1.5') }); nd++; busy = t + g(r, 'dur_' + cand) * 60000 }
  const res = gate(trades, days, YEARS); res.by_side = Object.fromEntries(['BUY', 'SELL'].map((s) => { const x = trades.filter((q) => q.side === s); return [s, { n: x.length, wr: x.length ? +(x.filter((q) => q.net > 0).length / x.length).toFixed(4) : null, net: x.length ? +(x.reduce((a, q) => a + q.net, 0) / x.length).toFixed(3) : null }] }))
  out.results[`${name}|B${b}`] = res
  console.log(`${(name + ' B' + b).padEnd(22)} n ${String(res.n).padStart(6)} (${res.per_day}/day) WR ${res.wr} (LB ${res.wr_lb}) $/t ${res.net} [LB ${res.net_lb}] x1.5 ${res.net_x1_5} years+ ${res.positive_years} → ${res.verdict}`)
}
fs.writeFileSync(path.join(DIR, 'part2_results.json'), JSON.stringify(out, null, 1))
