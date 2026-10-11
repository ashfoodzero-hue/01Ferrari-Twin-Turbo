// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// study_be_lock_semantics.mjs — the shipped IMPULSE_CONT numbers under the MONEY PATH's real break-even semantics (2026-09-14)
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ORIGIN: live IMPULSE_CONT@1789378200000 (09-14 SELL 4289.32, filled 10:18Z, armed 10:19Z, next minute opened 1.83 beyond
// the lock). The shipped geometry arms at +0.05R and LOCKS at +0.10R — the lock is deeper in profit than the trigger, so
// at the moment of arming the "stop" sits beyond the price. Three producers disagree on what such a trade pays:
//   validator (seqResolver 'level')  +0.10R  — pays the lock the first bar the adverse side "reaches" it (h ≥ level is
//                                              true while price sits above it — the market need never have traded there)
//   paper trader                     next 1m open — charges a "gap" through a stop that could not rest
//   the EA (FerrariTurbo2.mq5)       MT5 rejects a SELL SL below the ask / a BUY SL above the bid; RegisterBE retries every
//                                    tick, so the lock RESTS only after the market trades through it = 'traded'
// Scratches are 73% of the OOS trades and their +0.10R is most of the gross edge, so the question is decision-relevant:
// what does the frozen OOS set pay under 'traded' (the EA) and under 'arm' (a close-at-market EA)?
// METHOD: the validator's selection loop, verbatim, on the frozen tape (TURBO_VAL_TO = the artifact's own stamp), the
// 1m-sequenced resolver in each lockMode. 'level' MUST reproduce the frozen artifact exactly (parity gate) or the study
// is void. Report-only: writes data/master/study_be_lock_semantics.json; never touches the shipped artifacts.
// Usage: node --max-old-space-size=8192 scripts/study_be_lock_semantics.mjs
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, REF, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own 1m tape from 2013-07-14, own candidates
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollars, COST_MODEL } from '../src/master/execution.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { buildRegimeSpannedFolds, assignFold } from '../src/core/regimeSplitter.js'
import { exitWhenDrained } from '../src/core/childExit.js'

const GEO = { slAtr: 1.5, tgtR: 0.5, beR: 0.05, beLockR: 0.10 }
const SETUP = new Set(['sweep_reclaim', 'fvg_continuation', 'ob_discount_tap', 'trend_pullback'])
const IMPULSE = { lookBars: 8, minAtrMult: 4 }
const FOLDS = 8, TRAIN_FOLDS = 5
const MODES = ['level', 'traded', 'arm']

const FROZEN = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'impulse_cont_seq1m_gate.json'), 'utf8'))
const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || FROZEN.at)
const OUT = process.env.TURBO_STUDY_OUT || path.join(TURBO.master, 'study_be_lock_semantics.json')
console.log(`\n████ BE LOCK SEMANTICS — IMPULSE_CONT OOS under level / traded (EA) / arm — tape to ${new Date(VAL_TO).toISOString()} ████\n`)

const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })
const idxByT = new Map(bars.map((b, k) => [b.t, k]))
const m1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO })).bars
const subBarsOf = makeSubBarIndex(m1)
const cands = fs.readFileSync(path.join(TURBO.master, 'candidates_15m_full.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const { folds } = buildRegimeSpannedFolds(bars, { folds: FOLDS })
const mean = (a, k) => a.length ? a.reduce((s, x) => s + (k ? x[k] : x), 0) / a.length : 0

let lastAdmitted = 0, lastNofill = 0                                       // fill accounting of the most recent replay (fill-through sensitivity)
function replay(lockMode, lockRestMarginUsd = 0, fillThroughUsd = 0) {
  const fires = []; const nextFree = new Array(FOLDS).fill(-1); let admitted = 0, nofill = 0
  for (const c of cands) {
    if (c.atr <= 0 || !SETUP.has(c.setup) || c.i == null || c.i < IMPULSE.lookBars + 1) continue
    const fold = assignFold(folds, c.i); if (fold < 0) continue
    const move = bars[c.i].c - bars[c.i - IMPULSE.lookBars].c
    if (Math.abs(move) < IMPULSE.minAtrMult * c.atr) continue
    if ((move > 0) !== (c.direction === 'UP')) continue
    if (c.i < nextFree[fold]) continue
    const up = c.direction === 'UP', risk = GEO.slAtr * c.atr
    const plan = { entry: c.entry, sl: up ? c.entry - risk : c.entry + risk, tp: up ? c.entry + GEO.tgtR * risk : c.entry - GEO.tgtR * risk }
    const r = resolveManagedLimitSeq({ direction: c.direction, plan, ts_utc: new Date(c.t).toISOString() }, bars, idxByT, subBarsOf, { fillWindow: 8, horizon: 64, beTriggerR: GEO.beR, beLockR: GEO.beLockR, tfMs: 900000, lockMode, lockRestMarginUsd, fillThroughUsd })
    admitted++; if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') { if (r.outcome === 'NOFILL') nofill++; continue }
    nextFree[fold] = c.i + (r.fill_bars || 0) + (r.resolve_bars || 0) + 1
    const net = netDollars({ grossMove: r.grossMove, entryHourUtc: r.entryHourUtc, atr: c.atr, exitType: r.exitType })
    fires.push({ fold, outcome: r.outcome, net, gross: r.grossMove, riskUsd: risk, R: net / risk, t: c.t, seq: r.seq, armed: r.beArmed, lockActive: r.lockActive, hour: r.entryHourUtc, atr: c.atr, exitType: r.exitType })
  }
  lastAdmitted = admitted; lastNofill = nofill
  return fires
}
function stats(xs, seedStart = 12345) {
  const W = xs.filter((x) => x.outcome === 'WIN').length, L = xs.filter((x) => x.outcome === 'LOSS').length, S = xs.filter((x) => x.outcome === 'SCRATCH').length, T = xs.filter((x) => x.outcome === 'TIME').length
  const dec = W + L
  let seed = seedStart; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const boots = []; for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[(rnd() * xs.length) | 0].net; boots.push(s / xs.length) }
  boots.sort((a, b) => a - b)
  const scr = xs.filter((x) => x.outcome === 'SCRATCH')
  return { n: xs.length, win: W, scratch: S, loss: L, time: T, dec, wr: dec ? +(W / dec).toFixed(4) : null, wilson_lb: dec ? +wilsonLowerBound(W, dec).toFixed(4) : null,
    net_per_trade: +mean(xs, 'net').toFixed(4), net_lb: xs.length ? +boots[50].toFixed(4) : null, net_ub: xs.length ? +boots[1949].toFixed(4) : null, avgR: +mean(xs, 'R').toFixed(4),
    scratch_gross_mean: scr.length ? +mean(scr, 'gross').toFixed(4) : null, sum_net: +xs.reduce((s, x) => s + x.net, 0).toFixed(2) }
}

// ── COST (the "MEASURE the cost model" rule): every mode is also priced at the MEASURED Polygon half-spread by session
// (live_spread_measured.json, 17,258 quotes, 2026-08-16) and its break-even half-spread is found by bisection — both as a
// FLAT half-spread (all sessions equal) and as a MULTIPLE of the shipped session schedule (the flagship gate's own method,
// whose 'level' answer the roster cites as $0.326). Same execution.js functions, different model objects — one cost rule.
const SPREAD = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'live_spread_measured.json'), 'utf8'))
const med = (name) => SPREAD.by_session.find((s) => s.session === name)?.median
const MEASURED_MODEL = Object.freeze({ ...COST_MODEL, spreadLondon: med('LONDON'), spreadOverlap: med('NY_OVERLAP'), spreadNy: med('NY'), spreadAsian: med('ASIAN'), spreadRollover: med('ROLLOVER') })
const flatModel = (s) => ({ ...COST_MODEL, spreadLondon: s, spreadOverlap: s, spreadNy: s, spreadAsian: s, spreadRollover: s })
const multModel = (k) => ({ ...COST_MODEL, spreadLondon: k * COST_MODEL.spreadLondon, spreadOverlap: k * COST_MODEL.spreadOverlap, spreadNy: k * COST_MODEL.spreadNy, spreadAsian: k * COST_MODEL.spreadAsian, spreadRollover: k * COST_MODEL.spreadRollover })
const netOf = (f, m) => netDollars({ grossMove: f.gross, entryHourUtc: f.hour, atr: f.atr, exitType: f.exitType }, m)
const netAt = (xs, m) => xs.length ? xs.reduce((s, f) => s + netOf(f, m), 0) / xs.length : 0
const avgRAt = (xs, m) => xs.length ? xs.reduce((s, f) => s + netOf(f, m) / f.riskUsd, 0) / xs.length : 0   // the gate's metric: "judge lift in R" — its $0.326 is the avgR zero
const bisect = (xs, mk, metric, lo, hi) => { if (metric(xs, mk(lo)) <= 0) return lo; if (metric(xs, mk(hi)) > 0) return hi; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (metric(xs, mk(mid)) > 0) lo = mid; else hi = mid } return +((lo + hi) / 2).toFixed(4) }
function costBlock(xs) {
  const flatR = bisect(xs, flatModel, avgRAt, 0, 3), multR = bisect(xs, multModel, avgRAt, 0, 10), flatNet = bisect(xs, flatModel, netAt, 0, 3)
  const mAt = netAt(xs, MEASURED_MODEL), mR = avgRAt(xs, MEASURED_MODEL)
  return { net_at_model: +netAt(xs, COST_MODEL).toFixed(4), avgR_at_model: +avgRAt(xs, COST_MODEL).toFixed(4),
    net_at_measured_session_medians: +mAt.toFixed(4), avgR_at_measured_session_medians: +mR.toFixed(4), viable_at_measured: mR > 0,
    break_even_flat_half_spread_usd: flatR, break_even_flat_half_spread_usd_net_metric: flatNet, break_even_schedule_multiple: multR,
    break_even_effective_half_spread_usd: +(multR * (COST_MODEL.spreadLondon + COST_MODEL.spreadOverlap + COST_MODEL.spreadNy + COST_MODEL.spreadAsian) / 4).toFixed(4),
    measured_session_medians: { LONDON: med('LONDON'), NY_OVERLAP: med('NY_OVERLAP'), NY: med('NY'), ASIAN: med('ASIAN'), ROLLOVER: med('ROLLOVER'), source: SPREAD.source, at: SPREAD.at, quotes: SPREAD.quotes_sampled } }
}

const results = {}
for (const mode of MODES) {
  const t0 = Date.now(); const fires = replay(mode)
  const oos = fires.filter((x) => x.fold >= TRAIN_FOLDS), tr = fires.filter((x) => x.fold < TRAIN_FOLDS)
  const perFold = []; for (let f = 0; f < FOLDS; f++) { const xs = fires.filter((x) => x.fold === f); perFold.push({ fold: f, n: xs.length, net: +mean(xs, 'net').toFixed(4), sum: +xs.reduce((s, x) => s + x.net, 0).toFixed(2) }) }
  results[mode] = { oos: stats(oos), train: stats(tr), all: stats(fires), per_fold: perFold, cost_oos: costBlock(oos), secs: Math.round((Date.now() - t0) / 1000) }
  const o = results[mode].oos, c = results[mode].cost_oos
  console.log(`${mode.padEnd(7)} OOS n=${o.n} W${o.win}/S${o.scratch}/L${o.loss}${o.time ? '/T' + o.time : ''} · WR ${o.wr} (LB ${o.wilson_lb}) · net $${o.net_per_trade}/t [${o.net_lb}, ${o.net_ub}] · avgR ${o.avgR} · scratch gross mean $${o.scratch_gross_mean} · Σ $${o.sum_net} · ${results[mode].secs}s`)
  console.log(`        cost: at MEASURED session medians $${c.net_at_measured_session_medians}/t · ${c.avgR_at_measured_session_medians}R (${c.viable_at_measured ? 'viable' : 'NOT viable'}) · break-even flat half-spread $${c.break_even_flat_half_spread_usd} (avgR=0; net$=0 at $${c.break_even_flat_half_spread_usd_net_metric}) · schedule ×${c.break_even_schedule_multiple}`)
}

// ── BROKER STOP-DISTANCE SENSITIVITY (2026-09-15): the lock rests only once price is past it by the broker's minimum stop
// distance (SYMBOL_TRADE_STOPS_LEVEL — unknown until the EA logs it). 'traded' replayed at margins 0 … $0.50; the day the
// broker's value is known, this table says what the book pays for it without another replay.
const MARGINS = [0, 0.1, 0.2, 0.3, 0.5, 1.0]
results.traded_rest_margin_sensitivity = MARGINS.map((m) => { const xs = replay('traded', m).filter((x) => x.fold >= TRAIN_FOLDS); const st = stats(xs), c = costBlock(xs)
  return { margin_usd: m, n: st.n, win: st.win, scratch: st.scratch, loss: st.loss, net_per_trade: st.net_per_trade, net_lb: st.net_lb, avgR: st.avgR, net_at_measured: c.net_at_measured_session_medians, avgR_at_measured: c.avgR_at_measured_session_medians, break_even_flat_half_spread_usd: c.break_even_flat_half_spread_usd } })
console.log('\nbroker stop-distance sensitivity (traded):')
for (const r of results.traded_rest_margin_sensitivity) console.log(`  margin $${r.margin_usd.toFixed(2).padEnd(5)} n=${r.n} W${r.win}/S${r.scratch}/L${r.loss} · net $${r.net_per_trade}/t (LB ${r.net_lb}) · avgR ${r.avgR} · break-even half-spread $${r.break_even_flat_half_spread_usd}`)

// ── FILL-THROUGH SENSITIVITY (2026-09-15): every artifact fills a limit on a TOUCH; a resting limit at the back of the queue
// may need price to trade through it. 'traded' (margin 0) replayed with the fill credited only once the touch extends $m
// beyond the limit. Fewer fills AND a different mix (the V-reversal wins that touch-and-go are the first to vanish).
const THROUGH = [0, 0.05, 0.10, 0.20, 0.30, 0.50]
results.traded_fill_through_sensitivity = THROUGH.map((m) => { const all = replay('traded', 0, m); const xs = all.filter((x) => x.fold >= TRAIN_FOLDS); const st = stats(xs), c = costBlock(xs)
  return { fill_through_usd: m, admitted: lastAdmitted, filled: all.length, nofill: lastNofill, fill_share: +(lastAdmitted ? all.length / lastAdmitted : 0).toFixed(4), n: st.n, win: st.win, scratch: st.scratch, loss: st.loss, net_per_trade: st.net_per_trade, net_lb: st.net_lb, avgR: st.avgR, sum_net: st.sum_net, avgR_at_measured: c.avgR_at_measured_session_medians, break_even_flat_half_spread_usd: c.break_even_flat_half_spread_usd } })
console.log('\nfill-through sensitivity (traded, margin 0):')
for (const r of results.traded_fill_through_sensitivity) console.log(`  through $${r.fill_through_usd.toFixed(2).padEnd(5)} fill share ${r.fill_share} (${r.filled}/${r.admitted}) · OOS n=${r.n} W${r.win}/S${r.scratch}/L${r.loss} · net $${r.net_per_trade}/t (LB ${r.net_lb}) · avgR ${r.avgR} · Σ $${r.sum_net} · break-even $${r.break_even_flat_half_spread_usd}`)

// ── PARITY GATE: 'level' must be the frozen artifact ──
const fz = FROZEN.seq_power?.oos_seq, lv = results.level.oos, sh = FROZEN.shipped
const parity = { frozen: { n: fz?.n, win: fz?.win, scratch: fz?.scratch, loss: fz?.loss, net: fz?.net, wr: sh?.wr, net_lb: sh?.net_per_trade_lb },
  level: { n: lv.n, win: lv.win, scratch: lv.scratch, loss: lv.loss, net: lv.net_per_trade, wr: lv.wr, net_lb: lv.net_lb } }
parity.exact = fz && lv.n === fz.n && lv.win === fz.win && lv.scratch === fz.scratch && lv.loss === fz.loss && Math.abs(lv.net_per_trade - fz.net) < 5e-4 && Math.abs(lv.wr - sh.wr) < 5e-4
console.log(`\nPARITY level vs frozen artifact: ${parity.exact ? '✅ EXACT' : '🚨 MISMATCH'} ${JSON.stringify(parity)}`)

// ── the verdict is arithmetic, not opinion ──
const tr = results.traded.oos, ar = results.arm.oos
const verdict = {
  question: 'does the shipped IMPULSE_CONT edge survive the EA\'s real lock semantics (lock rests only after the market trades through it)?',
  level_net: lv.net_per_trade, traded_net: tr.net_per_trade, arm_net: ar.net_per_trade,
  traded_minus_level: +(tr.net_per_trade - lv.net_per_trade).toFixed(4), arm_minus_level: +(ar.net_per_trade - lv.net_per_trade).toFixed(4),
  traded_positive_lb: tr.net_lb != null && tr.net_lb > 0, arm_positive_lb: ar.net_lb != null && ar.net_lb > 0,
  traded_powered_folds_positive: results.traded.per_fold.filter((f) => f.fold >= TRAIN_FOLDS && f.n >= 30).map((f) => [f.fold, f.net > 0]),
  phantom_share_level: null }
// how many 'level' scratches were PHANTOM (lock paid without the market ever trading through it)? = scratches whose
// 'traded' replay of the same fire would not have rested the lock — approximated per fire-time join on t
{ const lvF = new Map(replay('level').filter((x) => x.outcome === 'SCRATCH').map((x) => [x.t, x])); const trF = new Map(replay('traded').map((x) => [x.t, x]))
  let phantom = 0, joined = 0; for (const [t] of lvF) { const y = trF.get(t); if (!y) continue; joined++; if (!y.lockActive) phantom++ }
  verdict.phantom_share_level = joined ? +(phantom / joined).toFixed(4) : null; verdict.phantom_joined = joined; verdict.phantom_count = phantom }
verdict.reading = !parity.exact ? 'VOID — parity failed; fix the harness before reading anything'
  : tr.net_lb > 0 ? `SURVIVES under the EA semantics: traded net $${tr.net_per_trade}/t (LB $${tr.net_lb}) vs shipped $${lv.net_per_trade}/t`
  : tr.net_per_trade > 0 ? `WEAKENED under the EA semantics: traded net $${tr.net_per_trade}/t but bootstrap LB ≤ 0 (shipped $${lv.net_per_trade}/t)`
  : `REFUTED under the EA semantics: traded net $${tr.net_per_trade}/t ≤ 0 (shipped $${lv.net_per_trade}/t pays phantom locks)`
console.log(`\nVERDICT: ${verdict.reading}`)
console.log(`  phantom locks among 'level' scratches: ${verdict.phantom_count}/${verdict.phantom_joined} (${verdict.phantom_share_level})`)
console.log(`  arm (close-at-market) net $${ar.net_per_trade}/t (LB ${ar.net_lb})`)

fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), frozen_at: FROZEN.at, geo: GEO, modes: MODES, results, parity, verdict,
  provenance: ['candidates_15m_full.jsonl', 'polygon XAUUSD 15m + 1m to tape_to', 'seqResolver.resolveManagedLimitSeq lockMode', 'execution.netDollars', 'impulse_cont_seq1m_gate.json (parity)'] }, null, 1))
console.log(`\nwrote ${OUT}`)
exitWhenDrained('study_be_lock_semantics', { parity: parity.exact })
