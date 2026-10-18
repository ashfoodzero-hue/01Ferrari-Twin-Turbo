// smoke_data_health.mjs — the DATA HEALTH verdict + signal gate + alert machine (src/core/dataHealth.js, scripts/health_tick.mjs, 2026-10-18).
// Synthetic inputs prove every rule (STALE / WARN / closed market / reopen grace / futures quiet hours / holidays), the gate fails CLOSED, the
// alert machine announces once and recovers once, Telegram sends are BLOCKED while STALE, and every signal path + the chart + watchdog are wired.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessHealth, readHealthInputs, signalsHalted, alertTransitions, HEALTH_RULE } from '../src/core/dataHealth.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), src = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8')
console.log('\n██ DATA HEALTH SMOKE ██')
const MIN = 60000, H = 3600000, TUE = Date.parse('2026-10-20T10:00:00Z')
const healthy = (now, over = {}) => ({ now, fresh: { app: { alive: true }, flows: [] }, halted: false,
  stream: { symbols: Object.fromEntries(['XAUUSD', 'XAGUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF'].map((s) => [s, { settled_through: new Date(now - MIN).toISOString() }])) },
  reconcile: { at: new Date(now - 2 * H).toISOString(), ok: true, errors: [] }, audit: { at: new Date(now - 12 * H).toISOString(), ok: true, series: {} },
  verify: { at: new Date(now - 3 * 24 * H).toISOString(), ok: true, failures: [] },
  recorder: [{ at: new Date(now - 20 * MIN).toISOString(), exit: 0 }, { at: new Date(now - 5 * MIN).toISOString(), exit: 0 }],
  futLast: { GOLD_FUT: now - 20 * MIN, SILVER_FUT: now - 25 * MIN, WTI: now - 20 * MIN },
  calendar: { at: new Date(now - 10 * MIN).toISOString(), sources: { a: { ok: true }, b: { ok: true } }, holidays: [] }, history: { events: [1, 2], kept_from_previous: [] }, diskFreeGB: 300, ...over })
const codes = (a) => a.issues.map((x) => x.code).sort()

await ok('healthy inputs on an open Tuesday → OK, no issues, 10 check lines (incl. the market + silver/DXY stream), market OPEN', () => { const a = assessHealth(healthy(TUE)); assert.equal(a.state, 'OK'); assert.deepEqual(a.issues, []); assert.equal(Object.keys(a.checks).length, 10); assert.equal(a.market.status, 'OPEN'); assert(/live feed expected/.test(a.checks.market)) })
await ok('every CRITICAL rule → STALE (gold stream, reconcile, audit, full check, recorder ×2 failed, recorder silent, futures, halt, app down, live flow)', () => {
  const C = [
    ['XAU_STREAM', { stream: { symbols: { XAUUSD: { settled_through: new Date(TUE - 5 * MIN).toISOString() } } } }],
    ['RECONCILE_FAILED', { reconcile: { at: new Date(TUE - H).toISOString(), ok: false, errors: ['XAUUSD'] } }],
    ['AUDIT_FAILED', { audit: { at: new Date(TUE - H).toISOString(), ok: false, series: { XAUUSD: { our_miss: 3, dup: 0, out_of_order: 0 } } } }],
    ['VERIFY_FAILED', { verify: { at: new Date(TUE - H).toISOString(), ok: false, failures: ['XAUUSD: 2 different'] } }],
    ['RECORDER_FAILED', { recorder: [{ at: new Date(TUE - 20 * MIN).toISOString(), exit: 1 }, { at: new Date(TUE - 5 * MIN).toISOString(), exit: 1 }] }],
    ['RECORDER_NOT_RUNNING', { recorder: [{ at: new Date(TUE - 50 * MIN).toISOString(), exit: 0 }] }],
    ['FUTURES_STALE', { futLast: { GOLD_FUT: TUE - 50 * MIN, SILVER_FUT: TUE - 20 * MIN, WTI: TUE - 20 * MIN } }],
    ['WATCHDOG_HALT', { halted: true }],
    ['APP_DOWN', { fresh: { app: { alive: false, why: 'pid 1 is GONE' }, flows: [] } }], ['DISK_FULL', { diskFreeGB: 4.2 }],
    ['SYMBOL_STREAM', { stream: { symbols: { ...healthy(TUE).stream.symbols, EURUSD: { settled_through: new Date(TUE - 6 * MIN).toISOString() } } } }],
    ['FLOW_STALE', { fresh: { app: { alive: true }, flows: [{ file: 'signal_tiers.json', critical: true, state: 'STALE', why: 'age 4000s' }] } }]]
  for (const [code, over] of C) { const a = assessHealth(healthy(TUE, over)); assert.equal(a.state, 'STALE', code); assert(codes(a).includes(code), `${code} not raised: ${codes(a)}`); assert(a.issues.find((x) => x.code === code).sev === 'CRITICAL') }
})
await ok('WARN rules keep signals running: calendar source / calendar old / kept rows / reconcile + audit + full check overdue', () => {
  const W = [['CALENDAR_SOURCE', { calendar: { at: new Date(TUE - 5 * MIN).toISOString(), sources: { fed_fomc: { ok: false, error: 'HTTP 406' } }, holidays: [] } }],
    ['CALENDAR_OLD', { calendar: { at: new Date(TUE - 2 * H).toISOString(), sources: {}, holidays: [] } }], ['CALENDAR_KEPT', { history: { events: [], kept_from_previous: ['fed_fomc'] } }],
    ['RECONCILE_OLD', { reconcile: { at: new Date(TUE - 31 * H).toISOString(), ok: true } }], ['AUDIT_OLD', { audit: null }], ['VERIFY_OLD', { verify: { at: new Date(TUE - 9 * 24 * H).toISOString(), ok: true } }], ['DISK_LOW', { diskFreeGB: 12 }]]
  for (const [code, over] of W) { const a = assessHealth(healthy(TUE, over)); assert.equal(a.state, 'WARN', code); assert.deepEqual(codes(a), [code]) }
})
await ok('CLOSED MARKET (Saturday): an old gold stream / futures / live flow is correct, not stale — but a FAILED check still is', () => {
  const SAT = Date.parse('2026-10-17T12:00:00Z'), fri = Date.parse('2026-10-16T20:59:00Z')
  const a = assessHealth(healthy(SAT, { stream: { symbols: { XAUUSD: { settled_through: new Date(fri).toISOString() } } }, futLast: { GOLD_FUT: fri, SILVER_FUT: fri, WTI: fri },
    fresh: { app: { alive: true }, flows: [{ file: 'signal_tiers.json', critical: true, state: 'STALE', why: 'x' }] } }))
  assert.equal(a.state, 'OK', codes(a).join(','))
  assert.equal(assessHealth(healthy(SAT, { reconcile: { at: new Date(SAT - H).toISOString(), ok: false, errors: ['XAUUSD'] } })).state, 'STALE')
})
await ok('MARKET WORKING TIME is stated: weekend / Christmas / winter Sunday → CLOSED with the reason + the next open; no live-feed alarm while closed', () => {
  const fri = Date.parse('2026-10-16T20:59:00Z'), oldFeed = { stream: { symbols: { XAUUSD: { settled_through: new Date(fri).toISOString() } } }, futLast: { GOLD_FUT: fri, SILVER_FUT: fri, WTI: fri } }
  const sat = assessHealth(healthy(Date.parse('2026-10-17T12:00:00Z'), oldFeed)); assert.equal(sat.market.status, 'WEEKEND'); assert.equal(sat.market.next_open, '2026-10-18T22:00:00.000Z'); assert(/CLOSED — weekend .* no live feed expected · opens 2026-10-18 22:00 UTC/.test(sat.checks.market), sat.checks.market); assert.equal(sat.state, 'OK')
  const xmas = assessHealth(healthy(Date.parse('2026-12-25T15:00:00Z'), oldFeed)); assert.equal(xmas.market.status, 'HOLIDAY'); assert(/Christmas/.test(xmas.market.label)); assert.equal(xmas.market.next_open, '2026-12-27T23:00:00.000Z'); assert(!codes(xmas).includes('XAU_STREAM'))
  const win = assessHealth(healthy(Date.parse('2026-11-08T22:30:00Z'), oldFeed)); assert.equal(win.market.status, 'WEEKEND'); assert(!codes(win).some((c) => ['XAU_STREAM', 'FLOW_STALE', 'FUTURES_STALE'].includes(c)), 'winter Sunday 22:30Z is still closed')
})
await ok(`REOPEN GRACE: Sunday 22:10 UTC with Friday-old live files and stream → no alarm; Sunday 22:50 (> ${HEALTH_RULE.reopenGraceMs / MIN} min) → STALE`, () => {
  const fri = Date.parse('2026-10-16T20:59:00Z'), over = (now) => ({ stream: { symbols: { XAUUSD: { settled_through: new Date(fri).toISOString() } } }, futLast: { GOLD_FUT: now - 5 * MIN, SILVER_FUT: now - 5 * MIN, WTI: now - 5 * MIN },
    fresh: { app: { alive: true }, flows: [{ file: 'signal_tiers.json', critical: true, state: 'STALE', why: 'x' }] } })
  const t1 = Date.parse('2026-10-18T22:10:00Z'), t2 = Date.parse('2026-10-18T22:50:00Z')
  assert.equal(assessHealth(healthy(t1, over(t1))).state, 'OK'); const b = assessHealth(healthy(t2, over(t2))); assert.equal(b.state, 'STALE'); assert.deepEqual(codes(b), ['FLOW_STALE', 'SYMBOL_STREAM', 'XAU_STREAM'])
})
await ok('FUTURES quiet hours: no futures alarm while the window touches 21:00-22:59 UTC (CME break, both DST seasons) or a US holiday closure', () => {
  const t = Date.parse('2026-10-20T23:20:00Z'), old = { futLast: { GOLD_FUT: t - 90 * MIN, SILVER_FUT: t - 90 * MIN, WTI: t - 90 * MIN } }
  assert(!codes(assessHealth(healthy(t, old))).includes('FUTURES_STALE'), 'window 22:35-23:20 touches hour 22')
  const t2 = Date.parse('2026-10-20T23:59:00Z'), old2 = { futLast: { GOLD_FUT: t2 - 90 * MIN, SILVER_FUT: t2 - 30 * MIN, WTI: t2 - 30 * MIN } }
  assert(codes(assessHealth(healthy(t2, old2))).includes('FUTURES_STALE'), 'window 23:14-23:59 is clear of the break → a 90-min-old GOLD_FUT is stale')
  const hol = Date.parse('2026-11-26T15:00:00Z'), cal = { at: new Date(hol - 5 * MIN).toISOString(), sources: {}, holidays: [{ date: '2026-11-26', status: 'closed' }] }
  assert(!codes(assessHealth(healthy(hol, { ...old, calendar: cal, futLast: { GOLD_FUT: hol - 5 * H, SILVER_FUT: hol - 5 * H, WTI: hol - 5 * H } }))).includes('FUTURES_STALE'), 'Thanksgiving closed')
})
await ok('SIGNAL GATE fails CLOSED: no verdict → halted · verdict older than 10 min → halted · STALE → halted with the reason · fresh OK/WARN → open', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-')), f = path.join(dir, 'h.json'), now = Date.now(), w = (o) => fs.writeFileSync(f, JSON.stringify(o))
  assert.equal(signalsHalted({ file: f, now }).halted, true)
  w({ at: new Date(now - 11 * MIN).toISOString(), state: 'OK', issues: [] }); assert(/watcher stopped/.test(signalsHalted({ file: f, now }).why))
  w({ at: new Date(now - MIN).toISOString(), state: 'STALE', issues: [{ sev: 'CRITICAL', text: 'Gold minutes not confirmed' }, { sev: 'WARN', text: 'cal' }] })
  const s = signalsHalted({ file: f, now }); assert(s.halted && s.why === 'Gold minutes not confirmed')
  for (const st of ['OK', 'WARN']) { w({ at: new Date(now - MIN).toISOString(), state: st, issues: [] }); assert.equal(signalsHalted({ file: f, now }).halted, false) }
  fs.rmSync(dir, { recursive: true, force: true })
})
await ok('ALERTS announce once and recover once: CRITICAL on the 2nd tick, WARN on the 3rd, APP_DOWN at once; a 1-tick blip never alerts; recovered after 2 clear ticks', () => {
  const A = (...cs) => ({ issues: cs.map(([code, sev]) => ({ code, sev, text: code })) })
  let m = {}, r
  r = alertTransitions(m, A(['XAU_STREAM', 'CRITICAL'], ['CALENDAR_SOURCE', 'WARN'], ['APP_DOWN', 'CRITICAL'])); m = r.mem; assert.deepEqual(r.raise.map((x) => x.code), ['APP_DOWN'])
  r = alertTransitions(m, A(['XAU_STREAM', 'CRITICAL'], ['CALENDAR_SOURCE', 'WARN'])); m = r.mem; assert.deepEqual(r.raise.map((x) => x.code), ['XAU_STREAM']); assert.deepEqual(r.clear, [])
  r = alertTransitions(m, A(['XAU_STREAM', 'CRITICAL'], ['CALENDAR_SOURCE', 'WARN'])); m = r.mem; assert.deepEqual(r.raise.map((x) => x.code), ['CALENDAR_SOURCE']); assert.deepEqual(r.clear.map((x) => x.code), ['APP_DOWN'])
  r = alertTransitions(m, A(['XAU_STREAM', 'CRITICAL'], ['CALENDAR_SOURCE', 'WARN'])); m = r.mem; assert.deepEqual(r.raise, [])   // no repeat
  r = alertTransitions(m, A()); m = r.mem; assert.deepEqual(r.clear, []); r = alertTransitions(m, A()); m = r.mem; assert.deepEqual(r.clear.map((x) => x.code).sort(), ['CALENDAR_SOURCE', 'XAU_STREAM']); assert.deepEqual(m, {})
  r = alertTransitions({}, A(['RECONCILE_FAILED', 'CRITICAL'])); r = alertTransitions(r.mem, A()); r = alertTransitions(r.mem, A()); assert.deepEqual(r.raise, []); assert.deepEqual(r.clear, [])   // blip: silent both ways
})
await ok('TELEGRAM is BLOCKED while STALE (nothing sent, the reason returned); the health watcher messages bypass the gate', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-')), f = path.join(dir, 'h.json'); process.env.TWIN_DATA_HEALTH_FILE = f
  fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), state: 'STALE', issues: [{ sev: 'CRITICAL', text: 'test stale' }] }))
  const { sendText } = await import('../src/master/telegram.js')
  const r = await sendText('smoke', { token: 'smoke-token', chatId: 'smoke-chat', log: false }); assert.equal(r.sent, false); assert.equal(r.blocked, 'DATABASE_STALE'); assert.equal(r.why, 'test stale')
  assert(/bypassHealth: true/.test(src('scripts', 'health_tick.mjs')), 'health messages must bypass the gate')
  delete process.env.TWIN_DATA_HEALTH_FILE; fs.rmSync(dir, { recursive: true, force: true })
})
await ok('WIRING: run_twin runs health_tick every 2 min (first in the loop) + verify_database Saturdays; twin / matrix / forward test gate; chart banner flashes; watchdog runs it when HALTED', () => {
  const rt = src('scripts', 'run_twin.mjs'); assert(/health_tick\.mjs/.test(rt) && /now - lastHealth >= 120000/.test(rt)); assert(rt.indexOf('health_tick.mjs') < rt.indexOf("matrixTick(last3m)"), 'health runs before the signal ticks')
  assert(/wd === 6 && mins >= 6 \* 60/.test(rt) && /verify_database\.mjs/.test(rt))
  assert(/signalsHalted\(\)\.halted \? `DATABASE STALE/.test(src('scripts', 'twin_tick.mjs')))
  const mt = src('scripts', 'matrix_tick.mjs'); assert.equal((mt.match(/!health\.halted && B\.length/g) || []).length, 2, 'both matrix branches (box + watch) gated')
  assert(/signalsHalted\(\); if \(h\.halted\)/.test(src('scripts', 'inv90', 'forward_buyd1.mjs')))
  assert(/if \(!bypassHealth\) \{ const h = signalsHalted\(\)/.test(src('src', 'master', 'telegram.js')))
  const pg = src('ops', 'chart', 'index.html'); assert(/id="dbHealth"/.test(pg) && /@keyframes dbflash/.test(pg) && /DATABASE STALE — SIGNALS STOPPED/.test(pg) && /fetch\('\/api\/health'\)/.test(pg))
  assert(/'\/api\/health'/.test(src('scripts', 'run_chart.mjs'))); assert(/health_tick\.mjs/.test(src('ops', 'watchdog_twin.mjs')))
})
await ok('REAL files: the live inputs produce a verdict with all 10 checks (whatever its state today)', () => {
  const a = assessHealth(readHealthInputs()); assert(['OK', 'WARN', 'STALE'].includes(a.state)); assert.deepEqual(Object.keys(a.checks).sort(), ['app', 'calendar', 'disk', 'full_check', 'futures', 'gold_stream', 'market', 'reconcile', 'recording_audit', 'stream_symbols'])
})
console.log(process.exitCode ? '✗ DATA HEALTH SMOKE FAILED' : `✅ DATA HEALTH SMOKE: ${n} passed, 0 failed`)
