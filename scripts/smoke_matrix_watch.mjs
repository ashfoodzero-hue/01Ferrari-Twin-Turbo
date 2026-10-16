// smoke_matrix_watch.mjs — the chart-only 👁 WATCH BUY label (2026-10-16). ONE rule (matrixArmedAt) shared by the live tick and the study.
// Checks: the label's number is the study's saved BUY cell (provenance); on real BUY signal bars matrixArmedAt shows the BUY context aligned
// and the wall touched (it agrees with matrixSignals); WATCH never reaches Telegram; the chart draws it only while no trade is open.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { matrixSignals, matrixArmedAt, emaSeries, WATCH, MATRIX } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url))
console.log('\n██ MATRIX WATCH SMOKE ██')
await ok('provenance: WATCH.conversion / n = the saved post-hoc BUY cell (k −0.25, N 20)', async () => {
  const c = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'matrix_prep_alert_posthoc.json'), 'utf8')).cells[`k${WATCH.k}|N${WATCH.bars}`]
  assert.equal(c.oos.by_side.BUY.conversion, WATCH.conversion); assert.equal(c.oos.by_side.BUY.episodes, WATCH.oos_n); assert.equal(WATCH.side, 'BUY')
})
await ok('mechanism: on real BUY signal bars matrixArmedAt shows the BUY context aligned and the wall touched (dist ≤ 0)', async () => {
  const from = Date.parse('2026-06-01T00:00:00Z'), to = Date.parse('2026-10-09T06:00:00Z')
  const B = (await loadBars('XAUUSD', '3m', { from: from - 3 * 86400000, to })).bars, D = (await loadDxyBars('3m', { from: from - 3 * 86400000, to })).bars, W = wti1m(to)
  const sigs = matrixSignals(B, D, W, { from: B.findIndex((b) => b.t >= from) }).filter((s) => s.side === 'BUY'); assert(sigs.length > 50)
  const A = atrArr(B, 14), dEma = emaSeries(D, MATRIX.dxyEma), dByT = new Map(D.map((b) => [b.t, b]))
  for (const s of sigs) { const a = matrixArmedAt(B, A, s.i, dByT, dEma, W); assert(a && a.buyCtx && a.buyDist <= 1e-9, 'disagrees at ' + new Date(s.t).toISOString()) }
})
await ok('🫴 WALL_TOUCH: numbers = the saved price-only BUY cell; chart only (no Telegram in its block); only when the full WATCH did not fire', async () => {
  const { WALL_TOUCH } = await import('../src/master/ferrariMatrix.js'), c = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'matrix_prep_alert_priceonly.json'), 'utf8')).cells[`k${WALL_TOUCH.k}|N${WALL_TOUCH.bars}`]
  assert.equal(c.oos.by_side.BUY.conversion, WALL_TOUCH.conversion); assert.equal(c.oos.recall, WALL_TOUCH.recall)
  const tick = fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8'), blk = tick.slice(tick.indexOf('// 🫴 WALL TOUCH'), tick.indexOf('if (STATIC)'))
  assert(blk.includes('else if (arm && arm.buyDist <= WALL_TOUCH.k)') && !/alertSetup|alertPrepare|sendText/.test(blk))
})
await ok('STATIC: WATCH is chart-only (no Telegram path) and drawn only with no open trade; the API passes it only while fresh', async () => {
  const tick = fs.readFileSync(path.join(here, 'matrix_tick.mjs'), 'utf8'), page = fs.readFileSync(path.join(here, '..', 'ops', 'chart', 'index.html'), 'utf8'), chart = fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8')
  const block = tick.slice(tick.indexOf('out.watch = null'), tick.indexOf('if (STATIC)')); assert(block.includes('matrixArmedAt(') && !/alertSetup|sendText/.test(block))
  assert(page.includes("!MX?.open && p.sym === 'XAUUSD' ? MX?.watch : null")); assert(/watch: m\?\.watch && Date\.now\(\) - m\.watch\.barT < 6 \* 60000/.test(chart))
})
console.log(process.exitCode ? '✗ MATRIX WATCH SMOKE FAILED' : `✅ MATRIX WATCH SMOKE: ${n} passed, 0 failed`)
