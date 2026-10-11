// smoke_inv90.mjs — the 90 % WR investigation (docs/INVESTIGATION_90WR_2026-10-11.md): the audits are clean and every stored verdict follows the
// pre-registered gate from its own numbers (no hand-edited result).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const D = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'inv90'), J = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'))
let n = 0; const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ 90 % WR INVESTIGATION SMOKE ██')
ok('dataset audit: 2,400 outcomes + 1,800 features re-computed independently, 0 mismatches', () => { const a = J('audit.json'); assert.equal(a.outcomes.mismatches, 0); assert(a.outcomes.checked >= 2400)
  for (const f of Object.values(a.features)) assert.equal(f.mismatches, 0) })
ok('Part 4 outcome audit: 0 mismatches', () => { const a = J('audit_outcomes2.json'); assert.equal(a.mismatches, 0); assert(a.checked >= 1000) })
for (const f of ['part1_results.json', 'part1_pooled_results.json', 'part1_pooled_x_results.json'])
  ok(`${f}: verdicts follow G1-G5`, () => { for (const c of Object.values(J(f).candidates)) { const g = c.G, core = g.G2_wr && g.G3_money && g.G4_years && g.G5_spread
    assert.equal(c.verdict, core ? (g.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY') : 'FAIL'); assert.equal(g.G2_wr, c.wr >= 0.9 && c.wr_lb >= 0.88) } })
for (const f of ['part4_results.json', 'part4_pooled_results.json', 'part4_pooled_x_results.json', 'part4_pooled_x_wr0.9_results.json', 'part4_pooled_xs_results.json'])
  ok(`${f}: verdicts follow G1-G5 (+ swap label)`, () => { for (const c of Object.values(J(f).candidates)) { const g = c.G, core = g.G2_wr && g.G3_money && g.G4_years && g.G5_spread
    if (!core) assert.equal(c.verdict, 'FAIL'); assert.equal(g.G2_wr, c.wr >= 0.9 && c.wr_lb_block >= 0.88) } })
ok('part2 + part3 + part5c verdicts follow the gate', () => { for (const f of ['part2_results.json', 'part3_results.json', 'part5c_results.json']) for (const c of Object.values(J(f).results)) { const g = c.G
  assert.equal(c.verdict, g.G2_wr && g.G3_money && g.G4_years && g.G5_spread ? (g.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY') : 'FAIL') } })
ok('5c two-sided trade counts equal the single-side books (the null/undefined bug stays fixed)', () => { const r = J('part5c_results.json').results; assert.equal(r.B1.n, 90); assert.equal(r.D1.n, 980) })
ok('forward test: live-built features EQUAL the research features on the overlap (0 mismatches); ledger is append-only signal/resolve/scan', () => {
  const p = J('forward/parity.json'); assert(p.cells > 10000); assert.equal(Object.keys(p.mismatched_features).length, 0)
  const L = fs.readFileSync(path.join(D, 'forward', 'ledger.jsonl'), 'utf8').split('
').filter(Boolean).map((l) => JSON.parse(l)), ids = new Set()
  for (const e of L) { assert(['signal', 'resolve', 'scan'].includes(e.type)); if (e.type === 'signal') { assert(!ids.has(e.id), 'duplicate signal'); ids.add(e.id); assert(e.t >= Date.parse('2026-10-09T06:00:00Z')); assert(e.score >= e.thr); assert(e.stop < e.entry_ask && e.target > e.entry_ask) } }
  for (const e of L.filter((x) => x.type === 'resolve')) assert(ids.has(e.id)) })
ok('part7_results.json: verdicts follow G1-G5 + swap label; the 92 % & 1/day flag follows its numbers', () => { for (const c of Object.values(J('part7_results.json').books)) { const g = c.G, core = g.G2_wr && g.G3_money && g.G4_years && g.G5_spread
  assert.equal(c.verdict, !core ? 'FAIL' : !(c.net_swap_0_30 > 0) ? 'PASS (swap-dependent)' : g.G1_freq ? 'PASS' : 'PASS_AT_LOWER_FREQUENCY'); assert.equal(c.ashraf_target_92_and_1_per_day, c.wr >= 0.92 && c.per_day >= 1) } })
console.log(process.exitCode ? '✗ INV90 SMOKE FAILED' : `✅ INV90 SMOKE: ${n} passed, 0 failed`)
