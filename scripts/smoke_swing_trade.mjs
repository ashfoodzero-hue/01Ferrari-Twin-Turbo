// smoke_swing_trade.mjs — Phase 4B core (2026-10-17): the simulator's fills (spread side, stop-first, gap fill, time stop) on hand-made bars,
// the live trigger's causality (it only uses anchor swings confirmed by the signal time and 1m lows up to it), and the range index.
import assert from 'node:assert'
import { simulate, liveSignals, rangeIndex } from './lib/swing_trade.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING TRADE SMOKE ██')
const sp = () => 0.5, bar = (t, o, h, l, c) => ({ t: t * 60000, o, h, l, c })
ok('long: entry at ask (open + spread), target fill, R and $ exact', () => {
  const M = [bar(0, 100, 101, 99.8, 100.5), bar(1, 100.5, 103, 100.4, 102.8)]
  const r = simulate(M, 0, { side: 'long', stop: 99, target: 102.5, tEnd: 1e12, spreadAt: sp }); assert.equal(r.entry, 100.5); assert.equal(r.how, 'target'); assert.equal(r.exit, 102.5); assert.equal(r.R, 2 / 1.5)
})
ok('stop FIRST when stop and target share a bar; a gap through the stop fills at the open', () => {
  const M = [bar(0, 100, 104, 98, 101)]; assert.equal(simulate(M, 0, { side: 'long', stop: 99, target: 102, tEnd: 1e12, spreadAt: sp }).how, 'stop')
  const G = [bar(0, 100, 100.2, 99.9, 100), bar(1, 97, 97.5, 96.5, 97)]; const g = simulate(G, 0, { side: 'long', stop: 99, target: 105, tEnd: 1e12, spreadAt: sp }); assert.equal(g.exit, 97); assert.equal(g.how, 'stop')
})
ok('short: entry at bid, exits at ask (bar + spread); time stop at the bar close', () => {
  const M = [bar(0, 100, 100.2, 99.9, 100), bar(1, 100, 100.1, 99.5, 99.6), bar(2, 99.6, 99.7, 99.4, 99.5)]
  const r = simulate(M, 0, { side: 'short', stop: 101, target: 95, tEnd: 3 * 60000, spreadAt: sp }); assert.equal(r.entry, 100); assert.equal(r.how, 'time'); assert.equal(r.exit, 100); assert.equal(r.usd, 0)
  const S = [bar(0, 100, 100.2, 99.9, 100), bar(1, 100, 100.6, 99.8, 100.4)]; assert.equal(simulate(S, 0, { side: 'short', stop: 101, target: 95, tEnd: 1e12, spreadAt: sp }).how, 'stop')   // high 100.6 + 0.5 ask ≥ 101
})
ok('live trigger: fires only when the last CONFIRMED anchor swing is opposite and P is the running extreme since that anchor extreme; causal', () => {
  const M = []; for (let i = 0; i < 400; i++) M.push(bar(i, 100, 100.5, i === 200 ? 90 : 99.5, 100))   // a single deep low at minute 200
  const R = rangeIndex(M, 16)
  const CA = [{ t: 0, close_t: 60 * 60000 }, { t: 60 * 60000, close_t: 120 * 60000 }, { t: 120 * 60000, close_t: 180 * 60000 }, { t: 180 * 60000, close_t: 240 * 60000 }, { t: 240 * 60000, close_t: 300 * 60000 }]
  const swA = [{ type: 'H', i: 0, knownI: 1, px: 100.5 }], CX = M.map((b) => ({ t: b.t, close_t: b.t + 60000 }))
  const sig = liveSignals({ M, R, CA, swA, CX, swX: [{ type: 'L', i: 200, knownI: 210, px: 90 }, { type: 'L', i: 300, knownI: 305, px: 99.5 }] })
  assert.equal(sig.length, 1); assert.equal(sig[0].P, 90); assert.equal(sig[0].t, 211 * 60000)
  // the same low BEFORE the anchor high was confirmed (anchor knownI close = 120 min) must NOT fire
  const early = liveSignals({ M, R, CA, swA, CX, swX: [{ type: 'L', i: 50, knownI: 60, px: 99.5 }] }); assert.equal(early.length, 0)
})
console.log(failed ? `✗ SWING TRADE SMOKE: ${n} passed, ${failed} failed` : `✅ SWING TRADE SMOKE: ${n} passed, 0 failed`)
