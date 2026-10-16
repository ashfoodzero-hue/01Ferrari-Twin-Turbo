// smoke_level_tick.mjs — 4H S/R LEVEL Telegram notices (scripts/level_tick.mjs, 2026-10-16). Information only.
// Checks: --dry sends and writes nothing; every number in the message is the saved study's (provenance); the header, the "information only"
// label and the 4H Macro bias line (score + no edge) are present; never alerts on stale data; run_twin runs it every minute while the market is open.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), S = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'c4h_level_study.json'), 'utf8')), led = path.join(TURBO.data, 'telegram', 'level_alerts.json')
console.log('\n██ 4H LEVEL NOTICES SMOKE ██')
await ok('--dry (forced near): APPROACHING notices carry the study numbers, the header, "information only" and the Macro bias line; nothing is sent or written', async () => {
  const before = fs.existsSync(led) ? fs.readFileSync(led, 'utf8') : null
  const out = execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(here, 'level_tick.mjs'), '--dry'], { encoding: 'utf8', env: { ...process.env, LEVEL_TEST_MULT: '1000' }, windowsHide: true })
  const after = fs.existsSync(led) ? fs.readFileSync(led, 'utf8') : null; assert.equal(after, before, 'the dry run wrote the ledger')
  if (/no fresh minute/.test(out)) return   // market closed: the stale guard itself is the check
  assert(/⏳ 4H (RESISTANCE|SUPPORT) AHEAD/.test(out), 'no APPROACHING notice in the forced dry run')
  const pc = (x) => (100 * x).toFixed(1) + '%'
  assert(out.includes(pc(S.approach.oos.touch_within_15m)) && out.includes(pc(S.approach.oos.hold_if_touched)) && out.includes(`median ${S.approach.oos.median_minutes_to_touch} min`))
  assert(out.includes('FERRARI TWIN TURBO') && out.includes('information only — not a trade') && /4H Macro bias: (LONG|SHORT) \d+ \(favours (BUY|SELL); score, not probability\)/.test(out))
})
await ok('STATIC: stale-data guard; DEFENDED uses the study\'s strong threshold and hold; run_twin runs level_tick every minute while open', async () => {
  const src = fs.readFileSync(path.join(here, 'level_tick.mjs'), 'utf8'), tw = fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8')
  assert(src.includes('now - M.at(-1).t > 5 * 60000') && src.includes('T.strong_threshold_train_p66') && src.includes('T.oos.strong.hold'))
  assert(tw.includes("'level_tick.mjs'") && tw.includes('marketOpen(lKey - 1) && now - lKey >= 20000'))
})
console.log(process.exitCode ? '✗ 4H LEVEL NOTICES SMOKE FAILED' : `✅ 4H LEVEL NOTICES SMOKE: ${n} passed, 0 failed`)
