// ════════════════════════════════════════════════════════════════════════════════
// study_swing_bracket.mjs — SWING TRADE arm 1's own signals with reasonable brackets (2026-10-16). Pre-registered: docs/SWING_BRACKET_SPEC.md.
// Output: data/master/swing_bracket_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'

// SWING_ARM=freq (2026-10-16): the same test on forward arm 2 (BUY_D1-xs, the strong GBDT, frozen threshold 0.9486) before it switches to E3
const ARM = process.env.SWING_ARM === 'freq' ? 'freq' : 'p92'
const DIR = path.join(TURBO.root, 'data', 'inv90'), THR = ARM === 'freq' ? 0.9486222267150879 : 0.9394, DAY = 86400000, SPLIT = Date.UTC(2022, 0, 1), TO = Date.parse('2026-10-09T06:00:00Z'), K = 4, ALPHA = 0.05 / K, spreadAt = makeSpreadAt()
const T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0)), S = new Float32Array(fs.readFileSync(path.join(DIR, ARM === 'freq' ? 'scores_BUY_D1_xs.bin' : 'scores_BUY_D1_x.bin')).buffer.slice(0))
if (T.length !== S.length) throw new Error(`scores ${S.length} vs times ${T.length}`)
const idx = [...T.keys()].filter((i) => S[i] >= THR && T[i] <= TO - 8 * DAY && Number.isFinite(S[i]) && S[i] > 0).sort((a, b) => T[a] - T[b])
const from = T[idx[0]] - 60 * DAY
console.log(`${idx.length} bars ≥ ${THR} (first ${new Date(T[idx[0]]).toISOString().slice(0, 10)})`)
const M = (await loadBars('XAUUSD', '1m', { from, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const D1 = (await loadBars('XAUUSD', '1d', { from: from - 60 * DAY, to: TO })).bars, A1 = atr(D1, 14)
const atrD = (t) => { let lo = 0, hi = D1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (D1[m].t + DAY <= t) lo = m + 1; else hi = m } return lo - 1 >= 0 ? A1[lo - 1] : null }
// SWING_USD=1 (2026-10-28, Ashraf: "swing trade must have as min as possible SL not more than 10$"): the same signals with FIXED-DOLLAR brackets,
// stop $10, targets $5/$10/$15/$20/$30 (pre-registered here before the run; K = 5; same KEEP rule, same random control) → *_usd10.json
// SWING_LEVEL=1 (same day, Ashraf: "and must trigger at the correct level"): no market buy — a BUY LIMIT at the LOW OF THE LAST 4 HOURS before the
// signal (the nearest support), valid 24 h; filled when the ask reaches it (bid low ≤ level − measured spread); stop $10 under the level, same
// targets; not filled in 24 h → no trade (the random control uses the same limit rule). Pre-registered before the run → *_level4h.json
const LEVEL = process.env.SWING_LEVEL === '1', USD = LEVEL || process.env.SWING_USD === '1'
const BR = USD ? { U10_T5: [5, 10], U10_T10: [10, 10], U10_T15: [15, 10], U10_T20: [20, 10], U10_T30: [30, 10] } : { E0: [0.2, 2], E1: [0.5, 0.5], E2: [1, 0.5], E3: [0.5, 1], E4: [1, 1] }
function resolve(t, tm, sm) { let k0 = lb(t); if (k0 < 1) return null; const c = M[k0 - 1].c, A = atrD(t); if (!(A > 0)) return null; const D = USD ? 1 : A
  let entry = c + spreadAt(t)
  if (LEVEL) { let lvl = Infinity; for (let j = lb(t - 4 * 3600000); j < k0; j++) lvl = Math.min(lvl, M[j].l); if (!Number.isFinite(lvl)) return null
    let f = -1; for (let k = k0; k < M.length && M[k].t < t + DAY; k++) if (M[k].l <= lvl - spreadAt(M[k].t)) { f = k; break }
    if (f < 0) return null; entry = lvl; k0 = f; t = M[f].t }
  const tgt = entry + tm * D, stop = entry - sm * D, slip = Math.min(0.3, 0.05 * A)
  for (let k = k0; k < M.length; k++) { const b = M[k]
    if (b.t >= t + 7 * DAY) { const z = M[k - 1]; return { net: z.c - entry, exitT: z.t + 60000, R: sm * D } }
    if (b.l <= stop) return { net: stop - entry - slip, exitT: b.t + 60000, R: sm * D }
    if (b.h >= tgt) return { net: tgt - entry, exitT: b.t + 60000, R: sm * D } }
  return null }
let seed = 21; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  let run = 0, maxRun = 0; for (const x of tr) { run = x.net <= 0 ? run + 1 : 0; maxRun = Math.max(maxRun, run) }
  return { n, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(2), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(2) : null, avg_R: n ? +(tr.reduce((a, x) => a + x.net / x.R, 0) / n).toFixed(3) : null, avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(1) : null, max_losses_in_row: maxRun } }
const res = { at: new Date().toISOString(), spec: 'docs/SWING_BRACKET_SPEC.md', threshold: THR, cells: {} }
function book(sel, tm, sm) { const tr = [], opens = []; let lastT = -Infinity
  for (const i of sel) { const t = T[i], day = Math.floor(t / DAY)
    if (t - lastT < 3600000) continue
    if (tr.filter((x) => Math.floor(x.t / DAY) === day).length >= 5) continue
    if (opens.filter((x) => x > t).length >= 5) continue
    const r = resolve(t, tm, sm); if (!r) continue; tr.push({ t, ...r }); opens.push(r.exitT); lastT = t }
  return tr }
// RANDOM-ENTRY CONTROL (added after the first run, 2026-10-16 — the per-year $ follow gold's bull years): 5 random draws of the same number of
// bars from ALL dataset bars in the same span, the same policy and brackets → does the model beat a random BUY in the same market?
const allIdx = [...T.keys()].filter((i) => T[i] >= T[idx[0]] && T[i] <= TO - 8 * DAY && Number.isFinite(S[i]))
const ctrl = (tm, sm) => { const o = []; for (let d = 0; d < 5; d++) { const pick = new Set(); while (pick.size < idx.length) pick.add(allIdx[(rnd() * allIdx.length) | 0]); const tr = book([...pick].sort((a, b) => T[a] - T[b]), tm, sm)
    o.push({ oos: summ(tr.filter((x) => x.t >= SPLIT)), train: summ(tr.filter((x) => x.t < SPLIT)) }) } const av = (f) => +(o.reduce((a, x) => a + f(x), 0) / o.length).toFixed(3)
  return { oos_wr: av((x) => x.oos.wr), oos_net: av((x) => x.oos.net), train_wr: av((x) => x.train.wr), train_net: av((x) => x.train.net), draws: o.length } }
for (const [name, [tm, sm]] of Object.entries(BR)) {
  const tr = [], opens = []; let lastT = -Infinity
  for (const i of idx) { const t = T[i], day = Math.floor(t / DAY)
    if (t - lastT < 3600000) continue
    if (tr.filter((x) => Math.floor(x.t / DAY) === day).length >= 5) continue
    if (opens.filter((x) => x > t).length >= 5) continue
    const r = resolve(t, tm, sm); if (!r) continue; tr.push({ t, ...r }); opens.push(r.exitT); lastT = t }
  const TR = summ(tr.filter((x) => x.t < SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT)), years = {}
  for (const x of tr) { const y = new Date(x.t).getUTCFullYear(); years[y] = +((years[y] ?? 0) + x.net).toFixed(1) }
  const verdict = name === 'E0' && !USD ? 'REFERENCE' : O.n >= 100 && O.net > 0 && O.net_lb > 0 && TR.net > 0 ? 'KEEP' : O.n < 100 ? 'UNDERPOWERED' : 'DROP'
  const C = ctrl(tm, sm)
  res.cells[name] = { target_D: tm, stop_D: sm, random_control: C, model_minus_random_oos: +(O.net - C.oos_net).toFixed(2), model_minus_random_train: +(TR.net - C.train_net).toFixed(2), train: TR, oos: O, per_day: +(tr.length / ((TO - T[idx[0]]) / DAY * 5 / 7)).toFixed(2), year_net: years, verdict }
  console.log(`${name} tgt ${tm}D / stop ${sm}D: OOS n ${O.n} WR ${O.wr} $/t ${O.net} [LB ${O.net_lb}] R ${O.avg_R} risk $${O.avg_risk} max losses in a row ${O.max_losses_in_row} · TRAIN n ${TR.n} WR ${TR.wr} $/t ${TR.net} → ${verdict}`)
  console.log(`   per year $: ${JSON.stringify(years)}`)
  console.log(`   RANDOM BUY same bracket/policy: OOS WR ${C.oos_wr} $/t ${C.oos_net} · TRAIN WR ${C.train_wr} $/t ${C.train_net} → model − random: OOS ${(O.net - C.oos_net).toFixed(2)} · TRAIN ${(TR.net - C.train_net).toFixed(2)}`) }
res.keep = Object.entries(res.cells).filter(([, c]) => c.verdict === 'KEEP').map(([k]) => k)
res.arm = ARM; res.usd = USD; fs.writeFileSync(path.join(TURBO.master, (ARM === 'freq' ? 'swing_bracket_study_arm2' : 'swing_bracket_study') + (LEVEL ? '_level4h' : USD ? '_usd10' : '') + '.json'), JSON.stringify(res, null, 1))
console.log(`\n=> reasonable-stop brackets KEPT: ${res.keep.join(', ') || 'none'}`)
