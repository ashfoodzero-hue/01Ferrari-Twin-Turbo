// smoke_matrix_variants.mjs — Ferrari Matrix gate artifacts: the live strategy (with WTI) and the looser candidate (no WTI) both follow the gate rule.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const J = (f) => JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master', f), 'utf8'))
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ MATRIX VARIANTS SMOKE ██')
for (const [f, book] of [['ferrari_matrix_gate.json', 'FERRARI_MATRIX'], ['ferrari_matrix_nowti_gate.json', 'FERRARI_MATRIX_NOWTI'], ['ferrari_matrix_onemiss_gate.json', 'FERRARI_MATRIX_ONEMISS']])
  await ok(`${book}: verdict = SHIP only if C1-C4 SHIP and the spread×1.5 OOS bound > 0`, () => {
    const g = J(f); assert.equal(g.book, book); assert.equal(g.gates.C1_C4, g.primary.seq_power.verdict === 'SHIP'); assert.equal(g.gates.S1_spread_x1_5, g.s1.oos.lb > 0)
    assert.equal(g.verdict, g.gates.C1_C4 && g.gates.S1_spread_x1_5 ? 'SHIP' : 'SHADOW') })
console.log(process.exitCode ? '✗ MATRIX VARIANTS SMOKE FAILED' : `✅ MATRIX VARIANTS SMOKE: ${n} passed, 0 failed`)
