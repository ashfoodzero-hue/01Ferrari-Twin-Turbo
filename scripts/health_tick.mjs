// ════════════════════════════════════════════════════════════════════════════════
// health_tick.mjs — the DATA HEALTH watcher (2026-10-18; Ashraf: alerts to the Twin Turbo Telegram group, stop signals + red flashing
// "DATABASE STALE" on the app, and a daily "all data OK"). Rules: src/core/dataHealth.js (ONE place).
// Run by run_twin every 2 min (+ at start), and by the external watchdog when the app is HALTED (then nothing else could report it).
// ────────────────────────────────────────────────────────────────────────────────
// Writes data/master/data_health.json (the verdict the signal gate + chart read) and data/master/data_health_alerts.json (alert memory).
// Telegram (bypasses the signal gate — health messages are the point): 🟥 DATABASE STALE (signals stopped) · 🟧 DATA WARNING · ✅ recovered ·
// 🔁 watchdog restarted the app · 🟩 daily check once per UTC day at/after 21:45 UTC (after the 21:30 recording audit).
// --dry = compute + print, write nothing, send nothing · --now=ISO = judge as of that instant (replay seam; implies nothing about writes).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { readHealthInputs, assessHealth, alertTransitions, HEALTH_FILE } from '../src/core/dataHealth.js'
import { sendText } from '../src/master/telegram.js'

const DRY = process.argv.includes('--dry'), nowArg = process.argv.find((a) => a.startsWith('--now='))
const now = nowArg ? Date.parse(nowArg.slice(6)) : Date.now()
const MEM = path.join(TURBO.master, 'data_health_alerts.json'), LEDGER = path.join(TURBO.root, 'data', 'self_heal', 'heal_ledger.jsonl')
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const writeAtomic = (f, o) => { fs.writeFileSync(f + '.tmp', JSON.stringify(o, null, 1)); fs.renameSync(f + '.tmp', f) }
const HEAD = '🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const A = assessHealth(readHealthInputs(now))
const prev = readJ(MEM) ?? { issues: {}, ledgerT: now, dailyDay: null }
const { mem, raise, clear } = alertTransitions(prev.issues ?? {}, A)
const msgs = []
const crit = raise.filter((x) => x.sev === 'CRITICAL'), warn = raise.filter((x) => x.sev === 'WARN')
if (crit.length) msgs.push(`${HEAD}\n🟥 <b>DATABASE STALE — signals STOPPED</b>\n${crit.map((x) => '• ' + esc(x.text)).join('\n')}\n• market: ${esc(A.market.note)}\n\nThe app shows a flashing red DATABASE STALE banner. Signals resume by themselves when this clears.`)
if (warn.length) msgs.push(`${HEAD}\n🟧 <b>DATA WARNING</b> (signals continue)\n${warn.map((x) => '• ' + esc(x.text)).join('\n')}`)
if (clear.length) msgs.push(`${HEAD}\n✅ <b>${A.state === 'STALE' ? 'PARTLY RECOVERED' : 'DATA OK AGAIN'}</b>${clear.some((x) => x.sev === 'CRITICAL') && A.state !== 'STALE' ? ' — signals resumed' : ''}\n${clear.map((x) => '• cleared: ' + esc(x.text.slice(0, 160))).join('\n')}`)
// watchdog restarts since the last tick (an EVENT, not a state: the app is already back when this runs)
const restarts = (() => { try { return fs.readFileSync(LEDGER, 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((r) => r && r.t > (prev.ledgerT ?? now) && r.t <= now && (r.action === 'start' || r.action === 'halt')) } catch { return [] } })()
if (restarts.length) msgs.push(`${HEAD}\n🔁 <b>APP ${restarts.some((r) => r.action === 'halt') ? 'HALTED' : 'RESTARTED'} by the watchdog</b>\n${restarts.map((r) => `• ${new Date(r.t).toISOString().slice(0, 16).replace('T', ' ')} UTC — ${esc(r.action)}: ${esc(r.why)}`).join('\n')}`)
// daily check — proves the watcher itself is alive (silence = something is wrong)
const day = new Date(now).toISOString().slice(0, 10), mins = new Date(now).getUTCHours() * 60 + new Date(now).getUTCMinutes()
let dailyDay = prev.dailyDay ?? null
if (mins >= 21 * 60 + 45 && dailyDay !== day) { dailyDay = day
  const C = A.checks, mark = A.state === 'OK' ? '🟩 <b>Daily data check: ALL OK</b>' : A.state === 'WARN' ? '🟧 <b>Daily data check: OK with warnings</b>' : '🟥 <b>Daily data check: DATABASE STALE — signals stopped</b>'
  msgs.push(`${HEAD}\n${mark}\n• market: ${esc(C.market)}\n• app: ${esc(C.app)} · gold stream: ${esc(C.gold_stream)}\n• gap repair: ${esc(C.reconcile)}\n• recording audit: ${esc(C.recording_audit)}\n• futures: ${esc(C.futures)}\n• weekly full check: ${esc(C.full_check)}\n• calendar: ${esc(C.calendar)}\n• disk: ${esc(C.disk)}${A.issues.length ? '\n' + A.issues.map((x) => `${x.sev === 'CRITICAL' ? '🟥' : '🟧'} ${esc(x.text)}`).join('\n') : ''}`) }

const out = { ...A, signals_halted: A.state === 'STALE', announced: Object.entries(mem).filter(([, m]) => m.announced).map(([k]) => k) }
console.log(`  🩺 data health: ${A.state} · market ${A.market.status}${A.issues.length ? ' — ' + A.issues.map((x) => `${x.sev === 'CRITICAL' ? '🟥' : '🟧'}${x.code}`).join(' ') : ''}${msgs.length ? ` · 📨 ${msgs.length} message(s)` : ''}`)
if (DRY) { console.log(JSON.stringify({ verdict: out, messages: msgs }, null, 1)); process.exit(0) }
writeAtomic(HEALTH_FILE(), out)
const sent = []
for (const m of msgs) sent.push(await sendText(m, { bypassHealth: true }))
// memory is saved AFTER the sends: a send that failed on the network is retried next tick only for the daily line (states re-announce on change)
writeAtomic(MEM, { at: new Date(now).toISOString(), state: A.state, codes: A.issues.map((x) => x.code).sort().join(','), issues: mem, ledgerT: now, dailyDay, last_sent: sent.map((r) => ({ sent: !!r?.sent, dry: !!r?.dryRun, status: r?.status ?? null })) })
// history: one row per CHANGE of state / issue set (or a message), not one per 2-min tick
const codes = A.issues.map((x) => x.code).sort().join(',')
if (msgs.length || prev.state !== A.state || prev.codes !== codes) fs.appendFileSync(path.join(TURBO.master, 'data_health_history.jsonl'), JSON.stringify({ at: out.at, state: A.state, codes: A.issues.map((x) => x.code), messages: msgs.length }) + '\n')
