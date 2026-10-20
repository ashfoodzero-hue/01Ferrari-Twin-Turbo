// smoke_veto_score.mjs — V1H veto scoring (scripts/lib/veto_score.mjs, 2026-10-20): a vetoed BUY is priced exactly as the box it would have been,
// never on bars after "now", one-box-at-a-time sequencing holds a pending box, and matrix_tick wires it safely.
import '../src/core/bootEnv.js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { scoreVetoes, oneAtATime, vetoSummary, VETOED, GATE_LIVE_T } from './lib/veto_score.mjs'
import { resolveMatrixTrade } from '../src/master/ferrariMatrix.js'
import { loadBars } from '../src/data/backfillReader.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { quotesFile } from '../src/core/paths.js'

let pass = 0, fail = 0
const t = async (name, f) => { try { await f(); pass++; console.log('  ✓ ' + name) } catch (e) { fail++; console.log('  ✗ ' + name + ' — ' + e.message) } }
const M = 60000, sig = (o) => ({ side: 'BUY', decisionT: 0, entry: 100, sl: 95, tp1: 110, tp2: 115, atr: 0, ...o }), z = () => 0
const bars = (hl) => hl.map(([h, l], i) => ({ t: i * M, o: (h + l) / 2, h, l, c: (h + l) / 2 }))

await t('hand-built: TP1 then TP2 → +12.5 (half at +10, half at +15); stop first on a bar that touches both → −5', () => {
  const [a] = scoreVetoes([{ id: 'a', sig: sig() }], new Set(), bars([[101, 99], [111, 100], [116, 105]]), z, 10 * M)
  assert.equal(a.outcome, 'TP1+TP2'); assert.equal(a.pnl, 12.5)
  const [b] = scoreVetoes([{ id: 'b', sig: sig() }], new Set(), bars([[101, 99], [111, 94]]), z, 10 * M)
  assert.equal(b.outcome, 'SL'); assert.equal(b.pnl, -5)
})
await t('no look-ahead: bars after "now" are never read — an unfinished trade is not scored', () => {
  const B = bars([[101, 99], [102, 99], [116, 105]])
  assert.equal(scoreVetoes([{ id: 'c', sig: sig() }], new Set(), B, z, 2 * M).length, 0, 'TP at minute 2 is after now = 2 min')
  assert.equal(scoreVetoes([{ id: 'c', sig: sig() }], new Set(['c']), B, z, 10 * M).length, 0, 'an already-scored id is never scored twice')
})
await t('one box at a time: overlapping vetoes skipped, a pending box holds everything after it, a kept box blocks its window', () => {
  const v = (id, t) => ({ id, sig: { decisionT: t } }), s = (id, t, exitT, pnl) => ({ id, decisionT: t, exitT, pnl, outcome: 'X' })
  const V = [v('1', 0), v('2', 5), v('3', 12), v('k', 45), v('p', 60), v('q', 70)], S = [s('1', 0, 10, 1), s('2', 5, 8, 1), s('3', 12, 20, 1), s('k', 45, 46, 1), s('q', 70, 80, 1)]
  const r = oneAtATime(V, S, [{ sig: { decisionT: 40 }, closedAt: new Date(50).toISOString() }])
  assert.deepEqual(r.taken.map((x) => x.id), ['1', '3']); assert.equal(r.pending, 1)
})
await t('real vetoes: every scored row = resolveMatrixTrade on the same bars and live spreads (the live box price)', async () => {
  const V = fs.readFileSync(VETOED, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); assert(V.length > 0, 'no vetoes on file')
  const from = Math.min(...V.map((v) => v.sig.decisionT)) - M, nowT = Math.floor(Date.now() / M) * M
  const m1 = (await loadBars('XAUUSD', '1m', { from })).bars.filter((b) => b.t + M <= nowT), spreadAt = makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from: from - 86400000 }) })
  const S = scoreVetoes(V, new Set(), m1, spreadAt, nowT); let k = 0
  for (const v of V) { const r = resolveMatrixTrade(v.sig, m1, spreadAt, { nowT }), s = S.find((x) => x.id === v.id)
    if (!r.done) { assert(!s, v.id + ' is not done and must not be scored'); continue }
    assert.equal(s.pnl, r.pnl); assert.equal(s.outcome, r.outcome); k++ }
  const sum = vetoSummary(V, S, [], nowT); assert.equal(sum.vetoed_all.n, k); assert.equal(sum.pending, V.filter((v) => v.sig.decisionT >= GATE_LIVE_T).length - k)
  console.log(`    ${V.length} vetoes, ${k} done, identical`)
})
await t('matrix_tick wiring: every live tick, inside try, settles only on live data, never in --static', () => {
  const src = fs.readFileSync(new URL('./matrix_tick.mjs', import.meta.url), 'utf8')
  assert(/if \(!STATIC\) try \{ const vr = await updateVetoScores\(\{ nowT: lastClose, dataLive: st\.live && !health\.halted \}\)/.test(src))
  assert(/catch \(e\) \{ console\.error\('  ⚠ veto scoring: '/.test(src))
})
console.log(fail ? `✗ VETO SCORE SMOKE: ${pass} passed, ${fail} failed` : `✅ VETO SCORE SMOKE: ${pass} passed, 0 failed`); process.exit(fail ? 1 : 0)
