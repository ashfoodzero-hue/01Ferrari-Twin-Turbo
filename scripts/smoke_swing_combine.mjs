// smoke_swing_combine.mjs — Phase 3B core (2026-10-17): (1) the "still undecided at T*" rule; (2) the next-candle signs on known candles;
// (3) CONSISTENCY: the study's reference cell R1 (ladder alone) must reproduce Phase 3's one-step-below evidence EXACTLY (same definition).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { undecided, strongPlus1, dirPlus1 } from './lib/swing_combine.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING COMBINE SMOKE ██')
ok('undecided at T*: a real swing counts only before its confirmation; a failed extreme only before its break', () => {
  assert(undecided({ real: true, conf: 100 }, 80) && !undecided({ real: true, conf: 100 }, 100) && !undecided({ real: true, conf: 100 }, 120))
  assert(undecided({ real: false, brk: 50 }, 40) && !undecided({ real: false, brk: 50 }, 60) && !undecided({ real: true, conf: 100 }, null))
})
ok('next-candle signs: strong = top third after a low / bottom third after a high; direction by close vs open', () => {
  const C = [{}, { o: 10, h: 12, l: 9, c: 11.9 }, { o: 12, h: 12, l: 9, c: 9.5 }]
  assert.equal(strongPlus1(C, 0, 'L'), true); assert.equal(dirPlus1(C, 0, 'L'), true); assert.equal(strongPlus1(C, 0, 'H'), false)
  assert.equal(strongPlus1(C, 1, 'H'), true); assert.equal(dirPlus1(C, 1, 'H'), true); assert.equal(strongPlus1(C, 2, 'L'), null)
})
ok('CONSISTENCY: R1 (ladder alone) = Phase 3 one-step-below evidence, every anchor and side, both periods', () => {
  const p3 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), 'utf8')), p3b = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_combine_atlas.json'), 'utf8'))
  for (const [a, r] of Object.entries(p3b.anchors)) for (const side of ['L', 'H']) { const e = p3.anchors[a].sides[side].evidence.find((x) => x.key === r.one_step), c = r.sides[side].cells.R1
    for (const sp of ['T', 'O']) { assert.equal(c[sp].n, e[sp].n_flipped, `${a} ${side} ${sp} n`); assert(Math.abs(c[sp].p_real - e[sp].p_real_given_flip) < 1e-12, `${a} ${side} ${sp} p`) } }
})
console.log(failed ? `✗ SWING COMBINE SMOKE: ${n} passed, ${failed} failed` : `✅ SWING COMBINE SMOKE: ${n} passed, 0 failed`)
