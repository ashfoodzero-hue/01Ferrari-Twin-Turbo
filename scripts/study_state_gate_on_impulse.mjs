// study_state_gate_on_impulse.mjs — Method D for the MARKET-STATE GATE on the IMPULSE_CONT book (2026-10-08).
// Turbo2's live path refuses an IMPULSE_CONT fire whose side disagrees with readMarketState() (20 of 42 journal rows),
// but the book's validator never applied that read. This measures it, on the validator's own loop (same candidate
// cache, same 1m-sequenced resolver, same one-at-a-time rule applied INSIDE each arm, same folds, same costs):
//   ALL      — the book as validated (no state read)
//   ALLOWED  — fires whose side the state at the SIGNAL BAR allows        (= Turbo2 live behaviour, mode 'block')
//   VETOED   — the fires the gate removes, resolved as if taken          (what the gate costs or saves)
// Verdict rule (pre-registered): the gate KEEPS money if VETOED net/t ≤ 0 at the bootstrap UB (removing losers);
// it COSTS money if VETOED net/t > 0 at the bootstrap LB (removing winners); otherwise UNPOWERED → keep Turbo2's live
// behaviour ('block') because changing a live rule on an unpowered read is a guess. TRAIN and OOS reported separately.
// Output: data/master/state_gate_on_impulse.json. ~2 min, 8 GB heap. RESEARCH ONLY — writes no production file.
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, REF, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own 1m tape from 2013-07-14, own candidates
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollars } from '../src/master/execution.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { buildRegimeSpannedFolds, assignFold } from '../src/core/regimeSplitter.js'
import { readMarketState, stateAllows } from '../src/master/marketState.js'
import { TIER_STATS, isImpulseCandidate } from '../src/master/twinRoster.js'

const P = TIER_STATS.IMPULSE_CONT
const FOLDS = 8, TRAIN_FOLDS = 5
const VAL_TO = process.env.TURBO_VAL_TO ? Date.parse(process.env.TURBO_VAL_TO) : undefined
console.log('\n████ STATE GATE on IMPULSE_CONT — Method D (validator loop, 1m-sequenced, per-arm one-at-a-time) ████')
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })
const idxByT = new Map(bars.map((b, k) => [b.t, k]))
const m1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO })).bars
const subBarsOf = makeSubBarIndex(m1)
const cands = fs.readFileSync(path.join(TURBO.master, 'candidates_15m_full.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const { folds } = buildRegimeSpannedFolds(bars, { folds: FOLDS })
console.log(`15m ${bars.length} · 1m ${m1.length} · candidates ${cands.length}`)

const ARMS = ['ALL', 'ALLOWED', 'VETOED']
const nextFree = Object.fromEntries(ARMS.map((a) => [a, new Array(FOLDS).fill(-1)]))
const fires = Object.fromEntries(ARMS.map((a) => [a, []]))
const whyCount = {}
let admitted = 0
const resolveOne = (c) => {
  const up = c.direction === 'UP', risk = P.slAtr * c.atr
  const plan = { entry: c.entry, sl: up ? c.entry - risk : c.entry + risk, tp: up ? c.entry + P.tgtR * risk : c.entry - P.tgtR * risk }
  const r = resolveManagedLimitSeq({ direction: c.direction, plan, ts_utc: new Date(c.t).toISOString() }, bars, idxByT, subBarsOf, { fillWindow: 8, horizon: 64, beTriggerR: P.beTriggerR, beLockR: P.beLockR, tfMs: 900000 })
  if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') return null
  const net = netDollars({ grossMove: r.grossMove, entryHourUtc: r.entryHourUtc, atr: c.atr, exitType: r.exitType })
  return { outcome: r.outcome, net, riskUsd: risk, R: net / risk, t: c.t, span: (r.fill_bars || 0) + (r.resolve_bars || 0) + 1 }
}
for (const c of cands) {
  if (!isImpulseCandidate(bars, c)) continue
  const fold = assignFold(folds, c.i); if (fold < 0) continue
  admitted++
  // the state at the SIGNAL BAR (the recorder fires on the first tick that sees the candidate): same reader, same window
  const st = readMarketState(bars.slice(Math.max(0, c.i - 400), c.i + 1))
  const g = stateAllows({ side: c.direction === 'UP' ? 'BUY' : 'SELL' }, st)
  const arm = g.allow ? 'ALLOWED' : 'VETOED'
  if (!g.allow) whyCount[g.why] = (whyCount[g.why] || 0) + 1
  let res = null, resolved = false
  for (const a of ['ALL', arm]) {
    if (c.i < nextFree[a][fold]) continue
    if (!resolved) { res = resolveOne(c); resolved = true }
    if (!res) continue
    nextFree[a][fold] = c.i + res.span
    fires[a].push({ ...res, fold, why: g.allow ? null : g.why, state: st.state })
  }
}
const mean = (a, k) => a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : 0
const boot = (xs, seed = 12345) => { if (!xs.length) return [0, 0]; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }; const b = []; for (let k = 0; k < 2000; k++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[(rnd() * xs.length) | 0].net; b.push(s / xs.length) } b.sort((x, y) => x - y); return [b[50], b[1949]] }
const stat = (xs) => { const W = xs.filter((x) => x.outcome === 'WIN').length, L = xs.filter((x) => x.outcome === 'LOSS').length, S = xs.length - W - L; const [lb, ub] = boot(xs)
  const years = {}; for (const x of xs) { const y = new Date(x.t).getUTCFullYear(); years[y] = (years[y] || 0) + x.net }
  return { n: xs.length, win: W, scratch: S, loss: L, wr: +(W / Math.max(1, W + L)).toFixed(4), wilson_lb: +wilsonLowerBound(W, Math.max(1, W + L)).toFixed(4), net: +mean(xs, 'net').toFixed(4), net_lb: +lb.toFixed(4), net_ub: +ub.toFixed(4), avgR: +mean(xs, 'R').toFixed(4), sum: +xs.reduce((s, x) => s + x.net, 0).toFixed(2), years_pos: Object.values(years).filter((v) => v > 0).length, years: Object.keys(years).length } }
const out = { at: new Date().toISOString(), admitted, arms: {}, veto_reasons: whyCount, by_reason: {} }
for (const a of ARMS) { const xs = fires[a]; out.arms[a] = { all: stat(xs), oos: stat(xs.filter((x) => x.fold >= TRAIN_FOLDS)), train: stat(xs.filter((x) => x.fold < TRAIN_FOLDS)), seq_era: stat(xs.filter((x) => x.t >= m1[0].t)) } }
for (const why of Object.keys(whyCount)) out.by_reason[why] = stat(fires.VETOED.filter((x) => x.why === why))
const v = out.arms.VETOED.seq_era, vo = out.arms.VETOED.oos
out.verdict = v.n < 30 ? 'UNPOWERED (fewer than 30 vetoed fires in the sequenced era)'
  : v.net_ub <= 0 && vo.net_ub <= 0 ? 'GATE KEEPS MONEY — the vetoed fires lose (UB ≤ 0 in the sequenced era AND OOS) → mode block'
  : v.net_lb > 0 && vo.net_lb > 0 ? 'GATE COSTS MONEY — the vetoed fires WIN (LB > 0 in the sequenced era AND OOS) → mode stamp'
  : 'UNPOWERED — the vetoed arm straddles zero; keep Turbo2 live behaviour (block) and let the journal score it'
out.rule = 'pre-registered: block if VETOED net UB ≤ 0; stamp if VETOED net LB > 0; otherwise unpowered → block (no live rule changes on a guess)'
const OUT = path.join(TURBO.master, 'state_gate_on_impulse.json')
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
for (const a of ARMS) for (const w of ['all', 'seq_era', 'oos', 'train']) { const s = out.arms[a][w]; console.log(`${a.padEnd(8)} ${w.padEnd(8)} n=${String(s.n).padStart(5)} WR ${s.wr} (LB ${s.wilson_lb}) net $${s.net}/t [${s.net_lb}, ${s.net_ub}] avgR ${s.avgR} Σ$${s.sum} years+ ${s.years_pos}/${s.years}`) }
console.log('veto reasons:', JSON.stringify(whyCount)); for (const [w, s] of Object.entries(out.by_reason)) console.log(`  ${w.padEnd(44)} n=${s.n} net $${s.net}/t [${s.net_lb}, ${s.net_ub}]`)
console.log('VERDICT: ' + out.verdict + '\n-> ' + OUT)
