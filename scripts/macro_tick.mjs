// ════════════════════════════════════════════════════════════════════════════════
// macro_tick.mjs — the 4H MACRO MAGNET score (Ashraf's Pine, src/master/macroMagnet.js) LIVE: tile + forward record (2026-10-16; Ashraf:
// "honest tile + live record"). Run by run_twin.mjs 1 min after every NY 4H close; catch-up by design (a missed run loses nothing).
//   1. closed NY 4H candles (gold + DXY rebuilt) from the last ~200 days of 1m → the same engine as the 13 y study (parity 98.7 % with his chart)
//   2. APPEND-ONLY ledger data/paper/macro_magnet_ledger.jsonl: one 'score' row per closed 4H bar not yet recorded; a 'resolve' row once the
//      next 4H bar has closed (up / down) — the live forward test of the score
//   3. data/master/macro_magnet_state.json for the chart tile: the score exactly as his indicator shows it + the MEASURED 13 y numbers
//      (data/master/macro_magnet_study.json — NO EDGE) + the live tally. A score is never shown as a probability.
//   --static : compute and print, write nothing
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { streamDxy1m } from '../src/data/dxy.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'

const STATIC = process.argv.includes('--static'), now = Date.now(), DAY = 86400000
const LEDGER = path.join(TURBO.paper, 'macro_magnet_ledger.jsonl'), STATE = path.join(TURBO.master, 'macro_magnet_state.json')
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const from = now - 200 * DAY
// a 4H bar is scored only when its LAST minute is SETTLED in the store for gold AND the six DXY pairs (the ledger is append-only — a bar
// scored on a missing last minute could never be corrected). No stream heartbeat → be conservative: 5 min after the close.
const hb = readJ(path.join(TURBO.master, 'stream_heartbeat.json'))
const settled = ['XAUUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF'].map((s) => Date.parse(hb?.symbols?.[s]?.settled_through ?? '') || -Infinity)
const closedBy = Math.min(...settled) > 0 ? Math.min(...settled) + 60000 : now - 5 * 60000
const G = (await resample4h(streamBars('XAUUSD', '1m', { from }), ['ny'], { closedBy })).ny
const D = (await resample4h(streamDxy1m({ from }), ['ny'], { closedBy })).ny
const SG = magnetScores(G), SD = magnetScores(D), dByT = new Map(SD.filter(Boolean).map((r) => [r.t, r]))
const pick = (r) => r && { long: r.long, short: r.short, side: r.side, A: r.A, B: r.B, C: r.C, D: r.D, bsl: r.bsl, ssl: r.ssl, rsi: +r.rsi.toFixed(2), ema9: +r.ema9.toFixed(4), ema21: +r.ema21.toFixed(4) }
// ── ledger: append score rows for closed bars after the last recorded one; resolve rows whose next bar has closed ──
const L = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const scored = new Map(L.filter((e) => e.type === 'score').map((e) => [e.t, e])), resolved = new Set(L.filter((e) => e.type === 'resolve').map((e) => e.t))
const lastScored = Math.max(-Infinity, ...scored.keys()), add = []
const firstLive = lastScored === -Infinity ? G.at(-1)?.t : null                      // first ever run: start the record at the latest closed bar (no backfill)
for (let k = 0; k < G.length; k++) { const s = SG[k]; if (!s) continue; const t = G[k].t
  if (t > lastScored && (firstLive == null || t >= firstLive)) { const dx = dByT.get(t) ?? null
    const row = { type: 'score', t, bar: new Date(t).toISOString(), close: G[k].c, long: s.long, side: s.side, vec: { A: s.A, B: s.B, C: s.C, D: s.D }, dxy_side: dx?.side ?? null, dxy_long: dx?.long ?? null, recorded_at: new Date(now).toISOString() }
    add.push(row); scored.set(t, row) } }
for (const [t, row] of scored) { if (resolved.has(t)) continue; const k = G.findIndex((b) => b.t === t); if (k < 0 || k + 1 >= G.length) continue
  add.push({ type: 'resolve', t, next_close: G[k + 1].c, up: G[k + 1].c > row.close, down: G[k + 1].c < row.close, resolved_at: new Date(now).toISOString() }); resolved.add(t) }
// ── live tally (side LONG hits if up, SHORT hits if down) ──
const all = [...L, ...add], res = new Map(all.filter((e) => e.type === 'resolve').map((e) => [e.t, e]))
const live = { n: 0, hits: 0, long65: { n: 0, up: 0 }, short65: { n: 0, down: 0 } }
for (const e of all.filter((x) => x.type === 'score')) { const r = res.get(e.t); if (!r) continue; live.n++; if (e.side === 'LONG' ? r.up : r.down) live.hits++
  if (e.long >= 65) { live.long65.n++; if (r.up) live.long65.up++ } if (100 - e.long >= 65) { live.short65.n++; if (r.down) live.short65.down++ } }
live.rate = live.n ? +(live.hits / live.n).toFixed(4) : null
// ── tile state: the latest closed bar's score + the measured study numbers for that score / DXY relation ──
const study = readJ(path.join(TURBO.master, 'macro_magnet_study.json')), ny = study?.anchors?.ny
const k = SG.length - 1, cur = SG[k], dx = cur ? dByT.get(G[k].t) : null, rel = !dx ? 'none' : dx.side !== cur.side ? 'confirms' : 'against'
const lk = ny?.lookup?.[`${cur?.long}|${rel}`] ?? null
const state = { at: new Date(now).toISOString(), bar: cur ? new Date(G[k].t).toISOString() : null, bar_t: cur ? G[k].t : null, closes_next: cur ? new Date(G[k].t + 2 * 4 * 3600000).toISOString() : null,
  gold: pick(cur), dxy: pick(dx), dxy_relation: rel,
  measured: ny ? { verdict: study.informative?.length ? 'INFORMATIVE' : 'NO_EDGE', base_up4: ny.base.oos.up4, base_dn4: ny.base.oos.dn4, this_score: lk, pine_history_view: ny.methodE.pine_view_bar_itself_up, live_view: ny.methodE.live_view_next_bar_up, window: study.window, source: 'data/master/macro_magnet_study.json' } : null,
  live, ledger_rows_added: add.length }
if (STATIC) { console.log(JSON.stringify(state, null, 1)); process.exit(0) }
// ALL closed NY 4H bars of the 200-day window for the chart's FORMING preview — the FULL series, because a BSL/SSL register can come from an old
// unbroken pivot (a 400-bar slice would lose it and the preview would disagree with the official score). run_chart adds only the open candle.
const slim = (xs) => xs.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c }))
fs.writeFileSync(path.join(TURBO.master, 'macro_magnet_bars.json.tmp'), JSON.stringify({ at: new Date(now).toISOString(), gold: slim(G), dxy: slim(D) })); fs.renameSync(path.join(TURBO.master, 'macro_magnet_bars.json.tmp'), path.join(TURBO.master, 'macro_magnet_bars.json'))
if (add.length) { fs.mkdirSync(TURBO.paper, { recursive: true }); fs.appendFileSync(LEDGER, add.map((x) => JSON.stringify(x)).join('\n') + '\n') }
fs.writeFileSync(STATE + '.tmp', JSON.stringify(state, null, 1)); fs.renameSync(STATE + '.tmp', STATE)
console.log(`  🧲 macro magnet ${state.bar?.slice(5, 16)}: gold ${cur?.side} ${cur?.side === 'LONG' ? cur?.long : cur?.short} · DXY ${dx?.side ?? '—'} (${rel}) · ledger +${add.length} · live ${live.hits}/${live.n}`)
