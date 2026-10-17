// smoke_swing_tightstop.mjs — Phase 4C core (2026-10-17): (1) the S1 structure lookup rules; (2) CONSISTENCY: MODE=beyond reproduces Phase 4B's
// cells exactly (n, mean R, WR per cell and period) — run `MODE=beyond node scripts/study_swing_tightstop.mjs` first.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { prepY, structureLevel } from './lib/swing_tightstop.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING TIGHTSTOP SMOKE ██')
ok('S1: latest Y low confirmed by the signal, extreme AFTER P and ABOVE P; unconfirmed / below P / before P ignored; none → null', () => {
  const C = Array.from({ length: 20 }, (_, k) => ({ t: k * 10, close_t: k * 10 + 10 }))
  const Y = prepY(C, [{ i: 2, knownI: 4, px: 99, type: 'L' }, { i: 5, knownI: 7, px: 101, type: 'L' }, { i: 8, knownI: 9, px: 102, type: 'L' }, { i: 9, knownI: 15, px: 103, type: 'L' }, { i: 6, knownI: 8, px: 100.5, type: 'H' }])
  // P = 100 at t = 30; signal at t = 100 → candidates confirmed ≤ 100: i5 (conf 80, 101) and i8 (conf 100, 102); i9 not yet confirmed; i2 before P
  assert.equal(structureLevel(Y, 'long', 100, 30, 100), 102)
  assert.equal(structureLevel(Y, 'long', 100, 30, 85), 101)
  assert.equal(structureLevel(Y, 'long', 102.5, 30, 100), null)   // no higher low above P
})
ok('CONSISTENCY: MODE=beyond reproduces Phase 4B exactly (every cell, both periods)', () => {
  const b = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_tightstop_beyond_check.json'), 'utf8')), p4 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_trade_atlas.json'), 'utf8'))
  for (const [a, r] of Object.entries(p4.anchors)) for (const [key, c] of Object.entries(r.cells)) { const [, side, exit] = key.split(' '), d = b.anchors[a].cells[`${a} ${side} B ${exit}`]
    for (const sp of ['T', 'O']) { assert.equal(d[sp].n, c[sp].n, `${key} ${sp} n`); assert(Math.abs((d[sp].mean_R ?? 0) - (c[sp].mean_R ?? 0)) < 1e-9, `${key} ${sp} R`); assert(Math.abs((d[sp].wr ?? 0) - (c[sp].wr ?? 0)) < 1e-12) } }
})
console.log(failed ? `✗ SWING TIGHTSTOP SMOKE: ${n} passed, ${failed} failed` : `✅ SWING TIGHTSTOP SMOKE: ${n} passed, 0 failed`)
