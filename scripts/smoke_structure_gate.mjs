// smoke_structure_gate.mjs — the V1H structure gate (choch4h.structureStateAt) as the LIVE tick runs it (45-day window, live cleaning) equals the
// full-history state the study measured, at 300 random decision times 2014 → 2026; plus the mechanism on hand-built candles (LH+LL → DOWN, a forming
// candle is never read). 2026-10-20.
import '../src/core/bootEnv.js'
import assert from 'node:assert/strict'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { rng } from '../src/core/studyStats.js'
import { V1H, findChochs, structureStateAt } from './lib/choch4h.mjs'

let pass = 0, fail = 0
const t = async (name, f) => { try { await f(); pass++; console.log('  ✓ ' + name) } catch (e) { fail++; console.log('  ✗ ' + name + ' — ' + e.message) } }
const H = 3600000

await t('mechanism: LH + LL on hand-built 1H candles → DOWN; the forming candle is not read', () => {
  // zig-zag down: highs 110 → 105 → 100, lows 95 → 90 → 85, 4 candles per swing leg, flat neighbours
  const px = [], seq = [[100, 0], [110, 1], [100, 0], [95, -1], [100, 0], [105, 1], [97, 0], [90, -1], [95, 0], [100, 1], [92, 0], [85, -1], [90, 0], [88, 0], [87, 0], [86, 0]]
  for (const [p] of seq) for (let k = 0; k < 4; k++) px.push(p - Math.abs(k - 1.5))
  const C = px.map((p, i) => ({ t: i * H, o: p, h: p + 1, l: p - 1, c: p, close_t: (i + 1) * H }))
  const M1 = C.map((c) => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c }))
  const full = findChochs(C, M1, {}).state.at(-1), r = structureStateAt(C, M1, C.at(-1).close_t)
  assert.equal(full, -1, 'descending pivot highs and lows must read DOWN'); assert.equal(r.state, -1); assert.equal(r.barT, C.at(-1).t)
  const forming = structureStateAt(C, M1, C.at(-1).t + 30 * 60000)   // half-way through the last candle
  assert.equal(forming.barT, C.at(-2).t, 'the forming candle must not be read')
})

await t('live 45-day window = full-history state at 300 random decision times (2014 → 2026)', async () => {
  const M = await clean1m('XAUUSD', { reopenClamp: false }), K = kit('XAUUSD', { reopenClamp: false })
  const C = K.build(M, '1H'); markIncomplete(C, findHoles(M)); const S = findChochs(C, M, {}).state, T = C.map((c) => Math.max(c.close_t, c.t + H))
  const r = rng(31), t0 = Date.parse('2014-03-01'), t1 = M.at(-1).t; let n = 0, diff = 0; const ex = []
  for (let k = 0; k < 300; k++) { const tt = Math.floor((t0 + r() * (t1 - t0)) / 180000) * 180000
    let a = 0, b = T.length; while (a < b) { const m = (a + b) >> 1; if (T[m] <= tt) a = m + 1; else b = m }; const full = a ? S[a - 1] : 0
    const lo = (() => { let x = 0, y = M.length; while (x < y) { const m = (x + y) >> 1; if (M[m].t < tt - V1H.lookbackDays * 86400000) x = m + 1; else y = m } return x })()
    let hi = lo; while (hi < M.length && M[hi].t + 60000 <= tt) hi++
    const Mw = M.slice(lo, hi), Cw = K.build(Mw, '1H'); markIncomplete(Cw, findHoles(Mw)); const live = structureStateAt(Cw, Mw, tt)
    n++; if (!live || live.state !== full) { diff++; if (ex.length < 5) ex.push({ at: new Date(tt).toISOString(), full, live: live?.state ?? null }) } }
  console.log(`    compared ${n}, differences ${diff}`, ex.length ? JSON.stringify(ex) : '')
  assert.equal(diff, 0)
})

await t('matrix_tick wires the gate fail-closed and logs vetoes OUTSIDE the trade journal', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('./matrix_tick.mjs', import.meta.url), 'utf8')
  assert(/blocksBuy: !SG \|\| SG\.state === -1/.test(src), 'unknown state must block BUYs')
  assert(/s\.side === 'BUY' && out\.structureGate\.blocksBuy/.test(src), 'the gate must sit before a BUY opens')
  assert(/matrix_vetoed\.jsonl/.test(src) && !/appendFileSync\(JOURNAL, JSON\.stringify\(\{ id: `MATRIX@\$\{s\.decisionT\}`, status: 'VETOED/.test(src), 'vetoes go to matrix_vetoed.jsonl')
})

console.log(fail ? `✗ STRUCTURE GATE SMOKE: ${pass} passed, ${fail} failed` : `✅ STRUCTURE GATE SMOKE: ${pass} passed, 0 failed`); process.exit(fail ? 1 : 0)
