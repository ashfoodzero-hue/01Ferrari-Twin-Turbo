// ════════════════════════════════════════════════════════════════════════════════
// study_fast_move_bounce_dxy.mjs — ADDENDUM A of docs/FAST_MOVE_BOUNCE_SPEC.md (2026-10-16, Ashraf: "DXY showed a bearish sign on 1H RSI at the bounce …
// add reading the DXY bias"). Filters the fast-move L / D trades (data/master/fast_move_bounce_rows.json) by DXY 1H RSI divergence and the DXY 4H
// Macro Magnet side, read at the event minute from closed bars. Output: data/master/fast_move_bounce_dxy.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadDxyBars, streamDxy1m } from '../src/data/dxy.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'
import { rsi } from '../src/core/indicators.js'

const K = 12, ALPHA = 0.05 / K, H1 = 3600000, H4 = 4 * H1
const rows = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'fast_move_bounce_rows.json'), 'utf8'))
const D1 = (await loadDxyBars('1h', {})).bars, R = rsi(D1, 14)
const D4 = (await resample4h(streamDxy1m({}), ['ny'])).ny, MG = magnetScores(D4)
const FROM = D1[0].t + 3 * 86400000, TO = Math.max(...rows.map((r) => r.t)), SPLIT = FROM + 0.6 * (TO - FROM)
const lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
// confirmed pivots (2 left / 2 right): known at the close of bar p + 2
const piv = { hi: [], lo: [] }
for (let p = 2; p < D1.length - 2; p++) { let h = true, l = true; for (let k = p - 2; k <= p + 2; k++) { if (k === p) continue; if (D1[k].h >= D1[p].h) h = false; if (D1[k].l <= D1[p].l) l = false }
  if (h) piv.hi.push(p); if (l) piv.lo.push(p) }
/** divergence against the dollar for a gold side at time T: side +1 → DXY bearish div on highs; side −1 → DXY bullish div on lows */
function div(side, T) { const j = lastClosed(D1, H1, T); if (j < 0) return null; const P = side > 0 ? piv.hi : piv.lo
  let a = 0, b = P.length; while (a < b) { const m = (a + b) >> 1; if (P[m] + 2 <= j) a = m + 1; else b = m } const k = a - 1   // latest pivot confirmed by bar j
  if (k < 1) return false; const p2 = P[k], p1 = P[k - 1]; if (j - (p2 + 2) > 5) return false; if (p2 - p1 < 3 || p2 - p1 > 40) return false
  if (R[p1] == null || R[p2] == null) return false
  return side > 0 ? D1[p2].h > D1[p1].h && R[p2] < R[p1] : D1[p2].l < D1[p1].l && R[p2] > R[p1] }
function bias(side, T) { const j = lastClosed(D4, H4, T); const m = j >= 0 ? MG[j] : null; if (!m) return null; return side > 0 ? m.side === 'SHORT' : m.side === 'LONG' }
const X = rows.filter((r) => r.t >= FROM).map((r) => ({ ...r, div: div(r.side, r.t), bias: bias(r.side, r.t) }))
const F = { 'F-DIV': (r) => r.div === true, 'F-BIAS': (r) => r.bias === true, 'F-BOTH': (r) => r.div === true && r.bias === true }
const wk = (t) => Math.floor((t + 4 * 86400000) / (7 * 86400000))
const st = (xs) => { const n = xs.length; return { n, wr: n ? +(xs.filter((x) => x.net > 0).length / n).toFixed(4) : null, net: n ? +(xs.reduce((a, x) => a + x.net, 0) / n).toFixed(3) : null } }
const blocks = (xs) => { const g = new Map(); for (const x of xs) { const k = wk(x.t); if (!g.has(k)) g.set(k, []); g.get(k).push(x) } return [...g.values()] }
let bs = 11; const r2 = () => { bs = (bs * 1664525 + 1013904223) >>> 0; return bs / 4294967296 }
const lb = (xs, keep) => { if (xs.length < 10) return { mean: null, gain: null }; const bl = blocks(xs), vm = [], vg = []
  for (let r = 0; r < 3000; r++) { let sa = 0, na = 0, sk = 0, nk = 0; for (let k = 0; k < bl.length; k++) for (const x of bl[(r2() * bl.length) | 0]) { sa += x.net; na++; if (keep(x)) { sk += x.net; nk++ } }
    if (nk) { vm.push(sk / nk); vg.push(sk / nk - sa / na) } }
  vm.sort((a, b) => a - b); vg.sort((a, b) => a - b); return { mean: +vm[Math.floor(ALPHA * vm.length)].toFixed(3), gain: +vg[Math.floor(ALPHA * vg.length)].toFixed(3) } }
const res = { at: new Date().toISOString(), spec: 'docs/FAST_MOVE_BOUNCE_SPEC.md ADDENDUM A', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), K, cells: {} }
for (const side of [1, -1]) for (const cell of ['L4', 'L8', 'D4', 'D8']) { const all = X.filter((r) => r.side === side && r.cell === cell), O = all.filter((r) => r.t >= SPLIT), T = all.filter((r) => r.t < SPLIT)
  for (const [fn, keep] of Object.entries(F)) { const o = st(O.filter(keep)), t = st(T.filter(keep)), b = lb(O, keep)
    const r = { oos_all: st(O), oos_kept: o, train_all: st(T), train_kept: t, oos_mean_lb: b.mean, oos_gain_lb: b.gain }
    r.verdict = o.n >= 60 && o.net > 0 && b.mean > 0 && b.gain > 0 && t.net > 0 ? 'PASS' : 'FAIL'
    const key = `${side > 0 ? 'LONG' : 'SHORT'} ${cell} ${fn}`; res.cells[key] = r
    console.log(`${key.padEnd(18)} OOS all ${r.oos_all.net} (n ${r.oos_all.n}, WR ${r.oos_all.wr}) → kept ${o.net} (n ${o.n}, WR ${o.wr}) LB ${b.mean} gain LB ${b.gain} · TRAIN kept ${t.net} (n ${t.n}) → ${r.verdict}`) } }
res.coverage = { rows: X.length, div_true: X.filter((r) => r.div).length, bias_true: X.filter((r) => r.bias).length }
console.log(JSON.stringify(res.coverage))
fs.writeFileSync(path.join(TURBO.master, 'fast_move_bounce_dxy.json'), JSON.stringify(res, null, 1))
