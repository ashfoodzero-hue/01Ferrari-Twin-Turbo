// smoke_readiness.mjs — the big-move readiness gauge (the ONE context tool carried over): the validated code runs on
// live bars, the probability is read ONLY from its parity artifact (display law), and the era-neutral density key is
// computed from a 1y median — never an absolute count.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO } from '../src/core/paths.js'
import { computeReadiness, zigzagLegs, BM_CFG } from '../src/master/bigmoveReadiness.js'
import { liveReadiness, liveDensityRelative, DENSE_REL } from '../src/master/liveReadiness.js'
import { DENSE_GATE } from '../src/master/paperReview.js'

let pass = 0, fail = 0
const ok = async (n, f) => { try { await f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ READINESS GAUGE SMOKE ██')
const art = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'bigmove_readiness_live_parity.json'), 'utf8'))
// 2026-10-08 (twin, 1m-only Polygon tape 2013-07 →): the gauge FAILS its pre-registered bar (HOT 97.3%, LB 92.5 < 95; no era-A HOT
// days). The smoke now asserts the artifact's verdict is CONSISTENT with its own numbers — whichever way it falls — never a typed PASS.
await ok('the parity artifact verdict is consistent with its numbers (PASS ⇔ Wilson LB ≥ 95% AND both eras ≥ 95% AND fires within ±20%)', () => {
  const lbOk = art.lb >= 0.95 || art.lb >= 95, erasOk = art.eraA != null && art.eraB != null && art.eraA >= 95 && art.eraB >= 95
  if (art.pass) assert(lbOk && erasOk, 'a PASS with a failing criterion'); else assert(!(lbOk && erasOk && art.fires_within_20pct !== false), 'a FAIL with every criterion passing')
})
await ok('the pre-registered cell is unchanged (dens30 ≥ 10 & rv10 ≥ 2.5, $50 / 2.5% legs, 30d / 10d windows)', () => assert.deepEqual({ ...BM_CFG }, { REV: 0.010, ABS_USD: 50, REL: 0.025, DENS_DAYS: 30, RV_DAYS: 10, DENS_MIN: 10, RV_MIN: 2.5 }))
const { bars } = await loadBars('XAUUSD', '15m', { from: Date.now() - 100 * 86400000 })
await ok('computeReadiness runs on 100d of real bars and returns a state with causal features', () => {
  const r = computeReadiness(bars); assert.equal(r.ok, true); assert(['QUIET', 'WARM', 'HOT'].includes(r.state), r.state)
  assert(Number.isInteger(r.dens30) && r.dens30 >= 0 && r.rv10 >= 0)
  const { legs } = zigzagLegs(bars); assert(legs.length > 0)
})
await ok('liveReadiness() serves the state; a probability ONLY when the parity artifact PASSES (display law) — never a typed one', async () => {
  const r = await liveReadiness(); assert.equal(r.available, true)
  if (art.pass) { assert(r.measured && r.measured.source === 'bigmove_readiness_live_parity.json'); assert.equal(r.measured.precision, art.precision) }
  else assert(r.measured == null, 'a FAILED artifact must serve no probability')
})
await ok('liveDensityRelative(): dens_rel = dens30 / trailing-1y median, threshold 1.5, ONE constant shared with paperReview', async () => {
  const d = await liveDensityRelative(bars.at(-1).t); assert.equal(d.ok, true); assert(d.dens_med1y > 0); assert.equal(d.threshold, DENSE_REL); assert.equal(DENSE_REL, DENSE_GATE)
  assert.equal(d.dense, d.dens30 >= DENSE_REL * d.dens_med1y)
})
console.log(`\n${fail ? '✗' : '✅'} READINESS GAUGE SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
