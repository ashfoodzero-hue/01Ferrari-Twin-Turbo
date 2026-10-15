// smoke_tick_stream.mjs — the LIVE data flow (2026-10-08): tick → 1m builder, the settle rule, the 1m-only resampler,
// the fail-closed live check, and the real store's integrity. Ashraf: "reading ticks for all, we need accurate signal".
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { MinuteBuilder, bucketBar, bucketQuote, sameBar, settleDecision, MINUTE, CA_GRACE_MS } from '../src/data/tickBars.js'
import { resampleClosed, loadBars } from '../src/data/backfillReader.js'
import { streamStatus, startTickStream } from '../src/data/tickStream.js'
import os from 'node:os'
import { loadCorrections, applyCorrection, appendCorrection, diffMinutes } from '../src/data/corrections.js'
import { loadBarsLive } from '../src/data/liveBars.js'
import { refHistoryFile } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const M0 = Date.UTC(2026, 9, 8, 16, 0)
async function* gen(a) { for (const x of a) yield x }
const collect = async (it) => { const o = []; for await (const x of it) o.push(x); return o }

console.log('\n██ TICK STREAM SMOKE ██')
await ok('BUILDER: bid OHLC + tick count; ask/spread side record; ticks of a settled minute are LATE and never rewrite it', () => {
  const b = new MinuteBuilder()
  for (const [bid, ask, dt] of [[10, 10.5, 1000], [12, 12.4, 2000], [9, 9.6, 3000], [11, 11.5, 59000]]) b.onTick({ b: bid, a: ask, t: M0 + dt })
  const k = b.buckets.get(M0); assert.deepEqual(bucketBar(k), { t: M0, o: 10, h: 12, l: 9, c: 11, v: 4 })
  const q = bucketQuote(k); assert.equal(q.ao, 10.5); assert.equal(q.ah, 12.4); assert.equal(q.al, 9.6); assert.equal(q.sp_max, 0.6); assert.equal(q.n, 4)
  assert.equal(b.onTick({ b: 1, a: 2, t: M0 + 5000 }, M0 + MINUTE), false); assert.equal(b.late, 1); assert.equal(b.buckets.get(M0).n, 4)
  assert.equal(b.onTick({ b: 0, a: 2, t: M0 }), false, 'a non-positive bid is rejected')
})
await ok('SETTLE: tick = CA → write · tick ≠ CA → arbiter · CA without ticks → arbiter · before grace → wait · ticks without CA after grace → arbiter · nothing → quiet · uncovered → arbiter', () => {
  const b = new MinuteBuilder(); b.onTick({ b: 10, a: 10.5, t: M0 + 1 }); const built = b.buckets.get(M0)
  const ca = { t: M0, o: 10, h: 10, l: 10, c: 10, v: 1 }, now = M0 + MINUTE + 3000, late = M0 + MINUTE + CA_GRACE_MS + 1
  assert.deepEqual(settleDecision({ m: M0, built, ca, now, covered: true }), { action: 'write', bar: bucketBar(built), src: 'tick', ver: 'ca' })
  assert.equal(settleDecision({ m: M0, built, ca: { ...ca, c: 10.01 }, now, covered: true }).action, 'arbiter')
  assert.equal(settleDecision({ m: M0, built, ca: { ...ca, v: 2 }, now, covered: true }).action, 'arbiter', 'volume (tick count) is part of parity')
  assert.equal(settleDecision({ m: M0, built: null, ca, now, covered: true }).action, 'arbiter')
  assert.equal(settleDecision({ m: M0, built, ca: null, now, covered: true }).action, 'wait')
  assert.equal(settleDecision({ m: M0, built, ca: null, now: late, covered: true }).action, 'arbiter')
  assert.equal(settleDecision({ m: M0, built: null, ca: null, now: late, covered: true }).action, 'quiet')
  assert.equal(settleDecision({ m: M0, built, ca, now, covered: false }).action, 'arbiter')
  assert(sameBar({ o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }, { o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }) && !sameBar(null, { o: 1 }))
})
await ok('RESAMPLE (1m only): closed buckets only — a trailing bucket without its final minute is NEVER emitted; with it, it is', async () => {
  const mins = (k0, n) => Array.from({ length: n }, (_, i) => ({ t: M0 + (k0 + i) * MINUTE, o: 1 + i, h: 2 + i, l: 0.5 + i, c: 1.5 + i, v: 1 }))
  const full = await collect(resampleClosed(gen([...mins(0, 15), ...mins(15, 7)]), 900000))
  assert.equal(full.length, 1, 'the forming 2nd bucket (7/15 minutes) must not be emitted'); assert.deepEqual([full[0].o, full[0].h, full[0].l, full[0].c, full[0].v], [1, 16, 0.5, 15.5, 15])
  const gap = await collect(resampleClosed(gen([...mins(0, 14), ...mins(15, 1)]), 900000))
  assert.equal(gap.length, 1, 'a bucket whose last minute had no ticks closes when a later bar exists')
  const both = await collect(resampleClosed(gen(mins(0, 30)), 900000)); assert.equal(both.length, 2)
})
await ok('LIVE CHECK fails closed: no heartbeat · old heartbeat · dead pid · disconnected · settled behind · symbol missing → not live; fresh+settled → live', () => {
  const now = M0 + 10 * MINUTE, need = now - 2 * MINUTE
  const hb = (o = {}) => ({ at: new Date(now - 1000).toISOString(), pid: process.pid, connected: true, symbols: { XAUUSD: { settled_through: new Date(need).toISOString() } }, ...o })
  const st = (h, extra = {}) => streamStatus({ now, needMinute: need, hb: h, ...extra })
  assert.equal(streamStatus({ now, needMinute: need, hb: undefined }).live !== undefined, true)
  assert.equal(st(hb({ at: new Date(now - 60000).toISOString() })).live, false)
  assert.equal(st(hb(), { pidAlive: () => false }).live, false)
  assert.equal(st(hb({ connected: false })).live, false)
  assert.equal(st(hb({ symbols: { XAUUSD: { settled_through: new Date(need - MINUTE).toISOString() } } })).live, false)
  assert.equal(st(hb({ symbols: {} })).live, false)
  assert.equal(st(hb()).live, true)
})
await ok('loadBarsLive: a not-live status → live:false with the reason; the forming bar is never returned', async () => {
  const now = Date.now()
  const r = await loadBarsLive('XAUUSD', '15m', { from: now - 2 * 86400000, now, status: { live: false, why: 'fixture' } })
  assert.equal(r.live, false); assert(/fixture/.test(r.source)); assert(r.bars.every((b) => b.t + 900000 <= now))
})
await ok('STATIC: liveBars has NO REST tail (ticks only) · twin_tick records nothing when stale · run_twin supervises the stream', () => {
  const lb = fs.readFileSync(new URL('../src/data/liveBars.js', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '')
  assert(!/fetchAggs|liveFeed/.test(lb), 'liveBars must not fetch REST bars')
  const tt = fs.readFileSync(new URL('./twin_tick.mjs', import.meta.url), 'utf8')
  assert(/staleWhy \? \{ added: 0/.test(tt), 'twin_tick must skip recordSignals when stale')
  assert(/waitStreamSettled/.test(tt) && /unverified/.test(tt))
  assert(/run_stream\.mjs/.test(fs.readFileSync(new URL('./run_twin.mjs', import.meta.url), 'utf8')))
})
await ok('REAL STORES (all 8): strictly ascending, no duplicate minute in the last 3 days, every streamed line carries src+ver', async () => {
  for (const s of SYMBOLS) {
    const f = refHistoryFile(s.sym, '1m')[0]; assert(fs.existsSync(f), s.sym + ' store missing')
    const size = fs.statSync(f).size, len = Math.min(size, 3 * 1440 * 140), buf = Buffer.alloc(len), fd = fs.openSync(f, 'r'); fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd)
    const lines = buf.toString('utf8').split('\n').slice(1).filter(Boolean).map((l) => JSON.parse(l))
    for (let i = 1; i < lines.length; i++) assert(lines[i].t > lines[i - 1].t, `${s.sym}: ${lines[i].t} not after ${lines[i - 1].t}`)
    for (const l of lines) if (l.src) assert(l.ver, `${s.sym}: streamed line without ver at ${l.t}`)
  }
})
await ok('STREAMER, every branch on fixtures (fake socket + fake REST + controlled clock, temp files): refill · tick=CA · CA≠tick → REST arbiter · no CA → REST empty → retry → UNVERIFIED · quiet · CA-only → arbiter · late tick rejected · disconnect → reconnect → refill', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-')), file = path.join(dir, '1m.jsonl'), qfile = path.join(dir, 'q.jsonl')
  const T = (k) => M0 + k * MINUTE
  fs.writeFileSync(file, JSON.stringify({ t: T(-10), o: 1, h: 1, l: 1, c: 1, v: 1 }) + '\n')
  let now = T(0) - 30000; const calls = []; const rest = new Map()
  const bar = (k, p, v = 1) => ({ t: T(k), o: p, h: p + 1, l: p - 1, c: p, v })
  for (let k = -9; k <= -1; k++) rest.set(T(k), bar(k, 100 + k))
  let sock = null
  class FakeWS { constructor() { sock = this; setTimeout(() => this.emit([{ ev: 'status', status: 'connected' }]), 0) }
    emit(a) { this.onmessage?.({ data: JSON.stringify(a) }) }
    send(x) { const m = JSON.parse(x); if (m.action === 'auth') this.emit([{ ev: 'status', status: 'auth_success' }]); else if (m.action === 'subscribe') this.emit(m.params.split(',').map((p) => ({ ev: 'status', status: 'success', message: 'subscribed to: ' + p }))) }
    close() { setTimeout(() => this.onclose?.({ code: 1006 }), 0) } }
  const sym = { sym: 'XAUUSD', poly: 'C:XAUUSD', ws: 'C:XAU-USD', pair: 'XAU/USD' }
  const s = startTickStream({ log: () => {}, symbols: [sym], fileOf: () => file, qfileOf: () => qfile, WS: FakeWS, clock: () => now, key: 'k',
    fetchRange: async (poly, from, to) => { calls.push([from, to]); return [...rest.values()].filter((b) => b.t >= from && b.t <= to) },
    hbFile: path.join(dir, 'hb.json'), evFile: path.join(dir, 'ev.jsonl'), loopMs: 1e9, beatMs: 1e9 })
  await new Promise((r) => setTimeout(r, 20))
  const tick = (k, bid, dt) => sock.emit([{ ev: 'C', p: 'XAU/USD', b: bid, a: bid + 0.5, t: T(k) + dt }])
  const ca = (k, o, h, l, c, v) => sock.emit([{ ev: 'CA', pair: 'XAU/USD', s: T(k), o, h, l, c, v }])
  const lines = () => fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  // 1. refill of the minutes before coverage
  now = T(0) + 6000; await s.tick()
  assert.equal(lines().filter((l) => l.ver === 'refill').length, 9, 'nine uncovered minutes refilled from REST')
  // 2. minute 0: tick bar = CA → written as tick/ca, quote side record written
  tick(0, 10, 1000); tick(0, 11, 2000); tick(0, 9, 3000); tick(0, 10.5, 4000); ca(0, 10, 11, 9, 10.5, 4)
  now = T(1) + 3000; await s.tick()
  assert.deepEqual(lines().at(-1), { t: T(0), o: 10, h: 11, l: 9, c: 10.5, v: 4, src: 'tick', ver: 'ca' })
  assert.equal(JSON.parse(fs.readFileSync(qfile, 'utf8').trim()).n, 4)
  tick(0, 50, 5000); assert.equal(s.state.get('XAUUSD').builder.late, 1, 'a tick for a settled minute is late, never applied')
  // 3. minute 1: CA disagrees → REST arbiter decides (mismatch logged)
  tick(1, 20, 1000); ca(1, 20, 20, 20, 20.5, 1); rest.set(T(1), { t: T(1), o: 20, h: 20, l: 20, c: 20.5, v: 1 })
  now = T(2) + 3000; await s.tick()
  assert.deepEqual([lines().at(-1).src, lines().at(-1).ver, lines().at(-1).agree, lines().at(-1).c], ['rest', 'arbiter', false, 20.5])
  // 4. minute 2: ticks but no CA → wait → arbiter, REST empty → retry → give up → UNVERIFIED tick bar
  tick(2, 30, 1000)
  now = T(3) + 3000; await s.tick(); assert.equal(lines().at(-1).t, T(1), 'still inside the CA grace — waits')
  now = T(3) + 9000; await s.tick(); assert.equal(lines().at(-1).t, T(1), 'REST empty — not written yet, retried later')
  now = T(3) + 46000; await s.tick()
  assert.deepEqual([lines().at(-1).t, lines().at(-1).src, lines().at(-1).ver], [T(2), 'tick', 'unverified'])
  // 5. minute 3: nothing at all → quiet (no bar) · 6. minute 4: CA without ticks → REST arbiter
  ca(4, 40, 41, 39, 40, 3); rest.set(T(4), bar(4, 40, 3))
  now = T(5) + 9000; await s.tick()
  assert.deepEqual(lines().slice(-2).map((l) => [l.t, l.src, l.ver]), [[T(2), 'tick', 'unverified'], [T(4), 'rest', 'arbiter']])
  // 7. disconnect mid-minute 6 → reconnect → coverage from minute 7 → minutes 5..6 refilled
  rest.set(T(5), bar(5, 50)); rest.set(T(6), bar(6, 60))
  now = T(6) + 20000; sock.close(); await new Promise((r) => setTimeout(r, 1200))
  now = T(7) + 6000; await s.tick()
  assert.deepEqual(lines().slice(-2).map((l) => [l.t, l.ver]), [[T(5), 'refill'], [T(6), 'refill']])
  const L = lines(); for (let i = 1; i < L.length; i++) assert(L[i].t > L[i - 1].t, 'the store stays strictly ascending')
  const c = s.state.get('XAUUSD').n; assert.deepEqual([c.tick_ca, c.arbiter, c.mismatch, c.unverified, c.refill], [1, 2, 1, 1, 11])
  s.stop()
})
await ok('RACE (2026-10-16 23:45 UTC): the socket drops DURING a refill fetch → the cursor is NOT moved to null (no 1969 settled_through, no re-fetch from 1970); after the reconnect the gap refills and the store stays ascending', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'race-')), file = path.join(dir, '1m.jsonl'), qfile = path.join(dir, 'q.jsonl'), evFile = path.join(dir, 'ev.jsonl')
  const T = (k) => M0 + k * MINUTE
  fs.writeFileSync(file, JSON.stringify({ t: T(-10), o: 1, h: 1, l: 1, c: 1, v: 1 }) + '\n')
  let now = T(0) - 30000, sock = null, dropNext = true; const rest = new Map(), calls = []
  for (let k = -9; k <= 3; k++) rest.set(T(k), { t: T(k), o: 100 + k, h: 101 + k, l: 99 + k, c: 100 + k, v: 1 })
  class FakeWS { constructor() { sock = this; setTimeout(() => this.emit([{ ev: 'status', status: 'connected' }]), 0) }
    emit(a) { this.onmessage?.({ data: JSON.stringify(a) }) }
    send(x) { const m = JSON.parse(x); if (m.action === 'auth') this.emit([{ ev: 'status', status: 'auth_success' }]); else if (m.action === 'subscribe') this.emit(m.params.split(',').map((p) => ({ ev: 'status', status: 'success', message: 'subscribed to: ' + p }))) }
    close() { setTimeout(() => this.onclose?.({ code: 1005 }), 0) } }
  const s = startTickStream({ log: () => {}, symbols: [{ sym: 'XAUUSD', poly: 'C:XAUUSD', ws: 'C:XAU-USD', pair: 'XAU/USD' }], fileOf: () => file, qfileOf: () => qfile, WS: FakeWS, clock: () => now, key: 'k',
    fetchRange: async (poly, from, to) => { calls.push([from, to]); if (dropNext) { dropNext = false; sock.close(); await new Promise((r) => setTimeout(r, 50)) } return [...rest.values()].filter((b) => b.t >= from && b.t <= to) },
    hbFile: path.join(dir, 'hb.json'), evFile, loopMs: 1e9, beatMs: 1e9 })
  await new Promise((r) => setTimeout(r, 20))
  now = T(0) + 6000; await s.tick()                                         // refill starts, the socket drops mid-fetch
  const st = s.state.get('XAUUSD'); assert(Number.isFinite(st.cursor) && st.cursor === T(-9), `cursor moved to ${st.cursor}`)
  assert(!fs.existsSync(evFile) || !fs.readFileSync(evFile, 'utf8').includes('1969-'), 'an event shows a 1969 bound')
  await new Promise((r) => setTimeout(r, 1300)); now = T(1) + 6000; await s.tick()   // reconnected (coverage from T(1)) → refill again
  assert(calls.every(([f, t]) => f >= T(-9) && t >= f), 'a fetch with an inverted / epoch range: ' + JSON.stringify(calls))
  const L = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l)); for (let i = 1; i < L.length; i++) assert(L[i].t > L[i - 1].t)
  assert(L.filter((l) => l.ver === 'refill').length >= 10, 'the gap was not refilled after the reconnect'); assert(Number.isFinite(st.cursor) && st.cursor >= T(1))
  s.stop()
})
await ok('LATE TICKS → REST re-check → CORRECTION: a late quote never rewrites the store; ~1 min later the minute is re-fetched, Polygon\'s re-issued bar is appended as ONE correction (provenance + was), the 2nd check adds nothing, and the reader applies it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'late-')), file = path.join(dir, '1m.jsonl'), qfile = path.join(dir, 'q.jsonl'), cfile = path.join(dir, 'c.jsonl')
  const T = (k) => M0 + k * MINUTE
  fs.writeFileSync(file, JSON.stringify({ t: T(-1), o: 1, h: 1, l: 1, c: 1, v: 1 }) + '\n')
  let now = T(0) - 30000; const rest = new Map(); let sock = null
  class FakeWS { constructor() { sock = this; setTimeout(() => this.emit([{ ev: 'status', status: 'connected' }]), 0) }
    emit(a) { this.onmessage?.({ data: JSON.stringify(a) }) }
    send(x) { const m = JSON.parse(x); if (m.action === 'auth') this.emit([{ ev: 'status', status: 'auth_success' }]); else if (m.action === 'subscribe') this.emit(m.params.split(',').map((p) => ({ ev: 'status', status: 'success', message: 'subscribed to: ' + p }))) }
    close() { setTimeout(() => this.onclose?.({ code: 1000 }), 0) } }
  const s = startTickStream({ log: () => {}, symbols: [{ sym: 'USDSEK', poly: 'C:USDSEK', ws: 'C:USD-SEK', pair: 'USD/SEK' }], fileOf: () => file, qfileOf: () => qfile, cfileOf: () => cfile, WS: FakeWS, clock: () => now, key: 'k',
    fetchRange: async (p, from, to) => [...rest.values()].filter((b) => b.t >= from && b.t <= to), hbFile: path.join(dir, 'hb.json'), evFile: path.join(dir, 'ev.jsonl'), loopMs: 1e9, beatMs: 1e9 })
  await new Promise((r) => setTimeout(r, 20))
  const q = (k, b, dt) => sock.emit([{ ev: 'C', p: 'USD/SEK', b, a: b + 0.002, t: T(k) + dt }])
  q(0, 10.0, 1000); q(0, 10.1, 2000); sock.emit([{ ev: 'CA', pair: 'USD/SEK', s: T(0), o: 10.0, h: 10.1, l: 10.0, c: 10.1, v: 2 }])
  now = T(1) + 3000; await s.tick()
  const lines = () => fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.deepEqual([lines().at(-1).t, lines().at(-1).ver, lines().at(-1).v], [T(0), 'ca', 2])
  q(0, 9.9, 59000)                                                    // a LATE quote for the settled minute
  now = T(1) + 4000; await s.tick()
  assert.equal(lines().at(-1).v, 2, 'the store is never rewritten by a late tick'); assert(!fs.existsSync(cfile), 'no correction before the re-check')
  rest.set(T(0), { t: T(0), o: 10.0, h: 10.1, l: 9.9, c: 9.9, v: 3 })       // Polygon folds the late quote in
  now = T(2) + 5000; await s.tick()
  const corr = fs.readFileSync(cfile, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.equal(corr.length, 1); assert.deepEqual([corr[0].t, corr[0].l, corr[0].c, corr[0].v, corr[0].src, corr[0].ver, corr[0].late_ticks, corr[0].was.v], [T(0), 9.9, 9.9, 3, 'rest', 'late-correction', 1, 2])
  now = T(2) + 5000 + 9 * MINUTE + 1; await s.tick()
  assert.equal(fs.readFileSync(cfile, 'utf8').trim().split('\n').length, 1, 'the 2nd re-check finds the same bar → no new line')
  assert.equal(s.state.get('USDSEK').recheck.size, 0, 'the minute leaves the re-check list after two checks')
  const fixed = applyCorrection(lines().at(-1), loadCorrections(cfile)); assert.deepEqual([fixed.l, fixed.c, fixed.v, fixed.ver], [9.9, 9.9, 3, 'late-correction'])
  assert.throws(() => appendCorrection(cfile, { t: 1 }, { src: 'rest' }), /provenance/)
  s.stop()
})
await ok('STATIC: every 1m read applies corrections (backfillReader.streamBars) — so every resampled timeframe inherits them', () => {
  const src = fs.readFileSync(new URL('../src/data/backfillReader.js', import.meta.url), 'utf8')
  assert(/loadCorrections\(correctionsFile\(symbol\)\)/.test(src) && /applyCorrection\(raw, corr\)/.test(src))
})

await ok('RECONCILE diff (pure): equal minutes counted; a re-issued minute (price OR volume) → correction; REST-only → missing; store-only → extra', () => {
  const st = [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }, { t: 2, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }, { t: 3, o: 1, h: 1, l: 1, c: 1, v: 1 }, { t: 5, o: 1, h: 1, l: 1, c: 1, v: 1 }]
  const re = [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }, { t: 2, o: 1, h: 2, l: 0.4, c: 1.5, v: 3 }, { t: 3, o: 1, h: 1, l: 1, c: 1, v: 9 }, { t: 4, o: 1, h: 1, l: 1, c: 1, v: 1 }]
  const d = diffMinutes(st, re)
  assert.equal(d.same, 1); assert.deepEqual(d.corrections.map((c) => c.t), [2, 3]); assert.deepEqual(d.missing, [4]); assert.deepEqual(d.extra, [5])
})

console.log(process.exitCode ? '✗ TICK STREAM SMOKE FAILED' : `✅ TICK STREAM SMOKE: ${n} passed, 0 failed`)
