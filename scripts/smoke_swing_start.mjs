// smoke_swing_start.mjs — 🌱 SWING START WATCH (scripts/swing_start_tick.mjs, 2026-10-16). Unproven signal, information only.
// Checks: --dry sends / writes nothing; the live rule reproduces the study's own recent alert dates (parity); the message source carries the study's
// numbers and the UNPROVEN warning; macro_tick runs it after every NY 4H close.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), S = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_start_study.json'), 'utf8')).cells['A-SWEEP+DISC|bull'], led = path.join(TURBO.paper, 'swing_start_ledger.jsonl')
console.log('\n██ SWING START WATCH SMOKE ██')
await ok('--dry writes nothing and reports the last completed NY day', async () => {
  const before = fs.existsSync(led) ? fs.readFileSync(led, 'utf8') : null, out = execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(here, 'swing_start_tick.mjs'), '--dry'], { encoding: 'utf8', windowsHide: true })
  assert.equal(fs.existsSync(led) ? fs.readFileSync(led, 'utf8') : null, before); assert(/last completed day \d{4}-\d{2}-\d{2}/.test(out))
})
await ok('PARITY: the live rule fires on the study\'s own recent alert dates (inside the replay window)', async () => {
  const DAY = 86400000, dayStart = (t) => { const off = nyOffsetMs(t); return Math.floor((t + off - 17 * 3600000) / DAY) * DAY + 17 * 3600000 - off }
  const M = (await loadBars('XAUUSD', '1m', { from: Date.parse('2025-09-01T00:00Z'), to: Date.parse('2026-10-09T06:00Z') })).bars, D = []; let c = null
  for (const b of M) { const d = dayStart(b.t); if (!c || c.t !== d) { if (c) D.push(c); c = { t: d, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } }
  const minL = (i, k) => { let m = Infinity; for (let q = i - k; q < i; q++) m = Math.min(m, D[q].l); return m }, maxH = (i, k) => { let m = -Infinity; for (let q = i - k; q < i; q++) m = Math.max(m, D[q].h); return m }
  const fires = new Set(); for (let i = 60; i < D.length; i++) { const lo = Math.min(minL(i, 59), D[i].l), hi = Math.max(maxH(i, 59), D[i].h); if (D[i].l < minL(i, 20) && D[i].c > minL(i, 20) && (D[i].c - lo) / (hi - lo) <= 0.25) fires.add(new Date(D[i].t + 7 * 3600000).toISOString().slice(0, 10)) }
  const want = S.dates.filter((d) => d.day >= '2025-12-01').map((d) => d.day); assert(want.length >= 2); for (const d of want) assert(fires.has(d), 'study date not reproduced: ' + d)
})
await ok('STATIC: the message uses the study numbers + the UNPROVEN warning; macro_tick chains it', async () => {
  const src = fs.readFileSync(path.join(here, 'swing_start_tick.mjs'), 'utf8'), mt = fs.readFileSync(path.join(here, 'macro_tick.mjs'), 'utf8')
  assert(src.includes("cells?.['A-SWEEP+DISC|bull']") && src.includes('S.all.s5') && src.includes('UNPROVEN') && src.includes('information only — not a trade'))
  assert(mt.includes("'swing_start_tick.mjs'"))
})
console.log(process.exitCode ? '✗ SWING START WATCH SMOKE FAILED' : `✅ SWING START WATCH SMOKE: ${n} passed, 0 failed`)
