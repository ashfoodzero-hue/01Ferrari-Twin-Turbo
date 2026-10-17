// smoke_swing_silver.mjs — Phase 3C core (2026-10-17): (1) the ±window match + earliest confirmation; (2) CONSISTENCY: the ladder-alone cell
// (R1) reproduces Phase 3's one-step-below evidence EXACTLY, every anchor / side / period.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { prepSwings, earliestConfirm } from './lib/swing_silver.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING SILVER SMOKE ██')
ok('window match: extreme within ±w, right type, earliest confirmation wins; outside window / wrong type → null', () => {
  const C = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ({ t: k * 100, close_t: k * 100 + 100 }))
  const P = prepSwings(C, [{ i: 2, knownI: 5, type: 'L' }, { i: 3, knownI: 4, type: 'L' }, { i: 9, knownI: 9, type: 'L' }, { i: 3, knownI: 3, type: 'H' }])
  assert.equal(earliestConfirm(P, 'L', 300, 150), 500)   // i=3 → confirm close 500 beats i=2 → 600
  assert.equal(earliestConfirm(P, 'L', 300, 50), 500); assert.equal(earliestConfirm(P, 'L', 700, 50), null); assert.equal(earliestConfirm(P, 'H', 300, 0), 400)
})
ok('CONSISTENCY: R1 (ladder alone) = Phase 3 one-step-below evidence, every anchor and side, both periods', () => {
  const p3 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), 'utf8')), p3c = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_silver_atlas.json'), 'utf8'))
  for (const [a, r] of Object.entries(p3c.anchors)) for (const side of ['L', 'H']) { const e = p3.anchors[a].sides[side].evidence.find((x) => x.key === r.one_step), c = r.sides[side].R1
    for (const sp of ['T', 'O']) { assert.equal(c[sp].n, e[sp].n_flipped, `${a} ${side} ${sp}`); assert(Math.abs(c[sp].p_real - e[sp].p_real_given_flip) < 1e-12) } }
})
console.log(failed ? `✗ SWING SILVER SMOKE: ${n} passed, ${failed} failed` : `✅ SWING SILVER SMOKE: ${n} passed, 0 failed`)
