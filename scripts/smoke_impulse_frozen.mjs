// smoke_impulse_frozen.mjs — THE BOOK REPRODUCES ITS FROZEN ARTIFACT (carried from Turbo2, 2026-09-09 origin).
// Runs the twin's copy of the validator on the tape truncated at the artifact's own stamp (TURBO_VAL_TO) and demands
// every shipped number back EXACTLY. Any change to the reader, the resolver, the world model, the candidate cache or
// the bad-print repair that moves a validated number fails here. ~1-2 min, 8 GB heap (23y 15m + 13y 1m from Turbo2's
// stores, read-only). The shipped artifact in data/master is never touched: the check writes its own file and deletes it.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
// The frozen artifact was computed on Polygon's RAW stamps, before the 2026-10-18 sourceQuirks fix (2020-11-15 → 12-31 New-York-local stamps).
// MEASURED: with raw stamps every number reproduces exactly; with the fix only TRAIN moves (net/t −0.1964 → −0.2977, per_day 0.3087 → 0.3097),
// OOS is unchanged. So this check replays the raw stamps — it certifies the code, not the corrected history (MASTER_DOCUMENT §7 (cl)).
process.env.TWIN_RAW_POLYGON_TIMES = '1'

let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url))
// 2026-10-08 (rev f): the book's artifact is the TWIN's own money-path gate on its Polygon 1m tape (impulse_cont_twin_gate.json); Turbo2's
// Dukascopy artifact is archived in _turbo2_frozen/ and its tape is no longer in this app. The env below reproduces the money path.
const SHIPPED = path.join(TURBO.master, 'impulse_cont_twin_gate.json')
const frozen = JSON.parse(fs.readFileSync(SHIPPED, 'utf8'))
const CHECK = '_impulse_cont_frozen_check.json'
const out = path.join(TURBO.master, CHECK)
fs.rmSync(out, { force: true })
console.log('\n██ IMPULSE_CONT FROZEN-ARTIFACT CHECK ██')
const t0 = Date.now()
const run = execFileSync(process.execPath, ['--max-old-space-size=8192', path.join(here, 'validate_impulse_cont_ship.mjs')],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000, env: { ...process.env, TURBO_SEQ_GATE: '1', TURBO_SEQ_ALL: frozen.resolution.seq_all ? '1' : '0', TURBO_LOCK_MODE: frozen.resolution.lock_mode, TURBO_BIDASK: frozen.resolution.bid_ask ? '1' : '0', TURBO_VAL_TO: frozen.tape_to, TURBO_VAL_OUT: CHECK } })
const secs = ((Date.now() - t0) / 1000).toFixed(0)
ok(`the validator runs on the tape truncated at the artifact's own tape end (${frozen.tape_to}) in ${secs}s and writes ONLY the check file`, () => {
  assert(/wrote data\/master\/_impulse_cont_frozen_check\.json/.test(run), run.slice(-300))
  assert.equal(JSON.parse(fs.readFileSync(SHIPPED, 'utf8')).at, frozen.at, 'the shipped artifact must be untouched by a check run') })
const check = JSON.parse(fs.readFileSync(out, 'utf8'))
const FIELDS = ['wr', 'lb', 'n', 'net_per_trade_oos', 'net_per_trade_train', 'net_per_trade_lb', 'net_per_trade_ub', 'avg_risk', 'per_day', 'per_year']
ok('every shipped number reproduces EXACTLY: ' + FIELDS.join(', '), () => {
  const diffs = FIELDS.filter((k) => check.shipped[k] !== frozen.shipped[k]).map((k) => `${k} ${frozen.shipped[k]} → ${check.shipped[k]}`)
  assert.equal(diffs.length, 0, 'DRIFT in the shipped book: ' + diffs.join(' · ')) })
ok('the OOS outcome table (n / win / scratch / loss and shares) reproduces exactly', () => assert.deepEqual(check.shipped.outcomes_oos, frozen.shipped.outcomes_oos))
ok('era R and the sequenced share reproduce exactly', () => { assert.deepEqual(check.shipped.era_r, frozen.shipped.era_r); assert.equal(check.sequenced_share, frozen.sequenced_share) })
ok('the gate verdict and its failed criteria reproduce exactly (whatever they are — the smoke pins the measurement, never a hoped-for SHIP)', () => {
  const p = check.seq_power || {}, f = frozen.seq_power || {}
  assert.equal(p.verdict, f.verdict, 'verdict ' + p.verdict + ' vs ' + f.verdict); assert.equal(p.verdict, frozen.verdict)
  assert.deepEqual(p.failed ?? [], f.failed ?? []); assert.deepEqual(p.criteria, f.criteria) })
ok('the bid/ask lookups were all MEASURED cells (no year-level fallback, no live minutes in a historical run)', () => assert.deepEqual(check.bid_ask?.lookups, frozen.bid_ask?.lookups))
fs.rmSync(out, { force: true })
console.log(`\n${process.exitCode ? '✗' : '✅'} FROZEN-ARTIFACT CHECK: ${n} passed`)
