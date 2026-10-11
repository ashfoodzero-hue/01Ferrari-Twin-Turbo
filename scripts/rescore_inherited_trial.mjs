// ════════════════════════════════════════════════════════════════════════════════
// rescore_inherited_trial.mjs — re-resolve the inherited IMPULSE_CONT paper fires on the twin's CURRENT Polygon bars.
// ────────────────────────────────────────────────────────────────────────────────
// WHY (2026-10-08): Turbo2 resolved its Jul-Oct paper fires on bars Polygon has since RE-ISSUED (1 Jul → 5 Oct differ in
// ~70% of 1m opens/closes; docs/POLYGON_DATA_REACH.md). Under R0 the current Polygon bars are the truth. METHOD: every
// inherited fire (REFUSED rows excluded — they never traded) is rebuilt as a fresh PENDING row carrying only its signal
// (side, entry, stop, target, t, recordedAtBar, tf, BE trigger/lock) and resolved by the paper trader's OWN resolveOpen
// on the twin's 15m (resampled 1m) with the 1m sub-bar replay — the same code path the live trial uses. Output:
// data/master/paper_rescore_polygon1m.jsonl (one rescored row per fire) + a before/after summary JSON. Journals untouched.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TURBO, REF } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { resolveOpen, loadJournal } from '../src/master/paperTrader.js'
import { makeSubBarIndex } from '../src/core/seqResolver.js'
import { classifyFire, isFire } from '../src/master/paperReview.js'

const TIER = 'IMPULSE_CONT'
const src = loadJournal(path.join(REF.turbo2Paper, 'trades.jsonl')).filter((r) => r.tier === TIER && isFire(r))
const KEEP = ['id', 'tier', 'side', 'entry', 'stop', 'target', 'tf', 't', 'recordedAtBar', 'beTriggerR', 'beLockR', 'risk', 'atr', 'reasons', 'readiness', 'shadow']
const fresh = src.map((r) => ({ ...Object.fromEntries(KEEP.filter((k) => r[k] !== undefined).map((k) => [k, r[k]])), state: 'PENDING' }))
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rescore-')), 'trades.jsonl')
fs.writeFileSync(tmp, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n')
const from = Math.min(...fresh.map((r) => r.t)) - 2 * 86400000
const b15 = (await loadBars('XAUUSD', '15m', { from })).bars.filter((b) => b.t + 900000 <= Date.now())
const m1 = (await loadBars('XAUUSD', '1m', { from })).bars
resolveOpen(tmp, b15, undefined, { subBarsOf: makeSubBarIndex(m1) })
const after = new Map(loadJournal(tmp).map((r) => [r.id, r]))
const rows = [], changes = []
for (const r of src) {
  const a = after.get(r.id); if (!a) continue
  const row = { ...a, rescored: { on: 'twin polygon 1m (re-issued bars)', at: new Date().toISOString(), before: { state: r.state, pnl: r.pnl ?? null } } }
  rows.push(row)
  if (a.state !== r.state || Math.abs((a.pnl ?? 0) - (r.pnl ?? 0)) > 0.005) changes.push({ id: r.id, t: new Date(r.t).toISOString().slice(0, 16), side: r.side, before: `${r.state} ${r.pnl ?? '—'}`, after: `${a.state} ${a.pnl ?? '—'}` })
}
fs.writeFileSync(path.join(TURBO.master, 'paper_rescore_polygon1m.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
const tally = (xs, key) => xs.reduce((o, r) => { const k = key(r) ?? '—'; o[k] = (o[k] || 0) + 1; return o }, {})
const sum = (xs) => +xs.reduce((s, r) => s + (r.pnl ?? 0), 0).toFixed(2)
const out = { generated_utc: new Date().toISOString(), fires: src.length, rescored: rows.length,
  before: { classes: tally(src, classifyFire), pnl: sum(src) }, after: { classes: tally(rows, classifyFire), pnl: sum(rows) }, changed: changes.length, changes }
fs.writeFileSync(path.join(TURBO.master, 'paper_rescore_polygon1m.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify({ ...out, changes: undefined }, null, 1)); for (const c of changes) console.log('  ', c.t, c.side, c.before, '→', c.after)
