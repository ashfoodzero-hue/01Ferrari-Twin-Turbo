// ════════════════════════════════════════════════════════════════════════════════
// study_bubbles.mjs — the 4H Macro BUBBLES (Ashraf's Pine, bubble method only) on 13 y (2026-10-16). Pre-registered: docs/BUBBLE_SPEC.md.
// Output: data/master/bubble_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { bubbleEvents } from '../src/master/macroBubbles.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
const K = 8, Z = zOf(K), Y2020 = Date.UTC(2020, 0, 1), HR = 3600000
const ONEH = []; let cur = null
async function* tee(src) { for await (const b of src) { const t = Math.floor(b.t / HR) * HR; if (!cur || cur.t !== t) { if (cur) ONEH.push(cur); cur = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c } yield b } }
console.log('building NY 4H (+ 1H) candles …')
const G = (await resample4h(tee(streamBars('XAUUSD', '1m', { from: FROM - 120 * 86400000, to: TO + 40 * 86400000 })), ['ny'])).ny
let seed = 1610; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const rate = (w, n) => ({ n, rate: n ? +(w / n).toFixed(4) : null, lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null })
function analyse(bars, barMs, label, tie = 'strict') {
  const A = atrArr(bars, 14), { events, ties } = bubbleEvents(bars, undefined, barMs, tie), inWin = (i) => bars[i].t >= FROM && bars[i].t <= TO && i + 30 < bars.length
  const splitOf = (i) => bars[i].t < SPLIT ? 'train' : 'oos'
  const base = {}; for (const sp of ['train', 'oos']) for (const h of [1, 6, 30]) { let up = 0, dn = 0, n = 0; for (let i = 0; i < bars.length; i++) { if (!inWin(i) || splitOf(i) !== sp) continue; n++; if (bars[i + h].c > bars[i].c) up++; if (bars[i + h].c < bars[i].c) dn++ } base[`${sp}_${h}`] = { up: up / n, dn: dn / n } }
  const pool = { train: [], oos: [] }; for (let i = 0; i < bars.length; i++) if (inWin(i) && A[i] > 0) pool[splitOf(i)].push(i)
  const holds = (i, level, side) => { for (let j = i + 1; j <= i + 30; j++) if (side === 'BEAR' ? bars[j].h > level : bars[j].l < level) return false; return true }
  const rows = events.filter((e) => inWin(e.knownI) && A[e.knownI] > 0).map((e) => { const i = e.knownI, c = bars[i].c, sp = splitOf(i), dist = Math.abs(e.level - c) / A[i]
    const right = (h) => e.side === 'BEAR' ? bars[i + h].c < c : bars[i + h].c > c
    let ph = 0; for (let m = 0; m < 20; m++) { const q = pool[sp][(rnd() * pool[sp].length) | 0], lv = e.side === 'BEAR' ? bars[q].c + dist * A[q] : bars[q].c - dist * A[q]; if (holds(q, lv, e.side)) ph++ }
    const lvlOk = e.side === 'BEAR' ? e.level >= c : e.level <= c   // level already through the close = no level to hold (counted, excluded from LV)
    return { ...e, split: sp, d4: right(1), d24: right(6), d5: right(30), lv: lvlOk ? holds(i, e.level, e.side) : null, phold: ph / 20, dist: +dist.toFixed(2) } })
  const cells = {}
  for (const side of ['BULL', 'BEAR']) {
    for (const [k, h] of [['D4', 1], ['D24', 6], ['D5d', 30]]) { const f = (sp) => rows.filter((r) => r.side === side && r.split === sp), key = k === 'D4' ? 'd4' : k === 'D24' ? 'd24' : 'd5'
      const O = f('oos'), T = f('train'), bO = base[`oos_${h}`][side === 'BEAR' ? 'dn' : 'up'], bT = base[`train_${h}`][side === 'BEAR' ? 'dn' : 'up']
      const o = rate(O.filter((r) => r[key]).length, O.length), t = rate(T.filter((r) => r[key]).length, T.length)
      cells[`${k}|${side}`] = { oos: { ...o, base: +bO.toFixed(4), lift: o.n ? +(o.rate - bO).toFixed(4) : null }, train: { ...t, base: +bT.toFixed(4), lift: t.n ? +(t.rate - bT).toFixed(4) : null },
        verdict: o.n < 30 ? 'UNDERPOWERED' : o.rate - bO >= 0.05 && o.lb > bO && t.rate - bT > 0 ? 'INFORMATIVE' : 'NO_EDGE' } }
    const lvR = (sp) => rows.filter((r) => r.side === side && r.split === sp && r.lv != null), O = lvR('oos'), T = lvR('train')
    const pO = O.length ? O.reduce((a, r) => a + r.phold, 0) / O.length : null, pT = T.length ? T.reduce((a, r) => a + r.phold, 0) / T.length : null, o = rate(O.filter((r) => r.lv).length, O.length), t = rate(T.filter((r) => r.lv).length, T.length)
    cells[`LV|${side}`] = { oos: { ...o, placebo: pO == null ? null : +pO.toFixed(4), lift: o.n ? +(o.rate - pO).toFixed(4) : null }, train: { ...t, placebo: pT == null ? null : +pT.toFixed(4), lift: t.n ? +(t.rate - pT).toFixed(4) : null },
      verdict: o.n < 30 ? 'UNDERPOWERED' : o.rate - pO >= 0.05 && o.lb > pO && t.rate - pT > 0 ? 'INFORMATIVE' : 'NO_EDGE' } }
  const per = (side) => { const xs = rows.filter((r) => r.side === side); const yrs = (TO - FROM) / (365.25 * 86400000); return +(xs.length / yrs).toFixed(1) }
  const all = Object.fromEntries(['BULL', 'BEAR'].map((s) => { const xs = rows.filter((r) => r.side === s); return [s, { n: xs.length, per_year: per(s), d24: rate(xs.filter((r) => r.d24).length, xs.length).rate, d5d: rate(xs.filter((r) => r.d5).length, xs.length).rate,
    count1_d24: rate(xs.filter((r) => r.count === 1 && r.d24).length, xs.filter((r) => r.count === 1).length).rate, count2plus_d24: rate(xs.filter((r) => r.count >= 2 && r.d24).length, xs.filter((r) => r.count >= 2).length).rate, n_count2plus: xs.filter((r) => r.count >= 2).length,
    pre2020_d24: rate(xs.filter((r) => r.knownT < Y2020 && r.d24).length, xs.filter((r) => r.knownT < Y2020).length).rate, post2020_d24: rate(xs.filter((r) => r.knownT >= Y2020 && r.d24).length, xs.filter((r) => r.knownT >= Y2020).length).rate }] }))
  console.log(`\n── ${label}: ${rows.length} bubbles in window (pivot ties ${ties}) · BULL ${all.BULL.n} (${all.BULL.per_year}/y) · BEAR ${all.BEAR.n} (${all.BEAR.per_year}/y)`)
  for (const [k, c] of Object.entries(cells)) console.log(`  ${k.padEnd(9)} OOS n ${String(c.oos.n).padStart(3)} rate ${c.oos.rate} (LB ${c.oos.lb}) vs ${k.startsWith('LV') ? 'placebo ' + c.oos.placebo : 'base ' + c.oos.base} lift ${c.oos.lift == null ? '—' : (c.oos.lift * 100).toFixed(1) + 'pp'} · TRAIN n ${c.train.n} lift ${c.train.lift == null ? '—' : (c.train.lift * 100).toFixed(1) + 'pp'} → ${c.verdict}`)
  console.log('  all-sample: ' + JSON.stringify(all))
  return { label, ties, cells, all, recent: rows.slice(-12).map((r) => ({ side: r.side, pivot: new Date(r.pivotT).toISOString(), known: new Date(r.knownT).toISOString(), rsi: r.rsi, prev: r.prevRsi, level: r.level, count: r.count })) }
}
const res = { at: new Date().toISOString(), spec: 'docs/BUBBLE_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], primary_4h: analyse(G, 4 * HR, 'PRIMARY 4H (NY)'), robustness_1h: analyse(ONEH, HR, 'ROBUSTNESS 1H (reported only)') }
res.tie_variants_4h = { leftEq: analyse(G, 4 * HR, 'TIE VARIANT leftEq 4H', 'leftEq').cells, rightEq: analyse(G, 4 * HR, 'TIE VARIANT rightEq 4H', 'rightEq').cells }
res.informative = Object.entries(res.primary_4h.cells).filter(([, c]) => c.verdict === 'INFORMATIVE').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'bubble_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> 4H BUBBLES INFORMATIVE cells: ${res.informative.length ? res.informative.join(', ') : 'none'}`)
