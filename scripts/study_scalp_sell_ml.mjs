// study_scalp_sell_ml.mjs — SCALP_SELL_ML_SPEC (written before any number, 2026-10-24; Ashraf: "a pre-registered machine-learning SELL model on 1m/3m
// features (gold, silver, DXY, time, spikes), 92% WR + profit, both periods, same audit"; "what about DXY when it is bullish" → DXY features included).
// Walk-forward GBDT SELL (scripts/lib/scalp_ml.mjs), exits X1 / X3, periods P1 2016-01 → 2021-06-30 and P2 → 2026-10-22, random SELL control; then the
// 5-part audit (independent resolver, feature prefix cuts, label-leak asserts, shuffled-label control, oracle control). READ-ONLY.
// → data/master/scalp_sell_ml_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { hourAtr } from './lib/scalp_v2.mjs'
import { FEATURES, buildFeatures, labelRows, walkForward, sellSig } from './lib/scalp_ml.mjs'
import { resolveIndependent } from './lib/independent_resolver.mjs'
import { blockBootstrapMean, wilson, rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), P1 = Date.parse('2016-01-01T00:00:00Z'), SPLIT = Date.parse('2021-06-30T00:00:00Z'), LAST2Y = Date.parse('2024-10-22T00:00:00Z')
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], K = 2, LEVEL = 1 - (2 * 0.05) / K, spreadAt = makeSpreadAt(), R = rng(2424)
const t0 = Date.now(), lap = (m) => console.log(`  [${Math.round((Date.now() - t0) / 1000)} s] ${m}`)
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] })
const B = first.B.filter((b) => b.t + 180000 <= TO), D = first.D, m1 = first.m1.filter((b) => b.t + 60000 <= TO), data = { B, D, m1 }
const S1 = (await loadBars('XAGUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const S3 = (await loadBars('XAGUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 180000 <= TO)
const ha = hourAtr(m1), fe = buildFeatures({ B, m1, S1, S3, D, ha, spreadAt }); lap(`features: ${fe.n} rows × ${fe.F}`)
const stat = (F) => { const n = F.length, w = F.filter((f) => f.net > 0).length, s = F.reduce((a, f) => a + f.net, 0)
  return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilson(w, n).lo.toFixed(4) : null, usd: n ? +(s / n).toFixed(3) : null,
    lb: n ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null } }
const periods = (F) => ({ P1: stat(F.filter((f) => f.t >= P1 && f.t < SPLIT)), P2: stat(F.filter((f) => f.t >= SPLIT)), LAST2Y: stat(F.filter((f) => f.t >= LAST2Y)) })
const trade = async (rows, exit) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => rows.map((i) => sellSig(B, i, fe.A[i], exit, fe.T[i])) })).fires
const byHourEra = new Map(); for (let i = 0; i < fe.n; i++) { if (!Number.isFinite(fe.A[i]) || fe.T[i] < P1) continue; const k = `${new Date(B[i].t).getUTCHours()}|${fe.T[i] < SPLIT ? 0 : 1}`; if (!byHourEra.has(k)) byHourEra.set(k, []); byHourEra.get(k).push(i) }
const controlRows = (rows) => rows.map((i) => { const L = byHourEra.get(`${new Date(B[i].t).getUTCHours()}|${fe.T[i] < SPLIT ? 0 : 1}`); return L[Math.floor(R() * L.length)] }).sort((a, b) => a - b)

const out = { spec: 'docs/SCALP_SELL_ML_SPEC.md', built_at: new Date().toISOString(), features: FEATURES, rows: fe.n, cells: {}, audit: {} }, NET = {}
for (const exit of ['X1', 'X3']) {
  const net = (NET[exit] = labelRows({ B, m1, fe, exit, spreadAt })); lap(`${exit} labels: ${net.filter(Number.isFinite).length} priced rows, base WR ${(100 * net.filter((x) => x > 0).length / net.filter(Number.isFinite).length).toFixed(1)} %`)
  const wf = walkForward({ fe, net, years: YEARS }); lap(`${exit} walk-forward: ${wf.selected.length} selected rows`)
  const Fz = await trade(wf.selected, exit), Cz = await trade(controlRows(wf.selected), exit), c = { exit, selected_rows: wf.selected.length, years: wf.log, ...periods(Fz), control: periods(Cz) }
  c.checks = { p1_wr92: c.P1.wr >= 0.92 && c.P1.wr_lb >= 0.88, p2_wr92: c.P2.wr >= 0.92 && c.P2.wr_lb >= 0.88, p1_money: c.P1.usd > 0 && c.P1.lb > 0, p2_money: c.P2.usd > 0 && c.P2.lb > 0,
    beats_control_p1: c.P1.usd > c.control.P1.usd, beats_control_p2: c.P2.usd > c.control.P2.usd, n30_each: c.P1.n >= 30 && c.P2.n >= 30, last2y_money: c.LAST2Y.usd > 0 }
  c.pass = Object.values(c.checks).every(Boolean); c.missed = Object.entries(c.checks).filter(([, v]) => !v).map(([k]) => k); out.cells[exit] = c
  console.log(`${exit}: P1 ${JSON.stringify(c.P1)} · P2 ${JSON.stringify(c.P2)} · 2y ${c.LAST2Y.usd} · ctrl ${c.control.P1.usd}/${c.control.P2.usd} · ${c.pass ? 'PASS' : 'fail'}`)
  for (const y of wf.log) console.log(`   ${y.year}: train ${y.train_rows} · threshold ${y.threshold ? `top ${100 * y.threshold.q} % (cal n ${y.threshold.n}, WR ${(100 * y.threshold.wr).toFixed(1)} %, ${y.threshold.usd.toFixed(3)} $/t)` : 'NONE (no trades)'} · selected ${y.selected}${y.leak ? ' · LEAK' : ''}`)
  // AUDIT 1: independent resolver on 200 random traded rows
  const T1 = m1.map((b) => b.t), at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
  let diff = 0; for (let k = 0; k < Math.min(200, Fz.length); k++) { const f = Fz[Math.floor(R() * Fz.length)], j = at(f.sig.decisionT), v = resolveIndependent(f.sig, m1.slice(j, j + 1445), spreadAt); if (v == null || Math.abs(v - f.net) > 1e-3) diff++ }
  // AUDIT 3: label leakage asserted per year
  // AUDIT 4: shuffled training labels → no edge; AUDIT 5: oracle (true label as a feature) → WR ≥ 98 %
  const yS = new Uint8Array(fe.n); { const idx = []; for (let i = 0; i < fe.n; i++) if (Number.isFinite(net[i])) idx.push(i); const lab = idx.map((i) => (net[i] > 0 ? 1 : 0)); for (let k = lab.length - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); [lab[k], lab[j]] = [lab[j], lab[k]] } idx.forEach((i, k) => { yS[i] = lab[k] }) }
  const sh = walkForward({ fe, net, years: YEARS, yOverride: yS }), Sz = await trade(sh.selected, exit)
  const or = walkForward({ fe, net, years: YEARS, extraX: Float32Array.from(net, (x) => (Number.isFinite(x) ? (x > 0 ? 1 : 0) : NaN)) }), Oz = await trade(or.selected, exit)
  out.audit[exit] = { independent_resolver: { trades: Math.min(200, Fz.length), differences: diff }, label_leak_years: wf.log.filter((y) => y.leak).map((y) => y.year),
    shuffle_control: { ...periods(Sz), control_P2: c.control.P2 }, oracle_control: periods(Oz) }
  lap(`${exit} audit: resolver diff ${diff} · leak years ${out.audit[exit].label_leak_years.length} · shuffle P2 ${JSON.stringify(out.audit[exit].shuffle_control.P2)} · oracle P2 ${JSON.stringify(out.audit[exit].oracle_control.P2)}`)
  // saved after every exit (2026-10-25: the first run was cut off by a session end after X1 and lost its file)
  fs.writeFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), JSON.stringify({ ...out, partial: true }, null, 1))
}
// AUDIT 2: no look-ahead in the features — rebuilt on the tape cut at 50 random decision times (all inputs cut) = the full-tape row
let fdiff = 0, checked = 0
for (let k = 0; k < 50; k++) { const i = 400 + Math.floor(R() * (fe.n - 500)); if (!Number.isFinite(fe.A[i])) continue; const T = fe.T[i]
  const cut = (a, len) => a.filter((b) => b.t + len <= T), Bc = cut(B, 180000), mc = cut(m1, 60000)
  const fc = buildFeatures({ B: Bc, m1: mc, S1: cut(S1, 60000), S3: cut(S3, 180000), D: cut(D, 180000), ha: hourAtr(mc), spreadAt }), ic = Bc.length - 1; checked++
  for (let f = 0; f < fe.F; f++) { const a = fe.X[i * fe.F + f], b = fc.X[ic * fe.F + f]; if (!(Number.isNaN(a) && Number.isNaN(b)) && Math.abs(a - b) > 1e-6) { fdiff++; console.log('   feature diff', FEATURES[f], new Date(T).toISOString(), a, b); break } } }
out.audit.feature_prefix_cuts = { checked, rows_with_differences: fdiff }
out.passes = Object.values(out.cells).filter((c) => c.pass).map((c) => c.exit)
fs.writeFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), JSON.stringify(out, null, 1))
console.log('PASSES', JSON.stringify(out.passes), '| feature cuts', JSON.stringify(out.audit.feature_prefix_cuts)); lap('done')
