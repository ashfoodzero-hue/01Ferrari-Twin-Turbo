// vol_audit/compare.mjs — rule 1 / 2 / 3 of docs/VOLUME_AUDIT_SPEC.md, mechanically, over the artifacts of two runs.
// usage: node scripts/vol_audit/compare.mjs <tagA|ORIG> <tagB> [--json out.json]
//   ORIG = the committed artifacts in data/master (rule 1 no-drift reference).
// Headline leaves = paths that contain an `oos` / `train` segment (or the study's top-level rate), EXCLUDING sub-breakdowns
// (by_side, era, years, by_year, table, cuts, ci, factors, keep_bins, by_reason, replication). Rates: keys in RATE; money: keys in MONEY.
// MATTERED (rule 2) ⇔ any verdict differs, or a headline OOS rate moves ≥ 0.02, or a headline OOS $/trade moves ≥ 0.10.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), MASTER = path.join(ROOT, 'data', 'master')
const [A, B] = process.argv.slice(2), outArg = process.argv.indexOf('--json'), OUT = outArg > 0 ? process.argv[outArg + 1] : null
const dirOf = (t) => t === 'ORIG' ? MASTER : path.join(MASTER, 'vol_audit', t)
const FILES = ['state_gate_on_impulse', 'swing_walls_study', 'wall_bubbles_study', 'c4h_level_study', 'wall_context_study', 'wall_scalp_study', 'wall_pullback_study', 'wall_defense_money', 'sell_downtrend_study', 'matrix_loss_autopsy', 'fvg_strong_study', 'order_block_study', 'ob_weak4h_confirm', 'volume_profile_study', 'vp_matrix_filter']
const SKIP = /(^|\.)(by_side|era|years|by_year|table|cuts|ci|factors|keep_bins|by_reason|replication|veto_reasons|at|rules|spec|window|split|oos_from|definition)(\.|$)/
const RATE = /^(wr|hold|oos_hold|train_hold|bounce|control|money_wr|touch_within_15m|hold_if_touched|base|oos|train|fill_rate|hit|mirror|wilson_lb|bounce_lb|oos_wr|train_wr|after_hold_ft10|oos_after_hold_ft10)$/
const MONEY = /^(net|oos_net|train_net|avg_net)$/
const flat = (o, p = '', out = {}) => { if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) flat(v, p ? p + '.' + k : k, out) } else out[p] = o; return out }

const rows = []
for (const f of FILES) {
  const fa = path.join(dirOf(A), f + '.json'), fb = path.join(dirOf(B), f + '.json')
  if (!fs.existsSync(fa) || !fs.existsSync(fb)) { rows.push({ study: f, missing: [!fs.existsSync(fa) && A, !fs.existsSync(fb) && B].filter(Boolean) }); continue }
  const a = flat(JSON.parse(fs.readFileSync(fa, 'utf8'))), b = flat(JSON.parse(fs.readFileSync(fb, 'utf8')))
  const flips = [], deltas = []
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (SKIP.test(k)) continue
    const leaf = k.split('.').at(-1)
    if (/verdict/i.test(leaf)) { if (a[k] !== b[k]) flips.push({ path: k, a: a[k], b: b[k] }); continue }
    if (typeof a[k] !== 'number' || typeof b[k] !== 'number') continue
    const isOos = /(^|\.)oos(\.|_|$)|oos_/.test(k) || /^(oos|base\.oos)$/.test(k)
    const kind = MONEY.test(leaf) ? 'money' : RATE.test(leaf) && Math.abs(a[k]) <= 1 && Math.abs(b[k]) <= 1 ? 'rate' : null
    if (!kind) continue
    const d = b[k] - a[k], big = kind === 'rate' ? Math.abs(d) >= 0.02 - 1e-9 : Math.abs(d) >= 0.10 - 1e-9
    deltas.push({ path: k, kind, a: a[k], b: b[k], d: +d.toFixed(4), oos: isOos, big })
  }
  const oosBig = deltas.filter((x) => x.oos && x.big)
  // IDENTICAL = the whole artifact equal (every leaf, sub-breakdowns included), only the run stamp `at` ignored
  const identical = Object.keys({ ...a, ...b }).every((k) => k === 'at' || JSON.stringify(a[k]) === JSON.stringify(b[k]))
  rows.push({ study: f, identical, verdict_flips: flips, oos_big_moves: oosBig.length, mattered: flips.length > 0 || oosBig.length > 0,
    max_oos_rate_move: Math.max(0, ...deltas.filter((x) => x.oos && x.kind === 'rate').map((x) => Math.abs(x.d))), max_oos_money_move: Math.max(0, ...deltas.filter((x) => x.oos && x.kind === 'money').map((x) => Math.abs(x.d))),
    top_oos: oosBig.sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 12) })
}
for (const r of rows) {
  if (r.missing) { console.log(`${r.study.padEnd(24)} MISSING in ${r.missing.join(', ')}`); continue }
  console.log(`${r.study.padEnd(24)} ${r.identical ? 'IDENTICAL' : r.mattered ? 'MATTERED ' : 'no-result'} flips ${r.verdict_flips.length} · OOS big moves ${r.oos_big_moves} · max OOS Δrate ${(100 * r.max_oos_rate_move).toFixed(1)}pp · max OOS Δ$ ${r.max_oos_money_move.toFixed(2)}`)
  for (const f of r.verdict_flips) console.log(`     FLIP ${f.path}: ${f.a} → ${f.b}`)
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ a: A, b: B, at: new Date().toISOString(), rows }, null, 1))
