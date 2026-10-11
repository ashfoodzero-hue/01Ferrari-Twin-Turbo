// inv90/part3_exits.mjs — Part 3 (docs/INVESTIGATION_90WR_2026-10-11.md): exit variants on the best Part 1 candidates (BUY_B1, SELL_B1) — the SAME
// selected entries (Part 1 thresholds per year, policy unchanged), re-simulated with (E1) BREAK-EVEN: after price reaches entry ± 0.5 × target,
// the stop moves to the entry; (E2) TIME EXIT at 4 h (market). Same gate (K grows by 4 → α 0.05/36 reported). Output: part3_results.json
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { makeSpreadAt } from '../../src/master/spreadModel.js'
import { loadDataset, policy, gate, DIR } from './gate.mjs'

const ds = loadDataset(), P1 = JSON.parse(fs.readFileSync(path.join(DIR, 'part1_results.json'), 'utf8')), spread = makeSpreadAt(), DAY = 86400000
const M = (await loadBars('XAUUSD', '1m', { from: Date.UTC(2014, 0, 1), to: Date.parse('2026-10-09T06:00:00Z') })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], BR = { B1: [0.25, 2] }
function sim(T, up, A, [tm, sm], mode, mult = 1) {
  const k0 = lb(T), c = M[k0 - 1].c, entry = up ? c + mult * spread(T) : c, tg = up ? entry + tm * A : entry - tm * A, half = up ? entry + 0.5 * tm * A : entry - 0.5 * tm * A, slip = Math.min(0.3, 0.05 * A)
  let st = up ? entry - sm * A : entry + sm * A, k = k0; const end = mode === 'E2' ? T + 4 * 3600000 : T + DAY
  for (; k < M.length && M[k].t < end; k++) { const b = M[k], s = mult * spread(b.t)
    if (up ? b.l <= st : b.h + s >= st) return (up ? st - entry : entry - st) - slip
    if (up ? b.h >= tg : b.l + s <= tg) return tm * A
    if (mode === 'E1' && (up ? b.h >= half : b.l + s <= half)) st = entry }
  const j = k - 1, px = up ? M[j].c : M[j].c + mult * spread(M[j].t); return up ? px - entry : entry - px
}
const out = { at: new Date().toISOString(), results: {} }, days = new Set([...Array(ds.n).keys()].filter((r) => new Date(ds.T[r]).getUTCFullYear() >= 2017).map((r) => Math.floor(ds.T[r] / DAY))).size
for (const cand of ['BUY_B1', 'SELL_B1']) {
  const S = new Float32Array(fs.readFileSync(path.join(DIR, `scores_${cand}.bin`)).buffer.slice(0)), picks = P1.candidates[cand].picks, up = cand.startsWith('BUY'), rows = []
  for (const Y of YEARS) { if (!picks[Y]) continue; const yr = [...Array(ds.n).keys()].filter((r) => new Date(ds.T[r]).getUTCFullYear() === Y), thr = picks[Y].thr
    const tr = policy(ds, yr, (r) => S[r] >= thr - 5e-5, cand); for (const x of tr) rows.push(x.t) }
  for (const mode of ['E1', 'E2']) {
    const trades = rows.map((t) => { const r = (() => { let lo = 0, hi = ds.n; while (lo < hi) { const m = (lo + hi) >> 1; if (ds.T[m] < t) lo = m + 1; else hi = m } return lo })(), A = ds.get(r, ds.col('A'))
      return { t, net: sim(t, up, A, BR.B1, mode), net15: sim(t, up, A, BR.B1, mode, 1.5) } })
    const res = gate(trades, days, YEARS); out.results[`${cand}|${mode}`] = res
    console.log(`${cand} ${mode}: n ${res.n} WR ${res.wr} (LB ${res.wr_lb}) $/t ${res.net} [LB ${res.net_lb}] x1.5 ${res.net_x1_5} years+ ${res.positive_years} → ${res.verdict}`)
  }
}
fs.writeFileSync(path.join(DIR, 'part3_results.json'), JSON.stringify(out, null, 1))
