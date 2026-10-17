// vol_audit/verify_drop_live.mjs — after the live code switched to DROP (2026-10-17, Ashraf approved), the re-run study artifacts the LIVE app reads
// must equal the audit's DROP artifacts (data/master/vol_audit/drop_full/) — proving the live change is exactly what was measured.
// Ignores only run stamps (at / generated / *_utc). Prints every differing path. Exit 1 on any difference.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'

const FILES = ['c4h_level_study.json', 'wall_bubbles_study.json', 'swing_walls_study.json', 'wall_context_study.json', 'fvg_strong_study.json']
const SKIP = /^(at|generated|generated_utc|run_at|ts)$/
// fvg_strong only: the audit's wrapper forced s2 = true, the live fvg.js keeps the real s2 as a record, so the S2 factor row differs and its
// levelStat consumes the shared seeded rng differently → every later random control (control, net_lb) shifts. MEASURED 2026-10-17: the live
// study run with only s2 forced (VOL_MODE=drop preload) equals the audit artifact on every value except rules.strong (the text).
// So for fvg_strong these rng-dependent / record-only keys are skipped; event counts, bounce, net and verdicts stay strict.
const SKIP_FVG = /^(rules|S2|control|net_lb)$/
const diff = (a, b, p, out, skip = SKIP) => {
  if (typeof a !== typeof b) return out.push(`${p}: type ${typeof a} vs ${typeof b}`)
  if (a && typeof a === 'object') { const keys = new Set([...Object.keys(a), ...Object.keys(b ?? {})]); for (const k of keys) { if (SKIP.test(k) || skip.test(k)) continue; diff(a[k], b?.[k], p + '.' + k, out, skip) } return }
  if (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 1e-9 : a !== b) out.push(`${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`) }
let bad = 0
for (const f of FILES) { const live = JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')), drop = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'vol_audit', 'drop_full', f), 'utf8')), out = []
  diff(live, drop, f, out, f === 'fvg_strong_study.json' ? SKIP_FVG : SKIP); bad += out.length
  console.log(`${out.length ? '✗' : '✓'} ${f}: ${out.length} differing values${out.length ? '\n    ' + out.slice(0, 8).join('\n    ') : ''}`) }
console.log(bad ? `✗ LIVE ≠ AUDIT DROP (${bad} values)` : '✅ LIVE = AUDIT DROP on all 5 artifacts'); if (bad) process.exitCode = 1
