// smoke_swing_earlystep.mjs — Phase 4D (2026-10-17): CONSISTENCY — MODE=onestep (Z = one step below) reproduces Phase 4B exactly (every cell,
// both periods: n, mean R, WR). Run `MODE=onestep node scripts/study_swing_earlystep.mjs` first.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING EARLYSTEP SMOKE ██')
ok('CONSISTENCY: one-step mode = Phase 4B, every cell and period', () => {
  const b = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_earlystep_onestep_check.json'), 'utf8')), p4 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_trade_atlas.json'), 'utf8'))
  for (const [a, r] of Object.entries(p4.anchors)) for (const [key, c] of Object.entries(r.cells)) { const [, side, exit] = key.split(' '), Z = b.anchors[a].steps.Z1, d = b.anchors[a].cells[`${a} ${side} Z1(${Z}) ${exit}`]
    for (const sp of ['T', 'O']) { assert.equal(d[sp].n, c[sp].n, `${key} ${sp} n`); assert(Math.abs((d[sp].mean_R ?? 0) - (c[sp].mean_R ?? 0)) < 1e-9, `${key} ${sp} R`); assert(Math.abs((d[sp].wr ?? 0) - (c[sp].wr ?? 0)) < 1e-12) } }
})
console.log(failed ? `✗ SWING EARLYSTEP SMOKE: ${n} passed, ${failed} failed` : `✅ SWING EARLYSTEP SMOKE: ${n} passed, 0 failed`)
