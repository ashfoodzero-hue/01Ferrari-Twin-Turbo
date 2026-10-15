// setup.mjs — Ferrari Twin Turbo INSTALLER (2026-10-16; Ashraf: "a sub folder … this App to be installed independent on any PC with full
// setting, and to request the required API keys"). Run by INSTALL.cmd from the copied app folder (any folder, any PC). Paper app.
//   1. checks Node (≥ 22)                          5. tops up price history from Polygon (resumable — only months missing since the copy)
//   2. clears runtime leftovers from the source PC  6. registers the 5-min watchdog task (+ at logon) and a Desktop shortcut
//   3. writes launchers for THIS folder + THIS node 7. starts the app and opens the live chart (http://127.0.0.1:7444)
//   4. opens the ⚙ API keys page (http://127.0.0.1:7445) — keys are typed there, tested live, saved to THIS folder's .env only
// Flags: --no-history (skip 5) · --no-task (skip 6) · --no-start (skip 7) · --yes (no questions; needs .env already holding POLYGON_API_KEY)
//        test only: --task-name=NAME (register under another name) · --no-shortcut
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), NODE = process.execPath, A = new Set(process.argv.slice(2))
const TASK = [...A].find((x) => x.startsWith('--task-name='))?.slice(12) || 'FerrariTwinTurbo_Watchdog', SETTINGS = 'http://127.0.0.1:7445', CHART = 'http://127.0.0.1:7444'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = async (q, def = 'y') => A.has('--yes') ? def : ((await rl.question(q)).trim().toLowerCase() || def)
const say = (s) => console.log(s), step = (n, s) => console.log(`\n[${n}/7] ${s}`)
const envHas = (k) => { try { return new RegExp(`^\\s*${k}\\s*=\\s*\\S+`, 'm').test(fs.readFileSync(path.join(ROOT, '.env'), 'utf8')) } catch { return false } }
const openUrl = (u) => spawn('cmd.exe', ['/c', 'start', '', u], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
const runNode = (args, label) => { say(`   → ${label}`); const r = spawnSync(NODE, args, { cwd: ROOT, stdio: 'inherit', windowsHide: true }); if (r.status !== 0) say(`   ⚠ ${label} ended with code ${r.status} — the app's own reconcile retries every 30 min after it starts`); return r.status === 0 }

say('══════════════════════════════════════════════════════════════')
say('  FERRARI TWIN TURBO — installer        folder: ' + ROOT)
say('══════════════════════════════════════════════════════════════')
// 1 ─ Node
step(1, 'Node.js'); const major = +process.versions.node.split('.')[0]
if (major < 22) { say(`   ✗ Node ${process.versions.node} is too old — install Node 22 or newer (https://nodejs.org, LTS) and run INSTALL.cmd again.`); process.exit(1) }
say(`   ✓ Node ${process.versions.node} at ${NODE}`)
// 2 ─ leftovers from the PC the copy came from (a stale lock / pid could make the watchdog think the app already runs)
step(2, 'clearing runtime files copied from the source PC')
const leftovers = ['data/master/run_twin.lock', 'data/master/run_stream.lock', 'data/master/stream_heartbeat.json', 'data/master/live_heartbeat.json', 'data/self_heal/WATCHDOG_HALT.marker']
for (const f of leftovers) { const p = path.join(ROOT, f); if (fs.existsSync(p)) { fs.rmSync(p); say('   removed ' + f) } }
say('   ✓ clean')
// 3 ─ launchers bound to THIS folder and THIS node.exe
step(3, 'writing launchers for this folder')
fs.writeFileSync(path.join(ROOT, 'ops', 'Ferrari_Twin_Turbo.cmd'), [
  '@echo off', 'title Ferrari Twin Turbo', `cd /d "${ROOT}"`,
  'rem make sure the app is running (the watchdog starts it only if it is down; it never kills anything)', `"${NODE}" ops\\watchdog_twin.mjs`,
  'rem give a fresh start a moment to bring the chart server up, then open the live chart in the default browser', 'timeout /t 6 /nobreak >nul', `start "" "${CHART}"`,
  ':loop', 'cls', `"${NODE}" scripts\\status.mjs`, `echo   Live chart: ${CHART}   ^|   API keys: ${SETTINGS}   ^|   this window refreshes every 30 s - close it any time (the app keeps running).`,
  'timeout /t 30 >nul', 'goto loop', ''].join('\r\n'))
fs.writeFileSync(path.join(ROOT, 'ops', 'watchdog_launch.vbs'), [
  "' watchdog_launch.vbs — run the twin's watchdog with NO console window (Task Scheduler, every 5 min and at logon). Written by ops/setup.mjs.",
  'Set sh = CreateObject("WScript.Shell")', `sh.CurrentDirectory = "${ROOT}"`, `sh.Run """${NODE}"" ops\\watchdog_twin.mjs", 0, False`, ''].join('\r\n'))
say('   ✓ ops\\Ferrari_Twin_Turbo.cmd + ops\\watchdog_launch.vbs')
// 4 ─ API keys (the same ⚙ page the running app serves)
step(4, 'API keys')
say('   ⚠ ONE POLYGON KEY = ONE LIVE TICK CONNECTION (measured): if this key already streams on another PC, the two apps will keep')
say('     knocking each other off. Stop the app on the other PC first, or use a second Polygon key / plan for this PC.')
if (!A.has('--yes') || !envHas('POLYGON_API_KEY')) {
  const srv = spawn(NODE, [path.join(ROOT, 'scripts', 'run_settings.mjs')], { cwd: ROOT, stdio: 'ignore', windowsHide: true })
  await new Promise((r) => setTimeout(r, 1500)); openUrl(SETTINGS)
  say(`   The API keys page is open in your browser (${SETTINGS}).`)
  say('   • Polygon (Massive) key — REQUIRED: live gold ticks, DXY pairs, history. Press Test: you want "history ✓ · live ticks ✓".')
  say('   • Telegram bot token + chat id — for the TRADE SETUP READY messages (Entry, SL, TP1, TP2, TP3). Test sends a message.')
  say('   • Databento / FRED — optional research tools.')
  for (;;) { await ask('   Press Enter after you pressed 💾 Save … ', ''); if (envHas('POLYGON_API_KEY')) break; say('   ✗ no Polygon key saved yet — the app cannot read prices without it.') }
  try { srv.kill() } catch { /* the app starts its own copy */ }
}
say('   ✓ Polygon key saved' + (envHas('TWIN_TELEGRAM_BOT_TOKEN') && envHas('TWIN_TELEGRAM_CHAT_ID') ? ' · Telegram alerts ON' : ' · Telegram not set (alerts are logged only — add them any time with ⚙ API keys on the chart)'))
// 5 ─ history top-up (the import skips finished months; the reconcile re-checks the last 30 days against Polygon)
step(5, 'price history top-up from Polygon')
if (A.has('--no-history')) say('   skipped (--no-history)')
else if ((await ask('   Download the minutes missing since this copy was made? [Y/n] ')) !== 'n') {
  let built = Date.now() - 31 * 86400000; try { built = Math.min(built, Date.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'VERSION.json'), 'utf8')).built_at)) } catch { /* no VERSION.json → last 31 days */ }
  let lite = false; try { lite = !!JSON.parse(fs.readFileSync(path.join(ROOT, 'VERSION.json'), 'utf8')).lite } catch { /* full */ }
  const month = lite ? '2013-07' : new Date(built).toISOString().slice(0, 7)   // the build month (or earlier) — every month after it is fetched; LITE = all history (slow)
  // 🚨 the import REBUILDS 1m.jsonl from data/history/<SYM>/_parts and SKIPS a month whose part exists. The build month's part was partial
  // when copied (the streamer's later minutes live only in 1m.jsonl) — kept, the rebuild would DROP those minutes. So every part from the
  // build month on is removed first and re-fetched whole from Polygon.
  const hist = path.join(ROOT, 'data', 'history'); let removed = 0
  for (const sym of fs.existsSync(hist) ? fs.readdirSync(hist) : []) { const pd = path.join(hist, sym, '_parts'); if (!fs.existsSync(pd)) continue
    for (const f of fs.readdirSync(pd)) if (/^\d{4}-\d{2}\.jsonl$/.test(f) && f.slice(0, 7) >= month) { fs.rmSync(path.join(pd, f)); removed++ } }
  say(`   ${removed} partial month file(s) from ${month} on will be re-fetched`)
  runNode(['--max-old-space-size=4096', 'scripts/import_history_1m.mjs', '', month], `import_history_1m (from ${month}, finished months skipped)`)
  runNode(['--max-old-space-size=4096', 'scripts/reconcile_1m.mjs', '30'], 'reconcile_1m 30 days')
} else say('   skipped — the app reconciles the last 7-30 days by itself 2 min after it starts')
// 6 ─ watchdog task + Desktop shortcut
step(6, 'auto-start (Task Scheduler) + Desktop shortcut')
// 🛡 an existing watchdog task for ANOTHER folder = the app is already installed here (e.g. INSTALL.cmd run from the package on the main PC):
// replacing it would move auto-start to this copy and run two apps that fight for the one tick connection → ask, default NO.
const existing = (() => { const q = spawnSync('schtasks.exe', ['/query', '/tn', TASK, '/xml'], { encoding: 'utf8', windowsHide: true }); return q.status === 0 ? (/<WorkingDirectory>([^<]*)<\/WorkingDirectory>/.exec(q.stdout)?.[1] ?? '?') : null })()
const otherInstall = existing && path.resolve(existing).toLowerCase() !== ROOT.toLowerCase()
let keptOther = false
if (otherInstall) say(`   ⚠ this PC already auto-starts Ferrari Twin Turbo from: ${existing}`)
if (A.has('--no-task')) say('   skipped (--no-task)')
else if (otherInstall && (A.has('--yes') || (await ask('   Move auto-start to THIS folder instead? Two copies must never run together. [y/N] ', 'n')) !== 'y')) { keptOther = true; say('   kept the existing auto-start — this copy was NOT registered') }
else {
  const user = `${process.env.USERDOMAIN || ''}\\${process.env.USERNAME || ''}`, start = ((d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19))(new Date(Date.now() + 60000))   // LOCAL time: Task Scheduler reads a zone-less boundary as local
  const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Ferrari Twin Turbo: start run_twin (tick stream + paper tick) if it is down. Never kills. ops\\watchdog_twin.mjs; off switch data\\self_heal\\WATCHDOG_HALT.marker.</Description></RegistrationInfo>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType></Principal></Principals>
  <Settings><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable></Settings>
  <Triggers><TimeTrigger><StartBoundary>${start}</StartBoundary><Repetition><Interval>PT5M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition></TimeTrigger>
    <LogonTrigger><UserId>${user.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</UserId></LogonTrigger></Triggers>
  <Actions Context="Author"><Exec><Command>wscript.exe</Command><Arguments>"${path.join(ROOT, 'ops', 'watchdog_launch.vbs')}"</Arguments><WorkingDirectory>${ROOT}</WorkingDirectory></Exec></Actions>
</Task>`
  const xf = path.join(ROOT, 'data', 'master', 'watchdog_task.xml'); fs.mkdirSync(path.dirname(xf), { recursive: true }); fs.writeFileSync(xf, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, 'utf16le')]))
  const r = spawnSync('schtasks.exe', ['/create', '/tn', TASK, '/xml', xf, '/f'], { encoding: 'utf8', windowsHide: true })
  say(r.status === 0 ? `   ✓ task ${TASK}: every 5 min + at logon (starts the app only if it is down)` : `   ✗ task not created: ${(r.stderr || r.stdout || '').trim()}`)
  if (A.has('--no-shortcut')) say('   shortcut skipped (--no-shortcut)')
  else try { execFileSync('powershell.exe', ['-NoProfile', '-Command', `$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\Ferrari Twin Turbo.lnk');$s.TargetPath='${path.join(ROOT, 'ops', 'Ferrari_Twin_Turbo.cmd').replace(/'/g, "''")}';$s.WorkingDirectory='${ROOT.replace(/'/g, "''")}';$s.Save()`], { windowsHide: true }); say('   ✓ Desktop shortcut "Ferrari Twin Turbo"') } catch (e) { say('   ⚠ shortcut not created: ' + e.message) }
}
// 7 ─ start
step(7, 'start')
if (A.has('--no-start')) say('   skipped (--no-start) — start it with the Desktop shortcut')
else if (keptOther) say('   NOT started — another installed copy owns this PC (two copies would fight for the one Polygon tick connection)')
else { runNode(['ops/watchdog_twin.mjs'], 'watchdog: start the app if it is down'); await new Promise((r) => setTimeout(r, 8000)); openUrl(CHART); say(`   ✓ live chart: ${CHART}   ·   ⚙ API keys: ${SETTINGS} (button on the chart)`) }
say('\n✅ Ferrari Twin Turbo installed. PAPER app: boxes + Telegram notices only, it never places an order.')
rl.close()
