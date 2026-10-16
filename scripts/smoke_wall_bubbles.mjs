// smoke_wall_bubbles.mjs — WALL-PRESSURE bubbles (src/master/wallDefense.js + /api/walls + the chart overlay, 2026-10-16).
// Checks: the study ran on THIS engine (replication 60.4 / 71.4 / 51.2) and every shown class passed its pre-registered rule; on recent real
// data the engine's DEFENSE / DEF>PUSH flags follow their definitions; ATTACK never makes a bubble; the API's measured holds = the study's
// (provenance); the chart server stays read-only.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { wallEvents, swingWallEvents, holdLabel } from '../src/master/wallDefense.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), S = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'wall_bubbles_study.json'), 'utf8'))
console.log('\n██ WALL-PRESSURE BUBBLES SMOKE ██')
await ok('the study ran on this engine (same 40,693 tests as study (an); holds 60.4 / 71.4 / 51.2) and every SHOWN class passed its rule (n ≥ 300, lift ≥ 5 pp, LB > 0, TRAIN > 0)', async () => {
  // exact engine identity: the same 40,693 wall tests as study (an)'s own engine copy (wall_defense_money.json); holds round to its 60.4 / 71.4 / 51.2
  const an = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'wall_defense_money.json'), 'utf8')); assert.equal(S.events, an.events)
  ;[[S.replication.all, 60.4], [S.replication.defense, 71.4], [S.replication.attack, 51.2]].forEach(([x, ref]) => assert(Math.abs(100 * x - ref) < 0.06, `${100 * x} vs ${ref}`))   // stored to 4 dp, printed to 1 dp
  for (const k of S.shown) { const c = S.classes[k]; assert(c.oos_n >= 300 && c.oos_lift >= 0.05 && c.lift_lb > 0 && c.train_lift > 0, k) }
  assert.deepEqual(S.shown.sort(), ['DEF>PUSH', 'DEFENSE', 'STRONG'])
})
await ok('MECHANISM on the last 10 days of real data: DEFENSE ⇔ zone flow opposes the attack; DEF>PUSH ⇒ DEFENSE and |zone| > |push|; decision = touch + 3 bars', async () => {
  const M = (await loadBars('XAUUSD', '1m', { from: Date.now() - 11 * 86400000 })).bars, ev = wallEvents(M, { from: Date.now() - 10 * 86400000 })
  assert(ev.length > 10, 'too few wall tests to check'); for (const e of ev) { const attack = e.type === 'ceiling' ? 1 : -1
    assert.equal(e.defense, Math.sign(e.zone) === -attack); if (e.defStronger) assert(e.defense && Math.abs(e.zone) > Math.abs(e.push)); assert.equal(e.di, e.touchI + 2)
    const h = holdLabel(M, e); assert([true, false, null].includes(h)) }
})
await ok('/api/walls: ATTACK never makes a bubble; measured holds = the study (provenance); bubbles carry their class, count and outcome', async () => {
  const PORT = 7461, child = spawn(process.execPath, ['--max-old-space-size=2048', path.join(here, 'run_chart.mjs')], { env: { ...process.env, TWIN_CHART_PORT: String(PORT) }, stdio: 'ignore', windowsHide: true })
  try { let w = null; for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 1000)); try { w = await (await fetch(`http://127.0.0.1:${PORT}/api/walls`)).json(); if (w.available) break } catch { /* starting */ } }
    assert(w?.available, 'walls never became available: ' + JSON.stringify(w))
    assert.equal(w.measured.defense, S.classes.DEFENSE.oos_hold); assert.equal(w.measured.strong, S.classes.STRONG.oos_hold); assert.equal(w.measured.def_push, S.classes['DEF>PUSH'].oos_hold); assert.equal(w.measured.attack, S.classes.ATTACK.oos_hold)
    const SW = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_walls_study.json'), 'utf8')), holds = { VOL: S.classes, SW3: SW.variants['3m'].classes, SW15: SW.variants['15m'].classes }
    for (const b of w.bubbles) { assert(['VOL', 'SW3', 'SW15'].includes(b.kind)); assert(['STRONG', 'DEF>PUSH', 'DEFENSE'].includes(b.cls)); assert.equal(b.measured_hold, holds[b.kind][b.cls].oos_hold, 'provenance ' + b.kind + ' ' + b.cls); assert(b.count >= 1); assert(['pending', 'timeout', 'HELD', 'BROKE'].includes(b.outcome)) }
  } finally { child.kill() }
})
await ok('SWING engine rules (synthetic): a level is usable only from its known time; a 1m close beyond it removes it; the nearest active level is the one tested', async () => {
  const t0 = Date.UTC(2026, 0, 5), M = []; for (let i = 0; i < 1700; i++) { const p = 100 + (i < 1500 ? 0 : i - 1500 >= 50 ? 1.5 : (i - 1500) * 0.03); M.push({ t: t0 + i * 60000, o: p, h: p + 0.02, l: p - 0.02, c: p, v: 10 }) }
  const lv = (px, i) => ({ knownT: t0 + i * 60000, px })
  const ev1 = swingWallEvents(M, { highs: [lv(101, 1600)], lows: [] })   // known only AFTER price passed it → never tested
  assert.equal(ev1.length, 0, 'a level was tested before its known time')
  const ev2 = swingWallEvents(M, { highs: [lv(100.6, 1000), lv(103, 1000)], lows: [] }); assert(ev2.length >= 1 && ev2[0].wall === 100.6, 'the nearest active ceiling must be tested first')
  assert(!ev2.some((e) => e.wall === 100.6 && e.t > t0 + 1600 * 60000), 'a broken level was tested again')
})
await ok('STATIC: the chart server never writes; the page draws .wbub only for bubble classes and says ATTACK = no bubble', async () => {
  const ch = fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8'), pg = fs.readFileSync(path.join(here, '..', 'ops', 'chart', 'index.html'), 'utf8')
  assert(!/writeFileSync|appendFileSync|createWriteStream/.test(ch)); assert(ch.includes("const clsOf = (thr) => (e) => !e.defense ? null"))
  assert(pg.includes("d.className = 'wbub '") && pg.includes('No bubble when the flow ATTACKS'))
})
console.log(process.exitCode ? '✗ WALL-PRESSURE BUBBLES SMOKE FAILED' : `✅ WALL-PRESSURE BUBBLES SMOKE: ${n} passed, 0 failed`)
