// ladder_tick.mjs — writes data/master/ladder_state.json: the swing study's flip ladder, live, INFORMATION only (2026-10-17; docs/LADDER_CONTEXT_SPEC.md).
// One state per anchor (15m, 1H, 4H, 1D) from src/master/ladderContext.js; the odds are QUOTED from data/master/swing_ladder_atlas.json.
// Fail-closed: no fresh minute (≤ 5 min old) → nothing written. --dry: compute and print, write nothing. --now=ISO: replay at a past moment (prints only).
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv } from '../src/core/nyCandles.js'
import { ladderState, WINDOW_DAYS, LADDER_STEPS } from '../src/master/ladderContext.js'

const DRY = process.argv.includes('--dry'), nowArg = process.argv.find((a) => a.startsWith('--now=')), REPLAY = !!nowArg
const now = REPLAY ? Date.parse(nowArg.slice(6)) : Date.now()
const atlas = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), 'utf8'))
const maxDays = Math.max(...Object.values(WINDOW_DAYS)), M = cleanForTv((await loadBars('XAUUSD', '1m', { from: now - maxDays * 86400000, to: now })).bars).bars.filter((b) => b.t + 60000 <= now)
if (!M.length || (!REPLAY && now - M.at(-1).t > 5 * 60000)) { console.log('  ladder_tick: no fresh minute — nothing written'); process.exit(0) }
const out = { at: new Date(now).toISOString(), last_minute: new Date(M.at(-1).t).toISOString(), source: 'docs/SWING_STUDY_BOOK.md §5B · odds from data/master/swing_ladder_atlas.json (OOS)', anchors: {} }
for (const anchor of Object.keys(LADDER_STEPS)) { const from = now - WINDOW_DAYS[anchor] * 86400000; out.anchors[anchor] = ladderState(M.filter((b) => b.t >= from), anchor, now, atlas) }
for (const [a, s] of Object.entries(out.anchors)) console.log(`  ${a.padEnd(3)} ${s.leg ? `${s.leg}-leg ${s.side === 'L' ? 'low' : 'high'} ${s.extreme} · steps ${s.steps.map((x) => x.tf + (x.flipped ? '✓' : '·')).join(' ')} · ${s.deepest ? `${(100 * s.odds.p_real).toFixed(0)}% real (base ${(100 * s.odds.base).toFixed(0)}%, ${s.odds.label})` : `base ${(100 * (s.odds.base ?? 0)).toFixed(0)}%`}` : s.why}`)
if (DRY || REPLAY) process.exit(0)
fs.writeFileSync(path.join(TURBO.master, 'ladder_state.json.tmp'), JSON.stringify(out, null, 1)); fs.renameSync(path.join(TURBO.master, 'ladder_state.json.tmp'), path.join(TURBO.master, 'ladder_state.json'))
