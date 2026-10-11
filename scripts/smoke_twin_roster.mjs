// smoke_twin_roster.mjs — the twin emitter: ONE book, every number sourced, every fire causal and geometrically exact.
// Mechanism-based (never pins which book wins): the TIER_STATS record must equal its artifact field for field, every
// emitted fire must satisfy the impulse predicate on the bars it came from, and the scan must be POWERED (≥3 fires).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO } from '../src/core/paths.js'
import { emitTwinRoster, isImpulseCandidate, TIER_STATS, ISET, IMPULSE, STATE_GATE_MODE } from '../src/master/twinRoster.js'

let pass = 0, fail = 0
const ok = (n, f) => { try { f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ TWIN ROSTER SMOKE ██')
const here = path.dirname(fileURLToPath(import.meta.url))

const artOf = (src) => JSON.parse(fs.readFileSync(path.join(TURBO.root, src.split('#')[0]), 'utf8'))
ok('exactly ONE book is declared; tradeable ⇔ its artifact verdict is SHIP (a SHADOW verdict is never tradeable); paper-only; cites its artifact', () => {
  assert.deepEqual(Object.keys(TIER_STATS), ['IMPULSE_CONT'])
  const S = TIER_STATS.IMPULSE_CONT
  assert(/^data\/.+\.json#/.test(S.source), 'the book must cite its artifact'); assert.equal(S.paperOnly, true); assert.equal(S.managed, true)
  const art = artOf(S.source)
  assert.equal(S.tradeable, art.verdict === 'SHIP', `tradeable ${S.tradeable} vs artifact verdict ${art.verdict}`); assert.equal(S.seqVerdict, art.verdict)
  if (S.tradeable) assert(S.netPerTradeLbUsd > 0, 'a tradeable book needs a positive bootstrap LB'); else assert(S.shadow === true && /TWIN GATE/.test(S.shadowWhy))
})
ok('the TIER_STATS record reproduces its artifact FIELD FOR FIELD (the audit_live_claims contract, local copy)', () => {
  const S = TIER_STATS.IMPULSE_CONT
  const art = artOf(S.source).shipped
  assert.equal(S.wr, art.wr); assert.equal(S.wrLb, art.lb); assert.equal(S.n, art.n)
  assert.equal(S.netPerTradeUsd, art.net_per_trade_oos); assert.equal(S.netPerTradeLbUsd, art.net_per_trade_lb); assert.equal(S.netPerTradeTrainUsd, art.net_per_trade_train)
  assert.equal(S.outcomes.win, art.outcomes_oos.p_win); assert.equal(S.outcomes.scratch, art.outcomes_oos.p_scratch); assert.equal(S.outcomes.loss, art.outcomes_oos.p_loss)
  assert.equal(S.perDay, art.per_day); assert.equal(S.perYear, art.per_year); assert.equal(S.avgStopUsd, art.avg_risk)
  assert.equal(S.slAtr, art.geometry.sl_atr); assert.equal(S.tgtR, art.geometry.tgt_r); assert.equal(S.beTriggerR, art.geometry.be_trigger_r); assert.equal(S.beLockR, art.geometry.be_lock_r)
})
ok('the traded-semantics block reproduces the MONEY-PATH artifact (traded lock · bid/ask · every bar on 1m)', () => {
  const S = TIER_STATS.IMPULSE_CONT.outcomesTraded, art = artOf(S.source)
  assert.deepEqual(art.resolution, { seq_all: true, lock_mode: 'traded', bid_ask: true }, 'the block must come from the money path')
  const o = art.shipped.outcomes_oos
  assert.equal(S.n, o.n); assert.equal(S.win, o.p_win); assert.equal(S.scratch, o.p_scratch); assert.equal(S.loss, o.p_loss)
  assert.equal(S.netPerTradeUsd, art.shipped.net_per_trade_oos); assert.equal(S.netPerTradeLbUsd, art.shipped.net_per_trade_lb)
})
ok('the selection constants are the pre-registered ones (never silently re-tuned)', () => {
  assert.deepEqual([...ISET], ['sweep_reclaim', 'fvg_continuation', 'ob_discount_tap', 'trend_pullback'])
  assert.deepEqual({ ...IMPULSE }, { lookBars: 8, minAtrMult: 4 })
  assert(['block', 'stamp'].includes(STATE_GATE_MODE))
})
ok('static: the roster never assigns a tier side from a raw direction field', () => {
  const src = fs.readFileSync(path.join(here, '..', 'src', 'master', 'twinRoster.js'), 'utf8')
  const offenders = [...src.matchAll(/side:\s*([a-zA-Z_$][\w$]*)\.direction\b/g)].filter((m) => !src.slice(src.lastIndexOf('\n', m.index) + 1, m.index).includes('//'))
  assert.equal(offenders.length, 0)
})

const b15 = (await loadBars('XAUUSD', '15m', { from: Date.now() - 200 * 86400000 })).bars
ok('emits a well-formed roster on real bars and degrades on tiny input', () => {
  const r = emitTwinRoster(b15)
  for (const k of ['at', 'impulseCont', 'marketState', 'book', 'summary']) assert(k in r, 'missing ' + k)
  assert.equal(r.at, b15.at(-1).t); assert(r.marketState && typeof r.marketState.state === 'string')
  const r2 = emitTwinRoster([{ t: 0, o: 1, h: 1, l: 1, c: 1, v: 1 }]); assert.equal(r2.summary, 'no live signal'); assert.equal(r2.impulseCont, null)
})
// POWERED causal scan: walk back until ≥ 3 fires are seen; every fire must be from the past, geometrically exact,
// and must satisfy the impulse predicate when re-derived from the bars it names.
let fires = 0, cuts = 0, agreeStamp = 0
const seen = new Set()
for (let back = 0; back < 5000 && fires < 3; back += 3) {
  const upto = b15.slice(0, b15.length - back); if (upto.length < 2000) break
  cuts++
  const r = emitTwinRoster(upto, { now: upto.at(-1).t + 900000 })
  const s = r.impulseCont; if (!s) continue
  assert(s.t <= upto.at(-1).t, 'fire from the future'); assert.equal(upto[s.i].t, s.t, 'index/time mismatch')
  assert(['BUY', 'SELL'].includes(s.side) && ['UP', 'DOWN'].includes(s.direction) && (s.side === 'BUY') === (s.direction === 'UP'), 'side/direction vocabulary')
  const risk = TIER_STATS.IMPULSE_CONT.slAtr * s.atr
  assert(Math.abs(Math.abs(s.entry - s.stop) - risk) < 0.02, 'stop ≠ 1.5·ATR'); assert(Math.abs(Math.abs(s.target - s.entry) - 0.5 * risk) < 0.02, 'target ≠ 0.5R')
  assert(isImpulseCandidate(upto, { setup: s.setup, atr: s.atr, i: s.i, direction: s.direction }), 'emitted fire fails the impulse predicate on its own bars')
  assert(s.stateRead && typeof s.stateRead.agrees === 'boolean', 'state read stamped')
  if (STATE_GATE_MODE === 'stamp') assert.equal(s.blocked, false); else assert.equal(s.blocked, !s.stateRead.agrees)
  assert(typeof s.expired === 'boolean' || 'status' in s || 'life' in s || 'alive' in s || 'dead' in s, 'signalLife fields present')
  if (!seen.has(s.t)) { seen.add(s.t); fires++; if (s.stateRead.agrees) agreeStamp++ }
}
ok(`POWER: ${fires} distinct fire(s) found over ${cuts} causal cut points (need ≥ 3; state agreed on ${agreeStamp})`, () => assert(fires >= 3, 'the scan found fewer than 3 fires — widen the window before trusting the checks above'))
ok('summary names the book when it fires and says so when the state refuses it', () => {
  const r = emitTwinRoster(b15)
  if (r.impulseCont) assert(/IMPULSE_CONT/.test(r.summary)); else assert(r.summary === 'no live signal' || r.summary === r.marketState?.message)
})
console.log(`\n${fail ? '✗' : '✅'} TWIN ROSTER SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
