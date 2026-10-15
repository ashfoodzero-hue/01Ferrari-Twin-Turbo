// smoke_chart.mjs — the live chart server (scripts/run_chart.mjs, 2026-10-09): starts it on a spare port and checks every endpoint.
// It must serve the page, return ONLY closed candles (the current bucket separately as `partial`), mark the live minute as forming,
// draw the confirmation levels from marketState's own geometry, refuse unknown inputs, and bind to 127.0.0.1 only.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), PORT = 7449, BASE = `http://127.0.0.1:${PORT}`
console.log('\n██ LIVE CHART SERVER SMOKE ██')
const child = spawn(process.execPath, ['--max-old-space-size=2048', path.join(here, 'run_chart.mjs')], { env: { ...process.env, TWIN_CHART_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
const get = async (p) => { const r = await fetch(BASE + p); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text() } }
for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/api/symbols'); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
try {
  await ok('serves the page (title, the pinned chart library, the confirmation lines)', async () => {
    const r = await get('/'); assert.equal(r.status, 200)
    assert(r.body.includes('<title>Ferrari Twin Turbo — Live Chart</title>') && r.body.includes('lightweight-charts@4.1.3') && r.body.includes('SELL TRIGGER · 15m close below') && r.body.includes('BUY TRIGGER · 15m close above'))   // labels renamed 2026-10-15
  })
  await ok('/api/bars 15m: closed candles only, ascending, on the 15m grid; the current bucket comes separately as partial', async () => {
    const r = (await get('/api/bars?sym=XAUUSD&tf=15m')).body, now = Date.now()
    assert(r.closed.length > 100); for (let i = 1; i < r.closed.length; i++) assert(r.closed[i].t > r.closed[i - 1].t)
    assert(r.closed.every((b) => b.t % 900000 === 0 && b.t + 900000 <= now), 'a forming candle leaked into closed')
    if (r.partial) assert.equal(r.partial.t, Math.floor(r.generated / 900000) * 900000)
  })
  await ok('/api/live: the forming minute is flagged forming:true; levels come from marketStateGeometry (sell < low ≤ high < buy)', async () => {
    const r = (await get('/api/live?sym=XAUUSD')).body
    if (r.quote?.forming) assert.equal(r.quote.forming.forming, true)
    const g = r.geometry; assert(g && g.sellTrigger < g.rangeLow && g.rangeLow <= g.rangeHigh && g.rangeHigh < g.buyTrigger)
    assert(['PREMIUM', 'DISCOUNT', 'EQUILIBRIUM', 'BREAKOUT_UP', 'BREAKOUT_DOWN'].includes(g.state))
  })
  await ok('refuses unknown symbols and timeframes (400) and unknown paths (404)', async () => {
    assert.equal((await get('/api/bars?sym=BTCUSD&tf=15m')).status, 400); assert.equal((await get('/api/bars?sym=XAUUSD&tf=7m')).status, 400); assert.equal((await get('/nope')).status, 404)
  })
  await ok('DXY (rebuilt): closed close-based candles on the grid, the live value comes from the six pairs, structure geometry present', async () => {
    // 15m candles are resampled from close-based 1m bars: the high is the highest MINUTE close inside it (≥ the candle's own open/close)
    const b = (await get('/api/bars?sym=DXY&tf=15m')).body; assert(b.closed.length > 100 && b.closed.every((x) => x.h >= Math.max(x.o, x.c) - 1e-9 && x.l <= Math.min(x.o, x.c) + 1e-9) && /rebuilt/.test(b.label))
    const one = (await get('/api/bars?sym=DXY&tf=1m')).body; assert(one.closed.length > 100 && one.closed.every((x) => x.h === Math.max(x.o, x.c) && x.l === Math.min(x.o, x.c)), '1m DXY candles are close-based')
    const l = (await get('/api/live?sym=DXY')).body; assert(l.geometry && l.geometry.needVolume === 'n/a (index)'); if (l.quote) assert.equal(l.quote.derived, true)
  })
  await ok('WTI: labelled DELAYED everywhere, never "live", no forming candle, last candle at least 10 min old', async () => {
    const b = (await get('/api/bars?sym=WTI&tf=15m')).body; assert.equal(b.delayed, true)
    if (b.closed.length) assert(b.closed.at(-1).t + 900000 <= Date.now() - 10 * 60000, 'a delayed series must not show bars inside its delay')
    const l = (await get('/api/live?sym=WTI')).body; assert.equal(l.delayed, true); assert.equal(l.stream.live, false); assert.equal(l.quote, null)
  })
  await ok('drivers: every % comes from xau_leaders.json (no number without the study); WTI excluded; macro + news answer with their source', async () => {
    const d = (await get('/api/drivers')).body; const study = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'master', 'xau_leaders.json'), 'utf8'))
    for (const r of d.all) assert.deepEqual(r.agreement, study.assets[r.sym].agreement_oos)
    const wti = d.rows.find((r) => r.sym === 'WTI'); assert(wti && wti.delayed && wti.measured == null)
    const m = (await get('/api/macro')).body; assert(/Polygon/.test(m.source))
    const n = (await get('/api/news')).body; assert(/Polygon/.test(n.source) && Array.isArray(n.items))
  })
  await ok('/api/matrix: the paper box comes from matrix_state.json with its backtest verdict; the page draws the neon zones only while a trade is open', async () => {
    const m = (await get('/api/matrix')).body; assert(typeof m.verdict === 'string' && m.verdict.length > 0)
    if (m.open) { const s = m.open.sig; assert(['BUY', 'SELL'].includes(s.side)); assert(s.side === 'BUY' ? s.sl < s.entry && s.entry < s.tp1 && s.tp1 < s.tp2 : s.sl > s.entry && s.entry > s.tp1 && s.tp1 > s.tp2); assert(s.reward >= 10 - 1e-9) }
    const page = (await get('/')).body; assert(page.includes('SNIPER TARGET ZONE (MIN 100 PIPS)') && page.includes('RISK PROTECTION ZONE (SL)') && page.includes("if (!key) return"))
  })
  await ok('/api/bias: Silver/DXY/WTI BULLISH|BEARISH from CLOSED candles; the whale gauge quotes its measured study, never a bare direction', async () => {
    const b = (await get('/api/bias')).body; assert.deepEqual(b.rows.map((r) => r.sym), ['XAUUSD', 'XAGUSD', 'DXY', 'WTI'])
    for (const r of b.rows) for (const tf of ['3m', '15m']) if (r[tf]) { assert(['BULLISH', 'BEARISH'].includes(r[tf].dir)); assert(r[tf].barT + (tf === '3m' ? 180000 : 900000) <= Date.now(), 'forming candle used') }
    assert(b.whale_study && ['DIRECTION_EDGE', 'NO_DIRECTION_EDGE'].includes(b.whale_study.verdict))
    if (b.whale && !b.whale.error) assert(b.whale.lastDeliveredT + 900000 <= Date.now() - 10 * 60000, 'whale used a GC bar inside its 10-min delay')
  })
  await ok('/api/gamma: GLD gamma levels in XAU with the snapshot provenance and the forward-test verdict (context until measured)', async () => {
    const g = (await get('/api/gamma')).body
    if (g.available) { assert(g.xau.call_wall > 0 && g.xau.put_wall > 0 && g.coverage >= 0.9 && g.ratio > 0); assert(g.study && ['INSUFFICIENT', 'HOLDS', 'DOES_NOT_HOLD'].includes(g.study.verdict)) } else assert(g.why)
  })
  await ok('layout: right panel toggle, no page scroll on desktop, the price axis reserves ≥ 84 px; /api/fvg marks carry the study rule + its measured result', async () => {
    const page = (await get('/')).body; assert(page.includes('id="panelBtn"') && page.includes('main.nopanel') && /body \{[^}]*overflow:hidden/.test(page) && page.includes('minimumWidth: k ? 64 : 84'))
    const f = (await get('/api/fvg?tf=3m')).body; assert(Array.isArray(f.marks)); assert(f.rule && /1h & 4h EMA/.test(f.rule)); assert(f.measured && typeof f.measured.x025.bounce === 'number')
    for (const m of f.marks) assert(m.top > m.bot && m.knownT <= Date.now())
    assert.equal((await get('/api/fvg?tf=4h')).body.marks.length, 0)
  })
  await ok('/api/calendar: USD events with source + measured gold reaction for high-impact CPI/NFP/PPI/FOMC; panel + warning chip on the page', async () => {
    const c = (await get('/api/calendar')).body; if (!c.available) return
    assert(Array.isArray(c.events) && c.sources); for (const e of c.events) assert(['FF', 'FED', 'BLS'].includes(e.src) && e.t > 0)
    for (const e of c.events.filter((x) => /\bCPI\b|Non-Farm|\bPPI\b|Federal Funds/.test(x.name))) assert(e.measured && e.measured.n > 40, 'unmeasured ' + e.name)
    const page = (await get('/')).body; assert(page.includes('USD calendar') && page.includes('function calChip'))
  })
  await ok('/api/monitor: {open:false} with no trade, else the position formula with its measured calibration + model / close-advice status; panel on the page', async () => {
    const m = (await get('/api/monitor')).body; assert(typeof m.open === 'boolean')
    if (m.open && !m.done && !m.error) { assert(m.p_tp1 >= 0 && m.p_tp1 <= 1 && m.p_tp2 >= 0 && m.p_tp2 <= 1 && [1, 2].includes(m.phase)); assert(m.model && m.close_advice) }
    assert((await get('/')).body.includes('id="monMsg"'))
  })
  await ok('STATIC: binds 127.0.0.1 only and never writes a file', async () => {
    const src = fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8')
    assert(/listen\(CHART_PORT, '127\.0\.0\.1'/.test(src)); assert(!/writeFileSync|appendFileSync|createWriteStream/.test(src))
  })
} finally { child.kill() }
console.log(process.exitCode ? '✗ LIVE CHART SMOKE FAILED' : `✅ LIVE CHART SMOKE: ${n} passed, 0 failed`)
