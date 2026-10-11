// smoke_order_block.mjs — the ORDER BLOCK rule (src/master/orderBlock.js) on hand-built fixtures, and the 13 y study's verdict rule.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { orderBlockAt } from '../src/master/orderBlock.js'
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ ORDER BLOCK SMOKE ██')
const flat = (k) => Array.from({ length: k }, () => ({ o: 100, h: 100.5, l: 99.5, c: 100, v: 10 }))
const A = (B) => B.map(() => 1)   // ATR = 1 everywhere
await ok('bullish OB: down candle, 3 bars displace ≥ 1.5 ATR and close above its high → zone = its range; strength from displacement + volume', () => {
  const B = [...flat(20), { o: 100, h: 100.2, l: 99, c: 99.2, v: 10 }, { o: 99.2, h: 100, l: 99.1, c: 99.9, v: 30 }, { o: 99.9, h: 101.5, l: 99.8, c: 101.4, v: 30 }, { o: 101.4, h: 102, l: 101, c: 101.8, v: 30 }]
  const ob = orderBlockAt(B, A(B), 20); assert(ob && ob.up); assert.equal(ob.top, 100.2); assert.equal(ob.bot, 99); assert.equal(ob.knownIdx, 23)
  assert(Math.abs(ob.disp - 3) < 1e-9); assert(Math.abs(ob.relVol - 3) < 1e-9); assert.equal(ob.strong, true)
})
await ok('no OB when the candle is the wrong colour, the move is < 1.5 ATR, or the 3rd bar does not close beyond the block', () => {
  const up = { o: 99, h: 100.2, l: 99, c: 100, v: 10 }, next = [{ o: 100, h: 101.5, l: 99.8, c: 101.4, v: 10 }, { o: 101.4, h: 102, l: 101, c: 101.8, v: 10 }, { o: 101.8, h: 102, l: 101, c: 101.8, v: 10 }]
  let B = [...flat(20), up, ...next]; assert.equal(orderBlockAt(B, A(B), 20), null)   // up candle followed by a rally = not a bullish OB
  const dn = { o: 100, h: 100.2, l: 99, c: 99.2, v: 10 }
  B = [...flat(20), dn, { o: 99.2, h: 100.3, l: 99.1, c: 100.3, v: 10 }, { o: 100.3, h: 100.4, l: 100, c: 100.3, v: 10 }, { o: 100.3, h: 100.4, l: 100, c: 100.3, v: 10 }]
  assert.equal(orderBlockAt(B, A(B), 20), null)   // displacement 1.4 ATR
  B = [...flat(20), dn, { o: 99.2, h: 101, l: 99.1, c: 100.9, v: 10 }, { o: 100.9, h: 101, l: 100, c: 100.1, v: 10 }, { o: 100.1, h: 100.2, l: 99.9, c: 100.1, v: 10 }]
  assert.equal(orderBlockAt(B, A(B), 20), null)   // closes back inside the block
})
await ok('bearish OB is the mirror; weak volume → not STRONG', () => {
  const B = [...flat(20), { o: 100, h: 101, l: 99.8, c: 100.8, v: 10 }, { o: 100.8, h: 100.9, l: 99.5, c: 99.6, v: 10 }, { o: 99.6, h: 99.7, l: 98.6, c: 98.7, v: 10 }, { o: 98.7, h: 98.8, l: 98, c: 98.2, v: 10 }]
  const ob = orderBlockAt(B, A(B), 20); assert(ob && !ob.up); assert(Math.abs(ob.disp - 3) < 1e-9); assert.equal(ob.strong, false)
})
await ok('order_block_study.json: 16 cells; HOLDS only with OOS ≥ 100, bounce LB > control, TRAIN > control, money bound > 0, TRAIN $ > 0', () => {
  const S = JSON.parse(fs.readFileSync(path.join(root, 'data', 'master', 'order_block_study.json'), 'utf8')); assert.equal(Object.keys(S.cells).length, 16)
  for (const c of Object.values(S.cells)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb_bonf > 0 && c.train.net > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
  assert.equal(S.verdict, S.holding.length ? 'SOME_ORDER_BLOCKS_HOLD' : 'ORDER_BLOCKS_DO_NOT_HOLD')
})
console.log(process.exitCode ? '✗ ORDER BLOCK SMOKE FAILED' : `✅ ORDER BLOCK SMOKE: ${n} passed, 0 failed`)
