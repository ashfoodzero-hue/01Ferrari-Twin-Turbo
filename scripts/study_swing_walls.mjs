// ════════════════════════════════════════════════════════════════════════════════
// study_swing_walls.mjs — defence bubbles at prior SWING highs / lows (reversal levels) vs the measured volume walls (2026-10-16).
// Pre-registered: docs/SWING_WALLS_SPEC.md. Output: data/master/swing_walls_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { wallEvents, swingWallEvents, holdLabel } from '../src/master/wallDefense.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const K = 6, Y2020 = Date.UTC(2020, 0, 1), DAYS = (TO - FROM) / 86400000 * 5 / 7
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO })).bars
console.log('1m bars', M.length.toLocaleString())
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } return out }
const levelsOf = (ms) => { const B = resample(ms), P = confirmedPivots(B, 5), k = (x) => ({ knownT: B[x.knownAt].t + ms, px: x.px }); return { highs: P.highs.map(k), lows: P.lows.map(k) } }
let seed = 314; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const weeks = (xs) => { const m = new Map(); for (const e of xs) { const w = Math.floor((e.decisionT + 4 * 86400000) / (7 * 86400000)); if (!m.has(w)) m.set(w, []); m.get(w).push(e) } return [...m.values()] }
const bootLB = (xs, stat, a) => { const B = weeks(xs), n = B.length, v = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < n; i++) s.push(...B[(rnd() * n) | 0]); const x = stat(s); if (x != null && Number.isFinite(x)) v.push(x) } v.sort((p, q) => p - q); return v[Math.floor(a * v.length)] }
const hr = (xs) => xs.length ? xs.filter((e) => e.hold).length / xs.length : null, f4 = (x) => x == null ? null : +x.toFixed(4)
// volume walls (for the head-to-head + coincidence)
const VOL = wallEvents(M, { from: FROM }).filter((e) => e.decisionT <= TO); for (const e of VOL) e.hold = holdLabel(M, e)
const volLab = VOL.filter((e) => e.hold != null)
const res = { at: new Date().toISOString(), spec: 'docs/SWING_WALLS_SPEC.md', volume_walls: { tests_per_day: +(VOL.length / DAYS).toFixed(2), oos_hold_all: f4(hr(volLab.filter((e) => e.decisionT >= SPLIT))), oos_hold_defense: f4(hr(volLab.filter((e) => e.decisionT >= SPLIT && e.defense))) }, variants: {} }
console.log(`volume walls: ${VOL.length} tests (${res.volume_walls.tests_per_day}/d) · OOS hold all ${res.volume_walls.oos_hold_all} · defense ${res.volume_walls.oos_hold_defense}`)
for (const [name, ms] of [['3m', 180000], ['15m', 900000]]) {
  const ev = swingWallEvents(M, levelsOf(ms), { from: FROM }).filter((e) => e.decisionT <= TO); for (const e of ev) { e.hold = holdLabel(M, e); e.split = e.decisionT < SPLIT ? 'train' : 'oos' }
  const lab = ev.filter((e) => e.hold != null), oos = lab.filter((e) => e.split === 'oos'), trn = lab.filter((e) => e.split === 'train'), bO = hr(oos), bT = hr(trn)
  const m66 = (() => { const v = trn.filter((e) => e.defense).map((e) => e.mag).sort((a, b) => a - b); return v[Math.floor(v.length * 2 / 3)] })()
  const CLS = { ATTACK: (e) => !e.defense, DEFENSE: (e) => e.defense, 'DEF>PUSH': (e) => e.defStronger, STRONG: (e) => e.defense && e.mag > m66 }
  // coincidence with a volume-wall test (same side, wall within 1.5 bins, touch within 3 min)
  const volBy = new Map(); for (const v of VOL) { const k = v.type + ':' + Math.floor(v.t / 60000); volBy.set(k, [...(volBy.get(k) ?? []), v]) }
  for (const e of ev) { e.coincide = false; for (let d = -3; d <= 3 && !e.coincide; d++) for (const v of volBy.get(e.type + ':' + (Math.floor(e.t / 60000) + d)) ?? []) if (Math.abs(v.wall - e.wall) <= 1.5 * e.binW) e.coincide = true }
  const V = { tests: ev.length, tests_per_day: +(ev.length / DAYS).toFixed(2), labelled: lab.length, base: { oos: f4(bO), train: f4(bT) }, strong_threshold_train_p66: m66, classes: {} }
  for (const [k, f] of Object.entries(CLS)) { const O = oos.filter(f), T = trn.filter(f), lift = (s) => hr(s.filter(f)) - hr(s)
    const r = { oos_n: O.length, oos_hold: f4(hr(O)), oos_lift: f4(hr(O) - bO), train_hold: f4(hr(T)), train_lift: f4(hr(T) - bT), by_side: { ceiling: f4(hr(O.filter((e) => e.type === 'ceiling'))), floor: f4(hr(O.filter((e) => e.type === 'floor'))) },
      era: { pre2020: f4(hr(lab.filter((e) => f(e) && e.decisionT < Y2020))), post2020: f4(hr(lab.filter((e) => f(e) && e.decisionT >= Y2020))) },
      coincide_with_volume: f4(hr(O.filter((e) => e.coincide))), swing_only: f4(hr(O.filter((e) => !e.coincide))), n_coincide: O.filter((e) => e.coincide).length }
    if (k !== 'ATTACK') { r.lift_lb = f4(bootLB(oos, lift, 0.05 / K)); r.verdict = O.length >= 300 && r.oos_lift >= 0.05 && r.lift_lb > 0 && r.train_lift > 0 ? 'SHOWN' : 'NOT_SHOWN' }
    V.classes[k] = r }
  res.variants[name] = V
  console.log(`\n── swing walls ${name}: ${ev.length} tests (${V.tests_per_day}/d) · OOS base hold ${V.base.oos} (TRAIN ${V.base.train})`)
  for (const [k, r] of Object.entries(V.classes)) console.log(`  ${k.padEnd(9)} OOS n ${String(r.oos_n).padStart(5)} hold ${r.oos_hold} lift ${(r.oos_lift * 100).toFixed(1)}pp${r.lift_lb != null ? ' (LB ' + (r.lift_lb * 100).toFixed(1) + ')' : ''} · TRAIN lift ${(r.train_lift * 100).toFixed(1)}pp · ceil ${r.by_side.ceiling} floor ${r.by_side.floor} · pre/post ${r.era.pre2020}/${r.era.post2020} · with-volume ${r.coincide_with_volume} (n ${r.n_coincide}) swing-only ${r.swing_only}${r.verdict ? ' → ' + r.verdict : ''}`) }
res.shown = Object.fromEntries(Object.entries(res.variants).map(([k, v]) => [k, Object.entries(v.classes).filter(([, c]) => c.verdict === 'SHOWN').map(([c]) => c)]))
fs.writeFileSync(path.join(TURBO.master, 'swing_walls_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> SWING-WALL bubble classes SHOWN: ${JSON.stringify(res.shown)}`)
