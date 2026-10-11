// smoke_paper_trader.mjs — the forward-test recorder. Deterministic synthetic bars; every pessimism rule locked.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { recordSignals, resolveOpen, loadJournal, paperStats, PAPER_PARAMS } from '../src/master/paperTrader.js'
import { resolveManagedLimitSeq, makeSubBarIndex as mkSubs } from '../src/core/seqResolver.js'
import { mulberry32 } from '../src/core/rng.js'
let pass = 0, fail = 0
const ok = (n, f) => { try { f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ PAPER TRADER SMOKE ██')

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paper-')), 'trades.jsonl')
const H = 900000
const bar = (t, o, h, l, c) => ({ t, o, h, l, c, v: 100 })
const STATS = {
  SWEEP_DIVERGENCE: { tf: '1h', tradeable: true, wr: 0.5116, n: 516, perYear: 22.2, rr: 1.5 },
  SCALP: { tf: '15m', tradeable: false, wr: 0.2573, n: 5994, perYear: 620.5, rr: 2.43 },
}
const sig = (over = {}) => ({ sweepDivergence: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 115, atr: 10, reasons: ['x'], ...over } })

ok('records a signal and is IDEMPOTENT (a repeated tick adds nothing)', () => {
  const f = tmp()
  const a = recordSignals(f, sig(), STATS, 2000)
  const b = recordSignals(f, sig(), STATS, 3000)
  assert.equal(a.added, 1); assert.equal(b.added, 0); assert.equal(b.skipped, 1)
  assert.equal(loadJournal(f).length, 1)
})
ok('a GATE-BLOCKED signal is recorded as REFUSED, never as a trade', () => {
  const f = tmp()
  recordSignals(f, sig({ blocked: true, blockedWhy: 'ATR below gate' }), STATS, 2000)
  const [r] = loadJournal(f)
  assert.equal(r.state, 'REFUSED'); assert.equal(r.why, 'ATR below gate')
  assert(!('entry' in r), 'a refusal must not carry trade geometry')
})
// 2026-08-19 (Ashraf: "record everything, so we know the reason we are missing a trade"): a refusal now ALSO
// records the plan it turned down, nested under `wouldBe`. 134 refusals in one week were unpriceable without it —
// we could count what the gate blocked but never say whether it saved money or cost it. The NESTING is the safety
// property: the miss ledger can price it, while the top-level row still has no entry/stop/target, so no consumer
// can mistake a refusal for a trade.
ok('a REFUSED signal records the plan it turned down — nested, and still not a trade', () => {
  const f = tmp()
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 4380, stop: 4390, target: 4375, atr: 6,
    beTriggerR: 0.05, beLockR: 0.1, reasons: [], blocked: true, blockedWhy: 'state favours BUY, signal is SELL' } },
  { SWING_TRADE: { tf: '15m', tradeable: false } }, 2000)
  const [r] = loadJournal(f)
  assert.equal(r.state, 'REFUSED')
  assert(r.wouldBe && r.wouldBe.entry === 4380 && r.wouldBe.stop === 4390 && r.wouldBe.target === 4375,
    'the refused plan must be recorded so the gate can be judged on money, not on count')
  assert(!('entry' in r) && !('stop' in r) && !('target' in r),
    'the plan must stay NESTED — a top-level entry would let a refusal be read as a trade')
})
ok('a suppressed tier is recorded but flagged shadow:true', () => {
  const f = tmp()
  recordSignals(f, { scalp: { t: 1000, side: 'BUY', entry: 100, stop: 98, target: 105 } }, STATS, 2000)
  assert.equal(loadJournal(f)[0].shadow, true)
})

ok('LOOK-AHEAD: the bar a trade was recorded on can never fill or resolve it', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  // this bar IS the record bar and it touches entry, stop and target — it must do nothing
  resolveOpen(f, [bar(2000, 100, 120, 80, 100)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'PENDING'); assert.equal(r.filledAt, undefined)
})
ok('fills a limit at the wick tip, on a later bar', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 103, 104, 99, 103)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'OPEN'); assert.equal(r.fillPrice, 100)
})
ok('PESSIMISM: a bar OPENING beyond the limit gives NO price improvement (recorded, not credited)', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 95, 96, 94, 95)])   // opens $5 below the $100 limit
  const [r] = loadJournal(f)
  assert.equal(r.fillPrice, 100, 'must fill AT the limit, never better')
  assert.equal(r.entrySlippage, 0, 'no favourable slippage may ever be credited')
  assert.equal(r.openBeyondLimit, 5, 'the gap is recorded for transparency')
})
ok('STOP BEFORE TARGET: a bar containing both is a LOSS', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 101, 120, 85, 110)])  // fills, then hits both
  const [r] = loadJournal(f)
  assert.equal(r.state, 'STOPPED'); assert.equal(r.win, false)
})
ok('PESSIMISM: a gap THROUGH the stop is charged at the open, not at the stop', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 100, 101, 99.5, 100), bar(2000 + 2 * H, 85, 86, 84, 85)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'STOPPED')
  assert.equal(r.exitPrice, 85, 'gapped through the $90 stop → filled at the $85 open')
  assert.equal(r.exitSlippage, 5, 'the extra $5 loss is charged')
  assert.equal(r.pnl, -15, 'loss is the REAL fill, not the intended stop')
})
ok('a clean target hit pays exactly the target, no slippage', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 100, 101, 99.5, 100), bar(2000 + 2 * H, 110, 116, 109, 115)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'TARGET'); assert.equal(r.win, true); assert.equal(r.pnl, 15); assert.equal(r.exitSlippage, 0)
})
ok('an untagged limit EXPIRES after the fill window and never becomes a trade', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  // fill window is 8 bars of the ENTRY TIMEFRAME (parity with the validators — fill_window_parity.json measured
  // the old flat-24h window admitting late fills at 80.1% vs 85.2% WR on 15m and expiring good 4H fills)
  const tf = loadJournal(f)[0].tf, tfMsMap = { '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000, '4h': 14400000 }
  const far = 1000 + PAPER_PARAMS.fillWindowBarsTf * (tfMsMap[tf] ?? 3600000) + H
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(far, 105, 106, 104, 105)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'EXPIRED'); assert.equal(r.win, undefined)
})
ok('the fill window scales with the entry timeframe — a 4H signal is NOT expired at a 15m book\'s horizon', () => {
  const f = tmp()
  recordSignals(f, { h4Struct: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 115, atr: 10, reasons: [] } },
    { H4_STRUCT: { tf: '4h', tradeable: true, paperOnly: true } }, 2000)
  // 5h after the signal: far beyond 8×15m bars, comfortably inside 8×4H bars — must still be PENDING-fillable
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(1000 + 5 * 3600000, 105, 106, 99, 100)])
  const [r] = loadJournal(f)
  assert.equal(r.state === 'EXPIRED', false)
})
ok('SELL side mirrors exactly (fill at limit, stop-first, gap charged)', () => {
  const f = tmp()
  recordSignals(f, { sweepDivergence: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 85, atr: 10, reasons: [] } }, STATS, 2000)
  resolveOpen(f, [bar(2000, 95, 96, 94, 95), bar(2000 + H, 105, 106, 99, 100), bar(2000 + 2 * H, 115, 116, 114, 115)])
  const [r] = loadJournal(f)
  assert.equal(r.fillPrice, 100); assert.equal(r.state, 'STOPPED'); assert.equal(r.exitPrice, 115); assert.equal(r.pnl, -15)
})
ok('a corrupt journal line throws — never silently skipped', () => {
  const f = tmp()
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, '{"id":"a"}\nNOT JSON\n')
  assert.throws(() => loadJournal(f), /corrupt/)
})
ok('paperStats separates shadow tiers and states how many trades are still needed', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000)
  resolveOpen(f, [bar(2000, 105, 106, 104, 105), bar(2000 + H, 100, 101, 99.5, 100), bar(2000 + 2 * H, 110, 116, 109, 115)])
  const s = paperStats(f, STATS)
  assert.equal(s.SWEEP_DIVERGENCE.closed, 1); assert.equal(s.SWEEP_DIVERGENCE.live_wr, 1)
  assert.equal(s.SCALP.shadow, true)
  assert(s.SWEEP_DIVERGENCE.trades_needed_pm10pp > 50, 'must state the power requirement')
  assert.equal(s.SWEEP_DIVERGENCE.drift_alarm, false, 'n<10 must not raise a drift alarm')
})
ok('DRIFT ALARM fires when live and backtest intervals separate (and not before n=10)', () => {
  const f = tmp()
  // 12 losing trades against a backtest claiming 51.16%.
  // NOTE: bars must stay INSIDE the 24h fill window of each signal, or the trade expires instead of closing —
  // the first version spaced them 10 bars x i apart and silently expired the last two (10 == 12).
  for (let i = 0; i < 12; i++) {
    recordSignals(f, { sweepDivergence: { t: 1000 + i, side: 'BUY', entry: 100, stop: 90, target: 115, atr: 10, reasons: [] } }, STATS, 2000 + i)
    resolveOpen(f, [bar(3000 + i * 2 * H, 105, 106, 104, 105), bar(3000 + i * 2 * H + H, 100, 101, 89, 92)])
  }
  assert.equal(loadJournal(f).filter(r => r.state === 'EXPIRED').length, 0, 'fixture must not expire trades')
  const s = paperStats(f, STATS)
  assert.equal(s.SWEEP_DIVERGENCE.closed, 12)
  assert.equal(s.SWEEP_DIVERGENCE.live_wr, 0)
  assert.equal(s.SWEEP_DIVERGENCE.drift_alarm, true, '0% over 12 trades must alarm against a 51% claim')
})

// ── BREAK-EVEN management (2026-07-26): the +$0.32/trade the shipped SWING_TRADE earns and the un-managed EA left
// on the table. Once price moves +beTriggerR·risk favorable, the stop trails to entry+beLockR·risk; a reversal then
// SCRATCHES at a small profit instead of taking the full loss. This test proves the mechanism actually engages.
ok('🚨 BE ARMS + SCRATCHES: a managed trade that goes favorable then reverses exits at BE, NOT a full loss', () => {
  const f = tmp()
  // BUY entry 100, stop 90 (risk 10), target 115, BE arms at +0.5R (=105), locks +0.1R (=101)
  recordSignals(f, { swingTrade: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 115, atr: 10, reasons: [], beTriggerR: 0.5, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [
    bar(2000, 100, 100, 100, 100),          // fills at the 100 limit
    bar(2000 + H, 100, 106, 100, 106),      // reaches 106 → BE ARMS (past the 105 trigger)
    bar(2000 + 2 * H, 105, 105, 101, 102),  // reverses to 101 → BE stop (would NOT hit the 90 stop)
  ])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'SCRATCH', `expected SCRATCH, got ${r.state}`)
  assert.equal(r.win, null, 'a BE scratch is neither win nor loss')
  assert.equal(r.beApplied, true, 'beApplied must record that management engaged')
  assert(Math.abs(r.pnl - 1.0) < 0.01, `BE scratch should lock ~+$1 (0.1R), got ${r.pnl}`)  // +1, not −10
})
ok('un-managed (beTriggerR:0) does NOT scratch — the same reversal is not a BE exit', () => {
  const f = tmp()
  recordSignals(f, { swingTrade: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 115, atr: 10, reasons: [], beTriggerR: 0, beLockR: 0 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [
    bar(2000, 100, 100, 100, 100),
    bar(2000 + H, 100, 106, 100, 106),      // no BE to arm
    bar(2000 + 2 * H, 105, 105, 101, 102),  // 101 does NOT hit the real 90 stop → stays OPEN, no scratch
  ])
  const [r] = loadJournal(f)
  assert(r.state === 'OPEN', `unmanaged trade must not scratch at 101 (stop is 90); got ${r.state}`)
})

// ── 🚨 POST-FILL BE SEQUENCE (2026-09-06, caught LIVE on IMPULSE_CONT@1788525900000): the bar that ARMED break-even
// also CLOSED beyond the BE stop — the stop traded inside that bar, after the arm. The old loop armed at the end of
// the bar and charged the NEXT bar's open as a "gap through" the BE stop: −$14.15 on a $21 risk, labelled SCRATCH.
// 15 of 45 BE exits in the journal carried >$2 of that; hard stops 1/137. Fixed in the same units as the validator.
ok('🚨 BE SEQUENCE: the arming bar closes beyond the BE stop ⇒ SCRATCH at the BE stop in THAT bar, never at the next open', () => {
  const f = tmp()
  // SELL entry 100, stop 110 (risk 10), target 90; BE arms at −0.05R (99.5), locks +0.1R ⇒ BE stop 99
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 90, atr: 10, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [
    bar(2000, 100, 100, 100, 100),          // fills at the 100 limit
    bar(2000 + H, 100, 105, 99, 104),       // low 99 arms BE; close 104 is beyond the 99 BE stop ⇒ stop traded after the arm
    bar(2000 + 2 * H, 104, 106, 103, 105),  // the old rule charged THIS open (104) ⇒ −$4 "scratch"
  ])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'SCRATCH', `expected SCRATCH, got ${r.state}`)
  assert.equal(r.closedAt, 2000 + H, 'must close in the arming bar')
  assert(Math.abs(r.pnl - 1.0) < 0.01, `must exit at the BE stop (+$1 = 0.1R), got ${r.pnl}`)
  assert.equal(r.exitSlippage, 0, 'no manufactured slippage')
})
ok('BE SEQUENCE: a GENUINE inter-bar gap through the BE stop is still charged at the open (pessimism kept)', () => {
  const f = tmp()
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 90, atr: 10, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [
    bar(2000, 100, 100, 100, 100),
    bar(2000 + H, 100, 100.2, 99, 98.6),    // arms BE (low 99) and closes INSIDE (98.6 < 99) — the stop did not trade yet
    bar(2000 + 2 * H, 104, 106, 103, 105),  // opens 104: a real gap through 99 ⇒ charged at 104
  ])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'SCRATCH'); assert(Math.abs(r.pnl + 4) < 0.01, `gap must be charged (−$4), got ${r.pnl}`); assert(Math.abs(r.exitSlippage - 5) < 0.01)
})
{
  const m1 = (t, o, h, l, c) => ({ t, o, h, l, c, v: 1 })
  const idx = (mins) => (t, span) => mins.filter((m) => m.t >= t && m.t < t + span)
  ok('🚨 BE SEQUENCE (1m): a post-fill bar is replayed minute by minute — arm, then stop, in true order', () => {
    const f = tmp()
    recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 90, atr: 10, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
      { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    const b2 = 2000 + H
    const mins = [m1(b2, 100, 100, 99.8, 99.9), m1(b2 + 60000, 99.9, 99.9, 99.0, 99.2), m1(b2 + 120000, 99.3, 104, 99.2, 103)]  // minute 2 arms (99.5) AND reaches the 99.0 lock, closes back above it
    resolveOpen(f, [bar(2000, 100, 100, 100, 100), bar(b2, 100, 105, 99, 104)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'SCRATCH', `expected SCRATCH, got ${r.state}`)
    // 2026-09-14 (EA lock semantics): the lock RESTS the moment the market reaches it (minute 2 low 99.0) and that minute
    // closes back through it ⇒ the resting stop was hit inside minute 2 at 99.0 (+$1.0, slippage 0). Before this date the
    // stop went live only on the next minute and its 99.3 open was charged as a gap (+$0.7) — a stop the EA had resting
    // at 99.0 cannot be gapped by a minute that opened after it had already filled.
    assert(Math.abs(r.pnl - 1.0) < 0.01, `exit at the resting lock 99.0 (+$1.0), got ${r.pnl}`)
    assert.equal(r.exitSlippage, 0, 'no gap: the stop filled inside the minute it started resting')
  })
  ok('🚨 EA LOCK SEMANTICS (2026-09-14): a PHANTOM lock — armed at +0.05R, the market never reaches the +0.10R lock — is NOT a scratch: the original stop stays and is charged', () => {
    const f = tmp()
    recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 90, atr: 10, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
      { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    const b2 = 2000 + H
    const mins = [m1(b2, 100, 100, 99.8, 99.9), m1(b2 + 60000, 99.9, 99.9, 99.2, 99.4), m1(b2 + 120000, 99.5, 101, 99.4, 100.8)]   // arms at 99.2 (≤ 99.5), lock 99.0 never reached; then 101
    resolveOpen(f, [bar(2000, 100, 100, 100, 100), bar(b2, 100, 101, 99.2, 100.8)], undefined, { subBarsOf: idx(mins) })
    let [r] = loadJournal(f)
    assert.equal(r.state, 'OPEN', `a lock that could not rest is no exit — trade stays OPEN, got ${r.state} (pnl ${r.pnl})`)
    assert.equal(r.beApplied, true, 'BE armed (the trigger printed)')
    resolveOpen(f, [bar(2000, 100, 100, 100, 100), bar(b2, 100, 101, 99.2, 100.8), bar(b2 + H, 100.8, 110.5, 100.5, 110)], undefined, { subBarsOf: idx([...mins, m1(b2 + H, 100.8, 110.5, 100.5, 110)]) })
    ;[r] = loadJournal(f)
    assert.equal(r.state, 'STOPPED', `the ORIGINAL stop is charged, got ${r.state}`); assert(Math.abs(r.pnl + 10) < 0.01, `full −$10 loss, got ${r.pnl}`)
  })
  ok('EA LOCK SEMANTICS: a lock that RESTED (minute closed beyond it) and is then gapped at the next open is still charged at the open (pessimism kept)', () => {
    const f = tmp()
    recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 100, stop: 110, target: 90, atr: 10, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
      { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    const b2 = 2000 + H
    const mins = [m1(b2, 100, 100, 99.8, 99.9), m1(b2 + 60000, 99.9, 99.9, 98.8, 98.9), m1(b2 + 120000, 99.3, 104, 99.2, 103)]   // minute 2 rests the lock (closes 98.9 < 99.0); minute 3 opens 99.3 = a real gap
    resolveOpen(f, [bar(2000, 100, 100, 100, 100), bar(b2, 100, 105, 98.8, 104)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'SCRATCH'); assert(Math.abs(r.pnl - 0.7) < 0.01, `gap charged at the 99.3 open (+$0.7), got ${r.pnl}`); assert(Math.abs(r.exitSlippage - 0.3) < 0.01)
  })
  ok('🚨 LIVE CASE IMPULSE_CONT@1789378200000 (09-14): on the real minutes the EA scratches at the lock (+$1.40), not at a −$0.43 "gap"', () => {
    const f = tmp()
    recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 4289.32, stop: 4303.36, target: 4282.30, atr: 9.36, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
      { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    const b2 = 2000 + H, M = 60000   // the 10:15Z fill bar's minutes (polygon 1m): fill 10:18, arm + lock reached 10:19 (low 4287.86 ≤ 4287.916), close 4289.86 back above
    const mins = [m1(b2, 4288.19, 4288.94, 4287.32, 4287.35), m1(b2 + M, 4287.37, 4287.37, 4285.86, 4286.87), m1(b2 + 2 * M, 4286.87, 4287.77, 4286.35, 4287.4),
      m1(b2 + 3 * M, 4287.66, 4290, 4287.66, 4289.73), m1(b2 + 4 * M, 4290.06, 4290.73, 4287.86, 4289.86), m1(b2 + 5 * M, 4289.75, 4289.89, 4286.66, 4286.85)]
    // the signal bar's high is the limit itself in the live tape; here it sits one tick under so the fill lands on the 10:15Z bar's minutes as it did live
    resolveOpen(f, [bar(2000, 4287.6, 4289.30, 4279.09, 4281.21), bar(b2, 4288.19, 4292.46, 4285.73, 4291.03)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'SCRATCH', `got ${r.state}`); assert(Math.abs(r.pnl - 1.404) < 0.01, `+$1.404 at the lock 4287.916, got ${r.pnl}`); assert.equal(r.exitSlippage, 0)
    // trade-through at fill (2026-09-16): the fill minute 10:18 printed 4290.00 against the 4289.32 limit → $0.68 through, basis 'minute'
    assert.equal(r.fillThroughBasis, 'minute'); assert(Math.abs(r.fillThroughUsd - 0.68) < 0.001, `fill minute high 4290.00 − limit 4289.32 = 0.68, got ${r.fillThroughUsd}`)
  })
  ok('TRADE-THROUGH AT FILL: without minutes the fill BAR extreme is recorded (basis "bar"); a bar that only touches the limit reads 0', () => {
    const f = tmp()
    recordSignals(f, { swingTrade: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 110, atr: 10, reasons: [], beTriggerR: 0, beLockR: 0 } }, { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    resolveOpen(f, [bar(2000, 101, 102, 100, 101.5)])                       // low == limit: a touch, no trade-through
    let [r] = loadJournal(f); assert.equal(r.state, 'OPEN'); assert.equal(r.fillThroughBasis, 'bar'); assert.equal(r.fillThroughUsd, 0)
    const g = tmp()
    recordSignals(g, { swingTrade: { t: 1000, side: 'BUY', entry: 100, stop: 90, target: 110, atr: 10, reasons: [], beTriggerR: 0, beLockR: 0 } }, { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
    resolveOpen(g, [bar(2000, 101, 102, 99.3, 101.5)]);                     // traded 0.70 through the limit
    ;[r] = loadJournal(g); assert.equal(r.fillThroughUsd, 0.7); assert.equal(r.fillPrice, 100, 'the fill price is still the limit — no price improvement')
  })
}

// ── FILL-BAR SEQUENCE (2026-08-14, caught LIVE on SWING_TRADE@1786709700000): a SELL limit filled on a bar that
// OPENED AT ITS LOW below the target — the "target touch" traded BEFORE the fill, and the old loop credited a
// fictitious +$5.01 WIN while the real position was ~$9 underwater. OHLC cannot order intrabar prices, so the
// favorable side (target, MFE, BE-arm) is NEVER creditable on the fill bar; the stop stays fully charged.
ok('🚨 FILL-BAR SEQUENCE: target inside the fill bar is NOT credited (pre-fill range is not a win)', () => {
  const f = tmp()
  // SELL entry 4380, stop 4390, target 4375. Fill bar opens AT ITS LOW (4374, below target), rallies through the
  // limit, closes high — the exact live shape. Old rule: same-bar TARGET. Fixed rule: trade stays OPEN.
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 4380, stop: 4390, target: 4375, atr: 6, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [bar(2000, 4374, 4386, 4374, 4384)])   // o==l: the target price provably traded pre-fill
  const [r] = loadJournal(f)
  assert.equal(r.state, 'OPEN', `fill-bar target must not resolve; got ${r.state}`)
  assert.equal(r.fillPrice, 4380, 'the fill itself is real')
  assert(!r.beApplied, 'BE must not arm from fill-bar (pre-fill) range')
})
ok('FILL-BAR SEQUENCE: the STOP side still resolves on the fill bar (pessimistic both ways)', () => {
  const f = tmp()
  // Same SELL, but the fill bar also reaches the 4390 stop → charged in full, no benefit of the doubt.
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 4380, stop: 4390, target: 4375, atr: 6, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [bar(2000, 4374, 4391, 4374, 4388)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'STOPPED', `fill-bar stop must still charge the loss; got ${r.state}`)
})
ok('FILL-BAR SEQUENCE: target on the NEXT bar resolves normally', () => {
  const f = tmp()
  recordSignals(f, { swingTrade: { t: 1000, side: 'SELL', entry: 4380, stop: 4390, target: 4375, atr: 6, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } },
    { SWING_TRADE: { tf: '15m', tradeable: true } }, 1500)
  resolveOpen(f, [bar(2000, 4374, 4386, 4374, 4384), bar(2000 + H, 4384, 4384, 4374, 4376)])
  const [r] = loadJournal(f)
  assert.equal(r.state, 'TARGET', `next-bar target must resolve; got ${r.state}`)
  assert(Math.abs(r.pnl - 5) < 0.01, `SELL 4380→4375 = +$5, got ${r.pnl}`)
})

// ── 1m SUB-BAR PARITY (2026-08-16). The rule above is a FLOOR: it refuses the fill bar's favorable side entirely,
// which is safe but stricter than the validators, who replay that bar on its 1m sub-bars and DO credit a target
// that trades after the fill minute. A recorder stricter than its own validator biases the forward test DOWN — and
// the forward test is IMPULSE_CONT's only route to promotion. These tests pin BOTH halves: the live 2026-08-14
// shape must still be refused when the minutes prove the target came first, and a genuine post-fill reversal must
// now be credited. Same rule as core/seqResolver, so paper and backtest are in the same units.
{
  const m1 = (t, o, h, l, c) => ({ t, o, h, l, c, v: 1 })
  const idx = (mins) => (t, span) => mins.filter((m) => m.t >= t && m.t < t + span)
  const sellSig = { swingTrade: { t: 1000, side: 'SELL', entry: 4380, stop: 4390, target: 4375, atr: 6, reasons: [], beTriggerR: 0.05, beLockR: 0.1 } }
  const SW = { SWING_TRADE: { tf: '15m', tradeable: true } }

  ok('🚨 1m PARITY: the 2026-08-14 shape stays REFUSED when the minutes prove the target traded BEFORE the fill', () => {
    const f = tmp()
    recordSignals(f, sellSig, SW, 1500)
    // minute 0 prints the low 4374 (target) — BEFORE the SELL limit at 4380 is reached in minute 2. The target
    // touch is pre-fill and must not count; the position ends the bar still OPEN.
    const mins = [m1(2000, 4374, 4376, 4374, 4376), m1(2060, 4376, 4379, 4376, 4379), m1(2120, 4379, 4386, 4379, 4384)]
    resolveOpen(f, [bar(2000, 4374, 4386, 4374, 4384)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'OPEN', `pre-fill target must never resolve; got ${r.state}`)
    assert.equal(r.fillSequenced, true, 'the fill bar must be marked as sequenced when sub-bars were used')
  })
  ok('🚨 1m PARITY: a target that trades AFTER the fill minute IS credited (the win the floor rule was denying)', () => {
    const f = tmp()
    recordSignals(f, sellSig, SW, 1500)
    // minute 0 rallies through the 4380 limit (fill), minute 2 sells off to the 4375 target — true sequence, a win.
    // NOTE the minute lows stay ABOVE the BE arm (4379.5 = entry − 0.05R): the first draft of this test dipped to
    // 4379, armed break-even, and correctly came back a SCRATCH. The resolver was right and the scenario was wrong —
    // pinning a win requires a path that never arms BE, which is what a real runner looks like.
    const mins = [m1(2000, 4382, 4386, 4381, 4385), m1(2060, 4385, 4385, 4380, 4381), m1(2120, 4381, 4381, 4374, 4375)]
    resolveOpen(f, [bar(2000, 4382, 4386, 4374, 4375)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'TARGET', `post-fill target must resolve as a win; got ${r.state}`)
    assert(Math.abs(r.pnl - 5) < 0.01, `SELL 4380→4375 = +$5, got ${r.pnl}`)
  })
  ok('🚨 1m PARITY: the stop is still charged when the minutes show it hit first (pessimism survives the upgrade)', () => {
    const f = tmp()
    recordSignals(f, sellSig, SW, 1500)
    const mins = [m1(2000, 4382, 4386, 4381, 4385), m1(2060, 4385, 4391, 4385, 4390), m1(2120, 4390, 4390, 4374, 4375)]
    resolveOpen(f, [bar(2000, 4382, 4391, 4374, 4375)], undefined, { subBarsOf: idx(mins) })
    const [r] = loadJournal(f)
    assert.equal(r.state, 'STOPPED', `stop-first must charge the loss even though the target printed later; got ${r.state}`)
  })
  ok('🚨 1m PARITY: no sub-bars supplied ⇒ the pessimistic floor rule is unchanged (no silent behaviour shift)', () => {
    const f = tmp()
    recordSignals(f, sellSig, SW, 1500)
    resolveOpen(f, [bar(2000, 4382, 4386, 4374, 4375)])            // same bar as the winning case, no sub-bars
    const [r] = loadJournal(f)
    assert.equal(r.state, 'OPEN', `without sub-bars the fill bar must stay unresolved; got ${r.state}`)
    assert(!r.fillSequenced, 'fillSequenced must only be set when sub-bars were actually used')
  })
}
ok('READINESS STAMP (2026-09-26): with ctx.readiness every new row (fire AND refusal) carries {dens30, rv10, state}; without ctx the row is unchanged', () => {
  const f = tmp()
  recordSignals(f, sig(), STATS, 2000, { readiness: { dens30: 7, rv10: 2.31, state: 'WARM' } })
  recordSignals(f, sig({ t: 1001, blocked: true, blockedWhy: 'state favours BUY' }), STATS, 2001, { readiness: { dens30: 7, rv10: 2.31, state: 'WARM' } })
  const [a, b] = loadJournal(f)
  assert.deepEqual(a.readiness, { dens30: 7, rv10: 2.31, state: 'WARM' }); assert.equal(b.state, 'REFUSED'); assert.deepEqual(b.readiness, { dens30: 7, rv10: 2.31, state: 'WARM' })
  const g = tmp(); recordSignals(g, sig(), STATS, 2000); recordSignals(g, sig({ t: 1002 }), STATS, 2002, { readiness: null }); recordSignals(g, sig({ t: 1003 }), STATS, 2003, { readiness: { dens30: null } })
  for (const r of loadJournal(g)) assert(!('readiness' in r), 'no stamp without a usable reading — the row is byte-identical to before 2026-09-26')
  const h = tmp(); recordSignals(h, sig(), STATS, 2000, { readiness: { dens30: 54, rv10: 1.81, state: 'WARM', dens_rel: 1.8, dens_med1y: 30 } })
  assert.deepEqual(loadJournal(h)[0].readiness, { dens30: 54, rv10: 1.81, state: 'WARM', dens_rel: 1.8, dens_med1y: 30 }, 'the era-neutral reading (dens_rel, dens_med1y) rides with the stamp when present')
})

// ── BID/ASK PARITY (Ferrari Twin Turbo 2026-10-08): the paper trader and the validator's seqResolver must agree, bar for bar, when
// bars are BID and ask-side orders clear the measured spread. Same fixture through both; outcome AND P&L must match. ──
{
  const M15b = 900000, M1b = 60000, T = 1791000000000 - (1791000000000 % M15b), SP = 0.6, sp = () => SP
  const B = (t, o, h, l, c) => ({ t, o, h, l, c, v: 1 })
  const both = (side, entry, stop, target, bars, subs, spreadAt) => {
    const dir = side === 'BUY' ? 'UP' : 'DOWN'
    const sr = resolveManagedLimitSeq({ direction: dir, plan: { entry, sl: stop, tp: target }, ts_utc: new Date(T).toISOString() }, bars, new Map(bars.map((b, k) => [b.t, k])), mkSubs(subs),
      { fillWindow: 8, horizon: 64, beTriggerR: 0.05, beLockR: 0.10, tfMs: M15b, lockMode: 'traded', spreadAt })
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pba-')), 'trades.jsonl')
    fs.writeFileSync(file, JSON.stringify({ id: 'X@' + T, tier: 'IMPULSE_CONT', side, entry, stop, target, tf: '15m', t: T, recordedAtBar: T, beTriggerR: 0.05, beLockR: 0.10, state: 'PENDING' }) + '\n')
    resolveOpen(file, bars, undefined, { subBarsOf: mkSubs(subs), spreadAt })
    return { sr, pr: loadJournal(file)[0] }
  }
  const cls = { WIN: 'TARGET', LOSS: 'STOPPED', SCRATCH: 'SCRATCH', NOFILL: 'PENDING', TIME: 'TIMEOUT' }
  const subsOf = (bars) => bars.map((b) => B(b.t, b.o, b.h, b.l, b.c))   // one minute per bar = the intended path (copying a bar's range into all 15 minutes fabricates intrabar BE round-trips)
  ok('BID/ASK PARITY · SELL: target touched on the BID only — neither resolver credits it; through by the spread — both TARGET at the same P&L', () => {
    const near = [B(T, 100, 100, 100, 100), B(T + M15b, 100, 101.2, 100, 101), B(T + 2 * M15b, 101, 101, 99.5, 99.6), B(T + 3 * M15b, 99.6, 99.7, 99.5, 99.6)]
    const a = both('SELL', 101, 104, 99.5, near, subsOf(near), sp)
    assert.notEqual(a.sr.outcome, 'WIN'); assert.notEqual(a.pr.state, 'TARGET')
    const far = [B(T, 100, 100, 100, 100), B(T + M15b, 100, 101.2, 100, 101), B(T + 2 * M15b, 101, 101, 98.8, 98.9)]
    const b = both('SELL', 101, 104, 99.5, far, subsOf(far), sp)
    assert.equal(b.sr.outcome, 'WIN'); assert.equal(b.pr.state, 'TARGET'); assert.equal(b.pr.pnl, b.sr.grossMove)
  })
  ok('BID/ASK PARITY · BUY: the limit fills only when the ASK reaches it — both NOFILL on a bid touch, both fill on a through-move', () => {
    const touch = [B(T, 100, 100, 100, 100), B(T + M15b, 100, 100, 99, 99.5), B(T + 2 * M15b, 99.5, 99.6, 99.2, 99.4)]
    const a = both('BUY', 99, 96, 100.5, touch, subsOf(touch), sp)
    assert.equal(a.sr.outcome, 'NOFILL'); assert.equal(a.pr.state, 'PENDING')
    const thr = [B(T, 100, 100, 100, 100), B(T + M15b, 100, 100, 98.3, 98.5), B(T + 2 * M15b, 98.5, 101, 98.5, 100.8)]
    const b = both('BUY', 99, 96, 100.5, thr, subsOf(thr), sp)
    assert.equal(cls[b.sr.outcome], b.pr.state); assert.equal(b.pr.pnl, b.sr.grossMove)
  })
  ok('BID/ASK PARITY · SELL stop: the ASK reaches the stop (bid ≥ stop − spread) — both STOPPED at −risk; without spreadAt neither stops', () => {
    const bars = [B(T, 100, 100, 100, 100), B(T + M15b, 100, 101.2, 100, 101), B(T + 2 * M15b, 101, 103.5, 101, 103.4)]
    const a = both('SELL', 101, 104, 95, bars, subsOf(bars), sp)
    assert.equal(a.sr.outcome, 'LOSS'); assert.equal(a.pr.state, 'STOPPED'); assert.equal(a.pr.pnl, a.sr.grossMove)
    const n = both('SELL', 101, 104, 95, bars, subsOf(bars), null)
    assert.notEqual(n.sr.outcome, 'LOSS'); assert.notEqual(n.pr.state, 'STOPPED')
  })
}

ok('BID/ASK PARITY · PROPERTY: 300 seeded random continuous 1m paths × {spread 0.6, none} — paper trader ≡ seqResolver(seqAll) on every resolved trade (outcome AND P&L)', () => {
  const M15p = 900000, M1p = 60000, rnd = mulberry32(20261008), map = { WIN: 'TARGET', LOSS: 'STOPPED', SCRATCH: 'SCRATCH' }
  let compared = 0
  for (let n = 0; n < 300; n++) {
    const T = 1791000000000 - (1791000000000 % M15p) + n * 86400000, mins = []; let p = 100
    for (let k = 0; k < 15 * 30; k++) { const o = p, moves = [o]; for (let q = 0; q < 4; q++) moves.push(+(moves.at(-1) + (rnd() - 0.5) * 0.8).toFixed(2)); p = moves.at(-1); mins.push({ t: T + k * M1p, o, h: Math.max(...moves), l: Math.min(...moves), c: p, v: 1 }) }
    const bars = []; for (let k = 0; k < mins.length; k += 15) { const g = mins.slice(k, k + 15); bars.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map((x) => x.h)), l: Math.min(...g.map((x) => x.l)), c: g.at(-1).c, v: 15 }) }
    const side = rnd() < 0.5 ? 'BUY' : 'SELL', up = side === 'BUY', e = +(bars[0].c + (up ? -1 : 1) * rnd() * 1.5).toFixed(2), risk = +(1 + rnd() * 3).toFixed(2)
    const stop = up ? e - risk : e + risk, target = up ? e + 0.5 * risk : e - 0.5 * risk
    for (const spreadAt of [() => 0.6, null]) {
      const sr = resolveManagedLimitSeq({ direction: up ? 'UP' : 'DOWN', plan: { entry: e, sl: stop, tp: target }, ts_utc: new Date(T).toISOString() }, bars, new Map(bars.map((b, k) => [b.t, k])), mkSubs(mins),
        { fillWindow: PAPER_PARAMS.fillWindowBarsTf, horizon: PAPER_PARAMS.horizonBarsTf, beTriggerR: 0.05, beLockR: 0.10, tfMs: M15p, lockMode: 'traded', spreadAt, seqAll: true })
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pp-')), 't.jsonl')
      fs.writeFileSync(file, JSON.stringify({ id: 'p' + n, tier: 'IMPULSE_CONT', side, entry: e, stop, target, tf: '15m', t: T, recordedAtBar: T, beTriggerR: 0.05, beLockR: 0.10, state: 'PENDING' }) + '\n')
      resolveOpen(file, bars, undefined, { subBarsOf: mkSubs(mins), spreadAt }); const pr = loadJournal(file)[0]
      if (!map[sr.outcome] || !['TARGET', 'STOPPED', 'SCRATCH'].includes(pr.state)) { if (sr.outcome === 'NOFILL') assert(['PENDING', 'EXPIRED'].includes(pr.state), 'NOFILL vs ' + pr.state); continue }
      assert.equal(pr.state, map[sr.outcome], 'path ' + n + ' ' + side + ' spread ' + (spreadAt ? 0.6 : 0)); assert(Math.abs(pr.pnl - sr.grossMove) < 0.0015, 'path ' + n + ' pnl ' + pr.pnl + ' vs ' + sr.grossMove); compared++
    }
  }
  assert(compared >= 300, 'only ' + compared + ' resolved comparisons')
})

console.log(`\n${fail ? '✗' : '✅'} PAPER TRADER SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
