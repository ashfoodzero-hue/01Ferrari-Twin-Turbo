// smoke_data_contract.mjs — re-proves docs/DATA_CONTRACT.md on the real files (2026-10-17). If any database drifts, this fails.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv } from '../src/core/nyCandles.js'
import { findHoles } from '../src/core/dataHoles.js'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const rd = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const H = (...p) => path.join(TURBO.data, ...p)
console.log('\n██ DATA CONTRACT SMOKE ██')
await ok('spot XAUUSD: continuous from 2013-07-14, the two known Polygon holes only, and NO volume field after cleaning', async () => {
  const raw = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM })).bars, { bars } = cleanForTv(raw)
  assert(bars.length > 4_400_000); assert(bars.every((b) => !('v' in b)), 'spot v leaked through cleanForTv')
  const iso = findHoles(bars).map((h) => new Date(h.from).toISOString().slice(0, 10) + '..' + new Date(h.to).toISOString().slice(0, 10))
  console.log('      holes: ' + iso.join(' · '))
  assert(iso.includes('2019-09-04..2019-10-04') && iso.includes('2020-10-14..2020-11-13'))
  assert(iso.every((h) => ['2019-09-04..2019-10-04', '2020-10-14..2020-11-13', '2025-04-18..2025-04-21'].includes(h)), 'an UNKNOWN hole appeared: ' + iso.join(' '))   // 2025-04-18/21 = Good Friday + Easter Monday
})
await ok('GOLD_FUT: no thin October contract, front months only from G J M Q Z, volume = Databento on 100 % of same-contract minutes', async () => {
  const P = rd(H('history', 'GOLD_FUT', '1m.jsonl')), D = rd(path.join(TURBO.root, 'data', 'orderflow', 'gc_1m.jsonl')), dm = new Map(D.map((b) => [b.t, b]))
  assert(P.every((b) => /^GC[GJMQZ]\d$/.test(b.tk)), 'a non-liquid month in the series: ' + [...new Set(P.map((b) => b.tk))].join(','))
  const pair = new Map(); for (const b of P) { const d = dm.get(b.t); if (!d) continue; const m = pair.get(d.iid) || {}; m[b.tk] = (m[b.tk] || 0) + 1; pair.set(d.iid, m) }
  const tkOf = new Map([...pair].map(([i, m]) => [i, Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]]))
  let same = 0, eq = 0; for (const b of P) { const d = dm.get(b.t); if (!d || tkOf.get(d.iid) !== b.tk) continue; same++; if (d.v === b.v) eq++ }
  console.log(`      same-contract minutes ${same}, volume equal ${eq}`); assert(same > 600000); assert.equal(eq, same)
})
await ok('GLD 1m (real share volume) present from 2024-10 · macro series present · news from 2020-03 · FF calendar 2013-07 → now', async () => {
  const g = JSON.parse(fs.readFileSync(H('history', 'GLD', 'manifest_1m.json'), 'utf8')); assert(g.bars > 300000 && g.first < '2024-10-02')
  for (const [f, min] of [['treasury-yields', 16000], ['inflation', 950], ['inflation-expectations', 530], ['labor-market', 940]]) assert(JSON.parse(fs.readFileSync(H('macro', f + '.json'), 'utf8')).rows.length >= min, f)
  const news = rd(H('news', 'polygon_news.jsonl')); assert(news.length > 1800 && news[0].published_utc.startsWith('2020-03'))
  const ff = rd(H('calendar', 'ff_history.jsonl')), prog = JSON.parse(fs.readFileSync(H('calendar', 'ff_history_progress.json'), 'utf8'))
  assert(ff.length > 17000 && Object.keys(prog.failed).length === 0 && prog.done.length >= 692)
})
console.log(failed ? `✗ DATA CONTRACT SMOKE: ${n} passed, ${failed} failed` : `✅ DATA CONTRACT SMOKE: ${n} passed, 0 failed`)
