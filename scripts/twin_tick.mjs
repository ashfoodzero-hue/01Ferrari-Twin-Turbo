// twin_tick.mjs — Ferrari Twin Turbo: ONE bar-aligned tick of the paper trial (carried from Turbo2's paper_tick.mjs,
// reduced to the validated book). Reads closed 15m bars resampled from the twin's OWN tick-built 1m store (the streamer,
// src/data/tickStream.js — fail closed when the stream is not live/settled), emits the twin roster, publishes data/master/signal_tiers.json, records
// new fires into data/paper/trades.jsonl (REFUSED rows carry wouldBe), resolves open rows on 1m sub-bars (validator
// parity), and alerts (dry-run unless TWIN_TELEGRAM_* is set).
//   --static  : print the roster only — NO file is written (the safe way to look)
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBarsLive, ROSTER_WINDOW_MS } from '../src/data/liveBars.js'
import { loadBars } from '../src/data/backfillReader.js'
import { streamStatus, waitStreamSettled } from '../src/data/tickStream.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { quotesFile } from '../src/core/paths.js'
import { emitTwinRoster, TIER_STATS } from '../src/master/twinRoster.js'
import { recordSignals, resolveOpen, loadJournal } from '../src/master/paperTrader.js'
import { makeSubBarIndex } from '../src/core/seqResolver.js'
import { liveReadiness, liveDensityRelative } from '../src/master/liveReadiness.js'
import { sendText, formatTierAlert } from '../src/master/telegram.js'
import { signalsHalted } from '../src/core/dataHealth.js'
import { updateRefusalScores } from './lib/refusal_score.mjs'

const STATIC = process.argv.includes('--static')
const FILE = path.join(TURBO.paper, 'trades.jsonl')
const T0 = Date.now()
const T = (label) => console.error(`  ⏱ ${label} @ ${((Date.now() - T0) / 1000).toFixed(1)}s`)

// ── 🟥 TICKS ONLY, FAIL CLOSED (Ashraf 2026-10-08: "reading ticks for all, we need accurate signal for all") ─────────
// The decision bar is the 15m bucket that just closed. It may be used only when the tick stream is live AND has settled
// every minute of it (each minute = tick-built bar verified against Polygon's aggregate, or Polygon's REST arbiter).
const lastClose = Math.floor(Date.now() / 900000) * 900000
const decisionBar = lastClose - 900000
const stream = STATIC ? streamStatus({ needMinute: lastClose - 60000, pidAlive }) : await waitStreamSettled({ needMinute: lastClose - 60000, timeoutMs: 25000, pidAlive })
const { bars: b15, source } = await loadBarsLive('XAUUSD', '15m', { from: Date.now() - ROSTER_WINDOW_MS, status: stream })
if (!b15?.length) { console.log('no bars — nothing to do'); process.exit(0) }
const nowBar = b15.at(-1).t
const lastMinutes = (await loadBars('XAUUSD', '1m', { from: decisionBar, to: lastClose - 1 })).bars
const unverified = lastMinutes.filter((b) => b.ver === 'unverified')
const staleWhy = !stream.live ? stream.why
  : nowBar !== decisionBar ? `the closed 15m bar ${new Date(decisionBar).toISOString()} is not in the store (last ${new Date(nowBar).toISOString()})`
  : unverified.length ? `${unverified.length} unverified minute(s) inside the decision bar`
  : signalsHalted().halted ? `DATABASE STALE — ${signalsHalted().why}` : null   // data health gate (2026-10-18): no fire is recorded or sent
const roster = emitTwinRoster(b15)
console.log(`  bars: ${source} (${b15.length} × 15m from 1m ticks, last ${new Date(nowBar).toISOString()}; decision bar ${lastMinutes.length}/15 minutes${unverified.length ? `, ${unverified.length} UNVERIFIED` : ', all verified'})`)
roster.published_utc = new Date().toISOString()
roster.bars_to = new Date(nowBar).toISOString()
roster.data = { flow: 'polygon forex ticks → verified 1m → resampled 15m', live: !staleWhy, stale_why: staleWhy, stream_waited_ms: stream.waited_ms ?? 0,
  decision_minutes: lastMinutes.length, decision_provenance: lastMinutes.reduce((a, b) => { const k = `${b.src}/${b.ver ?? '-'}`; a[k] = (a[k] || 0) + 1; return a }, {}) }
if (staleWhy) { roster.blocked_stale = true; roster.summary = `⛔ STALE DATA — no signal (${staleWhy})` }
delete roster.frontierRaw                                     // the raw stream is an input, not a publication
T('roster computed')
console.log(`  state: ${roster.marketState?.state ?? '—'} (${roster.marketState?.canTrade ? 'tradeable' : 'wait'}) · ${roster.summary}`)
if (STATIC) { console.log(JSON.stringify({ at: roster.at, summary: roster.summary, data: roster.data, impulseCont: roster.impulseCont, marketState: roster.marketState }, null, 1)); process.exit(0) }

fs.mkdirSync(TURBO.master, { recursive: true })
fs.writeFileSync(path.join(TURBO.master, 'signal_tiers.json'), JSON.stringify(roster, null, 1))

// readiness stamp — RECORD-ONLY context (the occurrence gauge FAILS its bar on the twin's Polygon tape 2026-10-08: HOT LB 92.5 < 95, see
// bigmove_readiness_live_parity.json — so no probability is served) + the era-neutral density key; never blocks the recorder
let readiness = null
try { const r = await liveReadiness(); if (r?.available) readiness = { dens30: r.dens30, rv10: r.rv10, state: r.state }
  const rel = await liveDensityRelative(nowBar); if (readiness && rel?.ok) Object.assign(readiness, { dens_med1y: rel.dens_med1y, dens_rel: rel.dens_rel }) } catch (e) { console.log('  ⚠ readiness stamp unavailable (journal unaffected): ' + e.message.slice(0, 60)) }
// FAIL CLOSED: a stale or unverified read records NOTHING (R0.6). Open rows still resolve below — on bars that exist.
const rec = staleWhy ? { added: 0, skipped: 0, ids: [] } : recordSignals(FILE, roster, TIER_STATS, nowBar, { readiness })
if (staleWhy) console.log(`  ⛔ STALE — no fire recorded: ${staleWhy}`)
T('fires recorded')

// fill bars resolve on their 1m sub-bars — the same rule every validator uses (parity); pessimistic floor rule if absent
let subBarsOf = null, spreadAt = null
try {
  const openT = loadJournal(FILE).filter((r) => r.state === 'PENDING' || r.state === 'OPEN').map((r) => r.t)
  const from1m = (openT.length ? Math.min(...openT) : nowBar) - 86400000
  const { bars: m1 } = await loadBarsLive('XAUUSD', '1m', { from: from1m })
  if (m1?.length) { subBarsOf = makeSubBarIndex(m1); console.log(`  ⏱ fill bars sequenced on ${m1.length.toLocaleString()} 1m sub-bars (validator parity)`) }
  else console.log('  ⚠ no 1m bars — fill bars resolve on the PESSIMISTIC floor rule (forward numbers read LOW vs the artifact)')
  // BID/ASK (2026-10-08): the bars are BID; ask-side orders clear the stream's MEASURED per-minute spread (quotes_1m), else the measured table
  spreadAt = makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from: from1m }) })
} catch (e) { console.log('  ⚠ 1m sub-bars / spread unavailable (' + e.message.slice(0, 60) + ') — pessimistic fill-bar rule in force') }
const res = resolveOpen(FILE, b15, undefined, { subBarsOf, spreadAt })
if (spreadAt) console.log(`  ⏱ bid/ask: spread lookups ${JSON.stringify(spreadAt.stats)} (live = the stream's measured minute spread)`)
T('open rows resolved')
// 🚧 REFUSAL SCORING (2026-10-20, Ashraf: "add automatic outcome scoring of every REFUSED IMPULSE_CONT signal (same resolver as the live book)"): each
// refusal's wouldBe plan is settled by resolveOpen in its OWN journal (impulse_refused_wouldbe.jsonl) on this tick's bars → impulse_refusal_review.json.
// trades.jsonl is never written here; a failure never breaks the tick.
try { const rf = await updateRefusalScores({ b15, nowT: lastClose })
  if (rf.added) console.log(`  🚧 refusal scoring: +${rf.added} refused plan(s) now priced by the live resolver`) } catch (e) { console.log('  ⚠ refusal scoring: ' + e.message.slice(0, 80)) }

// alerts for NEW fires only (rec.ids is exactly the set of rows this tick added); refusals are logged, not sent
const rows = loadJournal(FILE)
for (const id of rec.ids) {
  const row = rows.find((r) => r.id === id)
  if (!row || row.state === 'REFUSED') { console.log(`  🚧 ${id} REFUSED — ${row?.why ?? '?'}`); continue }
  if (row.shadow || TIER_STATS[row.tier]?.tradeable === false) { console.log(`  📓 ${id} SHADOW — recorded as forward evidence, never alerted (${TIER_STATS[row.tier]?.shadowWhy ?? 'not tradeable'})`); continue }
  const text = formatTierAlert(roster.impulseCont)
  const sent = await sendText(text)
  console.log(`  📣 ${id} ${sent.sent ? 'sent' : sent.dryRun ? 'dry-run (no TWIN_TELEGRAM_* set)' : 'NOT sent'}`)
}
console.log(`  journal: +${rec.added} new (${rec.skipped} already recorded) · resolved this tick: ${JSON.stringify(res?.resolved ?? res ?? null).slice(0, 160)}`)
T('done')
