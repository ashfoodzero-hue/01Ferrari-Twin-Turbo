// smoke_paper_review.mjs — Ferrari Twin Turbo: paperReview.js vocabulary + review mechanics (fixture tests carried from Turbo2 smoke_promotion_review.mjs).
// Origin: the review recognised scratches only as "STOPPED pnl≥0" and lost every state:'SCRATCH' row —
// IMPULSE_CONT read "2 resolved" with 9 completed trades, and a −0.67R "scratch" could never be seen.
import assert from 'node:assert'
import fs from 'node:fs'
import { classifyFire, isResolved, isFire, anomalyOf, onTrackTest, reviewTier, sequentialFires, SCRATCH_ANOMALY_R, PROMOTION_MIN_FIRES, subBookReview, DENSE_GATE, isDense } from '../src/master/paperReview.js'

let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const row = (o) => ({ id: 'x', tier: 'IMPULSE_CONT', t: 1, entry: 100, risk: 10, ...o })

ok('VOCABULARY: both scratch representations are SCRATCH; TARGET=WIN; STOPPED<0=LOSS; TIMEOUT splits FLAT/LOSS; REFUSED/PENDING/OPEN = not resolved', () => {
  assert.equal(classifyFire(row({ state: 'SCRATCH', pnl: 1 })), 'SCRATCH')
  assert.equal(classifyFire(row({ state: 'STOPPED', pnl: 0.5 })), 'SCRATCH')
  assert.equal(classifyFire(row({ state: 'STOPPED', pnl: -10 })), 'LOSS')
  assert.equal(classifyFire(row({ state: 'TARGET', pnl: 5 })), 'WIN')
  assert.equal(classifyFire(row({ state: 'TIMEOUT', pnl: 0.2 })), 'FLAT'); assert.equal(classifyFire(row({ state: 'TIMEOUT', pnl: -0.2 })), 'LOSS')
  for (const s of ['REFUSED', 'PENDING', 'OPEN', 'EXPIRED']) assert.equal(classifyFire(row({ state: s })), null, s)
  assert.equal(isResolved(row({ state: 'SCRATCH', pnl: 1 })), true)
})
ok('ANOMALY GUARD: the 09-08 shape (SCRATCH at −0.67R) is flagged; a normal scratch and a normal loss are not', () => {
  assert(anomalyOf(row({ state: 'SCRATCH', pnl: -14.15, risk: 21.22 })).includes('exit path'))
  assert.equal(anomalyOf(row({ state: 'SCRATCH', pnl: 0.7, risk: 21.22 })), null)
  assert.equal(anomalyOf(row({ state: 'STOPPED', pnl: -21.22, risk: 21.22 })), null)
  assert(anomalyOf(row({ state: 'TARGET', pnl: -1, risk: 10 })).includes('negative'))
  assert.equal(SCRATCH_ANOMALY_R, -0.25)
})
const OUT = { p_win: 0.1959, p_scratch: 0.7338, p_loss: 0.0703 }, GEO = { tgt_r: 0.5, be_lock_r: 0.1 }
ok('ON-TRACK TEST: a run at the artifact\'s expectation scores p≈0.5; a run far below scores p<0.05; deterministic', () => {
  const taken = Array.from({ length: 30 }, (_, i) => row({ id: 'r' + i, state: 'SCRATCH', risk: 10, pnl: 0 }))
  const exp = onTrackTest(taken, OUT, GEO).expected
  const atExp = onTrackTest(taken.map((r) => ({ ...r, pnl: exp / 30 })), OUT, GEO)
  assert(atExp.p > 0.3 && atExp.p < 0.7, 'p at expectation ' + atExp.p)
  const bad = onTrackTest(taken.map((r) => ({ ...r, pnl: -3 })), OUT, GEO)
  assert(bad.p < 0.05, 'p for −$90 over 30 trades ' + bad.p)
  assert.equal(onTrackTest(taken, OUT, GEO).p, onTrackTest(taken, OUT, GEO).p, 'seeded ⇒ deterministic')
  assert.equal(onTrackTest(taken.slice(0, 2), OUT, GEO).p, null, 'n<3 ⇒ no test')
})
ok('reviewTier counts SCRATCH as RESOLVED (progress), reports shares, anomalies and corrected P&L', () => {
  const rows = [row({ id: 'a', state: 'TARGET', pnl: 8.1 }), row({ id: 'b', state: 'SCRATCH', pnl: 1 }), row({ id: 'c', state: 'SCRATCH', pnl: -14.15, risk: 21.22 }), row({ id: 'd', state: 'STOPPED', pnl: -10 }), row({ id: 'e', state: 'EXPIRED' }), row({ id: 'f', state: 'REFUSED' }), row({ id: 'g', tier: 'OTHER', state: 'TARGET', pnl: 1 })]
  const v = reviewTier(rows, 'IMPULSE_CONT', { outcomes: OUT, geometry: GEO }, { minFires: 50, corrected: new Map([['c', 0.7]]) })
  assert.equal(v.fires, 5); assert.equal(v.resolved, 4); assert.equal(v.W, 1); assert.equal(v.SC, 2); assert.equal(v.L, 1); assert.equal(v.progress, '4/50')
  assert.equal(v.anomalies.length, 1); assert(Math.abs(v.pnlJournal - (-15.05)) < 0.01); assert(Math.abs(v.pnlCorrected - (-0.2)) < 0.01)
  assert(v.onTrack.p != null && v.onTrackCorrected.p >= v.onTrack.p, 'the corrected run must not test worse than the journal run')
})
// THE VALIDATOR'S COUNTING RULE (2026-09-09): one trade at a time; a no-fill never blocks; an unresolved trade blocks until it ends
ok('sequentialFires: a fire that opens while an earlier one is still live is OVERLAPPED (skipped); no-fills never block; pending blocks', () => {
  const H = 3600e3, T = Date.parse('2026-09-01T10:00:00Z')
  const rows = [
    { tier: 'X', t: T, state: 'SCRATCH', entry: 1, filledAt: T + 900e3, closedAt: T + 3 * H, pnl: 0.5 },   // accepted, busy until T+3h
    { tier: 'X', t: T + 1 * H, state: 'TARGET', entry: 1, filledAt: T + H, closedAt: T + 2 * H, pnl: 5 },  // OVERLAPS → skipped
    { tier: 'X', t: T + 4 * H, state: 'EXPIRED', entry: 1 },                                              // accepted as a signal, no fill → never blocks
    { tier: 'X', t: T + 4.25 * H, state: 'STOPPED', entry: 1, filledAt: T + 4.5 * H, closedAt: T + 5 * H, pnl: -5 },  // accepted (expired did not block)
    { tier: 'X', t: T + 6 * H, state: 'PENDING', entry: 1 },                                              // accepted, blocks everything after
    { tier: 'X', t: T + 7 * H, state: 'TARGET', entry: 1, filledAt: T + 7 * H, closedAt: T + 8 * H, pnl: 5 },   // OVERLAPS the pending → skipped
    { tier: 'Y', t: T + 7 * H, state: 'TARGET', entry: 1, filledAt: T + 7 * H, closedAt: T + 8 * H, pnl: 5 },   // other tier — ignored
    { tier: 'X', t: T + 9 * H, state: 'REFUSED', why: 'x' }]
  const { accepted, overlapped } = sequentialFires(rows, 'X')
  assert.equal(accepted.length, 4); assert.equal(overlapped.length, 2)
  assert.deepEqual(accepted.map((r) => r.state), ['SCRATCH', 'EXPIRED', 'STOPPED', 'PENDING'])
  const v = reviewTier(rows, 'X', null, { minFires: 3 })
  assert.equal(v.resolved, 4, 'raw resolved counts every journal row'); assert.equal(v.sequential.resolved, 2, 'sequential resolved counts the validator-equivalent series only')
  assert.equal(v.sequential.overlapped, 2); assert.equal(v.sequential.progress, '2/3'); assert.equal(v.ready, false, 'READY follows the sequential count, never the raw one')
  assert(v.sequential.onTrack && 'p' in v.sequential.onTrack, 'the on-track test must also be reported on the sequential series')
})
ok('isFire: not refused AND has an entry — refusals, entry-less rows and null are never fires', () => {
  assert.equal(isFire({ state: 'PENDING', entry: 4400 }), true)
  assert.equal(isFire({ state: 'SCRATCH', entry: 4400 }), true)
  assert.equal(isFire({ state: 'REFUSED', entry: 4400 }), false)
  assert.equal(isFire({ state: 'PENDING', entry: null }), false)
  assert.equal(isFire({ state: 'PENDING' }), false)
  assert.equal(isFire(null), false)
})
ok('CONTRACT: promotion_review imports the shared vocabulary and has no inline scratch heuristic', () => {
  const s = fs.readFileSync(new URL('./promotion_review.mjs', import.meta.url), 'utf8')
  assert(/from '\.\.\/src\/master\/paperReview\.js'/.test(s), 'promotion_review must import paperReview.js')
  assert(!/STOPPED'\s*&&\s*\(?r\.pnl/.test(s), 'inline scratch heuristic found in promotion_review')
  assert(/from '\.\.\/src\/master\/tierStats\.js'/.test(s), 'the review reads the ONE book from tierStats.js')
})
ok('DENSE SUB-BOOK (2026-09-26): reviewTier.subBooks.dense = the sequential series of stamped fires with dens30 ≥ 6, lane rule inside the dense stream only; unstamped rows are never dense; record-only', () => {
  assert.equal(DENSE_GATE, 1.5, 'era-neutral key: dens30 / trailing-1y median (an absolute count scales with the price level)')
  const H = 900000
  const rows = [row({ id: 'a', t: 0, state: 'TARGET', pnl: 8, closedAt: 2 * H, filledAt: H, readiness: { dens30: 54, rv10: 2.1, state: 'WARM', dens_rel: 1.8, dens_med1y: 30 } }),
    row({ id: 'b', t: 1 * H, state: 'STOPPED', pnl: -10, closedAt: 3 * H, filledAt: 2 * H, readiness: { dens30: 54, rv10: 2.1, state: 'WARM', dens_rel: 1.8, dens_med1y: 30 } }),   // overlaps a in the dense stream → skipped
    row({ id: 'c', t: 5 * H, state: 'SCRATCH', pnl: 1, closedAt: 7 * H, filledAt: 6 * H, readiness: { dens30: 20, rv10: 1.0, state: 'QUIET', dens_rel: 0.7, dens_med1y: 30 } }),  // not dense (below its own median)
    row({ id: 'd', t: 9 * H, state: 'TARGET', pnl: 6, closedAt: 11 * H, filledAt: 10 * H, readiness: { dens30: 40, rv10: 2.0, state: 'WARM' } }),                                  // absolute stamp only (no dens_rel) → unstamped for the sub-book
    row({ id: 'e', t: 12 * H, state: 'SCRATCH', pnl: 0.5, closedAt: 14 * H, filledAt: 13 * H, readiness: { dens30: 45, rv10: 2.6, state: 'HOT', dens_rel: 1.5, dens_med1y: 30 } }),
    row({ id: 'f', t: 15 * H, state: 'REFUSED', why: 'x', readiness: { dens30: 60, rv10: 3, state: 'HOT', dens_rel: 2.0, dens_med1y: 30 } })]
  assert(isDense(rows[0]) && !isDense(rows[2]) && !isDense(rows[3]) && isDense(rows[4]), 'dense = dens_rel ≥ 1.5; a large absolute dens30 without dens_rel is NOT dense')
  const d = subBookReview(rows, 'IMPULSE_CONT', { minFires: 50 })
  assert.equal(d.stamped, 4); assert.equal(d.unstamped, 1, 'd carries no dens_rel; the refusal is not a fire')
  assert.equal(d.fires, 2, 'a and e accepted; b overlapped a'); assert.equal(d.overlapped, 1); assert.equal(d.resolved, 2); assert.equal(d.W, 1); assert.equal(d.SC, 1); assert.equal(d.L, 0); assert.equal(d.progress, '2/50'); assert.equal(d.pnl, 8.5); assert.equal(d.record_only, true)
  const v = reviewTier(rows, 'IMPULSE_CONT', null, { minFires: 50 }); assert.deepEqual(v.subBooks.dense, d, 'reviewTier carries the same sub-book')
  assert.equal(v.sequential.fires, 4, 'the whole book\'s sequential series is untouched by the sub-book (a, c, d, e; b overlapped)')
})
console.log(process.exitCode ? '✗ PROMOTION-REVIEW SMOKE FAILED' : `✅ PROMOTION-REVIEW SMOKE: ${n} passed, 0 failed`)
