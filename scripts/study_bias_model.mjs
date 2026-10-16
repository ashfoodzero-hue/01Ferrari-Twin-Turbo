// ════════════════════════════════════════════════════════════════════════════════
// study_bias_model.mjs — can ANY causal mix of the Pine inputs (gold + DXY, binary + continuous + daily trend) forecast gold's next 4H / 24 h
// direction better than gold's drift? (2026-10-16). Pre-registered: docs/BIAS_MODEL_SPEC.md. Output: data/master/bias_model_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { streamDxy1m } from '../src/data/dxy.js'
import { atr as atrArr, ema } from '../src/core/indicators.js'
import { resample4h, magnetScores, nyOffsetMs } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z')
const P40 = FROM + 0.4 * (TO - FROM), SPLIT = FROM + 0.6 * (TO - FROM), K = 2, Z = zOf(K), H4 = 4 * 3600000, DAY = 86400000
console.log('building NY 4H candles (gold + DXY) …')
const G = (await resample4h(streamBars('XAUUSD', '1m', { from: FROM - 200 * DAY, to: TO + 10 * DAY }), ['ny'])).ny
const D = (await resample4h(streamDxy1m({ from: FROM - 200 * DAY, to: TO + 10 * DAY }), ['ny'])).ny
// daily bars = the 6 NY 4H candles of each NY day (17:00 NY → 17:00 NY); a day is usable at a 4H close only once COMPLETED
const dayStart = (t) => { const off = nyOffsetMs(t); return Math.floor((t + off - 17 * 3600000) / DAY) * DAY + 17 * 3600000 - off }
function daily(bars) { const m = new Map(); for (const b of bars) { const d = dayStart(b.t); const x = m.get(d); if (!x) m.set(d, { t: d, o: b.o, h: b.h, l: b.l, c: b.c, end: b.t + H4 }); else { x.h = Math.max(x.h, b.h); x.l = Math.min(x.l, b.l); x.c = b.c; x.end = b.t + H4 } } return [...m.values()] }
function features(bars) {
  const S = magnetScores(bars), A = atrArr(bars, 14), e9 = ema(bars, 9), e21 = ema(bars, 21), dd = daily(bars), dA = atrArr(dd, 14), d9 = ema(dd, 9), d21 = ema(dd, 21)
  const out = new Map(); let di = -1
  for (let k = 6; k < bars.length; k++) { const s = S[k], a = A[k]; const close = bars[k].t + H4
    while (di + 1 < dd.length && dd[di + 1].end <= close && dd[di + 1].t + DAY <= close + 1) di++   // last completed NY day
    if (!s || !(a > 0) || di < 0 || d21[di] == null || !(dA[di] > 0)) continue
    const c = bars[k].c, cap = (x) => Math.max(-10, Math.min(10, x))
    out.set(bars[k].t, [s.A ? 1 : 0, s.B ? 1 : 0, s.C ? 1 : 0, s.D ? 1 : 0, (e9[k] - e21[k]) / a, (c - e21[k]) / a, (s.rsi - 50) / 50,
      s.bsl != null ? cap((s.bsl - c) / a) : 10, s.ssl != null ? cap((c - s.ssl) / a) : 10, (c - bars[k - 1].c) / a, (c - bars[k - 6].c) / a, (d9[di] - d21[di]) / dA[di]]) }
  return out }
const NAMES = ['A_ema', 'B_magnet', 'C_rsi', 'D_candle', 'ema_gap', 'close_vs_ema21', 'rsi', 'dist_bsl', 'dist_ssl', 'ret_1', 'ret_6', 'daily_trend']
const FG = features(G), FD = features(D)
const rows = []; for (let k = 0; k + 6 < G.length; k++) { const t = G[k].t; if (t < FROM || t > TO) continue; const fg = FG.get(t), fd = FD.get(t); if (!fg || !fd) continue
  rows.push({ t, x: [...fg, ...fd], up4: G[k + 1].c > G[k].c ? 1 : 0, up24: G[k + 6].c > G[k].c ? 1 : 0 }) }
const NF = rows[0].x.length, FNAMES = [...NAMES.map((n) => 'gold_' + n), ...NAMES.map((n) => 'dxy_' + n)]
console.log(`${rows.length} rows, ${NF} features`)
// ── logistic regression, L2, IRLS (Newton) ──
function solve(Aa, b) { const n = b.length, M = Aa.map((r, i) => [...r, b[i]]); for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]]
    for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c] } } return M.map((r, i) => r[n] / r[i]) }
function fit(X, y, lam) { const n = X.length, p = X[0].length + 1; let w = new Array(p).fill(0)
  for (let it = 0; it < 30; it++) { const g = new Array(p).fill(0), Hm = Array.from({ length: p }, () => new Array(p).fill(0))
    for (let i = 0; i < n; i++) { const xi = [1, ...X[i]]; let z = 0; for (let j = 0; j < p; j++) z += w[j] * xi[j]; const pr = 1 / (1 + Math.exp(-z)), wt = pr * (1 - pr)
      for (let j = 0; j < p; j++) { g[j] += (y[i] - pr) * xi[j]; for (let l = j; l < p; l++) Hm[j][l] += wt * xi[j] * xi[l] } }
    for (let j = 0; j < p; j++) { for (let l = 0; l < j; l++) Hm[j][l] = Hm[l][j]; if (j > 0) { g[j] -= lam * w[j]; Hm[j][j] += lam } }
    const step = solve(Hm, g); let mx = 0; w = w.map((v, j) => { mx = Math.max(mx, Math.abs(step[j])); return v + step[j] }); if (mx < 1e-8) break }
  return w }
const pred = (w, x) => { let z = w[0]; for (let j = 0; j < x.length; j++) z += w[j + 1] * x[j]; return 1 / (1 + Math.exp(-z)) }
function auc(ps, ys) { const idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]); let r = 0, np = 0, rank = 1
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && ps[idx[j + 1]] === ps[idx[i]]) j++; const avg = (rank + rank + j - i) / 2; for (let q = i; q <= j; q++) if (ys[idx[q]]) { r += avg; np++ } rank += j - i + 1; i = j + 1 }
  const nn = ys.length - np; return np && nn ? (r - np * (np + 1) / 2) / (np * nn) : null }
let seed = 4242; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const res = { at: new Date().toISOString(), spec: 'docs/BIAS_MODEL_SPEC.md', rows: rows.length, features: FNAMES, outcomes: {} }
for (const yk of ['up4', 'up24']) {
  const fitR = rows.filter((r) => r.t < SPLIT), test = rows.filter((r) => r.t >= SPLIT), early = fitR.filter((r) => r.t < P40), val = fitR.filter((r) => r.t >= P40)
  const stdz = (base) => { const mu = [], sd = []; for (let j = 0; j < NF; j++) { const v = base.map((r) => r.x[j]), m = v.reduce((a, b) => a + b, 0) / v.length; mu.push(m); sd.push(Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1) } return (x) => x.map((v, j) => (v - mu[j]) / sd[j]) }
  let best = null; const sE = stdz(early)
  for (const lam of [0.01, 0.1, 1, 10]) { const w = fit(early.map((r) => sE(r.x)), early.map((r) => r[yk]), lam), a = auc(val.map((r) => pred(w, sE(r.x))), val.map((r) => r[yk])); if (!best || a > best.auc) best = { lam, auc: a } }
  const sF = stdz(fitR), w = fit(fitR.map((r) => sF(r.x)), fitR.map((r) => r[yk]), best.lam), base = fitR.reduce((a, r) => a + r[yk], 0) / fitR.length
  const P = test.map((r) => pred(w, sF(r.x))), Y = test.map((r) => r[yk]), A0 = auc(P, Y)
  const brier = (ps) => ps.reduce((a, p, i) => a + (p - Y[i]) ** 2, 0) / ps.length, skill = 1 - brier(P) / brier(P.map(() => base))
  // week-block bootstrap of AUC
  const wk = new Map(); test.forEach((r, i) => { const k = Math.floor((r.t + 4 * DAY) / (7 * DAY)); if (!wk.has(k)) wk.set(k, []); wk.get(k).push(i) }); const B = [...wk.values()], As = []
  for (let b = 0; b < 4000; b++) { const ps = [], ys = []; for (let i = 0; i < B.length; i++) for (const q of B[(rnd() * B.length) | 0]) { ps.push(P[q]); ys.push(Y[q]) } const a = auc(ps, ys); if (a != null) As.push(a) }
  As.sort((a, b) => a - b); const aucLB = As[Math.floor((0.05 / K) * As.length)]
  const order = P.map((p, i) => i).sort((a, b) => P[a] - P[b]), q20 = Math.floor(0.2 * order.length), bot = order.slice(0, q20), top = order.slice(-q20)
  const testBaseUp = Y.reduce((a, b) => a + b, 0) / Y.length, upTop = top.filter((i) => Y[i]).length, dnBot = bot.filter((i) => !Y[i]).length
  const tails = { top20: { n: top.length, up_rate: +(upTop / top.length).toFixed(4), lb: +wilsonLB(upTop, top.length, Z).toFixed(4), base_up: +testBaseUp.toFixed(4) }, bottom20: { n: bot.length, down_rate: +(dnBot / bot.length).toFixed(4), lb: +wilsonLB(dnBot, bot.length, Z).toFixed(4), base_down: +(1 - testBaseUp).toFixed(4) } }
  const calib = []; for (let d = 0; d < 10; d++) { const sl = order.slice(Math.floor(d * order.length / 10), Math.floor((d + 1) * order.length / 10)); calib.push({ decile: d + 1, p_lo: +P[sl[0]].toFixed(4), p_hi: +P[sl.at(-1)].toFixed(4), predicted: +(sl.reduce((a, i) => a + P[i], 0) / sl.length).toFixed(4), realised: +(sl.filter((i) => Y[i]).length / sl.length).toFixed(4), n: sl.length }) }
  const usable = aucLB > 0.5 && skill > 0 && tails.top20.up_rate - tails.top20.base_up >= 0.03 && tails.top20.lb > tails.top20.base_up && tails.bottom20.down_rate - tails.bottom20.base_down >= 0.03 && tails.bottom20.lb > tails.bottom20.base_down
  const coef = Object.fromEntries(FNAMES.map((n, j) => [n, +w[j + 1].toFixed(4)]))
  res.outcomes[yk] = { lambda: best.lam, val_auc: +best.auc.toFixed(4), fit_base: +base.toFixed(4), test: { n: test.length, auc: +A0.toFixed(4), auc_lb: +aucLB.toFixed(4), brier_skill: +skill.toFixed(5), tails, calibration: calib }, verdict: usable ? 'USABLE_BIAS' : 'NO_EDGE', intercept: +w[0].toFixed(4), coef }
  console.log(`\n── ${yk === 'up4' ? 'next 4H' : 'next 24 h'}: λ ${best.lam} (val AUC ${best.auc.toFixed(4)}) · TEST n ${test.length} AUC ${A0.toFixed(4)} (LB ${aucLB.toFixed(4)}) · Brier skill ${(skill * 100).toFixed(3)}%`)
  console.log(`   top 20 %: up ${tails.top20.up_rate} (LB ${tails.top20.lb}) vs base ${tails.top20.base_up} · bottom 20 %: down ${tails.bottom20.down_rate} (LB ${tails.bottom20.lb}) vs base ${tails.bottom20.base_down} → ${res.outcomes[yk].verdict}`)
  console.log('   calibration: ' + calib.map((c) => `${c.predicted}→${c.realised}`).join(' '))
  console.log('   largest |coef|: ' + Object.entries(coef).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')) }
fs.writeFileSync(path.join(TURBO.master, 'bias_model_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> 4H BIAS MODEL: next 4H ${res.outcomes.up4.verdict} · next 24 h ${res.outcomes.up24.verdict}`)
