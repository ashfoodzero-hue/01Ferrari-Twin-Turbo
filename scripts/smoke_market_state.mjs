// smoke_market_state.mjs — the WAIT / CONFIRM / FIRE gate. Deterministic synthetic bars + real-data sanity.
import assert from 'node:assert'
import { loadBars } from '../src/data/backfillReader.js'
import { readMarketState, stateAllows } from '../src/master/marketState.js'
let pass = 0, fail = 0
const ok = (n, f) => { try { f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ MARKET STATE SMOKE ██')

// build a clean range 4100–4140, then optionally break it
function mk({ breakDown = false, breakUp = false, vol = 1, at = 4120 } = {}) {
  const b = []; let t = 0
  const push = (o, h, l, c, v = 100) => b.push({ t: t += 300000, o, h, l, c, v })
  for (let i = 0; i < 90; i++) { const m = 4120 + (i % 2 ? 8 : -8); push(m, m + 10, m - 10, m, 100) }  // range ≈4102–4138
  if (breakDown) push(4110, 4112, 4085, 4088, 100 * vol)
  else if (breakUp) push(4130, 4155, 4128, 4152, 100 * vol)
  else push(at, at + 2, at - 2, at, 100)
  return b
}
ok('EQUILIBRIUM (mid-range) blocks BOTH sides and says WAIT FOR CONFIRMATION', () => {
  const st = readMarketState(mk({ at: 4120 }))
  assert.equal(st.state, 'EQUILIBRIUM'); assert.equal(st.canTrade, false); assert.equal(st.allowedSide, null)
  assert(/WAIT FOR CONFIRMATION/.test(st.message)); assert(st.waitFor && st.waitFor.plain)
  assert.equal(stateAllows({ side: 'BUY' }, st).allow, false)
  assert.equal(stateAllows({ side: 'SELL' }, st).allow, false)
})
ok('VOLUME DROPPED 2026-10-17 (spot v is a quote count): by default a close beyond the trigger CONFIRMS with any v; the opt-in volMult > 0 still blocks a low-v break', () => {
  const st = readMarketState(mk({ breakDown: true, vol: 1 }))
  assert.equal(st.state, 'BREAKOUT_DOWN'); assert.equal(st.canTrade, true); assert(!/volume/i.test(st.message), 'no volume words in the live message')
  const old = readMarketState(mk({ breakDown: true, vol: 1 }), { volMult: 1.5 })
  assert.equal(old.canTrade, false); assert(/NOT CONFIRMED/.test(old.message))
})
ok('break WITH volume = DIRECTION CONFIRMED → only that side fires', () => {
  const dn = readMarketState(mk({ breakDown: true, vol: 2 }))
  assert.equal(dn.state, 'BREAKOUT_DOWN'); assert.equal(dn.allowedSide, 'SELL'); assert.equal(dn.canTrade, true)
  assert.equal(stateAllows({ side: 'SELL' }, dn).allow, true)
  assert.equal(stateAllows({ side: 'BUY' }, dn).allow, false)
  const up = readMarketState(mk({ breakUp: true, vol: 2 }))
  assert.equal(up.state, 'BREAKOUT_UP'); assert.equal(up.allowedSide, 'BUY')
  assert.equal(stateAllows({ side: 'SELL' }, up).allow, false)
})
ok('HYSTERESIS: after a confirmed breakdown, BUY stays blocked (no falling-knife) until reclaim', () => {
  const b = mk({ breakDown: true, vol: 2 })
  b.push({ t: b.at(-1).t + 300000, o: 4088, h: 4092, l: 4085, c: 4089, v: 100 })   // drift, no reclaim
  b.push({ t: b.at(-1).t + 300000, o: 4089, h: 4093, l: 4086, c: 4090, v: 100 })
  const st = readMarketState(b)
  assert(['TREND_DOWN', 'BREAKOUT_DOWN'].includes(st.state), 'state ' + st.state)
  assert.equal(st.allowedSide, 'SELL')
  assert.equal(stateAllows({ side: 'BUY' }, st).allow, false, 'must NOT allow buying the knife')
  if (st.state === 'TREND_DOWN') assert(/falling knife/.test(st.message))
})
ok('HYSTERESIS releases once price RECLAIMS the broken level', () => {
  const b = mk({ breakDown: true, vol: 2 })
  for (let i = 0; i < 4; i++) b.push({ t: b.at(-1).t + 300000, o: 4110, h: 4125, l: 4108, c: 4122, v: 100 })  // reclaim well above
  const st = readMarketState(b)
  assert.notEqual(st.state, 'TREND_DOWN', 'reclaim must release the lock')
})
ok('PREMIUM → SELL only · DISCOUNT → BUY only', () => {
  const hi = readMarketState(mk({ at: 4136 })), lo = readMarketState(mk({ at: 4104 }))
  assert.equal(hi.allowedSide, 'SELL'); assert.equal(stateAllows({ side: 'BUY' }, hi).allow, false)
  assert.equal(lo.allowedSide, 'BUY'); assert.equal(stateAllows({ side: 'SELL' }, lo).allow, false)
})
ok('every state carries a plain-English message + causal range (excludes current bar)', () => {
  for (const b of [mk({ at: 4120 }), mk({ at: 4136 }), mk({ breakDown: true, vol: 2 })]) {
    const st = readMarketState(b); assert(typeof st.message === 'string' && st.message.length > 20)
    assert(st.rangeHigh > st.rangeLow && st.mid > st.rangeLow && st.mid < st.rangeHigh)
  }
})
const real = (await loadBars('XAUUSD', '15m', { from: Date.now() - 30 * 86400000 })).bars
ok('real data: state is one of the known states and gate is coherent', () => {
  const st = readMarketState(real); assert(st, 'expected a state')
  assert(['EQUILIBRIUM', 'PREMIUM', 'DISCOUNT', 'BREAKOUT_UP', 'BREAKOUT_DOWN', 'TREND_UP', 'TREND_DOWN'].includes(st.state))
  if (!st.canTrade) { assert.equal(stateAllows({ side: 'BUY' }, st).allow, false); assert.equal(stateAllows({ side: 'SELL' }, st).allow, false) }
  else assert(stateAllows({ side: st.allowedSide }, st).allow === true)
})
ok('too-few bars is safe (null, no throw)', () => assert.equal(readMarketState([{ t: 0, o: 1, h: 1, l: 1, c: 1, v: 1 }]), null))

console.log(`\n${fail ? '✗' : '✅'} MARKET STATE SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
