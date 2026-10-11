// smoke_day_levels.mjs — TOOL 3 (previous-2-days / today's high-low): day summaries, the 10-hour rule (Sunday stubs never become PDH/PDL),
// today's H/L only to the last CLOSED hour, and the study artifacts' verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dailyStats, prevDays, dayLevelsAt, DAY_MS } from '../src/master/dayLevels.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
console.log('\n██ DAY LEVELS (TOOL 3) SMOKE ██')
const D0 = Date.UTC(2026, 9, 5)   // a Monday
const day = (d, mins, base) => Array.from({ length: mins }, (_, k) => ({ t: d + k * 60000, o: base, h: base + 1 + (k === 100 ? 9 : 0), l: base - 1 - (k === 200 ? 9 : 0), c: base }))
const M = [...day(D0 - 3 * DAY_MS, 1380, 100), ...day(D0 - 2 * DAY_MS, 1380, 200), ...day(D0 - DAY_MS + 22 * 3600000, 120, 300), ...day(D0, 1380, 400)]   // Thu, Fri, Sunday stub, Monday
await ok('the Sunday stub (120 min) is never a previous day: Monday\'s PDH/PDL = Friday, P2D = Thursday', () => {
  const { list } = dailyStats(M); const P = prevDays(list, D0); assert.equal(P.pd.h, 210); assert.equal(P.pd.l, 190); assert.equal(P.p2d.h, 110)
})
await ok('today\'s H/L uses only minutes before the last closed hour (no look-ahead inside the hour)', () => {
  const { list } = dailyStats(M)
  const at = dayLevelsAt(M, list, D0 + 100 * 60000 + 30000)        // 01:40:30 — the hour 01:00-02:00 is not closed: the 01:40 spike is invisible
  assert.equal(at.TDH, 401); const later = dayLevelsAt(M, list, D0 + 2 * 3600000 + 1); assert.equal(later.TDH, 410)
  assert.equal(at.H48, 210); assert.equal(at.L48, 90)
})
await ok('study artifacts: bounce / magnet / filter verdicts follow their pre-registered rules', () => {
  const A = JSON.parse(fs.readFileSync(path.join(master, 'day_levels_study.json'), 'utf8')); assert.equal(Object.keys(A.bounce).length, 6); assert.equal(Object.keys(A.magnet).length, 4)
  for (const c of Object.values(A.bounce)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
  for (const c of Object.values(A.magnet)) assert.equal(c.verdict, c.oos.n < 100 ? 'UNDERPOWERED' : c.oos.hit_lb > c.oos.mirror && c.train.hit > c.train.mirror ? 'MAGNET' : 'NOT_A_MAGNET')
  const B = JSON.parse(fs.readFileSync(path.join(master, 'day_matrix_filter.json'), 'utf8'))
  for (const v of Object.values(B.primary.filters)) assert.equal(v.verdict, v.oos.n < 100 ? 'UNDERPOWERED' : v.oos.net_lb > 0 && v.train.net > 0 ? 'PASS' : 'FAIL')
})
console.log(process.exitCode ? '✗ DAY LEVELS SMOKE FAILED' : `✅ DAY LEVELS (TOOL 3) SMOKE: ${n} passed, 0 failed`)
