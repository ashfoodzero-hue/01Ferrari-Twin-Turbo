// ════════════════════════════════════════════════════════════════════════════════
// smoke_execution.mjs — P4.5 unit proof of the cost/fill model (R6 gate).
// Known-input → known-output: session spread map, maker-entry = 0, stop slippage scales
// with ATR (capped), target/scratch exits pay no slippage, net-$ subtracts cost. Pure logic.
// ════════════════════════════════════════════════════════════════════════════════

import { sessionSpread, roundTripCost, netDollars, COST_MODEL } from '../src/master/execution.js'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`) } else { fail++; console.log(`  ✗ ${m}`) } }
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e

console.log('\n══ P4.5 COST / FILL MODEL SMOKE ═════════════════════════════════════\n')

console.log('A) sessionSpread — UTC hour → the right session band')
ok(sessionSpread(9) === COST_MODEL.spreadLondon, '09 UTC → London')
ok(sessionSpread(13) === COST_MODEL.spreadOverlap, '13 UTC → London/NY overlap (tightest)')
ok(sessionSpread(18) === COST_MODEL.spreadNy, '18 UTC → NY')
ok(sessionSpread(3) === COST_MODEL.spreadAsian, '03 UTC → Asian')
ok(sessionSpread(21) === COST_MODEL.spreadRollover, '21 UTC → rollover spike')
ok(sessionSpread(33) === sessionSpread(9), 'hour wraps mod 24 (33≡9)')
ok(sessionSpread(-1) === sessionSpread(23), 'negative hour wraps (−1≡23, Asian)')

console.log('\nB) maker entry = 0; exit pays spread')
{
  // overlap spread 0.13; target exit (limit) → no slippage → cost = 0(entry) + 0.13
  const c = roundTripCost({ entryHourUtc: 13, atr: 4, exitType: 'target' })
  ok(near(c, 0.13), 'overlap target exit: cost = 0.13 (maker entry 0 + spread, no slippage)')
}

console.log('\nC) stop exit pays spread + ATR-scaled slippage (capped)')
{
  // overlap spread 0.13; stop slip = min(0.30, 0.05×atr)
  const cLow = roundTripCost({ entryHourUtc: 13, atr: 4, exitType: 'stop' })     // slip=0.05×4=0.20
  ok(near(cLow, 0.13 + 0.20), 'stop, atr 4: cost = spread 0.13 + slip 0.20 = 0.33')
  const cCap = roundTripCost({ entryHourUtc: 13, atr: 100, exitType: 'stop' })   // slip capped 0.30
  ok(near(cCap, 0.13 + 0.30), 'stop, atr 100: slip capped at 0.30 → cost 0.43')
  const cTime = roundTripCost({ entryHourUtc: 13, atr: 4, exitType: 'time' })
  ok(near(cTime, 0.33), 'time exit is a market order → slips like a stop')
}

console.log('\nD) scratch exit = resting limit at BE → spread only, no slippage')
{
  const c = roundTripCost({ entryHourUtc: 13, atr: 50, exitType: 'scratch' })
  ok(near(c, 0.13), 'scratch (BE limit) pays spread only, even at high ATR (no slippage)')
}

console.log('\nE) taker-entry override adds an entry spread')
{
  const c = roundTripCost({ entryHourUtc: 13, atr: 4, exitType: 'target' }, { ...COST_MODEL, entryMaker: false })
  ok(near(c, 0.13 + 0.13), 'entryMaker=false → entry also pays spread (0.26)')
}

console.log('\nF) netDollars subtracts the round-trip cost from the gross move')
{
  const n = netDollars({ grossMove: 5, entryHourUtc: 13, atr: 4, exitType: 'target' })
  ok(near(n, 5 - 0.13), 'gross +5 target exit → net +4.87')
  const l = netDollars({ grossMove: -3, entryHourUtc: 3, atr: 4, exitType: 'stop' })
  ok(near(l, -3 - (0.30 + 0.20)), 'gross −3 stop in Asian (spread .30 + slip .20) → net −3.50')
}

console.log('\nG) cost is always ≥ 0')
{
  let bad = false
  for (const h of [0, 5, 9, 13, 18, 21, 23]) for (const et of ['target', 'stop', 'scratch', 'time']) {
    if (roundTripCost({ entryHourUtc: h, atr: 6, exitType: et }) < 0) bad = true
  }
  ok(!bad, 'no negative cost across all sessions × exit types')
}

console.log('\n────────────────────────────────────────────────────────────────────')
if (fail === 0) console.log(`✅ COST / FILL MODEL SMOKE: ALL CHECKS PASSED (${pass}/${pass})`)
else { console.log(`❌ COST / FILL MODEL SMOKE: ${fail} FAILED (${pass}/${pass + fail})`); process.exit(1) }
console.log('────────────────────────────────────────────────────────────────────\n')
