// ════════════════════════════════════════════════════════════════════════════════
// preopen_check.mjs — PRE-OPEN READINESS (2026-10-18; Ashraf: "make an early preventive action to avoid 100% stale data flow to our system for
// the ticks for XAU, DXY, Silver, WTI … confirming that our data base is healthy … before time"). Approved: "Pre-open readiness check".
// run_twin runs it 60 and 15 min before every open (marketSession.next_open); the daily-break reopen only at T-15 and only reports NOT READY.
// ────────────────────────────────────────────────────────────────────────────────
// Everything on OUR side that would make the open stale is tested while there is still time to fix it:
//   1. POLYGON reachable + key/plan accepted (marketstatus) · failure classified (network / plan / rate limit / code — freshness.classifyFailure)
//   2. PC CLOCK vs Polygon's server clock (the minute logic needs it) — NOT READY beyond ±10 s
//   3. STORE = POLYGON on the last 60 stored minutes of every streamed symbol (XAU, XAG, the 6 DXY pairs; the verify_database rule: o/h/l/c equal)
//      and of every futures series (GOLD_FUT, SILVER_FUT, WTI; o/h/l/c + volume, per contract)
//   4. TICK STREAM process up, connected, all 8 symbols subscribed (it stays connected over the weekend), heartbeat fresh
//   5. DATA HEALTH verdict not STALE (app, recorder, audit, gap repair, full check, disk …)
// It cannot stop Polygon itself failing at the open — that is caught live within 4 min by dataHealth (signals stop, Telegram, red banner).
// --slot=60|15 · --quiet-if-ready (no Telegram when READY) · --dry (print only) · writes data/master/preopen_check.json (+ history jsonl)
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'
import { loadBars } from '../src/data/backfillReader.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'
import { marketSession, classifyFailure, heartbeatLive } from '../src/core/freshness.js'
import { sendText } from '../src/master/telegram.js'

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const DRY = process.argv.includes('--dry'), QUIET = process.argv.includes('--quiet-if-ready'), SLOT = arg('slot') ?? 'manual'
const now = Date.now(), KEY = polygonKey(), CLOCK_MAX_S = 10, N = 60
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const same = (a, b) => ['o', 'h', 'l', 'c'].every((k) => Math.abs(a[k] - b[k]) < 1e-9)   // verify_database.mjs rule
const tail = (f, n) => { try { const size = fs.statSync(f).size, fd = fs.openSync(f, 'r'), len = Math.min(size, 512 * 1024), buf = Buffer.alloc(len)
  try { fs.readSync(fd, buf, 0, len, size - len) } finally { fs.closeSync(fd) }
  return buf.toString('utf8').split('\n').slice(1).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean).slice(-n) } catch { return [] } }
const pget = async (p) => { const r = await fetchJsonResilient(`https://api.polygon.io${p}${p.includes('?') ? '&' : '?'}apiKey=${KEY}`, { timeoutMs: 15000 }); if (!r.ok) throw new Error(`HTTP ${r.status} ${r.json?.message ?? r.json?.error ?? ''}`.trim()); return r.json }
const checks = []
const add = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`) }
const ses = marketSession(now)
console.log(`\n██ PRE-OPEN READINESS (${SLOT}) — market ${ses.status}${ses.next_open ? ', opens ' + new Date(ses.next_open).toISOString().slice(0, 16) + ' UTC' : ''} ██`)

// 1. Polygon reachable + plan accepted
let polygonUp = false
if (!KEY) add('Polygon key', false, 'no POLYGON_API_KEY in .env')
else try { const j = await pget('/v1/marketstatus/now'); polygonUp = true; add('Polygon reachable + plan accepted', true, `market status served (fx ${j?.currencies?.fx ?? '?'})`) }
catch (e) { const c = classifyFailure(e.message); add('Polygon reachable + plan accepted', false, `${c.label} — ${String(e.message).slice(0, 120)} · ${c.advice ?? ''}`) }

// 2. PC clock vs Polygon server clock (Date header, half the round trip allowed for)
try { const t0 = Date.now(), r = await fetch('https://api.polygon.io/v1/marketstatus/now?apiKey=' + KEY, { signal: AbortSignal.timeout(15000) }), t1 = Date.now(), srv = Date.parse(r.headers.get('date'))
  if (!Number.isFinite(srv)) throw new Error('no Date header')
  const skew = ((t0 + t1) / 2 - srv) / 1000, ok = Math.abs(skew) <= CLOCK_MAX_S + (t1 - t0) / 2000 + 1   // Date header has 1-s resolution
  add('PC clock vs Polygon', ok, `${skew >= 0 ? '+' : ''}${skew.toFixed(1)} s (round trip ${t1 - t0} ms, limit ±${CLOCK_MAX_S} s)${ok ? '' : ' — fix Windows time sync (Settings → Time → Sync now)'}`) }
catch (e) { add('PC clock vs Polygon', false, `could not read Polygon's clock — ${String(e.message).slice(0, 100)}`) }

// 3a. store = Polygon, streamed symbols (last N stored minutes, read the way every study reads them)
if (polygonUp) for (const s of SYMBOLS) {
  try { const mine = (await loadBars(s.sym, '1m', { from: now - 10 * 86400000 })).bars.slice(-N); if (!mine.length) { add(`${s.sym} store = Polygon`, false, 'no stored minutes'); continue }
    const rest = (await pget(`/v2/aggs/ticker/${s.poly}/range/1/minute/${mine[0].t}/${mine.at(-1).t}?limit=5000&sort=asc`)).results ?? [], m = new Map(rest.map((r) => [r.t, r]))
    let ident = 0, diff = 0, miss = 0; for (const b of mine) { const r = m.get(b.t); if (!r) miss++; else if (same(b, r)) ident++; else diff++ }
    add(`${s.sym} store = Polygon`, diff === 0 && miss === 0, `${ident}/${mine.length} last minutes identical${diff ? `, ${diff} DIFFERENT` : ''}${miss ? `, ${miss} not at Polygon` : ''} (last ${new Date(mine.at(-1).t).toISOString().slice(0, 16)})`) }
  catch (e) { add(`${s.sym} store = Polygon`, false, `${classifyFailure(e.message).label} — ${String(e.message).slice(0, 100)}`) } }
// 3b. store = Polygon, futures (per contract, price + volume)
if (polygonUp) for (const a of ['GOLD_FUT', 'SILVER_FUT', 'WTI']) {
  try { const mine = tail(path.join(TURBO.historyAsset(a), '1m.jsonl'), N); if (!mine.length) { add(`${a} store = Polygon`, false, 'no stored minutes'); continue }
    let ident = 0, diff = 0, miss = 0
    for (const tk of [...new Set(mine.map((b) => b.tk))]) { const my = mine.filter((b) => b.tk === tk)
      const rest = (await pget(`/futures/v1/aggs/${tk}?resolution=1min&window_start.gte=${my[0].t * 1e6}&window_start.lte=${my.at(-1).t * 1e6}&limit=5000&sort=window_start.asc`)).results ?? []
      const m = new Map(rest.map((x) => [Math.round(x.window_start / 1e6), x]))
      for (const b of my) { const x = m.get(b.t); if (!x) miss++; else if (same(b, { o: x.open, h: x.high, l: x.low, c: x.close }) && b.v === (x.volume ?? 0)) ident++; else diff++ } }
    add(`${a} store = Polygon`, diff === 0 && miss === 0, `${ident}/${mine.length} last minutes identical (price + volume)${diff ? `, ${diff} DIFFERENT` : ''}${miss ? `, ${miss} not at Polygon` : ''} (last ${new Date(mine.at(-1).t).toISOString().slice(0, 16)})`) }
  catch (e) { add(`${a} store = Polygon`, false, `${classifyFailure(e.message).label} — ${String(e.message).slice(0, 100)}`) } }

// 4. the tick stream: process alive, connected, every symbol subscribed, heartbeat fresh
{ const sh = readJ(path.join(TURBO.master, 'stream_heartbeat.json')), age = sh?.at ? (Date.now() - Date.parse(sh.at)) / 1000 : null, alive = heartbeatLive(sh).alive
  const missing = SYMBOLS.map((s) => s.sym).filter((s) => !sh?.symbols?.[s])
  const ok = !!sh && alive === true && sh.connected === true && age != null && age <= 30 && !missing.length
  add('Tick stream connected + subscribed', ok, sh ? `${alive ? 'process up' : 'PROCESS DOWN'} · ${sh.connected ? 'connected' : 'NOT CONNECTED'} · ${SYMBOLS.length - missing.length}/${SYMBOLS.length} symbols${missing.length ? ' (missing ' + missing.join(', ') + ')' : ''} · heartbeat ${age?.toFixed(0)} s old · reconnects ${sh.reconnects ?? '?'}` : 'no stream heartbeat — the stream has never run') }

// 5. the data health verdict (app, recorder, audit, gap repair, full check, disk …)
{ const h = readJ(path.join(TURBO.master, 'data_health.json')), age = h?.at ? (Date.now() - Date.parse(h.at)) / 60000 : null
  const crit = (h?.issues ?? []).filter((x) => x.sev === 'CRITICAL')
  add('Data health verdict', !!h && age <= 10 && h.state !== 'STALE', h ? `${h.state} (${age.toFixed(0)} min old)${crit.length ? ' — ' + crit.map((x) => x.text).join(' · ').slice(0, 300) : ''}` : 'no verdict — the health watcher has not run') }

const ready = checks.every((c) => c.ok), out = { at: new Date(now).toISOString(), slot: SLOT, market: ses.status, next_open: ses.next_open ? new Date(ses.next_open).toISOString() : null, ready, checks }
console.log(ready ? '✅ READY for the open' : `🟥 NOT READY: ${checks.filter((c) => !c.ok).map((c) => c.name).join(', ')}`)
if (DRY) process.exit(0)
fs.writeFileSync(path.join(TURBO.master, 'preopen_check.json.tmp'), JSON.stringify(out, null, 1)); fs.renameSync(path.join(TURBO.master, 'preopen_check.json.tmp'), path.join(TURBO.master, 'preopen_check.json'))
fs.appendFileSync(path.join(TURBO.master, 'preopen_history.jsonl'), JSON.stringify({ at: out.at, slot: SLOT, market: ses.status, next_open: out.next_open, ready, failed: checks.filter((c) => !c.ok).map((c) => c.name) }) + '\n')
if (!ready || !QUIET) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), when = ses.next_open ? `opens ${new Date(ses.next_open).toISOString().slice(0, 16).replace('T', ' ')} UTC (in ${Math.round((ses.next_open - now) / 60000)} min)` : ''
  const okN = checks.filter((c) => c.ok).length, fails = checks.filter((c) => !c.ok)
  const text = `🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎\n${ready ? '✅ <b>PRE-OPEN CHECK: READY</b>' : '🟥 <b>PRE-OPEN CHECK: NOT READY</b> — fix before the open'}\n• market ${esc(ses.status.toLowerCase().replace('_', ' '))} · ${esc(when)}\n• ${okN}/${checks.length} checks passed (Polygon + plan, PC clock, XAU / XAG / DXY pairs / gold + silver + WTI futures = Polygon, tick stream, data health)${fails.length ? '\n' + fails.map((c) => `🟥 ${esc(c.name)}: ${esc(c.detail)}`).join('\n') : ''}`
  const r = await sendText(text, { bypassHealth: true }); console.log(`  📨 telegram: ${r?.sent ? 'sent' : r?.dryRun ? 'dry run' : 'FAILED ' + (r?.error ?? r?.status)}`) }
