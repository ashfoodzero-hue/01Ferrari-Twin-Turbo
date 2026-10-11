// smoke_release_bracket.mjs — the release-bracket studies (1m + real-tick replay): artifacts exist and every verdict follows its rule.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const J = (f) => JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master', f), 'utf8'))
console.log('\n██ RELEASE BRACKET SMOKE ██')
await ok('1m study: 12 cells, PASS only with OOS ≥ 30, the 3×-spread bound > 0 and TRAIN > 0; the outcome diagnostic is recorded', () => {
  const S = J('release_bracket_study.json'); assert.equal(Object.keys(S.cells).length, 12)
  for (const c of Object.values(S.cells)) { const x = c.spread_x3; assert.equal(c.verdict, x.oos.n >= 30 && x.oos.net_lb > 0 && x.train.net > 0 ? 'PASS' : 'FAIL'); assert(c.why_x1 && 'both' in c.why_x1) }
})
await ok('tick study: thin-tick events excluded (≥ 200 quotes rule), 12 cells, verdicts follow the rule', () => {
  const S = J('release_bracket_ticks_study.json'); assert.equal(Object.keys(S.cells).length, 12); assert(S.usable > 0 && S.excluded_by_year)
  for (const c of Object.values(S.cells)) assert.equal(c.verdict, c.oos.n >= 30 && c.oos.net_lb > 0 && c.train.net > 0 ? 'PASS' : c.oos.n < 30 ? 'UNDERPOWERED' : 'FAIL')
})
console.log(process.exitCode ? '✗ RELEASE BRACKET SMOKE FAILED' : `✅ RELEASE BRACKET SMOKE: ${n} passed, 0 failed`)
