// smoke_watchdog.mjs — the twin watchdog's decision (src/core/watchdogDecision.js) and its wiring (2026-10-08).
import assert from 'node:assert'
import fs from 'node:fs'
import { watchdogDecision, WATCHDOG } from '../src/core/watchdogDecision.js'
let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ WATCHDOG SMOKE ██')
const now = Date.parse('2026-10-08T19:00:00Z'), alive = () => true, dead = () => false, hb = (ageMs, pid = 1) => ({ at: new Date(now - ageMs).toISOString(), pid })
ok('healthy = own pid alive AND beat ≤ 3 min → do nothing', () => assert.equal(watchdogDecision({ hb: hb(60000), now, pidAlive: alive }).action, 'none'))
ok('a FRESH beat with a DEAD pid is a dead app (the reboot case) → start', () => assert.equal(watchdogDecision({ hb: hb(1000), now, pidAlive: dead }).action, 'start'))
ok('pid alive but beat stale (wedged) → start (the lock refuses a duplicate if it is in fact alive)', () => { const d = watchdogDecision({ hb: hb(WATCHDOG.maxBeatAgeMs + 1), now, pidAlive: alive }); assert.equal(d.action, 'start'); assert(/wedged/.test(d.why)) })
ok('no heartbeat file → start', () => assert.equal(watchdogDecision({ hb: null, now, pidAlive: dead }).action, 'start'))
ok('loop breaker: ≥ 3 restarts in the hour → HALT; a HALT marker → nothing until re-armed', () => {
  assert.equal(watchdogDecision({ hb: null, now, pidAlive: dead, recentRestarts: 3 }).action, 'halt')
  assert.equal(watchdogDecision({ hb: null, now, pidAlive: dead, halted: true }).action, 'none')
})
ok('STATIC: the watchdog never kills (no kill/taskkill/Stop-Process), spawns run_twin hidden + detached; the launcher runs it windowless', () => {
  const src = fs.readFileSync(new URL('../ops/watchdog_twin.mjs', import.meta.url), 'utf8')
  assert(!/\.kill\(|taskkill|Stop-Process/.test(src)); assert(/run_twin\.mjs/.test(src) && /windowsHide: true/.test(src) && /detached: true/.test(src))
  const vbs = fs.readFileSync(new URL('../ops/watchdog_launch.vbs', import.meta.url), 'utf8')
  const BS = String.fromCharCode(92)                                          // a backslash, without escape pitfalls
  assert(vbs.includes('C:' + BS + '01Ferrari Twin Turbo') && vbs.includes('ops' + BS + 'watchdog_twin.mjs') && vbs.includes('nodejs' + BS + 'node.exe') && /, 0, False/.test(vbs))
  assert(![...vbs].some((c) => c.charCodeAt(0) < 9), 'the launcher contains a control character (a mangled escape)')
})
console.log(process.exitCode ? '✗ WATCHDOG SMOKE FAILED' : `✅ WATCHDOG SMOKE: ${n} passed, 0 failed`)
