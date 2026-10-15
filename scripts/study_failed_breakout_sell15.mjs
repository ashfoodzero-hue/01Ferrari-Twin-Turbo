// study_failed_breakout_sell15.mjs — CONFIRMATION test of the post-hoc lead "15m failed breakout, SELL only, DXY+silver agree, 2 R"
// (2026-10-15). Pre-registered in docs/FAILED_BREAKOUT_SPEC.md (Confirmation section). Output: data/master/failed_breakout_sell15_confirm.json
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { emaSeries } from '../src/master/ferrariMatrix.js'
const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const LOOK = 45, POKE = 0.1, PAD = 0.5, MS = 900000, HZ = 12 * 3600000, base = makeSpreadAt(), L = { from: FROM - 5 * 86400000, to: TO }
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const D3 = (await loadDxyBars('3m', L)).bars, S3 = (await loadBars('XAGUSD', '3m', L)).bars, dE = emaSeries(D3, 10), sE = emaSeries(S3, 10)
const D3t = Float64Array.from(D3.map((b) => b.t)), S3t = Float64Array.from(S3.map((b) => b.t)), lc = (T, arr) => lb(arr, T - 180000 + 1) - 1
const agreeSell = (T) => { const di = lc(T, D3t), si = lc(T, S3t); return di >= 0 && si >= 0 && D3[di].c > dE.get(D3[di].t) && !(S3[si].c > sE.get(S3[si].t)) }
function trade(T, entry, sl, k, a, mult) { const sp = (t) => mult * base(t), R = sl - entry; if (!(R > 0)) return null; const tgt = entry - k * R, slip = Math.min(0.3, 0.05 * a); let j = lb(MT, T)
  for (; j < M.length && M[j].t < T + HZ; j++) { const b = M[j], s = sp(b.t); if (b.h + s >= sl) return { net: -(R + slip), exitT: b.t }; if (b.l + s <= tgt) return { net: k * R, exitT: b.t } }
  const z = M[Math.min(j, M.length) - 1]; return { net: entry - (z.c + sp(z.t)), exitT: z.t } }
const B = (await loadBars('XAUUSD', '15m', L)).bars.filter((b) => b.t + MS <= TO), A = atrArr(B, 14), EV = []
for (let i = LOOK; i < B.length; i++) { const b = B[i], a = A[i]; if (b.t < FROM || !(a > 0)) continue; let H = -Infinity; for (let k = i - LOOK; k < i; k++) if (B[k].h > H) H = B[k].h
  const T = b.t + MS; if (b.h > H + POKE * a && b.c < H && b.c < b.o && agreeSell(T)) EV.push({ T, entry: b.c, sl: b.h + PAD, a }) }
const book = (k, mult = 1) => { const tr = []; let busy = -Infinity; for (const e of EV) { if (e.T < busy) continue; const r = trade(e.T, e.entry, e.sl, k, e.a, mult); if (!r) continue; busy = r.exitT + 60000; tr.push({ t: e.T, ...r }) } return tr }
let s = 11; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const S = (tr) => { const n = tr.length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : 0, bs = []; for (let q = 0; q < 4000 && n; q++) { let t = 0; for (let j = 0; j < n; j++) t += tr[(rnd() * n) | 0].net; bs.push(t / n) } bs.sort((a, b) => a - b)
  return { n, wr: n ? +(tr.filter((x) => x.net > 0).length / n).toFixed(4) : null, net: +m.toFixed(3), lb95: n ? +bs[Math.floor(0.025 * bs.length)].toFixed(3) : null } }
const all2 = book(2), train = S(all2.filter((x) => x.t < SPLIT)), oos = S(all2.filter((x) => x.t >= SPLIT)), full = S(all2), x15 = S(book(2, 1.5)), n15 = S(book(1.5)), n25 = S(book(2.5))
const yr = {}; for (const x of all2) (yr[new Date(x.t).getUTCFullYear()] ||= []).push(x); const yq = Object.entries(yr).filter(([, v]) => v.length >= 15), posY = yq.filter(([, v]) => v.reduce((a, x) => a + x.net, 0) > 0).length
const tests = { T1_train: train.net > 0 && train.lb95 > 0, T2_years: posY >= Math.ceil(0.7 * yq.length), T3_spread_x1_5: x15.net > 0, T4_neighbours: n15.net > 0 && n25.net > 0 }
const out = { at: new Date().toISOString(), setups: EV.length, train, oos, full, spread_x1_5: x15, r1_5: n15, r2_5: n25, positive_years: `${posY}/${yq.length}`, by_year: Object.fromEntries(Object.entries(yr).map(([y, v]) => [y, `${v.length} t $${(v.reduce((a, x) => a + x.net, 0) / v.length).toFixed(2)}`])), tests, verdict: Object.values(tests).every(Boolean) ? 'CONFIRMED' : 'NOT_CONFIRMED' }
fs.writeFileSync(path.join(TURBO.master, 'failed_breakout_sell15_confirm.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1))
