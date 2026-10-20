// smoke_refusal_score.mjs — IMPULSE_CONT refusal scoring (scripts/lib/refusal_score.mjs, 2026-10-20): a refused plan is settled by the LIVE book's
// resolver exactly as a taken trade would be, the live journal is never written, and twin_tick wires it safely.
import '../src/core/bootEnv.js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { wouldBeRow, bookStats, updateRefusalScores, LIVE } from './lib/refusal_score.mjs'
import { loadJournal, resolveOpen } from '../src/master/paperTrader.js'
import { loadBarsLive } from '../src/data/liveBars.js'
import { makeSubBarIndex } from '../src/core/seqResolver.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { quotesFile } from '../src/core/paths.js'

let pass = 0, fail = 0
const t = async (name, f) => { try { await f(); pass++; console.log('  ✓ ' + name) } catch (e) { fail++; console.log('  ✗ ' + name + ' — ' + e.message) } }
const tmp = (rows) => { const f = path.join(os.tmpdir(), `smoke_refusal_${process.pid}_${Math.random().toString(36).slice(2)}.jsonl`); fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); return f }
const Q = 900000

await t('hand-built SELL refusal: fills at the limit, then the target trades → TARGET, +4.40', () => {
  const r = wouldBeRow({ id: 'X', tier: 'IMPULSE_CONT', state: 'REFUSED', why: 'state favours BUY, signal is SELL', t: 0, recordedAtBar: 0, wouldBe: { entry: 100, stop: 108.8, target: 95.6, side: 'SELL', atr: 5, beTriggerR: 0.05, beLockR: 0.1 } })
  const f = tmp([r]); resolveOpen(f, [{ t: Q, o: 99, h: 100.5, l: 98.5, c: 99 }, { t: 2 * Q, o: 99, h: 99.2, l: 95, c: 95.5 }]); const [x] = loadJournal(f); fs.rmSync(f)
  assert.equal(x.state, 'TARGET'); assert.equal(x.pnl, 4.4)
})
await t('unpriceable refusal (no plan) → no row; top-level REFUSED row never carries a trade', () => {
  assert.equal(wouldBeRow({ id: 'Y', state: 'REFUSED', wouldBe: null }), null)
  for (const r of loadJournal(LIVE).filter((x) => x.state === 'REFUSED')) assert(r.entry == null && r.stop == null && r.target == null, r.id)
})
await t('PARITY on real trades: each TAKEN row, replayed as a refusal through this path, reproduces its recorded state and pnl', async () => {
  const taken = loadJournal(LIVE).filter((r) => r.state !== 'REFUSED' && r.pnl != null); assert(taken.length > 0, 'no settled taken trade on file')
  const asRefusal = taken.map((r) => wouldBeRow({ id: r.id, tier: r.tier, state: 'REFUSED', t: r.t, recordedAtBar: r.recordedAtBar, wouldBe: { entry: r.entry, stop: r.stop, target: r.target, side: r.side, atr: r.atr, beTriggerR: r.beTriggerR, beLockR: r.beLockR } }))
  const from = Math.min(...taken.map((r) => r.t)) - 86400000, { bars: b15 } = await loadBarsLive('XAUUSD', '15m', { from }), { bars: m1 } = await loadBarsLive('XAUUSD', '1m', { from })
  const f = tmp(asRefusal); resolveOpen(f, b15, undefined, { subBarsOf: makeSubBarIndex(m1), spreadAt: makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from }) }) })
  const out = loadJournal(f); fs.rmSync(f)
  for (const r of taken) { const x = out.find((o) => o.id === r.id); assert.equal(x.state, r.state, r.id); assert.equal(x.pnl, r.pnl, r.id); assert.equal(x.exitPrice, r.exitPrice, r.id) }
  console.log(`    ${taken.length} taken trades reproduced: ${taken.map((r) => `${r.side} ${r.state} ${r.pnl}`).join(' · ')}`)
})
await t('book stats: WR excludes scratches (as the shipped 73.6 %); $ over filled trades', () => {
  const s = bookStats([{ state: 'TARGET', pnl: 4 }, { state: 'STOPPED', pnl: -9 }, { state: 'SCRATCH', pnl: 0.5 }, { state: 'EXPIRED' }, { state: 'OPEN' }])
  assert.equal(s.wr_ex_scratch, 0.5); assert.equal(s.net, -4.5); assert.equal(s.per_filled_trade, -1.5); assert.equal(s.open, 1); assert.equal(s.expired, 1)
})
await t('dry run on the real journal writes nothing (live journal + would-be journal unchanged)', async () => {
  const h = (f) => (fs.existsSync(f) ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') : 'none'), W = path.join(path.dirname(LIVE), 'impulse_refused_wouldbe.jsonl'), a = [h(LIVE), h(W)]
  const r = await updateRefusalScores({ dry: true }); assert.deepEqual([h(LIVE), h(W)], a); assert(r.summary.refused_signals >= 0)
})
await t('twin_tick wiring: after the live resolve, on the tick\'s own 15m bars, inside try (never breaks the tick)', () => {
  const src = fs.readFileSync(new URL('./twin_tick.mjs', import.meta.url), 'utf8')
  assert(/try \{ const rf = await updateRefusalScores\(\{ b15, nowT: lastClose \}\)/.test(src)); assert(/catch \(e\) \{ console\.log\('  ⚠ refusal scoring: '/.test(src))
  assert(src.indexOf('updateRefusalScores({') > src.indexOf('const res = resolveOpen(FILE'), 'must run after the live journal resolves')
})
console.log(fail ? `✗ REFUSAL SCORE SMOKE: ${pass} passed, ${fail} failed` : `✅ REFUSAL SCORE SMOKE: ${pass} passed, 0 failed`); process.exit(fail ? 1 : 0)
