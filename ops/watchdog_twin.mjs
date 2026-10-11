// watchdog_twin.mjs — the EXTERNAL watchdog for Ferrari Twin Turbo (2026-10-08). Task Scheduler runs it every 5 min (and at logon) via
// ops/watchdog_launch.vbs (hidden window). It STARTS run_twin when the app is down (decision: src/core/watchdogDecision.js); it never
// kills anything — run_twin's own single-instance lock refuses a duplicate. Ledger: data/self_heal/heal_ledger.jsonl. Off switch:
// data/self_heal/WATCHDOG_HALT.marker (written by the loop breaker; delete it to re-arm). Always exits 0.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pidAlive } from '../src/core/pidAlive.js'
import { watchdogDecision } from '../src/core/watchdogDecision.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HB = path.join(ROOT, 'data', 'master', 'live_heartbeat.json'), DIR = path.join(ROOT, 'data', 'self_heal')
const LEDGER = path.join(DIR, 'heal_ledger.jsonl'), HALT = path.join(DIR, 'WATCHDOG_HALT.marker'), LOG = path.join(ROOT, 'data', 'master', 'run_twin.log')
const ledger = (row) => { try { fs.mkdirSync(DIR, { recursive: true }); fs.appendFileSync(LEDGER, JSON.stringify({ t: Date.now(), at: new Date().toISOString(), actor: 'watchdog', ...row }) + '\n') } catch { /* nothing useful to do */ } }
try {
  let hb = null; try { hb = JSON.parse(fs.readFileSync(HB, 'utf8')) } catch { /* never started */ }
  let recent = 0; try { recent = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((r) => r && r.action === 'start' && Date.now() - r.t < 3600000).length } catch { /* no ledger */ }
  const d = watchdogDecision({ hb, now: Date.now(), pidAlive, recentRestarts: recent, halted: fs.existsSync(HALT) })
  if (d.action === 'halt') { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(HALT, `${d.why} — investigate, then DELETE this file to re-arm. ${new Date().toISOString()}`); ledger({ action: 'halt', why: d.why }) }
  else if (d.action === 'start') {
    const out = fs.openSync(LOG, 'a'); fs.writeSync(out, `\n── ${new Date().toISOString()} watchdog start (${d.why}) ──\n`)
    const child = spawn(process.execPath, ['--max-old-space-size=2048', path.join(ROOT, 'scripts', 'run_twin.mjs')], { cwd: ROOT, detached: true, windowsHide: true, stdio: ['ignore', out, out], env: { ...process.env, TWIN_SPAWNED_BY: 'watchdog' } })
    child.unref(); ledger({ action: 'start', why: d.why, newPid: child.pid ?? null })
  }
} catch (e) { ledger({ action: 'watchdog-error', err: String(e?.message ?? e).slice(0, 160) }) }
process.exit(0)
