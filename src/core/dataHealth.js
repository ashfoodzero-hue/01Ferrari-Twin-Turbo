// ════════════════════════════════════════════════════════════════════════════════
// dataHealth.js — the FULL-SYSTEM DATA HEALTH verdict + the signal gate (2026-10-18; Ashraf: "how we can tell if we have any issue with full
// system database? and can we get alert for this?" → alerts to the Twin Turbo Telegram group, "also stop signal trigger and make a note on the
// App 'Database Stale' with flash red color", + a daily "all data OK").
// ONE place for: scripts/health_tick.mjs (writes data/master/data_health.json + Telegram), the chart banner (/api/health), and every signal
// path (telegram.sendText, twin_tick, matrix_tick, inv90 forward) through signalsHalted().
// ────────────────────────────────────────────────────────────────────────────────
// It runs no check of its own: it READS the results the existing checks already write (freshness flows, the gold tick stream, reconcile_1m,
// the daily recording audit, the futures recorder, the stored futures minutes, the weekly verify_database, the watchdog HALT marker, the
// calendar sources) and judges each against a stated rule.
//   CRITICAL ⇒ state STALE ⇒ every signal stops (fail closed) + red flashing "DATABASE STALE" on the chart.
//   WARN     ⇒ state WARN  ⇒ Telegram warning + amber note; signals continue (context data only, or a check that is late, not failed).
// A closed market is not staleness (freshness.marketOpen); live-flow checks get a 40-min grace after every reopen (the first 15m decision
// lands 15 min + 3 s after the open, so a Friday-old signal_tiers.json is correct until then).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from './paths.js'
import { freshnessReport, marketOpen, marketSession } from './freshness.js'

const MIN = 60000, H = 3600000
export const HEALTH_FILE = () => process.env.TWIN_DATA_HEALTH_FILE || path.join(TURBO.master, 'data_health.json')
export const HEALTH_RULE = Object.freeze({
  reopenGraceMs: 40 * MIN,               // live flows judged only once the market has been open this long
  xauSettleMaxMs: 4 * MIN,               // gold stream: newest settled minute may lag the clock by at most this (market open)
  futMaxAgeMs: { GOLD_FUT: 45 * MIN, SILVER_FUT: 60 * MIN, WTI: 60 * MIN },   // recorder: 12-min finality + 15-min cadence ≈ 27 min normal
  recorderMaxGapMs: 45 * MIN,            // record_futures runs every 15 min, always
  reconcileMaxAgeMs: 30 * H, auditMaxAgeMs: 30 * H, verifyMaxAgeMs: 8.5 * 24 * H, calendarMaxAgeMs: 75 * MIN,
  healthMaxAgeMs: 10 * MIN,              // the gate fails CLOSED when data_health.json is older than this (the watcher itself stopped)
  diskCritGB: 5, diskWarnGB: 20,         // free space on the data drive: a full disk silently stops every append (stores, ledgers, logs)
})
const FUT = ['GOLD_FUT', 'SILVER_FUT', 'WTI']
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const lastLines = (f, n) => { try { return fs.readFileSync(f, 'utf8').trim().split('\n').slice(-n).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) } catch { return [] } }
const lastStoredT = (file) => { try { const size = fs.statSync(file).size; if (!size) return null; const fd = fs.openSync(file, 'r')
  try { const n = Math.min(size, 4096), buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, size - n); return JSON.parse(buf.toString('utf8').trim().split('\n').at(-1)).t } finally { fs.closeSync(fd) } } catch { return null } }

/** Every input the verdict needs, read from the files the existing checks write. Pure data — assessHealth() judges it. */
export function readHealthInputs(now = Date.now()) {
  const runs = lastLines(path.join(TURBO.master, 'child_runs.jsonl'), 400)
  return {
    now, fresh: freshnessReport({ now }),
    stream: readJ(path.join(TURBO.master, 'stream_heartbeat.json')),
    reconcile: lastLines(path.join(TURBO.master, 'reconcile_history.jsonl'), 1)[0] ?? null,
    audit: readJ(path.join(TURBO.master, 'recording_audit.json')),
    verify: readJ(path.join(TURBO.master, 'database_verification.json')),
    recorder: runs.filter((r) => r.script === 'record_futures.mjs' && r.exit !== undefined).slice(-3),
    futLast: Object.fromEntries(FUT.map((a) => [a, lastStoredT(path.join(TURBO.historyAsset(a), '1m.jsonl'))])),
    halted: fs.existsSync(path.join(TURBO.root, 'data', 'self_heal', 'WATCHDOG_HALT.marker')),
    calendar: readJ(path.join(TURBO.root, 'data', 'calendar', 'upcoming.json')),
    history: readJ(path.join(TURBO.root, 'data', 'calendar', 'history.json')),
    preopen: readJ(path.join(TURBO.master, 'preopen_check.json')),
    diskFreeGB: (() => { try { const s = fs.statfsSync(TURBO.root); return +(s.bavail * s.bsize / 1e9).toFixed(1) } catch { return null } })(),
  }
}

const iso = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'never')
const ago = (ms) => (ms < H ? `${Math.round(ms / MIN)} min` : ms < 48 * H ? `${(ms / H).toFixed(1)} h` : `${(ms / 24 / H).toFixed(1)} days`)
/** The CME break / thin hours where a futures minute gap is normal: 21:00-22:59 UTC (covers both DST seasons) and US holiday closures. */
function futuresQuiet(t, holidays) {
  const h = new Date(t).getUTCHours(); if (h === 21 || h === 22) return true
  const d = new Date(t).toISOString().slice(0, 10), hol = (holidays ?? []).find((x) => x.date === d)
  return !!hol && (hol.status === 'closed' || (hol.close && t >= Date.parse(hol.close)))
}

/**
 * The verdict. @returns {{state:'OK'|'WARN'|'STALE', market_open, issues:[{code, sev:'CRITICAL'|'WARN', text}], checks:{…one line per check}}}
 */
export function assessHealth(I, R = HEALTH_RULE) {
  const now = I.now, open = marketOpen(now), settledOpen = open && marketOpen(now - R.reopenGraceMs), issues = [], checks = {}
  // 0. THE MARKET (Ashraf 2026-10-18: "so when market closing hrs our system understand why no feeding") — New York session + measured holidays
  const ses = marketSession(now), nextIn = ses.next_open ? ago(ses.next_open - now) : null
  const opens = ses.next_open ? `opens ${iso(ses.next_open)} (in ${nextIn})` : null
  const market = { open, status: ses.status, label: ses.label, next_open: ses.next_open ? new Date(ses.next_open).toISOString() : null, opens,
    note: open ? (settledOpen ? 'open — live feed expected' : 'just reopened — live checks start 40 min after the open') : `CLOSED — ${ses.label} — no live feed expected${opens ? ' · ' + opens : ''}` }
  checks.market = market.note
  const add = (code, sev, text) => issues.push({ code, sev, text })
  // 1. the app + live flows (freshness contract) — the app process, its heartbeat, the tick stream, the 15m decision file
  if (I.halted) add('WATCHDOG_HALT', 'CRITICAL', 'The watchdog HALTED the app (crash loop) — nothing is running. Investigate, then delete data/self_heal/WATCHDOG_HALT.marker.')
  if (I.fresh?.app?.alive === false) add('APP_DOWN', 'CRITICAL', `The app is not running (${I.fresh.app.why}).`)
  const staleFlows = (I.fresh?.flows ?? []).filter((f) => f.critical && (f.state === 'STALE' || f.state === 'LAGGING' || f.state === 'MISSING'))
  if (settledOpen && staleFlows.length) add('FLOW_STALE', 'CRITICAL', 'Live data flow stale: ' + staleFlows.map((f) => `${f.file} (${f.why})`).join('; '))
  checks.app = I.halted ? 'HALTED' : I.fresh?.app?.alive === false ? 'DOWN' : 'running'
  // 2. the gold tick stream: every closed minute settled (tick verified against Polygon, or the REST arbiter)
  const st = I.stream?.symbols?.XAUUSD?.settled_through ? Date.parse(I.stream.symbols.XAUUSD.settled_through) : null
  if (settledOpen && !(st && now - st <= R.xauSettleMaxMs)) add('XAU_STREAM', 'CRITICAL', `Gold (XAUUSD) live minutes not confirmed since ${iso(st)} (${st ? ago(now - st) : '—'} behind).`)
  checks.gold_stream = st ? `settled through ${iso(st)}` : 'no stream heartbeat'
  // 2b. every OTHER stream symbol (2026-10-18, Ashraf: ticks for "XAU, DXY, Silver, WTI") — silver + the six DXY pairs ride the same stream
  const others = ['XAGUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF'], lag = others.map((s) => { const v = I.stream?.symbols?.[s]?.settled_through; const t = v ? Date.parse(v) : null; return { s, t } })
  const lagBad = lag.filter((x) => !(x.t && now - x.t <= R.xauSettleMaxMs))
  if (settledOpen && lagBad.length) add('SYMBOL_STREAM', 'CRITICAL', `Live minutes not confirmed for ${lagBad.map((x) => `${x.s} (since ${iso(x.t)})`).join(', ')} — silver / DXY inputs stale.`)
  checks.stream_symbols = `${others.length - lagBad.length}/${others.length} silver + DXY pairs settled within ${R.xauSettleMaxMs / MIN} min`
  // 3. reconcile_1m — the stored 1m minutes vs Polygon (fixes ours; a failure means a symbol could not be checked)
  const rc = I.reconcile, rcT = rc ? Date.parse(rc.at) : null
  if (rc && rc.ok === false) add('RECONCILE_FAILED', 'CRITICAL', `Gap repair (reconcile vs Polygon) FAILED at ${iso(rcT)}: ${(rc.errors ?? []).join(', ') || 'see reconcile_history.jsonl'} — it retries by itself.`)
  else if (!rcT || now - rcT > R.reconcileMaxAgeMs) add('RECONCILE_OLD', 'WARN', `Gap repair has not run for ${rcT ? ago(now - rcT) : 'ever'} (it runs at every start and daily).`)
  checks.reconcile = rc ? `${rc.ok ? 'ok' : 'FAILED'} ${iso(rcT)} · corrected ${rc.corrected ?? 0} · missing ${rc.missing ?? 0}` : 'never'
  // 4. the daily recording audit — our misses / duplicates / out-of-order on all 12 series (holes Polygon also lacks are not ours)
  const au = I.audit, auT = au ? Date.parse(au.at) : null
  if (au && au.ok === false) { const bad = Object.entries(au.series ?? {}).filter(([, s]) => s.our_miss || s.dup || s.out_of_order).map(([k, s]) => `${k} (miss ${s.our_miss ?? 0}, dup ${s.dup}, order ${s.out_of_order})`)
    add('AUDIT_FAILED', 'CRITICAL', `Recording audit found problems on OUR side: ${bad.join(', ') || 'see recording_audit.json'}.`) }
  else if (!auT || now - auT > R.auditMaxAgeMs) add('AUDIT_OLD', 'WARN', `Daily recording audit has not run for ${auT ? ago(now - auT) : 'ever'} (it runs every day at 21:30 UTC).`)
  checks.recording_audit = au ? `${au.ok ? 'clean' : 'PROBLEMS'} ${iso(auT)} · ${Object.keys(au.series ?? {}).length} series` : 'never'
  // 5. the futures + GLD recorder — the process (exit codes, cadence) and its result (newest stored minute per futures series)
  const rec = I.recorder ?? [], recT = rec.length ? Date.parse(rec.at(-1).at) : null
  if (rec.length >= 2 && rec.slice(-2).every((r) => r.exit !== 0)) add('RECORDER_FAILED', 'CRITICAL', `Futures/GLD recorder failed twice in a row (last: ${String(rec.at(-1).tail || rec.at(-1).out || rec.at(-1).exit).slice(-160)}).`)
  if (checks.app === 'running' && (!recT || now - recT > R.recorderMaxGapMs)) add('RECORDER_NOT_RUNNING', 'CRITICAL', `Futures/GLD recorder has not run for ${recT ? ago(now - recT) : 'ever'} (every 15 min).`)
  const futBad = []
  for (const a of FUT) { const t = I.futLast?.[a], lim = R.futMaxAgeMs[a]
    if (t == null) { futBad.push(`${a} (no history)`); continue }
    const windowQuiet = !open || !marketOpen(now - lim) || futuresQuiet(now, I.calendar?.holidays) || futuresQuiet(now - lim, I.calendar?.holidays)
    if (!windowQuiet && now - t > lim) futBad.push(`${a} (last ${iso(t)}, ${ago(now - t)} ago)`) }
  if (futBad.length) add('FUTURES_STALE', 'CRITICAL', 'Futures minutes not being saved: ' + futBad.join(', ') + '.')
  checks.futures = FUT.map((a) => `${a} ${iso(I.futLast?.[a])}`).join(' · ') + (recT ? ` · recorder ${rec.at(-1).exit === 0 ? 'ok' : 'exit ' + rec.at(-1).exit} ${iso(recT)}` : '')
  // 6. the weekly full database check (verify_database.mjs, Saturdays) — minute-by-minute vs Polygon + GOLD_FUT vs the CME feed
  const vf = I.verify, vfT = vf ? Date.parse(vf.at) : null
  if (vf && vf.ok === false) add('VERIFY_FAILED', 'CRITICAL', `Full database check FAILED at ${iso(vfT)}: ${(vf.failures ?? []).slice(0, 4).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ').slice(0, 300)}.`)
  else if (!vfT || now - vfT > R.verifyMaxAgeMs) add('VERIFY_OLD', 'WARN', `Weekly full database check last ran ${vfT ? ago(now - vfT) + ' ago' : 'never'} (due every Saturday).`)
  checks.full_check = vf ? `${vf.ok ? 'all passed' : 'FAILED'} ${iso(vfT)}` : 'never'
  // 7. calendar / news / macro sources (CONTEXT — size, never direction) → WARN only
  const cal = I.calendar, calT = cal ? Date.parse(cal.at) : null, srcBad = Object.entries(cal?.sources ?? {}).filter(([, v]) => !v.ok).map(([k, v]) => `${k} (${String(v.error ?? 'failed').slice(0, 60)})`)
  if (srcBad.length) add('CALENDAR_SOURCE', 'WARN', 'Calendar source failing: ' + srcBad.join(', ') + ' — history keeps its old events.')
  if (!calT || now - calT > R.calendarMaxAgeMs) add('CALENDAR_OLD', 'WARN', `Calendar not refreshed for ${calT ? ago(now - calT) : 'ever'} (every 30 min).`)
  if ((I.history?.kept_from_previous ?? []).length) add('CALENDAR_KEPT', 'WARN', `Calendar history kept old rows for: ${I.history.kept_from_previous.join(', ')} (source down at the last refresh).`)
  const nSrc = Object.keys(cal?.sources ?? {}).length
  checks.calendar = cal ? `${nSrc - srcBad.length}/${nSrc} sources ok · ${I.history?.events?.length ?? 0} history events · ${iso(calT)}` : 'never'
  // 7b. the PRE-OPEN readiness check (preopen_check.mjs, 60 + 15 min before each open) — a failure stays visible until the open + 2 h
  const po = I.preopen, poOpen = po?.next_open ? Date.parse(po.next_open) : null
  if (po && po.ready === false && poOpen && now <= poOpen + 2 * H) add('PREOPEN_NOT_READY', 'WARN', `Pre-open check NOT READY (${po.slot} min before ${iso(poOpen)}): ${(po.checks ?? []).filter((c) => !c.ok).map((c) => `${c.name} — ${c.detail}`).join(' · ').slice(0, 300)}`)
  checks.preopen = po ? `${po.ready ? 'READY' : 'NOT READY'} ${iso(Date.parse(po.at))} (${(po.checks ?? []).filter((c) => c.ok).length}/${(po.checks ?? []).length} checks, for the ${iso(poOpen)} open)` : 'not run yet'
  // 8. disk space on the data drive (prevention: caught days before a full disk stops the stores)
  if (I.diskFreeGB != null && I.diskFreeGB < R.diskCritGB) add('DISK_FULL', 'CRITICAL', `Data drive almost full: ${I.diskFreeGB} GB free — new minutes cannot be saved safely.`)
  else if (I.diskFreeGB != null && I.diskFreeGB < R.diskWarnGB) add('DISK_LOW', 'WARN', `Data drive low: ${I.diskFreeGB} GB free (alarm at ${R.diskCritGB} GB).`)
  checks.disk = I.diskFreeGB != null ? `${I.diskFreeGB} GB free` : 'unknown'
  const state = issues.some((x) => x.sev === 'CRITICAL') ? 'STALE' : issues.length ? 'WARN' : 'OK'
  return { at: new Date(now).toISOString(), state, market_open: open, market, issues, checks }
}

/**
 * THE SIGNAL GATE — every signal path asks this. Halted ⇔ the last verdict is STALE, or the verdict file is missing / older than
 * healthMaxAgeMs (the watcher itself stopped → fail closed, RED RULE: unavailable = BLOCKED).
 * @returns {{halted:boolean, why:string|null, state:string|null}}
 */
export function signalsHalted({ now = Date.now(), file = HEALTH_FILE() } = {}) {
  const h = readJ(file)
  if (!h?.at) return { halted: true, why: 'data health check has not run (no data_health.json)', state: null }
  const age = now - Date.parse(h.at)
  if (!(age <= HEALTH_RULE.healthMaxAgeMs)) return { halted: true, why: `data health check is ${ago(age)} old — the watcher stopped`, state: h.state ?? null }
  if (h.state === 'STALE') return { halted: true, why: (h.issues ?? []).filter((x) => x.sev === 'CRITICAL').map((x) => x.text).join(' · ').slice(0, 400), state: 'STALE' }
  return { halted: false, why: null, state: h.state ?? null }
}

/**
 * PRE-OPEN SLOT (pure; run_twin schedules scripts/preopen_check.mjs with it). '60' = 45-60 min before the open, '15' = 5-15 min before, else
 * null. The 1-hour DAILY_BREAK has no '60' slot (that instant is the break's own start). @param ses = freshness.marketSession(now)
 */
export function preopenSlot(ses, now) {
  if (!ses || ses.open || !ses.next_open) return null
  const toMin = (ses.next_open - now) / 60000
  return toMin <= 60 && toMin > 45 && ses.status !== 'DAILY_BREAK' ? '60' : toMin <= 15 && toMin > 5 ? '15' : null
}

/**
 * ALERT STATE MACHINE (pure). An issue is ANNOUNCED once it has been seen on `confirm` consecutive ticks (CRITICAL 2, WARN 3 — one blip never
 * cries wolf; APP_DOWN / WATCHDOG_HALT 1: the watchdog only runs every 5 min), and RECOVERED once absent on 2 consecutive ticks.
 * @returns {{mem, raise:[issue], clear:[issue]}}
 */
export function alertTransitions(mem = {}, assessment) {
  const next = { ...mem }, raise = [], clear = [], seen = new Set(assessment.issues.map((x) => x.code))
  for (const x of assessment.issues) { const m = next[x.code] ?? { seen: 0, gone: 0, announced: false }
    const need = x.code === 'APP_DOWN' || x.code === 'WATCHDOG_HALT' ? 1 : x.sev === 'CRITICAL' ? 2 : 3
    const n = { ...m, seen: m.seen + 1, gone: 0, sev: x.sev, text: x.text }; if (!n.announced && n.seen >= need) { n.announced = true; raise.push(x) }
    next[x.code] = n }
  for (const [code, m] of Object.entries(mem)) { if (seen.has(code)) continue
    const n = { ...m, gone: m.gone + 1 }; if (n.gone >= 2) { if (m.announced) clear.push({ code, sev: m.sev, text: m.text }); delete next[code] } else next[code] = n }
  return { mem: next, raise, clear }
}
