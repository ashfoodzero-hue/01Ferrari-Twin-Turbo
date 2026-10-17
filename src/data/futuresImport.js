// futuresImport.js — build a continuous front-month 1m series from Polygon futures, for ANY window (2026-10-17). ONE implementation used by
// scripts/import_futures_1m.mjs (full rebuild) and scripts/record_futures.mjs (incremental append, run by the app). Rule: futuresRule.js.
import { polygonKey } from './liveFeed.js'
import { fetchJsonResilient } from './netResolve.js'
import { FUT_RULES, candidates, eligible } from './futuresRule.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function get(url, key) { const w = last + 260 - Date.now(); if (w > 0) await sleep(w); last = Date.now()
  const r = await fetchJsonResilient(url + (url.includes('apiKey=') ? '' : `${url.includes('?') ? '&' : '?'}apiKey=${key}`), { timeoutMs: 20000 }); return r.json ?? {} }
async function all(url, key) { const out = []; let u = url; for (let p = 0; p < 40 && u; p++) { const j = await get(u, key); out.push(...(j.results ?? [])); u = j.next_url ?? null } return out }

/**
 * Front month per session + its 1m bars, for sessions starting at/after `fromMs` (bars kept from `barsFrom` on).
 * @returns { sessions: [[ws, {tk, vol}]], runs: [{tk, from, to}], bars: [{t,o,h,l,c,v,tk}] }  ascending, deduped by t
 */
export async function buildFuturesSeries(asset, { fromMs, barsFrom = fromMs, toMs = Date.now(), log = () => {} } = {}) {
  const C = FUT_RULES[asset]; if (!C) throw new Error('futuresImport: unknown asset ' + asset)
  const key = polygonKey(); if (!key) throw new Error('futuresImport: no POLYGON_API_KEY')
  const y0 = new Date(fromMs).getUTCFullYear() % 10, years = [0, 1, 2].map((k) => (y0 + k) % 10)
  const sessions = new Map()
  for (const tk of candidates(C, years)) {
    const xs = await all(`https://api.polygon.io/futures/v1/aggs/${tk}?resolution=1session&window_start.gte=${new Date(fromMs).toISOString().slice(0, 10)}&limit=5000&sort=window_start.asc`, key)
    for (const x of xs) { const ws = Math.round(x.window_start / 1e6); if (ws < fromMs || !eligible(C, tk, ws)) continue
      const cur = sessions.get(ws); if (!cur || (x.volume ?? 0) > cur.vol) sessions.set(ws, { tk, vol: x.volume ?? 0, end: x.session_end_date }) } }
  let S = [...sessions.entries()].sort((a, b) => a[0] - b[0])
  if (C.prevSession) S = S.map(([ws, s], k) => [ws, { ...s, tk: k ? S[k - 1][1].tk : s.tk }])   // causal: session k trades session k−1's winner
  const runs = []; for (let k = 0; k < S.length; k++) { const [ws, s] = S[k]; const until = k + 1 < S.length ? S[k + 1][0] : toMs; const r = runs.at(-1); if (r && r.tk === s.tk) r.to = until; else runs.push({ tk: s.tk, from: ws, to: until }) }
  const bars = []
  for (const r of runs) { const a = Math.max(r.from, barsFrom); if (a >= r.to) continue
    const xs = await all(`https://api.polygon.io/futures/v1/aggs/${r.tk}?resolution=1min&window_start.gte=${a * 1e6}&window_start.lt=${r.to * 1e6}&limit=50000&sort=window_start.asc`, key)
    for (const x of xs) bars.push({ t: Math.round(x.window_start / 1e6), o: x.open, h: x.high, l: x.low, c: x.close, v: x.volume ?? 0, tk: r.tk })
    log(`  ${r.tk} ${new Date(a).toISOString().slice(0, 16)} → ${new Date(r.to).toISOString().slice(0, 16)}: ${xs.length} bars`) }
  bars.sort((a, b) => a.t - b.t); const seen = new Set()
  return { sessions: S, runs, bars: bars.filter((b) => !seen.has(b.t) && seen.add(b.t)) }
}
