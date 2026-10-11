// smoke_break_continue.mjs — the BREAK trade money path (bounceTest.stopEntryTrade) and the break-and-continue study's verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stopEntryTrade } from '../src/master/bounceTest.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
console.log('\n██ BREAK & CONTINUE SMOKE ██')
const sp = () => 0.5
const near = (a, b) => assert(a != null && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`)
await ok('SELL stop fills when the BID trades through it (sold at the bid minus slip); target hit on the ASK pays, stop on the ASK loses', () => {
  const M = [{ t: 0, h: 100.6, l: 100.1, c: 100.2 }, { t: 60000, h: 99.9, l: 99.4, c: 99.5 }, { t: 120000, h: 99.0, l: 97.7, c: 97.8 }]
  near(stopEntryTrade(M, 0, false, 99.5, 100.5, 98.5, sp, 0.1, 1e9, 1e9), 99.4 - 98.5)   // fill 99.4, ask 98.2 ≤ 98.5 at t2
  near(stopEntryTrade([M[0], { t: 60000, h: 100.2, l: 99.4, c: 100 }], 0, false, 99.5, 100.5, 98.5, sp, 0.1, 1e9, 1e9), -(100.5 - 99.4 + 0.1))   // fill minute: ask 100.7 ≥ stop
})
await ok('BUY stop fills when the ASK reaches it; an order not triggered inside its window is null (no trade)', () => {
  const M = [{ t: 0, h: 100, l: 99.6, c: 99.8 }, { t: 60000, h: 100.6, l: 100.2, c: 100.5 }, { t: 120000, h: 102.2, l: 100.9, c: 102 }]
  near(stopEntryTrade(M, 0, true, 101, 100, 102, sp, 0.1, 1e9, 1e9), 102 - 101.1)
  assert.equal(stopEntryTrade(M, 0, true, 101, 100, 102, sp, 0.1, 60000, 1e9), null)
})
await ok('study artifact: 18 pre-registered cells; verdicts follow the rule', () => {
  const S = JSON.parse(fs.readFileSync(path.join(root, 'data', 'master', 'break_continue_study.json'), 'utf8')); assert.equal(Object.keys(S.cells).length, 18)
  for (const r of Object.values(S.cells)) assert.equal(r.verdict, r.oos.n >= 100 && r.oos.net_lb > 0 && r.oos.net > r.control_oos.net && r.train.net > 0 ? 'TRADEABLE' : 'NOT_TRADEABLE')
})
console.log(process.exitCode ? '✗ BREAK & CONTINUE SMOKE FAILED' : `✅ BREAK & CONTINUE SMOKE: ${n} passed, 0 failed`)
