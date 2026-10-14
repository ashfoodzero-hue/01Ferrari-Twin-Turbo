// smoke_reconcile_plan.mjs — the "refresh after every restart" rule (src/core/reconcilePlan.js) on scenarios, + the reconcile state contract.
import assert from 'node:assert'
import { reconcilePlan, RECON } from '../src/core/reconcilePlan.js'
let n = 0; const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const H = 3600000, D = 86400000, now = Date.UTC(2026, 9, 14, 10, 0)
console.log('\n██ RECONCILE PLAN SMOKE ██')
ok('app start: waits 2 min for the stream refill, then runs once even if a run succeeded 1 h ago', () => {
  const st = { okAt: now - H, coveredTo: now - H }
  assert.equal(reconcilePlan({ now, startedAt: now - 60000, state: st, running: false, attemptedThisStart: false }).run, false)
  const p = reconcilePlan({ now, startedAt: now - RECON.startDelayMs, state: st, running: false, attemptedThisStart: false }); assert(p.run); assert.equal(p.why, 'app start') })
ok('window: ≥ 7 days; a 10-day shutdown → 17 days; capped at 30', () => {
  assert.equal(reconcilePlan({ now, startedAt: 0, state: { okAt: now - H, coveredTo: now - H }, attemptedThisStart: false }).days, 8)
  assert.equal(reconcilePlan({ now, startedAt: 0, state: { okAt: now - 10 * D, coveredTo: now - 10 * D }, attemptedThisStart: false }).days, 17)
  assert.equal(reconcilePlan({ now, startedAt: 0, state: { okAt: now - 60 * D, coveredTo: now - 60 * D }, attemptedThisStart: false }).days, 30)
  assert.equal(reconcilePlan({ now, startedAt: 0, state: null, attemptedThisStart: false }).days, 7) })
ok('failure → retry every 30 min until success (the 2026-10-14 DNS case)', () => {
  const st = { okAt: now - 30 * H, coveredTo: now - 30 * H, failedAt: now - 10 * H }
  assert.equal(reconcilePlan({ now, startedAt: 0, state: st, attemptedThisStart: true, lastAttemptAt: now - 10 * 60000 }).run, false)
  const p = reconcilePlan({ now, startedAt: 0, state: st, attemptedThisStart: true, lastAttemptAt: now - 31 * 60000 }); assert(p.run); assert.equal(p.why, 'retry after failure') })
ok('daily: any time of day once the last success is ≥ 20 h old (not only 00:20-00:59 UTC); never twice while running', () => {
  assert(reconcilePlan({ now, startedAt: 0, state: { okAt: now - 21 * H, coveredTo: now - 21 * H }, attemptedThisStart: true, lastAttemptAt: now - 21 * H }).run)
  assert.equal(reconcilePlan({ now, startedAt: 0, state: { okAt: now - 2 * H, coveredTo: now - 2 * H }, attemptedThisStart: true, lastAttemptAt: now - 2 * H }).run, false)
  assert.equal(reconcilePlan({ now, startedAt: 0, state: null, running: true, attemptedThisStart: false }).run, false) })
console.log(process.exitCode ? '✗ RECONCILE PLAN SMOKE FAILED' : `✅ RECONCILE PLAN SMOKE: ${n} passed, 0 failed`)
