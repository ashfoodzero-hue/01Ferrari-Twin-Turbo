// smoke_swing_footprint.mjs — Phase 2 core (scripts/lib/swing_footprint.mjs) recovers a PLANTED footprint pattern (2026-10-17, spec §5):
// on synthetic candles, every true swing low carries ABSORPTION (heavy seller aggression at the bottom tick, close in the upper half) and
// failed lows carry plain selling. The core must find '0|absorption_low' at swing lows far more than at failed lows, never at swing highs,
// and must skip roll candles.
import assert from 'node:assert'
import { atlasEvents } from './lib/swing_atlas.mjs'
import { fpTerciles, fpCounts } from './lib/swing_footprint.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING FOOTPRINT SMOKE (planted absorption) ██')
const C = [], FP = []; let p = 100, t = Date.UTC(2025, 0, 1)
for (let leg = 0; leg < 120; leg++) { const dir = leg % 2 ? 1 : -1
  for (let b = 0; b < 30; b++) { const o = p, move = b % 5 === 4 ? -dir * 1.6 : dir * 1; p = o + move
    let c = { t, o, h: Math.max(o, p) + 0.3, l: Math.min(o, p) - 0.3, c: p }, planted = false
    if (dir < 0 && b === 29) { c = { t, o: p - 0.05, h: p + 0.15, l: p - 3, c: p + 0.1 }; planted = true }   // the swing low candle (closes in its upper half)
    C.push(c)
    // footprint: price ticks across the candle; planted lows = heavy seller aggression at the bottom tick (absorbed); others = balanced
    const lo = Math.round(c.l * 10), hi = Math.round(c.h * 10), cells = new Map()
    for (let q = lo; q <= hi; q++) cells.set(q, [10, 10])
    if (planted) cells.set(lo, [400, 5]); else cells.set(lo, [12, 10])
    let v = 0, delta = 0; for (const [, x] of cells) { v += x[0] + x[1]; delta += x[1] - x[0] }
    FP.push({ t, o: c.o, h: c.h, l: c.l, c: c.c, v, delta, n: 1, roll: leg === 7, cells })   // leg 7 = a roll (must be skipped)
    t += 3600000 } }
const byT = new Map(FP.map((f, k) => [f.t, { fc: f, k }])), fpAt = (x) => byT.get(x)
const inWin = () => true, isTrain = (x) => x < C[Math.floor(C.length * 0.6)].t, breaks = new Set()
const ev = atlasEvents(C, { k: 3 }), cuts = fpTerciles(C, ev, { inWin, isTrain, fpAt, fpList: FP, breaks }), res = fpCounts(C, ev, { inWin, isTrain, fpAt, fpList: FP, breaks, cuts })
const rate = (side, grp, key) => { const c = res.cells[side][key]?.[grp]; if (!c) return null; const k = c.T[0] + c.O[0], m = c.T[1] + c.O[1]; return m ? k / m : null }
ok('events exist on both sides', () => { assert(res.n.L.S.T + res.n.L.S.O > 30 && res.n.L.C1.T + res.n.L.C1.O > 30, JSON.stringify(res.n.L)) })
ok('PLANTED absorption found at swing lows, not at failed lows', () => { const s = rate('L', 'S', '0|absorption_low'), c1 = rate('L', 'C1', '0|absorption_low'); console.log(`      absorption at swing lows ${(100 * s).toFixed(0)} % vs failed lows ${(100 * c1).toFixed(0)} %`); assert(s > 0.8 && c1 < 0.1) })
ok('not invented at swing highs', () => { assert(rate('H', 'S', '0|absorption_low') < 0.1) })
ok('candle-shape reference keys are counted alongside (cdl: prefix)', () => { assert(Object.keys(res.cells.L).some((k) => k.startsWith('cdl:0|'))) })
ok('roll candles are skipped (a swing low inside the roll leg has no footprint event)', () => { const rollT = new Set(FP.filter((f) => f.roll).map((f) => f.t)); const sw = ev.swings.filter((s) => rollT.has(C[s.i].t)); assert(sw.length >= 1); assert(res.n.L.S.T + res.n.L.S.O + res.n.H.S.T + res.n.H.S.O < ev.swings.length) })
console.log(failed ? `✗ SWING FOOTPRINT SMOKE: ${n} passed, ${failed} failed` : `✅ SWING FOOTPRINT SMOKE: ${n} passed, 0 failed`)
