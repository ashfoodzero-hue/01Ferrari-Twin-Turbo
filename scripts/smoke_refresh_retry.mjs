// smoke_refresh_retry.mjs — the retry rule for the hourly S/R + trendline refreshes (src/core/refreshRetry.js, 2026-10-29) and its wiring in run_twin.
import assert from 'node:assert'
import fs from 'node:fs'
import { makeRetry, RETRY } from '../src/core/refreshRetry.js'
let n = 0; const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const T = Date.parse('2026-10-29T15:09:00Z')
console.log('\n██ REFRESH RETRY SMOKE ██')
ok('the 10-29 case: S/R XAGUSD / DXY_ICE / DXY refused stale data at 15:08-15:09 → re-queued 5 min later, not at the next hour', () => {
  const r = makeRetry(); for (const s of ['XAGUSD', 'DXY_ICE', 'DXY']) r.done(`sr:${s}`, false, T); r.done('sr:WTI', true, T)
  assert.deepEqual(r.dueKeys(T + RETRY.afterMs - 1000), [])
  assert.deepEqual(r.dueKeys(T + RETRY.afterMs).sort(), ['sr:DXY', 'sr:DXY_ICE', 'sr:XAGUSD'])
  assert.deepEqual(r.dueKeys(T + 2 * RETRY.afterMs), [], 'a due key is handed out once')
})
ok('fails again → retried again; a success clears it for good', () => {
  const r = makeRetry(); r.done('tl:XAUUSD', false, T); r.dueKeys(T + RETRY.afterMs); r.done('tl:XAUUSD', false, T + RETRY.afterMs)
  assert.deepEqual(r.dueKeys(T + 2 * RETRY.afterMs), ['tl:XAUUSD']); r.done('tl:XAUUSD', true, T + 2 * RETRY.afterMs + 60000)
  assert.deepEqual(r.pending(), [])
})
ok('run_twin wires it: both queues report success / failure and due keys are re-queued', () => {
  const src = fs.readFileSync(new URL('./run_twin.mjs', import.meta.url), 'utf8')
  assert(src.includes("import { makeRetry } from '../src/core/refreshRetry.js'") && src.includes('const refreshRetry = makeRetry()'))
  assert(src.includes('refreshRetry.done(`sr:${s}`, !err, Date.now())') && src.includes('refreshRetry.done(`tl:${s}`, !err, Date.now())'))
  assert(src.includes('for (const k of refreshRetry.dueKeys(now))') && /kind === 'sr' && srRefreshing !== s && !srQueue\.includes\(s\)\) srQueue\.push\(s\)/.test(src))
})
ok('the fail-closed guard inside sr_refresh is untouched (stale newest minute → exit 2, nothing written)', () => {
  const s = fs.readFileSync(new URL('./sr_refresh.mjs', import.meta.url), 'utf8'); assert(s.includes('STALE, nothing written`); process.exit(2)'))
})
console.log(process.exitCode ? '✗ REFRESH RETRY SMOKE FAILED' : `✅ REFRESH RETRY SMOKE: ${n} passed, 0 failed`)
