// smoke_orderflow.mjs — the order-flow footprint test (Databento tbbo, TEST-ONLY): build counts, the inference agreement, and the study verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), J = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8'))
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ ORDER-FLOW FOOTPRINT SMOKE ██')
await ok('footprint build: 54.9 M trades, both aggressor sides present, no roll-mixed bars, inference agreement measured', () => {
  const b = J('data', 'orderflow', 'gc_footprint_build.json'); assert(b.trades > 50e6 && b.buyer > 0 && b.seller > 0 && b.bars5 > 140000)
  assert.equal(b.rollDrops, 0); assert(b.inference_agreement > 0.99, 'inferred side agreement ' + b.inference_agreement)
})
for (const f of ['orderflow_footprint_study.json', 'orderflow_footprint_study_inferred.json', ...['5m', '15m', '30m', '1h', '4h'].flatMap((tf) => [`orderflow_footprint_study_${tf}.json`, `orderflow_footprint_study_${tf}_newlevels.json`])])
  await ok(`${f}: 32 pre-registered cells; PASS only with OOS ≥ 100, bound > 0, TRAIN > 0 and beating the no-confirmation control`, () => {
    const S = J('data', 'master', f); assert.equal(Object.keys(S.cells).length, 32)
    for (const r of Object.values(S.cells)) assert.equal(r.verdict, r.oos.n >= 100 && r.oos.net_lb > 0 && r.train.net > 0 && r.oos.net > r.control_no_confirmation.oos.net ? 'PASS' : r.oos.n < 100 ? 'UNDERPOWERED' : 'FAIL')
  })
console.log(process.exitCode ? '✗ ORDER-FLOW SMOKE FAILED' : `✅ ORDER-FLOW FOOTPRINT SMOKE: ${n} passed, 0 failed`)
