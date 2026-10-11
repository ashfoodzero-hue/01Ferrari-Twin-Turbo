// smoke_elliott.mjs — TOOL 5 (mechanical Elliott): the three hard rules, the ABC trigger, one emission per pattern, causality, artifacts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { elliottPatterns } from '../src/master/elliott.js'
import { loadBars } from '../src/data/backfillReader.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ ELLIOTT (TOOL 5) SMOKE ██')
// build bars whose 5/5 pivots are exactly the given swing points (linear legs of 8 bars)
const legs = (pts) => { const B = []; let t = 0; for (let s = 0; s + 1 < pts.length; s++) for (let k = 0; k < 8; k++) { const c = pts[s] + (pts[s + 1] - pts[s]) * (k / 8); B.push({ t: (t++) * 60000, o: c, h: c + 0.01, l: c - 0.01, c }) }
  for (let k = 0; k < 8; k++) { const c = pts.at(-1) + (pts.at(-2) > pts.at(-1) ? k : -k) * 0.5; B.push({ t: (t++) * 60000, o: c, h: c + 0.01, l: c - 0.01, c }) } return B }
await ok('a clean bull 1-2-3-4 is a W5 UP with target = wave-3 end, invalidation = wave-4 low', () => {
  const P = elliottPatterns(legs([100, 90, 110, 100, 130, 115, 125])), w = P.find((p) => p.kind === 'W5' && p.dir === 'UP')
  assert(w, JSON.stringify(P)); assert(Math.abs(w.target - 130.01) < 0.02 && Math.abs(w.invalid - 114.99) < 0.02)
})
await ok('hard rules: wave 4 overlapping wave 1, or wave 3 shorter than wave 1, is NOT a W5', () => {
  assert(!elliottPatterns(legs([100, 90, 110, 100, 130, 105, 120])).some((p) => p.kind === 'W5' && p.dir === 'UP' && Math.abs(p.pts[0] - 90) < 0.1), 'overlap accepted')
  assert(!elliottPatterns(legs([100, 90, 115, 100, 118, 116, 125])).some((p) => p.kind === 'W5' && p.dir === 'UP' && Math.abs(p.pts[0] - 90) < 0.1), 'short wave 3 accepted')
})
await ok('a complete 5-wave bull impulse emits an ABC DOWN targeting the wave-4 level, once', () => {
  const P = elliottPatterns(legs([100, 90, 110, 100, 130, 115, 140, 120])), abc = P.filter((p) => p.kind === 'ABC' && p.dir === 'DOWN')
  assert.equal(abc.length, 1); assert(Math.abs(abc[0].target - 114.99) < 0.02)
})
await ok('causal: removing later bars never changes an already-emitted pattern', async () => {
  const B = (await loadBars('XAUUSD', '1h', { from: Date.parse('2026-05-01'), to: Date.parse('2026-09-01') })).bars, full = elliottPatterns(B)
  const mid = full[Math.floor(full.length / 2)], cut = elliottPatterns(B.slice(0, mid.knownAt + 1))
  assert(cut.some((p) => p.kind === mid.kind && p.dir === mid.dir && p.knownAt === mid.knownAt && p.target === mid.target))
})
await ok('study artifacts: verdicts follow their pre-registered rules', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'elliott_study.json'), 'utf8')); assert.equal(Object.keys(A.cells).length, 8)
  for (const c of Object.values(A.cells)) { const v = c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'PLAYS_OUT' : 'DOES_NOT_PLAY_OUT'; assert.equal(c.verdict, v, c.tf + ' ' + c.kind) }
  const B = JSON.parse(fs.readFileSync(path.join(master, 'elliott_matrix_filter.json'), 'utf8'))
  for (const v of Object.values(B.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
console.log(process.exitCode ? '✗ ELLIOTT SMOKE FAILED' : `✅ ELLIOTT (TOOL 5) SMOKE: ${n} passed, 0 failed`)
