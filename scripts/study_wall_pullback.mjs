// ════════════════════════════════════════════════════════════════════════════════
// study_wall_pullback.mjs — after a strong-defence bubble at a 4H/1H candle level, a LIMIT back at the wall; $4 first then BE (2026-10-16).
// Pre-registered: docs/WALL_PULLBACK_SPEC.md. Output: data/master/wall_pullback_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { swingWallEvents } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 2, ALPHA = 0.05 / K, Z = zOf(K), HR = 3600000, Y2020 = Date.UTC(2020, 0, 1), spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars
console.log('1m bars', M.length.toLocaleString())
const atr = new Float64Array(M.length); { let a = null; for (let i = 1; i < M.length; i++) { const tr = Math.max(M[i].h - M[i].l, Math.abs(M[i].h - M[i - 1].c), Math.abs(M[i].l - M[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = a } }
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } return out }
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, G1 = resample(HR)
const LV = { L4H: { highs: G4.map((b) => ({ knownT: b.t + 4 * HR, px: b.h })), lows: G4.map((b) => ({ knownT: b.t + 4 * HR, px: b.l })) }, L1H: { highs: G1.map((b) => ({ knownT: b.t + HR, px: b.h })), lows: G1.map((b) => ({ knownT: b.t + HR, px: b.l })) } }
function trade(e, mode) {
  const up = e.type === 'floor', lim = up ? e.wall + e.binW : e.wall - e.binW, brk = up ? e.wall - 2 * e.binW : e.wall + 2 * e.binW
  let fi = null, fill = null
  for (let j = e.di + 1; j < M.length && M[j].t < e.decisionT + 30 * 60000; j++) { const b = M[j], s = spreadAt(b.t)
    if (up ? b.l + s <= lim : b.h >= lim) { fi = j; fill = lim; break }                        // BUY limit filled when the ASK reaches it; SELL when the BID does
    if (up ? b.c <= brk : b.c >= brk) return { cancelled: true } }
  if (fi == null) return { unfilled: true }
  let stop = up ? e.wall - 3 * e.binW : e.wall + 3 * e.binW; const R = up ? fill - stop : stop - fill; if (!(R > 0)) return { unfilled: true }
  const slip = Math.min(0.3, 0.15 * atr[fi]), t4 = up ? fill + 4 : fill - 4, t10 = up ? fill + 10 : fill - 10
  const legs = mode === 'SPLIT4' ? [{ q: 0.5, tgt: t4, open: true, pnl: 0 }, { q: 0.5, tgt: t10, open: true, pnl: 0 }] : [{ q: 1, tgt: t4, open: true, pnl: 0 }]
  let reached4 = false, j = fi, exitT = null
  for (; j < M.length && M[j].t < M[fi].t + 4 * HR; j++) { const b = M[j], s = spreadAt(b.t)
    if (j > fi || true) { if (up ? b.l <= stop : b.h + s >= stop) { for (const L of legs) if (L.open) { L.pnl = (up ? stop - fill : fill - stop) - slip; L.open = false } exitT = b.t; break } }   // stop first (incl. the fill minute)
    for (const L of legs) if (L.open && (up ? b.h >= L.tgt : b.l + s <= L.tgt)) { L.pnl = Math.abs(L.tgt - fill); L.open = false; if (L.tgt === t4) { reached4 = true; if (mode === 'SPLIT4') stop = fill } }
    if (legs.every((L) => !L.open)) { exitT = b.t; break } }
  if (legs.some((L) => L.open)) { const z = M[Math.min(j, M.length - 1)]; for (const L of legs) if (L.open) { L.pnl = up ? z.c - fill : fill - (z.c + spreadAt(z.t)); L.open = false } exitT = z.t }
  return { t: e.decisionT, side: up ? 'BUY' : 'SELL', net: legs.reduce((a, L) => a + L.q * L.pnl, 0), R, reached4, exitT }
}
let seed = 404; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(2) : null, reached_4: n ? +(tr.filter((x) => x.reached4).length / n).toFixed(4) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7
const res = { at: new Date().toISOString(), spec: 'docs/WALL_PULLBACK_SPEC.md', red_line: 'WR >= 85 % + money', cells: {} }
for (const [name, lv] of Object.entries(LV)) {
  const ev = swingWallEvents(M, lv, { from: FROM }).filter((e) => e.decisionT <= TO - 5 * HR)
  const thr = ev.filter((e) => e.decisionT < SPLIT && e.defense).map((e) => e.mag).sort((a, b) => a - b), m66 = thr[Math.floor(thr.length * 2 / 3)]
  const pick = ev.filter((e) => e.defStronger || (e.defense && e.mag > m66))
  for (const mode of ['SPLIT4', 'T4']) { const tr = []; let busy = -Infinity, unf = 0, canc = 0, tried = 0
    for (const e of pick) { if (e.decisionT <= busy) continue; tried++; const r = trade(e, mode); if (r.unfilled) { unf++; continue } if (r.cancelled) { canc++; continue } busy = r.exitT + 60000; tr.push(r) }
    const T = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO))
    const verdict = mode === 'T4' ? 'REPORTED' : O.n >= 100 && O.wr >= 0.85 && O.wr_lb >= 0.80 && O.net > 0 && O.net_lb > 0 && T.net > 0 ? 'PASS' : O.n < 100 ? 'UNDERPOWERED' : 'FAIL'
    const key = `${name}|${mode}`; res.cells[key] = { bubbles: pick.length, tried, fill_rate: +(tr.length / tried).toFixed(4), unfilled: unf, cancelled_wall_broke: canc, train: T, oos: O,
      oos_by_side: { SELL: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'SELL')).net, BUY: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'BUY')).net }, era: { pre2020: summ(tr.filter((x) => x.t < Y2020)).net, post2020: summ(tr.filter((x) => x.t >= Y2020)).net }, verdict }
    const c = res.cells[key]
    console.log(`${key.padEnd(12)} bubbles ${pick.length} · fill ${(100 * c.fill_rate).toFixed(1)}% (unfilled ${unf}, wall broke ${canc}) · OOS n ${O.n} (${O.per_day}/d) WR ${O.wr} (LB ${O.wr_lb}) $/t ${O.net} [LB ${O.net_lb}] risk $${O.avg_risk} reached $4 ${O.reached_4} · TRAIN WR ${T.wr} $/t ${T.net} · SELL ${c.oos_by_side.SELL} BUY ${c.oos_by_side.BUY} · pre/post ${c.era.pre2020}/${c.era.post2020} → ${verdict}`) } }
res.passing = Object.entries(res.cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'wall_pullback_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> PULLBACK LIMIT ($4 then BE): ${res.passing.length ? 'PASS ' + res.passing.join(', ') : 'NO_PASS'}`)
