// diagnose_level_fade_gap.mjs — WHY is the study's fade population positive (+$0.317/t money path) while every live-feasible order rule
// is negative (rule 1 −$1.49, rule 2 refresh −$0.97)? MEASURE (2026-10-08): resolve both on the IDENTICAL money path, join trades on
// (side, level ±$0.01, fill 15m bar), and price the matched / study-only / sim-only parts. Legacy radar on both sides (the study's).
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { buildRadar, decisionAt, ordersToPlace, closedH4Count, RADAR } from '../src/master/levelRadar.js'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollarsBidAsk } from '../src/master/execution.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'

const M15 = 900000, VAL_TO = Date.parse('2026-10-08T15:45:00Z')
const bars = (await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
const m1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO + M15 })).bars
const subBarsOf = makeSubBarIndex(m1), idxByT = new Map(bars.map((b, k) => [b.t, k])), spreadAt = makeSpreadAt()
const resolve = (dir, level, stop, tgt, sigIdx, fillWindow) => { const up = dir === 'UP'; const plan = { entry: level, sl: up ? level - stop : level + stop, tp: up ? level + tgt : level - tgt }
  return resolveManagedLimitSeq({ direction: dir, plan, ts_utc: new Date(bars[sigIdx].t).toISOString() }, bars, idxByT, subBarsOf, { fillWindow, horizon: 96, beTriggerR: 0, beLockR: 0, tfMs: M15, lockMode: 'level', spreadAt, seqAll: true }) }
const tradeOf = (src, side, level, stop, atr4, sigIdx, r, extra = {}) => ({ src, side, level, fillIdx: sigIdx + r.fill_bars, outcome: r.outcome, net: netDollarsBidAsk({ grossMove: r.grossMove, atr: atr4 / 4, exitType: r.exitType }), R: null, stop, ...extra })

// A — the STUDY population exactly as validate_level_radar_seq resolves it (signal bar = the 15m bar STARTING at the decision)
const cands = fs.readFileSync(path.join(TURBO.master, 'level_radar_fade_candidates.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const A = []
for (const c of cands) { const i = idxByT.get(Math.floor(c.decisionT / M15) * M15); if (i == null || c.decisionT > VAL_TO) continue
  const r = resolve(c.dir, c.level, c.stop, c.tgt, i, 96); if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') continue
  A.push(tradeOf('study', c.side, c.level, c.stop, c.atr4, i, r, { decisionT: c.decisionT, label: c.comp })) }
// B — rule 2 (refresh) on the LEGACY radar (same levels the study saw), signal bar = the last bar of the 4H bucket
const R = buildRadar(bars, { legacy: true }), nH4 = closedH4Count(R, VAL_TO + M15), busy = { R: -Infinity, S: -Infinity }, B = []
for (let i = RADAR.minH4; i < nH4; i++) { const dec = decisionAt(R, i); if (!dec) continue
  for (const o of ordersToPlace(dec, busy)) { const i15 = idxByT.get(dec.decisionT - M15); if (i15 == null) continue
    const r = resolve(o.dir, o.level, o.stop, o.tgt, i15, 16); if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') continue
    busy[o.side] = bars[Math.min(bars.length - 1, i15 + r.fill_bars + r.resolve_bars)].t + M15 - 1
    B.push(tradeOf('sim', o.side, o.level, o.stop, o.atr4, i15, r, { decisionT: dec.decisionT, label: o.label })) } }
// join
const key = (x) => `${x.side}|${x.fillIdx}`
const mapB = new Map(); for (const x of B) (mapB.get(key(x)) ?? mapB.set(key(x), []).get(key(x))).push(x)
const matched = [], aOnly = []; const usedB = new Set()
for (const a of A) { const cand = (mapB.get(key(a)) || []).find((b) => !usedB.has(b) && Math.abs(b.level - a.level) <= 0.01); if (cand) { usedB.add(cand); matched.push([a, cand]) } else aOnly.push(a) }
const bOnly = B.filter((b) => !usedB.has(b))
const st = (xs) => ({ n: xs.length, net: xs.length ? +(xs.reduce((s, x) => s + x.net, 0) / xs.length).toFixed(4) : null, wr: (() => { const W = xs.filter((x) => x.outcome === 'WIN').length, L = xs.filter((x) => x.outcome === 'LOSS').length; return W + L ? +(W / (W + L)).toFixed(4) : null })() })
const sameOutcome = matched.filter(([a, b]) => a.outcome === b.outcome && Math.abs(a.net - b.net) < 0.005).length
// what distinguishes study-only trades? lead time (decision → fill) and how many decisions re-emitted the same level
const lead = (x) => x.fillIdx - idxByT.get(Math.floor(x.decisionT / M15) * M15 - (x.src === 'sim' ? M15 : 0))
const out = { A: st(A), B: st(B), matched: { n: matched.length, study: st(matched.map((m) => m[0])), sim: st(matched.map((m) => m[1])), identical_outcome: sameOutcome },
  study_only: { ...st(aOnly), median_lead_bars: aOnly.map(lead).sort((p, q) => p - q)[Math.floor(aOnly.length / 2)] }, sim_only: { ...st(bOnly), median_lead_bars: bOnly.map(lead).sort((p, q) => p - q)[Math.floor(bOnly.length / 2)] } }
fs.writeFileSync(path.join(TURBO.master, 'diagnose_level_fade_gap.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1))

// ── WHY did the study skip the sim-only fills? Replay the study's own per-decision logic for a sample of them ──
{
  const studyByDecSide = new Map(); for (const c of cands) studyByDecSide.set(`${c.decisionT}|${c.side}`, c)
  const reasons = { study_has_candidate_same_decision: 0, study_candidate_other_level: 0, no_study_candidate_at_decision: 0 }
  const ex = []
  for (const b of bOnly) {
    const c = studyByDecSide.get(`${b.decisionT}|${b.side}`)
    if (!c) { reasons.no_study_candidate_at_decision++; if (ex.length < 6) ex.push({ dec: new Date(b.decisionT).toISOString().slice(0, 16), side: b.side, level: +b.level.toFixed(2), fill: new Date(bars[b.fillIdx].t).toISOString().slice(0, 16), outcome: b.outcome, net: b.net }) }
    else if (Math.abs(c.level - b.level) > 0.01) reasons.study_candidate_other_level++
    else reasons.study_has_candidate_same_decision++
  }
  console.log('sim-only by reason:', JSON.stringify(reasons)); console.log('examples (no study candidate at that decision):', JSON.stringify(ex, null, 1))
  // the study's lane: was the side blocked by an earlier STUDY trade's 15m-resolved life at the sim fill?
  const studyLanes = { R: [], S: [] }; for (const c of cands) studyLanes[c.side].push(c)
  let blockedByStudyLane = 0, checked = 0
  for (const b of bOnly) { if (studyByDecSide.get(`${b.decisionT}|${b.side}`)) continue; checked++
    const prev = studyLanes[b.side].filter((c) => c.fillBarT < bars[b.fillIdx].t).at(-1)
    if (prev && prev.fillBarT >= bars[b.fillIdx].t - 96 * M15) blockedByStudyLane++ }
  console.log(`of ${checked} sim-only fills with no study candidate at their decision: ${blockedByStudyLane} fall within 24h after an earlier study fill on the same side`)
}
