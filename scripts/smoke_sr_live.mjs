// smoke_sr_live.mjs — the LIVE S/R levels + their zero-stale monitoring (2026-10-18): run_twin refreshes every asset hourly (one full-history child at a
// time), sr_refresh fails CLOSED on stale minutes (exit 2, nothing written), the health watcher judges the feed (SR_FEED_STALE / FEED_REFRESH_FAILED),
// the app page shows STALE instead of old levels, every live level carries its own record + the study's measured class (never "strong" unless the
// study says so), and the replay proof (live on the history available then = full-history truth) is on file with 0 differences for every asset.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const here = path.dirname(fileURLToPath(import.meta.url)), src = (f) => fs.readFileSync(path.join(here, '..', f), 'utf8'), J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
const tw = src('scripts/run_twin.mjs'), rf = src('scripts/sr_refresh.mjs'), dh = src('src/core/dataHealth.js'), ch = src('scripts/run_chart.mjs'), pg = src('ops/sr/index.html')
ok('run_twin: every asset at start + 4 min after every hour while open; S/R and trendline refreshes never run together', tw.includes("let lastSr = null, srRefreshing = null, srQueue = [...TL_SYMS]") && tw.includes('now - hKey >= 4 * 60000') && tw.includes("'sr_refresh.mjs'") && tw.includes('if (!srRefreshing && !tlRefreshing && srQueue.length)') && tw.includes('if (!tlRefreshing && !srRefreshing && tlQueue.length)'))
ok('sr_refresh fails CLOSED: stale newest minute while the market is open → exit 2, nothing written (WTI allowed 20 min: delayed feed)', rf.includes('process.exit(2)') && rf.includes('lag > lagMax') && rf.includes('(DELAYED ? 20 : 5) * 60000'))
ok('health watcher: SR_FEED_STALE (75 min), TL_FEED_STALE, TL_TICK_STALE, FEED_REFRESH_FAILED (exit 2 = stale minutes) — WARN, Telegram after 3 checks', dh.includes("'SR_FEED_STALE'") && dh.includes('srMaxAgeMs: 75 * MIN') && dh.includes("'FEED_REFRESH_FAILED'") && dh.includes("exit === 2 ? ' = stale minutes'"))
ok('app: /api/sr marks STALE (data gate halted, or S/R older than 75 min while open) and the page shows a blinking banner instead of trusting old levels', ch.includes("open && liveAge > 75 * 60000") && ch.includes('g.halted ? `DATA STALE') && pg.includes('S/R STALE') && pg.includes("$('banner').style.display = d.stale ? 'block' : 'none'"))
const S = J('sr_levels_study.json')
ok('the word STRONG comes only from the study (summary.strong); live levels carry measured class hold % vs placebo', src('scripts/lib/sr_live.mjs').includes('S?.summary?.strong') && pg.includes('No kind of level is measured STRONG') && Array.isArray(S?.summary?.strong))
for (const sh of ['xau', 'xag', 'dxy_ice', 'wti']) { const L = J(`sr_live_${sh}.json`), R = J(`sr_live_replay_${sh}.json`)
  ok(`${sh}: live levels on file with own records + measured classes${sh === 'wti' ? ' (DELAYED label)' : ''}`, L && ['1H', '4H', '1D', '1W', '1M'].every((tf) => Array.isArray(L.tf?.[tf]?.levels)) && L.tf['4H'].levels.every((l) => l.record && Array.isArray(l.measured)) && (sh !== 'wti' || L.delayed === true))
  ok(`${sh}: replay proof — live on the history available then = full-history truth (0 differences)`, R && R.differences === 0 && R.level_states_compared > 0, R ? `${R.differences} diffs` : 'run replay_sr_levels.mjs') }
console.log(`${fail ? '❌' : '✅'} SR LIVE SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
