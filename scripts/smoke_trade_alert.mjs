// smoke_trade_alert.mjs — Telegram "TRADE SETUP READY" alerts (src/master/tradeAlert.js, 2026-10-16). No network: the sender is injected.
// Checks: the card shows ENTRY / SL / TP1 / TP2 / TP3 with the right side ordering; reference TPs are LABELLED; one alert per id;
// stale setups and switched-off kinds are never sent; a throwing sender never throws out of alertSetup; both live hooks are wired.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scalpSetup, swingSetup, formatSetupAlert, alertSetup } from '../src/master/tradeAlert.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twin-alert-')), ledger = path.join(tmp, 'alerted.json')
const T = Date.parse('2026-10-15T17:12:00Z')
const buy = { side: 'BUY', entry: 4150, sl: 4140, tp1: 4160, tp2: 4170, decisionT: T }, sell = { side: 'SELL', entry: 4150, sl: 4160, tp1: 4140, tp2: 4130, decisionT: T }
const swing = { id: 'BUY_D1x_2026-10-15T17:00:00.000Z', t: T, entry_ask: 4193.49, target: 4208.28, stop: 4045.54, late_min: 9 }
const YES = () => true   // the 92 % WR rule is bypassed ONLY in these message tests; the real rule is checked at the end
const sent = []; const fake = async (text) => { sent.push(text); return { sent: true, status: 200 } }
console.log('\n██ TRADE ALERT SMOKE ██')
await ok('SCALP card: ENTRY, SL, TP1, TP2, TP3 in side order; only TP3 is labelled reference', async () => {
  for (const s of [buy, sell]) { const a = scalpSetup(s), up = s.side === 'BUY'
    assert(up ? a.sl < a.entry && a.entry < a.tp1 && a.tp1 < a.tp2 && a.tp2 < a.tp3 : a.sl > a.entry && a.entry > a.tp1 && a.tp1 > a.tp2 && a.tp2 > a.tp3)
    const txt = formatSetupAlert(a); assert(txt.startsWith('🏎🏎 <b>FERRARI TWIN TURBO</b>'), 'the first line must name the app (shared group)'); for (const k of ['TRADE SETUP READY — SCALP', 'ENTRY <b>4150.00', 'SL <b>', 'TP1 <b>', 'TP2 <b>', 'TP3 <b>']) assert(txt.includes(k), k)
    assert.equal((txt.match(/reference — not in the measured exit/g) || []).length, 1) }
  assert(formatSetupAlert(scalpSetup(buy)).includes('TP3 <b>4180.00</b> <i>(reference'))
})
await ok('SWING TRADE card: TP1 = the measured target; TP2/TP3 equal steps, labelled reference', async () => {
  const a = swingSetup(swing, { arm: 'p92' }), txt = formatSetupAlert(a)
  assert.equal(a.tp1, 4208.28); assert(Math.abs(a.tp3 - a.tp2 - (a.tp2 - a.tp1)) < 1e-9 && a.sl < a.entry && a.entry < a.tp1)
  assert(txt.includes('TRADE SETUP READY — SWING TRADE') && txt.includes('TP1 <b>4208.28</b>\n')); assert.equal((txt.match(/reference — not in the measured exit/g) || []).length, 2)
})
await ok('one alert per setup id (re-runs do not resend)', async () => {
  const a = scalpSetup(buy); const r1 = await alertSetup(a, { now: T + 60000, allowed: YES, send: fake, ledger }), r2 = await alertSetup(a, { now: T + 120000, allowed: YES, send: fake, ledger })
  assert(r1.sent && r2.skipped === 'already alerted' && sent.length === 1)
})
await ok('stale setups are not sent (backfilled swing, late scalp)', async () => {
  const r = await alertSetup(swingSetup({ ...swing, id: 'old', late_min: 6492 }), { allowed: YES, send: fake, ledger }); assert(/stale/.test(r.skipped))
  const r2 = await alertSetup(scalpSetup({ ...sell, decisionT: T }), { now: T + 31 * 60000, allowed: YES, send: fake, ledger }); assert(/stale/.test(r2.skipped)); assert.equal(sent.length, 1)
})
await ok('TWIN_ALERT_SCALP=0 / TWIN_ALERT_SWING=0 switch a kind off', async () => {
  process.env.TWIN_ALERT_SCALP = '0'; process.env.TWIN_ALERT_SWING = 'off'
  const r = await alertSetup(scalpSetup({ ...sell, decisionT: T + 1 }), { now: T + 60000, allowed: YES, send: fake, ledger }), r2 = await alertSetup(swingSetup({ ...swing, id: 'x2' }), { allowed: YES, send: fake, ledger })
  delete process.env.TWIN_ALERT_SCALP; delete process.env.TWIN_ALERT_SWING; assert(/off/.test(r.skipped) && /off/.test(r2.skipped) && sent.length === 1)
})
await ok('a failing sender never throws out of alertSetup and is not marked alerted', async () => {
  const a = scalpSetup({ ...buy, decisionT: T + 2 }); const r = await alertSetup(a, { now: T + 60000, allowed: YES, send: async () => { throw new Error('network down') }, ledger })
  assert(r.error === 'network down'); assert(!JSON.parse(fs.readFileSync(ledger, 'utf8'))[a.id])
})
await ok('👁 SCALP PREPARE: header + the WATCH study numbers (82.3 % / 6 min / 40.3 % recall); once per watch episode (45 min); a failing sender never throws; never while a trade is open', async () => {
  const { formatPrepareAlert, alertPrepare } = await import('../src/master/tradeAlert.js'), { WATCH } = await import('../src/master/ferrariMatrix.js')
  const w = { side: 'BUY', line: 4150.5, measured: WATCH }, txt = formatPrepareAlert(w, 4149.2)
  assert(txt.startsWith('🏎🏎 <b>FERRARI TWIN TURBO</b>') && txt.includes('SCALP PREPARE — WATCH BUY') && txt.includes('82.3%') && txt.includes('median 6 min') && txt.includes('40.3%') && txt.includes('SHADOW'))
  const pl = path.join(tmp, 'prep.json'), seen = []; const fk = async (t) => { seen.push(t); return { sent: true } }
  const a = await alertPrepare(w, 4149.2, { now: T, allowed: YES, send: fk, ledger: pl }), b = await alertPrepare(w, 4149.2, { now: T + 20 * 60000, allowed: YES, send: fk, ledger: pl }), c = await alertPrepare(w, 4149.2, { now: T + 50 * 60000, allowed: YES, send: fk, ledger: pl })
  assert(a.sent && b.skipped && c.sent && seen.length === 2)
  const e = await alertPrepare(w, 1, { now: T + 200 * 60000, allowed: YES, send: async () => { throw new Error('down') }, ledger: pl }); assert(e.error === 'down')
  // 2026-10-20: never while the V1H gate blocks BUYs (the 17:18 PREPARE announced a BUY the gate then vetoed)
  assert(fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8').includes('if (out.watch && !out.open && !out.structureGate.blocksBuy) { const r = await alertPrepare('))
})
await ok('🧭 SCALP BLOCKED (2026-10-20): ONE notice per blocked episode (blockedSince), later vetoes of the stretch silent, a new stretch notifies again; no episode → nothing; card names the reason + entry; never throws', async () => {
  const { formatBlockedAlert, alertBlocked } = await import('../src/master/tradeAlert.js')
  const g = { state: 'DOWN', blockedSince: T - 30 * 60000 }, txt = formatBlockedAlert(buy, g)
  assert(txt.startsWith('🏎🏎 <b>FERRARI TWIN TURBO</b>') && txt.includes('SCALP BLOCKED — BUY not opened') && txt.includes('ENTRY <b>4150.00</b>') && txt.includes('1H structure DOWN') && txt.includes('NOT messaged') && txt.includes('not an order'))
  const bl = path.join(tmp, 'blk.json'), seen = []; const fk = async (t) => { seen.push(t); return { sent: true } }
  const a = await alertBlocked(buy, g, { now: T, allowed: YES, send: fk, ledger: bl }), b = await alertBlocked({ ...buy, decisionT: T + 180000 }, g, { now: T + 180000, allowed: YES, send: fk, ledger: bl })
  const c = await alertBlocked({ ...buy, decisionT: T + 3600000 }, { ...g, blockedSince: T + 3000000 }, { now: T + 3600000, allowed: YES, send: fk, ledger: bl })
  assert(a.sent && b.skipped === 'episode already notified' && c.sent && seen.length === 2)
  assert((await alertBlocked(buy, { state: 'DOWN', blockedSince: null }, { allowed: YES, send: fk, ledger: bl })).skipped === 'no blocked episode' && seen.length === 2)
  assert((await alertBlocked(buy, { ...g, blockedSince: T + 9e6 }, { allowed: YES, send: async () => { throw new Error('down') }, ledger: bl })).error === 'down')
  const m = fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8')
  assert(m.includes('if (blocked) { const r = await alertBlocked(blocked, out.structureGate)') && m.indexOf('alertBlocked(blocked') > m.indexOf("fs.renameSync(STATE + '.tmp', STATE)"), 'sent after the state write')
  assert(m.includes('state.structureGate?.blocksBuy && state.structureGate.blockedSince ? state.structureGate.blockedSince : lastClose'), 'the episode carries over tick to tick')
})
await ok('sendText RETRY: a network failure twice then OK → sent on attempt 3; a 4xx is final (1 attempt); all failing → never throws', async () => {
  const { sendText } = await import('../src/master/telegram.js'), real = globalThis.fetch; let calls = 0
  try {   // bypassHealth: this checks the RETRY mechanics only — the data health gate has its own proof (smoke_data_health)
    globalThis.fetch = async () => { calls++; if (calls < 3) throw Object.assign(new Error('fetch failed'), { cause: { code: 'ETIMEDOUT' } }); return { ok: true, status: 200, json: async () => ({ ok: true }) } }
    const a = await sendText('retry test', { token: 't', chatId: '1', log: false, bypassHealth: true }); assert(a.sent && a.attempts === 3, JSON.stringify(a))
    calls = 0; globalThis.fetch = async () => { calls++; return { ok: false, status: 400, json: async () => ({ ok: false, description: 'chat not found' }) } }
    const b = await sendText('4xx test', { token: 't', chatId: '1', log: false, bypassHealth: true }); assert(!b.sent && calls === 1)
    calls = 0; globalThis.fetch = async () => { calls++; throw new Error('down') }
    const c = await sendText('down test', { token: 't', chatId: '1', log: false, bypassHealth: true }); assert(!c.sent && c.error && calls === 3)
  } finally { globalThis.fetch = real }
})
await ok('STATIC: both live hooks are wired (matrix_tick SCALP after the state write; forward arms SWING per new signal)', async () => {
  const m = fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8'), f = fs.readFileSync(path.join(here, 'inv90', 'forward_buyd1.mjs'), 'utf8')
  assert(m.indexOf('alertSetup(scalpSetup(') > m.indexOf('fs.renameSync(STATE + \'.tmp\', STATE)')); assert(f.includes("for (const s of TELEGRAM && ARM !== 'freq' ? add : []) { const r = await alertSetup(swingSetup(") && /TELEGRAM = false/.test(f), 'swing arms silent since 2026-10-28 (record only); the hook stays wired behind TELEGRAM')
  assert(f.startsWith('// ') && f.includes("import '../../src/core/bootEnv.js'"))
})
await ok('SCALP LOUD WARNING (labels, never blocks): gate numbers on line 2, silver line info-only; a non-confirming silver still sends; matrix_tick passes gate + silver', async () => {
  const txt = formatSetupAlert(scalpSetup(buy, { gate: { oos_net: -0.91, oos_wr: 0.2 }, silverUp: false })), L = txt.split('\n')
  assert(L[1].includes('SHADOW system') && L[1].includes('−$0.91/trade') && L[1].includes('20% full wins') && L[1].includes('NOT a trade recommendation'), L[1])
  assert(txt.includes('silver 3m does NOT confirm ❌') && txt.includes('info only'))
  assert(formatSetupAlert(scalpSetup(buy, { gate: { oos_net: 0.5 }, silverUp: true })).includes('+$0.50/trade') && formatSetupAlert(scalpSetup(sell, { silverUp: false })).includes('silver 3m CONFIRMS ✅'))
  assert(!formatSetupAlert(scalpSetup(buy)).includes('SHADOW system'), 'no gate → no invented numbers')
  const k = sent.length, r = await alertSetup(scalpSetup({ ...buy, decisionT: Date.now() }, { gate: { oos_net: -0.91 }, silverUp: false }), { allowed: YES, send: fake, ledger }); assert(r.sent && sent.length === k + 1, 'a warned setup is still sent')
  assert(fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8').includes('scalpSetup(opened, { verdict: verdict.verdict, gate: verdict, silverUp })'))
})
await ok('THE 92 % WR RULE (2026-10-28): with the REAL gate every trade alert is skipped while its signal measures < 92 %; nothing is sent, nothing marked alerted', async () => {
  const g = await import('../src/master/wrGate.js'), M = g.measuredWr()
  assert.equal(g.MIN_WR, 0.92)
  for (const k of ['SCALP', 'SCALP85', 'ML_SELL', 'SWING', 'IMPULSE_CONT']) assert(Number.isFinite(M[k].wr) && M[k].wr < g.MIN_WR, `${k} measured ${M[k].wr} (the rule's premise today)`)
  const { alertPrepare, alertBlocked } = await import('../src/master/tradeAlert.js'), k = sent.length, gl = path.join(tmp, 'gate.json')
  const rs = [await alertSetup(scalpSetup({ ...buy, decisionT: Date.now() }), { send: fake, ledger: gl }), await alertSetup(swingSetup({ ...swing, id: 'g1', late_min: 1 }), { send: fake, ledger: gl }),
    await alertPrepare({ measured: {} }, 4000, { send: fake, ledger: gl }), await alertBlocked(buy, { state: 'DOWN', blockedSince: T }, { send: fake, ledger: gl })]
  assert(rs.every((r) => /below the 92% WR rule/.test(r.skipped)), JSON.stringify(rs)); assert.equal(sent.length, k); assert(!fs.existsSync(gl), 'nothing marked alerted')
  assert(!g.tradeAllowed('NO_SUCH_SIGNAL') && !g.tradeAllowed('SCALP', { SCALP: { wr: null } }), 'unknown / unmeasured → blocked (fail-closed)')
  assert(g.tradeAllowed('SCALP', { SCALP: { wr: 0.93 } }) && !g.tradeAllowed('SCALP', { SCALP: { wr: 0.9199 } }), '≥ 92 % passes, below does not')
  assert(fs.readFileSync(path.join(here, 'twin_tick.mjs'), 'utf8').includes("if (!tradeAllowed('IMPULSE_CONT'))"), 'IMPULSE_CONT alerts go through the same rule')
})
fs.rmSync(tmp, { recursive: true, force: true })
console.log(process.exitCode ? '✗ TRADE ALERT SMOKE FAILED' : `✅ TRADE ALERT SMOKE: ${n} passed, 0 failed`)
