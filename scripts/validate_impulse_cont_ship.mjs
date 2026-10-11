// ════════════════════════════════════════════════════════════════════════════════
// validate_impulse_cont_ship.mjs — ship-grade artifact for the IMPULSE_CONT book (2026-08-12).
// ────────────────────────────────────────────────────────────────────────────────
// ORIGIN: Ashraf, watching the 16:30Z fall from 4426: "I do not want to miss such a good trade if it meets our
// WR." Gate (measure_impulse_continuation.mjs → impulse_continuation_gate.json): ALL-HOURS variant — impulse
// |8-bar move| ≥ 4×ATR14, direction-matched A+/trend_pullback setups, shipped managed geometry — OOS 92.20% WR
// (LB 90.03, n=731 dec) · $1.525/t · 111.5/yr · SELL side 95.1%. Folds 7/7 POWERED pass; fold 0 (2003-06)
// QUARANTINED as unpowered (dec 19 < 30, numbers positive) per the test-power iron rule — stated, never hidden.
// THIS script adds the ship-grade layer the gate lacks: bootstrap CI (seed 12345, 2000), era split, avg_risk,
// outcomes breakdown — the full audit schema, written to impulse_cont_ship.json#shipped for TIER_STATS.
// Usage: node --max-old-space-size=8192 scripts/validate_impulse_cont_ship.mjs
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, REF, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own 1m tape from 2013-07-14, own candidates
import { sessionOf } from '../src/agents/microstructure/marketRegime.js'
import { resolveManagedLimit } from '../src/core/outcomeResolver.js'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollars, netDollarsBidAsk } from '../src/master/execution.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { buildRegimeSpannedFolds, assignFold } from '../src/core/regimeSplitter.js'
import { seqPowerBlock, printSeqPower } from './lib/seq_power.mjs'

const GEO = { slAtr: 1.5, tgtR: 0.5, beR: 0.05, beLockR: 0.10 }
const SETUP = new Set(['sweep_reclaim', 'fvg_continuation', 'ob_discount_tap', 'trend_pullback'])
const IMPULSE = { lookBars: 8, minAtrMult: 4 }
const FOLDS = 8, TRAIN_FOLDS = 5
// TURBO_SEQ_GATE=1 (2026-08-14 fill-bar sequence audit): resolve with the 1m-SEQUENCED resolver and write to
// impulse_cont_seq1m_gate.json (never the ship artifact) — selection logic identical by construction.
const SEQ = process.env.TURBO_SEQ_GATE === '1'
// TURBO_BIDASK=1 (twin 2026-10-08): bars are BID — ask-side orders clear the MEASURED Polygon spread (spreadModel.js) inside the
// resolver, and the cost is stop/time slippage only (execution.netDollarsBidAsk). Requires the sequenced resolver.
const BIDASK = process.env.TURBO_BIDASK === '1'
if (BIDASK && !SEQ) throw new Error('TURBO_BIDASK=1 requires TURBO_SEQ_GATE=1')
const spreadAt = BIDASK ? makeSpreadAt() : null
// TURBO_SEQ_ALL=1: every bar after the fill replayed on 1m (the live trial's rule — paper ≡ resolver, property-tested). TURBO_LOCK_MODE=traded:
// the EA's / paper trial's BE-lock semantics. Together with TURBO_BIDASK=1 this is the MONEY PATH: the backtest scored exactly as the trial pays.
const SEQ_ALL = process.env.TURBO_SEQ_ALL === '1', LOCK_MODE = process.env.TURBO_LOCK_MODE || 'level'

// CHECK SEAMS (2026-09-09): TURBO_VAL_TO=<iso> truncates the tape (a no-drift re-check must see the SAME bars the frozen
// artifact saw — the tape grows daily and fold edges move with it); TURBO_VAL_OUT redirects the output so a check never
// overwrites the shipped file TIER_STATS cites. Selection and resolution are untouched.
const VAL_TO = process.env.TURBO_VAL_TO ? Date.parse(process.env.TURBO_VAL_TO) : undefined
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })
const idxByT = new Map(bars.map((b, k) => [b.t, k]))
const m1 = SEQ ? (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO })).bars : null
const subBarsOf = SEQ ? makeSubBarIndex(m1) : null
const resolveTrade = (sig, opts) => SEQ ? resolveManagedLimitSeq(sig, bars, idxByT, subBarsOf, { ...opts, tfMs: 900000, spreadAt, seqAll: SEQ_ALL, lockMode: LOCK_MODE }) : resolveManagedLimit(sig, bars, idxByT, opts)
const cands = fs.readFileSync(path.join(TURBO.master, 'candidates_15m_full.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const { folds } = buildRegimeSpannedFolds(bars, { folds: FOLDS })
const YRS = (bars.at(-1).t - bars[0].t) / (365.25 * 864e5)
const mean = (a, k) => a.length ? a.reduce((s, x) => s + (k ? x[k] : x), 0) / a.length : 0

console.log('\n████ IMPULSE_CONT SHIP VALIDATION — all-hours impulse continuation, full audit schema ████\n')
const fires = []; const nextFree = new Array(FOLDS).fill(-1)   // 2026-09-09: count the candidates the resolver refused (NOFILL/NOTRADE) — report-only, so the trial's no-fill share has a backtest reference
let candCount = 0, nofillCount = 0, notradeCount = 0
for (const c of cands) {
  if (c.atr <= 0 || !SETUP.has(c.setup) || c.i == null || c.i < IMPULSE.lookBars + 1) continue
  const fold = assignFold(folds, c.i); if (fold < 0) continue
  const move = bars[c.i].c - bars[c.i - IMPULSE.lookBars].c
  if (Math.abs(move) < IMPULSE.minAtrMult * c.atr) continue
  if ((move > 0) !== (c.direction === 'UP')) continue
  if (c.i < nextFree[fold]) continue
  const up = c.direction === 'UP', risk = GEO.slAtr * c.atr
  const plan = { entry: c.entry, sl: up ? c.entry - risk : c.entry + risk, tp: up ? c.entry + GEO.tgtR * risk : c.entry - GEO.tgtR * risk }
  const r = resolveTrade({ direction: c.direction, plan, ts_utc: new Date(c.t).toISOString() }, { fillWindow: 8, horizon: 64, beTriggerR: GEO.beR, beLockR: GEO.beLockR })
  candCount++; if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') { if (r.outcome === 'NOFILL') nofillCount++; else notradeCount++; continue }
  nextFree[fold] = c.i + (r.fill_bars || 0) + (r.resolve_bars || 0) + 1
  const net = BIDASK ? netDollarsBidAsk({ grossMove: r.grossMove, atr: c.atr, exitType: r.exitType }) : netDollars({ grossMove: r.grossMove, entryHourUtc: r.entryHourUtc, atr: c.atr, exitType: r.exitType })
  fires.push({ fold, outcome: r.outcome, net, riskUsd: risk, R: net / risk, t: c.t, seq: r.seq })
}
const oos = fires.filter((x) => x.fold >= TRAIN_FOLDS), tr = fires.filter((x) => x.fold < TRAIN_FOLDS)
const W = oos.filter((x) => x.outcome === 'WIN').length, L = oos.filter((x) => x.outcome === 'LOSS').length, S = oos.filter((x) => x.outcome === 'SCRATCH').length
const dec = W + L, wr = dec ? W / dec : 0, lb = wilsonLowerBound(W, dec)
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const boots = []; for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < oos.length; i++) s += oos[(rnd() * oos.length) | 0].net; boots.push(s / oos.length) }
boots.sort((a, b) => a - b)
const eA = fires.filter((x) => new Date(x.t).getUTCFullYear() < 2020), eB = fires.filter((x) => new Date(x.t).getUTCFullYear() >= 2020)

const out = { at: new Date().toISOString(),
  config: 'IMPULSE_CONT|8bar≥4×ATR direction-matched|A+ setups + trend_pullback|ALL-HOURS|sl1.5|tp0.5R|beT0.05|beL0.10 (pre-registered — gate: impulse_continuation_gate.json)',
  fold_caveat: 'fold 0 (2003-06) UNPOWERED (dec 19 < 30, WR 94.7% positive) — quarantined per the test-power rule; 7/7 powered folds pass',
  shipped: { wr: +wr.toFixed(4), lb: +lb.toFixed(4), n: dec, managed: true,
    net_per_trade_oos: +mean(oos, 'net').toFixed(4), net_per_trade_train: +mean(tr, 'net').toFixed(4),
    net_per_trade_lb: +boots[50].toFixed(4), net_per_trade_ub: +boots[1949].toFixed(4), bootstrap: { resamples: 2000, seed: 12345 },
    outcomes_oos: { n: oos.length, win: W, scratch: S, loss: L, p_win: +(W / oos.length).toFixed(4), p_scratch: +(S / oos.length).toFixed(4), p_loss: +(L / oos.length).toFixed(4) },
    avg_risk: +mean(oos, 'riskUsd').toFixed(2), per_day: +(fires.length / YRS / 365).toFixed(4), per_year: +(fires.length / YRS).toFixed(1),
    geometry: { sl_atr: 1.5, tgt_r: 0.5, be_trigger_r: 0.05, be_lock_r: 0.10, rr: 0.5 },
    era_r: { pre2020: +mean(eA, 'R').toFixed(4), post2020: +mean(eB, 'R').toFixed(4) },
    fills: { candidates_admitted: candCount, filled: fires.length, nofill: nofillCount, notrade: notradeCount, fill_share: +(candCount ? fires.length / candCount : 0).toFixed(4), note: 'candidates that passed the impulse filter and the one-at-a-time rule; NOFILL = the maker limit never filled inside the 8-bar window (the trial journals these as EXPIRED)' }, tradeable: true },
  source_scripts: ['measure_impulse_continuation.mjs (gate)', 'validate_impulse_cont_ship.mjs (this)'] }
const outFile = process.env.TURBO_VAL_OUT || (SEQ ? 'impulse_cont_seq1m_gate.json' : 'impulse_cont_ship.json')
out.resolution = { seq_all: SEQ_ALL, lock_mode: LOCK_MODE, bid_ask: BIDASK }
if (BIDASK) out.bid_ask = { spread: 'measured — data/master/spread_table.json', lookups: spreadAt.stats, cost: 'stop/time slippage only (spread inside the fills)' }
if (SEQ) { out.seq_gate = true; out.sequenced_share = +(fires.filter((x) => x.seq === 'seq').length / fires.length).toFixed(4); out.shipped.tradeable = undefined
  // the train figure above spans 2003→2017 where only 2013+ is sequenced ⇒ biased DOWN. Re-measure on the
  // sequenced era only, with power attached, and classify against the pre-registered criteria.
  out.seq_power = seqPowerBlock({ fires, trainPred: (f) => f.fold < TRAIN_FOLDS, m1Start: m1[0].t, folds: FOLDS, ciLb: boots[50] })
  printSeqPower('IMPULSE_CONT', out.seq_power) }
fs.writeFileSync(path.join(TURBO.master, outFile), JSON.stringify(out, null, 2))
console.log(`${SEQ ? '[SEQ-GATE] ' : ''}fires ${fires.length} (${(fires.length / YRS).toFixed(1)}/yr) · OOS n=${oos.length} dec=${dec} WR ${(100 * wr).toFixed(2)}% (LB ${(100 * lb).toFixed(2)})`)
console.log(`$/t OOS ${mean(oos, 'net').toFixed(4)} CI[${boots[50].toFixed(4)},${boots[1949].toFixed(4)}] · TRAIN ${mean(tr, 'net').toFixed(4)} · eras R ${mean(eA, 'R').toFixed(4)}/${mean(eB, 'R').toFixed(4)} · avg_risk $${mean(oos, 'riskUsd').toFixed(2)}`)
console.log(`wrote data/master/${outFile}\n`)
