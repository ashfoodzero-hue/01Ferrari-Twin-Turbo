// ════════════════════════════════════════════════════════════════════════════════
// trendline_tick.mjs [SYM,SYM…] [--dry] — LIVE major-trendline alerts every minute (run_twin, while the market is open; 2026-10-18, Ashraf: "when ever
// it reach those major trend lines from both sides we need alert for either a bounce or a major break" → 4H + 1D, Telegram + app, all three alerts;
// then "same for DXY and silver, WTI"). Lines + live state: data/master/trendline_live_lines_<short>.json (trendline_lines.mjs). The check itself is
// scripts/lib/trendline_live.mjs tickCheck (the study's per-candle rules applied to the FORMING candle):
//   📐 AT LINE : an ARMED line, forming-candle extreme within 0.25 × ATR → once per line per candle
//   ✅ BOUNCED : a PENDING line (touched on an earlier candle), forming-candle far extreme ≥ 1 ATR away → once per touch
//   (❌ BROKEN is decided at the candle close by trendline_lines.mjs.)
// Fail-closed: no fresh minute → nothing; a newer candle closed than the lines file knows → that timeframe waits for the refresh; 18:00-18:16 New York
// (reopen clamp settling) → waits. Sends go through the data-health gate; WTI is BLOCKED by the red rule (10 min delayed feed).
// Writes data/master/trendline_tick_state.json (the app's live view).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { raw1m, SHORT, kit } from './lib/series_1m.mjs'
import { tickCheck } from './lib/trendline_live.mjs'
import { TL_ALERT_ASSETS, TL_ALERT_BLOCKED, TL_ALERT_TFS, sendAlerts, loadLedger } from './lib/trendline_alerts.mjs'

const DRY = process.argv.includes('--dry'), now = Date.now()
const SYMS = (process.argv.slice(2).find((a) => !a.startsWith('--')) || 'XAUUSD,XAGUSD,DXY_ICE,WTI').split(',')
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const state = { at: new Date(now).toISOString(), assets: {} }, events = []
for (const SYM of SYMS) {
  const L = readJ(path.join(TURBO.master, `trendline_live_lines_${SHORT[SYM]}.json`))
  if (!L) { state.assets[SYM] = { status: 'no lines file (trendline_lines.mjs not run)', blocked: TL_ALERT_BLOCKED[SYM] ?? null, tf: {} }; continue }
  const from = Math.min(...TL_ALERT_TFS.map((tf) => L.tf[tf]?.last_closed ?? now)) - 60000
  const M = kit(SYM, { live: true }).clean(await raw1m(SYM, from)).filter((b) => b.t + 60000 <= now)   // live: keep the forming session's first hour
  const r = tickCheck(SYM, L, M, now, { lagMin: SYM === 'WTI' ? 15 : 5 })
  state.assets[SYM] = { status: r.status, blocked: TL_ALERT_BLOCKED[SYM] ?? null, price: r.price ?? null, last_minute: r.last_minute ? new Date(r.last_minute).toISOString() : null, lines_refreshed: L.at, tf: r.tf }
  events.push(...r.events) }
await sendAlerts(events, { dry: DRY, now })
const led = loadLedger(); state.recent = Object.entries(led).filter(([, v]) => now - Date.parse(v.at) < 7 * 86400000).map(([k, v]) => ({ key: k, ...v })).sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 50)
if (!DRY) { const F = path.join(TURBO.master, 'trendline_tick_state.json'); fs.writeFileSync(F + '.tmp', JSON.stringify(state)); fs.renameSync(F + '.tmp', F) }
console.log(`  📐 trendline_tick ${new Date(now).toISOString().slice(11, 16)}: ${SYMS.map((s) => `${TL_ALERT_ASSETS[s].name} ${state.assets[s].status}${state.assets[s].price ? ' @' + state.assets[s].price : ''}`).join(' · ')} · events ${events.length}`)
