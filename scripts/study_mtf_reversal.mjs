// ════════════════════════════════════════════════════════════════════════════════
// study_mtf_reversal.mjs — Ashraf's top-down reversal: 4H/1H candle level → 15m/30m reversal candle → 3m CHoCH entry (2026-10-16).
// Pre-registered: docs/MTF_REVERSAL_SPEC.md. Output: data/master/mtf_reversal_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 12, ALPHA = 0.05 / K, Z = zOf(K), Y2020 = Date.UTC(2020, 0, 1), HR = 3600000, spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lbI = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log('1m bars', M.length.toLocaleString())
const atr = new Float64Array(M.length); { let a = null; for (let i = 1; i < M.length; i++) { const tr = Math.max(M[i].h - M[i].l, Math.abs(M[i].h - M[i - 1].c), Math.abs(M[i].l - M[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = a } }
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } if (c) out.push(c); return out }
async function* it() { for (const b of M) yield b }
const LEVELS = { L4H: { bars: (await resample4h(it(), ['ny'])).ny, ms: 4 * HR }, L1H: { bars: resample(HR), ms: HR } }
const CONF = { '15m': resample(900000), '30m': resample(1800000) }, CMS = { '15m': 900000, '30m': 1800000 }
const B3 = resample(180000), P3 = confirmedPivots(B3, 5), B3T = Float64Array.from(B3.map((b) => b.t))
const i3 = (t) => { let lo = 0, hi = B3T.length; while (lo < hi) { const m = (lo + hi) >> 1; if (B3T[m] < t) lo = m + 1; else hi = m } return lo }
/** confirmation setups for a level set on a confirmation timeframe (causal) */
function setups(lv, conf, cms) {
  const out = [], ceil = [], flo = []; let li = 0
  for (const c of conf) { const cEnd = c.t + cms
    while (li < lv.bars.length && lv.bars[li].t + lv.ms <= c.t) { ceil.push(lv.bars[li].h); flo.push(lv.bars[li].l); li++ }   // known before this candle opens
    const tol = c.c * 0.0005
    let L = null; for (const px of ceil) if (px <= c.h + tol && px > c.c && c.h >= px - tol && (L == null || Math.abs(px - c.h) < Math.abs(L - c.h))) L = px
    if (L != null && c.c < c.o) out.push({ side: 'SELL', level: L, confT: cEnd, startT: c.t })
    let F = null; for (const px of flo) if (px >= c.l - tol && px < c.c && c.l <= px + tol && (F == null || Math.abs(px - c.l) < Math.abs(F - c.l))) F = px
    if (F != null && c.c > c.o) out.push({ side: 'BUY', level: F, confT: cEnd, startT: c.t })
    for (let k = ceil.length - 1; k >= 0; k--) if (c.c > ceil[k]) ceil.splice(k, 1)        // broken by a confirmation-candle close
    for (let k = flo.length - 1; k >= 0; k--) if (c.c < flo[k]) flo.splice(k, 1)
  }
  return out
}
/** the 3m CHoCH entry within 2 h after the confirmation, then the trade on the 1m path */
function trade(s, mode) {
  const up = s.side === 'BUY'; let k = i3(s.confT), entryBar = null
  for (; k < B3.length && B3[k].t < s.confT + 2 * HR; k++) { const b = B3[k]; if (b.t < s.confT) continue
    const sw = up ? P3.lastHighAt[k] : P3.lastLowAt[k]; if (!Number.isFinite(sw)) continue
    if (up ? b.c > sw : b.c < sw) { entryBar = b; break } }
  if (!entryBar) return { noChoch: true }
  const T = entryBar.t + 180000, i0 = lbI(T) - 1, s0 = spreadAt(T), entry = up ? entryBar.c + s0 : entryBar.c
  let ext = up ? Infinity : -Infinity; for (let j = lbI(s.startT); j <= i0; j++) ext = up ? Math.min(ext, M[j].l) : Math.max(ext, M[j].h)
  let stop = up ? ext - 0.5 : ext + 0.5; const R = up ? entry - stop : stop - entry; if (!(R >= 0.5 && R <= 15)) return { badRisk: true }
  const slip = Math.min(0.3, 0.15 * atr[i0]), t1 = up ? entry + R : entry - R, t2 = up ? entry + 2 * R : entry - 2 * R
  const legs = mode === 'SPLIT' ? [{ q: 0.5, tgt: t1, open: true, pnl: 0 }, { q: 0.5, tgt: t2, open: true, pnl: 0 }] : [{ q: 1, tgt: mode === '1R' ? t1 : t2, open: true, pnl: 0 }]
  let j = i0 + 1, exitT = null
  for (; j < M.length && M[j].t < T + 8 * HR; j++) { const b = M[j], sp = spreadAt(b.t)
    if (up ? b.l <= stop : b.h + sp >= stop) { for (const L of legs) if (L.open) { L.pnl = (up ? stop - entry : entry - stop) - slip; L.open = false } exitT = b.t; break }
    for (const L of legs) if (L.open && (up ? b.h >= L.tgt : b.l + sp <= L.tgt)) { L.pnl = Math.abs(L.tgt - entry); L.open = false; if (mode === 'SPLIT' && L.tgt === t1) stop = entry }
    if (legs.every((L) => !L.open)) { exitT = b.t; break } }
  if (legs.some((L) => L.open)) { const z = M[Math.min(j, M.length - 1)]; for (const L of legs) if (L.open) { L.pnl = up ? z.c - entry : entry - (z.c + spreadAt(z.t)); L.open = false } exitT = z.t }
  return { t: T, side: s.side, net: legs.reduce((a, L) => a + L.q * L.pnl, 0), R, exitT }
}
let seed = 8; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(2) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7
const res = { at: new Date().toISOString(), spec: 'docs/MTF_REVERSAL_SPEC.md', red_line: 'WR >= 85 % + money', cells: {} }
for (const [ln, lv] of Object.entries(LEVELS)) for (const [cn, conf] of Object.entries(CONF)) {
  const S = setups(lv, conf, CMS[cn]).filter((s) => s.confT >= FROM && s.confT <= TO - 10 * HR)
  for (const mode of ['1R', '2R', 'SPLIT']) { const tr = []; let busy = -Infinity, noCh = 0, bad = 0
    for (const s of S) { if (s.confT <= busy) continue; const r = trade(s, mode); if (r.noChoch) { noCh++; continue } if (r.badRisk) { bad++; continue } busy = r.exitT + 60000; tr.push(r) }
    const T = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO))
    const verdict = O.n >= 100 && O.wr >= 0.85 && O.wr_lb >= 0.80 && O.net > 0 && O.net_lb > 0 && T.net > 0 ? 'PASS' : O.n < 100 ? 'UNDERPOWERED' : 'FAIL'
    const key = `${ln}|${cn}|${mode}`; res.cells[key] = { setups: S.length, no_choch: noCh, bad_risk: bad, train: T, oos: O, oos_by_side: { SELL: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'SELL')), BUY: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'BUY')) }, era: { pre2020: summ(tr.filter((x) => x.t < Y2020)).net, post2020: summ(tr.filter((x) => x.t >= Y2020)).net }, verdict }
    const c = res.cells[key]
    console.log(`${key.padEnd(18)} setups ${S.length} (no CHoCH ${noCh}) · OOS n ${String(O.n).padStart(4)} (${O.per_day}/d) WR ${O.wr} (LB ${O.wr_lb}) $/t ${O.net} [LB ${O.net_lb}] risk $${O.avg_risk} · TRAIN WR ${T.wr} $/t ${T.net} · SELL ${c.oos_by_side.SELL.net} BUY ${c.oos_by_side.BUY.net} · pre/post ${c.era.pre2020}/${c.era.post2020} → ${verdict}`) } }
res.passing = Object.entries(res.cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'mtf_reversal_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> TOP-DOWN REVERSAL (WR ≥ 85 % + money): ${res.passing.length ? 'PASS ' + res.passing.join(', ') : 'NO_PASS'}`)
