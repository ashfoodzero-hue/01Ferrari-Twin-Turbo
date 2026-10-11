// ════════════════════════════════════════════════════════════════════════════════
// freshness.js — Ferrari Twin Turbo: the freshness CONTRACT engine carried from Turbo2 (same functions), with the twin OWN flows.
// ────────────────────────────────────────────────────────────────────────────────
// ORIGIN — Ashraf, 2026-08-20: "we must solve the stale issues 100% for all app data flow."
//
// Staleness was only ever defined for ONE flow. The cockpit's freshness pill reads `forecast.json` and applies a
// single 90s/180s rule; every other artifact — signal_tiers, master_snapshot, latest_signal, mtf_zones, turbo3,
// gold_news — could age indefinitely with nothing watching, and a panel rendered from a 3-hour-old file looks
// exactly like one rendered a second ago. You cannot solve staleness you have not DEFINED, so this file defines it.
//
// TWO THINGS THIS GETS RIGHT THAT A NAIVE "mtime is age" CHECK DOES NOT:
//   1. NOT EVERY FILE IS A FLOW. `pressure_gauge.json` is a FALLBACK snapshot — the cockpit serves live pressure on
//      demand and only reads the file when the live call fails. Its mtime is not staleness, and alarming on it
//      would train the eye to ignore the alarm. Kind `fallback` says so explicitly.
//   2. CADENCE IS NOT MAX-AGE. A 1-minute writer that misses one cycle is fine; missing six is not. maxAgeS is set
//      at roughly 3x cadence (plus the scan cost where the writer is slow), so a single blip never cries wolf and a
//      genuine stall is caught fast. The 15m-bar-aligned pipeline is judged against the BAR, not the clock.
//
// The market being CLOSED is not staleness either — a weekend file is correctly old. Callers pass `marketOpen`.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from './paths.js'

/** kind: live = must stay fresh while the market is open · fallback = served on demand, age is not a fault
 *        ondemand = written only when something happens (absence is normal, age is not a fault) */
export const FLOWS = Object.freeze([
  // The twin publishes TWO live flows. Both are judged on mtime AND on the bar they carry (a freshly written file can
  // carry a stale bar — Turbo2 lesson 2026-08-26), and the market-closed rule exempts them while XAU is closed.
  { file: 'signal_tiers.json', writer: 'twin_tick.mjs (bar-aligned, 3s after each 15m close)', cadenceS: 900, maxAgeS: 2100, kind: 'live', critical: true,
    contentTs: (j) => (j?.bars_to ? Date.parse(j.bars_to) : null), maxContentAgeS: 2700 },
  { file: 'live_heartbeat.json', writer: 'run_twin.mjs (every 15 s)', cadenceS: 15, maxAgeS: 600, kind: 'live', critical: true },
  // 2026-10-08: the tick stream (src/data/tickStream.js) — the ONLY live market input. Beats every 2 s.
  { file: 'stream_heartbeat.json', writer: 'run_stream.mjs (tick stream, every 2 s)', cadenceS: 2, maxAgeS: 30, kind: 'live', critical: true },
])

/** Every FLOWS entry has a healer: the writer to re-run, or null with the reason (smoke-enforced). */
export const HEALERS = Object.freeze({
  'signal_tiers.json': { script: 'twin_tick.mjs', args: [] },
  'live_heartbeat.json': null,    // owned by run_twin.mjs itself — a stale heartbeat means the PROCESS is down; only a watchdog can heal that
  'stream_heartbeat.json': null,  // owned by run_stream.mjs (supervised by run_twin) — stale = the stream process is down or wedged
})

/** XAU spot trades ~22:00Z Sun → 21:00Z Fri. Outside that, an old file is CORRECT, not stale. */
export function marketOpen(now = Date.now()) {
  const d = new Date(now), dow = d.getUTCDay(), h = d.getUTCHours()
  if (dow === 6) return false
  if (dow === 0) return h >= 22
  if (dow === 5) return h < 21
  return !(h === 21)                                   // the daily rollover hour is thin but not closed
}

/**
 * The instant the market last CLOSED before `now` (now itself while open). A feed judged for freshness during a closure
 * is judged at this instant — the last closed bar is correctly old all weekend (2026-09-13: the integrity audit failed
 * every Sunday on "last closed bar 2297 min old"). Steps back in 15-minute ticks over the same marketOpen rule.
 */
export function lastMarketClose(now = Date.now()) {
  if (marketOpen(now)) return now
  let t = Math.floor(now / 900_000) * 900_000
  for (let i = 0; i < 4 * 24 * 8; i++) { if (marketOpen(t - 1)) return t; t -= 900_000 }   // ≤ 8 days back covers any weekend + holiday
  return now
}

/**
 * Read every declared flow and judge it against its own contract.
 * @returns {{at, market_open, flows:[{file,kind,age_s,max_age_s,state,writer,why}], stale_critical:number, stale_any:number}}
 */
export function freshnessReport({ now = Date.now(), heartbeat = null, probe = null } = {}) {
  const open = marketOpen(now)
  const hb = heartbeat ?? (() => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, 'live_heartbeat.json'), 'utf8')) } catch { return null } })()
  const flows = FLOWS.map((f) => {
    const p = f.dir ? path.join(TURBO.root ?? '.', 'data', f.dir, f.file) : path.join(TURBO.master, f.file)
    let ageS = null, oldestName = null
    if (f.allInDir) {
      // Judge the OLDEST member: the writer fetches each file independently, so the laggard is the truth.
      const d = path.dirname(p)
      try {
        for (const n of fs.readdirSync(d)) {
          if (!n.endsWith('.json')) continue
          const a = Math.round((now - fs.statSync(path.join(d, n)).mtimeMs) / 1000)
          if (ageS == null || a > ageS) { ageS = a; oldestName = n }
        }
      } catch { /* missing */ }
    } else {
      try { ageS = Math.round((now - fs.statSync(p).mtimeMs) / 1000) } catch { /* missing */ }
    }
    let state, why = null
    if (ageS == null) { state = f.critical ? 'MISSING' : 'absent'; why = 'file has never been written' }
    else if (f.maxAgeS == null) {
      // The flow claims its age cannot be a fault. Make it prove that, every single read.
      //   true  -> exempt   (the claim holds; age genuinely does not matter)
      //   false -> STALE    (the claim has FAILED; the age is now a real fault)
      //   null  -> UNPROVEN (we could not check; say so rather than pass it silently)
      const held = typeof f.exemptWhile === 'function' ? f.exemptWhile({ now, open, ageS, probe }) : null
      if (held === true) { state = 'exempt'; why = f.exemptClaim ?? null }
      else if (held === false) { state = 'STALE'; why = 'EXEMPTION FAILED — ' + (f.exemptClaim ?? 'claim') + ' no longer holds, so age ' + ageS + 's is a real fault' }
      else { state = 'UNPROVEN'; why = 'exemption could not be verified' + (typeof f.exemptWhile === 'function' ? ' (no probe supplied)' : ' — THIS FLOW DECLARES maxAgeS:null WITH NO exemptWhile, so nothing watches it') }
    }
    else if (!open) state = 'closed'                                // an old file is correct when the market is shut
    else if (ageS <= f.maxAgeS) state = 'fresh'
    else { state = 'STALE'; why = `age ${ageS}s > max ${f.maxAgeS}s (cadence ${f.cadenceS}s)` }
    // 🚨 ATTRIBUTE ONLY WHAT BELONGS (2026-08-20). The first version pinned the heartbeat's last_error onto EVERY
    // stale flow, so a broken FORECAST child was reported as the reason signal_tiers was late — mis-attribution is
    // the exact sin this whole session has been fixing, and a monitor that invents a cause is worse than one that
    // says nothing. run_app labels each child ('forecast: …', 'tick: …', 'snapshot: …', 'swing: …'); the error is
    // only attached when that label matches the flow's own writer.
    const LABEL = { 'run_forecast_live.mjs': 'forecast', 'run_live_tick.mjs': 'tick', 'run_master_snapshot.mjs': 'snapshot', 'paper_tick.mjs': 'swing', 'mt5_bridge.mjs': 'bridge' }
    if (state === 'STALE' && hb?.last_error) {
      const mine = Object.entries(LABEL).find(([script]) => f.writer.includes(script))?.[1]
      if (mine && String(hb.last_error).startsWith(mine + ':')) why += ' · writer last error: ' + String(hb.last_error).slice(0, 200)
      else why += ' · (the heartbeat error belongs to a different child — not attributed here)'
    }
    // ── CONTENT AGE — how old is the DATA, as opposed to the file? ──────────────────────────────────────────
    // Checked only when the file is otherwise healthy: if the writer has stopped, that is the finding, and
    // adding "its content is also old" underneath would be noise. A writer that runs on schedule but computes
    // from an hour-old bar is a DIFFERENT fault with a different cause, so it gets its own state and its own
    // sentence rather than being folded into the mtime verdict.
    let contentAgeS = null
    if (typeof f.contentTs === 'function' && ageS != null) {
      try {
        const raw = f.contentTs(JSON.parse(fs.readFileSync(p, 'utf8')))
        if (Number.isFinite(raw)) contentAgeS = Math.round((now - raw) / 1000)
      } catch { /* unreadable or no timestamp — reported as null, never guessed */ }
      if (open && contentAgeS != null && f.maxContentAgeS != null && contentAgeS > f.maxContentAgeS && state === 'fresh') {
        state = 'LAGGING'
        why = 'the file is being written (' + ageS + 's) but its DATA is ' + contentAgeS + 's old > max ' + f.maxContentAgeS + 's — the writer is alive and running on stale input'
      }
    }
    return { file: f.allInDir ? 'data/' + f.dir + '/* (' + (oldestName ?? 'empty') + ' is oldest)' : f.file,
      kind: f.kind, critical: f.critical, writer: f.writer, age_s: ageS, max_age_s: f.maxAgeS,
      content_age_s: contentAgeS, max_content_age_s: f.maxContentAgeS ?? null, state, why }
  })
  return {
    at: new Date(now).toISOString(), market_open: open,
    flows,
    failure: classifyFailure(hb?.last_error), app: heartbeatLive(hb), starting: hb?.starting === true,   // the report carries the CAUSE so callers need not re-derive it
    stale_critical: flows.filter((f) => f.state === 'STALE' && f.critical).length,
    stale_any: flows.filter((f) => f.state === 'STALE' || f.state === 'MISSING').length,
    // Counted SEPARATELY and never folded into stale_any: "we could not check" is a different claim from
    // "it is stale", and collapsing the two is how an unverified exemption reads as health.
    unproven: flows.filter((f) => f.state === 'UNPROVEN').length,
    // Counted apart from stale_any on purpose: "the writer died" and "the writer is running on old data" need
    // different actions, and one number covering both tells you neither.
    lagging: flows.filter((f) => f.state === 'LAGGING').length,
    lagging_critical: flows.filter((f) => f.state === 'LAGGING' && f.critical).length,
  }
}

/**
 * assertContractSound — the STRUCTURAL invariant, checked in tests rather than trusted in review.
 *
 * A flow that declares `maxAgeS: null` opts out of the only staleness check there is. That is legitimate for a
 * fallback or an on-demand artifact, but ONLY if something else proves the claim. Without this assertion, the
 * cheapest way to silence a stale-flow alarm is to delete its maxAgeS — which looks like a config tweak and is
 * actually the removal of all monitoring. Two flows had already drifted into exactly that state.
 * @returns {string[]} one message per violation; empty means the contract is sound
 */
export function assertContractSound(flows = FLOWS) {
  const bad = []
  for (const f of flows) {
    if (f.maxAgeS == null && typeof f.exemptWhile !== 'function')
      bad.push(f.file + ': maxAgeS is null but there is no exemptWhile() — nothing would ever watch this flow')
    if (f.maxAgeS == null && !f.exemptClaim)
      bad.push(f.file + ': exempt from the age check without stating exemptClaim — an unstated reason cannot be reviewed')
    if (f.maxAgeS != null && f.cadenceS != null && f.maxAgeS < f.cadenceS)
      bad.push(f.file + ': maxAgeS ' + f.maxAgeS + 's is below its own cadence ' + f.cadenceS + 's — it would alarm on every normal cycle')
  }
  return bad
}

/**
 * classifyFailure — WHAT KIND of failure is this, so the surface can give ACCURATE advice.
 *
 * 🚨 2026-08-21. The stale banner told Ashraf to "reopen the Ferrari Turbo2 dashboard to resume live updates"
 * while the real cause was that the MACHINE HAD NO NETWORK: curl returned 000 to api.polygon.io AND to
 * google.com, and the app_s own writer failed with "polygon network: ENOTFOUND after 3 attempts". Reopening a
 * dashboard cannot fix a dead socket, so the banner was not merely vague — it was instructing the user to do
 * something that could not work. Now that the writer error carries its real cause (the errText tail fix), the
 * surface classifies it and says what would actually help. Deliberately string-matched, not regex: these codes
 * arrive from several layers (undici, node dns, our own wrapper) and a clever pattern is how they get missed.
 */
export function classifyFailure(errText) {
  const e = String(errText || '').toUpperCase()
  if (!e) return { cls: 'NONE', label: 'no error', advice: null, appFault: false }
  const has = (...ks) => ks.some((k) => e.includes(k))
  if (has('ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'CONNECT_TIMEOUT', 'POLYGON NETWORK', 'FETCH FAILED'))
    return { cls: 'NETWORK', label: 'NO NETWORK — the data feed is unreachable from this machine',
      advice: 'This is NOT an app fault and reopening the dashboard will not help. Check the router/VPN/firewall; the app retries by itself and recovers the moment the connection returns.', appFault: false }
  if (has('429', 'TOO MANY REQUESTS', 'RATE LIMIT'))
    return { cls: 'RATE_LIMIT', label: 'RATE LIMITED — too many requests on the shared data key',
      advice: 'Transient and self-healing; the feed layer already backs off and retries.', appFault: false }
  if (has('NOT_AUTHORIZED', '403', '401', 'UPGRADE AT', 'UNAUTHORIZED'))
    return { cls: 'PLAN', label: 'DATA PLAN — the provider rejected the request',
      advice: 'Renew or upgrade the plan (our Polygon is resold by Massive — massive.com, not polygon.io). No code change will fix it.', appFault: false }
  if (has('TIMEOUT', 'KILLED'))
    return { cls: 'TIMEOUT', label: 'SLOW FEED — the request ran past its budget',
      advice: 'Usually load or a congested link; the next cycle retries. Persistent timeouts mean the connection, not the app.', appFault: false }
  if (has('CANNOT FIND MODULE', 'SYNTAXERROR', 'TYPEERROR', 'IS NOT A FUNCTION', 'UNDEFINED', 'REFERENCEERROR'))
    return { cls: 'CODE', label: 'APP ERROR — a code fault in the writer',
      advice: 'This one IS ours: read the error tail, fix the code. Do not wait for it to clear on its own.', appFault: true }
  return { cls: 'UNKNOWN', label: 'UNCLASSIFIED failure',
    advice: 'Cause not recognised — read the error tail rather than assuming it is transient.', appFault: null }
}

// 🚨 A HEARTBEAT FILE IS NOT A HEARTBEAT (2026-08-21). After Ashraf rebooted the PC, live_heartbeat.json still
// held pid 51208 — a process that no longer existed — and the cockpit dutifully replayed that dead process's last
// forecast error as though it were happening now. A file cannot prove a process is alive; only the pid can.
// `process.kill(pid, 0)` signals nothing and throws ESRCH when the pid is gone, which is exactly the question.
export function heartbeatLive(hb) {
  const pid = hb?.pid
  if (!pid) return { alive: null, why: 'the heartbeat carries no pid — liveness is unknowable' }
  if (pid === process.pid) return { alive: true, why: 'this process wrote it' }
  try { process.kill(pid, 0); return { alive: true, why: 'pid ' + pid + ' is running' } }
  catch (e) {
    if (e.code === 'EPERM') return { alive: true, why: 'pid ' + pid + ' exists (owned by another user)' }
    return { alive: false, why: 'pid ' + pid + ' is GONE — the app that wrote this heartbeat is not running' }
  }
}
