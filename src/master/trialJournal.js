// ════════════════════════════════════════════════════════════════════════════════
// trialJournal.js — the ONE place that decides which paper rows count as this book's forward trial (2026-10-08).
// ────────────────────────────────────────────────────────────────────────────────
// The twin's book IS Turbo2's IMPULSE_CONT book: `smoke:parity` proves the twin's roster fires on the same bars with the
// same 14 fields, and both apply STATE_GATE_MODE='block'. Turbo2 has journaled that book since 2026-08-13; the twin's own
// scheduler has not run. Reading only the twin's journal therefore reported "0/50" while 9 sequential resolved fires of
// the identical book existed. The trial is one trial, so the review reads BOTH journals:
//
//   • REF.turbo2Paper/trades.jsonl — READ-ONLY, inherited rows of the trial's tier(s) only
//   • TURBO.paper/trades.jsonl      — the twin's own rows (once `npm start` runs)
//
// Merged by row id (`TIER@t`); the twin's own row wins a collision, so the same fire is never counted twice when both
// schedulers run. BE corrections (paper_be_audit.json, the 09-06 exit-path fix) merge the same way: Turbo2's audit for
// inherited rows, the twin's for its own; journals are never rewritten.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, REF } from '../core/paths.js'

const readJsonl = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null } }

/**
 * Pure merge: inherited rows (filtered to `tiers`) + own rows, deduped by id, own wins. Sorted by t.
 * rescored (2026-10-08): inherited fires re-resolved on the twin's CURRENT Polygon bars (scripts/rescore_inherited_trial.mjs —
 * Polygon re-issued 1 Jul → 5 Oct) REPLACE their inherited row (source 'turbo2-rescored'); own rows still win.
 */
export function mergeTrialRows(inherited, own, tiers, rescored = []) {
  const keep = new Set(tiers)
  const byId = new Map()
  for (const r of inherited) if (keep.has(r.tier)) byId.set(r.id ?? `${r.tier}@${r.t}`, { ...r, source: 'turbo2' })
  for (const r of rescored) if (keep.has(r.tier) && byId.has(r.id)) byId.set(r.id, { ...r, source: 'turbo2-rescored' })
  for (const r of own) byId.set(r.id ?? `${r.tier}@${r.t}`, { ...r, source: 'twin' })
  return [...byId.values()].sort((a, b) => a.t - b.t)
}

/** Pure merge of BE-audit corrections → Map(id → corrected pnl); own audit wins. Null when neither audit exists. */
export function mergeCorrections(inheritedAudit, ownAudit) {
  if (!inheritedAudit && !ownAudit) return null
  const m = new Map()
  for (const a of [inheritedAudit, ownAudit]) for (const x of a?.affected ?? []) if (x.after?.pnl != null) m.set(x.id, x.after.pnl)
  return m
}

/** Load the trial as one series. tiers = the books under trial (the twin: ['IMPULSE_CONT']). */
export function loadTrial(tiers, { ownFile = path.join(TURBO.paper, 'trades.jsonl'), refFile = path.join(REF.turbo2Paper, 'trades.jsonl'),
  ownAuditFile = path.join(TURBO.master, 'paper_be_audit.json'), refAuditFile = path.join(REF.turbo2Master, 'paper_be_audit.json'),
  rescoreFile = path.join(TURBO.master, 'paper_rescore_polygon1m.jsonl') } = {}) {
  const own = readJsonl(ownFile), inherited = readJsonl(refFile), rescored = readJsonl(rescoreFile)
  const rows = mergeTrialRows(inherited, own, tiers, rescored)
  const ownAudit = readJson(ownAuditFile), refAudit = readJson(refAuditFile)
  const corrected = mergeCorrections(refAudit, ownAudit)
  if (corrected) for (const r of rows) if (r.source === 'turbo2-rescored') corrected.delete(r.id)   // a rescored row is already resolved by the fixed code
  return {
    rows,
    corrected,
    sources: { inherited: rows.filter((r) => r.source === 'turbo2').length, rescored: rows.filter((r) => r.source === 'turbo2-rescored').length, own: rows.filter((r) => r.source === 'twin').length },
    audits: [refAudit && `turbo2 ${refAudit.generated_utc?.slice(0, 10)}`, ownAudit && `twin ${ownAudit.generated_utc?.slice(0, 10)}`].filter(Boolean),
  }
}
