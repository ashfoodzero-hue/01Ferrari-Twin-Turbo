// ════════════════════════════════════════════════════════════════════════════════
// study_sell_downtrend.mjs — SELL-only setups inside confirmed downtrends (2026-10-16). Pre-registered: docs/SELL_DOWNTREND_SPEC.md.
// Output: data/master/sell_downtrend_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { ema } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { readMarketState } from '../src/master/marketState.js'
import { swingWallEvents } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 12, ALPHA = 0.05 / K, Z = zOf(K), HR = 3600000, M15 = 900000, Y2020 = Date.UTC(2020, 0, 1), spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 90 * 86400000, to: TO + 86400000 })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lbI = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log('1m bars', M.length.toLocaleString())
const atr = new Float64Array(M.length); { let a = null; for (let i = 1; i < M.length; i++) { const tr = Math.max(M[i].h - M[i].l, Math.abs(M[i].h - M[i - 1].c), Math.abs(M[i].l - M[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = a } }
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c, v: 0 } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } c.v += b.v || 0 } return out }
async function* it() { for (const b of M) yield b }
const B15 = resample(M15), B1 = resample(HR), B3 = resample(180000), G4 = (await resample4h(it(), ['ny'])).ny
const lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
// regimes
console.log('market states on 15m …')
const ST = new Array(B15.length).fill(null); for (let i = 150; i < B15.length; i++) { const s = readMarketState(B15.slice(i - 149, i + 1)); ST[i] = s?.state ?? null }
const downTrend = (bars, P) => { const e9 = ema(bars, 9), e21 = ema(bars, 21), piv = confirmedPivots(bars, P), out = new Array(bars.length).fill(false); let h = []
  let pi = 0; for (let i = 0; i < bars.length; i++) { while (pi < piv.highs.length && piv.highs[pi].knownAt <= i) h.push(piv.highs[pi++].px); out[i] = e9[i] != null && e21[i] != null && e9[i] < e21[i] && h.length >= 2 && h.at(-1) < h.at(-2) } return out }
const D4 = downTrend(G4, 3), D1 = downTrend(B1, 5)
const regimeAt = (T) => { const i15 = lastClosed(B15, M15, T), i4 = lastClosed(G4, 4 * HR, T), i1 = lastClosed(B1, HR, T)
  return { 'R-STATE': i15 >= 0 && ['BREAKOUT_DOWN', 'TREND_DOWN'].includes(ST[i15]), 'R-4H': i4 >= 0 && D4[i4], 'R-1H': i1 >= 0 && D1[i1], NONE: true } }
// setups
const sw = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_walls_study.json'), 'utf8')).variants['3m'].strong_threshold_train_p66
const P3 = confirmedPivots(B3, 5), kk = (x) => ({ knownT: B3[x.knownAt].t + 180000, px: x.px })
const rally = swingWallEvents(M, { highs: P3.highs.map(kk), lows: [] }, { from: FROM }).filter((e) => e.type === 'ceiling' && (e.defStronger || (e.defense && e.mag > sw)) && e.decisionT <= TO - 9 * HR)
  .map((e) => ({ T: e.decisionT, i0: e.di, stop: e.wall + 3 * e.binW }))
const P15 = confirmedPivots(B15, 5), brk = []
for (let i = 5; i < B15.length; i++) { const sl = P15.lastLowAt[i - 1]; const T = B15[i].t + M15; if (T < FROM || T > TO - 9 * HR || !Number.isFinite(sl)) continue
  if (B15[i].c < sl && !(B15[i - 1].c < P15.lastLowAt[i - 2])) { let hh = -Infinity; for (let k = i - 3; k <= i; k++) hh = Math.max(hh, B15[k].h); brk.push({ T, i0: lbI(T) - 1, stop: hh + 0.5 }) } }
const SETUPS = { 'S-RALLY': rally, 'S-BREAK': brk }
console.log(`setups: S-RALLY ${rally.length} · S-BREAK ${brk.length}`)
function trade(s, mode) { const i0 = s.i0, entry = M[i0].c, R = s.stop - entry; if (!(R >= 0.5 && R <= 15)) return null
  const tgt = entry - (mode === 'R1' ? 1 : mode === 'R2' ? 2 : 0.5) * R, slip = Math.min(0.3, 0.15 * atr[i0]); let j = i0 + 1
  for (; j < M.length && M[j].t < s.T + 8 * HR; j++) { const b = M[j], sp = spreadAt(b.t)
    if (b.h + sp >= s.stop) return { t: s.T, net: -(R + slip), R, exitT: b.t }
    if (b.l + sp <= tgt) return { t: s.T, net: entry - tgt, R, exitT: b.t } }
  const z = M[Math.min(j, M.length - 1)]; return { t: s.T, net: entry - (z.c + spreadAt(z.t)), R, exitT: z.t } }
let seed = 5150; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(2) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7
const res = { at: new Date().toISOString(), spec: 'docs/SELL_DOWNTREND_SPEC.md', red_line: 'WR >= 85 % + money', cells: {}, reported: {} }
for (const reg of ['R-STATE', 'R-4H', 'R-1H', 'NONE']) for (const [sn, S] of Object.entries(SETUPS)) for (const mode of ['R1', 'R2', 'RH']) {
  const tr = []; let busy = -Infinity; for (const s of S) { if (s.T <= busy || !regimeAt(s.T)[reg]) continue; const r = trade(s, mode); if (!r) continue; busy = r.exitT + 60000; tr.push(r) }
  const T = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO)), pre = ['R-STATE', 'R-4H'].includes(reg)
  const verdict = !pre ? 'REPORTED' : O.n >= 100 && O.wr >= 0.85 && O.wr_lb >= 0.80 && O.net > 0 && O.net_lb > 0 && T.net > 0 ? 'PASS' : O.n < 100 ? 'UNDERPOWERED' : 'FAIL'
  const key = `${reg}|${sn}|${mode}`, row = { train: T, oos: O, era: { pre2020: summ(tr.filter((x) => x.t < Y2020)).net, post2020: summ(tr.filter((x) => x.t >= Y2020)).net }, verdict }
  ;(pre ? res.cells : res.reported)[key] = row
  console.log(`${key.padEnd(22)} OOS n ${String(O.n).padStart(5)} (${O.per_day}/d) WR ${O.wr} (LB ${O.wr_lb}) $/t ${O.net} [LB ${O.net_lb}] risk $${O.avg_risk} · TRAIN WR ${T.wr} $/t ${T.net} · pre/post ${row.era.pre2020}/${row.era.post2020} → ${verdict}`) }
res.passing = Object.entries(res.cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'sell_downtrend_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> SELL in downtrends (WR ≥ 85 % + money): ${res.passing.length ? 'PASS ' + res.passing.join(', ') : 'NO_PASS'}`)
