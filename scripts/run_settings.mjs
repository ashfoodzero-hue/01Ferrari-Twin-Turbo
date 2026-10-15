// run_settings.mjs — ⚙ API KEYS & ALERTS page (2026-10-16; Ashraf: "make sort of Tab on the app that enable me save all these API keys
// inside it and save"). http://127.0.0.1:7445 — supervised by run_twin.mjs; also used by the installer (INSTALL.cmd) for first setup.
// ────────────────────────────────────────────────────────────────────────────────
// The chart server (run_chart.mjs) stays READ-ONLY by contract; THIS is the only process that writes <ROOT>/.env.
// SAFETY: binds 127.0.0.1 only · Host must be 127.0.0.1/localhost:<port> (DNS-rebinding) · every POST needs the per-start random token
// that exists only inside the served page + a same-origin Origin (no other web page can write your keys) · keys are NEVER sent back to
// the browser (only "set ••••abcd") · a blank field keeps the stored value · every other .env line is kept · the previous file is kept
// as .env.previous · each key has a live TEST against its own service before you save.
// Takes effect: Telegram + alert switches → the next tick (each tick re-reads .env). A CHANGED Polygon/Databento key → restart the app.
import '../src/core/bootEnv.js'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { parseEnv } from '../src/core/env.js'
import { fetchAggs } from '../src/data/liveFeed.js'

const PORT = +(process.env.TWIN_SETTINGS_PORT || 7445), ENV = process.env.TWIN_ENV_FILE || path.join(TURBO.root, '.env'), TOKEN = crypto.randomBytes(24).toString('hex')
export const FIELDS = [
  { key: 'POLYGON_API_KEY', label: 'Polygon (Massive) API key', need: 'REQUIRED — live gold + DXY pairs + history (forex real-time plan)', secret: true },
  { key: 'TWIN_TELEGRAM_BOT_TOKEN', label: 'Telegram bot token', need: 'for TRADE SETUP READY messages (from @BotFather)', secret: true },
  { key: 'TWIN_TELEGRAM_CHAT_ID', label: 'Telegram chat id', need: 'your chat / group id (a group id starts with -100)', secret: false },
  { key: 'DATABENTO_API_KEY', label: 'Databento API key', need: 'optional — CME order-flow / whale research tools', secret: true },
  { key: 'FRED_API_KEY', label: 'FRED API key', need: 'optional — macro series (no live tool uses it today)', secret: true },
  { key: 'TWIN_ALERT_SCALP', label: 'Telegram: SCALP alerts', need: '1 = on, 0 = off', secret: false, toggle: true },
  { key: 'TWIN_ALERT_SWING', label: 'Telegram: SWING TRADE alerts', need: '1 = on, 0 = off', secret: false, toggle: true },
]
const readEnvText = () => { try { return fs.readFileSync(ENV, 'utf8') } catch { return '' } }
const mask = (v, secret) => !v ? null : secret ? '••••' + v.slice(-4) : v
export function publicState(text = readEnvText()) { const e = parseEnv(text); return FIELDS.map((f) => ({ key: f.key, label: f.label, need: f.need, toggle: !!f.toggle, set: !!e[f.key], shown: mask(e[f.key], f.secret) })) }

/** Merge updates into .env text: replace KEY= lines in place, append new ones, keep every other line. Pure (tested). */
export function mergeEnv(text, updates) {
  const lines = text ? text.split(/\r?\n/) : [], done = new Set()
  const out = lines.map((l) => { const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(l); if (m && m[1] in updates && !done.has(m[1])) { done.add(m[1]); return `${m[1]}=${updates[m[1]]}` } return l })
  while (out.length && out.at(-1) === '') out.pop()
  for (const [k, v] of Object.entries(updates)) if (!done.has(k)) out.push(`${k}=${v}`)
  return out.join('\r\n') + '\r\n'
}
export function cleanUpdates(body) {
  const up = {}, allowed = new Map(FIELDS.map((f) => [f.key, f]))
  for (const [k, raw] of Object.entries(body || {})) { const f = allowed.get(k); if (!f) continue
    const v = String(raw ?? '').trim(); if (!v) continue                                  // blank = keep the stored value
    if (/[\r\n=\s"']/.test(v) && !f.toggle) throw new Error(`${k}: spaces, quotes, = or line breaks are not allowed`)
    if (f.toggle && !/^[01]$/.test(v)) throw new Error(`${k}: use 1 or 0`)
    if (k === 'TWIN_TELEGRAM_CHAT_ID' && !/^-?\d{4,20}$/.test(v)) throw new Error('chat id must be a number (a group id starts with -100)')
    up[k] = v }
  return up
}
// ── live tests: the value typed (or, when blank, the stored one) against its own service ──
const T = (ms) => AbortSignal.timeout(ms)
// 🎯 THE TICK FEED (Ashraf: "we need it to read ticks same as what we have now"): the SAME socket, auth and gold channel as src/data/tickStream.js.
// MEASURED 2026-10-15 21:22 UTC: Polygon allows ONE tick connection per key and a new socket KNOCKS THE RUNNING ONE OFF (live stream got
// max_connections, reconnected 1 s later, REST refilled the gap). So when THIS PC's stream is live
// (fresh heartbeat, connected) the test reports that instead of opening another one.
export async function testTicks(key, { timeoutMs = 12000, skipHeartbeat = false } = {}) {
  if (!skipHeartbeat) try { const hb = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'stream_heartbeat.json'), 'utf8'))
    if (hb.connected && Date.now() - Date.parse(hb.at) < 120000) return { ok: true, msg: `— this PC's tick stream is already connected (gold bid ${hb.symbols?.XAUUSD?.bid ?? '?'}); not opening a second socket` } } catch { /* no stream here yet */ }
  return await new Promise((done) => {
    let ws, authed = false; const end = (r) => { clearTimeout(timer); try { ws.close() } catch { /* */ } done(r) }
    const timer = setTimeout(() => end(authed ? { ok: true, msg: '— tick socket authorised (no gold tick within 12 s: market closed or quiet)' } : { ok: false, msg: '— no answer from the tick socket' }), timeoutMs)
    try { ws = new WebSocket('wss://socket.polygon.io/forex') } catch (e) { return end({ ok: false, msg: e.message }) }
    ws.onerror = () => end({ ok: false, msg: '— tick socket error' })
    ws.onmessage = (ev) => { let arr; try { arr = JSON.parse(ev.data) } catch { return } for (const m of [].concat(arr)) {
      if (m.status === 'connected') ws.send(JSON.stringify({ action: 'auth', params: key }))
      else if (m.status === 'auth_success') { authed = true; ws.send(JSON.stringify({ action: 'subscribe', params: 'C.C:XAU-USD' })) }
      else if (m.status === 'auth_failed') end({ ok: false, msg: '— the tick socket REFUSED this key (plan has no real-time forex)' })
      else if (m.status === 'max_connections') end({ ok: false, msg: '— this key is already streaming somewhere else (Polygon allows one tick connection; stop the other app/PC)' })
      else if (m.ev === 'C') end({ ok: true, msg: `— real-time gold tick received (bid ${m.b}, ask ${m.a})` }) } }
  })
}
async function testKey(key, value) {
  const v = value || parseEnv(readEnvText())[key]
  if (!v) return { ok: false, msg: 'no value typed and none stored' }
  try {
    if (key === 'POLYGON_API_KEY') { const now = Date.now(), r = await fetchAggs('XAUUSD', '1m', now - 4 * 86400000, now, { key: v, maxPages: 1, limit: 10000 })
      const bars = Array.isArray(r) ? r : r?.bars ?? []
      if (!bars.length) return { ok: false, msg: 'history: key accepted but no gold bars returned (check the forex plan)' }
      const hist = `history ✓ (${bars.length} gold 1m bars, last ${new Date(bars.at(-1).t).toISOString().slice(0, 16)} UTC)`, ws = await testTicks(v)
      return { ok: ws.ok, msg: `${hist} · live ticks ${ws.ok ? '✓' : '✗'} ${ws.msg}` } }
    if (key === 'TWIN_TELEGRAM_BOT_TOKEN') { const j = await (await fetch(`https://api.telegram.org/bot${v}/getMe`, { signal: T(10000) })).json(); return j.ok ? { ok: true, msg: `works — bot @${j.result.username}` } : { ok: false, msg: j.description || 'rejected' } }
    if (key === 'TWIN_TELEGRAM_CHAT_ID') { const tok = parseEnv(readEnvText()).TWIN_TELEGRAM_BOT_TOKEN; if (!tok) return { ok: false, msg: 'save the bot token first' }
      const j = await (await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: T(10000),
        body: JSON.stringify({ chat_id: v, text: '✅ Ferrari Twin Turbo — Telegram test. TRADE SETUP READY alerts will arrive here (Entry, SL, TP1, TP2, TP3).' }) })).json()
      return j.ok ? { ok: true, msg: 'works — test message sent to the chat' } : { ok: false, msg: j.description || 'rejected' } }
    if (key === 'DATABENTO_API_KEY') { const r = await fetch('https://hist.databento.com/v0/metadata.list_datasets', { headers: { authorization: 'Basic ' + Buffer.from(v + ':').toString('base64') }, signal: T(10000) })
      return r.ok ? { ok: true, msg: 'works — Databento accepted the key' } : { ok: false, msg: `rejected (HTTP ${r.status})` } }
    if (key === 'FRED_API_KEY') { const r = await fetch(`https://api.stlouisfed.org/fred/series?series_id=DGS10&file_type=json&api_key=${encodeURIComponent(v)}`, { signal: T(10000) })
      return r.ok ? { ok: true, msg: 'works — FRED accepted the key' } : { ok: false, msg: `rejected (HTTP ${r.status})` } }
    return { ok: false, msg: 'no test for this setting' }
  } catch (e) { return { ok: false, msg: e.message } }
}
const page = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Twin Turbo — API Keys</title>
<style>:root{--bg:#0b0f14;--card:#121922;--text:#e6edf3;--mut:#8b98a5;--ok:#2ecc71;--bad:#ff5c5c;--acc:#ffb020}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f5f7fa;--card:#fff;--text:#111;--mut:#5b6670}}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,Segoe UI,sans-serif}main{max-width:760px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:8px 0}p.m{color:var(--mut);margin:4px 0 16px}.row{background:var(--card);border-radius:10px;padding:12px;margin:10px 0}
label{font-weight:600}.need{color:var(--mut);font-size:12px}.st{font-size:12px;margin-left:6px}.st.on{color:var(--ok)}.st.off{color:var(--bad)}
.f{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}input{flex:1;min-width:200px;padding:8px;border-radius:6px;border:1px solid #3a4652;background:transparent;color:var(--text)}
button{padding:8px 12px;border-radius:6px;border:0;background:#2b3846;color:#fff;cursor:pointer}button.save{background:var(--acc);color:#111;font-weight:700;font-size:15px;padding:10px 18px}
.res{font-size:12px;margin-top:6px}.res.ok{color:var(--ok)}.res.bad{color:var(--bad)}#msg{margin:12px 0;font-weight:600}a{color:var(--acc)}</style></head>
<body><main><h1>⚙ API Keys &amp; Telegram Alerts</h1><p class="m">Ferrari Twin Turbo · saved to this PC's <code>.env</code> only · keys are never shown back in full · leave a field blank to keep the stored value. <a href="http://127.0.0.1:7444">← back to the live chart</a></p>
<div id="rows"></div><button class="save" id="save">💾 Save</button><div id="msg"></div>
<p class="m">Telegram and alert switches work from the next tick. A <b>changed</b> Polygon or Databento key needs an app restart (close the app window / restart the PC — the watchdog starts it again).</p></main>
<script>const TOKEN=${JSON.stringify(TOKEN)};const $=(id)=>document.getElementById(id);
async function load(){const s=await (await fetch('/api/state')).json();$('rows').innerHTML=s.map(f=>'<div class="row"><label>'+f.label+'</label><span class="st '+(f.set?'on':'off')+'">'+(f.set?'set '+f.shown:'not set')+'</span><div class="need">'+f.need+'</div><div class="f"><input id="in_'+f.key+'" '+(f.toggle?'placeholder="1 or 0"':'type="password" placeholder="paste new value"')+' autocomplete="off">'+(f.toggle?'':'<button data-k="'+f.key+'">Test</button>')+'</div><div class="res" id="res_'+f.key+'"></div></div>').join('');
document.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>test(b.dataset.k))}
const post=(u,b)=>fetch(u,{method:'POST',headers:{'content-type':'application/json','x-twin-token':TOKEN},body:JSON.stringify(b)}).then(r=>r.json());
async function test(k){const el=$('res_'+k);el.className='res';el.textContent='testing…';const r=await post('/api/test',{key:k,value:$('in_'+k).value.trim()});el.className='res '+(r.ok?'ok':'bad');el.textContent=(r.ok?'✓ ':'✗ ')+r.msg}
$('save').onclick=async()=>{const b={};document.querySelectorAll('input[id^=in_]').forEach(i=>{if(i.value.trim())b[i.id.slice(3)]=i.value.trim()});const r=await post('/api/save',b);$('msg').style.color=r.ok?'var(--ok)':'var(--bad)';$('msg').textContent=r.ok?('✓ Saved: '+(r.saved.join(', ')||'nothing changed')+(r.restart?' — restart the app for the new data key':'')):'✗ '+r.error;if(r.ok)load()};load()</script></body></html>`

const allowedHost = (h) => h === `127.0.0.1:${PORT}` || h === `localhost:${PORT}`
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-frame-options': 'DENY' }); res.end(type === 'application/json' ? JSON.stringify(body) : body) }
const readBody = (req) => new Promise((ok, bad) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > 20000) { bad(new Error('too large')); req.destroy() } }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}) } catch { bad(new Error('bad JSON')) } }) })
export function makeServer() {
  return http.createServer(async (req, res) => {
    try {
      if (!allowedHost(req.headers.host)) return send(res, 403, { error: 'host not allowed' })
      const u = new URL(req.url, `http://127.0.0.1:${PORT}`)
      if (req.method === 'GET' && u.pathname === '/') return send(res, 200, page(), 'text/html; charset=utf-8')
      if (req.method === 'GET' && u.pathname === '/api/state') return send(res, 200, publicState())
      if (req.method !== 'POST') return send(res, 404, { error: 'not found' })
      const origin = req.headers.origin
      if (req.headers['x-twin-token'] !== TOKEN || (origin && !allowedHost(origin.replace(/^https?:\/\//, '')))) return send(res, 403, { ok: false, error: 'refused (token / origin)' })
      const body = await readBody(req)
      if (u.pathname === '/api/test') { if (!FIELDS.some((f) => f.key === body.key)) return send(res, 400, { ok: false, msg: 'unknown key' }); return send(res, 200, await testKey(body.key, String(body.value || '').trim())) }
      if (u.pathname === '/api/save') {
        const up = cleanUpdates(body), before = readEnvText(), old = parseEnv(before)
        if (!Object.keys(up).length) return send(res, 200, { ok: true, saved: [] })
        if (before) fs.writeFileSync(ENV + '.previous', before)
        fs.writeFileSync(ENV + '.tmp', mergeEnv(before, up)); fs.renameSync(ENV + '.tmp', ENV)
        const restart = ['POLYGON_API_KEY', 'DATABENTO_API_KEY'].some((k) => up[k] && old[k] && up[k] !== old[k])
        try { fs.appendFileSync(ENV === path.join(TURBO.root, '.env') ? path.join(TURBO.master, 'settings_changes.jsonl') : ENV + '.changes.jsonl', JSON.stringify({ at: new Date().toISOString(), saved: Object.keys(up) }) + '\n') } catch { /* audit is best-effort; never log values */ }
        return send(res, 200, { ok: true, saved: Object.keys(up), restart })
      }
      return send(res, 404, { error: 'not found' })
    } catch (e) { return send(res, 400, { ok: false, error: e.message }) }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  makeServer().listen(PORT, '127.0.0.1', () => console.log(`⚙ settings: http://127.0.0.1:${PORT}  (writes ${ENV})`))
}
