// status.mjs — Ferrari Twin Turbo at a glance (the desktop shortcut runs this). Read-only: it reads the app's own files and prints them.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { TIER_STATS } from '../src/master/tierStats.js'

const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
const ago = (iso) => { if (!iso) return '—'; const s = Math.round((Date.now() - Date.parse(iso)) / 1000); return s < 120 ? `${s}s ago` : s < 7200 ? `${Math.round(s / 60)} min ago` : `${(s / 3600).toFixed(1)} h ago` }
const hb = J('live_heartbeat.json'), st = J('stream_heartbeat.json'), sig = J('signal_tiers.json'), rec = J('reconcile_1m.json')
const up = hb && pidAlive(hb.pid) && Date.now() - Date.parse(hb.at) < 180000
const streamUp = st && pidAlive(st.pid) && st.connected && Date.now() - Date.parse(st.at) < 30000

console.log('\n  ══════════════  FERRARI TWIN TURBO  ══════════════\n')
console.log(`  App (run_twin)     ${up ? 'RUNNING' : 'DOWN'}   pid ${hb?.pid ?? '—'} · heartbeat ${ago(hb?.at)}`)
console.log(`  Live tick stream   ${streamUp ? 'LIVE' : 'NOT LIVE'}   pid ${st?.pid ?? '—'} · reconnects ${st?.reconnects ?? '—'} · market ${st?.market_open ? 'open' : 'closed'}`)
if (st?.symbols) {
  console.log('\n  Symbol   bid          ask          ticks/min  settled   verified  mismatch  corrected')
  for (const [s, x] of Object.entries(st.symbols)) console.log(`  ${s.padEnd(8)} ${String(x.bid ?? '—').padEnd(12)} ${String(x.ask ?? '—').padEnd(12)} ${String(x.ticks_last_60s).padStart(5)}      ${(x.settled_through || '').slice(11, 16)}     ${String(x.counts?.tick_ca ?? 0).padStart(5)}     ${String(x.counts?.mismatch ?? 0).padStart(5)}     ${String(x.counts?.corrected ?? 0).padStart(5)}`)
}
console.log(`\n  Last decision      bar ${sig?.bars_to?.slice(0, 16).replace('T', ' ') ?? '—'} UTC · published ${ago(sig?.published_utc)} · data ${sig?.data?.live ? 'live & verified' : 'STALE — ' + (sig?.data?.stale_why ?? '?')}`)
console.log(`  Market state       ${sig?.marketState?.state ?? '—'} — ${sig?.summary ?? '—'}`)
console.log('\n  Books (measured on the twin\'s own Polygon data, money path)')
for (const [k, s] of Object.entries(TIER_STATS)) console.log(`  ${k.padEnd(14)} ${s.tradeable ? 'SHIP (paper)' : 'SHADOW — not traded'} · OOS $${s.netPerTradeUsd}/trade [LB ${s.netPerTradeLbUsd}]`)
const lf = J('level_fade_gate.json'); if (lf) console.log(`  ${'LEVEL_FADE'.padEnd(14)} ${lf.verdict === 'SHIP' ? 'SHIP' : 'SHADOW — not traded'} · OOS $${lf.shipped?.net_per_trade_oos}/trade`)
console.log(`  ⇒ ${Object.values(TIER_STATS).some((s) => s.tradeable) || lf?.verdict === 'SHIP' ? 'a book is trading on paper' : 'NO book ships — the app records and verifies live data, nothing is traded'}`)
if (rec) console.log(`\n  Nightly reconcile  ${ago(rec.at)} · ${Object.values(rec.symbols).reduce((a, x) => a + (x.corrected ?? 0), 0)} minute(s) corrected · ${Object.values(rec.symbols).reduce((a, x) => a + (x.missing ?? 0), 0)} missing`)
console.log('\n  Docs: docs\\MASTER_DOCUMENT.md · Watchdog task: FerrariTwinTurbo_Watchdog (every 5 min)\n')
