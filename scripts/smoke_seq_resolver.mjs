// ════════════════════════════════════════════════════════════════════════════════
// smoke_seq_resolver.mjs — the sequenced fill-bar resolver proves it orders intrabar touches correctly.
// Born 2026-08-14 from the live fill-bar sequence bug (SWING_TRADE@1786709700000): a fictitious same-bar WIN
// credited from pre-fill range. These fixtures pin every branch: pre-fill target NOT credited, genuine
// post-fill V-reversal IS, stop always chargeable, no-coverage falls back pessimistic, BE arms in sequence.
// ════════════════════════════════════════════════════════════════════════════════
import assert from 'node:assert'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'

let pass = 0, fail = 0
const ok = (name, fn) => { try { fn(); console.log(`  ✓ ${name}`); pass++ } catch (e) { console.log(`  ✗ ${name}: ${e.message}`); fail++ } }

const M15 = 900000, M1 = 60000
const bar = (t, o, h, l, c) => ({ t, o, h, l, c, v: 1 })
const sig = (dir, entry, sl, tp, t) => ({ direction: dir, plan: { entry, sl, tp }, ts_utc: new Date(t).toISOString() })
const OPTS = { fillWindow: 8, horizon: 64, beTriggerR: 0.05, beLockR: 0.10, tfMs: M15 }
const T0 = 1786700000000 - (1786700000000 % M15)

// 15m frame: signal bar at T0, fill bar at T0+15m (the live bug shape: opens at its low 4374, below tp 4375.91,
// rallies through the 4380.92 SELL limit, closes 4384).
const bars15 = [bar(T0, 4370, 4372, 4368, 4371), bar(T0 + M15, 4374, 4386, 4374, 4384), bar(T0 + 2 * M15, 4384, 4385, 4374, 4376)]
const idx15 = new Map(bars15.map((b, k) => [b.t, k]))

ok('🚨 pre-fill target range is NOT a win (the live bug shape) — resolves on a LATER bar instead', () => {
  // sub-bars: minute 0 dips to the tp zone BEFORE the limit is touched; minute 5 rallies through the limit; no
  // return to tp inside the fill bar. Old resolver: same-bar WIN. Truth: resolves TARGET on the NEXT 15m bar.
  const subs = [bar(T0 + M15, 4374, 4375, 4374, 4375), bar(T0 + M15 + 5 * M1, 4376, 4382, 4376, 4381), bar(T0 + M15 + 9 * M1, 4381, 4386, 4381, 4384)]
  const r = resolveManagedLimitSeq(sig('DOWN', 4380.92, 4390.94, 4375.91, T0), bars15, idx15, makeSubBarIndex(subs), OPTS)
  assert.equal(r.seq, 'seq')
  assert.equal(r.outcome, 'WIN', `resolves on the bar AFTER the fill bar (low 4374 ≤ tp)`)
  assert(r.resolve_bars >= 1, `must NOT resolve on the fill bar (resolve_bars=${r.resolve_bars})`)
})
ok('a GENUINE V-reversal (entry touched, THEN target) IS credited on the fill bar', () => {
  // minute 1 stays ABOVE the BE-arm level (4380.42) so management does not engage; minute 2 collapses to the tp
  const subs = [bar(T0 + M15, 4376, 4382, 4376, 4381), bar(T0 + M15 + 5 * M1, 4381, 4386, 4381, 4382), bar(T0 + M15 + 9 * M1, 4382, 4382, 4374, 4375)]
  const r = resolveManagedLimitSeq(sig('DOWN', 4380.92, 4390.94, 4375.91, T0), bars15, idx15, makeSubBarIndex(subs), OPTS)
  assert.equal(r.outcome, 'WIN'); assert.equal(r.resolve_bars, 0, 'true same-bar win must be credited')
})
ok('the fill sub-bar itself never credits the target (residual 1m ambiguity stays pessimistic)', () => {
  // one sub-bar spans limit AND target — cannot order them even at 1m → no credit on that sub-bar
  const subs = [bar(T0 + M15, 4376, 4386, 4374, 4384)]
  const r = resolveManagedLimitSeq(sig('DOWN', 4380.92, 4390.94, 4375.91, T0), bars15, idx15, makeSubBarIndex(subs), OPTS)
  assert(r.resolve_bars >= 1, `fill sub-bar tp must not resolve; got resolve_bars=${r.resolve_bars}`)
})
ok('stop is chargeable on the fill sub-bar (pessimistic both ways)', () => {
  const subs = [bar(T0 + M15, 4376, 4391.5, 4376, 4388)]   // one minute spans limit AND stop
  const r = resolveManagedLimitSeq(sig('DOWN', 4380.92, 4390.94, 4375.91, T0), bars15, idx15, makeSubBarIndex(subs), OPTS)
  assert.equal(r.outcome, 'LOSS'); assert.equal(r.resolve_bars, 0)
})
ok('no sub-bar coverage → pessimistic fallback (no fill-bar tp; stop still charged), flagged seq:pessimistic', () => {
  const r = resolveManagedLimitSeq(sig('DOWN', 4380.92, 4390.94, 4375.91, T0), bars15, idx15, makeSubBarIndex([]), OPTS)
  assert.equal(r.seq, 'pessimistic')
  assert(r.resolve_bars >= 1, 'tp resolves only from the next bar under the fallback')
})
ok('BE arms from a post-fill sub-bar in sequence, and a reversal then SCRATCHES at the lock', () => {
  // BUY 100, sl 90 (risk 10), tp 115. Fill minute touches 100; next minute reaches 100.6 (arms +0.05R=100.5);
  // NEXT 15m bar falls to the 101→ wait, lock = 100+0.10*10=101 → bar low 100.9 hits it → SCRATCH.
  const b15 = [bar(T0, 101, 102, 100.8, 101.5), bar(T0 + M15, 100.9, 100.7 + 0.5, 99.8, 100.4), bar(T0 + 2 * M15, 100.4, 100.9, 96, 97)]
  // note: fill bar h must cover sub-bar highs: use consistent numbers
  b15[1] = bar(T0 + M15, 100.9, 100.9, 99.8, 100.6)
  const i15 = new Map(b15.map((b, k) => [b.t, k]))
  const subs = [bar(T0 + M15, 100.9, 100.9, 100.0, 100.2), bar(T0 + M15 + 3 * M1, 100.2, 100.9, 100.1, 100.8)]
  const r = resolveManagedLimitSeq(sig('UP', 100, 90, 115, T0), b15, i15, makeSubBarIndex(subs), { ...OPTS, beTriggerR: 0.05, beLockR: 0.10 })
  assert.equal(r.outcome, 'SCRATCH', `expected SCRATCH via sub-bar-armed BE, got ${r.outcome}`)
  assert.equal(r.beArmed, true)
})

// ── LOCK MODE (2026-09-14): the shipped geometry arms at +0.05R and locks at +0.10R — deeper than the trigger. Live case
// IMPULSE_CONT@1789378200000 (SELL 4289.32, sl 4303.36, tp 4282.30): the 15m fill bar 10:15Z replayed on its minutes.
{
  const E = 4289.32, SL = 4303.36, TP = 4282.30            // risk 14.04 · beArm 4288.618 · beStop 4287.916
  const T1 = T0 + M15
  const b15 = (extra) => [bar(T0, 4287, 4288, 4280, 4287.68), bar(T1, 4288.19, 4292.46, 4285.73, 4291.03), ...extra]
  const flat = (from) => Array.from({ length: 15 - from }, (_, q) => bar(T1 + (from + q) * M1, 4290.5, 4291.5, 4290.2, 4291))
  const subsA = [bar(T1, 4288.19, 4288.94, 4287.32, 4287.35), bar(T1 + M1, 4287.4, 4290.0, 4287.66, 4289.7),   // m1 = the fill minute
    bar(T1 + 2 * M1, 4289.7, 4289.9, 4288.5, 4289.0),                                                             // arms (4288.5 ≤ 4288.618) — never trades through the lock (> 4287.916)
    bar(T1 + 3 * M1, 4289.0, 4290.5, 4288.9, 4290.2), ...flat(4)]
  const subsB = [subsA[0], subsA[1], bar(T1 + 2 * M1, 4289.7, 4289.8, 4287.5, 4287.8),                              // arms AND trades through the lock, closes below it (stop rests)
    bar(T1 + 3 * M1, 4287.8, 4288.5, 4287.7, 4288.3), ...flat(4)]                                                  // returns to the lock → genuine BE hit
  const later = [bar(T0 + 2 * M15, 4291, 4304, 4290, 4300)]                                                        // the original stop trades on the next 15m bar
  const run = (subs, mode) => { const b = b15(later); return resolveManagedLimitSeq(sig('DOWN', E, SL, TP, T0), b, new Map(b.map((x, k) => [x.t, k])), makeSubBarIndex(subs), mode ? { ...OPTS, lockMode: mode } : OPTS) }
  ok('PHANTOM LOCK: the market only showed +0.05R — level pays the lock (+0.1R), traded keeps the original stop and LOSES on the next bar, arm closes at +0.05R', () => {
    const lv = run(subsA, 'level'), tr = run(subsA, 'traded'), ar = run(subsA, 'arm')
    assert.equal(lv.outcome, 'SCRATCH'); assert.equal(lv.grossMove, +(E - 4287.916).toFixed(4), 'level pays the lock')
    assert.equal(tr.outcome, 'LOSS', 'traded: the lock never rested (price never traded through it) → the original stop is charged'); assert.equal(tr.lockActive, false); assert.equal(tr.beArmed, true)
    assert.equal(ar.outcome, 'SCRATCH'); assert.equal(ar.grossMove, +(E - 4288.618).toFixed(4), 'arm pays the arm level') })
  ok('GENUINE LOCK: the market traded through the lock and came back — level and traded both pay the lock', () => {
    const lv = run(subsB, 'level'), tr = run(subsB, 'traded')
    assert.equal(lv.outcome, 'SCRATCH'); assert.equal(tr.outcome, 'SCRATCH'); assert.equal(tr.lockActive, true)
    assert.equal(lv.grossMove, tr.grossMove); assert.equal(tr.grossMove, +(E - 4287.916).toFixed(4)) })
  ok('DEFAULT = level, byte-for-byte (the shipped artifacts do not move): no lockMode ≡ lockMode:level', () => {
    for (const subs of [subsA, subsB]) { const d = run(subs, null), l = run(subs, 'level'); assert.deepEqual(d, l) }
    assert.equal(run(subsA, null).lockMode, 'level') })
  ok('an unknown lockMode throws (never a silent default)', () => assert.throws(() => run(subsA, 'magic'), /unknown lockMode/))
  ok('FILL-THROUGH (2026-09-15): the limit is credited only once the touch extends the margin beyond it — limit 4289.32: $3.00 still fills on the fill bar (high 4292.46), $3.50 defers the fill to the next bar (high 4304), $15 never fills (NOFILL); 0 ≡ the base rule', () => {
    const b = b15(later), idx = new Map(b.map((x, k) => [x.t, k])), go = (m) => resolveManagedLimitSeq(sig('DOWN', E, SL, TP, T0), b, idx, makeSubBarIndex(subsB), { ...OPTS, lockMode: 'traded', fillThroughUsd: m })
    assert.equal(go(3.0).fill_bars, 1, 'fills on the fill bar'); assert.equal(go(3.0).entry, E, 'the fill price stays the limit'); assert.equal(go(3.5).fill_bars, 2, 'the fill moves to the bar that trades through'); assert.equal(go(15).outcome, 'NOFILL')
    assert.deepEqual(go(0), run(subsB, 'traded'), 'margin 0 ≡ the base rule'); assert.throws(() => go(-0.1), /fillThroughUsd/) })
  ok('REST MARGIN (2026-09-15): with a broker stop distance the lock rests only once price is past it by that much — subsB trades 0.416 through: margin 0.3 rests (SCRATCH), margin 0.5 does not (the original stop, LOSS)', () => {
    const b = b15(later), idx = new Map(b.map((x, k) => [x.t, k])), go = (m) => resolveManagedLimitSeq(sig('DOWN', E, SL, TP, T0), b, idx, makeSubBarIndex(subsB), { ...OPTS, lockMode: 'traded', lockRestMarginUsd: m })
    assert.equal(go(0.3).outcome, 'SCRATCH'); assert.equal(go(0.3).lockActive, true)
    assert.equal(go(0.5).outcome, 'LOSS'); assert.equal(go(0.5).lockActive, false)
    assert.deepEqual(go(0), run(subsB, 'traded'), 'margin 0 ≡ the base traded rule'); assert.throws(() => go(-1), /lockRestMarginUsd/) })
}

// ── BID/ASK mode (Ferrari Twin Turbo 2026-10-08): bars are BID; ask-side orders must clear the spread ──
{
  const S = 0.6, sp = () => S, none = makeSubBarIndex([])
  const B = (rows) => { const bs = rows.map((r, k) => bar(T0 + k * M15, ...r)); return { bs, ix: new Map(bs.map((b, k) => [b.t, k])) } }
  ok('BID/ASK: spreadAt null is byte-identical to the default', () => {
    const { bs, ix } = B([[100, 100, 100, 100], [100, 100.2, 98.9, 99], [99, 103, 99, 102]])
    assert.deepEqual(resolveManagedLimitSeq(sig('UP', 99, 96, 100.5, T0), bs, ix, none, OPTS), resolveManagedLimitSeq(sig('UP', 99, 96, 100.5, T0), bs, ix, none, { ...OPTS, spreadAt: null }))
  })
  ok('BID/ASK: a BUY limit fills only when the ASK reaches it (bid ≤ entry − spread)', () => {
    const touch = B([[100, 100, 100, 100], [100, 100, 99, 99.5], [99.5, 99.6, 99.2, 99.4]])
    assert.equal(resolveManagedLimitSeq(sig('UP', 99, 96, 100.5, T0), touch.bs, touch.ix, none, { ...OPTS, spreadAt: sp }).outcome, 'NOFILL')
    const through = B([[100, 100, 100, 100], [100, 100, 98.4, 98.5], [98.5, 101, 98.5, 100.8]])
    const r = resolveManagedLimitSeq(sig('UP', 99, 96, 100.5, T0), through.bs, through.ix, none, { ...OPTS, spreadAt: sp })
    assert.equal(r.outcome, 'WIN'); assert.equal(r.grossMove, 1.5); assert.equal(r.bidAsk, true)
  })
  ok('BID/ASK: a SELL target needs the ASK at the target (bid ≤ tp − spread) — a bid touch alone is not a win', () => {
    const touch = B([[100, 100, 100, 100], [100, 101.2, 100, 101], [101, 101, 99.5, 99.6], [99.6, 99.7, 99.5, 99.6]])
    assert.notEqual(resolveManagedLimitSeq(sig('DOWN', 101, 104, 99.5, T0), touch.bs, touch.ix, none, { ...OPTS, spreadAt: sp, beTriggerR: 0 }).outcome, 'WIN')
    const through = B([[100, 100, 100, 100], [100, 101.2, 100, 101], [101, 101, 98.8, 98.9]])
    const r2 = resolveManagedLimitSeq(sig('DOWN', 101, 104, 99.5, T0), through.bs, through.ix, none, { ...OPTS, spreadAt: sp, beTriggerR: 0 })
    assert.equal(r2.outcome, 'WIN'); assert.equal(r2.grossMove, 1.5)
  })
  ok('BID/ASK: a SELL stop fires when the ASK reaches it (bid ≥ sl − spread)', () => {
    const b = B([[100, 100, 100, 100], [100, 101.2, 100, 101], [101, 103.5, 101, 103.4]])
    const r = resolveManagedLimitSeq(sig('DOWN', 101, 104, 99.5, T0), b.bs, b.ix, none, { ...OPTS, spreadAt: sp, beTriggerR: 0 })
    assert.equal(r.outcome, 'LOSS'); assert.equal(r.grossMove, -3)
    assert.equal(resolveManagedLimitSeq(sig('DOWN', 101, 104, 99.5, T0), b.bs, b.ix, none, { ...OPTS, beTriggerR: 0, horizon: 1 }).outcome, 'TIME', 'without the spread the bid never reaches 104')
  })
  ok('BID/ASK: a SELL time exit buys back at the ASK close; a negative spread throws', () => {
    const b = B([[100, 100, 100, 100], [100, 101.2, 100, 101], [101, 101.5, 100.2, 100.5]])
    const r = resolveManagedLimitSeq(sig('DOWN', 101, 104, 95, T0), b.bs, b.ix, none, { ...OPTS, spreadAt: sp, beTriggerR: 0, horizon: 1 })
    assert.equal(r.outcome, 'TIME'); assert.equal(r.grossMove, +(101 - (100.5 + 0.6)).toFixed(4))
    assert.throws(() => resolveManagedLimitSeq(sig('DOWN', 101, 104, 95, T0), b.bs, b.ix, none, { ...OPTS, spreadAt: () => -1 }), /spread/)
  })
}

console.log(`\n${fail ? '✗' : '✅'} SEQ RESOLVER SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
