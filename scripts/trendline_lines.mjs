// ════════════════════════════════════════════════════════════════════════════════
// trendline_lines.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> [--dry] — LIVE trendline refresh after every closed 4H candle (the 1D close is one of them), run by
// run_twin (2026-10-18; Ashraf: alerts "for either a bounce or a major break" at the major trendlines, 4H + 1D, both sides; then DXY, silver, WTI).
//   • rebuilds the 4H and 1D lines from the FULL history with the study's code, on CLOSED candles only (scripts/lib/trendline_live.mjs liveLines);
//   • ❌ BROKEN (close ≥ 0.25 ATR through on the last closed candle) and ✅ BOUNCED resolved on it → alerts (scripts/lib/trendline_alerts.mjs, deduped);
//   • writes data/master/trendline_live_lines_<short>.json (open major lines within 10 ATR + live state) for trendline_tick.mjs, and refreshes the app
//     page data data/master/trendlines_display_<short>_<4H|1D>.json (same format as the study).
// --dry: compute + print, write nothing, send nothing.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { liveLines } from './lib/trendline_live.mjs'
import { sendAlerts } from './lib/trendline_alerts.mjs'

const SYM = process.argv[2] || 'XAUUSD', DRY = process.argv.includes('--dry'), SH = SHORT[SYM], now = Date.now()
const M = (await clean1m(SYM, { live: true })).filter((b) => b.t + 60000 <= now)   // live: keep the forming session's first hour
const yearsBack = (t, y) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime() }, FROM = SYM === 'WTI' ? M[0].t : yearsBack(M.at(-1).t, 6)
// 1H + 1W (2026-10-19): page data only (DISPLAY_TFS), so every page tab is live — no study snapshot left on the app.
const DISPLAY_TFS = ['1H', '1W']
const { live, events, display } = liveLines(SYM, M, now, { display: true, displayFrom: FROM, displayTfs: DISPLAY_TFS, dp: SYM.startsWith('DXY') ? 4 : SYM === 'XAGUSD' ? 3 : 2 })
for (const [tf, T] of Object.entries(live.tf)) console.log(`  📐 ${SYM} ${tf}: last closed ${new Date(T.last_closed).toISOString().slice(0, 16)} · open major lines within 10 ATR ${T.lines.length} (armed ${T.lines.filter((x) => x.armed).length}, pending ${T.lines.filter((x) => x.pending).length})`)
for (const [tf, D] of Object.entries(display)) {
  if (DISPLAY_TFS.includes(tf)) console.log(`  📐 ${SYM} ${tf} (page only): last closed ${D.candles.length ? new Date(D.candles.at(-1)[0]).toISOString().slice(0, 16) : '—'} · lines ${D.lines.length}`)
  if (!DRY) { const F = path.join(TURBO.master, `trendlines_display_${SH}_${tf}.json`)
    fs.writeFileSync(F + '.tmp', JSON.stringify({ at: live.at, symbol: SYM, tf, session: kit(SYM).session, window: [new Date(FROM).toISOString(), new Date(M.at(-1).t).toISOString()], refreshed_live: true, ...D })); fs.renameSync(F + '.tmp', F) } }
if (!DRY) { const F = path.join(TURBO.master, `trendline_live_lines_${SH}.json`); fs.writeFileSync(F + '.tmp', JSON.stringify(live)); fs.renameSync(F + '.tmp', F) }
await sendAlerts(events, { dry: DRY, now })
console.log(`  📐 trendline_lines ${SYM}: ${events.length} close event(s)${DRY ? ' (dry)' : ' · written trendline_live_lines_' + SH + '.json'}`)
