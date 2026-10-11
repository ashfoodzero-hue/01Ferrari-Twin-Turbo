// inv90/diag_buyd1_drift.mjs — DIAGNOSTIC (no verdict): is the closest candidate (BUY_D1 with cross-market features, pooled threshold) more than
// "buy gold in an uptrend"? Same D1 policy (≤ 5 open, ≤ 5 new/day, ≥ 1 h apart), 2017-2026, against: (a) ALWAYS BUY, (b) BUY when the 1d AND 1w
// trends are BULL, (c) the model. Per year WR / $ / n. Output: diag_buyd1_drift.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, DIR } from './gate.mjs'
const ds = loadDataset(), DAY = 86400000, YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0))
const v = (r, k) => OD[r * O.width + O.cols.indexOf('BUY_D1_' + k)], S = new Float32Array(fs.readFileSync(path.join(DIR, 'scores_BUY_D1_x.bin')).buffer.slice(0))
const picks = JSON.parse(fs.readFileSync(path.join(DIR, 'part4_pooled_x_results.json'), 'utf8')).candidates.BUY_D1.picks
const rows = [...Array(ds.n).keys()].filter((r) => YEARS.includes(new Date(ds.T[r]).getUTCFullYear()))
const run = (sig) => { const tr = [], open = []; let day = -1, nd = 0, last = -Infinity
  for (const r of rows) { const t = ds.T[r], d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 } const net = v(r, 'net'); if (!Number.isFinite(net) || !sig(r)) continue
    while (open.length && open[0] <= t) open.shift(); if (nd >= 5 || open.length >= 5 || t - last < 3600000) continue
    open.push(t + v(r, 'dur') * 60000); open.sort((a, b) => a - b); nd++; last = t; tr.push({ t, net }) }
  const by = {}; for (const x of tr) { const y = new Date(x.t).getUTCFullYear(); (by[y] ||= [0, 0, 0]); by[y][0]++; if (x.net > 0) by[y][1]++; by[y][2] += x.net }
  return { n: tr.length, wr: +(tr.filter((x) => x.net > 0).length / tr.length).toFixed(4), net: +(tr.reduce((s, x) => s + x.net, 0) / tr.length).toFixed(3),
    by_year: Object.fromEntries(Object.entries(by).map(([y, [n, w, s]]) => [y, `${n} t ${(100 * w / n).toFixed(1)}% $${(s / n).toFixed(2)}`])) } }
const g = (r, k) => ds.get(r, ds.col(k))
const res = { always_buy: run(() => true), trend_1d_1w_bull: run((r) => g(r, 'st_1d') === 1 && g(r, 'st_1w') === 1),
  model_years_with_threshold: run((r) => { const Y = new Date(ds.T[r]).getUTCFullYear(); return picks[Y] && S[r] >= picks[Y].thr }),
  trend_same_years_as_model: run((r) => { const Y = new Date(ds.T[r]).getUTCFullYear(); return picks[Y] && g(r, 'st_1d') === 1 && g(r, 'st_1w') === 1 }),
  always_buy_same_years_as_model: run((r) => picks[new Date(ds.T[r]).getUTCFullYear()] != null) }
for (const [k, x] of Object.entries(res)) console.log(k.padEnd(32), `n ${x.n} WR ${x.wr} $/t ${x.net}`, JSON.stringify(x.by_year))
fs.writeFileSync(path.join(DIR, 'diag_buyd1_drift.json'), JSON.stringify({ at: new Date().toISOString(), res }, null, 1))
