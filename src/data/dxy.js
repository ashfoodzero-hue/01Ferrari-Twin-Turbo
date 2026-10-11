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
import { streamBars, resampleClosed } from './backfillReader.js'

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

const TFMS = { '1m': 60000, '3m': 180000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }
/** DXY bars at any timeframe (closed buckets only, like every other series). */
export async function loadDxyBars(tf, { from = -Infinity, to = Infinity } = {}) {
  const ms = TFMS[tf]; if (!ms) throw new Error('loadDxyBars: unsupported tf ' + tf)
  const out = []
  const src = streamDxy1m({ from: Number.isFinite(from) ? Math.floor(from / ms) * ms : from, to: Number.isFinite(to) ? Math.floor(to / ms) * ms + ms - 1 : to })
  for await (const b of tf === '1m' ? src : resampleClosed(src, ms)) { if (b.t >= from && b.t <= to) out.push(tf === '1m' ? b : { ...b, src: 'dxy-rebuilt' }) }
  return { bars: out }
}
