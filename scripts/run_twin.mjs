// run_twin.mjs — Ferrari Twin Turbo: the app (npm start). Two jobs, nothing else:
//   1. the LIVE TICK STREAM (run_stream.mjs → src/data/tickStream.js): Polygon forex ticks for all 8 symbols → verified
//      1m bars in the twin's own store. Started as a supervised child, restarted if it dies; adopted if already running.
//   2. the paper trial: one twin_tick child 3 s after every 15m close while XAU is open (measured: the stream settles a
//      minute ~3-4 s after it closes; twin_tick additionally waits up to 25 s for the decision bar and FAILS CLOSED).
// Heartbeat every 15 s (data/master/live_heartbeat.json) carrying the stream's state; child-run ledger; single-instance
// lock. Ashraf 2026-10-08: "yes to all … make sure that during reading market it is reading ticks for all".
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { marketOpen, marketSession } from '../src/core/freshness.js'
import { preopenSlot } from '../src/core/dataHealth.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { streamStatus } from '../src/data/tickStream.js'
import { reconcilePlan } from '../src/core/reconcilePlan.js'
import { bucket4h } from '../src/master/macroMagnet.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const HB = path.join(TURBO.master, 'live_heartbeat.json')
const LOCK = path.join(TURBO.master, 'run_twin.lock')
const STREAM_LOCK = path.join(TURBO.master, 'run_stream.lock')
const STREAM_LOG = path.join(TURBO.master, 'stream.log')
const RUNS = path.join(TURBO.master, 'child_runs.jsonl')
const TICK_BUDGET_MS = 10 * 60000, TICK_OFFSET_MS = 3000
fs.mkdirSync(TURBO.master, { recursive: true })
try { const l = JSON.parse(fs.readFileSync(LOCK, 'utf8')); if (l.pid !== process.pid && pidAlive(l.pid)) { console.error(`run_twin already running (pid ${l.pid}) — exiting`); process.exit(2) } } catch { /* no lock */ }
fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))

// ── 1. the tick stream (supervised) ──────────────────────────────────────────────────────────────────────────────
let streamChild = null, streamRestarts = 0
const streamLockPid = () => { try { const l = JSON.parse(fs.readFileSync(STREAM_LOCK, 'utf8')); return pidAlive(l.pid) ? l.pid : null } catch { return null } }
function ensureStream() {
  if (streamChild && streamChild.exitCode === null) return
  const adopted = streamLockPid(); if (adopted) return                // a streamer is already running — adopt it
  const out = fs.openSync(STREAM_LOG, 'a')
  streamChild = spawn(process.execPath, ['--max-old-space-size=1024', path.join(here, 'run_stream.mjs')], { stdio: ['ignore', out, out], windowsHide: true })
  fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_stream.mjs', event: 'spawn', pid: streamChild.pid, restarts: streamRestarts }) + '\n')
  streamChild.on('exit', (code) => { fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_stream.mjs', event: 'exit', exit: code }) + '\n'); streamRestarts++; streamChild = null })
}
// ── 1b. the live chart server (display only, http://127.0.0.1:7444 — scripts/run_chart.mjs), supervised the same way ─────────────
let chartChild = null, chartNextCheck = 0
async function chartAnswering() { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 2000); const r = await fetch('http://127.0.0.1:7444/api/symbols', { signal: c.signal }); clearTimeout(t); return r.ok } catch { return false } }
async function ensureChart() {
  if (chartChild && chartChild.exitCode === null) return
  if (Date.now() < chartNextCheck) return
  chartNextCheck = Date.now() + 60000
  if (await chartAnswering()) return                                    // another chart server already serves the port — adopt it
  const out = fs.openSync(path.join(TURBO.master, 'chart.log'), 'a')
  chartChild = spawn(process.execPath, ['--max-old-space-size=2048', path.join(here, 'run_chart.mjs')], { stdio: ['ignore', out, out], windowsHide: true })
  fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_chart.mjs', event: 'spawn', pid: chartChild.pid }) + '\n')
  chartChild.on('exit', (code) => { fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_chart.mjs', event: 'exit', exit: code }) + '\n'); chartChild = null })
}
// ── 1c. the ⚙ API keys page (http://127.0.0.1:7445 — scripts/run_settings.mjs, 2026-10-16), supervised the same way ─────────────
let setChild = null, setNextCheck = 0
async function ensureSettings() {
  if (setChild && setChild.exitCode === null) return
  if (Date.now() < setNextCheck) return
  setNextCheck = Date.now() + 60000
  try { const r = await fetch('http://127.0.0.1:7445/api/state', { signal: AbortSignal.timeout(2000) }); if (r.ok) return } catch { /* not answering → start it */ }
  const out = fs.openSync(path.join(TURBO.master, 'settings.log'), 'a')
  setChild = spawn(process.execPath, [path.join(here, 'run_settings.mjs')], { stdio: ['ignore', out, out], windowsHide: true })
  fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_settings.mjs', event: 'spawn', pid: setChild.pid }) + '\n')
  setChild.on('exit', (code) => { fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'run_settings.mjs', event: 'exit', exit: code }) + '\n'); setChild = null })
}
const shutdown = () => { try { streamChild?.kill() } catch { /* */ } try { chartChild?.kill() } catch { /* */ } try { setChild?.kill() } catch { /* */ } try { fs.unlinkSync(LOCK) } catch { /* */ } process.exit(0) }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown)

// ── 2. the bar-aligned paper tick ───────────────────────────────────────────────────────────────────────────────
let cycle = 0, lastTickBar = null, ticking = false, lastBeat = 0, lastReconcile = null, reconciling = false, reconAttempted = false
const STARTED_AT = Date.now(), readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const beat = (extra = {}) => {
  const s = streamStatus({ pidAlive })
  fs.writeFileSync(HB, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, cycle, last_tick_bar: lastTickBar, mode: 'run_twin',
    stream: { live: s.live, why: s.why, pid: s.hb?.pid ?? streamLockPid(), restarts: streamRestarts }, ...extra }, null, 1))
}
const tick = (barT) => new Promise((resolve) => {
  const t0 = Date.now(); ticking = true
  execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'twin_tick.mjs')], { timeout: TICK_BUDGET_MS, maxBuffer: 8 << 20, windowsHide: true }, (err, stdout, stderr) => {
    ticking = false; lastTickBar = new Date(barT).toISOString()
    const rec = { at: new Date().toISOString(), script: 'twin_tick.mjs', bar: lastTickBar, ms: Date.now() - t0, exit: err ? (err.code ?? 'killed') : 0, killed: !!err?.killed, tail: String(stderr || '').slice(-400) }
    fs.appendFileSync(RUNS, JSON.stringify(rec) + '\n')
    process.stdout.write(String(stdout || '')); if (err) console.error(`  🚨 twin_tick ${rec.exit}${rec.killed ? ' (budget kill)' : ''}: ${rec.tail.slice(-200)}`)
    resolve(rec)
  })
})
// ── 3. the FERRARI MATRIX scalp tick (matrix_tick.mjs) 4 s after every 3m close — non-blocking, one at a time, PAPER ONLY ──
let lastMacro = null, macroRunning = false, lastLevel = null, levelRunning = false
let lastMatrixBar = null, matrixTicking = false, lastGamma = null, gammaRunning = false, lastCal = 0, calRunning = false, lastFwd = null, fwdRunning = false
let lastRec = null, recRunning = false   // futures + GLD recorder (record_futures.mjs, 2026-10-17)
let lastAudit = null, auditRunning = false   // daily recording audit (audit_recording.mjs, 2026-10-17)
let lastLadder = null, ladderRunning = false   // ladder context, information only (ladder_tick.mjs, 2026-10-17)
let lastHealth = null, healthRunning = false, lastVerify = null, verifyRunning = false, verifyRetryAt = 0   // data health watcher + weekly full check (2026-10-18)
const TL_SYMS = ['XAUUSD', 'XAGUSD', 'DXY_ICE', 'WTI']   // major-trendline alerts (2026-10-18): minute tick + per-asset line refresh queue
let lastTl = null, tlRunning = false, tlRefreshing = null, tlQueue = [...TL_SYMS]   // every asset is refreshed once at start
const SR_SYMS = [...TL_SYMS, 'DXY']   // + gold-grid DXY (2026-10-19): the S/R tab's DXY warning compares XAU and DXY on identical candle times
let lastSr = null, srRefreshing = null, srQueue = [...SR_SYMS]   // S/R levels (sr_refresh.mjs, 2026-10-18): every asset at start + after each 1H close
let lastPre = null, preRunning = false, sesAt = 0, ses = null   // pre-open readiness check (preopen_check.mjs, 2026-10-18)
const calDone = new Set()
const matrixTick = (barT) => { matrixTicking = true; lastMatrixBar = barT; const t0 = Date.now()
  execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'matrix_tick.mjs')], { timeout: 120000, maxBuffer: 8 << 20, windowsHide: true }, (err, stdout, stderr) => {
    matrixTicking = false
    fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'matrix_tick.mjs', bar: new Date(barT).toISOString(), ms: Date.now() - t0, exit: err ? (err.code ?? 'killed') : 0, killed: !!err?.killed, tail: String(stderr || '').slice(-400) }) + '\n')
    process.stdout.write(String(stdout || '')); if (err) console.error(`  🚨 matrix_tick ${err.code ?? 'killed'}: ${String(stderr || '').slice(-200)}`)
  }) }
console.log(`run_twin pid ${process.pid} — tick stream (all symbols) + twin_tick ${TICK_OFFSET_MS / 1000}s after every 15m close + matrix_tick 4s after every 3m close, while the market is open`)
ensureStream(); beat()
for (;;) {
  cycle++
  const now = Date.now()
  const lastClose = Math.floor(now / 900000) * 900000, last3m = Math.floor(now / 180000) * 180000
  ensureStream(); await ensureChart(); await ensureSettings()
  // DATA HEALTH watcher (health_tick.mjs, 2026-10-18; rules src/core/dataHealth.js): every 2 min, always, + at start (FIRST, so the signal gate
  // reads a fresh verdict). STALE → every signal path stops + red "DATABASE STALE" on the chart + Telegram; daily "all data OK" after 21:45 UTC.
  if ((lastHealth === null || now - lastHealth >= 120000) && !healthRunning) { healthRunning = true; lastHealth = now
    execFile(process.execPath, ['--max-old-space-size=1024', path.join(here, 'health_tick.mjs')], { timeout: 90000, windowsHide: true }, (err, stdout, stderr) => { healthRunning = false
      if (err || /📨/.test(String(stdout))) fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'health_tick.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-400), tail: String(stderr || '').slice(-300) }) + '\n')
      if (err || /📨|STALE|WARN/.test(String(stdout))) process.stdout.write(String(stdout || '')) }) }
  if (marketOpen(last3m - 1) && now - last3m >= 4000 && !matrixTicking && (lastMatrixBar == null || lastMatrixBar < last3m)) matrixTick(last3m)
  if (marketOpen(lastClose - 1) && now - lastClose >= TICK_OFFSET_MS && !ticking && (lastTickBar == null || Date.parse(lastTickBar) < lastClose)) await tick(lastClose)
  // reconciliation of the 1m store vs Polygon's current bars (corrections.js) — WHEN and HOW FAR BACK: src/core/reconcilePlan.js (every app
  // start, daily, retry after a failure; ≥ 7 days back). The exit code is real (1 = a symbol failed) and is logged.
  const rp = reconcilePlan({ now, startedAt: STARTED_AT, state: readJson(path.join(TURBO.master, 'reconcile_state.json')), running: reconciling, attemptedThisStart: reconAttempted, lastAttemptAt: lastReconcile })
  if (rp.run) { reconciling = true; reconAttempted = true; lastReconcile = now
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'reconcile_1m.mjs'), String(rp.days)], { timeout: 30 * 60000, windowsHide: true }, (err, stdout, stderr) => { reconciling = false
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'reconcile_1m.mjs', why: rp.why, days: rp.days, exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-600), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  // USD economic calendar (fetch_calendar.mjs): every 30 min, plus 2 and 6 min after each HIGH-impact release (to capture the actual value)
  if (!calRunning) { let due = Date.now() - lastCal >= 30 * 60000
    if (!due) try { const up = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'calendar', 'upcoming.json'), 'utf8'))
      for (const e of up.events) if (e.impact === 'high') for (const d of [2, 6]) { const k = e.t + d * 60000; if (now >= k && now < k + 60000 && !calDone.has(k)) { calDone.add(k); due = true } } } catch {}
    if (due) { calRunning = true; lastCal = Date.now()
      execFile(process.execPath, [path.join(here, 'fetch_calendar.mjs')], { timeout: 3 * 60000, windowsHide: true }, (err, stdout, stderr) => { calRunning = false
        fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'fetch_calendar.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n') }) } }
  // GLD gamma levels: once per US weekday at/after 14:30 UTC (gamma_snapshot.mjs skips a day already recorded), then the forward test
  const day = new Date(now).toISOString().slice(0, 10)   // UTC day key (restored 2026-10-14: the reconcile rewrite had dropped it → crash loop from 14:30 UTC)
  const wd = new Date(now).getUTCDay(), mins = new Date(now).getUTCHours() * 60 + new Date(now).getUTCMinutes()
  if (wd >= 1 && wd <= 5 && mins >= 14 * 60 + 30 && lastGamma !== day && !gammaRunning) { gammaRunning = true; lastGamma = day
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'gamma_snapshot.mjs')], { timeout: 5 * 60000, windowsHide: true }, (err, stdout, stderr) => {
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'gamma_snapshot.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n')
      process.stdout.write(String(stdout || ''))
      execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'study_gamma_levels.mjs')], { timeout: 5 * 60000, windowsHide: true }, (e2, so2) => { gammaRunning = false
        fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'study_gamma_levels.mjs', exit: e2 ? (e2.code ?? 'killed') : 0, out: String(so2 || '').slice(-300) }) + '\n') }) }) }
  // FORWARD TEST of the 90 % investigation's candidates (scripts/inv90/forward_buyd1.mjs, arm 1 then arm 2) — paper, record-only, every 15 min
  // at 5 min past each 15m close (2026-10-15, Ashraf: neon boxes "fire faster"; was hourly at :20). Catch-up by design, so a missed run loses nothing.
  const qKey = now - (now % 900000)
  if (now - qKey >= 5 * 60000 && lastFwd !== qKey && !fwdRunning) { fwdRunning = true; lastFwd = qKey
    execFile(process.execPath, ['--max-old-space-size=10000', path.join(here, 'inv90', 'forward_buyd1.mjs')], { timeout: 20 * 60000, windowsHide: true }, (err, stdout, stderr) => {
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'inv90/forward_buyd1.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n')
      // arm 2 (2026-10-15): the ≈ 1 trade/day arm, right after arm 1 on the features arm 1 just rebuilt (--no-build); only if arm 1 succeeded
      if (err) { fwdRunning = false; return }
      execFile(process.execPath, ['--max-old-space-size=10000', path.join(here, 'inv90', 'forward_buyd1.mjs'), '--arm=freq', '--no-build'], { timeout: 20 * 60000, windowsHide: true }, (e2, so2, se2) => { fwdRunning = false
        fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'inv90/forward_buyd1.mjs --arm=freq', exit: e2 ? (e2.code ?? 'killed') : 0, out: String(so2 || '').slice(-300), tail: String(se2 || '').slice(-300) }) + '\n') }) }) }
  // 4H MACRO MAGNET (macro_tick.mjs, 2026-10-16, Ashraf "honest tile + live record"): 2 min after every NY 4H close + once at start
  // (catch-up by design: it scores every closed, settled 4H bar not yet in its append-only ledger)
  const mKey = bucket4h(now)
  if (now - mKey >= 120000 && lastMacro !== mKey && !macroRunning) { macroRunning = true; lastMacro = mKey
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'macro_tick.mjs')], { timeout: 5 * 60000, windowsHide: true }, (err, stdout, stderr) => { macroRunning = false
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'macro_tick.mjs', bar: new Date(mKey).toISOString(), exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n')
      process.stdout.write(String(stdout || '')) }) }
  // 4H S/R LEVEL notices (level_tick.mjs, 2026-10-16, Ashraf: "send this msg about 5 m before it reaches the level … so I watch it"): every minute,
  // 20 s after the minute closes, while the market is open. Information only (APPROACHING / DEFENDED), deduplicated by its own ledger.
  const lKey = now - (now % 60000)
  if (marketOpen(lKey - 1) && now - lKey >= 20000 && lastLevel !== lKey && !levelRunning) { levelRunning = true; lastLevel = lKey
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'level_tick.mjs')], { timeout: 50000, windowsHide: true }, (err, stdout, stderr) => { levelRunning = false
      if (err || /📨/.test(String(stdout))) fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'level_tick.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-400), tail: String(stderr || '').slice(-300) }) + '\n')
      if (/📨/.test(String(stdout))) process.stdout.write(String(stdout || '')) }) }
  // MAJOR TRENDLINE ALERTS (2026-10-18, Ashraf: "when ever it reach those major trend lines from both sides we need alert for either a bounce or a major
  // break" → 4H + 1D, Telegram + app; then DXY, silver, WTI). trendline_tick.mjs every minute 25 s after the close while the market is open (📐 AT LINE,
  // ✅ BOUNCED); an asset whose tick reports "a newer candle closed" is queued for trendline_lines.mjs (full-history line refresh, ❌ BROKEN at the close),
  // one asset at a time — so every session's own 4H / 1D close (gold, ICE DXY, CME WTI) is handled without a fixed clock. Information only.
  if (marketOpen(lKey - 1) && now - lKey >= 25000 && lastTl !== lKey && !tlRunning) { tlRunning = true; lastTl = lKey
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'trendline_tick.mjs')], { timeout: 50000, windowsHide: true }, (err, stdout, stderr) => { tlRunning = false
      if (err || /📨/.test(String(stdout))) fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'trendline_tick.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-400), tail: String(stderr || '').slice(-300) }) + '\n')
      if (/📨/.test(String(stdout))) process.stdout.write(String(stdout || ''))
      try { const st = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'trendline_tick_state.json'), 'utf8'))
        for (const [s, a] of Object.entries(st.assets ?? {})) if ((a.status?.startsWith('no lines file') || Object.values(a.tf ?? {}).some((x) => x.status?.startsWith('a newer candle closed'))) && tlRefreshing !== s && !tlQueue.includes(s)) tlQueue.push(s) } catch { /* no state yet */ } }) }
  if (!tlRefreshing && !srRefreshing && tlQueue.length) { const s = tlQueue.shift(); tlRefreshing = s
    execFile(process.execPath, ['--max-old-space-size=8192', path.join(here, 'trendline_lines.mjs'), s], { timeout: 5 * 60000, windowsHide: true }, (err, stdout, stderr) => { tlRefreshing = null
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: `trendline_lines.mjs ${s}`, exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n')
      if (/📨/.test(String(stdout))) process.stdout.write(String(stdout || '')) }) }
  // S/R LEVELS (sr_refresh.mjs, 2026-10-18, Ashraf: "real strong S/R levels at 1H, 4H, 1D, 1W, 1Month … keep updating the strength … no stales"):
  // 4 min after every hour (every 1H close; higher timeframes close on hours too) while the market is open, all four assets queued, one at a time,
  // after the trendline refresh queue (never two full-history children together). Fail-closed inside (stale newest minute → exit 2, nothing written).
  const hKey = now - (now % 3600000)
  if (marketOpen(hKey - 1) && now - hKey >= 4 * 60000 && lastSr !== hKey) { lastSr = hKey; for (const s of SR_SYMS) if (srRefreshing !== s && !srQueue.includes(s)) srQueue.push(s) }
  if (!srRefreshing && !tlRefreshing && srQueue.length) { const s = srQueue.shift(); srRefreshing = s
    execFile(process.execPath, ['--max-old-space-size=8192', path.join(here, 'sr_refresh.mjs'), s], { timeout: 5 * 60000, windowsHide: true }, (err, stdout, stderr) => { srRefreshing = null
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: `sr_refresh.mjs ${s}`, exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  // FUTURES + GLD RECORDER (record_futures.mjs, 2026-10-17, Ashraf: "the App … saves our database … so we build our own history for Future and
  // Spot for XAU, DXY, Silver"): every 15 min at 8 min past each 15m close, always (futures trade Sunday-Friday). Append-only, final minutes only,
  // catch-up by design (a missed run loses nothing). Spot is recorded by the stream itself.
  if (now - qKey >= 8 * 60000 && lastRec !== qKey && !recRunning) { recRunning = true; lastRec = qKey
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'record_futures.mjs')], { timeout: 10 * 60000, windowsHide: true }, (err, stdout, stderr) => { recRunning = false
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'record_futures.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-400), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  // LADDER CONTEXT (ladder_tick.mjs, 2026-10-17, docs/LADDER_CONTEXT_SPEC.md; Ashraf approved "make it live"): the swing study's flip ladder per anchor,
  // INFORMATION only — every 3 min, 30 s after each 3m close, while the market is open, + once at start. Fail-closed inside the script (no fresh minute → no write).
  if ((lastLadder === null || (marketOpen(last3m - 1) && lastLadder !== last3m)) && now - last3m >= 30000 && !ladderRunning) { ladderRunning = true; lastLadder = last3m
    execFile(process.execPath, ['--max-old-space-size=8192', path.join(here, 'ladder_tick.mjs')], { timeout: 150000, windowsHide: true }, (err, stdout, stderr) => { ladderRunning = false
      if (err) fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'ladder_tick.mjs', exit: err.code ?? 'killed', out: String(stdout || '').slice(-300), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  // DAILY RECORDING AUDIT (audit_recording.mjs, 2026-10-17): once per UTC day at/after 21:30 UTC (after the New York close) — every in-session
  // hole classified against Polygon (provider outage vs OUR miss), duplicates, staleness → data/master/recording_audit.json
  if (mins >= 21 * 60 + 30 && lastAudit !== day && !auditRunning) { auditRunning = true; lastAudit = day
    execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'audit_recording.mjs'), '3'], { timeout: 15 * 60000, windowsHide: true }, (err, stdout, stderr) => { auditRunning = false
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'audit_recording.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-500), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  // PRE-OPEN READINESS (preopen_check.mjs, 2026-10-18; Ashraf approved "Pre-open readiness check"): 60 and 15 min before every open
  // (marketSession.next_open — New York hours + measured holidays). The 1-hour daily break gets only the T-15 run, which reports NOT READY only.
  if (now - sesAt >= 30000) { ses = marketOpen(now) ? null : marketSession(now); sesAt = now }
  if (ses?.next_open && !preRunning) { const slot = preopenSlot(ses, now), key = slot && `${ses.next_open}:${slot}`
    if (key && lastPre !== key) { preRunning = true; lastPre = key
      execFile(process.execPath, ['--max-old-space-size=4096', path.join(here, 'preopen_check.mjs'), `--slot=${slot}`, ...(ses.status === 'DAILY_BREAK' ? ['--quiet-if-ready'] : [])], { timeout: 10 * 60000, windowsHide: true }, (err, stdout, stderr) => { preRunning = false
        fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'preopen_check.mjs', slot, exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-600), tail: String(stderr || '').slice(-300) }) + '\n')
        process.stdout.write(String(stdout || '').split('\n').filter((l) => /READY|📨/.test(l)).join('\n') + '\n') }) } }
  // WEEKLY FULL DATABASE CHECK (verify_database.mjs, 2026-10-18): Saturdays at/after 06:00 UTC (market closed) — every series minute by minute vs
  // Polygon + GOLD_FUT vs the CME feed → data/master/database_verification.json, which the data health watcher judges (FAILED → STALE).
  if (wd === 6 && mins >= 6 * 60 && lastVerify !== day && !verifyRunning && now >= verifyRetryAt) { verifyRunning = true; lastVerify = day
    execFile(process.execPath, ['--max-old-space-size=12000', path.join(here, 'verify_database.mjs')], { timeout: 45 * 60000, maxBuffer: 16 << 20, windowsHide: true }, (err, stdout, stderr) => { verifyRunning = false
      if (err) { lastVerify = null; verifyRetryAt = Date.now() + 2 * 3600000 }   // a crash (network after 5 retries) or a mismatch → run again in 2 h the same Saturday
      fs.appendFileSync(RUNS, JSON.stringify({ at: new Date().toISOString(), script: 'verify_database.mjs', exit: err ? (err.code ?? 'killed') : 0, out: String(stdout || '').slice(-500), tail: String(stderr || '').slice(-300) }) + '\n') }) }
  if (Date.now() - lastBeat >= 15000) { beat({ market_open: marketOpen(now) }); lastBeat = Date.now() }
  await new Promise((r) => setTimeout(r, 1000))
}
