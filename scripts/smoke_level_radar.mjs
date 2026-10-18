// smoke_level_radar.mjs — the Level Radar module (src/master/levelRadar.js, 2026-10-08):
//   (1) FAITHFUL EXTRACTION — in legacy mode it reproduces EVERY fade candidate of the study (level, ATR, stop, target, label);
//   (2) CAUSALITY — in the default (causal) mode no pivot is usable before its confirming bar has CLOSED and the daily context never
//       reads a day that has not ended; the legacy mode is shown to violate exactly that (the look-ahead the audit found);
//   (3) TRUNCATION INVARIANCE — a causal decision is identical whether the tape ends at the decision or months later.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { buildRadar, decisionAt, RADAR } from '../src/master/levelRadar.js'
// The study's frozen candidates were computed on Polygon's RAW stamps, before the 2026-10-18 sourceQuirks fix. MEASURED: raw stamps → all 9,124
// reproduce; fixed stamps → 166 differ (2020-11 → 2021-06, all through levels formed in the corrected weeks). The check certifies the CODE on the
// tape the study used, so it replays the raw stamps (MASTER_DOCUMENT §7 (cl)).
process.env.TWIN_RAW_POLYGON_TIMES = '1'

let n = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ LEVEL RADAR MODULE SMOKE ██')
const cands = fs.readFileSync(path.join(TURBO.master, 'level_radar_fade_candidates.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const m15 = (await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })).bars
const L = buildRadar(m15, { legacy: true }), C = buildRadar(m15)
const idxOfT = new Map(L.H4.map((b, i) => [b.t + 4 * 3600000, i]))
ok(`FAITHFUL: legacy mode reproduces all ${cands.length.toLocaleString()} study fade candidates (level · atr4 · stop · tgt · towards|strength|dist)`, () => {
  let bad = 0; const ex = []
  for (const c of cands) {
    const i = idxOfT.get(c.decisionT); const d = i == null ? null : decisionAt(L, i); const o = d?.orders.find((x) => x.side === c.side)
    const want = c.comp.split('|touch')[0]
    const same = o && Math.abs(o.level - c.level) < 0.0006 && Math.abs(o.atr4 - c.atr4) < 0.00006 && Math.abs(o.stop - c.stop) < 0.00006 && Math.abs(o.tgt - c.tgt) < 0.00006 && o.label === want && o.dir === c.dir
    if (!same) { bad++; if (ex.length < 3) ex.push({ c, o }) }
  }
  assert.equal(bad, 0, `${bad} mismatches e.g. ${JSON.stringify(ex).slice(0, 400)}`)
})
ok('CAUSAL pivots: every pivot is usable only after its confirming bar CLOSED (confirmT = bar i+k close); legacy is earlier by exactly one bar', () => {
  const byKey = new Map(L.PV.map((p) => [`${p.tf}|${p.t}|${p.kind}`, p]))
  for (const p of C.PV) { const q = byKey.get(`${p.tf}|${p.t}|${p.kind}`); const tfMs = p.tf === '1d' ? 86400000 : 14400000; assert.equal(p.confirmT - q.confirmT, tfMs); assert(p.confirmT >= p.t + (RADAR.k + 1) * tfMs) }
})
ok('CAUSAL daily context: the day read at a decision has ENDED by the decision (legacy reads the day still in progress)', () => {
  let legacyFuture = 0
  for (let i = 100; i < C.H4.length; i += 7) { const t = C.H4[i].t + 4 * 3600000 - 1; const dc = C.dayIdxAt(t), dl = L.dayIdxAt(t); if (dc >= 0) assert(C.D1[dc].t + 86400000 <= t + 1, 'causal day not ended'); if (L.D1[dl].t + 86400000 > t + 1) legacyFuture++ }
  assert(legacyFuture > 0, 'the legacy mode should read an unfinished day at intraday decisions')
})
ok('TRUNCATION INVARIANCE (causal): 40 decisions are identical on the full tape and on a tape cut at the decision', () => {
  const picks = []; for (let i = 400; i < C.H4.length - 50 && picks.length < 40; i += Math.floor((C.H4.length - 450) / 40)) picks.push(i)
  for (const i of picks) {
    const t = C.H4[i].t + 4 * 3600000; const cut = buildRadar(m15.filter((b) => b.t < t)); const j = cut.H4.length - 1
    assert.equal(cut.H4[j].t, C.H4[i].t)
    assert.deepEqual(JSON.stringify(decisionAt(cut, j)), JSON.stringify(decisionAt(C, i)), 'decision at ' + new Date(t).toISOString())
  }
})
ok('LEGACY is NOT truncation-invariant (the look-ahead, measured): at least one decision changes when the future is cut away', () => {
  let changed = 0
  for (let i = 400; i < L.H4.length - 50 && changed === 0; i += 97) { const t = L.H4[i].t + 4 * 3600000; const cut = buildRadar(m15.filter((b) => b.t < t), { legacy: true }); if (JSON.stringify(decisionAt(cut, cut.H4.length - 1)) !== JSON.stringify(decisionAt(L, i))) changed++ }
  assert(changed > 0)
})
console.log(process.exitCode ? '✗ LEVEL RADAR SMOKE FAILED' : `✅ LEVEL RADAR SMOKE: ${n} passed, 0 failed`)
