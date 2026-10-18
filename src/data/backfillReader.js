// ════════════════════════════════════════════════════════════════════════════════
// backfillReader.js — READ-ONLY loader for the validated 9-TF history.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2 core framework (2026-06-24).
//
// 🔒 ISOLATION: reads world-market-dashboard's backfill JSONL by absolute path and
//    NEVER writes there. This is the fillable-backtest base for R3 (the 97% bar) —
//    XAUUSD 15m resolves to the 23y dukascopy set (564k bars, 2003→2026).
//
// Files are large (the 23y set is ~137 MB), so reads STREAM line-by-line; nothing
// loads the whole file into memory unless the caller asks for a bounded window.
// ════════════════════════════════════════════════════════════════════════════════

import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'
import readline from 'node:readline'
import { canonTf, normalizeBar, isSaneBar, sortBars, repairBadPrints, repairStream } from './bars.js'   // repairBadPrints: the array form (tests / external callers)
import { refHistoryFile, correctionsFile } from '../core/paths.js'
import { loadCorrections, applyCorrection } from './corrections.js'

/** Resolve the first existing candidate file for (symbol, tf). Throws if none. */
export function resolveHistoryFile(symbol, tf) {
  const candidates = refHistoryFile(symbol, canonTf(tf))
  for (const f of candidates) {
    if (fs.existsSync(f)) return f
  }
  throw new Error(
    `backfillReader: no history file for ${symbol} ${tf}. Tried:\n  ${candidates.join('\n  ')}`,
  )
}

/**
 * Async generator streaming normalized, sane bars for (symbol, tf).
 * Optional window { from, to } in UTC ms filters during the stream (no full load).
 * Bars that fail normalize/sanity are skipped and counted (see loadBars stats).
 */
// ⏩ WINDOW SEEK (2026-09-07). Measured: a 2-DAY 1m window cost 6.4 s — the same as 400 days — because every
// consumer's `from` was applied AFTER parsing all 388 MB line by line; paper_tick paid it every 15 min and
// gen_mtf_zones every 10. The stores are append-only and ascending, so a binary search over byte offsets finds a
// line that is safely BEFORE `from` (7-day margin absorbs any local disorder) and the stream starts there; the
// `t < from` filter below still applies exactly as before, so the output is identical by construction —
// smoke_data_layer proves byte-parity against the full read on the real 15m and 1m stores.
const SEEK_MIN_BYTES = 8 * 1024 * 1024
const SEEK_MARGIN_MS = 7 * 86400000
function parseT(line) { try { const b = normalizeBar(JSON.parse(line)); return b && Number.isFinite(b.t) ? b.t : null } catch { return null } }
/** First complete, parseable line starting at/after byte `offset`: { t, at } (at = byte offset of that line) or null. */
function firstLineAfter(fd, size, offset) {
  let len = 1 << 16
  for (;;) {
    const n = Math.min(len, size - offset); if (n <= 0) return null
    const buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, offset); const s = buf.toString('utf8')
    let start = 0
    if (offset > 0) { const nl = s.indexOf('\n'); if (nl < 0) { if (offset + n >= size) return null; len *= 2; continue } start = nl + 1 }
    while (start < s.length) {
      const end = s.indexOf('\n', start)
      if (end < 0) { if (offset + n >= size) { const t = parseT(s.slice(start).trim()); return t == null ? null : { t, at: offset + Buffer.byteLength(s.slice(0, start)) } } break }
      const t = parseT(s.slice(start, end).trim()); if (t != null) return { t, at: offset + Buffer.byteLength(s.slice(0, start)) }
      start = end + 1
    }
    if (offset + n >= size) return null
    len *= 2
  }
}
/** Byte offset of a line whose t < target (or 0) — the safe place to start streaming for a window at `target`. */
function seekOffset(file, target) {
  const size = fs.statSync(file).size
  if (!(size > SEEK_MIN_BYTES) || !Number.isFinite(target)) return 0
  const fd = fs.openSync(file, 'r')
  try {
    const first = firstLineAfter(fd, size, 0); if (!first || first.t >= target) return 0
    let lo = 0, hi = size, best = 0                      // invariant: the line found at/after `lo` has t < target
    while (hi - lo > (1 << 16)) {
      const mid = Math.floor((lo + hi) / 2); const L = firstLineAfter(fd, size, mid)
      if (!L) { hi = mid; continue }
      if (L.t < target) { lo = mid; best = L.at } else hi = mid
    }
    return best
  } finally { fs.closeSync(fd) }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🟥 1m ONLY (Ashraf 2026-10-08). The store holds 1m bars only; every coarser timeframe is RESAMPLED here, streaming,
// on the UTC epoch grid (bucket = floor(t / tfMs) · tfMs — the grid every Turbo2 validation and Polygon's grid-aligned
// fetch used). CAUSALITY: a bucket is emitted only when it is CLOSED — its final minute is present, or a bar of a
// later bucket exists. A trailing bucket whose last minute has not been written yet is NEVER emitted (it would be the
// forming bar). Volume = sum of 1m volumes (Polygon forex volume = quote-update count, measured).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
export const RESAMPLE_TF_MS = Object.freeze({ '1m': 60000, '3m': 180000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000, '4h': 14400000, '1d': 86400000 })

// CALENDAR grids (2026-10-09, Ashraf's 9-timeframe Fib/EMA work): 1w = week starting SUNDAY 00:00 UTC (gold reopens Sunday ~22:00 UTC, so
// a week = Sunday's open → Friday's close); 1mo = calendar month UTC. A bucket closes when its last minute exists OR the next bucket starts.
const DAY = 86400000
export const CALENDAR_TF = Object.freeze({
  '1w': { key: (t) => { const d = Math.floor(t / DAY) * DAY; return d - new Date(d).getUTCDay() * DAY }, end: (k) => k + 7 * DAY },
  '1mo': { key: (t) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) }, end: (k) => { const d = new Date(k); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) } },
})
const gridOf = (g) => (typeof g === 'number' ? { key: (t) => Math.floor(t / g) * g, end: (k) => k + g } : g)

/** Pure streaming resampler over an ascending 1m iterable → closed buckets of `ms` (a number) or a CALENDAR_TF grid. */
export async function* resampleClosed(bars1m, ms) {
  const G = gridOf(ms)
  let cur = null, lastMinute = null
  for await (const b of bars1m) {
    const k = G.key(b.t)
    if (cur && k !== cur.t) { yield cur; cur = null }
    if (!cur) cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0, src: 'resampled-1m' }
    else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.v += b.v || 0 }
    lastMinute = b.t
  }
  if (cur && lastMinute + 60000 === G.end(cur.t)) yield cur       // trailing bucket only if its final minute exists
}

/** REPAIRED 1m bars of [from, to] (2026-10-18). The bad-print rule judges a minute by its neighbours, so the window is read with REPAIR_MARGIN
 *  either side (covers weekends + holidays: the first minute after a weekend is judged against Friday's close — the known 2025-11-23T22:00
 *  XAU print sits exactly there) and then cut. Every window of every timeframe therefore judges each minute from the SAME neighbours. */
const REPAIR_MARGIN_MS = 4 * 86400000
async function* repaired1m(symbol, from, to, onRepair) {
  for await (const b of repairStream(streamBars(symbol, '1m', { from: from - REPAIR_MARGIN_MS, to: to + REPAIR_MARGIN_MS }), (r) => { if (r.t >= from && r.t <= to) onRepair(r) }))
    if (b.t >= from && b.t <= to) yield b
}
export async function* streamBars(symbol, tf, { from = -Infinity, to = Infinity, onRepair = () => {} } = {}) {
  const k = canonTf(tf)
  if (k !== '1m') {
    const ms = RESAMPLE_TF_MS[k] ?? CALENDAR_TF[k]
    if (!ms) throw new Error(`streamBars: ${tf} cannot be built from 1m (supported: ${[...Object.keys(RESAMPLE_TF_MS), ...Object.keys(CALENDAR_TF)].join(', ')})`)
    const G = gridOf(ms)
    const from1 = Number.isFinite(from) ? G.key(from) : -Infinity
    const to1 = Number.isFinite(to) ? G.end(G.key(to)) - 1 : Infinity
    // bad prints are repaired on the 1m bars BEFORE resampling (bars.js — the rule is only proven at 1 minute; on a coarse candle it erased the
    // real 2017-07-06 silver crash)
    for await (const b of resampleClosed(repaired1m(symbol, from1, to1, onRepair), ms)) {
      if (b.t < from || b.t > to) continue
      yield b
    }
    return
  }
  const file = resolveHistoryFile(symbol, tf)
  const corr = loadCorrections(correctionsFile(symbol))          // Polygon's re-issued minutes supersede the stored ones (corrections.js)
  const start = Number.isFinite(from) ? seekOffset(file, from - SEEK_MARGIN_MS) : 0
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8', start }),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    if (!line) continue
    let raw
    try { raw = JSON.parse(line) } catch { continue }
    const fixed = corr.size ? applyCorrection(raw, corr) : raw
    if (fixed === null) continue                                   // the minute was deleted by Polygon (a `deleted` correction line)
    const b = normalizeBar(fixed)
    if (!b || !isSaneBar(b)) continue
    if (b.t < from || b.t > to) continue
    yield b
  }
}

/**
 * Load a bounded window of bars into an array (ascending by time).
 * @param {string} symbol   e.g. 'XAUUSD'
 * @param {string} tf       e.g. '15m'
 * @param {object} opts     { from, to } UTC ms (defaults: full history), { limit } max bars
 * @returns {Promise<{bars, file, stats}>}  stats = { kept, span:[firstT,lastT] }
 */
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
// INTEGRITY GUARD (2026-07-08). Four local Massive backfills are PAGINATION-CAPPED, not price history:
//     5m 29.2% coverage · 30m 15.7% · 1h 15.9% · 4h 9.4%   (~20,000 bars in every single year — a fetch limit)
// Three separate conclusions were drawn from them before anyone checked, including "the edge is tape-sensitive"
// (a sparse tape has fewer bars to hit your stop on, so it MANUFACTURES a win rate). Reading a broken tape must
// never be silent again. `npm run validate:data` regenerates the verdict; pass `allowIncomplete: true` only when
// you are deliberately inspecting a broken file, and say so at the call site.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
let _integrity = null
function integrityVerdict(symbol, tf) {
  if (_integrity === null) {
    try { _integrity = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'data_integrity.json'), 'utf8')) }
    catch { _integrity = { files: [] } }        // no report yet → cannot judge; do not block
  }
  return (_integrity.files ?? []).find(f => f.symbol === symbol && f.timeframe === tf) ?? null
}

export async function loadBars(symbol, tf, opts = {}) {
  const { from, to, limit = Infinity, allowIncomplete = false } = opts
  const v = integrityVerdict(symbol, tf)
  if (v && v.usable === false && !allowIncomplete) {
    throw new Error(`REFUSING to load ${symbol}/${tf} — ${v.file} is UNUSABLE (source=${v.source}, coverage ${(100 * v.coverage).toFixed(1)}%` +
      `${v.looks_capped ? ', pagination-capped' : ''}). Re-fetch it, or pass { allowIncomplete: true } and justify it. ` +
      `Run \`npm run validate:data\` for the full report.`)
  }
  const file = resolveHistoryFile(symbol, tf)
  const bars = [], repaired = [], onRepair = (r) => repaired.push(r)
  const src = canonTf(tf) === '1m' ? repaired1m(symbol, from ?? -Infinity, to ?? Infinity, onRepair) : streamBars(symbol, tf, { from, to, onRepair })
  for await (const b of src) {
    bars.push(b)
    if (bars.length >= limit) break
  }
  sortBars(bars)
  // Bad-print repair (2026-07-18): the 2025-11-23T22:00 bar carries L/C $1,964.99 against $4,063 neighbours — a
  // bad tick that POLYGON ITSELF serves, so it cannot be re-fetched away. Repaired here, at the ONE chokepoint
  // every consumer reads through, under neighbour-consistency conditions that provably cannot fire on a real
  // crash (a real crash's next bar CONFIRMS the new price; this repair requires the next bar to DENY it).
  // (2026-10-18) the repair now happens on the 1m stream itself (repaired1m) — for 1m AND for every coarser timeframe, which is built from the
  // repaired minutes and never re-judged as a candle. Same rule (bars.repairOne), same neighbours whatever the window.
  if (repaired.length) console.warn(`  ⚠ ${symbol}/${tf}: repaired ${repaired.length} provably-false print(s): ${repaired.map((r) => r.iso.slice(0, 16) + '(' + r.fields.join('') + ')').join(', ')}`)
  const stats = {
    kept: bars.length,
    span: bars.length ? [bars[0].t, bars[bars.length - 1].t] : [null, null],
    repaired: repaired.length,
  }
  return { bars, file, stats }
}

/**
 * Cheap coverage probe without loading the whole file: first bar, last bar, count.
 * Streams once but keeps only the running endpoints — O(1) memory.
 */
export async function probeCoverage(symbol, tf) {
  const file = resolveHistoryFile(symbol, tf)
  let first = null, last = null, n = 0
  for await (const b of streamBars(symbol, tf)) {
    if (!first) first = b
    last = b
    n++
  }
  return {
    symbol,
    tf: canonTf(tf),
    file,
    n,
    first: first ? { t: first.t, iso: new Date(first.t).toISOString(), c: first.c } : null,
    last: last ? { t: last.t, iso: new Date(last.t).toISOString(), c: last.c } : null,
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CANONICAL BARS — one source of truth per resolution band.
//
// The local history holds four PAGINATION-CAPPED files (5m 29.2% · 30m 15.7% · 1h 15.9% · 4h 9.4%). They are not
// price history and `loadBars` now refuses them. But `masterAgent` and several validators asked for exactly those
// timeframes, so refusing is not enough — they need somewhere correct to go.
//
// Rule: NEVER read a per-timeframe file. Derive every timeframe from the one complete source that covers it:
//     (Turbo2 era) tf >= 15m from the Dukascopy 15m, tf < 15m from Polygon 1m.
//     🟥 TWIN 2026-10-08: EVERY tf from the twin's own Polygon 1m store — see streamBars/resampleClosed above.
// Verified 2026-07-08: dukascopy 15m and polygon(1m→:00-aligned 15m) agree on 2,304/2,306 buckets, mean |low diff|
// $0.0023 — the same prices. So resampling across the boundary is coherent, not a tape switch.
// (Polygon's OWN 15m aggregates are anchored at :05/:20/:35/:50 — never compare those bucket-to-bucket.)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const TF_MS_CANON = { '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000, '4h': 14400000, '1d': 86400000 }
// (the old array resampler lived here; the one resampler is resampleClosed above — one rule, one place)
/**
 * Load bars for ANY timeframe from the canonical complete source. Use this everywhere instead of loadBars(sym, tf).
 * @returns {{bars, base, resampledFrom}}
 */
export async function loadBarsCanonical(symbol, tf, opts = {}) {
  // 2026-10-08: the twin's ONLY base is the Polygon 1m store; loadBars itself resamples (closed buckets only).
  if (!TF_MS_CANON[tf]) throw new Error(`loadBarsCanonical: unknown timeframe ${tf}`)
  const { bars } = await loadBars(symbol, tf, opts)
  return { bars, base: '1m', resampledFrom: tf === '1m' ? null : '1m' }
}
