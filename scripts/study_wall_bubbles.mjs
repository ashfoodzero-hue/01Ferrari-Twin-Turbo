// ════════════════════════════════════════════════════════════════════════════════
// study_wall_bubbles.mjs — WALL-PRESSURE bubbles: pre-registered re-check + RSI confirmation (2026-10-16). docs/WALL_BUBBLES_SPEC.md.
// Output: data/master/wall_bubbles_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { rsi as rsiArr } from '../src/core/indicators.js'
import { wallEvents, holdLabel } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { bubbleEvents } from '../src/master/macroBubbles.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K1 = 3, K2 = 6, HR = 3600000, H4 = 4 * HR, Y2020 = Date.UTC(2020, 0, 1)
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO })).bars
console.log('1m bars', M.length.toLocaleString())
// RSI context (causal): NY 4H + UTC 1H candles from the same minutes
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, R4 = rsiArr(G4, 14), B4 = bubbleEvents(G4).events
const G1 = []; { let c = null; for (const b of M) { const t = Math.floor(b.t / HR) * HR; if (!c || c.t !== t) { if (c) G1.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } }
const R1 = rsiArr(G1, 14)
const lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
const ev = wallEvents(M, { from: FROM }).filter((e) => e.decisionT <= TO)
for (const e of ev) { e.hold = holdLabel(M, e); const T = e.decisionT, up = e.type === 'floor'
  const i4 = lastClosed(G4, H4, T), i1 = lastClosed(G1, HR, T), r4 = i4 >= 0 ? R4[i4] : null, r1 = i1 >= 0 ? R1[i1] : null
  e.R4 = r4 != null && (up ? r4 < 35 : r4 > 65); e.R1 = r1 != null && (up ? r1 < 35 : r1 > 65)
  e.RB4 = B4.some((b) => b.side === (up ? 'BULL' : 'BEAR') && b.knownT <= T && b.knownT >= T - 6 * H4)
  e.split = T < SPLIT ? 'train' : 'oos' }
const lab = ev.filter((e) => e.hold != null)
const hr = (xs) => xs.length ? xs.filter((e) => e.hold).length / xs.length : null
console.log(`REPLICATION (no-drift vs study (an) 60.4 / 71.4 / 51.2): all ${(100 * hr(lab)).toFixed(1)}% · defense ${(100 * hr(lab.filter((e) => e.defense))).toFixed(1)}% · attack ${(100 * hr(lab.filter((e) => !e.defense))).toFixed(1)}% (n ${lab.length})`)
const m66 = (() => { const v = lab.filter((e) => e.split === 'train' && e.defense).map((e) => e.mag).sort((a, b) => a - b); return v[Math.floor(v.length * 2 / 3)] })()
const CLS = { ALL: () => true, ATTACK: (e) => !e.defense, DEFENSE: (e) => e.defense, STRONG: (e) => e.defense && e.mag > m66, 'DEF>PUSH': (e) => e.defStronger }
let seed = 99; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const weeks = (xs) => { const m = new Map(); for (const e of xs) { const w = Math.floor((e.decisionT + 4 * 86400000) / (7 * 86400000)); if (!m.has(w)) m.set(w, []); m.get(w).push(e) } return [...m.values()] }
function bootLB(xs, stat, alpha) { const B = weeks(xs), n = B.length, v = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < n; i++) s.push(...B[(rnd() * n) | 0]); const x = stat(s); if (x != null && Number.isFinite(x)) v.push(x) } v.sort((a, b) => a - b); return v[Math.floor(alpha * v.length)] }
const f4 = (x) => x == null ? null : +x.toFixed(4)
const oos = lab.filter((e) => e.split === 'oos'), trn = lab.filter((e) => e.split === 'train'), baseO = hr(oos), baseT = hr(trn)
const res = { at: new Date().toISOString(), spec: 'docs/WALL_BUBBLES_SPEC.md', events: ev.length, labelled: lab.length, strong_threshold_train_p66: m66,
  replication: { all: f4(hr(lab)), defense: f4(hr(lab.filter((e) => e.defense))), attack: f4(hr(lab.filter((e) => !e.defense))) }, base: { oos: f4(baseO), train: f4(baseT) }, classes: {}, rsi: {} }
for (const [k, f] of Object.entries(CLS)) { const O = oos.filter(f), T = trn.filter(f), lift = (s) => hr(s.filter(f)) - hr(s)
  const r = { oos_n: O.length, oos_hold: f4(hr(O)), oos_lift: f4(hr(O) - baseO), train_n: T.length, train_hold: f4(hr(T)), train_lift: f4(hr(T) - baseT) }
  if (['DEFENSE', 'STRONG', 'DEF>PUSH'].includes(k)) { r.lift_lb = f4(bootLB(oos, lift, 0.05 / K1)); r.verdict = O.length >= 300 && r.oos_lift >= 0.05 && r.lift_lb > 0 && r.train_lift > 0 ? 'SHOWN' : 'NOT_SHOWN' }
  r.by_side = Object.fromEntries(['ceiling', 'floor'].map((s) => [s, f4(hr(O.filter((e) => e.type === s)))]))
  r.era = { pre2020: f4(hr(lab.filter((e) => f(e) && e.decisionT < Y2020))), post2020: f4(hr(lab.filter((e) => f(e) && e.decisionT >= Y2020))) }
  res.classes[k] = r
  console.log(`  ${k.padEnd(9)} OOS n ${String(O.length).padStart(5)} hold ${r.oos_hold} lift ${(r.oos_lift * 100).toFixed(1)}pp${r.lift_lb != null ? ' (LB ' + (r.lift_lb * 100).toFixed(1) + ')' : ''} · TRAIN ${r.train_hold} lift ${(r.train_lift * 100).toFixed(1)}pp · ceiling ${r.by_side.ceiling} floor ${r.by_side.floor} · pre/post2020 ${r.era.pre2020}/${r.era.post2020}${r.verdict ? ' → ' + r.verdict : ''}`) }
// stacking: hold by defended-test count at the same wall (DEFENSE only)
res.stacking = Object.fromEntries([['1', (e) => e.count === 1], ['2', (e) => e.count === 2], ['3+', (e) => e.count >= 3]].map(([k, f]) => { const O = oos.filter((e) => e.defense && f(e)); return [k, { oos_n: O.length, oos_hold: f4(hr(O)), train_hold: f4(hr(trn.filter((e) => e.defense && f(e)))) }] }))
console.log('  stacking (DEFENSE, by defended-test count at the same wall): ' + JSON.stringify(res.stacking))
// RSI confirmation on top of DEFENSE / DEF>PUSH
for (const base of ['DEFENSE', 'DEF>PUSH']) for (const rk of ['R4', 'RB4', 'R1']) { const fb = CLS[base], fr = (e) => fb(e) && e[rk]
  const diff = (s) => { const a = hr(s.filter(fr)), b = hr(s.filter(fb)); return a == null || b == null ? null : a - b }
  const O = oos.filter(fr), r = { oos_n: O.length, oos_hold: f4(hr(O)), class_hold: f4(hr(oos.filter(fb))), oos_diff: f4(diff(oos)), diff_lb: O.length ? f4(bootLB(oos, diff, 0.05 / K2)) : null, train_n: trn.filter(fr).length, train_diff: f4(diff(trn)) }
  r.verdict = r.oos_n >= 100 && r.oos_diff >= 0.03 && r.diff_lb > 0 && r.train_diff > 0 ? 'CONFIRMS' : r.oos_n < 100 ? 'UNDERPOWERED' : 'NO_ADD'
  res.rsi[`${base}+${rk}`] = r
  console.log(`  ${(base + ' + ' + rk).padEnd(16)} OOS n ${String(r.oos_n).padStart(4)} hold ${r.oos_hold} vs ${r.class_hold} diff ${r.oos_diff == null ? '—' : (r.oos_diff * 100).toFixed(1) + 'pp'} (LB ${r.diff_lb == null ? '—' : (r.diff_lb * 100).toFixed(1)}) · TRAIN n ${r.train_n} diff ${r.train_diff == null ? '—' : (r.train_diff * 100).toFixed(1) + 'pp'} → ${r.verdict}`) }
res.shown = Object.entries(res.classes).filter(([, c]) => c.verdict === 'SHOWN').map(([k]) => k); res.rsi_confirms = Object.entries(res.rsi).filter(([, c]) => c.verdict === 'CONFIRMS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'wall_bubbles_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> SHOWN bubble classes: ${res.shown.join(', ') || 'none'} · RSI confirms: ${res.rsi_confirms.join(', ') || 'none'}`)
