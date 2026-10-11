// smoke_volume_profile.mjs — TOOL 4 (volume profile): POC / value-area arithmetic, the uniform-range spread, and the study artifacts' verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { volumeProfile } from '../src/master/volumeProfile.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ VOLUME PROFILE (TOOL 4) SMOKE ██')
await ok('POC = the bin with the most volume; volume is spread uniformly over each bar\'s range', () => {
  const p = volumeProfile([{ l: 100, h: 100.9, v: 10 }, { l: 102, h: 102.9, v: 50 }, { l: 104, h: 104.9, v: 20 }], 1)
  assert.equal(p.poc, 102.5); assert.equal(p.total, 80)
  const q = volumeProfile([{ l: 100, h: 103.9, v: 40 }], 1); assert.equal(q.bins, 4)   // 10 per bin over 4 bins
})
await ok('value area grows from the POC toward the heavier neighbour until ≥ 70 % of the volume', () => {
  const bars = [[100, 5], [101, 10], [102, 40], [103, 30], [104, 10], [105, 5]].map(([l, v]) => ({ l, h: l + 0.5, v }))
  const p = volumeProfile(bars, 1); assert.equal(p.poc, 102.5); assert.equal(p.val, 102); assert.equal(p.vah, 104)   // 40 + 30 = 70 of 100
  assert.equal(volumeProfile([{ l: 1, h: 2, v: 0 }], 1), null)
})
await ok('study artifacts: bounce / magnet / filter verdicts follow their pre-registered rules', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'volume_profile_study.json'), 'utf8'))
  for (const src of [A.spot, A.fut]) { assert.deepEqual(Object.keys(src.cells), ['POC', 'VAH', 'VAL'])
    for (const c of Object.values(src.cells)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
    const m = src.magnet; assert.equal(m.verdict, m.oos.n < 100 ? 'UNDERPOWERED' : m.oos.hit_lb > m.oos.mirror && m.train.hit > m.train.mirror ? 'MAGNET' : 'NOT_A_MAGNET') }
  const B = JSON.parse(fs.readFileSync(path.join(master, 'vp_matrix_filter.json'), 'utf8'))
  for (const v of Object.values(B.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
console.log(process.exitCode ? '✗ VOLUME PROFILE SMOKE FAILED' : `✅ VOLUME PROFILE (TOOL 4) SMOKE: ${n} passed, 0 failed`)
