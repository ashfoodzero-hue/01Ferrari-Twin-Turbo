// smoke_gann.mjs — TOOL 6 (Gann box, price + time): the eighths, the time projections, and the study artifacts' verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GANN_PRICE, GANN_TIME, gannPrice, gannTimes } from '../src/master/gannBox.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ GANN BOX (TOOL 6) SMOKE ██')
await ok('price eighths exclude ½ (tested as Fib) and are measured from the swing end', () => {
  assert(!GANN_PRICE.includes(0.5) && GANN_PRICE.length === 6)
  assert.equal(gannPrice({ dir: 'UP', H: 180, L: 100 }, 0.25), 160); assert.equal(gannPrice({ dir: 'DOWN', H: 180, L: 100 }, 0.25), 120)
})
await ok('time projections = swing end + ½ / 1 / 2 × the swing duration', () => {
  const s = { hT: 10 * 3600000, lT: 4 * 3600000 }, T = gannTimes(s)
  assert.deepEqual(T.map((x) => x.f), [...GANN_TIME]); assert.deepEqual(T.map((x) => x.t / 3600000), [13, 16, 22])
})
await ok('study artifacts: price / time / filter verdicts follow their pre-registered rules', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'gann_study.json'), 'utf8')); assert.equal(Object.keys(A.price).length, 18); assert.equal(Object.keys(A.time).length, 9)
  for (const c of Object.values(A.price)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
  for (const c of Object.values(A.time)) assert.equal(c.verdict, c.oos.n < 100 ? 'UNDERPOWERED' : c.oos.hit_lb > c.oos.control && c.train.hit > c.train.control ? 'TIME_TURNS' : 'NO_TIME_EFFECT')
  const B = JSON.parse(fs.readFileSync(path.join(master, 'gann_matrix_filter.json'), 'utf8'))
  for (const v of Object.values(B.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
await ok('time diagnostic: shuffled-duration null, p < 0.05/9, and the SAME cells pass on the training half (replication)', () => {
  const O = JSON.parse(fs.readFileSync(path.join(master, 'gann_time_diagnostic.json'), 'utf8')), T = JSON.parse(fs.readFileSync(path.join(master, 'gann_time_diagnostic_train.json'), 'utf8'))
  for (const d of [O, T]) for (const [tf, r] of Object.entries(d.results)) for (const f of ['0.5', '1', '2']) assert.equal(r[f].verdict, r[f].p_value < 0.05 / 9 ? 'REAL_GANN_TIME' : 'ARTIFACT_OR_NOISE', tf + ' ' + f)
  assert(O.perms >= 2000 && T.perms >= 2000); assert.deepEqual(O.real, T.real, 'out-of-sample and training cells differ')
})
await ok('time + direction study: 3 pre-registered cells; TRADEABLE only with OOS bound > 0, beats the control, TRAIN > 0', () => {
  const D = JSON.parse(fs.readFileSync(path.join(master, 'gann_time_direction.json'), 'utf8')); assert.deepEqual(Object.keys(D.cells), ['1h 0.5×', '1h 1×', '4h 0.5×'])
  for (const r of Object.values(D.cells)) assert.equal(r.verdict, r.gann.oos.net_lb > 0 && r.gann.oos.net > r.control.oos.net && r.gann.train.net > 0 ? 'TRADEABLE' : 'NOT_TRADEABLE')
})
console.log(process.exitCode ? '✗ GANN SMOKE FAILED' : `✅ GANN BOX (TOOL 6) SMOKE: ${n} passed, 0 failed`)
