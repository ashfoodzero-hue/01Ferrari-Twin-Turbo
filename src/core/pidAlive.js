// ════════════════════════════════════════════════════════════════════════════════
// pidAlive.js — "is the heartbeat's pid OUR app?" (2026-09-08)
// ────────────────────────────────────────────────────────────────────────────────
// `process.kill(pid, 0)` answers "does SOME process have this pid" — and Windows hands a dead process's pid to the
// next comer within minutes. Measured 09-08 12:19Z: the app's previous pid 47332 answered ALIVE eleven minutes after
// a machine reboot, held by an unrelated process. With a fresh beat that would make the watchdog believe a dead
// app is alive (no restart) and the heartbeat guard believe a foreign writer is the app. On Windows the check
// therefore also requires the pid's image to be node.exe (tasklist); elsewhere the signal probe stands.
// ════════════════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'

/** True only if `pid` exists AND (on Windows) its image is node.exe. EPERM counts as alive (a protected process). */
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0) } catch (e) { if (e.code !== 'EPERM') return false }
  if (process.platform !== 'win32') return true
  try {
    const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', timeout: 5000, windowsHide: true })
    return /"node\.exe"/i.test(out)
  } catch { return true }                                   // tasklist unavailable → fall back to the signal probe
}
