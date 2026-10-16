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
await ok('FORMING preview: no minutes → null; with minutes = the engine on closed bars + the open candle; the saved closed bars reproduce the official score; the API + page label it provisional', async () => {
  const { formingScore } = await import('../src/master/macroMagnet.js')
  const b = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'macro_magnet_bars.json'), 'utf8'))
  assert.equal(await formingScore(b.gold, []), null)
  const off = magnetScores(b.gold).filter(Boolean).at(-1), st2 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'macro_magnet_state.json'), 'utf8'))
  if (off.t === st2.bar_t) { assert.equal(off.long, st2.gold.long, 'saved closed bars drift from the official score'); assert.equal(off.bsl, st2.gold.bsl); assert.equal(off.ssl, st2.gold.ssl) }
  const last = b.gold.at(-1), H4 = 4 * 3600000, mins = []; for (let i = 0; i < 90; i++) { const t = last.t + H4 + i * 60000, p = last.c + i * 0.1; mins.push({ t, o: p, h: p + 0.2, l: p - 0.2, c: p + 0.05 }) }
  const f = await formingScore(b.gold, mins), manual = magnetScores([...b.gold, { t: last.t + H4, o: mins[0].o, h: Math.max(...mins.map((m) => m.h)), l: Math.min(...mins.map((m) => m.l)), c: mins.at(-1).c }]).at(-1)
  assert(f && f.forming && f.partial.minutes === 90 && f.partial.closes_at === last.t + 2 * H4); assert.equal(f.long, manual.long); for (const k of 'ABCD') assert.equal(f[k], manual[k])
  const ch = fs.readFileSync(path.join(here, 'run_chart.mjs'), 'utf8'), pg = fs.readFileSync(path.join(root, 'ops', 'chart', 'index.html'), 'utf8')
  assert(ch.includes('forming: MGF.val') && ch.includes("provisional: true") && ch.includes('Date.now() - MGF.at < 60000')); assert(pg.includes('PROVISIONAL, can change until the close') && pg.includes('function fChip()'))
})
console.log(process.exitCode ? '✗ MACRO MAGNET LIVE TICK SMOKE FAILED' : `✅ MACRO MAGNET LIVE TICK SMOKE: ${n} passed, 0 failed`)
