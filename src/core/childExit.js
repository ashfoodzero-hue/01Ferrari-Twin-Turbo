// ════════════════════════════════════════════════════════════════════════════════
// childExit.js — end a spawned child script explicitly once its work is done (2026-09-08).
// ────────────────────────────────────────────────────────────────────────────────
// MEASURED: paper_tick finished all its work in ~21 s and was killed at its 14-min budget 46 times in five days.
// The linger guard named the survivors: `Socket(fd 1)` and `Socket(fd 2)` — the child's own stdout/stderr pipes to
// run_app, nothing else. On Windows a Node child's pipe writes are asynchronous and the process lives until they
// drain; some ticks drained late enough to hit the budget. A budget kill on a fire bar delays the Telegram alert to
// the next tick. The cure is an explicit exit AFTER every await has returned and every write is synchronous —
// which is exactly the last line of these scripts. One helper, every long child script ends with it.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from './paths.js'

export const LINGER_FILE = process.env.TURBO_LINGER_FILE || path.join(TURBO.master ?? '.', 'child_linger.jsonl')

/** What still holds the event loop (diagnostics; never throws). */
export function activeHandleNames() {
  try {
    return process._getActiveHandles().map((h) => {
      const n = h.constructor?.name ?? 'handle'
      const x = h._idleTimeout != null ? `timer ${h._idleTimeout}ms` : h.remoteAddress ? `sock→${h.remoteAddress}:${h.remotePort}` : h.fd != null ? `fd ${h.fd}` : ''
      return x ? `${n}(${x})` : n
    })
  } catch { return [] }
}

/**
 * Call as the LAST statement of a child script, after all work: arms an unref'd timer that fires ONLY if something
 * still holds the loop `graceMs` later — it records what did (stderr + LINGER_FILE, append-only) and exits 0.
 * A script that exits on its own never reaches it. `meta` is anything worth keeping beside the handle list.
 */
export function exitWhenDrained(label, meta = {}, { graceMs = 1500, code = 0 } = {}) {
  if (process.env.TURBO_CHILD_EXIT_GUARD === 'off') { console.error(`  🛑 ${label}: exit guard DISARMED (TURBO_CHILD_EXIT_GUARD=off) — measuring the natural drain`); return null }   // measurement seam only
  const t = setTimeout(() => {
    try {
      const handles = activeHandleNames(), requests = (() => { try { return process._getActiveRequests().map((r) => r.constructor?.name ?? 'request') } catch { return [] } })()
      // _getActiveHandles OMITS timers in modern Node (measured by the smoke: a live setInterval was invisible) —
      // getActiveResourcesInfo lists Timeout/PipeWrap/TCPWrap/... and is the list that can actually name a timer
      const resources = (() => { try { return process.getActiveResourcesInfo() } catch { return [] } })()
      console.error(`  🛑 ${label}: process still alive ${graceMs}ms after completion — resources: ${JSON.stringify(resources)} · handles: ${JSON.stringify(handles)} · requests: ${JSON.stringify(requests)} — exiting`)
      fs.mkdirSync(path.dirname(LINGER_FILE), { recursive: true })
      fs.appendFileSync(LINGER_FILE, JSON.stringify({ at: new Date().toISOString(), label, ...meta, resources, handles, requests }) + '\n')
    } catch { /* diagnostics only */ }
    process.exit(code)
  }, graceMs)
  t.unref()
  return t
}
