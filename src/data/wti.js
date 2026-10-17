// ════════════════════════════════════════════════════════════════════════════════
// wti.js — Polygon FUTURES front-month reader, the ONE place the app reads futures (2026-10-09). DELAYED 10 min on our plan.
//   CL (WTI crude): the chart (display, labelled DELAYED) and the Ferrari Matrix signal (Ashraf's explicit R0 exception: WTI "as it
//                   shows in current live calculation time", i.e. as delivered, ≥ 10 min old).
//   GC (CME gold):  the 15m big-volume pressure gauge on the chart (display/context only — real exchange volume; Polygon does NOT give
//                   us futures trades/quotes on our plan (measured 403), so there is no true buyer/seller split).
// History: data/history/WTI/1m.jsonl and data/history/GOLD_FUT/1m.jsonl (scripts/import_futures_1m.mjs).
// ════════════════════════════════════════════════════════════════════════════════
import { polygonKey } from './liveFeed.js'
import { fetchJsonResilient } from './netResolve.js'
import { FUT_RULES, CODES } from './futuresRule.js'

export const WTI_DELAY_MIN = 10, FUT_DELAY_MIN = 10
// months / how far ahead: the ONE rule in futuresRule.js (2026-10-17: GC's old 'GJMQVZ', ≤ 4 ahead let the thin October contract win in late July)
const AHEAD = Object.fromEntries(Object.values(FUT_RULES).map((r) => [r.root, r.maxAhead])), MONTHS = Object.fromEntries(Object.values(FUT_RULES).filter((r) => r.months).map((r) => [r.root, r.months]))
const frontCache = new Map()

/** Front month = the one of the next N outright contracts with the most session volume now (10-min cache). Same rule as the importer. */
export async function futFront(root) {
  const c0 = frontCache.get(root); if (c0 && Date.now() - c0.at < 10 * 60000) return c0.tk
  const d = new Date(), cands = []
  for (let k = 1; k <= (AHEAD[root] ?? 3); k++) { const m = (d.getUTCMonth() + k) % 12, y = (d.getUTCFullYear() + Math.floor((d.getUTCMonth() + k) / 12)) % 10; if (!MONTHS[root] || MONTHS[root].includes(CODES[m])) cands.push(root + CODES[m] + y) }
  const r = await fetchJsonResilient(`https://api.polygon.io/futures/v1/snapshot?ticker.any_of=${cands.join(',')}&limit=10&apiKey=${polygonKey()}`, { timeoutMs: 10000 })
  const rows = (r.json?.results ?? []).filter((x) => cands.includes(x.details?.ticker)).sort((a, b) => (b.session?.volume ?? 0) - (a.session?.volume ?? 0))
  const tk = rows[0]?.details?.ticker ?? cands[0]; frontCache.set(root, { at: Date.now(), tk }); return tk
}
export const wtiFront = () => futFront('CL')

const RES = { '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min', '1h': '1hour', '4h': '4hour', '1d': '1session' }
/** Front-month bars since `from` (ms), ascending, as delivered by Polygon (delayed). */
export async function futBars(root, tf, from) {
  const tk = await futFront(root); if (!tk || !RES[tf]) return { bars: [], ticker: tk }
  const day = new Date(from).toISOString().slice(0, 10), out = []
  let url = `https://api.polygon.io/futures/v1/aggs/${tk}?resolution=${RES[tf]}&window_start.gte=${day}&limit=50000&sort=window_start.asc&apiKey=${polygonKey()}`
  for (let page = 0; page < 5 && url; page++) {
    const r = await fetchJsonResilient(url, { timeoutMs: 15000 })
    for (const x of r.json?.results ?? []) out.push({ t: Math.round(x.window_start / 1e6), o: x.open, h: x.high, l: x.low, c: x.close, v: x.volume ?? 0, tk })
    url = r.json?.next_url ? r.json.next_url + (r.json.next_url.includes('apiKey=') ? '' : `&apiKey=${polygonKey()}`) : null
  }
  const seen = new Set(); return { bars: out.filter((b) => b.t >= from && !seen.has(b.t) && seen.add(b.t)).sort((a, b) => a.t - b.t), ticker: tk }
}
export const wtiBars = (tf, from) => futBars('CL', tf, from)
