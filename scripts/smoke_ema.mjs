// smoke_ema.mjs — TOOL 2 (EMA 20/50/200): the EMA arithmetic, the validity rule, the trend stack, causality, and the two study artifacts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { emaArray, emaStack } from '../src/master/emaLevels.js'
import { loadBars } from '../src/data/backfillReader.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ EMA (TOOL 2) SMOKE ██')
await ok('EMA arithmetic: SMA seed at n−1, then c·k + e·(1−k); NaN until index 2n−1', () => {
  const B = Array.from({ length: 12 }, (_, i) => ({ c: i + 1 })), e = emaArray(B, 3), k = 0.5
  let x = (1 + 2 + 3) / 3; for (let i = 3; i < 12; i++) { x = B[i].c * k + x * (1 - k); if (i >= 5) assert(Math.abs(e[i] - x) < 1e-12, 'i=' + i) }
  assert(Number.isNaN(e[4]) && Number.isFinite(e[5]))
})
await ok('trend stack: BULL only when close > EMA20 > EMA50 > EMA200; null while EMA200 is not valid', () => {
  const up = Array.from({ length: 500 }, (_, i) => ({ c: 100 + i })), s = emaStack(up)
  assert.equal(s.trend[398], null); assert.equal(s.trend[399], 'BULL'); assert.equal(emaStack(up.map((b) => ({ c: 1000 - b.c }))).trend[499], 'BEAR')
})
await ok('monthly EMA200 is NOT computable on our history (never faked); weekly EMA200 is', async () => {
  const mo = (await loadBars('XAUUSD', '1mo', {})).bars, wk = (await loadBars('XAUUSD', '1w', {})).bars
  assert(mo.length < 399 && !emaArray(mo, 200).some(Number.isFinite)); assert(emaArray(wk, 200).some(Number.isFinite))
})
await ok('causal: the EMA of a closed bar does not change when later bars are removed', async () => {
  const B = (await loadBars('XAUUSD', '1h', { from: Date.parse('2026-01-01'), to: Date.parse('2026-06-01') })).bars, full = emaArray(B, 50), cut = emaArray(B.slice(0, 1500), 50)
  assert.equal(full[1499], cut[1499])
})
await ok('study artifacts: verdicts follow their pre-registered rules (27 cells; 4 filters)', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'ema_levels_study.json'), 'utf8')); assert.equal(Object.keys(A.cells).length, 27)
  for (const c of Object.values(A.cells)) { if (c.verdict === 'NOT_COMPUTABLE') { assert.equal(c.tf + c.n, '1mo200'); continue }
    assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD', c.tf + ' ' + c.n) }
  const Bf = JSON.parse(fs.readFileSync(path.join(master, 'ema_matrix_filter.json'), 'utf8')); assert.equal(Object.keys(Bf.primary.filters).length, 4)
  for (const v of Object.values(Bf.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
console.log(process.exitCode ? '✗ EMA SMOKE FAILED' : `✅ EMA (TOOL 2) SMOKE: ${n} passed, 0 failed`)
