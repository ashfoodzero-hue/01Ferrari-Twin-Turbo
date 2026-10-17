// record_futures.mjs — the app's FUTURES + GLD RECORDER (2026-10-17; Ashraf: "make sure our main App is reading and saving our database correct …
// so in future we become building our own history for both Future and Spot for XAU, DXY, Silver"). Run by run_twin.mjs every 15 min.
// Spot (XAUUSD, XAGUSD, the six DXY pairs) is recorded tick-by-tick by the stream (tickStream.js, verified + reconciled). This script adds what
// the stream cannot: CME GOLD_FUT (GC), SILVER_FUT (SI), WTI (CL) and the GLD ETF — append-only, only FINAL minutes (Polygon delivers futures
// 10 min delayed; a minute is appended once it is ≥ 12 min old), each with its contract, never rewriting stored history.
// DXY futures (ICE DX) are NOT on Polygon (measured 2026-10-17: 0 rows) — the DXY is rebuilt from the six recorded spot pairs (dxy.js).
// Ledger: data/master/recorder_runs.jsonl (one line per asset per run). --dry : fetch and report, write nothing.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { lastStoredT } from '../src/data/tickStream.js'
import { buildFuturesSeries } from '../src/data/futuresImport.js'

const DRY = process.argv.includes('--dry'), now = Date.now(), FINAL_MS = 12 * 60000, LEDGER = path.join(TURBO.master, 'recorder_runs.jsonl')
const log = (row) => { console.log(`  ${row.asset}: ${row.appended ?? 0} appended${row.last ? ' · last ' + row.last : ''}${row.error ? ' · ⚠ ' + row.error : ''}`); if (!DRY) fs.appendFileSync(LEDGER, JSON.stringify({ at: new Date(now).toISOString(), dry: DRY, ...row }) + '\n') }
const append = (file, bars) => { if (!bars.length || DRY) return; fs.appendFileSync(file, bars.map((b) => JSON.stringify(b)).join('\n') + '\n') }

for (const asset of ['GOLD_FUT', 'SILVER_FUT', 'WTI']) {
  try { const F = path.join(TURBO.historyAsset(asset), '1m.jsonl'), lastT = lastStoredT(F)
    if (lastT == null) { log({ asset, error: 'no history file — run scripts/import_futures_1m.mjs ' + asset }); continue }
    const { bars } = await buildFuturesSeries(asset, { fromMs: lastT - 10 * 86400000, barsFrom: lastT + 60000, toMs: now })
    const add = bars.filter((b) => b.t > lastT && b.t + 60000 <= now - FINAL_MS)
    append(F, add); log({ asset, appended: add.length, contract: add.at(-1)?.tk ?? null, last: add.length ? new Date(add.at(-1).t).toISOString() : new Date(lastT).toISOString() })
  } catch (e) { log({ asset, error: e.message }) } }
// GLD (stocks aggregates, real share volume)
try { const F = path.join(TURBO.historyAsset('GLD'), '1m.jsonl'), lastT = lastStoredT(F)
  if (lastT == null) throw new Error('no history file — run scripts/import_gld_1m.mjs')
  const a = new Date(lastT).toISOString().slice(0, 10), z = new Date(now).toISOString().slice(0, 10), out = []
  let url = `https://api.polygon.io/v2/aggs/ticker/GLD/range/1/minute/${a}/${z}?adjusted=true&sort=asc&limit=50000&apiKey=${process.env.POLYGON_API_KEY}`
  while (url) { const r = await fetch(url), j = await r.json(); if (!r.ok) throw new Error(`HTTP ${r.status} ${j.message ?? ''}`)
    for (const x of j.results ?? []) if (x.t > lastT && x.t + 60000 <= now - 20 * 60000) out.push({ t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v, vw: x.vw ?? null, n: x.n ?? null })
    url = j.next_url ? j.next_url + '&apiKey=' + process.env.POLYGON_API_KEY : null }
  append(F, out); log({ asset: 'GLD', appended: out.length, last: out.length ? new Date(out.at(-1).t).toISOString() : new Date(lastT).toISOString() })
} catch (e) { log({ asset: 'GLD', error: e.message }) }
