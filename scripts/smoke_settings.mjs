// smoke_settings.mjs — the ⚙ API keys page (scripts/run_settings.mjs, 2026-10-16). Runs it on a spare port against a TEMP .env (never the real one).
// Checks: keys are never returned in full; saves need the page token (+ same origin, allowed Host); a save keeps every other line, keeps a
// .env.previous, blank = keep; bad values refused; the chart server stays read-only; run_twin supervises the settings server.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), PORT = 7459, BASE = `http://127.0.0.1:${PORT}`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twin-settings-')), ENV = path.join(tmp, '.env')
fs.writeFileSync(ENV, '# my comment\r\nPOLYGON_API_KEY=abcdef123456WXYZ\r\nTURBO_TELEGRAM_CHAT_ID=-1009\r\n')
console.log('\n██ SETTINGS (API KEYS) SMOKE ██')
const env = { ...process.env, TWIN_SETTINGS_PORT: String(PORT), TWIN_ENV_FILE: ENV }; delete env.POLYGON_API_KEY
const child = spawn(process.execPath, [path.join(here, 'run_settings.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/api/state'); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
const rawHost = (host) => new Promise((done) => { const r = http.request({ host: '127.0.0.1', port: PORT, path: '/api/state', headers: { host } }, (res) => { res.resume(); done(res.statusCode) }); r.end() })
try {
  const html = await (await fetch(BASE + '/')).text(), TOKEN = /const TOKEN="([0-9a-f]{48})"/.exec(html)?.[1]
  const post = (p, b, h = {}) => fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) })
  await ok('page serves with a per-start token; state shows Polygon as set ••••WXYZ and never the full key', async () => {
    assert(TOKEN && html.includes('API Keys'))
    const s = await (await fetch(BASE + '/api/state')).json(), p = s.find((x) => x.key === 'POLYGON_API_KEY')
    assert(p.set && p.shown === '••••WXYZ'); assert(!JSON.stringify(s).includes('abcdef123456'))
  })
  await ok('refused: no token (403), wrong token (403), foreign Origin (403), foreign Host header (403)', async () => {
    assert.equal((await post('/api/save', { FRED_API_KEY: 'x1' })).status, 403)
    assert.equal((await post('/api/save', { FRED_API_KEY: 'x1' }, { 'x-twin-token': 'f'.repeat(48) })).status, 403)
    assert.equal((await post('/api/save', { FRED_API_KEY: 'x1' }, { 'x-twin-token': TOKEN, origin: 'https://evil.example' })).status, 403)
    assert.equal(await rawHost('evil.example:7459'), 403); assert(!fs.readFileSync(ENV, 'utf8').includes('FRED_API_KEY'))
  })
  await ok('save: replaces in place, appends new keys, keeps comments + other keys, writes .env.previous; blank keeps the stored value', async () => {
    const r = await (await post('/api/save', { POLYGON_API_KEY: 'NEWKEY987', TWIN_TELEGRAM_CHAT_ID: '-100123456', TWIN_ALERT_SWING: '0', FRED_API_KEY: '', NOT_A_FIELD: 'zz' }, { 'x-twin-token': TOKEN, origin: BASE })).json()
    assert(r.ok && r.restart === true); assert.deepEqual(r.saved.sort(), ['POLYGON_API_KEY', 'TWIN_ALERT_SWING', 'TWIN_TELEGRAM_CHAT_ID'])
    const t = fs.readFileSync(ENV, 'utf8'); assert(t.startsWith('# my comment\r\nPOLYGON_API_KEY=NEWKEY987\r\nTURBO_TELEGRAM_CHAT_ID=-1009\r\n'))
    assert(t.includes('TWIN_TELEGRAM_CHAT_ID=-100123456') && t.includes('TWIN_ALERT_SWING=0') && !t.includes('NOT_A_FIELD') && !t.includes('FRED_API_KEY'))
    assert(fs.readFileSync(ENV + '.previous', 'utf8').includes('POLYGON_API_KEY=abcdef123456WXYZ'))
  })
  await ok('bad values refused (chat id not a number, toggle not 0/1, a key with a line break) and nothing written', async () => {
    const before = fs.readFileSync(ENV, 'utf8'), h = { 'x-twin-token': TOKEN }
    for (const b of [{ TWIN_TELEGRAM_CHAT_ID: 'mychat' }, { TWIN_ALERT_SCALP: 'yes' }, { POLYGON_API_KEY: 'a\nEVIL=1' }]) assert.equal((await (await post('/api/save', b, h)).json()).ok, false)
    assert.equal(fs.readFileSync(ENV, 'utf8'), before)
  })
  await ok('STATIC: binds 127.0.0.1 only; the chart server still never writes; run_twin supervises the settings server', async () => {
    assert(/listen\(PORT, '127\.0\.0\.1'/.test(fs.readFileSync(path.join(here, 'run_settings.mjs'), 'utf8')))
    assert(!/writeFileSync|appendFileSync|createWriteStream/.test(fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8')))
    assert(fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8').includes("'run_settings.mjs'"))
  })
} finally { child.kill(); fs.rmSync(tmp, { recursive: true, force: true }) }
console.log(process.exitCode ? '✗ SETTINGS SMOKE FAILED' : `✅ SETTINGS SMOKE: ${n} passed, 0 failed`)
