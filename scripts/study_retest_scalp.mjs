// ════════════════════════════════════════════════════════════════════════════════
// study_retest_scalp.mjs — BREAK → RETEST → REJECTION scalp on 3m, with DXY / Silver / News / WTI awareness (2026-10-15).
// Rules pre-registered in docs/RETEST_SCALP_SPEC.md before the first run. Output: data/master/retest_scalp_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { confirmedPivots, emaSeries, wtiHourAt } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, WTI_FROM = Date.parse('2024-10-10T00:00:00Z')
const TF = 180000, WIN = 10, TOL = 0.1, PAD = 0.5, HZ = 4 * 3600000, K = 16, ALPHA = 0.05 / K, spreadAt = makeSpreadAt()
const L = { from: FROM - 3 * 86400000, to: TO }
const B = (await loadBars('XAUUSD', '3m', L)).bars.filter((b) => b.t + TF <= TO), A = atrArr(B, 14), P = confirmedPivots(B)
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const D3 = (await loadDxyBars('3m', L)).bars, S3 = (await loadBars('XAGUSD', '3m', L)).bars
const dE = emaSeries(D3, 10), sE = emaSeries(S3, 10), dC = new Map(D3.map((b) => [b.t, b.c])), sC = new Map(S3.map((b) => [b.t, b.c]))
const CAL = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events.filter((e) => ['NFP', 'CPI', 'FOMC', 'PPI', 'RETAIL', 'FED_CHAIR'].includes(e.type)).map((e) => e.t).sort((a, b) => a - b)
const nearNews = (t) => { let lo = 0, hi = CAL.length; while (lo < hi) { const m = (lo + hi) >> 1; if (CAL[m] < t - 1800000) lo = m + 1; else hi = m } return lo < CAL.length && CAL[lo] <= t + 1800000 }
const W1 = wti1m(TO).filter((b) => b.t >= WTI_FROM - 86400000)
console.log(`3m ${B.length.toLocaleString()} · 1m ${M.length.toLocaleString()} · DXY 3m ${D3.length} · silver 3m ${S3.length} · news ${CAL.length} · WTI 1m ${W1.length}`)

// money path: SELL at the bid close; stop when ask ≥ SL (+ slip); target when ask ≤ entry − k·R; 4 h market exit. BUY mirrored.
function trade(decisionT, up, entry, sl, k, a) {
  const R = Math.abs(entry - sl) + (up ? spreadAt(decisionT) : 0), slip = Math.min(0.3, 0.05 * a)
  const fill = up ? entry + spreadAt(decisionT) : entry, tgt = up ? fill + k * R : fill - k * R
  let j = lb(decisionT)
  for (; j < M.length && M[j].t < decisionT + HZ; j++) { const b = M[j], s = spreadAt(b.t)
    if (up ? b.l <= sl : b.h + s >= sl) return { net: -(Math.abs(fill - sl) + slip), R, exitT: b.t }
    if (up ? b.h >= tgt : b.l + s <= tgt) return { net: k * R, R, exitT: b.t } }
  const z = M[Math.min(j, M.length) - 1]; if (!z) return null
  return { net: up ? z.c - fill : fill - (z.c + spreadAt(z.t)), R, exitT: z.t }
}
// events
const EV = [], act = { SELL: null, BUY: null }
for (let i = 20; i < B.length; i++) { const b = B[i], a = A[i]; if (b.t < FROM || !(a > 0)) continue
  for (const side of ['SELL', 'BUY']) { const st = act[side], sell = side === 'SELL'
    if (st) { const Lv = st.L
      if (i - st.i0 > WIN) act[side] = null
      else if (sell ? b.c > Lv : b.c < Lv) act[side] = null   // failed break
      else if (sell ? b.h >= Lv - TOL * a && b.c < b.o && b.c < Lv : b.l <= Lv + TOL * a && b.c > b.o && b.c > Lv) {
        const decisionT = b.t + TF, sl = sell ? b.h + PAD : b.l - PAD
        const dx = dC.get(b.t), dxE = dE.get(b.t), sv = sC.get(b.t), svE = sE.get(b.t), w = decisionT >= WTI_FROM ? wtiHourAt(W1, decisionT) : null
        EV.push({ t: decisionT, side, entry: b.c, sl, a, L: Lv, D: dx != null && dxE != null ? (sell ? dx > dxE : dx < dxE) : null, S: sv != null && svE != null ? (sell ? sv < svE : sv > svE) : null,
          N: !nearNews(decisionT), W: w ? (sell ? w.bullish : !w.bullish) : null })
        act[side] = null }
      continue }
    const Lv = sell ? P.lastLowAt[i] : P.lastHighAt[i]; if (!Number.isFinite(Lv)) continue
    if (sell ? b.c < Lv : b.c > Lv) act[side] = { L: Lv, i0: i } } }
console.log(`setups ${EV.length.toLocaleString()} (SELL ${EV.filter((e) => e.side === 'SELL').length}, BUY ${EV.filter((e) => e.side === 'BUY').length})`)

const SPLIT = FROM + 0.6 * (TO - FROM)
function book(filter, k, from = FROM) { const tr = []; let busy = -Infinity
  for (const e of EV) { if (e.t < from || e.t < busy || !filter(e)) continue; const r = trade(e.t, e.side === 'BUY', e.entry, e.sl, k, e.a); if (!r) continue; busy = r.exitT + 60000; tr.push({ ...e, ...r }) } return tr }
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function summ(tr, days) { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((s, x) => s + x.net, 0) / n : null, rnd = seeded(7), bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let j = 0; j < n; j++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_R: n ? +(tr.reduce((s, x) => s + x.R, 0) / n).toFixed(2) : null } }
const days = (a, b) => ((b - a) / 86400000) * 5 / 7
const F = { base: () => true, D: (e) => e.D === true, S: (e) => e.S === true, N: (e) => e.N, 'D+S': (e) => e.D && e.S, 'D+S+N': (e) => e.D && e.S && e.N, 'D+S+N+W': (e) => e.D && e.S && e.N && e.W === true, W: (e) => e.W === true }
const cells = {}
for (const [name, f] of Object.entries(F)) for (const k of [1, 2]) { const w = name.includes('W'), from = w ? WTI_FROM : FROM, split = w ? WTI_FROM + 0.6 * (TO - WTI_FROM) : SPLIT
  const tr = book(f, k, from), TR = summ(tr.filter((x) => x.t < split), days(from, split)), OOS = summ(tr.filter((x) => x.t >= split), days(split, TO))
  const bySide = Object.fromEntries(['SELL', 'BUY'].map((s) => [s, summ(tr.filter((x) => x.t >= split && x.side === s))]))
  const verdict = OOS.n >= 100 && OOS.net_lb > 0 && TR.net > 0 ? 'PASS' : OOS.n < 100 ? 'UNDERPOWERED' : 'FAIL'
  cells[`${name}|${k}R`] = { window: w ? '2y' : '13y', train: TR, oos: OOS, oos_by_side: bySide, verdict }
  console.log(`${(name + ' ' + k + 'R').padEnd(12)} OOS n ${String(OOS.n).padStart(5)} (${OOS.per_day}/day) WR ${OOS.wr} $/t ${OOS.net} [LB ${OOS.net_lb}] avgR $${OOS.avg_R} · TRAIN n ${TR.n} WR ${TR.wr} $/t ${TR.net} · SELL ${bySide.SELL.wr}/${bySide.SELL.net} BUY ${bySide.BUY.wr}/${bySide.BUY.net} → ${verdict}`) }
const pass = Object.entries(cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'retest_scalp_study.json'), JSON.stringify({ at: new Date().toISOString(), spec: 'docs/RETEST_SCALP_SPEC.md', setups: EV.length, k: K, cells, passing: pass, verdict: pass.length ? 'SOME_PASS' : 'NO_PASS' }, null, 1))
console.log(`\n=> RETEST SCALP: ${pass.length ? 'PASS ' + pass.join(', ') : 'NO_PASS'}`)
