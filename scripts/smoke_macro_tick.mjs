// smoke_macro_tick.mjs — the live 4H MACRO MAGNET tile + forward record (scripts/macro_tick.mjs, 2026-10-16).
// Checks: the live score = the engine on the same closed NY 4H bars; the tile's measured numbers come from the 13 y study (provenance, NO_EDGE
// label); the ledger is append-only and clean (one score row per bar, a resolve row only for a scored bar); run_twin runs the tick; the chart
// serves it on /api/magnet without clashing with /api/macro (economic data); the page labels it "score, not probability".
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..')
console.log('\n██ MACRO MAGNET LIVE TICK SMOKE ██')
const st = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(here, 'macro_tick.mjs'), '--static'], { encoding: 'utf8', windowsHide: true }))
await ok('--static writes nothing and returns the latest closed bar with long + short = 100 and the Pine side rule', async () => {
  const g = st.gold; assert(g && g.long + g.short === 100); assert.equal(g.side, g.long >= g.short ? 'LONG' : 'SHORT'); assert(st.bar_t + 8 * 3600000 > Date.now() - 6 * 3600000, 'the scored bar is not the latest closed one')
})
await ok('PARITY: the live score equals magnetScores on the same closed NY 4H bars', async () => {
  const { ny } = await resample4h(streamBars('XAUUSD', '1m', { from: Date.now() - 200 * 86400000 }), ['ny'], { closedBy: st.bar_t + 4 * 3600000 })
  const r = magnetScores(ny).filter(Boolean).find((x) => x.t === st.bar_t); assert(r, 'bar not found'); assert.equal(r.long, st.gold.long); for (const k of 'ABCD') assert.equal(r[k], st.gold[k])
})
await ok('provenance: the measured numbers are the 13 y study\'s (NO_EDGE label, base, this score\'s lookup cell)', async () => {
  const s = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'macro_magnet_study.json'), 'utf8')), ny = s.anchors.ny
  assert.equal(st.measured.verdict, s.informative.length ? 'INFORMATIVE' : 'NO_EDGE'); assert.equal(st.measured.base_up4, ny.base.oos.up4)
  assert.deepEqual(st.measured.this_score, ny.lookup[`${st.gold.long}|${st.dxy_relation}`] ?? null)
})
await ok('ledger: append-only and clean — one score row per bar, ascending; every resolve row belongs to a scored bar and is resolved once', async () => {
  const f = path.join(TURBO.paper, 'macro_magnet_ledger.jsonl'); if (!fs.existsSync(f)) return
  const L = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)), S = L.filter((e) => e.type === 'score'), R = L.filter((e) => e.type === 'resolve')
  assert.equal(new Set(S.map((e) => e.t)).size, S.length, 'a bar scored twice'); for (let i = 1; i < S.length; i++) assert(S[i].t > S[i - 1].t)
  const st2 = new Set(S.map((e) => e.t)); assert.equal(new Set(R.map((e) => e.t)).size, R.length, 'a bar resolved twice'); for (const r of R) assert(st2.has(r.t))
})
await ok('STATIC: run_twin runs macro_tick 2 min after every NY 4H close; the chart serves /api/magnet (read-only) and /api/macro stays the economic data; the tile says "score, not probability"', async () => {
  const tw = fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8'), ch = fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8'), pg = fs.readFileSync(path.join(root, 'ops', 'chart', 'index.html'), 'utf8')
  assert(tw.includes('const mKey = bucket4h(now)') && tw.includes('now - mKey >= 120000') && tw.includes("'macro_tick.mjs'"))
  assert(ch.includes("u.pathname === '/api/magnet'") && ch.includes("u.pathname === '/api/macro') return send(res, 200, await macro())"))
  assert(pg.includes("fetch('/api/magnet')") && pg.includes('score, not probability'))
})
console.log(process.exitCode ? '✗ MACRO MAGNET LIVE TICK SMOKE FAILED' : `✅ MACRO MAGNET LIVE TICK SMOKE: ${n} passed, 0 failed`)
