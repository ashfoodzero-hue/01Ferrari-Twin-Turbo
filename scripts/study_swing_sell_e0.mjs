// ════════════════════════════════════════════════════════════════════════════════
// study_swing_sell_e0.mjs — the E0 bracket (target 0.2·ATR1d / stop 2·ATR1d) on SELL_D1 walk-forward scores, mirror of study_swing_bracket.mjs
// (BUY reference). Pre-registered: docs/SWING_SELL_E0_SPEC.md (2026-10-30, Ashraf: "for both sell/buy" → "then do it"). K = 3 thresholds from
// the TRAIN score distribution; random-SELL control; PASS = OOS n ≥ 100, WR ≥ 89 %, $/t > 0 with LB > 0, TRAIN $/t > 0, beats random both halves.
// Output: data/master/swing_sell_e0_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'

const DIR = path.join(TURBO.root, 'data', 'inv90'), DAY = 86400000, SPLIT = Date.UTC(2022, 0, 1), TO = Date.parse('2026-10-09T06:00:00Z'), K = 3, ALPHA = 0.05 / K, spreadAt = makeSpreadAt()
const T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0)), S = new Float32Array(fs.readFileSync(path.join(DIR, 'scores_SELL_D1_x.bin')).buffer.slice(0))
if (T.length !== S.length) throw new Error(`scores ${S.length} vs times ${T.length}`)
const ok = (i) => Number.isFinite(S[i]) && S[i] > 0 && T[i] <= TO - 8 * DAY
const trainScores = [...T.keys()].filter((i) => ok(i) && T[i] < SPLIT).map((i) => S[i]).sort((a, b) => b - a)
const RATE = 6371 / 137441, CELLS = { Q1: RATE, Q2: 2 * RATE, Q3: 0.5 * RATE }
const THR = Object.fromEntries(Object.entries(CELLS).map(([k, r]) => [k, trainScores[Math.floor(r * trainScores.length)]]))
const first = T[[...T.keys()].find(ok)], from = first - 60 * DAY
const M = (await loadBars('XAUUSD', '1m', { from, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const D1 = (await loadBars('XAUUSD', '1d', { from: from - 60 * DAY, to: TO })).bars, A1 = atr(D1, 14)
const atrD = (t) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY <= t) lo = m + 1; else hi = m } return lo - 1 >= 0 ? A1[lo - 1] : null }
const TM = 0.2, SM = 2, fills = []
// SELL at the bid close of the minute before t; exits BUY at the ASK (bid + measured spread); stop checked first in a minute
function resolve(t) { const k0 = lb(t); if (k0 < 1) return null; const entry = M[k0 - 1].c, A = atrD(t); if (!(A > 0)) return null
  const tgt = entry - TM * A, stop = entry + SM * A, slip = Math.min(0.3, 0.05 * A)
  for (let k = k0; k < M.length; k++) { const b = M[k], sp = spreadAt(b.t)
    if (b.t >= t + 7 * DAY) { const z = M[k - 1]; return { net: entry - (z.c + spreadAt(z.t)), exitT: z.t + 60000, R: SM * A, how: 'timeout', entry, k0, k } }
    if (b.h + sp >= stop) return { net: entry - stop - slip, exitT: b.t + 60000, R: SM * A, how: 'stop', entry, tgt, stop, k0, k }
    if (b.l + sp <= tgt) return { net: entry - tgt, exitT: b.t + 60000, R: SM * A, how: 'target', entry, tgt, stop, k0, k } }
  return null }
let seed = 21; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  let run = 0, maxRun = 0; for (const x of tr) { run = x.net <= 0 ? run + 1 : 0; maxRun = Math.max(maxRun, run) }
  return { n, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(2), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(2) : null, avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(1) : null, max_losses_in_row: maxRun } }
function book(sel) { const tr = [], opens = []; let lastT = -Infinity
  for (const i of sel) { const t = T[i], day = Math.floor(t / DAY)
    if (t - lastT < 3600000) continue
    if (tr.filter((x) => Math.floor(x.t / DAY) === day).length >= 5) continue
    if (opens.filter((x) => x > t).length >= 5) continue
    const r = resolve(t); if (!r) continue; tr.push({ t, ...r }); opens.push(r.exitT); lastT = t }
  return tr }
const allIdx = [...T.keys()].filter((i) => ok(i))
const res = { at: new Date().toISOString(), spec: 'docs/SWING_SELL_E0_SPEC.md', thresholds: THR, cells: {} }
for (const [name, thr] of Object.entries(THR)) {
  const idx = allIdx.filter((i) => S[i] >= thr).sort((a, b) => T[a] - T[b]), tr = book(idx)
  const TR = summ(tr.filter((x) => x.t < SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT)), years = {}
  for (const x of tr) { const y = new Date(x.t).getUTCFullYear(); years[y] = +((years[y] ?? 0) + x.net).toFixed(1) }
  const C = []; for (let d = 0; d < 5; d++) { const pick = new Set(); while (pick.size < idx.length) pick.add(allIdx[(rnd() * allIdx.length) | 0]); const r = book([...pick].sort((a, b) => T[a] - T[b])); C.push({ o: summ(r.filter((x) => x.t >= SPLIT)), t: summ(r.filter((x) => x.t < SPLIT)) }) }
  const av = (f) => +(C.reduce((a, x) => a + f(x), 0) / C.length).toFixed(3), rc = { oos_wr: av((x) => x.o.wr), oos_net: av((x) => x.o.net), train_wr: av((x) => x.t.wr), train_net: av((x) => x.t.net) }
  const pass = O.n >= 100 && O.wr >= 0.89 && O.net > 0 && O.net_lb > 0 && TR.net > 0 && O.net - rc.oos_net > 0 && TR.net - rc.train_net > 0
  res.cells[name] = { threshold: thr, selected_bars: idx.length, train: TR, oos: O, per_day: +(tr.length / ((TO - first) / DAY * 5 / 7)).toFixed(2), random_sell: rc, model_minus_random_oos: +(O.net - rc.oos_net).toFixed(2), model_minus_random_train: +(TR.net - rc.train_net).toFixed(2), year_net: years, verdict: pass ? 'PASS' : 'FAIL' }
  if (name === 'Q1') for (const x of tr.filter((x) => x.how !== 'timeout').slice(0, 5)) fills.push({ signal: new Date(x.t).toISOString(), entry_minute: new Date(M[x.k0 - 1].t).toISOString(), entry: x.entry, tgt: +x.tgt.toFixed(2), stop: +x.stop.toFixed(2), exit_minute: new Date(M[x.k].t).toISOString(), how: x.how, bar: M[x.k], spread: +spreadAt(M[x.k].t).toFixed(3), net: +x.net.toFixed(2) })
  console.log(`${name} thr ${thr.toFixed(4)} bars ${idx.length}: OOS n ${O.n} WR ${O.wr} $/t ${O.net} [LB ${O.net_lb}] risk $${O.avg_risk} max-loss-run ${O.max_losses_in_row} · TRAIN n ${TR.n} WR ${TR.wr} $/t ${TR.net} · ${res.cells[name].per_day}/day`)
  console.log(`   random SELL: OOS WR ${rc.oos_wr} $/t ${rc.oos_net} · TRAIN WR ${rc.train_wr} $/t ${rc.train_net} → model − random OOS ${res.cells[name].model_minus_random_oos} TRAIN ${res.cells[name].model_minus_random_train} → ${res.cells[name].verdict}`)
  console.log(`   per year $: ${JSON.stringify(years)}`) }
res.fill_check = fills; res.pass = Object.entries(res.cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'swing_sell_e0_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> PASS: ${res.pass.join(', ') || 'none (0/3)'}`); console.log('fill check:', JSON.stringify(fills, null, 0).slice(0, 1500))
