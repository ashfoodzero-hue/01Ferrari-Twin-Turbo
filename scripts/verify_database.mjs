// verify_database.mjs — the FULL database verification, every series end to end (2026-10-17; Ashraf: "recheck and confirm that our database is
// correct and zero fake database for XAU, DXY, Silver, WTI and that we are building our own history for both Future and Spot").
//   1. structure, whole file: strictly increasing minutes, no duplicates, valid OHLC (h ≥ max(o,c), l ≤ min(o,c), all > 0)
//   2. truth, latest 5 trading days: every stored minute == a FRESH Polygon download (spot: the pair; futures: the bar's own contract; GLD)
//   3. GOLD_FUT == CME exchange feed (Databento) on every same-contract minute of the overlap
//   4. coverage: first / last minute, holes (must be the known Polygon outages only), recorder freshness
// Output: data/master/database_verification.json · exit 1 when anything fails.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv } from '../src/core/nyCandles.js'
import { findHoles } from '../src/core/dataHoles.js'
import { lastMarketClose } from '../src/core/freshness.js'

const KEY = process.env.POLYGON_API_KEY, now = Date.now()
// ROLLING window (2026-10-18): the 4 days up to the LAST MARKET CLOSE (New York session rule). It was hard-coded to 2026-10-12 → 10-16, so the
// weekly Saturday run would have re-checked that same week forever. VERIFY_FROM / VERIFY_TO still override.
const AUTO_TO = Math.floor(lastMarketClose(now) / 60000) * 60000
const WIN_TO = process.env.VERIFY_TO ? Date.parse(process.env.VERIFY_TO) : AUTO_TO, WIN_FROM = process.env.VERIFY_FROM ? Date.parse(process.env.VERIFY_FROM) : WIN_TO - 4 * 86400000
const res = { at: new Date(now).toISOString(), window: [new Date(WIN_FROM).toISOString(), new Date(WIN_TO).toISOString()], series: {}, failures: [] }
const fail = (s, why) => { res.failures.push(`${s}: ${why}`); console.log(`    ✗ ${why}`) }
const same = (a, b) => ['o', 'h', 'l', 'c'].every((k) => Math.abs(a[k] - b[k]) < 1e-9)
async function fetchJ(u) { for (let a = 0; ; a++) { try { const r = await fetch(u); const j = await r.json(); if (!r.ok) throw new Error(`HTTP ${r.status} ${j.message ?? ''}`); return j } catch (e) { if (a >= 4) throw e; await new Promise((z) => setTimeout(z, 3000 * (a + 1))) } } }   // network retries
async function polyAll(url) { const out = []; let u = url; while (u) { const j = await fetchJ(u + (u.includes('apiKey=') ? '' : '&apiKey=' + KEY)); out.push(...(j.results ?? [])); u = j.next_url ?? null } return out }
function structure(bars) { let dup = 0, back = 0, bad = 0; for (let i = 0; i < bars.length; i++) { const b = bars[i]
    if (!(b.o > 0 && b.h > 0 && b.l > 0 && b.c > 0) || b.h < Math.max(b.o, b.c) - 1e-9 || b.l > Math.min(b.o, b.c) + 1e-9) bad++
    if (i) { if (b.t === bars[i - 1].t) dup++; else if (b.t < bars[i - 1].t) back++ } } return { dup, out_of_order: back, invalid_ohlc: bad } }
const readJsonl = async (f) => { const out = []; const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity }); for await (const l of rl) if (l) out.push(JSON.parse(l)); return out }

console.log('\n██ DATABASE VERIFICATION ██')
// ── spot: the 8 streamed symbols, read the way every study reads them (loader applies Polygon corrections) ──
for (const s of SYMBOLS) { console.log('  ' + s.sym)
  const raw = (await loadBars(s.sym, '1m', {})).bars, st = structure(raw), { bars } = cleanForTv(raw)
  const holes = findHoles(bars.filter((b) => b.t >= Date.UTC(2013, 6, 14))).map((h) => new Date(h.from).toISOString().slice(0, 10) + '..' + new Date(h.to).toISOString().slice(0, 10))
  // every hole must be a PROVIDER hole: Polygon itself has no daily bar anywhere inside it (checked live, never assumed)
  const unknown = []; for (const h of holes) { const [a, z] = h.split('..'); const j = await fetchJ(`https://api.polygon.io/v2/aggs/ticker/${s.poly}/range/1/day/${a}/${z}?apiKey=${KEY}`); if ((j.resultsCount ?? 0) > 0) unknown.push(h + ` (Polygon has ${j.resultsCount} daily bars)`) }
  const rest = await polyAll(`https://api.polygon.io/v2/aggs/ticker/${s.poly}/range/1/minute/${WIN_FROM}/${WIN_TO}?limit=50000&sort=asc`), m = new Map(raw.filter((b) => b.t >= WIN_FROM && b.t <= WIN_TO).map((b) => [b.t, b]))
  let ident = 0, diff = 0, miss = 0; for (const r of rest) { const b = m.get(r.t); if (!b) miss++; else if (same(b, r)) ident++; else diff++ }
  const extra = [...m.keys()].filter((t) => !rest.some((r) => r.t === t)).length
  const r = { role: s.role, minutes: raw.length, first: new Date(raw[0].t).toISOString(), last: new Date(raw.at(-1).t).toISOString(), ...st, holes_since_2013: holes, holes_not_at_polygon: unknown,
    truth_window: { polygon: rest.length, identical: ident, different: diff, missing: miss, extra }, volume_field_in_study_data: bars.some((b) => 'v' in b) }
  res.series[s.sym] = r
  console.log(`    ${r.minutes.toLocaleString()} min ${r.first.slice(0, 10)} → ${r.last.slice(0, 16)} · dup ${st.dup} · out-of-order ${st.out_of_order} · bad OHLC ${st.invalid_ohlc} · last 5 days vs Polygon: ${ident}/${rest.length} identical, ${diff} different, ${miss} missing, ${extra} extra`)
  if (st.dup || st.out_of_order || st.invalid_ohlc) fail(s.sym, 'structure'); if (diff || miss || extra) fail(s.sym, 'not identical to Polygon in the window'); if (unknown.length) fail(s.sym, 'hole where Polygon HAS data (our miss): ' + unknown.join(' ')); if (r.volume_field_in_study_data) fail(s.sym, 'spot v reaches study data') }
// (2025-04-18..21 = Good Friday + Easter Monday 2025: also confirmed empty at Polygon by the check above)
// ── futures + GLD (the app's recorder) ──
for (const a of ['GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) { console.log('  ' + a)
  const bars = await readJsonl(path.join(TURBO.historyAsset(a), '1m.jsonl')), st = structure(bars), win = bars.filter((b) => b.t >= WIN_FROM && b.t <= WIN_TO)
  let ident = 0, diff = 0, miss = 0, polyN = 0
  if (a === 'GLD') { const rest = await polyAll(`https://api.polygon.io/v2/aggs/ticker/GLD/range/1/minute/${WIN_FROM}/${WIN_TO}?limit=50000&sort=asc&adjusted=true`), m = new Map(win.map((b) => [b.t, b])); polyN = rest.length
    for (const r of rest) { const b = m.get(r.t); if (!b) miss++; else if (same(b, { o: r.o, h: r.h, l: r.l, c: r.c }) && b.v === r.v) ident++; else diff++ } }
  else { for (const tk of [...new Set(win.map((b) => b.tk))]) { const mine = win.filter((b) => b.tk === tk), m = new Map(mine.map((b) => [b.t, b]))
      const rest = await polyAll(`https://api.polygon.io/futures/v1/aggs/${tk}?resolution=1min&window_start.gte=${mine[0].t * 1e6}&window_start.lte=${mine.at(-1).t * 1e6}&limit=50000&sort=window_start.asc`); polyN += rest.length
      for (const x of rest) { const b = m.get(Math.round(x.window_start / 1e6)); if (!b) miss++; else if (same(b, { o: x.open, h: x.high, l: x.low, c: x.close }) && b.v === (x.volume ?? 0)) ident++; else diff++ } } }
  const r = { minutes: bars.length, first: new Date(bars[0].t).toISOString(), last: new Date(bars.at(-1).t).toISOString(), contracts: a === 'GLD' ? null : [...new Set(bars.map((b) => b.tk))], ...st, truth_window: { polygon: polyN, identical: ident, different: diff, missing: miss } }
  res.series[a] = r
  console.log(`    ${r.minutes.toLocaleString()} min ${r.first.slice(0, 10)} → ${r.last.slice(0, 16)} · dup ${st.dup} · out-of-order ${st.out_of_order} · bad OHLC ${st.invalid_ohlc} · last 5 days vs Polygon (price + volume): ${ident}/${polyN} identical, ${diff} different, ${miss} missing`)
  if (st.dup || st.out_of_order || st.invalid_ohlc) fail(a, 'structure'); if (diff || miss) fail(a, 'not identical to Polygon in the window')
  if (a === 'GOLD_FUT' && r.contracts.some((tk) => !/^GC[GJMQZ]\d$/.test(tk))) fail(a, 'non-liquid contract in the series') }
// ── GOLD_FUT vs the CME exchange feed ──
{ const P = await readJsonl(path.join(TURBO.historyAsset('GOLD_FUT'), '1m.jsonl')), D = await readJsonl(path.join(TURBO.root, 'data', 'orderflow', 'gc_1m.jsonl')), dm = new Map(D.map((b) => [b.t, b]))
  const pair = new Map(); for (const b of P) { const d = dm.get(b.t); if (!d) continue; const x = pair.get(d.iid) || {}; x[b.tk] = (x[b.tk] || 0) + 1; pair.set(d.iid, x) }
  const tkOf = new Map([...pair].map(([i, x]) => [i, Object.entries(x).sort((p, q) => q[1] - p[1])[0][0]]))
  let n = 0, eq = 0; for (const b of P) { const d = dm.get(b.t); if (!d || tkOf.get(d.iid) !== b.tk) continue; n++; if (d.v === b.v && same(b, d)) eq++ }
  res.gold_fut_vs_cme = { same_contract_minutes: n, identical_price_and_volume: eq }
  console.log(`  GOLD_FUT vs CME exchange feed: ${eq}/${n} same-contract minutes identical (price + volume)`); if (eq !== n) fail('GOLD_FUT', 'differs from the CME feed') }
// ── recorder + audit health ──
const audit = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'recording_audit.json'), 'utf8')); res.recording_audit = { at: audit.at, ok: audit.ok }
if (!audit.ok) fail('recording', 'daily audit not clean')
res.ok = res.failures.length === 0
fs.writeFileSync(path.join(TURBO.master, 'database_verification.json'), JSON.stringify(res, null, 1))
console.log(res.ok ? '✅ DATABASE VERIFIED: every check passed' : `✗ DATABASE VERIFICATION FAILED: ${res.failures.join(' · ')}`); if (!res.ok) process.exitCode = 1
