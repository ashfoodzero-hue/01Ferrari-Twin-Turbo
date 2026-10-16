// ════════════════════════════════════════════════════════════════════════════════
// study_swing_start.mjs — SWING START WATCH: do sweep / discount / exhaustion conditions mark real trend starts? (2026-10-16)
// Pre-registered: docs/SWING_START_SPEC.md. Output: data/master/swing_start_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { rsi as rsiArr } from '../src/core/indicators.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 6, Z = zOf(K), DAY = 86400000, Y2020 = Date.UTC(2020, 0, 1), spreadAt = makeSpreadAt()
const dayStart = (t) => { const off = nyOffsetMs(t); return Math.floor((t + off - 17 * 3600000) / DAY) * DAY + 17 * 3600000 - off }
const D = []; let c = null
for await (const b of streamBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 400 * DAY, to: TO + 120 * DAY })) { const d = dayStart(b.t)
  if (!c || c.t !== d) { if (c) D.push(c); c = { t: d, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } }
if (c && c.t + DAY <= Date.now()) D.push(c)
const R = rsiArr(D, 14)
console.log(`${D.length} NY daily candles`)
const minL = (i, n) => { let m = Infinity; for (let k = i - n; k < i; k++) m = Math.min(m, D[k].l); return m }, maxH = (i, n) => { let m = -Infinity; for (let k = i - n; k < i; k++) m = Math.max(m, D[k].h); return m }
const pos60 = (i) => { const lo = Math.min(minL(i, 59), D[i].l), hi = Math.max(maxH(i, 59), D[i].h); return hi > lo ? (D[i].c - lo) / (hi - lo) : 0.5 }
const rsiAny = (i, f) => { for (let k = i - 3; k <= i; k++) if (R[k] != null && f(R[k])) return true; return false }
const ALERT = {
  'A-52W': { bull: (i) => D[i].l < minL(i, 252) && D[i].c > minL(i, 252), bear: (i) => D[i].h > maxH(i, 252) && D[i].c < maxH(i, 252) },
  'A-SWEEP+EXH': { bull: (i) => D[i].l < minL(i, 20) && D[i].c > minL(i, 20) && pos60(i) <= 0.25 && rsiAny(i, (r) => r < 35), bear: (i) => D[i].h > maxH(i, 20) && D[i].c < maxH(i, 20) && pos60(i) >= 0.75 && rsiAny(i, (r) => r > 65) },
  'A-SWEEP+DISC': { bull: (i) => D[i].l < minL(i, 20) && D[i].c > minL(i, 20) && pos60(i) <= 0.25, bear: (i) => D[i].h > maxH(i, 20) && D[i].c < maxH(i, 20) && pos60(i) >= 0.75 } }
/** outcome from day i's close: +pct (bull) / −pct (bear) reached before a close beyond day i's low/high, within 60 days */
function outcome(i, side, pct) { const c0 = D[i].c, inv = side === 'bull' ? D[i].l : D[i].h, tgt = side === 'bull' ? c0 * (1 + pct) : c0 * (1 - pct)
  for (let k = i + 1; k <= i + 60 && k < D.length; k++) { if (side === 'bull' ? D[k].h >= tgt : D[k].l <= tgt) return { hit: true, days: k - i }; if (side === 'bull' ? D[k].c < inv : D[k].c > inv) return { hit: false, days: k - i } }
  return { hit: false, days: 60 } }
/** traded: entry next open (+spread for a buy), stop = a close beyond the alert-day extreme (exit at that close), target +5 %, 60 days */
function traded(i, side) { if (i + 1 >= D.length) return null; const up = side === 'bull', e = D[i + 1].o + (up ? spreadAt(D[i + 1].t) : 0), inv = up ? D[i].l : D[i].h, risk = Math.abs(e - inv); if (!(risk > 0)) return null
  const tgt = up ? e * 1.05 : e * 0.95
  for (let k = i + 1; k <= i + 60 && k < D.length; k++) { if (up ? D[k].h >= tgt : D[k].l <= tgt) return (Math.abs(tgt - e)) / risk; if (up ? D[k].c < inv : D[k].c > inv) return -Math.abs(D[k].c - e) / risk }
  const z = D[Math.min(i + 60, D.length - 1)].c; return (up ? z - e : e - z) / risk }
const inWin = (i) => i >= 260 && D[i].t >= FROM && D[i].t <= TO
const base = {}; for (const side of ['bull', 'bear']) for (const sp of ['train', 'oos']) { const xs = D.map((_, i) => i).filter((i) => inWin(i) && (D[i].t < SPLIT) === (sp === 'train')); base[`${side}_${sp}`] = xs.filter((i) => outcome(i, side, 0.05).hit).length / xs.length }
const res = { at: new Date().toISOString(), spec: 'docs/SWING_START_SPEC.md', base: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, +v.toFixed(4)])), cells: {} }
const yrs = (TO - FROM) / (365.25 * DAY)
for (const [name, A] of Object.entries(ALERT)) for (const side of ['bull', 'bear']) {
  const ev = []; let lastI = -Infinity; for (let i = 0; i < D.length; i++) if (inWin(i) && A[side](i)) { if (i - lastI > 10) ev.push(i); lastI = i }
  const rows = ev.map((i) => ({ i, t: D[i].t, s5: outcome(i, side, 0.05), s10: outcome(i, side, 0.10).hit, R: traded(i, side) }))
  const st = (xs) => { const n = xs.length, w = xs.filter((r) => r.s5.hit).length; return { n, s5: n ? +(w / n).toFixed(4) : null, s5_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, s10: n ? +(xs.filter((r) => r.s10).length / n).toFixed(4) : null,
    med_days_to_5: (() => { const d = xs.filter((r) => r.s5.hit).map((r) => r.s5.days).sort((a, b) => a - b); return d.length ? d[d.length >> 1] : null })(), avg_R: n ? +(xs.reduce((a, r) => a + (r.R ?? 0), 0) / n).toFixed(3) : null } }
  const T = st(rows.filter((r) => r.t < SPLIT)), O = st(rows.filter((r) => r.t >= SPLIT)), A_ = st(rows), bO = base[`${side}_oos`], bT = base[`${side}_train`]
  const verdict = O.n < 20 ? 'UNDERPOWERED' : O.s5 - bO >= 0.10 && O.s5_lb > bO && T.s5 - bT > 0 ? 'USEFUL' : 'NOT_USEFUL'
  res.cells[`${name}|${side}`] = { per_year: +(rows.length / yrs).toFixed(2), all: A_, train: { ...T, base: +bT.toFixed(4) }, oos: { ...O, base: +bO.toFixed(4) }, era: { pre2020: st(rows.filter((r) => r.t < Y2020)).s5, post2020: st(rows.filter((r) => r.t >= Y2020)).s5 }, verdict,
    dates: rows.slice(-6).map((r) => ({ day: new Date(r.t + 7 * 3600000).toISOString().slice(0, 10), s5: r.s5.hit, s10: r.s10 })) }
  const r = res.cells[`${name}|${side}`]
  console.log(`${(name + ' ' + side).padEnd(18)} ${String(r.per_year).padStart(5)}/y · ALL n ${A_.n} +5% ${A_.s5} +10% ${A_.s10} avgR ${A_.avg_R} · OOS n ${O.n} ${O.s5} (LB ${O.s5_lb}) vs base ${bO.toFixed(3)} · TRAIN ${T.s5} vs ${bT.toFixed(3)} · pre/post ${r.era.pre2020}/${r.era.post2020} → ${verdict}`) }
res.useful = Object.entries(res.cells).filter(([, c]) => c.verdict === 'USEFUL').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'swing_start_study.json'), JSON.stringify(res, null, 1))
console.log(`\nbase +5% before invalidation: ${JSON.stringify(res.base)}\n=> SWING START WATCH useful: ${res.useful.join(', ') || 'none'}`)
