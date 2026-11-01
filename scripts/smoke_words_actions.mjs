// smoke_words_actions.mjs — the words-vs-actions study engine (scripts/research/geo/study_words_actions.mjs, 2026-11-01): z window, weekend mapping,
// close(T) rule, missing-day rule, oil ≤ 0 exclusion, week shuffle, OLS + bootstrap direction.
import assert from 'node:assert'
import { validGoldClose, solve, rawShares, zSeries, mapToMarket, meanOver, knownT, nyTime, ols, bootCoef, shuffleWeeks, partBRows, addDays } from './research/geo/study_words_actions.mjs'
import { rng } from '../src/core/studyStats.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ WORDS vs ACTIONS SMOKE ██')
const days = (from, k) => Array.from({ length: k }, (_, i) => addDays(from, i))

await ok('shares: scope sum / world.n, zero count → 0.5', () => {
  const b = (q, r15) => ({ q, r: { 15: r15 } }), row = { world: { n: 1000, q: [100, 0, 200, 300], r: { 15: 10 } }, by_country: { IRN: b([1, 0, 2, 3], 1), ISR: b([0, 0, 0, 5], 0) } }
  assert.deepEqual(rawShares(row, ['IRN', 'ISR', 'SAU']), { WORDS: 0.002, ACTS: 0.008, POSTURE: 0.001, TALK: 0.001 })
  assert.equal(rawShares({ ...row, by_country: {} }, ['IRN']).ACTS, 0.0005); assert.equal(rawShares(row, null).ACTS, 0.3)
})
await ok('z: window = previous 90 days, d itself excluded, needs ≥ 60 present', () => {
  const D = days('2020-01-01', 120), v = new Map(D.map((d, i) => [d, Math.exp(i % 2)]))
  const z = zSeries(D, v); assert(!z.has(D[59])); assert(z.has(D[60]))
  const v2 = new Map(v); v2.set(D[100], Math.exp(50)); const z2 = zSeries(D, v2); assert(z2.get(D[100]) > 50); assert.equal(z2.get(D[99]), zSeries(D, v).get(D[99]))   // a spike never leaks backwards
  const v3 = new Map([...v].filter(([d]) => d < D[30] || d > D[60])); assert(!zSeries(D, v3).has(D[90]))   // only 59 present in the window
})
await ok('mapping: Thu → Fri; Fri + Sat + Sun → Mon; a missing GDELT day voids its market day', () => {
  const m = mapToMarket(days('2026-10-22', 5), ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27'])   // Thu 22 … Mon 26
  assert.deepEqual(m.get('2026-10-23'), ['2026-10-22']); assert.deepEqual(m.get('2026-10-26'), ['2026-10-23', '2026-10-24', '2026-10-25']); assert.deepEqual(m.get('2026-10-27'), ['2026-10-26'])
  assert.equal(meanOver(new Map([['2026-10-23', 1], ['2026-10-25', 3]]), m.get('2026-10-26')), null); assert.equal(meanOver(new Map([['2026-10-23', 1], ['2026-10-24', 2], ['2026-10-25', 3]]), m.get('2026-10-26')), 2)
})
await ok('timing: GDELT day d known at d+1 08:00 UTC, before the d+1 oil (14:30 NY) and gold (17:00 NY) closes, summer and winter', () => {
  for (const d of ['2026-07-15', '2026-01-15']) { assert(knownT(d) < nyTime(addDays(d, 1), 14, 30)); assert.equal(new Date(knownT(d)).toISOString(), addDays(d, 1) + 'T08:00:00.000Z') }
  assert.equal(new Date(nyTime('2026-07-16', 14, 30)).toISOString(), '2026-07-16T18:30:00.000Z'); assert.equal(new Date(nyTime('2026-01-16', 14, 30)).toISOString(), '2026-01-16T19:30:00.000Z')
})
await ok('Addendum C: data-hole gold stubs are not closes; holiday early closes are', () => {
  assert(!validGoldClose('2019-09-03', Date.parse('2019-09-03T00:00:00Z'))); assert(!validGoldClose('2021-12-24', Date.parse('2021-12-24T13:14:00Z')))
  assert(validGoldClose('2023-09-04', Date.parse('2023-09-04T18:31:00Z'))); assert(validGoldClose('2026-10-30', Date.parse('2026-10-30T21:00:00Z')))
})
await ok('Part B rows: oil price ≤ 0 drops the row; the predictor-after-close assert counts', () => {
  const D = days('2020-03-01', 60), mk = D.slice(1).map((d, i) => ({ date: d, c: i === 40 ? -37 : 20 + i }))
  const P = new Map(D.map((d) => [d, 1])), asserts = { n: 0, fail: 0 }
  const rows = partBRows({ target: { h: 1, y: (c, i) => Math.log(c[i + 1].c / c[i].c) }, mkt: { rows: mk }, closeT: (r) => nyTime(r.date, 14, 30), map: mapToMarket(D, mk.map((r) => r.date)),
    pred: { S: { M: P } }, scope: 'S', measure: 'M', ctl: () => [0], asserts })
  assert(!rows.some((r) => r.date === mk[39].date || r.date === mk[40].date)); assert.equal(asserts.fail, 0); assert(rows.length > 30)
})
await ok('week shuffle keeps every target row and the multiset of predictor values per week size', () => {
  const rows = days('2021-01-07', 70)   // 10 whole blocks (epoch weeks start Thursday)
    .map((d, i) => ({ date: d, t: Date.parse(d), y: i, x: [0, i] })), s = shuffleWeeks(rows, 5)
  assert.equal(s.length, rows.length); assert.deepEqual(s.map((r) => r.y).sort((a, b) => a - b), rows.map((r) => r.y))
  assert.deepEqual(s.map((r) => r.x[1]).sort((a, b) => a - b), rows.map((r) => r.x[1])); assert(s.some((r, i) => r.x[1] !== rows[i].x[1]))
})
await ok('solve: needs a row swap (zero first pivot) — the 11-01 first run crashed here', () => {
  assert.deepEqual(solve([[0, 1], [1, 0]], [2, 3]), [3, 2]); const x = solve([[1, 2, 0], [3, 1, 1], [0, 4, 2]], [5, 6, 10]); assert(Math.abs(x[0] - 1) < 1e-9 && Math.abs(x[1] - 2) < 1e-9 && Math.abs(x[2] - 1) < 1e-9)
})
await ok('OLS recovers known coefficients; bootstrap p small for a real effect, large for noise', () => {
  const R = rng(3), rows = days('2015-01-01', 1500).map((d) => { const a = R() - 0.5, b = R() - 0.5; return { date: d, t: Date.parse(d), x: [a, b], y: 1 + 2 * a + 0.5 * b + 0.3 * (R() - 0.5) } })
  const beta = ols(rows, 2); assert(Math.abs(beta[0] - 1) < 0.02 && Math.abs(beta[1] - 2) < 0.03 && Math.abs(beta[2] - 0.5) < 0.03)
  assert(bootCoef(rows, 7 * 86400000, 500, 1).p < 0.01)
  const noise = rows.map((r) => ({ ...r, x: [r.x[0], R() - 0.5] })); assert(bootCoef(noise, 7 * 86400000, 500, 1).p > 0.01)
})
console.log(`words-actions smoke: ${n} passed`)
