// ════════════════════════════════════════════════════════════════════════════════
// dxy.js — the US Dollar Index REBUILT from its six live Polygon pairs (2026-10-09; Ashraf approved: "Rebuild from 6 pairs").
// ────────────────────────────────────────────────────────────────────────────────
// I:DXY is not live on our plan (measured: delayed, no 1m bars). The official ICE formula:
//   DXY = 50.14348112 · EURUSD^-0.576 · USDJPY^0.136 · GBPUSD^-0.119 · USDCAD^0.091 · USDSEK^0.042 · USDCHF^0.036
// Per minute, ONLY where all six pairs have a bar (a missing pair = no DXY bar — never forward-filled, R0.6). OPEN and CLOSE are exact
// (formula on the six opens / six closes, all Polygon BID); HIGH/LOW of a product cannot be recovered from the components' highs/lows,
// so h = max(o, c), l = min(o, c) — CLOSE-BASED candles, labelled src 'dxy-rebuilt'. No volume (an index has none). Every reader —
// study, chart, live — goes through these functions (one rule, one place).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { streamBars, resampleClosed, resolveHistoryFile } from './backfillReader.js'
import { ROOT, correctionsFile } from '../core/paths.js'

export const DXY_K = 50.14348112
export const DXY_WEIGHTS = Object.freeze({ EURUSD: -0.576, USDJPY: 0.136, GBPUSD: -0.119, USDCAD: 0.091, USDSEK: 0.042, USDCHF: 0.036 })
const PAIRS = Object.keys(DXY_WEIGHTS)

/** DXY from one price per pair (pure). */
export function dxyValue(px) { let v = DXY_K; for (const p of PAIRS) { const x = px[p]; if (!(x > 0)) return null; v *= x ** DXY_WEIGHTS[p] } return v }

/** Merge-join the six 1m streams on t → DXY 1m bars (only minutes where all six exist). Streaming, O(1) memory. */
export async function* streamDxy1m({ from = -Infinity, to = Infinity } = {}) {
  const its = PAIRS.map((p) => streamBars(p, '1m', { from, to })[Symbol.asyncIterator]())
  const head = await Promise.all(its.map((it) => it.next()))
  for (;;) {
    if (head.some((h) => h.done)) return
    const ts = head.map((h) => h.value.t), max = Math.max(...ts)
    if (ts.every((t) => t === max)) {
      const o = dxyValue(Object.fromEntries(PAIRS.map((p, k) => [p, head[k].value.o]))), c = dxyValue(Object.fromEntries(PAIRS.map((p, k) => [p, head[k].value.c])))
      if (o != null && c != null) yield { t: max, o: +o.toFixed(4), h: +Math.max(o, c).toFixed(4), l: +Math.min(o, c).toFixed(4), c: +c.toFixed(4), v: 0, src: 'dxy-rebuilt' }
      for (let k = 0; k < its.length; k++) head[k] = await its[k].next()
    } else for (let k = 0; k < its.length; k++) if (ts[k] < max) head[k] = await its[k].next()   // advance the laggards
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 1m CACHE (2026-10-20, Ashraf: "measure why DXY_ICE S/R refresh is slow and fix it"). MEASURED: a full-history DXY read (6 × ≈ 470 MB pair stores,
// merge-joined minute by minute) costs 166 s of sr_refresh DXY_ICE's ≈ 285 s (gold's one store: 16 s); three hourly jobs pay it (S/R DXY + DXY_ICE,
// trendlines DXY_ICE) and under load one run reached 596 s of its 600 s limit (10-20 10:28 UTC). The cache holds the joined minutes BEFORE a cutoff
// (≥ 10 days back); minutes after it are always read fresh from the stores (the seek makes that cheap). Output = the full read, by construction:
// the join is per minute, the pair stores are append-only (verified each load: same file identity, size not smaller, 33 sampled 4 KB blocks of the
// cached prefix unchanged), and a Polygon correction line for a minute before the cutoff (corrections.js, read-time) invalidates it. Anything
// unexpected → the cache is not used (plain full read, as before). Rebuilt in full every 7 days; extended (cutoff moved) every ~2 days.
// Proof: scripts/smoke_dxy_cache.mjs (cached = full read, every bar; invalidation cases).
// ════════════════════════════════════════════════════════════════════════════════
const DAY = 86400000, CACHE_MARGIN = 10 * DAY, CACHE_FULL_MAX_AGE = 7 * DAY
export const DXY_CACHE_FILE = path.join(ROOT, 'data', 'cache', 'dxy_1m.bin')
const CODE_FILES = ['./dxy.js', './backfillReader.js', './bars.js', './corrections.js', './sourceQuirks.js'].map((f) => fileURLToPath(new URL(f, import.meta.url)))
const codeHash = () => crypto.createHash('sha1').update(Buffer.concat(CODE_FILES.map((f) => fs.readFileSync(f)))).digest('hex')
/** Pure: the cutoff for a cache built at `now` (UTC day boundary ≥ 10 days back). */
export const cacheCutoff = (now) => Math.floor((now - CACHE_MARGIN) / DAY) * DAY
const statId = (f) => { const s = fs.statSync(f, { bigint: true }); return { size: Number(s.size), ino: String(s.ino), birth: String(s.birthtimeNs) } }
function samples(file, size) {
  if (!(size > 0)) return ''
  const fd = fs.openSync(file, 'r'), h = crypto.createHash('sha1'), n = Math.min(4096, size), buf = Buffer.alloc(n)
  try { for (let k = 0; k <= 32; k++) { fs.readSync(fd, buf, 0, n, Math.floor((k * (size - n)) / 32)); h.update(buf) } } finally { fs.closeSync(fd) }
  return h.digest('hex')
}
/** Fingerprint of every pair's store + corrections file now. */
function fingerprint() {
  return PAIRS.map((p) => { const f = resolveHistoryFile(p, '1m'), s = statId(f), cf = correctionsFile(p); let c = { size: 0, ino: null, birth: null }; try { c = statId(cf) } catch { /* none yet */ }
    return { pair: p, file: f, ...s, samples: samples(f, s.size), corr: { file: cf, ...c } } })
}
/** Pure: is the cached prefix still the truth? meta.fp = fingerprints at build; cur = now (+ samplesAtOld = the same 33 blocks re-read over the
 *  OLD size); newCorrT = minutes of the correction lines appended since the build; hash = the reader code now. */
export function cacheStillValid(meta, cur, newCorrT, hash) {
  if (!meta || meta.code !== hash || meta.fp?.length !== cur.length) return false
  return meta.fp.every((o, k) => { const c = cur[k]
    return o.pair === c.pair && o.file === c.file && o.ino === c.ino && o.birth === c.birth && c.size >= o.size && c.samplesAtOld === o.samples &&
      c.corr.size >= o.corr.size && (o.corr.size === 0 || (o.corr.ino === c.corr.ino && o.corr.birth === c.corr.birth)) }) && !newCorrT.some((t) => t < meta.cutoff)
}
function readCache() {
  try { const B = fs.readFileSync(DXY_CACHE_FILE), L = B.readUInt32LE(0), meta = JSON.parse(B.toString('utf8', 4, 4 + L)), off = Math.ceil((4 + L) / 8) * 8
    const F = new Float64Array(B.buffer.slice(B.byteOffset + off, B.byteOffset + B.length)); return F.length === meta.n * 3 ? { meta, F } : null } catch { return null }
}
function writeCache(meta, F) {
  try { const J = Buffer.from(JSON.stringify(meta)), off = Math.ceil((4 + J.length) / 8) * 8, B = Buffer.alloc(off + F.byteLength)
    B.writeUInt32LE(J.length, 0); J.copy(B, 4); Buffer.from(F.buffer, F.byteOffset, F.byteLength).copy(B, off)
    fs.mkdirSync(path.dirname(DXY_CACHE_FILE), { recursive: true }); const tmp = `${DXY_CACHE_FILE}.${process.pid}.tmp`; fs.writeFileSync(tmp, B); fs.renameSync(tmp, DXY_CACHE_FILE) } catch { /* best effort: the next load reads the stores */ }
}
// o, c are stored as the stream rounded them (4 dp); the stream's h / l = the rounded max / min of the same two values → identical bars
const toBar = (t, o, c) => ({ t, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 0, src: 'dxy-rebuilt' })
async function joined(from, to) { const out = []; for await (const b of streamDxy1m({ from, to })) out.push(b.t, b.o, b.c); return out }
/** Correction minutes appended to a corrections file after byte `fromSize`. */
function newCorrectionTimes(file, fromSize, size) {
  if (!(size > fromSize)) return []
  const fd = fs.openSync(file, 'r'), buf = Buffer.alloc(size - fromSize); try { fs.readSync(fd, buf, 0, buf.length, fromSize) } finally { fs.closeSync(fd) }
  return buf.toString('utf8').split('\n').map((l) => { try { return JSON.parse(l).t } catch { return null } }).filter(Number.isFinite)
}
/** The cached prefix (t < cutoff) as Float64Array [t,o,c]…, validated / extended / rebuilt; null → the caller does the plain full read. */
export async function dxyCachedPrefix(now = Date.now()) {
  if (process.env.TWIN_RAW_POLYGON_TIMES === '1' || process.env.TWIN_DXY_NO_CACHE === '1') return null
  const hash = codeHash(), want = cacheCutoff(now), C = readCache()
  let ok = false
  if (C && now - C.meta.full_built < CACHE_FULL_MAX_AGE) {
    const cur = fingerprint().map((c, k) => ({ ...c, samplesAtOld: C.meta.fp[k] ? samples(c.file, C.meta.fp[k].size) : null }))
    const newT = cur.flatMap((c, k) => (C.meta.fp[k] ? newCorrectionTimes(c.corr.file, C.meta.fp[k].corr.size, c.corr.size) : []))
    ok = cacheStillValid(C.meta, cur, newT, hash)
  }
  if (ok && C.meta.cutoff >= want - DAY) return { F: C.F, cutoff: C.meta.cutoff, state: 'hit' }
  const fp = fingerprint(), base = ok ? C : null, add = await joined(base ? base.meta.cutoff : -Infinity, want - 1)
  const F = new Float64Array((base ? base.F.length : 0) + add.length); if (base) F.set(base.F, 0); F.set(add, base ? base.F.length : 0)
  writeCache({ v: 1, code: hash, cutoff: want, n: F.length / 3, full_built: base ? base.meta.full_built : now, built: now, fp }, F)
  return { F, cutoff: want, state: base ? 'extended' : 'rebuilt' }
}

const TFMS = { '1m': 60000, '3m': 180000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }
/** DXY bars at any timeframe (closed buckets only, like every other series). A window that starts before the cache cutoff reads the cache. */
export async function loadDxyBars(tf, { from = -Infinity, to = Infinity, now = Date.now() } = {}) {
  const ms = TFMS[tf]; if (!ms) throw new Error('loadDxyBars: unsupported tf ' + tf)
  const out = [], f1 = Number.isFinite(from) ? Math.floor(from / ms) * ms : from, t1 = Number.isFinite(to) ? Math.floor(to / ms) * ms + ms - 1 : to
  let src = null
  if (f1 < cacheCutoff(now) - DAY) { const P = await dxyCachedPrefix(now)
    if (P) src = (async function* () { const F = P.F
      for (let i = 0; i < F.length; i += 3) { const t = F[i]; if (t < f1) continue; if (t > t1) return; yield toBar(t, F[i + 1], F[i + 2]) }
      if (t1 >= P.cutoff) yield* streamDxy1m({ from: Math.max(f1, P.cutoff), to: t1 }) })() }
  src ??= streamDxy1m({ from: f1, to: t1 })
  for await (const b of tf === '1m' ? src : resampleClosed(src, ms)) { if (b.t >= from && b.t <= to) out.push(tf === '1m' ? b : { ...b, src: 'dxy-rebuilt' }) }
  return { bars: out }
}
