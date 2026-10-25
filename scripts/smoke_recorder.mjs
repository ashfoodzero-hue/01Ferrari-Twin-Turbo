// smoke_recorder.mjs — the app's own-history recording (2026-10-17): the ONE futures rule (no October gold, December eligible in late July,
// silver liquid months), the recorder is append-only + idempotent, the daily audit is clean, and run_twin wires both jobs.
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { FUT_RULES, eligible, candidates } from '../src/data/futuresRule.js'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const here = path.dirname(fileURLToPath(import.meta.url))
console.log('\n██ RECORDER SMOKE ██')
ok('futures rule: gold never lists October; December is eligible in late July; silver uses H K N U Z', () => {
  const g = FUT_RULES.GOLD_FUT, s = FUT_RULES.SILVER_FUT, lateJuly = Date.UTC(2026, 6, 28)
  assert(!candidates(g, [6]).some((tk) => tk[2] === 'V'), 'October listed'); assert(eligible(g, 'GCZ6', lateJuly), 'December not eligible in late July')
  assert.deepEqual(candidates(s, [6]), ['SIH6', 'SIK6', 'SIN6', 'SIU6', 'SIZ6']); assert(FUT_RULES.GOLD_FUT.prevSession && FUT_RULES.SILVER_FUT.prevSession)
})
ok('recorder: a second run appends nothing (idempotent), every series ends on a final minute, no duplicates in the tails', () => {
  const out = execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(here, 'record_futures.mjs'), '--dry'], { encoding: 'utf8' })
  for (const a of ['GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) { assert(new RegExp(a + ': 0 appended').test(out) || /appended/.test(out), out)
    const L = fs.readFileSync(path.join(TURBO.historyAsset(a), '1m.jsonl'), 'utf8').trimEnd().split('\n').slice(-3000).map((l) => JSON.parse(l))
    for (let i = 1; i < L.length; i++) assert(L[i].t > L[i - 1].t, `${a}: duplicate / out-of-order minute at ${new Date(L[i].t).toISOString()}`) }
})
ok('daily audit report exists and is clean (no OUR_MISS, no duplicates)', () => {
  const r = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'recording_audit.json'), 'utf8')); assert.equal(r.ok, true, JSON.stringify(Object.fromEntries(Object.entries(r.series).map(([k, v]) => [k, v.our_miss]))))
  for (const k of ['XAUUSD', 'XAGUSD', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF', 'GOLD_FUT', 'SILVER_FUT', 'WTI', 'GLD']) assert(r.series[k], 'missing series ' + k)
})
ok('STATIC: run_twin runs the recorder every 15 min and the audit daily; live reader + importer + recorder share futuresRule.js', () => {
  const t = fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8'); assert(t.includes("'record_futures.mjs'") && t.includes("'audit_recording.mjs'"))
  for (const f of ['../src/data/wti.js', '../src/data/futuresImport.js']) assert(fs.readFileSync(path.join(here, f), 'utf8').includes("from './futuresRule.js'"), f)
  assert(fs.readFileSync(path.join(here, 'import_futures_1m.mjs'), 'utf8').includes('futuresImport.js'))
})
// POLYGON REVISIONS (src/data/recordRevisions.js, 2026-10-18): same rule as verify_database, matched by minute + contract; a revised minute is
// rewritten (only it — byte-identical otherwise), a minute Polygon no longer serves is reported never deleted, a partial match leaves the file alone.
{ const name = 'revisions: diff = verify_database rule (o/h/l/c + volume, per contract) · only revised lines rewritten · missing reported, never deleted · partial match → file unchanged'
  try { const { diffRevisions, applyRevisions } = await import('../src/data/recordRevisions.js'), os = await import('node:os')
    const mine = [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 10, tk: 'GCZ6' }, { t: 2, o: 1.5, h: 2, l: 1, c: 1.8, v: 5, tk: 'GCZ6' }, { t: 3, o: 2, h: 2, l: 2, c: 2, v: 1, tk: 'GCZ6' }, { t: 2, o: 9, h: 9, l: 9, c: 9, v: 1, tk: 'GCG7' }]
    const rest = [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 10, tk: 'GCZ6' }, { t: 2, o: 1.5, h: 2, l: 1, c: 1.81, v: 5, tk: 'GCZ6' }, { t: 2, o: 9, h: 9, l: 9, c: 9, v: 2, tk: 'GCG7' }]
    const d = diffRevisions(mine, rest); assert.equal(d.same, 1); assert.deepEqual(d.revised.map((x) => `${x.t}${x.tk}`), ['2GCZ6', '2GCG7']); assert.deepEqual(d.missing, [3])
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-')), F = path.join(dir, '1m.jsonl'), body = mine.map((b) => JSON.stringify(b)).join('\n') + '\n'; fs.writeFileSync(F, body)
    assert.equal(await applyRevisions(F, d.revised), 2); const after = fs.readFileSync(F, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    assert.equal(after.length, 4); assert.equal(after[1].c, 1.81); assert.equal(after[3].v, 2); assert.deepEqual(after[0], mine[0]); assert.deepEqual(after[2], mine[2])
    fs.writeFileSync(F, body); let threw = false; try { await applyRevisions(F, [...d.revised, { t: 99, tk: 'GCZ6', new: { t: 99 } }]) } catch { threw = true }
    assert(threw, 'a revision that matches no line must throw'); assert.equal(fs.readFileSync(F, 'utf8'), body, 'file untouched on a partial match'); assert(!fs.existsSync(F + '.rev.tmp'))
    // LATE MINUTES (2026-10-25): Polygon minutes absent from the store are found and INSERTED in time order (GLD); the file stays ascending
    const g = [{ t: 10, o: 1, h: 1, l: 1, c: 1, v: 1 }, { t: 30, o: 3, h: 3, l: 3, c: 3, v: 3 }, { t: 50, o: 5, h: 5, l: 5, c: 5, v: 5 }], gr = [...g, { t: 20, o: 2, h: 2, l: 2, c: 2, v: 2 }, { t: 40, o: 4, h: 4, l: 4, c: 4, v: 4 }]
    const dg = diffRevisions(g, gr); assert.deepEqual(dg.absent.map((x) => x.t), [20, 40]); fs.writeFileSync(F, g.map((b) => JSON.stringify(b)).join('\n') + '\n')
    assert.equal(await applyRevisions(F, dg.revised, dg.absent), 2); assert.deepEqual(fs.readFileSync(F, 'utf8').trim().split('\n').map((l) => JSON.parse(l).t), [10, 20, 30, 40, 50])
    fs.rmSync(dir, { recursive: true, force: true })
    const rf = fs.readFileSync(path.join(here, 'record_futures.mjs'), 'utf8'); assert(/diffRevisions\(mine, rest\)/.test(rf) && /6 \* 3600000/.test(rf) && /recorder_revisions\.jsonl/.test(rf))
    assert(/asset === 'GLD' \? d\.absent\.filter\(\(x\) => x\.t \+ 60000 <= now - FINAL_MS\)/.test(rf) && /late_minute_inserted/.test(rf), 'late GLD minutes inserted (final only) and logged')
    n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log(failed ? `✗ RECORDER SMOKE: ${n} passed, ${failed} failed` : `✅ RECORDER SMOKE: ${n} passed, 0 failed`)
