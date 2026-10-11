// ════════════════════════════════════════════════════════════════════════════════
// resample.js — calendar-aware bar aggregation (base TF → any higher TF). Look-ahead-free.
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Agent 1 · Structure (2026-06-25).
//
// The system reads 9 TFs (1m·5m·15m·30m·1h·4h·1d·1w·1mo) but the deep history is a single
// base series (15m dukascopy 2003→, or 1m/5m). This aggregates a base series into a higher TF
// with CORRECT calendar boundaries (1d = UTC midnight, 1w = ISO Monday, 1mo = 1st of month —
// fixed-ms bucketing is WRONG for weeks/months). A bucket is built ONLY from base bars inside
// it, so resampling bars ≤ `at` is causal by construction. Each bucket exposes open_t/close_t
// so a consumer can tell a CLOSED (prior) period from the DEVELOPING (current) one.
// ════════════════════════════════════════════════════════════════════════════════

import { canonTf, TF_MS } from '../data/bars.js'

const HOUR = 3_600_000, DAY = 86_400_000
const FIXED = new Set(['1m', '5m', '15m', '30m', '1h', '4h'])   // align to UTC epoch multiples

/** UTC ms of the start of the bucket (for `tf`) that contains time `t`. */
export function periodStart(t, tf) {
  const k = canonTf(tf)
  if (FIXED.has(k)) { const ms = TF_MS[k]; return Math.floor(t / ms) * ms }
  const d = new Date(t)
  if (k === '1d') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  if (k === '1w') {                                   // ISO week: Monday 00:00 UTC
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    const dow = (new Date(dayStart).getUTCDay() + 6) % 7   // 0=Mon … 6=Sun
    return dayStart - dow * DAY
  }
  if (k === '1mo') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  throw new Error(`resample: unsupported tf ${tf}`)
}

/** UTC ms of the NEXT bucket start after a bucket beginning at `startMs` (its exclusive end). */
export function nextPeriodStart(startMs, tf) {
  const k = canonTf(tf)
  if (FIXED.has(k)) return startMs + TF_MS[k]
  const d = new Date(startMs)
  if (k === '1d') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
  if (k === '1w') return startMs + 7 * DAY
  if (k === '1mo') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
  throw new Error(`resample: unsupported tf ${tf}`)
}

/**
 * Aggregate ascending base bars into `tf` buckets.
 * @returns {Array<{t,o,h,l,c,v,n,open_t,close_t}>}  open_t==t (bucket open), close_t exclusive end.
 */
export function resample(baseBars, tf) {
  const k = canonTf(tf)
  const out = []
  let cur = null
  for (const b of baseBars) {
    if (cur && b.t >= cur.close_t) { out.push(cur); cur = null }     // boundary crossed → seal
    // a base bar may sit in a much-later bucket (gap) — seal & advance until it fits
    if (cur && b.t < cur.open_t) continue                            // out-of-order guard (shouldn't happen if sorted)
    if (!cur) {
      const open_t = periodStart(b.t, k)
      cur = { t: open_t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0, n: 1, open_t, close_t: nextPeriodStart(open_t, k) }
      continue
    }
    cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v || 0; cur.n++
  }
  if (cur) out.push(cur)
  return out
}

/** The DEVELOPING bucket as-of `at` (open_t ≤ at < close_t), or null. Buckets must be ascending. */
export function developingBucket(buckets, at) {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].open_t <= at && at < buckets[i].close_t) return buckets[i]
    if (buckets[i].close_t <= at) return null     // newest closed bucket is before `at`, none developing
  }
  return null
}

/** True if a bucket is fully CLOSED relative to `at` (its whole period has elapsed). */
export function isClosed(bucket, at) { return bucket.close_t <= at }
