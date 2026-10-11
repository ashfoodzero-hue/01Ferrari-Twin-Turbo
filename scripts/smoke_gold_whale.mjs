// smoke_gold_whale.mjs — the 15m gold "whale" gauge (src/master/goldWhale.js): the 10-min delivery delay, the big-bar rule, the
// close-location sign, QUIET when no whale-size volume, closed 15m buckets only; and the study artifact the chart quotes.
import assert from 'node:assert'
import fs from 'node:fs'
import { bucket15, whaleAt, WHALE } from '../src/master/goldWhale.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ GOLD WHALE GAUGE SMOKE ██')
const T0 = Date.UTC(2026, 9, 1), Q = 900000
const series = (k, last) => { const out = []; for (let j = 0; j < k; j++) out.push({ t: T0 + j * Q, o: 100, h: 101, l: 99, c: 100, v: 100 }); return out.concat(last.map((x, m) => ({ t: T0 + (k + m) * Q, ...x }))) }
await ok('bucket15: closed buckets only — a trailing bucket appears only once its 15th minute exists', () => {
  const m = []; for (let j = 0; j < 29; j++) m.push({ t: T0 + j * 60000, o: 1, h: 2, l: 0.5, c: 1.5, v: 1 })
  assert.equal(bucket15(m).length, 1); m.push({ t: T0 + 29 * 60000, o: 1, h: 2, l: 0.5, c: 1.5, v: 1 }); assert.equal(bucket15(m).length, 2); assert.equal(bucket15(m)[0].v, 15)
})
await ok('BULLISH: a 3× volume bar closing at its high → +1 pressure; BEARISH mirror; QUIET without whale-size volume', () => {
  const up = series(100, [{ o: 100, h: 102, l: 99, c: 102, v: 300 }]), T = up.at(-1).t + Q + WHALE.delayMs
  const w = whaleAt(up, T); assert.equal(w.dir, 'BULLISH'); assert.equal(w.pressure, 1); assert.equal(w.big, 1)
  assert.equal(whaleAt(series(100, [{ o: 100, h: 101, l: 98, c: 98, v: 300 }]), T).dir, 'BEARISH')
  assert.equal(whaleAt(series(100, [{ o: 100, h: 102, l: 99, c: 102, v: 150 }]), T).dir, 'QUIET')
})
await ok('DELIVERY DELAY: one minute before the bar is 10 min old it is NOT used (the reading is from the previous hour)', () => {
  const up = series(100, [{ o: 100, h: 102, l: 99, c: 102, v: 300 }]), Tend = up.at(-1).t + Q
  assert.equal(whaleAt(up, Tend + WHALE.delayMs - 60000).dir, 'QUIET'); assert.equal(whaleAt(up, Tend + WHALE.delayMs).dir, 'BULLISH')
  assert.equal(whaleAt(series(10, []), Tend + WHALE.delayMs), null, 'too little history for the baseline → null')
})
await ok('the study artifact exists, is pre-registered (rule = WHALE), and its verdict follows its own numbers', () => {
  const s = JSON.parse(fs.readFileSync(new URL('../data/master/gold_whale_study.json', import.meta.url), 'utf8'))
  assert.deepEqual(s.rule, { ...WHALE }); const edge = s.oos.resolved >= 100 && s.oos.win_lb > s.oos.baseline && s.train.win_share > s.train.baseline
  assert.equal(s.verdict, edge ? 'DIRECTION_EDGE' : 'NO_DIRECTION_EDGE')
})
console.log(process.exitCode ? '✗ GOLD WHALE SMOKE FAILED' : `✅ GOLD WHALE GAUGE SMOKE: ${n} passed, 0 failed`)
