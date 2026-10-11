// ════════════════════════════════════════════════════════════════════════════════
// liveFeed.js — Turbo-2's OWN isolated live bar fetcher (Polygon/Massive aggregates). (R3/R6.)
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P5.5 (2026-06-25). Polygon is THE data source (per the
// standing rule — never Yahoo). Mirrors the WMD massive_adapter pattern but is FULLY isolated
// (Turbo-2's own code + env key). Returns canonical {t,o,h,l,c,v} bars. No key → throws (the caller
// dry-runs honestly). Only used to APPEND new closed bars to the organized history (historyUpdater).
// ════════════════════════════════════════════════════════════════════════════════

import { canonTf, TF_MS } from './bars.js'
import { fetchJsonResilient } from './netResolve.js'

const POLYGON_BASE = 'https://api.polygon.io'
// The six ICE dollar-index constituents are all here so DXY can be COMPUTED from its real formula at any
// timeframe (2026-08-21) — the only DXY on disk before this was close-only daily, which cannot carry structure.
const TICKER = { XAUUSD: 'C:XAUUSD', EURUSD: 'C:EURUSD', USDJPY: 'C:USDJPY', GBPUSD: 'C:GBPUSD', XAGUSD: 'C:XAGUSD',
  USDCAD: 'C:USDCAD', USDSEK: 'C:USDSEK', USDCHF: 'C:USDCHF' }   // Polygon forex tickers
const TF_MAP = { '1m': [1, 'minute'], '5m': [5, 'minute'], '15m': [15, 'minute'], '30m': [30, 'minute'], '1h': [1, 'hour'], '4h': [4, 'hour'], '1d': [1, 'day'], '1w': [1, 'week'], '1mo': [1, 'month'] }

export function polygonKey() { return process.env.POLYGON_API_KEY || process.env.TURBO_POLYGON_KEY || null }
export function hasLiveKey() { return !!polygonKey() }

/**
 * Fetch aggregate bars for (symbol, tf) over [fromMs, toMs]. Paginates via next_url. Returns canonical
 * bars ascending. Polygon agg `t` is the window START (ms). Throws on missing key or API error.
 *
 * GRID ALIGNMENT (2026-07-09 fix): Polygon anchors intraday buckets to the `from` timestamp, NOT to the
 * :00 epoch grid. Callers pass `from = now - Ndays` (a moving target), so the 15m buckets drifted to
 * :04/:19/:34/:49 etc. — offset = `now mod tf`, changing every minute. That silently put the LIVE forecast
 * on a DIFFERENT bar grid than the :00-aligned Dukascopy/canonical bars every backtest was validated on
 * (a train/live mismatch), and made the cockpit's newest bar read ~15–30 min behind TradingView. FIX:
 * floor `from` to the timeframe bucket for intraday tfs that evenly divide a day → Polygon returns clean
 * :00-aligned bars matching backtests + TradingView. Calendar tfs (1w/1mo) keep Polygon's native anchor.
 */
// ── GLOBAL PACER (2026-07-31). The key's monthly quota is UNLIMITED on Currencies Starter, but the per-second
// BURST is capped — and the key is shared (Turbo2 + old world-market-dashboard + MCP). When several callers fire at
// once they burst past the cap → 429 → STALE cockpit, even though real-time data IS entitled. This serializes ALL
// Polygon calls to ≥ MIN_MS apart (reservation-based, concurrency-safe) so Turbo2 never bursts against its own key.
// It does NOT replace the per-request 429 backoff below (that handles OTHER apps' bursts); it prevents ours.
let _paceReserved = 0
const PACE_MIN_MS = 260                                    // ≤ ~4 req/s — comfortably under typical burst caps
async function pace() {
  const now = Date.now()
  const at = Math.max(now, _paceReserved + PACE_MIN_MS)    // reserve the next slot
  _paceReserved = at
  const wait = at - now
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
}
export async function fetchAggs(symbol, tf, fromMs, toMs, { key = polygonKey(), limit = 50000, maxPages = 20 } = {}) {
  if (!key) throw new Error('POLYGON_API_KEY not set')
  const ticker = TICKER[symbol] || symbol
  const k = canonTf(tf)
  const [mult, span] = TF_MAP[k] || [15, 'minute']
  const tfMs = TF_MS[k] || 0
  const gridAligned = tfMs > 0 && 86400000 % tfMs === 0            // 1m…4h and 1d divide a day → anchor to the :00 grid
  const from = gridAligned ? Math.floor(fromMs / tfMs) * tfMs : Math.floor(fromMs)
  let url = `${POLYGON_BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${mult}/${span}/${from}/${Math.floor(toMs)}?adjusted=true&sort=asc&limit=${limit}&apiKey=${key}`
  const out = []
  for (let page = 0; page < maxPages && url; page++) {
    // 429 BACKOFF (2026-07-23). The Polygon key is SHARED across apps on this machine (Turbo2 + the old
    // world-market-dashboard + MCP servers); a burst from any of them rate-limits all. Before this guard, ONE
    // 429 threw straight through run_forecast_live → the whole tick died → the cockpit went STALE ("do NOT
    // trade this read") — a full dashboard outage from a transient limit. Waits are SIZED TO THE CALLER'S
    // BUDGET: the forecast child gets killed at ~55s (forecastCycle), so two waits of 10s/20s (+30s worst)
    // recover a single burst inside the budget; a limit persisting beyond that still fails the tick honestly.
    // ONE fast retry only (10s): under a SUSTAINED cap (two apps on one key), longer in-request waits just
    // burned the 55s child budget and converted clean 429 failures into TIMEOUTs (measured: hb "forecast:
    // timeout" on the first post-restart run). Burst → recovered by the single retry; sustained → fail FAST,
    // the cycle skips, the cockpit shows STALE honestly, and the next cycle tries again.
    // 🚨 NETWORK BLIPS WERE NOT RETRIED (2026-08-20). The loop below retried 429 (rate limit) and nothing else,
    // so a single TCP connect timeout threw straight out of the cycle: measured repeatedly as
    // "TypeError: fetch failed / ConnectTimeoutError api.polygon.io:443", each one leaving forecast.json to age
    // until the next cadence. A 3-host probe showed the LINK itself dropping (cloudflare 0/3, github 2/3), i.e.
    // exactly the transient class a retry exists for. Two short retries fit the child's ~55s budget; a SUSTAINED
    // outage still fails fast and the cockpit still shows STALE honestly — we recover blips, we never fake data.
    let res, j
    for (let attempt = 0; ; attempt++) {
      await pace()                                          // never burst against our own shared key
      // 🚨 THE RETRY WAS TREATING A DNS FAULT AS A BLIP (2026-08-21). Measured: this machine resolves through a
      // local proxy on 127.0.0.1 that returns ENOTFOUND on ~1 in 3 COLD starts — and the forecast is a cold child
      // every 60s. Three fast retries against one broken resolver just fail three times (measured, 35s wasted).
      // fetchJsonResilient races the system resolver against three public ones and falls back to a disk-remembered
      // address, keeping TLS pinned to the HOSTNAME. The retry below still exists for genuinely transient sockets.
      try {
        const r = await fetchJsonResilient(url, { timeoutMs: 12000 })   // a hung socket must not eat the cycle budget
        res = { status: r.status, ok: r.ok }
        j = r.json || {}
      } catch (e) {
        // transient: connect timeout / socket reset / DNS outage on every resolver at once. Retry twice, then fail honestly.
        if (attempt < 2) { await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); continue }
        // 2026-09-21: 132 failures logged as "polygon network: Error after 3 attempts" — the name of the error, not its cause. Carry the
        // message so the log says WHAT failed (DNS, TLS, reset, timeout); the classifier keys stay in front of it.
        const cause = String(e?.cause?.message || e?.message || '').replace(/\s+/g, ' ').slice(0, 90)
        throw new Error('polygon network: ' + (e?.cause?.code || e?.code || e?.name || 'fetch failed') + (cause ? ' [' + cause + ']' : '') + ' after ' + (attempt + 1) + ' attempts')
      }
      if (res.status === 429 && attempt < 1) { await new Promise((r) => setTimeout(r, 10000)); continue }
      break
    }
    if (!res.ok || j.status === 'ERROR') throw new Error(`polygon ${res.status}: ${j.error || j.message || 'request failed'}`)
    for (const r of j.results || []) out.push({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v || 0 })
    url = j.next_url ? (j.next_url.includes('apiKey=') ? j.next_url : `${j.next_url}&apiKey=${key}`) : null
  }
  return out
}


/**
 * fetchAggsCached — the SAME series as fetchAggs, but only the TAIL crosses the network.
 *
 * 🚨 WHY (2026-08-20, Ashraf: "solve the stale issues 100% for all app data flow"). The live forecast ran
 * `fetchAggs('XAUUSD','15m', now - 160 DAYS, now)` EVERY 60 SECONDS — 15,360 bars re-downloaded 1,440×/day from a
 * COLD CHILD PROCESS that cannot cache anything, on a key shared with a second app. Every measured forecast
 * failure lands on exactly that call (run_forecast_live.mjs:62). Retrying a 15,360-bar request treats the symptom;
 * the request IS the fault.
 *
 * 🚨 AND WHY NOT THE OBVIOUS FIX. The first attempt spliced the LOCAL history file with a live tail. Measured
 * before wiring: 6,303 of 10,324 overlapping bars DIFFERED. Cause — data/history/XAUUSD/15m is a MIX of sources
 * (dukascopy for the older span, Polygon appended by the tick since ~June). March-April medians differ by
 * $0.215-$0.295 (p90 $0.57-$0.75) while June onward is identical to the cent. Splicing them would have fed the
 * forecast a two-source Frankenstein series. So the cache below is POLYGON-ONLY and lives in its own file: same
 * provider end to end, no cross-source blending, and the network carries a handful of bars instead of fifteen
 * thousand. A cache miss or any read error falls back to the FULL fetch — never to a short series, because a
 * truncated bar array silently changes every indicator built on it.
 */
export async function fetchAggsCached(symbol, tf, fromMs, toMs, opts = {}) {
  const fsx = await import('node:fs'), pathx = await import('node:path')
  const { TURBO } = await import('../core/paths.js')
  const dir = pathx.join(TURBO.root ?? '.', 'data', 'cache')
  const file = pathx.join(dir, 'polygon_' + symbol + '_' + tf + '.jsonl')
  const NL = String.fromCharCode(10)
  let cached = []
  try {
    cached = fsx.readFileSync(file, 'utf8').split(NL).filter(Boolean).map((l) => JSON.parse(l))
  } catch { cached = [] }
  const covers = cached.length > 0 && cached[0].t <= fromMs + 2 * 86400000   // tolerate a 2-day lead-in gap
  if (!covers) {
    const full = await fetchAggs(symbol, tf, fromMs, toMs, opts)
    try {
      fsx.mkdirSync(dir, { recursive: true })
      fsx.writeFileSync(file, full.map((b) => JSON.stringify(b)).join(NL) + NL)
    } catch { /* the cache is an optimisation, never a dependency */ }
    return full
  }
  const lastT = cached[cached.length - 1].t
  const tail = await fetchAggs(symbol, tf, lastT, toMs, opts)                 // overlap one bar, then de-duplicate
  const byT = new Map(cached.map((b) => [b.t, b]))
  for (const b of tail) byT.set(b.t, b)                                      // the live tail WINS (a forming bar finalises)
  const merged = [...byT.values()].sort((a, b) => a.t - b.t)
  try { fsx.writeFileSync(file, merged.map((b) => JSON.stringify(b)).join(NL) + NL) } catch { /* ignore */ }
  return merged.filter((b) => b.t >= fromMs && b.t <= toMs)
}

/** LIVE real-time spot via the forex snapshot (needs the real-time entitlement — works on Currencies Starter with
 *  the correct key; 403 on the free tier). Returns the last quote (bid/ask/mid) + the current forming 1m bar, which
 *  updates within the minute — the input for a 10-second live pressure pulse. Paced + fail-soft (null on any error). */
export async function liveSpot(symbol = 'XAUUSD') {
  const key = polygonKey(); if (!key) return null
  const ticker = TICKER[symbol] || symbol
  try {
    await pace()
    // 🚨 A fetch() WITH NO TIMEOUT CAN HANG FOREVER, AND THIS ONE IS CALLED EVERY SECOND (2026-08-26).
    // Node's fetch has no default timeout: if the socket stalls, the promise never settles. liveWaterfall's
    // sampler calls liveSpot on a 1s interval, so a single stalled connect parks the cycle at runs=0 with
    // NO error to show for it — which is precisely the "STALE, app is starting" state that kept coming back,
    // and why it looked like a monitoring fault rather than a network one. Measured the same session:
    // 2 of 3 requests to api.polygon.io returned HTTP 000 with DNS alone taking 8-12s.
    // Same resilient resolver the aggs path already uses, plus a hard ceiling so a dead socket fails FAST.
    const r = await fetchJsonResilient(`${POLYGON_BASE}/v2/snapshot/locale/global/markets/forex/tickers/${encodeURIComponent(ticker)}?apiKey=${key}`, { timeoutMs: 8000 })
    if (!r.ok) return null
    const j = r.json || {}; const t = j.ticker; if (!t) return null
    const q = t.lastQuote, min = t.min
    const mid = q && q.b != null && q.a != null ? (q.b + q.a) / 2 : (min ? min.c : null)
    // robust unit → ms: Polygon quote `t` is NANOSECONDS, min `t` is MILLISECONDS; guard both (and stray seconds).
    const toMs = (raw) => raw == null ? null : raw > 1e15 ? Math.round(raw / 1e6) : raw > 1e11 ? raw : raw * 1000
    const ts = toMs(q?.t) ?? toMs(min?.t) ?? Date.now()
    return { mid: mid != null ? +mid.toFixed(2) : null, bid: q?.b ?? null, ask: q?.a ?? null,
      min: min ? { o: min.o, h: min.h, l: min.l, c: min.c, v: min.v || 0, t: toMs(min.t) } : null, ts }
  } catch { return null }
}

/** Only-CLOSED-bars fetcher (window fully elapsed by `nowMs`) — the safe input to appendBars. */
export async function fetchClosedBars(symbol, tf, fromMs, nowMs, opts = {}) {
  const tfMs = TF_MS[canonTf(tf)] || 0
  const bars = await fetchAggs(symbol, tf, fromMs, nowMs, opts)
  return bars.filter((b) => b.t + tfMs <= nowMs)            // drop the still-forming current bar
}
