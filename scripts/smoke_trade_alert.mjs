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
  const a = scalpSetup(buy); const r1 = await alertSetup(a, { now: T + 60000, send: fake, ledger }), r2 = await alertSetup(a, { now: T + 120000, send: fake, ledger })
  assert(r1.sent && r2.skipped === 'already alerted' && sent.length === 1)
})
await ok('stale setups are not sent (backfilled swing, late scalp)', async () => {
  const r = await alertSetup(swingSetup({ ...swing, id: 'old', late_min: 6492 }), { send: fake, ledger }); assert(/stale/.test(r.skipped))
  const r2 = await alertSetup(scalpSetup({ ...sell, decisionT: T }), { now: T + 31 * 60000, send: fake, ledger }); assert(/stale/.test(r2.skipped)); assert.equal(sent.length, 1)
})
await ok('TWIN_ALERT_SCALP=0 / TWIN_ALERT_SWING=0 switch a kind off', async () => {
  process.env.TWIN_ALERT_SCALP = '0'; process.env.TWIN_ALERT_SWING = 'off'
  const r = await alertSetup(scalpSetup({ ...sell, decisionT: T + 1 }), { now: T + 60000, send: fake, ledger }), r2 = await alertSetup(swingSetup({ ...swing, id: 'x2' }), { send: fake, ledger })
  delete process.env.TWIN_ALERT_SCALP; delete process.env.TWIN_ALERT_SWING; assert(/off/.test(r.skipped) && /off/.test(r2.skipped) && sent.length === 1)
})
await ok('a failing sender never throws out of alertSetup and is not marked alerted', async () => {
  const a = scalpSetup({ ...buy, decisionT: T + 2 }); const r = await alertSetup(a, { now: T + 60000, send: async () => { throw new Error('network down') }, ledger })
  assert(r.error === 'network down'); assert(!JSON.parse(fs.readFileSync(ledger, 'utf8'))[a.id])
})
await ok('👁 SCALP PREPARE: header + the WATCH study numbers (82.3 % / 6 min / 40.3 % recall); once per watch episode (45 min); a failing sender never throws; never while a trade is open', async () => {
  const { formatPrepareAlert, alertPrepare } = await import('../src/master/tradeAlert.js'), { WATCH } = await import('../src/master/ferrariMatrix.js')
  const w = { side: 'BUY', line: 4150.5, measured: WATCH }, txt = formatPrepareAlert(w, 4149.2)
  assert(txt.startsWith('🏎🏎 <b>FERRARI TWIN TURBO</b>') && txt.includes('SCALP PREPARE — WATCH BUY') && txt.includes('82.3%') && txt.includes('median 6 min') && txt.includes('40.3%') && txt.includes('SHADOW'))
  const pl = path.join(tmp, 'prep.json'), seen = []; const fk = async (t) => { seen.push(t); return { sent: true } }
  const a = await alertPrepare(w, 4149.2, { now: T, send: fk, ledger: pl }), b = await alertPrepare(w, 4149.2, { now: T + 20 * 60000, send: fk, ledger: pl }), c = await alertPrepare(w, 4149.2, { now: T + 50 * 60000, send: fk, ledger: pl })
  assert(a.sent && b.skipped && c.sent && seen.length === 2)
  const e = await alertPrepare(w, 1, { now: T + 200 * 60000, send: async () => { throw new Error('down') }, ledger: pl }); assert(e.error === 'down')
  assert(fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8').includes('if (out.watch && !out.open) { const r = await alertPrepare('))
})
await ok('STATIC: both live hooks are wired (matrix_tick SCALP after the state write; forward arms SWING per new signal)', async () => {
  const m = fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8'), f = fs.readFileSync(path.join(here, 'inv90', 'forward_buyd1.mjs'), 'utf8')
  assert(m.indexOf('alertSetup(scalpSetup(') > m.indexOf('fs.renameSync(STATE + \'.tmp\', STATE)')); assert(/for \(const s of add\) \{ const r = await alertSetup\(swingSetup\(/.test(f))
  assert(f.startsWith('// ') && f.includes("import '../../src/core/bootEnv.js'"))
})
fs.rmSync(tmp, { recursive: true, force: true })
console.log(process.exitCode ? '✗ TRADE ALERT SMOKE FAILED' : `✅ TRADE ALERT SMOKE: ${n} passed, 0 failed`)
