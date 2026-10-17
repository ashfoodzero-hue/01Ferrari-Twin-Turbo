// ═══════════════════════════════════════════════════════════════════════════════
// import_futures_1m.mjs <GOLD_FUT|SILVER_FUT|WTI> — FULL rebuild of a continuous front-month 1m series from Polygon futures (2026-10-09; rule and
// fetch moved to src/data/futuresRule.js + futuresImport.js on 2026-10-17 so the importer, the live reader and the app's recorder share ONE rule).
// Polygon keeps only ≈ 2 years of futures history on our plan and that window ROLLS FORWARD daily — so a rebuild NEVER deletes our own older bars:
// every stored bar older than the new series' first minute is KEPT (this is how our own history grows beyond Polygon's window).
// GOLD_FUT: after a rebuild, run scripts/fix_gold_fut_with_cme.mjs (patches the CME-feed overlap) — this script does it automatically.
// Output: data/history/<ASSET>/1m.jsonl (+ manifest_1m.json). Re-runnable.
// ═══════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { FUT_RULES } from '../src/data/futuresRule.js'
import { buildFuturesSeries } from '../src/data/futuresImport.js'

const ASSET = (process.argv[2] || 'WTI').toUpperCase(), C = FUT_RULES[ASSET]; if (!C) { console.error('asset must be one of ' + Object.keys(FUT_RULES)); process.exit(1) }
const { sessions, runs, bars } = await buildFuturesSeries(ASSET, { fromMs: Date.UTC(2024, 9, 1), log: console.log })
if (!bars.length) { console.error('no bars returned — nothing written'); process.exit(1) }
console.log(`sessions ${sessions.length} · ${new Date(sessions[0][0]).toISOString().slice(0, 10)} → ${new Date(sessions.at(-1)[0]).toISOString().slice(0, 10)}`)
const dir = TURBO.historyAsset(ASSET), F = path.join(dir, '1m.jsonl'); fs.mkdirSync(dir, { recursive: true })
const old = fs.existsSync(F) ? fs.readFileSync(F, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const kept = old.filter((b) => b.t < bars[0].t), all = [...kept, ...bars]
fs.writeFileSync(F + '.tmp', all.map((b) => JSON.stringify(b)).join('\n') + '\n'); fs.renameSync(F + '.tmp', F)
fs.writeFileSync(path.join(dir, 'manifest_1m.json'), JSON.stringify({ symbol: ASSET, source: `polygon ${C.root} futures, continuous front month (src/data/futuresRule.js)`, rule: C, delayed_live_min: 10,
  first: new Date(all[0].t).toISOString(), last: new Date(all.at(-1).t).toISOString(), bars: all.length, kept_own_history_bars: kept.length, runs, generated_utc: new Date().toISOString(), note: C.note }, null, 1))
console.log(`✅ ${ASSET}: ${all.length.toLocaleString()} 1m bars ${new Date(all[0].t).toISOString()} → ${new Date(all.at(-1).t).toISOString()} (${runs.length} contract runs; ${kept.length} own older bars kept)`)
if (ASSET === 'GOLD_FUT') execFileSync(process.execPath, ['--max-old-space-size=8192', path.join(path.dirname(fileURLToPath(import.meta.url)), 'fix_gold_fut_with_cme.mjs')], { stdio: 'inherit' })
