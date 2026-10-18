// smoke_trendlines.mjs — proves every rule of src/master/trendlines.js on hand-built candles (ATR fixed at 1).
import { fractalPivots, buildLines, evaluateLine } from '../src/master/trendlines.js'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const v = (x) => 100 + 0.1 * (x - 2)                     // support through lows (2, 100) and (12, 101)
const far = (x) => ({ l: v(x) + 3, h: v(x) + 4, c: v(x) + 3.5 })
const series = (edits = {}, neg = false) => { const C = []
  for (let x = 0; x < 40; x++) { let b = far(x); if (x === 2) b = { l: 100, h: 102, c: 101.5 }; if (x === 12) b = { l: 101, h: 103, c: 102.5 }
    if (edits[x]) b = edits[x](x); C.push(neg ? { t: x, o: -b.c, h: -b.l, l: -b.h, c: -b.c } : { t: x, o: b.c, ...b }) } return C }
const A = new Array(40).fill(1)
const piv = (neg = false) => [{ i: 2, type: neg ? 'H' : 'L', px: neg ? -100 : 100, knownI: 4 }, { i: 12, type: neg ? 'H' : 'L', px: neg ? -101 : 101, knownI: 14 }]
const one = (C, neg = false) => buildLines(C, piv(neg), A)
const sig = (r) => JSON.stringify(r.touches.map((t) => [t.i, t.test, t.outcome, t.resolvedI])) + ' ' + r.end + '@' + r.endI

const A1 = { 20: (x) => ({ l: v(x) + 0.1, h: v(x) + 0.8, c: v(x) + 0.5 }), 21: (x) => ({ l: v(x) + 0.4, h: v(x) + 1.2, c: v(x) + 1 }), 25: (x) => ({ l: v(x) - 0.5, h: v(x) + 0.5, c: v(x) - 0.3 }) }
let L = one(series(A1))
ok('line is drawn: support, rising = trend line, born at P2 confirmation', L.length === 1 && L[0].side === 'support' && L[0].cls === 'trend' && L[0].birth === 14 && Math.abs(L[0].slope - 0.1) < 1e-12)
let r = evaluateLine(series(A1), A, L[0])
ok('touch → respected (1 ATR away first), re-armed, 2nd test closes through → broken, line ends', sig(r) === '[[20,1,"respect",21],[25,2,"break",25]] break@25', sig(r))
const Lr = one(series(A1, true), true), rr = evaluateLine(series(A1, true), A, Lr[0])
ok('resistance = exact mirror (falling resistance = trend line)', Lr[0].side === 'resistance' && Lr[0].cls === 'trend' && sig(rr) === sig(r), sig(rr))
const B = { 20: (x) => ({ l: v(x) + 0.1, h: v(x) + 1.5, c: v(x) + 0.5 }), 21: (x) => ({ l: v(x) - 0.5, h: v(x) + 0.6, c: v(x) - 0.3 }) }
r = evaluateLine(series(B), A, one(series(B))[0])
ok('touch candle reaching 1 ATR away does NOT count as respect (its high may come first) → next close through = broken', sig(r) === '[[20,1,"break",21]] break@21', sig(r))
ok('a close below the line between the anchors → no line', one(series({ 7: (x) => ({ l: v(x) - 1, h: v(x) + 1, c: v(x) - 0.01 }) })).length === 0)
r = evaluateLine(series({ 13: (x) => ({ l: v(x) - 1, h: v(x) + 1, c: v(x) - 0.3 }) }), A, L[0])
ok('close ≥ 0.25 ATR through between P2 and its confirmation → never born', r.born === false)
r = evaluateLine(series({ 15: (x) => ({ l: v(x) + 0.5, h: v(x) + 0.9, c: v(x) + 0.7 }), 16: (x) => ({ l: v(x) - 0.5, h: v(x) + 0.5, c: v(x) - 0.3 }) }), A, L[0])
ok('unarmed close-through ends the line with no touch counted', r.end === 'break_unarmed' && r.touches.length === 0 && r.endI === 16, sig(r))
r = evaluateLine(series(A1), A, L[0], 1.5)
ok('placebo +1.5 ATR: same candles, same rules → the candle that only touched the real line closes through the placebo', sig(r) === '[[20,1,"break",20]] break@20', sig(r))
const F = Array.from({ length: 13 }, (_, x) => ({ t: x, o: 10, h: x === 6 ? 11 : 12, l: x === 6 ? 5 : 8, c: 10 }))
const fp = fractalPivots(F)
ok('fractal pivot: low at 6, known at 6 + 5 = 11', fp.length === 1 && fp[0].type === 'L' && fp[0].i === 6 && fp[0].knownI === 11, JSON.stringify(fp))
console.log(`${fail ? '❌' : '✅'} TRENDLINES SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
