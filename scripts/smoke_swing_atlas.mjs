// smoke_swing_atlas.mjs — the atlas core (scripts/lib/swing_atlas.mjs) recovers a PLANTED pattern on synthetic candles (2026-10-17, spec §6):
// every true swing low is a hammer candle, failed lows (in-leg new lows that later break) are plain bear candles. The atlas must find
// '0|hammer' far more often at swings (S) than at failed extremes (C1), and must NOT invent the pattern at swing HIGHS.
import assert from 'node:assert'
import { atlasEvents, terciles, atlasCounts } from './lib/swing_atlas.mjs'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ SWING ATLAS SMOKE (planted pattern) ██')
const C = []; let p = 100, t = Date.UTC(2020, 0, 1)
for (let leg = 0; leg < 120; leg++) { const dir = leg % 2 ? 1 : -1
  for (let b = 0; b < 30; b++) { const o = p, move = b % 5 === 4 ? -dir * 1.6 : dir * 1; p = o + move
    let c = { t, o, h: Math.max(o, p) + 0.3, l: Math.min(o, p) - 0.3, c: p }
    if (dir < 0 && b === 29) c = { t, o: p - 0.05, h: p + 0.15, l: p - 3, c: p + 0.1 }   // the planted hammer at the leg bottom
    C.push(c); t += 3600000 } }
const isTrain = (x) => x < C[Math.floor(C.length * 0.6)].t
const ev = atlasEvents(C, { k: 3 }), cuts = terciles(C, ev, new Set(), isTrain), res = atlasCounts(C, ev, { isTrain, cuts })
const rate = (side, grp, key) => { const c = res.cells[side][key]?.[grp]; if (!c) return null; const k = c.T[0] + c.O[0], m = c.T[1] + c.O[1]; return m ? k / m : null }
ok('synthetic series produces swings both sides and failed-extreme controls', () => {
  assert(res.n.L.S.T + res.n.L.S.O > 30, 'swing lows ' + JSON.stringify(res.n.L)); assert(res.n.L.C1.T + res.n.L.C1.O > 30, 'failed lows ' + JSON.stringify(res.n.L))
})
ok('the PLANTED hammer is found at swing lows (S) and not at failed lows (C1)', () => {
  const s = rate('L', 'S', '0|hammer'), c1 = rate('L', 'C1', '0|hammer'); console.log(`      hammer at swing lows ${(100 * s).toFixed(0)} % vs failed lows ${(100 * c1).toFixed(0)} %`)
  assert(s > 0.8 && c1 < 0.1)
})
ok('the pattern is NOT invented at swing highs', () => { const s = rate('H', 'S', '0|hammer'); assert(s < 0.1, 'hammer at swing highs ' + s) })
ok('confirmation: never on the extreme candle itself (offset 0 share = 0)', () => { assert.equal(res.confirmed_by_offset.L['0'], 0) })
console.log(failed ? `✗ SWING ATLAS SMOKE: ${n} passed, ${failed} failed` : `✅ SWING ATLAS SMOKE: ${n} passed, 0 failed`)
