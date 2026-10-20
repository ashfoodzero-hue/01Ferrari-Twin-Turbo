// smoke_dxy_cache.mjs — the DXY 1m cache (src/data/dxy.js, 2026-10-20) gives EXACTLY the full read, and refuses itself when its prefix may have changed.
// 1. pure cacheStillValid: identical → valid; file replaced / shrunk / sampled bytes changed / old correction / reader code changed → invalid; a NEW
//    correction after the cutoff → still valid (those minutes are read fresh).
// 2. real stores, window 2013-07-14 → 1 h ago: plain full read (TWIN_DXY_NO_CACHE) vs cache REBUILT 3 days back vs cache EXTENDED to now vs cache HIT
//    → every bar identical (sha1 over every 1m bar) + 1h bars identical across the cutoff.
import '../src/core/bootEnv.js'
import crypto from 'node:crypto'
import { HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadDxyBars, dxyCachedPrefix, cacheStillValid, cacheCutoff } from '../src/data/dxy.js'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const DAY = 86400000

// ── 1. pure validity ──
const fp = (o = {}) => ({ pair: 'EURUSD', file: 'f', size: 100, ino: '1', birth: '9', samples: 'abc', corr: { file: 'c', size: 10, ino: '2', birth: '8' }, ...o })
const meta = { code: 'H', cutoff: 1000, fp: [fp()] }, cur = (o = {}, c = {}) => [{ ...fp({ size: 150, ...o }), samplesAtOld: 'abc', ...c }]
ok(cacheStillValid(meta, cur(), [], 'H'), 'unchanged prefix (store grew) → valid')
ok(!cacheStillValid(meta, cur({ ino: '7' }), [], 'H'), 'store file replaced (new identity) → invalid')
ok(!cacheStillValid(meta, cur({ size: 90 }), [], 'H'), 'store shrank → invalid')
ok(!cacheStillValid(meta, cur({}, { samplesAtOld: 'xyz' }), [], 'H'), 'sampled bytes of the cached prefix changed → invalid')
ok(!cacheStillValid(meta, cur(), [999], 'H'), 'new correction for a minute BEFORE the cutoff → invalid')
ok(cacheStillValid(meta, cur(), [1000, 5000], 'H'), 'new corrections at/after the cutoff → valid (read fresh)')
ok(!cacheStillValid(meta, cur(), [], 'H2'), 'reader code changed → invalid')
ok(!cacheStillValid(meta, cur({ corr: { file: 'c', size: 5, ino: '2', birth: '8' } }), [], 'H'), 'corrections file shrank → invalid')

// ── 2. real stores ──
const to = Math.floor((Date.now() - 3600000) / 60000) * 60000, from = HISTORY_CONTINUOUS_FROM
const digest = (bars) => { const h = crypto.createHash('sha1'); for (const b of bars) h.update(JSON.stringify(b) + '\n'); return { n: bars.length, h: h.digest('hex') } }
const t0 = Date.now(), lap = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s'
process.env.TWIN_DXY_NO_CACHE = '1'
const A = digest((await loadDxyBars('1m', { from, to })).bars), A1h = digest((await loadDxyBars('1h', { from: to - 60 * DAY, to })).bars)
console.log(`  plain full read: ${A.n} bars · ${lap()}`)
delete process.env.TWIN_DXY_NO_CACHE
const P0 = await dxyCachedPrefix(Date.now() - 3 * DAY); ok(P0?.state === 'rebuilt' || P0?.state === 'extended' || P0?.state === 'hit', `cache built 3 days back (${P0?.state}, cutoff ${new Date(P0?.cutoff).toISOString().slice(0, 10)}) · ${lap()}`)
const B = digest((await loadDxyBars('1m', { from, to })).bars)
ok(B.n === A.n && B.h === A.h, `cache EXTENDED to now = full read (${B.n} bars, sha1 ${B.h.slice(0, 10)}) · ${lap()}`)
const P2 = await dxyCachedPrefix(); ok(P2?.state === 'hit' && P2.cutoff === cacheCutoff(Date.now()), `next load is a HIT (cutoff ${new Date(P2?.cutoff).toISOString().slice(0, 10)})`)
const t1 = Date.now(), C = digest((await loadDxyBars('1m', { from, to })).bars), hitS = (Date.now() - t1) / 1000
ok(C.n === A.n && C.h === A.h, `cache HIT = full read · ${hitS.toFixed(1)} s`)
ok(digest((await loadDxyBars('1h', { from: to - 60 * DAY, to })).bars).h === A1h.h, '1h bars across the cutoff = full read')
console.log(`\n  smoke_dxy_cache: ${pass}/${pass + fail} ${fail ? '❌' : '✅'}`)
process.exit(fail ? 1 : 0)
