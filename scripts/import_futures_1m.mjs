// ════════════════════════════════════════════════════════════════════════════════
// import_futures_1m.mjs <WTI|GOLD_FUT> — 1m history as a continuous FRONT-MONTH series from Polygon futures (2026-10-09). ONE importer
// for every futures series (one rule, one place): WTI = CL (Ferrari Matrix whale filter), GOLD_FUT = GC (15m big-volume pressure on gold).
// ────────────────────────────────────────────────────────────────────────────────
// For the Ferrari Matrix signal (Ashraf's Pine method: the "whale" filter reads the 1h WTI candle). Ashraf 2026-10-09: "use the available
// data for WTI as it shows in current live calculation time" — an EXPLICIT exception to R0 for this one input: WTI is 10 min DELAYED on
// our plan, so the signal reads it exactly as delivered live (≥ 10 min old); this history lets the backtest do the same.
// MEASURED: Polygon's CL history starts 2024-10-09 (no contract has bars before). Front month per session = the outright contract with the
// MOST VOLUME that session (from 1session aggs); its 1m bars over that session window are kept, each tagged with its contract (`tk`).
// Output: data/history/WTI/1m.jsonl (+ manifest_1m.json). Re-runnable (rebuilds the file).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'

const KEY = polygonKey(); if (!KEY) { console.error('no POLYGON_API_KEY'); process.exit(1) }
const CODES = 'FGHJKMNQUVXZ', sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function get(url) { const w = last + 260 - Date.now(); if (w > 0) await sleep(w); last = Date.now(); const r = await fetchJsonResilient(url + (url.includes('apiKey=') ? '' : `${url.includes('?') ? '&' : '?'}apiKey=${KEY}`), { timeoutMs: 20000 }); return r.json ?? {} }
async function all(url) { const out = []; let u = url; for (let p = 0; p < 40 && u; p++) { const j = await get(u); out.push(...(j.results ?? [])); u = j.next_url ?? null } return out }

const CFG = { WTI: { root: 'CL', maxAhead: 3, note: 'Ashraf exception to R0 (2026-10-09): WTI used as delivered live (≥10 min old) by the Ferrari Matrix signal only' },
  // GOLD_FUT fixed 2026-10-17 (audit vs Databento CME ticks): (1) maxAhead 4 EXCLUDED December in late July, so the thin October contract (GCV5 /
  // GCV6) won two-day runs — GC's liquid months are G J M Q Z (October is not a most-active month) and the most-active can be 5 months out;
  // (2) the front month is now chosen from the PREVIOUS session's volumes (prevSession) — the same-session choice was a small look-ahead.
  GOLD_FUT: { root: 'GC', maxAhead: 6, months: 'GJMQZ', prevSession: true, note: 'CME gold futures, 10 min delayed: real exchange volume; no buyer/seller split on our plan. Front month = most volume in the PREVIOUS session (causal).' } }
const ASSET = (process.argv[2] || 'WTI').toUpperCase(), C = CFG[ASSET]; if (!C) { console.error('asset must be one of ' + Object.keys(CFG)); process.exit(1) }
const contracts = []; for (const y of [4, 5, 6, 7]) for (const c of C.months ?? CODES) contracts.push(`${C.root}${c}${y}`)   // GC: CME ACTIVE months only (a thin month won partial sessions: GCK6, GCF7 — measured 2026-10-09)
// 1) sessions per contract → front month per session (max volume)
const sessions = new Map()   // window_start(ms) → { tk, vol, end }
for (const tk of contracts) {
  const xs = await all(`https://api.polygon.io/futures/v1/aggs/${tk}?resolution=1session&window_start.gte=2024-10-01&limit=5000&sort=window_start.asc`)
  // candidates per session = the THREE nearest delivery months after the session month (a partial session's volumes can otherwise pick a far contract — seen: CLU7 on 2026-10-09)
  const dm = (2020 + +tk[3]) * 12 + CODES.indexOf(tk[2])
  for (const x of xs) { const ws = Math.round(x.window_start / 1e6), d = new Date(ws + 86400000), sm = d.getUTCFullYear() * 12 + d.getUTCMonth()
    if (dm - sm < 1 || dm - sm > C.maxAhead) continue
    const cur = sessions.get(ws); if (!cur || (x.volume ?? 0) > cur.vol) sessions.set(ws, { tk, vol: x.volume ?? 0, end: x.session_end_date }) }
}
let S = [...sessions.entries()].sort((a, b) => a[0] - b[0])
// prevSession (causal): session k trades the contract that WON session k−1 (the first session keeps its own winner)
if (C.prevSession) S = S.map(([ws, s], k) => [ws, { ...s, tk: k ? S[k - 1][1].tk : s.tk }])
console.log(`sessions ${S.length} · ${new Date(S[0][0]).toISOString().slice(0, 10)} → ${new Date(S.at(-1)[0]).toISOString().slice(0, 10)}`)
// 2) contiguous runs of the same front contract → one 1m fetch per run
const runs = []; for (let k = 0; k < S.length; k++) { const [ws, s] = S[k]; const until = k + 1 < S.length ? S[k + 1][0] : Date.now(); const r = runs.at(-1); if (r && r.tk === s.tk) r.to = until; else runs.push({ tk: s.tk, from: ws, to: until }) }
const bars = []
for (const r of runs) {
  const xs = await all(`https://api.polygon.io/futures/v1/aggs/${r.tk}?resolution=1min&window_start.gte=${r.from * 1e6}&window_start.lt=${r.to * 1e6}&limit=50000&sort=window_start.asc`)
  for (const x of xs) bars.push({ t: Math.round(x.window_start / 1e6), o: x.open, h: x.high, l: x.low, c: x.close, v: x.volume ?? 0, tk: r.tk })
  console.log(`  ${r.tk} ${new Date(r.from).toISOString().slice(0, 10)} → ${new Date(r.to).toISOString().slice(0, 10)}: ${xs.length} bars`)
}
bars.sort((a, b) => a.t - b.t); const seen = new Set(), clean = bars.filter((b) => !seen.has(b.t) && seen.add(b.t))
const dir = TURBO.historyAsset(ASSET); fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, '1m.jsonl.tmp'), clean.map((b) => JSON.stringify(b)).join('\n') + '\n'); fs.renameSync(path.join(dir, '1m.jsonl.tmp'), path.join(dir, '1m.jsonl'))
fs.writeFileSync(path.join(dir, 'manifest_1m.json'), JSON.stringify({ symbol: ASSET, source: `polygon ${C.root} futures, front month per session by volume`, delayed_live_min: 10, first: new Date(clean[0].t).toISOString(), last: new Date(clean.at(-1).t).toISOString(), bars: clean.length, runs, generated_utc: new Date().toISOString(), note: C.note }, null, 1))
console.log(`✅ ${ASSET}: ${clean.length.toLocaleString()} 1m bars ${new Date(clean[0].t).toISOString()} → ${new Date(clean.at(-1).t).toISOString()} (${runs.length} contract runs)`)
