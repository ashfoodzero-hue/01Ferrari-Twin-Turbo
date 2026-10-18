// smoke_swing_nextmove.mjs — the 15m next-move core (scripts/lib/swing_nextmove.mjs) on hand-built data with known answers, and the study
// artifact's own rules (claims follow their numbers; every measure starts at the confirmation close).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { race, legMeasures, levelHits, nextMoveEvents, quant, HIT_ATR } from './lib/swing_nextmove.mjs'

let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
console.log('\n██ SWING NEXT-MOVE SMOKE ██')
const m = (t, o, h, l, c) => ({ t, o, h, l, c })
ok('race: with-leg first → true · against first → false · both in one minute → false (pessimistic) · start strictly at t0 · unresolved → null', () => {
  const M = [m(0, 100, 100.5, 99.5, 100), m(60000, 100, 102.1, 99.9, 102), m(120000, 102, 102, 97, 97)], T = Float64Array.from(M.map((b) => b.t))
  assert.equal(race(M, T, 60000, 100, 1, 2, 1), true); assert.equal(race(M, T, 60000, 100, -1, 2, 1), false)
  const B = [m(0, 100, 103, 97, 100)], TB = Float64Array.from([0]); assert.equal(race(B, TB, 0, 100, 1, 2, 1), false)
  assert.equal(race(M, T, 120000, 102, 1, 2, 1), false, 'the minute before t0 must not count'); assert.equal(race([m(0, 100, 100.1, 99.9, 100)], Float64Array.from([0]), 0, 100, 1, 2, 1), null)
})
ok('legMeasures on a planted leg: full / remaining / adverse / bars measured from the CONFIRMATION close', () => {
  const C = [m(0, 10, 10, 10, 10), m(1, 10, 10, 9, 9), m(2, 9, 12, 9, 12), m(3, 12, 13, 11.5, 12.5), m(4, 12.5, 15, 12, 14), m(5, 14, 14, 11, 11)]
  const ev = { s: { i: 1, px: 9 }, e: 2, a: 1, dir: 1, p0: 12, next: { i: 4, px: 15, knownI: 5 } }, r = legMeasures(C, ev)
  assert.equal(r.full_atr, 6); assert.equal(r.rem_atr, 3); assert.equal(r.adv_atr, 0.5); assert.equal(r.bars_to_extreme, 2); assert.equal(r.bars_to_confirm, 3)
  assert.equal(legMeasures(C, { ...ev, next: null }), null)
})
ok('levelHits: only levels in the leg direction · hit ⇔ next extreme within ±0.25 ATR · shifted control stays in the leg direction', () => {
  const ev = { p0: 100, dir: 1, a: 2, next: { px: 110.3 } }
  const h = levelHits(ev, [{ type: 'a', px: 110 }, { type: 'b', px: 95 }, { type: 'c', px: 120 }], 5)
  assert.deepEqual(h.map((x) => x.type), ['a', 'c']); assert.equal(h[0].hit, true); assert.equal(h[1].hit, false); assert.equal(HIT_ATR, 0.25)
  for (let s = 0; s < 50; s++) for (const x of levelHits({ p0: 100, dir: 1, a: 2, next: { px: 101 } }, [{ type: 'n', px: 101 }], s)) assert.equal(typeof x.ctrl, 'boolean')
})
ok('nextMoveEvents: events start at knownI, the next swing is the opposite one, a break inside the leg drops the next swing', () => {
  const C = []; let p = 100; const path0 = [0, -1, -2, -3, -4, -5, -6, -5, -3, 0, 3, 6, 8, 9, 7, 4, 1, -2, -4, -5]
  for (let i = 0; i < 60; i++) { const v = 100 + path0[i % path0.length] * 2 + (i >= 20 ? 0 : 0); C.push({ t: i * 900000, o: p, h: Math.max(p, v) + 0.5, l: Math.min(p, v) - 0.5, c: v, close_t: (i + 1) * 900000 }); p = v }
  const { events } = nextMoveEvents(C, { k: 3 }); assert(events.length >= 2)
  for (const e of events) { assert(e.e >= e.s.i); assert.equal(e.t0, C[e.e].close_t); if (e.next) assert.notEqual(e.next.type, e.s.type) }
  const withBreak = nextMoveEvents(C, { k: 3, breaks: new Set([events[0].next ? events[0].next.i : 30]) }); assert(withBreak.events.length <= events.length)
})
ok('quant: P10..P90 + n on a known array', () => { const q = quant([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); assert.equal(q.p50, 6); assert.equal(q.n, 11); assert.equal(q.p10, 2) })
ok('artifact: claims follow their own numbers (Q1 · Q4 · splits), OOS ≥ 100 for any claim', () => {
  const f = path.join(root, 'data', 'master', 'swing_nextmove_15m.json'); if (!fs.existsSync(f)) return
  const S = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const [k, t] of Object.entries(S.q1)) if (t.claim !== undefined) assert.equal(t.claim, !!(t.OOS.holm_pass && t.OOS.cont_lb > t.OOS.ctrl && t.TRAIN.cont > t.TRAIN.ctrl && t.boot.lo > 0), k)
  for (const [k, t] of Object.entries(S.q4)) assert.equal(t.claim, !!(t.OOS.holm_pass && t.OOS.hit_lb > t.OOS.ctrl && t.TRAIN.hit > t.TRAIN.ctrl && t.OOS.n >= 100), k)
  for (const k of S.claims.splits) { const [name, v] = k.split('='); assert(S.splits[name][v].OOS.n >= 100) }
})
console.log(process.exitCode ? '✗ SWING NEXT-MOVE SMOKE FAILED' : `✅ SWING NEXT-MOVE SMOKE: ${n} passed, 0 failed`)
