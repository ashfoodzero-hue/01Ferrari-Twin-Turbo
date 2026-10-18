// smoke_sr_levels.mjs — proves every rule of src/master/srLevels.js evaluateLevel on hand-built candles (ATR fixed at 1, level 100, born at 2).
import { evaluateLevel } from '../src/master/srLevels.js'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const A = new Array(40).fill(1), LV = { side: 'support', px: 100, birth: 2 }
const series = (ed = {}, neg = false, n = 30) => Array.from({ length: n }, (_, x) => { const b = ed[x] ?? { l: 103, h: 104, c: 103.5 }; return neg ? { t: x, o: -b.c, h: -b.l, l: -b.h, c: -b.c } : { t: x, o: b.c, ...b } })
const sig = (r) => JSON.stringify(r.touches.map((t) => [t.i, t.test, t.phase, t.side, t.held_before, t.outcome, t.resolvedI])) + ` ${r.end}@${r.endI} flips ${JSON.stringify(r.flips)}`
const FULL = { 5: { l: 100.1, h: 100.8, c: 100.5 }, 6: { l: 100.4, h: 101.2, c: 101 }, 9: { l: 100.2, h: 100.9, c: 100.6 }, 10: { l: 99.2, h: 100.4, c: 99.4 },
  11: { l: 97, h: 98, c: 97.5 }, 12: { l: 97, h: 98, c: 97.5 }, 13: { l: 99, h: 99.9, c: 99.5 }, 14: { l: 98.8, h: 99.5, c: 99 }, 15: { l: 97, h: 98, c: 97.5 }, 16: { l: 97, h: 98, c: 97.5 }, 17: { l: 99.5, h: 101, c: 100.6 } }
for (let x = 18; x < 30; x++) FULL[x] = { l: 103, h: 104, c: 103.5 }
let r = evaluateLevel(series(FULL), A, LV)
const want = '[[5,1,0,"support",0,"held",6],[9,2,0,"support",1,"broke",10],[13,1,1,"resistance",0,"held",14],[17,2,1,"resistance",1,"broke",17]] retired@17 flips [10,17]'
ok('support: held (1 ATR away first) → 2nd test closes 0.5 ATR through = broke → FLIPS to resistance → held there → closes back through → RETIRED', sig(r) === want, sig(r))
const rr = evaluateLevel(series(FULL, true), A, { side: 'resistance', px: -100, birth: 2 })
ok('resistance = exact mirror', sig(rr) === want.replace(/"support"/g, '"X"').replace(/"resistance"/g, '"support"').replace(/"X"/g, '"resistance"'), sig(rr))
r = evaluateLevel(series(Object.fromEntries([[3, { l: 100.5, h: 101, c: 100.7 }], [4, { l: 99.2, h: 100.3, c: 99.4 }], ...Array.from({ length: 25 }, (_, k) => [5 + k, { l: 97, h: 98, c: 97.5 }])])), A, LV)
ok('never armed, closes 0.5 ATR through → flips with no touch counted', r.touches.length === 0 && JSON.stringify(r.flips) === '[4]' && r.phase === 1 && r.side === 'resistance', sig(r))
r = evaluateLevel(series({ 5: { l: 100.1, h: 101.5, c: 100.5 }, 6: { l: 99.2, h: 100.3, c: 99.4 } }), A, LV)
ok('touch candle reaching 1 ATR away does NOT count as held → next close through = broke', r.touches[0].outcome === 'broke' && r.touches[0].resolvedI === 6, sig(r))
r = evaluateLevel(series({ 5: { l: 100.1, h: 100.8, c: 99.45 } }), A, LV)
ok('close exactly 0.55 ATR through on the touch candle → broke on that candle (one candle doing both = broke)', r.touches[0].outcome === 'broke' && r.touches[0].resolvedI === 5, sig(r))
r = evaluateLevel(series({ 5: { l: 100.1, h: 100.8, c: 100.5 } }), A, LV, 1.5)
ok('placebo +1.5 ATR: the candle that only touched the real level closes 1 ATR through the placebo → broke + flip', r.touches[0]?.outcome === 'broke' && r.touches[0].resolvedI === 5 && r.flips[0] === 5, sig(r))
r = evaluateLevel(series({ 29: { l: 100.1, h: 100.8, c: 100.5 } }), A, LV)
ok('live state: touched on the last candle → open + PENDING', r.end === 'open' && r.pending && r.pending.i === 29 && r.armed === false)
r = evaluateLevel(series(), A, LV)
ok('live state: never touched → open + ARMED', r.end === 'open' && r.armed === true && !r.pending)
console.log(`${fail ? '❌' : '✅'} SR LEVELS SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
