// ════════════════════════════════════════════════════════════════════════════════
// study_swing_scalp_entry.mjs — SWING entry on a SCALP BUY trigger (2026-10-28, Ashraf: "i would start entry at the swing when the scalp is
// triggered i gues it is more safe, what u think"). Output: data/master/swing_scalp_entry_study.json
// PRE-REGISTERED (written before the first run):
//   Swing signals = the frozen walk-forward scores of arm 1 (≥ 0.9394) and arm 2 (≥ 0.9486), D1 policy (≥ 1 h apart, ≤ 5/day, ≤ 5 open).
//   Same bracket for every arm: stop entry − $10, target entry + $20, 7-day time stop, buy at the ask (measured spread), exits at the bid,
//   stop first inside a minute, stop slip min(0.30, 0.05·ATR1d) — as study_swing_bracket.mjs (ek).
//   A. SCALP   — after a swing signal, enter at the FIRST Matrix SCALP BUY whose decision is within 24 h (its 3m close + spread); none → no trade.
//                One SCALP BUY serves one swing trade at most.
//   B. L4H     — the live rule: buy limit at the 4 h low, valid 24 h (reference).
//   C. ALONE   — every Matrix SCALP BUY on its own, one at a time, same $10 / $20 (does the swing model add anything?).
//   Control: 5 random-bar draws (same count, span, policy) through A.
//   Windows: P = 13 y Matrix WITHOUT the WTI filter (the 85 % study's primary), TRAIN < 2022-01-01 ≤ OOS; R = 2 y WITH WTI (the live rule,
//   2024-10-10 → 2026-10-09, report only: no split). KEEP (P window) = OOS n ≥ 100, $/t > 0, bootstrap LB (α = 0.05/6) > 0, TRAIN $/t > 0.
//   "Safer" is judged on WR, the worst losing run and $/t together — not on WR alone.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixSignals } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'

const DAY = 86400000, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = Date.UTC(2022, 0, 1), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), F13 = HISTORY_CONTINUOUS_FROM + 7 * DAY
const ALPHA = 0.05 / 6, STOP = 10, TGT = 20, spreadAt = makeSpreadAt(), DIR = path.join(TURBO.root, 'data', 'inv90')
const T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0))
const ARMS = { arm1: { thr: 0.9394, file: 'scores_BUY_D1_x.bin' }, arm2: { thr: 0.9486222267150879, file: 'scores_BUY_D1_xs.bin' } }
for (const a of Object.values(ARMS)) a.S = new Float32Array(fs.readFileSync(path.join(DIR, a.file)).buffer.slice(0))

console.log('loading gold 1m / 3m, DXY 3m …')
const M = (await loadBars('XAUUSD', '1m', { from: F13 - 2 * DAY, to: TO + 8 * DAY })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const D1 = (await loadBars('XAUUSD', '1d', { from: F13 - 60 * DAY, to: TO })).bars, A1 = atr(D1, 14)
const atrD = (t) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY <= t) lo = m + 1; else hi = m } return lo - 1 >= 0 ? A1[lo - 1] : null }
const B3 = (await loadBars('XAUUSD', '3m', { from: F13 - 3 * DAY, to: TO })).bars, DX = (await loadDxyBars('3m', { from: F13 - 3 * DAY, to: TO })).bars
const scalp = { P: matrixSignals(B3, DX, [], { from: B3.findIndex((b) => b.t >= F13), useWti: false }).filter((s) => s.side === 'BUY') }
scalp.R = matrixSignals(B3, DX, wti1m(TO), { from: B3.findIndex((b) => b.t >= WTI_FROM), useWti: true }).filter((s) => s.side === 'BUY')
console.log(`SCALP BUYs: 13 y no-WTI ${scalp.P.length} · 2 y WTI ${scalp.R.length}`)

// one trade from a fill minute index k0 at ask price `entry`
function plainTradeFn(k0, entry, t) { const A = atrD(t); if (!(A > 0)) return null; const stop = entry - STOP, tgt = entry + TGT, slip = Math.min(0.3, 0.05 * A), t0 = M[k0].t
  for (let k = k0; k < M.length; k++) { const b = M[k]
    if (b.t >= t0 + 7 * DAY) { const z = M[k - 1]; return { net: z.c - entry, exitT: z.t + 60000 } }
    if (b.l <= stop) return { net: stop - entry - slip, exitT: b.t + 60000 }
    if (b.h >= tgt) return { net: tgt - entry, exitT: b.t + 60000 } }
  return null }
// LOTS3=1 (same day, Ashraf: "enter with 3 trades at the same scalp entry level, so i take profit first Tp1 then move the other 2 trades for BE SL,
// and keep them running"; pre-registered before its run): 3 lots, stop $10 each; lot 1 exits at TP1 ($10 or $20); after TP1 the stop of lots 2-3
// moves to the entry (BE) from the NEXT minute, and they exit at BE, at +$50, or at the 7-day time stop. Net = sum of the 3 lots ($ per setup);
// compared with 3 lots × the plain $20 target. Same stop-first-in-a-minute rule.
const LOTS3 = process.env.LOTS3 === '1', TP1S = [10, 20], RUN_CAP = 50
let MODE = 'plain'   // 'plain' | 'tp1_10' | 'tp1_20' | 'x3_20'
const plainTrade = plainTradeFn
function trade3(k0, entry, t, tp1) { const A = atrD(t); if (!(A > 0)) return null; const stop = entry - STOP, slip = Math.min(0.3, 0.05 * A), t0 = M[k0].t; let k = k0
  for (; k < M.length; k++) { const b = M[k]
    if (b.t >= t0 + 7 * DAY) { const z = M[k - 1]; return { net: 3 * (z.c - entry), exitT: z.t + 60000 } }
    if (b.l <= stop) return { net: 3 * (stop - entry - slip), exitT: b.t + 60000 }
    if (b.h >= entry + tp1) break }
  if (k >= M.length) return null
  for (let j = k + 1; j < M.length; j++) { const b = M[j]
    if (b.t >= t0 + 7 * DAY) { const z = M[j - 1]; return { net: tp1 + 2 * (z.c - entry), exitT: z.t + 60000 } }
    if (b.l <= entry) return { net: tp1 + 0, exitT: b.t + 60000 }
    if (b.h >= entry + RUN_CAP) return { net: tp1 + 2 * RUN_CAP, exitT: b.t + 60000 } }
  return null }
function trade(k0, entry, t) { if (MODE === 'plain') return plainTrade(k0, entry, t); if (MODE === 'x3_20') { const r = plainTrade(k0, entry, t); return r && { ...r, net: 3 * r.net } }
  return trade3(k0, entry, t, MODE === 'tp1_10' ? 10 : 20) }
const entryScalp = (list, used) => (t) => { let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].decisionT <= t) lo = m + 1; else hi = m }
  for (let i = lo; i < list.length && list[i].decisionT <= t + DAY; i++) { const s = list[i]; if (used.has(s.decisionT)) continue
    const k0 = lb(s.decisionT); if (k0 >= M.length) return null; used.add(s.decisionT); return trade(k0, s.entry + spreadAt(s.decisionT), s.decisionT) } return null }
const entryL4H = (t) => { const k0 = lb(t); if (k0 < 1) return null; let lvl = Infinity; for (let j = lb(t - 4 * 3600000); j < k0; j++) lvl = Math.min(lvl, M[j].l); if (!Number.isFinite(lvl)) return null
  for (let k = k0; k < M.length && M[k].t < t + DAY; k++) if (M[k].l <= lvl - spreadAt(M[k].t)) return trade(k, lvl, M[k].t); return null }
// D1 policy book over candidate times (sorted); an untriggered candidate takes no slot (as the bracket study)
function book(times, enter) { const tr = [], opens = []; let lastT = -Infinity
  for (const t of times) { const day = Math.floor(t / DAY); if (t - lastT < 3600000) continue
    if (tr.filter((x) => Math.floor(x.t / DAY) === day).length >= 5 || opens.filter((x) => x > t).length >= 5) continue
    const r = enter(t); if (!r) continue; tr.push({ t, ...r }); opens.push(r.exitT); lastT = t } return tr }
let seed = 31; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  let run = 0, maxRun = 0; for (const x of tr) { run = x.net <= 0 ? run + 1 : 0; maxRun = Math.max(maxRun, run) }
  return { n, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(2), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(2) : null, max_losses_in_row: maxRun } }
const split = (tr, from) => ({ train: summ(tr.filter((x) => x.t >= from && x.t < SPLIT)), oos: summ(tr.filter((x) => x.t >= SPLIT)), all: summ(tr.filter((x) => x.t >= from)) })
const verdict = (c) => c.oos.n >= 100 && c.oos.net > 0 && c.oos.net_lb > 0 && c.train.net > 0 ? 'KEEP' : c.oos.n < 100 ? 'UNDERPOWERED' : 'DROP'

const allIdx = [...T.keys()].filter((i) => T[i] >= F13 && T[i] <= TO - 8 * DAY)
if (LOTS3) { const out = { at: new Date().toISOString(), script: 'scripts/study_swing_scalp_entry.mjs LOTS3=1', lots: 3, stop: STOP, run_cap: RUN_CAP, cells: {} }
  const f = (c) => `n ${c.n} WR ${c.wr} $/setup ${c.net} [LB ${c.net_lb}] worst run ${c.max_losses_in_row}`
  for (const [arm, A] of Object.entries(ARMS)) { const times = allIdx.filter((i) => Number.isFinite(A.S[i]) && A.S[i] >= A.thr).map((i) => T[i]).sort((a, b) => a - b)
    for (const [win, from] of [['P', F13], ['R', WTI_FROM]]) { const ts = times.filter((t) => t >= from); console.log(`\n${arm} · ${win === 'P' ? '13 y (SCALP no WTI)' : '2 y (SCALP live rule)'}`)
      for (const [en, mk] of [['L4H', () => entryL4H], ['SCALP', () => entryScalp(scalp[win], new Set())]]) for (const md of ['x3_20', 'tp1_10', 'tp1_20']) { MODE = md
        const c = split(book(ts, mk()), from); out.cells[`${arm}|${win}|${en}|${md}`] = c
        console.log(`  ${en.padEnd(5)} ${md.padEnd(6)} OOS ${f(win === 'P' ? c.oos : c.all)}${win === 'P' ? ' · TRAIN ' + f(c.train) : ''}`) } } }
  MODE = 'plain'; fs.writeFileSync(path.join(TURBO.master, 'swing_scalp_entry_lots3.json'), JSON.stringify(out, null, 1)); console.log('\nwritten data/master/swing_scalp_entry_lots3.json'); process.exit(0) }
const res = { at: new Date().toISOString(), script: 'scripts/study_swing_scalp_entry.mjs', bracket: { stop: STOP, target: TGT, horizon_days: 7 }, cells: {} }
for (const [arm, A] of Object.entries(ARMS)) {
  const idx = allIdx.filter((i) => Number.isFinite(A.S[i]) && A.S[i] >= A.thr), times = idx.map((i) => T[i]).sort((a, b) => a - b)
  for (const [win, from] of [['P', F13], ['R', WTI_FROM]]) {
    const ts = times.filter((t) => t >= from), cell = {}
    cell.SCALP = split(book(ts, entryScalp(scalp[win], new Set())), from)
    cell.L4H = split(book(ts, entryL4H), from)
    const ctrl = []; for (let d = 0; d < 5; d++) { const pool = allIdx.filter((i) => T[i] >= from), pick = new Set(); while (pick.size < Math.min(ts.length, pool.length)) pick.add(T[pool[(rnd() * pool.length) | 0]])
      ctrl.push(split(book([...pick].sort((a, b) => a - b), entryScalp(scalp[win], new Set())), from)) }
    const av = (f) => +(ctrl.reduce((a, x) => a + (f(x) ?? 0), 0) / ctrl.length).toFixed(3)
    cell.random_SCALP = { oos_wr: av((x) => x.oos.wr), oos_net: av((x) => x.oos.net), train_wr: av((x) => x.train.wr), train_net: av((x) => x.train.net), all_wr: av((x) => x.all.wr), all_net: av((x) => x.all.net), draws: 5 }
    cell.signals = ts.length
    if (win === 'P') { cell.SCALP.verdict = verdict(cell.SCALP); cell.L4H.verdict = verdict(cell.L4H) }
    res.cells[`${arm}|${win}`] = cell
    const f = (c) => `n ${c.n} WR ${c.wr} $/t ${c.net} [LB ${c.net_lb}] worst run ${c.max_losses_in_row}`
    console.log(`\n${arm} · ${win === 'P' ? '13 y, SCALP without WTI' : '2 y, SCALP with WTI (live rule)'} · ${ts.length} swing signals`)
    for (const k of ['SCALP', 'L4H']) console.log(`  ${k.padEnd(5)} OOS ${f(cell[k].oos)} · TRAIN ${f(cell[k].train)}${cell[k].verdict ? ' → ' + cell[k].verdict : ''}${win === 'R' ? ' · ALL ' + f(cell[k].all) : ''}`)
    console.log(`  random bars → SCALP: OOS WR ${cell.random_SCALP.oos_wr} $/t ${cell.random_SCALP.oos_net} · TRAIN WR ${cell.random_SCALP.train_wr} $/t ${cell.random_SCALP.train_net} · ALL $/t ${cell.random_SCALP.all_net}`) } }
for (const win of ['P', 'R']) { const from = win === 'P' ? F13 : WTI_FROM, tr = []; let busy = -Infinity
  for (const s of scalp[win]) { if (s.decisionT <= busy || s.decisionT > TO - 8 * DAY) continue; const k0 = lb(s.decisionT); const r = trade(k0, s.entry + spreadAt(s.decisionT), s.decisionT); if (!r) continue; tr.push({ t: s.decisionT, ...r }); busy = r.exitT }
  res.cells[`ALONE|${win}`] = split(tr, from); const c = res.cells[`ALONE|${win}`]
  console.log(`\nSCALP BUY ALONE $10/$20 · ${win}: OOS n ${c.oos.n} WR ${c.oos.wr} $/t ${c.oos.net} [LB ${c.oos.net_lb}] worst ${c.oos.max_losses_in_row} · TRAIN WR ${c.train.wr} $/t ${c.train.net} · ALL WR ${c.all.wr} $/t ${c.all.net}`) }
fs.writeFileSync(path.join(TURBO.master, 'swing_scalp_entry_study.json'), JSON.stringify(res, null, 1))
console.log('\nwritten data/master/swing_scalp_entry_study.json')
