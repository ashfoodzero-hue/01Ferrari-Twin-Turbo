// smoke_strong_levels.mjs — the STRONG (multi-touch) S/R rule (src/master/strongLevels.js) on fixtures + the 13 y spot study's verdict rule
// + the 5m order-flow study at strong levels (docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 4).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hourPivots, strongLevelsForDay } from '../src/master/strongLevels.js'
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), J = (f) => JSON.parse(fs.readFileSync(path.join(root, 'data', 'master', f), 'utf8'))
let n = 0; const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ STRONG S/R LEVELS SMOKE ██')
const t0 = Date.UTC(2026, 0, 1), H = [[10, 9], [11, 10], [15, 12], [11, 10], [10, 9], [12, 11], [15.05, 13], [12, 11], [11, 10], [9, 8], [11, 10], [14.98, 12], [11, 10], [10, 9]].map(([h, l], i) => ({ t: t0 + i * 3600000, h, l }))
ok('pivots: strict extreme of 2 bars each side, known at the close of the 2nd bar after', () => { const P = hourPivots(H)
  assert.deepEqual(P.filter((p) => p.kind === 'H').map((p) => p.price), [15, 15.05, 14.98]); assert.equal(P.find((p) => p.price === 15).known, t0 + 5 * 3600000) })
ok('clusters: prices within 0.1 × ATR1d join; level = median; nothing before it is known', () => { const P = hourPivots(H)
  const top = strongLevelsForDay(P, t0 + 86400000, 1).find((x) => x.touches === 3); assert(top && top.price === 15 && top.lo === 14.98 && top.hi === 15.05)
  assert.equal(strongLevelsForDay(P, t0 + 86400000, 0.5).find((x) => x.price >= 14.9).touches, 2); assert.equal(strongLevelsForDay(P, t0 + 4 * 3600000, 1).length, 0) })
ok('strong_levels_study.json: 3 cells; HOLDS only via the level verdict rule', () => { const S = J('strong_levels_study.json'); assert.equal(Object.keys(S.cells).length, 3)
  for (const c of Object.values(S.cells)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
  assert.equal(S.verdict, Object.values(S.cells).some((c) => c.verdict === 'HOLDS') ? 'SOME_STRONG_LEVELS_HOLD' : 'STRONG_LEVELS_DO_NOT_HOLD') })
ok('orderflow_footprint_study_5m_strong.json: 32 cells, families L-STR2 / L-STR3, verdicts follow the gate', () => { const S = J('orderflow_footprint_study_5m_strong.json'); assert.equal(Object.keys(S.cells).length, 32)
  assert.deepEqual(Object.keys(S.diagnostic_by_count).sort(), ['L-STR2', 'L-STR3'])
  for (const r of Object.values(S.cells)) assert.equal(r.verdict, r.oos.n >= 100 && r.oos.net_lb > 0 && r.train.net > 0 && r.oos.net > r.control_no_confirmation.oos.net ? 'PASS' : r.oos.n < 100 ? 'UNDERPOWERED' : 'FAIL') })
console.log(process.exitCode ? '✗ STRONG LEVELS SMOKE FAILED' : `✅ STRONG S/R LEVELS SMOKE: ${n} passed, 0 failed`)
