// smoke_trial_journal.mjs — Ferrari Twin Turbo: the trial = Turbo2's journal (read-only) + the twin's own, merged by id.
// Origin (2026-10-08): promotion:review read only the twin's empty journal and reported 0/50 while Turbo2 had journaled
// 9 sequential resolved fires of the identical book (smoke:parity). src/master/trialJournal.js is the one merge rule.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { mergeTrialRows, mergeCorrections, loadTrial } from '../src/master/trialJournal.js'
import { REF } from '../src/core/paths.js'

let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const r = (tier, t, o = {}) => ({ id: `${tier}@${t}`, tier, t, state: 'SCRATCH', pnl: 1, risk: 10, entry: 100, ...o })

ok('MERGE: only the trial tiers are inherited; the twin row wins an id collision; no fire is counted twice; sorted by t', () => {
  const inherited = [r('IMPULSE_CONT', 3), r('SWING_TRADE', 2), r('IMPULSE_CONT', 1, { pnl: -5 })]
  const own = [r('IMPULSE_CONT', 1, { pnl: 2 }), r('IMPULSE_CONT', 5)]
  const m = mergeTrialRows(inherited, own, ['IMPULSE_CONT'])
  assert.deepEqual(m.map((x) => x.t), [1, 3, 5])
  assert.equal(m.find((x) => x.t === 1).pnl, 2); assert.equal(m.find((x) => x.t === 1).source, 'twin')
  assert.equal(m.find((x) => x.t === 3).source, 'turbo2')
  assert(!m.some((x) => x.tier === 'SWING_TRADE'), 'a dropped book never enters the trial')
})

ok('CORRECTIONS: null when no audit exists; own audit wins; rows without an after.pnl are ignored', () => {
  assert.equal(mergeCorrections(null, null), null)
  const m = mergeCorrections({ affected: [{ id: 'a', after: { pnl: 1 } }, { id: 'b', after: {} }] }, { affected: [{ id: 'a', after: { pnl: 3 } }] })
  assert.equal(m.get('a'), 3); assert(!m.has('b'))
})

ok('LOAD on fixtures: missing files read as empty, never throw, never create', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-'))
  const own = path.join(dir, 'own.jsonl'), ref = path.join(dir, 'ref.jsonl')
  fs.writeFileSync(ref, [r('IMPULSE_CONT', 1), r('H1_STRUCT', 2)].map((x) => JSON.stringify(x)).join('\n') + '\n')
  const t = loadTrial(['IMPULSE_CONT'], { ownFile: own, refFile: ref, ownAuditFile: path.join(dir, 'no1.json'), refAuditFile: path.join(dir, 'no2.json'), rescoreFile: path.join(dir, 'no3.jsonl') })
  assert.equal(t.rows.length, 1); assert.deepEqual(t.sources, { inherited: 1, rescored: 0, own: 0 }); assert.equal(t.corrected, null)
  assert(!fs.existsSync(own), 'loading must not create the own journal')
})

ok('READ-ONLY on the real parent: loading leaves Turbo2\'s journal byte-identical (size + mtime)', () => {
  const f = path.join(REF.turbo2Paper, 'trades.jsonl'); if (!fs.existsSync(f)) return
  const before = fs.statSync(f); loadTrial(['IMPULSE_CONT']); const after = fs.statSync(f)
  assert.equal(after.mtimeMs, before.mtimeMs); assert.equal(after.size, before.size)
})

ok('STATIC: promotion_review reads the trial ONLY through trialJournal.js (no inline journal path — one rule, one place)', () => {
  const src = fs.readFileSync(new URL('./promotion_review.mjs', import.meta.url), 'utf8')
  assert(src.includes("from '../src/master/trialJournal.js'"))
  assert(!/trades\.jsonl/.test(src.replace(/^\/\/.*$/gm, '')), 'no direct journal read in the review')
})

ok('RESCORE overlay: a rescored inherited row REPLACES the inherited one (source turbo2-rescored); own rows still win; a rescored id never also carries a BE-audit correction', () => {
  const inh = [r('IMPULSE_CONT', 1, { pnl: -14 }), r('IMPULSE_CONT', 2)]
  const res = [{ ...r('IMPULSE_CONT', 1, { pnl: 2.12 }) }, { ...r('IMPULSE_CONT', 9) }]
  const m = mergeTrialRows(inh, [r('IMPULSE_CONT', 2, { pnl: 7 })], ['IMPULSE_CONT'], res)
  assert.deepEqual(m.map((x) => [x.t, x.source, x.pnl]), [[1, 'turbo2-rescored', 2.12], [2, 'twin', 7]], 'rescore applies only to inherited ids; unknown ids are not invented')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial2-')); const w = (n, rows) => { const p = path.join(dir, n); fs.writeFileSync(p, rows.map((x) => JSON.stringify(x)).join(String.fromCharCode(10)) + String.fromCharCode(10)); return p }
  const audit = path.join(dir, 'audit.json'); fs.writeFileSync(audit, JSON.stringify({ generated_utc: 'x', affected: [{ id: 'IMPULSE_CONT@1', after: { pnl: 99 } }] }))
  const L = loadTrial(['IMPULSE_CONT'], { ownFile: path.join(dir, 'none'), refFile: w('ref.jsonl', inh), ownAuditFile: path.join(dir, 'no'), refAuditFile: audit, rescoreFile: w('res.jsonl', res) })
  assert.equal(L.corrected.has('IMPULSE_CONT@1'), false); assert.equal(L.sources.rescored, 1)
})

console.log(process.exitCode ? '✗ TRIAL-JOURNAL SMOKE FAILED' : `✅ TRIAL-JOURNAL SMOKE: ${n} passed, 0 failed`)
