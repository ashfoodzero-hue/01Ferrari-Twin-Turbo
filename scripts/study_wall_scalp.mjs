// ════════════════════════════════════════════════════════════════════════════════
// study_wall_scalp.mjs — a SMALL SCALP at defended 4H-candle / swing levels, with real spreads (2026-10-16). Pre-registered: docs/WALL_SCALP_SPEC.md.
// Output: data/master/wall_scalp_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { swingWallEvents } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 15, ALPHA = 0.05 / K, Z = zOf(K), HZ = 240, Y2020 = Date.UTC(2020, 0, 1), spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars
console.log('1m bars', M.length.toLocaleString())
const atr = new Float64Array(M.length); { let a = null; for (let i = 1; i < M.length; i++) { const tr = Math.max(M[i].h - M[i].l, Math.abs(M[i].h - M[i - 1].c), Math.abs(M[i].l - M[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = a } }
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } return out }
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, H4 = 4 * 3600000
const piv = (B, ms, P) => { const p = confirmedPivots(B, P), k = (x) => ({ knownT: B[x.knownAt].t + ms, px: x.px }); return { highs: p.highs.map(k), lows: p.lows.map(k) } }
const VARIANTS = {
  C4H: { highs: G4.map((b) => ({ knownT: b.t + H4, px: b.h })), lows: G4.map((b) => ({ knownT: b.t + H4, px: b.l })) },
  S4H: piv(G4, H4, 3), S1H: piv(resample(3600000), 3600000, 5), S15: piv(resample(900000), 900000, 5), S3: piv(resample(180000), 180000, 5) }
function trade(e, mode) { const up = e.type === 'floor', i0 = e.di, T = e.decisionT, s0 = spreadAt(T), entry = up ? M[i0].c + s0 : M[i0].c
  let stop = up ? e.wall - 3 * e.binW : e.wall + 3 * e.binW; const R = up ? entry - stop : stop - entry; if (!(R > 0)) return null
  const slip = Math.min(0.3, 0.15 * atr[i0]), t4 = up ? entry + 4 : entry - 4, t10 = up ? entry + 10 : entry - 10
  let legs = mode === 'SPLIT' ? [{ q: 0.5, tgt: t4, open: true, pnl: 0 }, { q: 0.5, tgt: t10, open: true, pnl: 0 }] : [{ q: 1, tgt: mode === 'T4' ? t4 : t10, open: true, pnl: 0 }]
  let mfe = 0, j = i0 + 1, exitT = null
  for (; j < M.length && j <= i0 + HZ; j++) { const b = M[j], s = spreadAt(b.t); mfe = Math.max(mfe, up ? b.h - entry : entry - (b.l + s))
    if (up ? b.l <= stop : b.h + s >= stop) { for (const L of legs) if (L.open) { L.pnl = (up ? stop - entry : entry - stop) - slip; L.open = false } exitT = b.t; break }
    for (const L of legs) if (L.open && (up ? b.h >= L.tgt : b.l + s <= L.tgt)) { L.pnl = Math.abs(L.tgt - entry); L.open = false; if (mode === 'SPLIT' && L.tgt === t4) stop = entry }
    if (legs.every((L) => !L.open)) { exitT = b.t; break } }
  if (legs.some((L) => L.open)) { const z = M[Math.min(j, M.length - 1)]; for (const L of legs) if (L.open) { L.pnl = up ? z.c - entry : entry - (z.c + spreadAt(z.t)); L.open = false } exitT = z.t }
  return { t: T, side: up ? 'BUY' : 'SELL', net: legs.reduce((a, L) => a + L.q * L.pnl, 0), R, reached10: mfe >= 10, exitT }
}
let seed = 77; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((a, x) => a + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let i = 0; i < n; i++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null,
    avg_risk: n ? +(tr.reduce((a, x) => a + x.R, 0) / n).toFixed(2) : null, reached_100pips: n ? +(tr.filter((x) => x.reached10).length / n).toFixed(4) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7
const res = { at: new Date().toISOString(), spec: 'docs/WALL_SCALP_SPEC.md', red_line: 'WR >= 85 % + money', cells: {} }
for (const [name, lv] of Object.entries(VARIANTS)) {
  const ev = swingWallEvents(M, lv, { from: FROM }).filter((e) => e.decisionT <= TO - HZ * 60000)
  const trn = ev.filter((e) => e.decisionT < SPLIT && e.defense).map((e) => e.mag).sort((a, b) => a - b), m66 = trn[Math.floor(trn.length * 2 / 3)]
  const pick = ev.filter((e) => e.defStronger || (e.defense && e.mag > m66))
  console.log(`\n── ${name}: ${ev.length} tests, ${pick.length} strong-defence bubbles (${(pick.length / wd(FROM, TO)).toFixed(2)}/day)`)
  for (const mode of ['T4', 'T10', 'SPLIT']) { const tr = []; let busy = -Infinity
    for (const e of pick) { if (e.decisionT <= busy) continue; const r = trade(e, mode); if (!r) continue; busy = r.exitT + 60000; tr.push(r) }
    const T = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), O = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO))
    const verdict = O.n >= 100 && O.wr >= 0.85 && O.wr_lb >= 0.80 && O.net > 0 && O.net_lb > 0 && T.net > 0 ? 'PASS' : O.n < 100 ? 'UNDERPOWERED' : 'FAIL'
    res.cells[`${name}|${mode}`] = { train: T, oos: O, oos_by_side: { SELL: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'SELL')), BUY: summ(tr.filter((x) => x.t >= SPLIT && x.side === 'BUY')) }, era: { pre2020: summ(tr.filter((x) => x.t < Y2020)).net, post2020: summ(tr.filter((x) => x.t >= Y2020)).net }, verdict }
    const c = res.cells[`${name}|${mode}`]
    console.log(`  ${mode.padEnd(5)} OOS n ${String(O.n).padStart(5)} (${O.per_day}/d) WR ${O.wr} (LB ${O.wr_lb}) $/t ${O.net} [LB ${O.net_lb}] risk $${O.avg_risk} · reached 100 pips ${O.reached_100pips} · TRAIN WR ${T.wr} $/t ${T.net} · SELL ${c.oos_by_side.SELL.net} BUY ${c.oos_by_side.BUY.net} → ${verdict}`) } }
res.passing = Object.entries(res.cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'wall_scalp_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> WALL SCALP (WR ≥ 85 % + money): ${res.passing.length ? 'PASS ' + res.passing.join(', ') : 'NO_PASS'}`)
