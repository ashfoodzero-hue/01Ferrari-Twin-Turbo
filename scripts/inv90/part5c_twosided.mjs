// inv90/part5c_twosided.mjs — Part 5c (pre-registered): BUY and SELL in ONE book for B1 and D1, each side with its own Part 5b threshold
// (pooled rule, from part1_pooled_x_results.json / part4_pooled_x_results.json); a row where both sides qualify takes neither.
// B1: one position at a time, ≤ 5/day. D1: ≤ 5 open, ≤ 5 new/day, ≥ 1 h apart. K = 59. Output: part5c_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, gate, DIR } from './gate.mjs'
const ds = loadDataset(), DAY = 86400000, YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
const O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0))
const P1 = JSON.parse(fs.readFileSync(path.join(DIR, 'part1_pooled_x_results.json'), 'utf8')).candidates, P4 = JSON.parse(fs.readFileSync(path.join(DIR, 'part4_pooled_x_results.json'), 'utf8')).candidates
const sc = (c) => { const f = path.join(DIR, `scores_${c}_x.bin`); return fs.existsSync(f) ? new Float32Array(fs.readFileSync(f).buffer.slice(0)) : null }
const rows = [...Array(ds.n).keys()].filter((r) => YEARS.includes(new Date(ds.T[r]).getUTCFullYear())), days = new Set(rows.map((r) => Math.floor(ds.T[r] / DAY))).size
const out = { at: new Date().toISOString(), results: {} }
for (const [b, P, isD] of [['B1', P1, false], ['D1', P4, true]]) {
  const SB = sc('BUY_' + b), SS = sc('SELL_' + b), pb = P['BUY_' + b]?.picks || {}, ps = P['SELL_' + b]?.picks || {}
  const val = (r, side, k) => (isD ? OD[r * O.width + O.cols.indexOf(`${side}_${b}_${k}`)] : ds.get(r, ds.col(k === 'net' ? `${side}_${b}` : k === 'net15' ? `${side}_${b}_x1.5` : `dur_${side}_${b}`)))
  const trades = [], open = []; let day = -1, nd = 0, last = -Infinity
  for (const r of rows) { const t = ds.T[r], Y = new Date(t).getUTCFullYear(), d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 }
    const qb = Boolean(SB && pb[Y] && SB[r] >= pb[Y].thr), qs = Boolean(SS && ps[Y] && SS[r] >= ps[Y].thr); if (qb === qs) continue
    const side = qb ? 'BUY' : 'SELL', net = val(r, side, 'net'); if (!Number.isFinite(net)) continue
    while (open.length && open[0] <= t) open.shift(); if (nd >= 5 || (isD ? open.length >= 5 || t - last < 3600000 : open.length >= 1)) continue
    open.push(t + val(r, side, 'dur') * 60000); open.sort((a, c) => a - c); nd++; last = t; trades.push({ t, side, net, net15: val(r, side, 'net15') }) }
  const res = gate(trades, days, YEARS, 59); out.results[b] = res
  console.log(`two-sided ${b}: n ${res.n} (${res.per_day}/day) WR ${res.wr} (LB ${res.wr_lb}) $/t ${res.net} [LB ${res.net_lb}] x1.5 ${res.net_x1_5} years+ ${res.positive_years} → ${res.verdict} · BUY ${trades.filter((x) => x.side === 'BUY').length} SELL ${trades.filter((x) => x.side === 'SELL').length}`)
}
fs.writeFileSync(path.join(DIR, 'part5c_results.json'), JSON.stringify(out, null, 1))
