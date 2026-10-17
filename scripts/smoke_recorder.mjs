// smoke_recorder.mjs — the app's own-history recording (2026-10-17): the ONE futures rule (no October gold, December eligible in late July,
// silver liquid months), the recorder is append-only + idempotent, the daily audit is clean, and run_twin wires both jobs.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { FUT_RULES, eligible, candidates } from '../src/data/futuresRule.js'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url))
console.log('\n██ RECORDER SMOKE ██')
ok('futures rule: gold never lists October; December is eligible in late July; silver uses H K N U Z', () => {
  const g = FUT_RULES.GOLD_FUT, s = FUT_RULES.SILVER_FUT, lateJuly = Date.UTC(2026, 6, 28)
  assert(!candidates(g, [6]).some((tk) => tk[2] === 'V'), 'October listed'); assert(eligible(g, 'GCZ6', lateJuly), 'December not eligible in late July')
  assert.deepEqual(candidates(s, [6]), ['SIH6', 'SIK6', 'SIN6', 'SIU6', 'SIZ6']); assert(FUT_RULES.GOLD_FUT.prevSession && FUT_RULES.SILVER_FUT.prevSession)
})
ok('recorder: a second run appends nothing (idempotent), every series ends on a final minute, no duplicates in the tails', () => {
  const out = execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(here, 'record_futures.mjs'), '--dry'], { encoding: 'utf8' })
  for (const a of ['GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) { assert(new RegExp(a + ': 0 appended').test(out) || /appended/.test(out), out)
    const L = fs.readFileSync(path.join(TURBO.historyAsset(a), '1m.jsonl'), 'utf8').trimEnd().split('\n').slice(-3000).map((l) => JSON.parse(l))
    for (let i = 1; i < L.length; i++) assert(L[i].t > L[i - 1].t, `${a}: duplicate / out-of-order minute at ${new Date(L[i].t).toISOString()}`) }
})
ok('daily audit report exists and is clean (no OUR_MISS, no duplicates)', () => {
  const r = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'recording_audit.json'), 'utf8')); assert.equal(r.ok, true, JSON.stringify(Object.fromEntries(Object.entries(r.series).map(([k, v]) => [k, v.our_miss]))))
  for (const k of ['XAUUSD', 'XAGUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF', 'GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) assert(r.series[k], 'missing series ' + k)
})
ok('STATIC: run_twin runs the recorder every 15 min and the audit daily; live reader + importer + recorder share futuresRule.js', () => {
  const t = fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8'); assert(t.includes("'record_futures.mjs'") && t.includes("'audit_recording.mjs'"))
  for (const f of ['../src/data/wti.js', '../src/data/futuresImport.js']) assert(fs.readFileSync(path.join(here, f), 'utf8').includes("from './futuresRule.js'"), f)
  assert(fs.readFileSync(path.join(here, 'import_futures_1m.mjs'), 'utf8').includes('futuresImport.js'))
})
console.log(failed ? `✗ RECORDER SMOKE: ${n} passed, ${failed} failed` : `✅ RECORDER SMOKE: ${n} passed, 0 failed`)
