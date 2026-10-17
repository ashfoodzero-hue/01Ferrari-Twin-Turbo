// smoke_study_stats.mjs — studyStats.js against known reference values (2026-10-17).
import assert from 'node:assert'
import { normCdf, wilson, compareRates, holm, blockBootstrapMean } from '../src/core/studyStats.js'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const near = (a, b, tol, what) => assert(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`)
console.log('\n██ STUDY STATS SMOKE ██')
ok('normal CDF at reference points', () => { near(normCdf(0), 0.5, 1e-7, 'Φ(0)'); near(normCdf(1.96), 0.975002, 1e-5, 'Φ(1.96)'); near(normCdf(-2.5758), 0.005, 1e-5, 'Φ(−2.576)') })
ok('Wilson interval (reference: 50/100 → 0.4038-0.5962; 0/10 → 0-0.2775)', () => {
  const a = wilson(50, 100); near(a.lo, 0.4038, 1e-4, 'lo'); near(a.hi, 0.5962, 1e-4, 'hi'); const b = wilson(0, 10); near(b.lo, 0, 1e-9, 'lo0'); near(b.hi, 0.2775, 1e-4, 'hi0') })
ok('two-proportion z-test (hand-computed: 30/100 vs 15/100, pooled 0.225, se 0.059055 → z = 2.5400, p = 0.0111)', () => {
  const r = compareRates(30, 100, 15, 100); near(r.z, 0.15 / Math.sqrt(0.225 * 0.775 * 0.02), 1e-9, 'z'); near(r.z, 2.5400, 1e-4, 'z4'); near(r.p, 0.0111, 1e-4, 'p'); near(r.ratio, 2, 1e-12, 'ratio') })
ok('Holm step-down (p = .01 .04 .03 .005 at α .05 → pass .005 .01; stop at .03)', () => {
  const rows = holm([{ key: 'a', p: 0.01 }, { key: 'b', p: 0.04 }, { key: 'c', p: 0.03 }, { key: 'd', p: 0.005 }])
  const pass = rows.filter((r) => r.holm_pass).map((r) => r.key).sort().join(''); assert.equal(pass, 'ad') })
ok('week-block bootstrap: interval contains the mean, is reproducible, widens with fewer weeks', () => {
  const items = []; for (let i = 0; i < 400; i++) items.push({ t: i * 86400000, x: (i % 7) - 3 + (i % 3) })
  const a = blockBootstrapMean(items), b = blockBootstrapMean(items); assert(a.lo <= a.mean && a.mean <= a.hi); assert.equal(a.lo, b.lo)
  const c = blockBootstrapMean(items.slice(0, 60)); assert(c.hi - c.lo > a.hi - a.lo) })
console.log(failed ? `✗ STUDY STATS SMOKE: ${n} passed, ${failed} failed` : `✅ STUDY STATS SMOKE: ${n} passed, 0 failed`)
