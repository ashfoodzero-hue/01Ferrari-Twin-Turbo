// heartbeatOwner.js — ONE answer to "does a live FULL APP own live_heartbeat.json right now?" (2026-09-13)
// The shared heartbeat is a single-writer contract: every second writer (a display shell, a doomed starter, a July-era
// supervisor) turns the watchdog into an app-killer (measured 2026-09-05 15:10Z). liveEngine carried this predicate
// inline; overnight_watch.mjs had none and would spawn `run_cockpit --live` beside `npm start`. Both now ask here.
import fs from 'node:fs'
import { pidAlive } from './pidAlive.js'

export const FULL_APP_MODE = 'run_app (full app)'
export const FRESH_MS = 10 * 60_000

/**
 * @param {string} hbPath  the shared heartbeat file
 * @param {{ selfPid?: number, now?: number }} [o]  selfPid: the caller's pid (its own heartbeat never blocks it)
 * @returns {{ owned: boolean, pid: number|null, why: string }}  owned=true ⇒ a DIFFERENT, live, fresh full app owns the file
 */
export function fullAppOwnsHeartbeat(hbPath, { selfPid = process.pid, now = Date.now() } = {}) {
  let cur
  try { cur = JSON.parse(fs.readFileSync(hbPath, 'utf8')) } catch { return { owned: false, pid: null, why: 'no readable heartbeat' } }
  const stamp = Date.parse(cur?.last_run_utc ?? cur?.started_utc ?? '')
  const fresh = Number.isFinite(stamp) && now - stamp < FRESH_MS
  if (cur?.mode !== FULL_APP_MODE) return { owned: false, pid: cur?.pid ?? null, why: 'heartbeat mode is ' + JSON.stringify(cur?.mode ?? null) + ', not the full app' }
  if (cur.pid === selfPid) return { owned: false, pid: cur.pid, why: 'this process wrote it' }
  if (!fresh) return { owned: false, pid: cur.pid ?? null, why: 'heartbeat is stale (' + (Number.isFinite(stamp) ? Math.round((now - stamp) / 60000) + ' min' : 'no stamp') + ')' }
  if (!pidAlive(cur.pid)) return { owned: false, pid: cur.pid ?? null, why: 'pid ' + cur.pid + ' is not a live node process' }
  return { owned: true, pid: cur.pid, why: 'full app pid ' + cur.pid + ' is live with a fresh beat' }
}
