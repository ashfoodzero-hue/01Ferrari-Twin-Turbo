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
import { diffRevisions, applyRevisions } from '../src/data/recordRevisions.js'

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

// ── POLYGON REVISIONS (src/data/recordRevisions.js, 2026-10-18 — measured: Polygon re-published 7 GLD minutes of 2026-10-15 overnight, so the
// append-only store no longer matched and verify_database failed). Every 6 h (or --revisions-now): the last 5 days of each recorded series vs
// Polygon's current minutes, same rule as verify_database; revised minutes are rewritten, each change logged (old → new).
const REV_STATE = path.join(TURBO.master, 'recorder_revisions_state.json'), REV_LEDGER = path.join(TURBO.master, 'recorder_revisions.jsonl')
const revDue = process.argv.includes('--revisions-now') || !(now - (Date.parse(JSON.parse((() => { try { return fs.readFileSync(REV_STATE, 'utf8') } catch { return '{}' } })()).at ?? 0) || 0) < 6 * 3600000)
if (revDue) {
  const KEY = process.env.POLYGON_API_KEY, from = now - 5 * 86400000, summary = {}
  const all = async (u) => { const out = []; while (u) { const r = await fetch(u + (u.includes('apiKey=') ? '' : '&apiKey=' + KEY)), j = await r.json(); if (!r.ok) throw new Error(`HTTP ${r.status} ${j.message ?? ''}`); out.push(...(j.results ?? [])); u = j.next_url ?? null } return out }
  const recentOf = async (F) => { const out = []; const rl = (await import('node:readline')).createInterface({ input: fs.createReadStream(F), crlfDelay: Infinity }); for await (const l of rl) { if (!l) continue; const t = +(/"t":(\d+)/.exec(l)?.[1] ?? 0); if (t >= from && t + 60000 <= now - FINAL_MS) out.push(JSON.parse(l)) } return out }
  for (const asset of ['GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) {
    try { const F = path.join(TURBO.historyAsset(asset), '1m.jsonl'), mine = await recentOf(F); let rest = []
      if (asset === 'GLD') { if (mine.length) rest = (await all(`https://api.polygon.io/v2/aggs/ticker/GLD/range/1/minute/${mine[0].t}/${mine.at(-1).t}?adjusted=true&sort=asc&limit=50000`)).map((x) => ({ t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v, vw: x.vw ?? null, n: x.n ?? null })) }
      else for (const tk of [...new Set(mine.map((b) => b.tk))]) { const my = mine.filter((b) => b.tk === tk)
        rest.push(...(await all(`https://api.polygon.io/futures/v1/aggs/${tk}?resolution=1min&window_start.gte=${my[0].t * 1e6}&window_start.lte=${my.at(-1).t * 1e6}&limit=50000&sort=window_start.asc`)).map((x) => ({ t: Math.round(x.window_start / 1e6), o: x.open, h: x.high, l: x.low, c: x.close, v: x.volume ?? 0, tk }))) }
      const d = diffRevisions(mine, rest), n = DRY ? 0 : await applyRevisions(F, d.revised)
      if (!DRY) for (const x of d.revised) fs.appendFileSync(REV_LEDGER, JSON.stringify({ at: new Date(now).toISOString(), asset, t: x.t, tk: x.tk, old: x.old, new: x.new }) + '\n')
      summary[asset] = { checked: mine.length, same: d.same, revised: d.revised.length, rewritten: n, not_at_polygon: d.missing.length }
      console.log(`  ${asset} revisions: ${d.same}/${mine.length} identical · ${d.revised.length} revised by Polygon${DRY ? ' (dry — not written)' : ` → ${n} rewritten`}${d.missing.length ? ` · ${d.missing.length} no longer at Polygon (kept, reported)` : ''}`)
    } catch (e) { summary[asset] = { error: e.message }; console.log(`  ${asset} revisions: ⚠ ${e.message}`) } }
  if (!DRY) fs.writeFileSync(REV_STATE, JSON.stringify({ at: new Date(now).toISOString(), window_from: new Date(from).toISOString(), summary }, null, 1))
}
