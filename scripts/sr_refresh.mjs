// ════════════════════════════════════════════════════════════════════════════════
// sr_refresh.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> [--dry] — LIVE S/R levels refresh after every closed 1H candle (run_twin, per asset; 2026-10-18, Ashraf:
// "build the real strong S/R levels at 1H, 4H, 1D, 1W, 1Month … keep updating the strength of those level from the correct source make sure we have
// no stales during feeding"). Rebuilds every timeframe's levels from the FULL Polygon history with the study's code on CLOSED candles
// (scripts/lib/sr_live.mjs) — each level's own record (tests held / broke, flips) is therefore always current, and its measured class hold % comes
// from data/master/sr_levels_study.json. FAIL-CLOSED: if the newest stored minute is stale while the market is open, nothing is written (the old file
// ages → the health watcher's SR_FEED_STALE warning fires and the app shows STALE). WTI: CME, 10 min DELAYED on our plan → labelled DELAYED.
// Writes data/master/sr_live_<short>.json (alive levels within 10 ATR of price, per timeframe) + data/master/sr_display_<short>_<tf>.json (app chart).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { marketOpen } from '../src/core/freshness.js'
import { SR_TFS } from '../src/master/srLevels.js'
import { closedCandles, srLevelsAt } from './lib/sr_live.mjs'

const SYM = process.argv[2] || 'XAUUSD', DRY = process.argv.includes('--dry'), SH = SHORT[SYM], now = Date.now(), DELAYED = SYM === 'WTI'
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
const M = (await clean1m(SYM, { live: true })).filter((b) => b.t + 60000 <= now), lag = now - M.at(-1).t, lagMax = (DELAYED ? 20 : 5) * 60000
if (marketOpen(now) && marketOpen(now - 40 * 60000) && lag > lagMax) { console.log(`  🧱 sr_refresh ${SYM}: newest minute ${Math.round(lag / 60000)} min old while the market is open — STALE, nothing written`); process.exit(2) }
const study = readJ(`sr_levels_${SH}.json`), S = readJ('sr_levels_study.json')
const CC = closedCandles(SYM, M, now), R = srLevelsAt(SYM, CC, { study, S })
const yearsBack = (t, y) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime() }, FROM = DELAYED ? M[0].t : yearsBack(M.at(-1).t, 6)
const dp = SYM.startsWith('DXY') ? 4 : SYM === 'XAGUSD' ? 3 : 2, r = (x) => +x.toFixed(dp)
const live = { at: new Date(now).toISOString(), symbol: SYM, delayed: DELAYED, last_minute: new Date(M.at(-1).t).toISOString(), source: DELAYED ? 'Polygon CME futures (10 min DELAYED)' : SYM.startsWith('DXY') ? 'Polygon live stream: 6 pairs → DXY each minute' : 'Polygon live stream',
  strong_classes: S?.summary?.strong ?? [], tf: {} }
for (const tf of SR_TFS) { const T = R.tf[tf]
  live.tf[tf] = { last_closed: T.last_closed, last_close: T.last_close, atr: T.atr, levels: T.levels.filter((l) => l.end === 'open' && l.near).map(({ touches, ...l }) => ({ ...l, px: r(l.px), last_test: touches.at(-1) ?? null })).sort((a, b) => Math.abs(a.dist_atr) - Math.abs(b.dist_atr)) }
  if (!DRY) fs.writeFileSync(path.join(TURBO.master, `sr_display_${SH}_${tf}.json`), JSON.stringify({ at: live.at, symbol: SYM, tf, session: kit(SYM).session, delayed: DELAYED, refreshed_live: true, window: [new Date(FROM).toISOString(), live.last_minute],
    candles: CC[tf].filter((c) => c.t >= FROM).map((c) => [c.t, r(c.o), r(c.h), r(c.l), r(c.c)]),
    levels: T.levels.filter((l) => (l.ended ?? Infinity) >= FROM).map((l) => ({ sd: l.side0[0], px: r(l.px), ts: l.swing_t, tb: l.born, te: l.ended, end: l.end, side_now: l.side_now[0], flips: l.flips, react: l.reaction_atr == null ? null : +l.reaction_atr.toFixed(2), rt: l.reaction_tercile, rec: l.record, tch: l.touches.map((t) => [t[0], t[1][0], t[2]]) })) })) }
if (!DRY) { const F = path.join(TURBO.master, `sr_live_${SH}.json`); fs.writeFileSync(F + '.tmp', JSON.stringify(live)); fs.renameSync(F + '.tmp', F) }
console.log(`  🧱 sr_refresh ${SYM}: last minute ${live.last_minute.slice(11, 16)}${DELAYED ? ' (DELAYED)' : ''} · ${SR_TFS.map((tf) => `${tf} ${live.tf[tf].levels.length}`).join(' · ')} levels near price${DRY ? ' (dry)' : ' · written sr_live_' + SH + '.json'}`)
