// watchdogDecision.js — the twin watchdog's ONE decision, pure (2026-10-08). Origin: Windows Update rebooted the machine at 18:16:49Z
// (Kernel-Power 109/577, event 1074 by winlogon for SYSTEM, 26H2 installed 18:31Z) and nothing restarted the twin — the live tick stream
// was down for over an hour. Rules carried from Turbo2's ops/watchdog_app.mjs: liveness = the heartbeat's OWN pid alive AND a recent
// beat (a fresh file with a dead pid is a dead app); the watchdog only ever STARTS (never kills); > 3 restarts in an hour ⇒ HALT.
export const WATCHDOG = Object.freeze({ maxBeatAgeMs: 3 * 60000, maxRestartsPerHour: 3 })

/** @returns {{action:'none'|'start'|'halt', why:string}} */
export function watchdogDecision({ hb, now, pidAlive, recentRestarts = 0, halted = false }) {
  if (halted) return { action: 'none', why: 'HALT marker present — re-arm by deleting it' }
  const beatAge = hb?.at ? now - Date.parse(hb.at) : Infinity
  if (hb && pidAlive(hb.pid) && beatAge <= WATCHDOG.maxBeatAgeMs) return { action: 'none', why: 'healthy' }
  if (recentRestarts >= WATCHDOG.maxRestartsPerHour) return { action: 'halt', why: `crash-loop: ${recentRestarts} restarts in the last hour` }
  const why = !hb ? 'no heartbeat file' : !pidAlive(hb.pid) ? `pid ${hb.pid} is dead (beat ${Math.round(beatAge / 60000)} min old)` : `pid ${hb.pid} alive but beat ${Math.round(beatAge / 60000)} min old (wedged)`
  return { action: 'start', why }
}
