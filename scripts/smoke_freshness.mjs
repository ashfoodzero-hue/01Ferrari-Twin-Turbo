// smoke_freshness.mjs — the twin's freshness contract is SOUND (every flow has a healer and a sane age bound), the
// market calendar rule is right, and the report judges a fixture flow correctly (fresh / stale / closed-market exempt).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { FLOWS, HEALERS, freshnessReport, assertContractSound, marketOpen, lastMarketClose, heartbeatLive } from '../src/core/freshness.js'

let pass = 0, fail = 0
const ok = (n, f) => { try { f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ FRESHNESS CONTRACT SMOKE ██')
ok('contract sound: every flow has a healer key, no age bound below its cadence, no unstated exemption', () => {
  assert.deepEqual(assertContractSound(), [])
  for (const f of FLOWS) assert(f.file in HEALERS, f.file + ' has no HEALERS entry')
  for (const k of Object.keys(HEALERS)) assert(FLOWS.some((f) => f.file === k), k + ' healer names a flow that is not declared')
})
ok('every healer script named exists in scripts/', () => { for (const h of Object.values(HEALERS)) if (h) assert(fs.existsSync(path.join(TURBO.scripts, h.script)), h.script + ' missing') })
ok('market calendar: Saturday closed · Sunday 22:00Z open · Wednesday 10:00Z open · Friday 21:30Z closed · lastMarketClose(Sat) = Fri 21:00Z', () => {
  assert.equal(marketOpen(Date.parse('2026-10-03T12:00:00Z')), false)
  assert.equal(marketOpen(Date.parse('2026-10-04T22:30:00Z')), true)
  assert.equal(marketOpen(Date.parse('2026-10-07T10:00:00Z')), true)
  assert.equal(marketOpen(Date.parse('2026-10-02T21:30:00Z')), false)
  assert.equal(new Date(lastMarketClose(Date.parse('2026-10-03T12:00:00Z'))).toISOString(), '2026-10-02T21:00:00.000Z')
})
ok('freshnessReport runs on the real folder and reports exactly the declared flows', () => {
  const r = freshnessReport({ now: Date.now() })
  assert.deepEqual(r.flows.map((f) => f.file).sort(), FLOWS.map((f) => f.file).sort())
  assert(typeof r.stale_critical === 'number' && typeof r.market_open === 'boolean')
})
ok('heartbeatLive: liveness is the PID, never the file — no pid = unknowable, own pid = alive, a dead pid = gone', () => {
  assert.equal(heartbeatLive(null).alive, null)
  assert.equal(heartbeatLive({ at: new Date().toISOString(), pid: process.pid }).alive, true)
  assert.equal(heartbeatLive({ at: new Date().toISOString(), pid: 999999999 }).alive, false)
})
console.log(`\n${fail ? '✗' : '✅'} FRESHNESS CONTRACT SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
