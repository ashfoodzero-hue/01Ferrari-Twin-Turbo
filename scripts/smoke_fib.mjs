// smoke_fib.mjs — TOOL 1 (Fibonacci): calendar candles (1w/1mo), Fib + inverse-Fib arithmetic, swing states causality, the shared trade
// sequence and money path, and the two study artifacts' verdicts (2026-10-09).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resampleClosed, CALENDAR_TF, loadBars } from '../src/data/backfillReader.js'
import { FIB_POS, FIB_R, fibPrice, swingStates, stateAt } from '../src/master/fibLevels.js'
import { limitTrade } from '../src/master/bounceTest.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ FIB (TOOL 1) SMOKE ██')
await ok('calendar candles: weeks start Sunday 00:00 UTC, months on the 1st; a bucket closes only when the next starts or its last minute exists', async () => {
  const wk = CALENDAR_TF['1w'].key(Date.UTC(2026, 9, 9, 12)); assert.equal(new Date(wk).getUTCDay(), 0); assert.equal(new Date(wk).toISOString().slice(0, 10), '2026-10-04')
  assert.equal(new Date(CALENDAR_TF['1mo'].end(Date.UTC(2026, 1, 1))).toISOString().slice(0, 10), '2026-03-01')
  const m = [{ t: Date.UTC(2026, 0, 30, 10), o: 1, h: 2, l: 0.5, c: 1.5, v: 1 }, { t: Date.UTC(2026, 1, 2, 10), o: 1.5, h: 3, l: 1, c: 2, v: 1 }]
  const out = []; for await (const b of resampleClosed(m, CALENDAR_TF['1mo'])) out.push(b); assert.equal(out.length, 1); assert.equal(out[0].t, Date.UTC(2026, 0, 1))
  const real = (await loadBars('XAUUSD', '1mo', { from: Date.parse('2026-01-01') })).bars; assert(real.every((b) => new Date(b.t).getUTCDate() === 1) && real.at(-1).t < Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
})
await ok('Fib arithmetic: UP swing normal r = H − r·range; inverse r = normal (1 − r); 7 distinct positions incl. 0.214 / 0.764', () => {
  const up = { dir: 'UP', H: 200, L: 100 }, dn = { dir: 'DOWN', H: 200, L: 100 }
  assert.equal(fibPrice(up, 0.382), 161.8); assert.equal(fibPrice(dn, 0.382), 138.2)
  for (const r of FIB_R) assert(FIB_POS.some((x) => Math.abs(x.p - (1 - r)) < 1e-9), 'inverse ' + r + ' missing')
  assert.deepEqual(FIB_POS.map((x) => x.p), [0.214, 0.236, 0.382, 0.5, 0.618, 0.764, 0.786]); assert.equal(FIB_POS[2].name, 'N0.382/I0.618')
})
await ok('swing states are causal: a state becomes known only at the close of the bar that confirms its newest pivot (5 bars later)', async () => {
  const B = (await loadBars('XAUUSD', '1h', { from: Date.parse('2026-08-01'), to: Date.parse('2026-09-15') })).bars, S = swingStates(B, (i) => B[i].t + 3600000)
  assert(S.length > 10)
  for (const s of S) { const pivT = Math.max(s.hT, s.lT); assert(s.knownT >= pivT + 6 * 3600000, 'state known too early'); assert(s.dir === (s.lT < s.hT ? 'UP' : 'DOWN')) }
  const mid = S[5]; assert.equal(stateAt(S, mid.knownT), mid); assert.equal(stateAt(S, mid.knownT - 1), S[4])
  const cut = swingStates(B.slice(0, S[8].fromI + 1), (i) => B[i].t + 3600000); assert.deepEqual(cut.at(-1), S[8], 'cutting the future changed a past state')
})
await ok('limit trade money path: long fills at the ASK, stop in the fill minute counts, target only after the fill minute', () => {
  const M = [{ t: 0, h: 101, l: 99.6, c: 100 }, { t: 60000, h: 102.2, l: 99.9, c: 102 }]
  assert.equal(limitTrade(M, 0, true, 100, 99, 102, () => 0.3, 0.1, 1e9), 2)
  assert.equal(limitTrade([{ t: 0, h: 101, l: 98.5, c: 99 }], 0, true, 100, 99, 102, () => 0.3, 0.1, 1e9), -1.1)
  assert.equal(limitTrade([{ t: 0, h: 101, l: 99.8, c: 100 }], 0, true, 100, 99, 102, () => 0.3, 0.1, 1e9), null, 'bid 99.8 + 0.3 spread never reached 100 on the ask')
})
await ok('study artifacts: Test A + Test B verdicts follow their own pre-registered rules', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'fib_levels_study.json'), 'utf8'))
  for (const c of Object.values(A.cells)) { const v = c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD'; assert.equal(c.verdict, v, c.tf + ' ' + c.name) }
  assert.equal(Object.keys(A.cells).length, 63)
  const Bf = JSON.parse(fs.readFileSync(path.join(master, 'fib_matrix_filter.json'), 'utf8'))
  for (const v of Object.values(Bf.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
console.log(process.exitCode ? '✗ FIB SMOKE FAILED' : `✅ FIB (TOOL 1) SMOKE: ${n} passed, 0 failed`)
