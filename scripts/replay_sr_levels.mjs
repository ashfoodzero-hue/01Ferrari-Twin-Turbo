// ════════════════════════════════════════════════════════════════════════════════
// replay_sr_levels.mjs <SYM> [days=90] [step_hours=6] — PROOF of the live S/R levels (2026-10-18): at every step over the last `days`, the live code
// (scripts/lib/sr_live.mjs srLevelsAt) on the history AVAILABLE THEN must equal the full-history truth cut at that time, for every timeframe:
//   same levels (id, price, birth) — none missing, none extra · same resolved tests (time, held / broke, phase) · same flips · same retirements ·
//   an open (pending) test live ⇔ a test at the same candle in the truth that is resolved later.
// Any difference = look-ahead or a live/study mismatch. Writes data/master/sr_live_replay_<short>.json.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { SR_TFS } from '../src/master/srLevels.js'
import { closedCandles, srLevelsAt } from './lib/sr_live.mjs'

const SYM = process.argv[2] || 'XAUUSD', DAYS = +(process.argv[3] || 90), STEP = +(process.argv[4] || 6) * 3600000
const K = kit(SYM), M = await clean1m(SYM), holes = findHoles(M), CF = {}
for (const tf of SR_TFS) { CF[tf] = K.build(M, tf); markIncomplete(CF[tf], holes) }
const END = M.at(-1).t + 60000, truth = srLevelsAt(SYM, closedCandles(SYM, null, END + 40 * 86400000, { candles: CF }))
const T = Object.fromEntries(SR_TFS.map((tf) => [tf, new Map(truth.tf[tf].levels.map((l) => [l.id, l]))]))
let steps = 0, compared = 0; const diffs = []
for (let now = END - DAYS * 86400000; now <= END; now += STEP) { steps++
  const live = srLevelsAt(SYM, closedCandles(SYM, null, now, { candles: CF }))
  for (const tf of SR_TFS) { const Lt = live.tf[tf]; if (!Lt.last_closed) continue
    const lastCloseT = CF[tf].find((c) => c.t === Lt.last_closed).close_t, ids = new Set(Lt.levels.map((l) => l.id))
    for (const [id, t] of T[tf]) if (t.born <= lastCloseT && !ids.has(id)) diffs.push({ now, tf, id, why: 'missing live' })
    for (const l of Lt.levels) { compared++; const t = T[tf].get(id = l.id); var id
      if (!t) { diffs.push({ now, tf, id, why: 'extra live (not in truth)' }); continue }
      if (t.px !== l.px || t.born !== l.born) { diffs.push({ now, tf, id, why: 'price / birth differ' }); continue }
      const res = (arr) => JSON.stringify(arr.filter((x) => x[1] !== 'open' && x[3] != null && x[3] <= lastCloseT).map((x) => [x[0], x[1], x[2]]))
      if (res(l.touches) !== res(t.touches)) { diffs.push({ now, tf, id, why: 'resolved tests differ', live: res(l.touches).slice(0, 120), truth: res(t.touches).slice(0, 120) }); continue }
      const fl = (arr) => JSON.stringify(arr.filter((x) => x <= lastCloseT))
      if (fl(l.flips) !== fl(t.flips)) { diffs.push({ now, tf, id, why: 'flips differ' }); continue }
      if ((l.end === 'retired') !== (t.end === 'retired' && t.ended <= lastCloseT)) { diffs.push({ now, tf, id, why: 'retirement differs' }); continue }
      if (l.pending != null) { const tt = t.touches.find((x) => x[0] === l.pending); if (!tt || (tt[3] != null && tt[3] <= lastCloseT)) diffs.push({ now, tf, id, why: 'pending test not pending in truth' }) } } } }
const res = { at: new Date().toISOString(), symbol: SYM, days: DAYS, step_hours: STEP / 3600000, steps, level_states_compared: compared, differences: diffs.length, first: diffs.slice(0, 10) }
fs.writeFileSync(path.join(TURBO.master, `sr_live_replay_${SHORT[SYM]}.json`), JSON.stringify(res, null, 1))
console.log(`  S/R live replay ${SYM} ${DAYS} d every ${STEP / 3600000} h: ${steps} steps · ${compared} level states compared · DIFFERENCES ${diffs.length}`)
for (const d of diffs.slice(0, 5)) console.log('   ', JSON.stringify(d))
process.exit(diffs.length ? 1 : 0)
