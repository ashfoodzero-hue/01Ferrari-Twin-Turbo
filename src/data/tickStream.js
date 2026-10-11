// ════════════════════════════════════════════════════════════════════════════════
// tickStream.js — the twin's LIVE DATA FLOW: Polygon forex ticks for EVERY symbol → verified closed 1m bars (2026-10-08).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf: "data flow reads tick for all" · "make sure that during reading market it is reading ticks for all, we need
// accurate signal for all". ONE WebSocket (wss://socket.polygon.io/forex — real-time on our plan, measured) carries the
// quote stream `C.*` and Polygon's own minute aggregate `CA.*` for all 8 symbols (src/data/symbols.js).
//
//   ticks ──► MinuteBuilder (bid bar + ask/spread)        settle loop, one minute at a time per symbol (tickBars.js):
//   CA    ──► verification of the built bar      ──►      tick = CA → write · disagreement / missing → REST arbiter
//   REST  ──► arbiter + gap refill (startup, reconnect)    append-only to data/history/<SYM>/1m.jsonl (+ quotes_1m.jsonl)
//
// THIS PROCESS IS THE ONLY WRITER of the 1m stores once it runs (lock: data/master/run_stream.lock). Every line it writes
// carries its provenance (`src`, `ver`). Heartbeat: data/master/stream_heartbeat.json (every 2 s) — the consumer
// (liveBars.loadBarsLive) refuses to call the market live unless this heartbeat is fresh, connected and settled to the
// last closed minute (R0.6 fail closed). Events (connect, refill, arbiter, mismatch, unverified): stream_events.jsonl.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, refHistoryFile, quotesFile, correctionsFile } from '../core/paths.js'
import { appendCorrection } from './corrections.js'
import { SYMBOLS, BY_PAIR } from './symbols.js'
import { fetchAggs, polygonKey } from './liveFeed.js'
import { marketOpen } from '../core/freshness.js'
import { MinuteBuilder, MINUTE, floorMin, ceilMin, bucketBar, bucketQuote, sameBar, settleDecision } from './tickBars.js'

export const HEARTBEAT_FILE = path.join(TURBO.master, 'stream_heartbeat.json')
export const EVENTS_FILE = path.join(TURBO.master, 'stream_events.jsonl')
const WS_URL = 'wss://socket.polygon.io/forex'
const ARBITER_RETRY_MS = 10000, ARBITER_GIVEUP_MS = 45000, SILENCE_RECONNECT_MS = 30000

/** Last bar time in a 1m store (reads only the tail). */
export function lastStoredT(file) {
  if (!fs.existsSync(file)) return null
  const size = fs.statSync(file).size; if (!size) return null
  const fd = fs.openSync(file, 'r'); try {
    const n = Math.min(size, 4096); const buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, size - n)
    const lines = buf.toString('utf8').trim().split('\n'); return JSON.parse(lines.at(-1)).t
  } finally { fs.closeSync(fd) }
}

/**
 * Everything external is injectable so smoke_tick_stream can drive every branch against temp files (never the real
 * store): the socket class, the REST range fetch, the clock, the files, the loop cadence.
 */
export function startTickStream({ log = console.log, symbols = SYMBOLS, fileOf = (sym) => refHistoryFile(sym, '1m')[0], qfileOf = quotesFile, cfileOf = correctionsFile,
  fetchRange = (poly, from, to) => fetchAggs(poly, '1m', from, to), WS = globalThis.WebSocket, clock = Date.now,
  hbFile = HEARTBEAT_FILE, evFile = EVENTS_FILE, loopMs = 500, beatMs = 1000, key = polygonKey() } = {}) {
  if (!key) throw new Error('POLYGON_API_KEY not set — R0: no key, no live data')
  fs.mkdirSync(path.dirname(hbFile), { recursive: true })
  const event = (e) => { try { fs.appendFileSync(evFile, JSON.stringify({ at: new Date().toISOString(), ...e }) + '\n') } catch { /* never kill the stream over a log line */ } }
  const S = new Map()
  for (const s of symbols) {
    const file = fileOf(s.sym)
    const last = lastStoredT(file)
    if (last == null) throw new Error(`${s.sym}: no 1m store at ${file} — run npm run import:1m first`)
    S.set(s.sym, { ...s, file, qfile: qfileOf(s.sym), cfile: cfileOf(s.sym), recent: new Map(), recheck: new Map(), last, cursor: last + MINUTE, builder: new MinuteBuilder(), ca: new Map(),
      arb: new Map(), lastBid: null, lastAsk: null, lastTickAt: null, tickTimes: [],
      n: { tick_ca: 0, arbiter: 0, arbiter_agree: 0, unverified: 0, refill: 0, quiet: 0, mismatch: 0, rechecked: 0, corrected: 0, late_not_in_store: 0 } })
  }
  const pairToSym = Object.fromEntries(symbols.map((x) => [x.pair, x.sym]))
  let ws = null, connected = false, coverageFrom = null, lastMsgAt = null, reconnects = 0, backoff = 1000, stopping = false, subscribed = 0

  const append = (st, bar, src, ver, extra = {}) => {
    if (bar.t <= st.last) { event({ sym: st.sym, kind: 'skip-not-after-last', t: bar.t }); return false }   // append-only
    fs.appendFileSync(st.file, JSON.stringify({ t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v, src, ver, ...extra }) + '\n')
    st.last = bar.t
    st.recent.set(bar.t, { t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v }); if (st.recent.size > 400) st.recent.delete(st.recent.keys().next().value)
    return true
  }
  const appendQuote = (st, k) => { if (k) fs.appendFileSync(st.qfile, JSON.stringify(bucketQuote(k)) + '\n') }

  function connect() {
    if (stopping) return
    subscribed = 0
    ws = new WS(WS_URL)
    ws.onmessage = (ev) => {
      lastMsgAt = clock()
      let arr; try { arr = JSON.parse(ev.data) } catch { return }
      for (const m of arr) {
        if (m.ev === 'status') {
          if (m.status === 'connected') ws.send(JSON.stringify({ action: 'auth', params: key }))
          else if (m.status === 'auth_success') ws.send(JSON.stringify({ action: 'subscribe', params: symbols.flatMap((s) => ['C.' + s.ws, 'CA.' + s.ws]).join(',') }))
          else if (m.status === 'success' && /subscribed to/.test(m.message || '')) {
            if (++subscribed === symbols.length * 2) { connected = true; backoff = 1000; coverageFrom = ceilMin(clock()); event({ kind: 'connected', coverage_from: new Date(coverageFrom).toISOString() }); log(`  stream: connected · all ${symbols.length} symbols subscribed · full coverage from ${new Date(coverageFrom).toISOString()}`) }
          } else { event({ kind: 'status', status: m.status, message: m.message }); if (m.status === 'auth_failed' || m.status === 'max_connections') log(`  🚨 stream ${m.status}: ${m.message}`) }
        } else if (m.ev === 'C') {
          const st = S.get(pairToSym[m.p]); if (!st) continue
          if (st.builder.onTick({ b: m.b, a: m.a, t: m.t }, st.cursor)) { st.lastBid = m.b; st.lastAsk = m.a; st.lastTickAt = m.t; st.tickTimes.push(clock()) }
        } else if (m.ev === 'CA') {
          const st = S.get(pairToSym[m.pair]); if (!st || m.s < st.cursor) continue
          st.ca.set(m.s, { t: m.s, o: m.o, h: m.h, l: m.l, c: m.c, v: m.v })
        }
      }
    }
    ws.onclose = (e) => {
      const was = connected; connected = false; coverageFrom = null
      if (stopping) return
      reconnects++; event({ kind: 'disconnected', code: e.code, was_connected: was })
      log(`  ⚠ stream closed (code ${e.code}) — reconnect in ${backoff / 1000}s; minutes not covered will be refilled from REST`)
      setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000)
    }
    ws.onerror = () => { /* onclose follows */ }
  }

  async function restMinute(st, m) {
    const bars = await fetchRange(st.poly, m, m + MINUTE - 1)
    return bars.find((b) => b.t === m) ?? null
  }

  // ── LATE TICKS → RE-CHECK → CORRECTION (2026-10-08). A tick stamped inside an already-settled minute never rewrites the store; the
  // minute is re-fetched from REST ~1 min later and again ~10 min later, and if Polygon's bar now differs from what was written, a
  // correction line is appended (corrections.js; the reader applies it). Measured: USDSEK 16:10 was re-issued 45 → 173 ticks.
  function scheduleLate(st, now) {
    for (const [m, k] of st.builder.lateByMinute) { const r = st.recheck.get(m) ?? { due: now + 60000, tries: 0, late: 0 }; r.late += k; st.recheck.set(m, r) }
    st.builder.lateByMinute.clear()
  }
  async function recheckDue(st, now) {
    for (const [m, r] of [...st.recheck]) {
      if (now < r.due) continue
      r.tries++; let rest = null
      try { rest = await restMinute(st, m) } catch (e) { event({ sym: st.sym, kind: 'recheck-error', t: m, err: String(e.message).slice(0, 120) }) }
      const known = st.recent.get(m)
      if (rest && !known) { st.n.late_not_in_store++; event({ sym: st.sym, kind: 'late-minute-not-in-store', t: new Date(m).toISOString(), late_ticks: r.late }) }
      else if (rest && !sameBar(rest, known)) {
        appendCorrection(st.cfile, rest, { src: 'rest', ver: 'late-correction', late_ticks: r.late, was: known })
        st.recent.set(m, { t: m, o: rest.o, h: rest.h, l: rest.l, c: rest.c, v: rest.v }); st.n.corrected++
        event({ sym: st.sym, kind: 'correction', t: new Date(m).toISOString(), late_ticks: r.late, was: known, now: rest })
      }
      st.n.rechecked++
      if (r.tries >= 2) st.recheck.delete(m); else r.due = now + 9 * 60000
    }
  }

  async function settle(st, now) {
    while (st.cursor <= floorMin(now) - MINUTE) {
      const m = st.cursor
      if (coverageFrom == null) return                                      // disconnected — wait, refill after reconnect
      if (m < coverageFrom) {
        if (now < coverageFrom + 5000) return                               // the last uncovered minute is not served yet
        const bars = (await fetchRange(st.poly, m, coverageFrom - 1)).filter((b) => b.t >= m && b.t < coverageFrom).sort((a, b) => a.t - b.t)
        let k = 0; for (const b of bars) if (append(st, b, 'rest', 'refill')) k++
        st.n.refill += k; st.builder.dropBefore(coverageFrom); for (const t of [...st.ca.keys()]) if (t < coverageFrom) st.ca.delete(t)
        event({ sym: st.sym, kind: 'refill', from: new Date(m).toISOString(), to: new Date(coverageFrom - MINUTE).toISOString(), bars: k })
        st.cursor = coverageFrom; continue
      }
      const built = st.builder.buckets.get(m) ?? null, ca = st.ca.get(m) ?? null
      const d = settleDecision({ m, built, ca, now, covered: true })
      if (d.action === 'wait') return
      if (d.action === 'quiet') { st.n.quiet++; st.cursor += MINUTE; continue }
      if (d.action === 'write') { append(st, d.bar, d.src, d.ver); appendQuote(st, st.builder.take(m)); st.ca.delete(m); st.n.tick_ca++; st.cursor += MINUTE; continue }
      // arbiter: REST decides; retried every 10 s, given up 45 s after the minute closed
      const a = st.arb.get(m) ?? { tries: 0, next: 0 }
      if (now < a.next) return
      a.tries++; a.next = now + ARBITER_RETRY_MS; st.arb.set(m, a)
      let rest = null; try { rest = await restMinute(st, m) } catch (e) { event({ sym: st.sym, kind: 'arbiter-error', t: m, err: String(e.message).slice(0, 120) }) }
      const b = built ? bucketBar(built) : null
      if (rest) {
        const agree = sameBar(b, rest); if (b && !agree) { st.n.mismatch++; event({ sym: st.sym, kind: 'mismatch', t: new Date(m).toISOString(), why: d.why, tick: b, ca, rest }) }
        append(st, rest, 'rest', 'arbiter', { why: d.why, agree }); st.n.arbiter++; if (agree) st.n.arbiter_agree++
      } else if (now >= m + MINUTE + ARBITER_GIVEUP_MS) {
        if (b) { append(st, b, 'tick', 'unverified', { why: d.why }); st.n.unverified++; event({ sym: st.sym, kind: 'unverified', t: new Date(m).toISOString(), why: d.why }) }
        else st.n.quiet++
      } else return                                                           // REST not served yet — retry later
      appendQuote(st, st.builder.take(m)); st.ca.delete(m); st.arb.delete(m); st.cursor += MINUTE
    }
  }

  const beat = () => {
    const now = clock()
    const symbols = {}
    for (const st of S.values()) {
      st.tickTimes = st.tickTimes.filter((x) => x > now - 60000)
      // DISPLAY ONLY (2026-10-09, the live chart): the minute still being built from ticks — never written to the store, never read by a
      // decision (decisions use settled minutes only). Marked forming:true so no reader can mistake it for a closed bar.
      let fk = -Infinity; for (const t of st.builder.buckets.keys()) if (t > fk) fk = t
      const fb = fk > -Infinity ? st.builder.buckets.get(fk) : null
      symbols[st.sym] = { bid: st.lastBid, ask: st.lastAsk, last_tick_at: st.lastTickAt && new Date(st.lastTickAt).toISOString(), ticks_last_60s: st.tickTimes.length,
        settled_through: new Date(st.cursor - MINUTE).toISOString(), last_bar: new Date(st.last).toISOString(), late_ticks: st.builder.late, counts: st.n,
        forming: fb ? { t: fb.t, o: fb.bid.o, h: fb.bid.h, l: fb.bid.l, c: fb.bid.c, v: fb.n, forming: true } : null }
    }
    const hb = { at: new Date(now).toISOString(), pid: process.pid, connected, coverage_from: coverageFrom && new Date(coverageFrom).toISOString(),
      last_msg_at: lastMsgAt && new Date(lastMsgAt).toISOString(), reconnects, market_open: marketOpen(now), symbols }
    try { fs.writeFileSync(hbFile + '.tmp', JSON.stringify(hb, null, 1)); fs.renameSync(hbFile + '.tmp', hbFile) } catch { /* next beat */ }
  }

  let busy = false
  const loop = setInterval(async () => {
    if (busy) return; busy = true
    try {
      const now = clock()
      if (connected && marketOpen(now) && lastMsgAt && now - lastMsgAt > SILENCE_RECONNECT_MS) { event({ kind: 'silence-reconnect', silent_ms: now - lastMsgAt }); try { ws.close() } catch { /* */ } }
      for (const st of S.values()) { await settle(st, now); scheduleLate(st, now); await recheckDue(st, now) }
    } catch (e) { event({ kind: 'loop-error', err: String(e.stack || e).slice(0, 300) }); log('  🚨 stream loop: ' + String(e.message).slice(0, 160)) }
    finally { busy = false }
  }, loopMs)
  const hbTimer = setInterval(beat, beatMs)
  connect(); beat()
  return { tick: async () => { for (const st of S.values()) { const now = clock(); await settle(st, now); scheduleLate(st, now); await recheckDue(st, now) } }, beat, stop() { stopping = true; clearInterval(loop); clearInterval(hbTimer); try { ws?.close() } catch { /* */ } beat() }, state: S }
}

/**
 * The consumer's check (liveBars, twin_tick): is the tick stream LIVE and settled through `needMinute`?
 * Fail closed — anything unknowable is NOT live.
 */
export function streamStatus({ now = Date.now(), needMinute = floorMin(now) - MINUTE, symbols = ['XAUUSD'], hb = null, maxBeatAgeMs = 10000, pidAlive = null } = {}) {
  const h = hb ?? (() => { try { return JSON.parse(fs.readFileSync(HEARTBEAT_FILE, 'utf8')) } catch { return null } })()
  if (!h) return { live: false, why: 'no stream heartbeat (is the streamer running? npm start)' }
  const age = now - Date.parse(h.at)
  if (!(age <= maxBeatAgeMs)) return { live: false, why: `stream heartbeat ${Math.round(age / 1000)} s old` }
  if (pidAlive && !pidAlive(h.pid)) return { live: false, why: `streamer pid ${h.pid} is not running` }
  if (!h.connected) return { live: false, why: 'stream disconnected' }
  for (const s of symbols) {
    const x = h.symbols?.[s]; if (!x) return { live: false, why: `${s} missing from the stream` }
    if (Date.parse(x.settled_through) < needMinute) return { live: false, why: `${s} settled only through ${x.settled_through} (need ${new Date(needMinute).toISOString()})` }
  }
  return { live: true, why: null, hb: h }
}

/** Wait (polling the heartbeat) until the stream is live and settled through `needMinute`, or the timeout passes. */
export async function waitStreamSettled({ needMinute, symbols = ['XAUUSD'], timeoutMs = 25000, pidAlive = null } = {}) {
  const t0 = Date.now(); let st
  for (;;) {
    st = streamStatus({ now: Date.now(), needMinute, symbols, pidAlive })
    if (st.live || Date.now() - t0 >= timeoutMs) return { ...st, waited_ms: Date.now() - t0 }
    await new Promise((r) => setTimeout(r, 500))
  }
}
