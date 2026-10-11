// ════════════════════════════════════════════════════════════════════════════════
// validate_level_fade_book.mjs — the LEVEL_FADE book's ship gate (Ferrari Twin Turbo, 2026-10-08; Ashraf: "yes build everything we need").
// ────────────────────────────────────────────────────────────────────────────────
// THE BOOK = the Level Radar fade playbook on ALL reached levels, NO cell selection (the best "cells" key on the touch session —
// unknown when the limit is placed — and would be a 21-way search). The order rule is levelRadar.ordersToPlace — the SAME function
// the live tick uses — simulated over every closed 4H decision: a maker limit AT R1 (sell) / S1 (buy), stop 0.5·ATR(4h), target
// 1.0·ATR(4h), resting ≤ 96 × 15m bars, one order/position per side at a time (lane). Causal radar (levelRadar.js default).
// RESOLUTION = the MONEY PATH: 1m-sequenced every bar (seqAll), BID bars with ask-side orders clearing the MEASURED Polygon spread,
// cost = stop/time slippage only. Tape: the twin's Polygon 1m store from HISTORY_CONTINUOUS_FROM to TURBO_VAL_TO (frozen).
//
// PRE-REGISTERED VERDICT (written before the first run, never re-tuned):
//   SHIP ⇔ the primary arm passes C1-C4 of scripts/lib/seq_power.mjs (C1 OOS decisive ≥ 100 · C2 OOS bootstrap 95% LB > 0 ·
//          C3 TRAIN net > 0 when powered · C4 ≥ 2/3 of powered folds net > 0, ≥ 3 powered)   (8 regime-spanned folds, train = 0-4)
//          AND stress S1: spread × 1.5 → OOS bootstrap LB > 0
//          AND stress S2: fill-through $0.10 (the touch must trade $0.10 beyond the limit) → OOS bootstrap LB > 0
//   otherwise SHADOW (record-only). Reported, never part of the verdict: the LEGACY (look-ahead) radar on the same path — the
//   contamination measurement — and a one-position-overall lane variant.
// RULE 2 — REFRESH (added 2026-10-08 AFTER rule 1 failed; pre-registered here BEFORE its first run). Rule 1 (above) kept an unfilled
// limit resting up to 24h at a level that may be stale and blocked the side meanwhile; the STUDY re-picked the nearest R1/S1 at every
// 4H close. REFRESH: at each 4H close every UNFILLED order is cancelled and re-placed at the current R1/S1 (valid 16 × 15m = until the
// next close); a side is blocked only while a POSITION is open. Because it is the 2nd rule tried, its bar is stricter: C1-C4 with the
// OOS bootstrap LB taken at 97.5% (Bonferroni for 2 rules: percentile 1.25%), AND S1, S2 at the same 97.5% bound. Verdict = rule 2's
// if rule 1 fails (rule 1 stays recorded).
// Output: data/master/level_fade_gate.json (TURBO_VAL_OUT overrides).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { buildRadar, decisionAt, ordersToPlace, closedH4Count, RADAR } from '../src/master/levelRadar.js'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollarsBidAsk } from '../src/master/execution.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { buildRegimeSpannedFolds, assignFold } from '../src/core/regimeSplitter.js'
import { seqPowerBlock, printSeqPower } from './lib/seq_power.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-08T15:45:00Z')
const OUT = process.env.TURBO_VAL_OUT || path.join(TURBO.master, 'level_fade_gate.json')
const FOLDS = 8, TRAIN_FOLDS = 5, M15 = 900000
const bars = (await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
const m1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO + M15 })).bars
const subBarsOf = makeSubBarIndex(m1), idxByT = new Map(bars.map((b, k) => [b.t, k]))
const { folds } = buildRegimeSpannedFolds(bars, { folds: FOLDS })
const baseSpread = makeSpreadAt()
console.log(`\n████ LEVEL_FADE BOOK GATE — causal radar · live order rule · money path · ${new Date(bars[0].t).toISOString().slice(0, 10)} → ${new Date(VAL_TO).toISOString().slice(0, 16)} ████`)

/** Simulate the book: the live order rule over every closed 4H decision; resolve each order on the money path. */
function simulate({ legacy = false, spreadMult = 1, fillThroughUsd = 0, laneMode = 'side', refresh = false } = {}) {
  const R = buildRadar(bars, { legacy }), nH4 = closedH4Count(R, VAL_TO + M15)
  const spreadAt = spreadMult === 1 ? baseSpread : (t) => spreadMult * baseSpread(t)
  const busy = { R: -Infinity, S: -Infinity }, trades = []; let orders = 0, nofill = 0
  for (let i = RADAR.minH4; i < nH4; i++) {
    const dec = decisionAt(R, i); if (!dec) continue
    const lanes = laneMode === 'one' ? { R: Math.max(busy.R, busy.S), S: Math.max(busy.R, busy.S) } : busy
    const W = refresh ? 16 : RADAR.windowBars                  // refresh: the order lives only until the next 4H close
    for (const o of ordersToPlace(dec, lanes)) {
      if (laneMode === 'one' && Math.max(busy.R, busy.S) > dec.decisionT - 1) break
      const i15 = idxByT.get(dec.decisionT - M15); if (i15 == null) continue
      const up = o.dir === 'UP', plan = { entry: o.level, sl: up ? o.level - o.stop : o.level + o.stop, tp: up ? o.level + o.tgt : o.level - o.tgt }
      const r = resolveManagedLimitSeq({ direction: o.dir, plan, ts_utc: new Date(bars[i15].t).toISOString() }, bars, idxByT, subBarsOf,
        { fillWindow: W, horizon: RADAR.windowBars, beTriggerR: 0, beLockR: 0, tfMs: M15, lockMode: 'level', spreadAt, seqAll: true, fillThroughUsd })
      orders++
      if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') { nofill++; if (!refresh) busy[o.side] = dec.decisionT + RADAR.windowBars * M15 - 1; continue }
      const endIdx = Math.min(bars.length - 1, i15 + r.fill_bars + r.resolve_bars); busy[o.side] = bars[endIdx].t + M15 - 1
      const net = netDollarsBidAsk({ grossMove: r.grossMove, atr: o.atr4 / 4, exitType: r.exitType })
      trades.push({ fold: assignFold(folds, i15), outcome: r.outcome, net, R: net / o.stop, riskUsd: o.stop, t: dec.decisionT, side: o.side, label: o.label, seq: r.seq })
    }
  }
  return { trades, orders, nofill }
}
const mean = (a, k) => (a.length ? a.reduce((s, x) => s + (k ? x[k] : x), 0) / a.length : 0)
function summarise(name, sim, { pLo = 50 } = {}) {
  const fires = sim.trades.filter((x) => x.fold >= 0), oos = fires.filter((x) => x.fold >= TRAIN_FOLDS), tr = fires.filter((x) => x.fold < TRAIN_FOLDS)
  const W = oos.filter((x) => x.outcome === 'WIN').length, L = oos.filter((x) => x.outcome === 'LOSS').length, dec = W + L
  let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const boots = []; for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < oos.length; i++) s += oos[(rnd() * oos.length) | 0].net; boots.push(s / oos.length) }
  boots.sort((a, b) => a - b)
  const years = {}; for (const f of fires) { const y = new Date(f.t).getUTCFullYear(); years[y] = (years[y] || 0) + f.net }
  const YRS = (bars.at(-1).t - bars[0].t) / (365.25 * 864e5)
  const s = { arm: name, orders: sim.orders, nofill: sim.nofill, fires: fires.length, per_year: +(fires.length / YRS).toFixed(1),
    oos: { n: oos.length, dec, wr: dec ? +(W / dec).toFixed(4) : null, wr_lb: dec ? +wilsonLowerBound(W, dec).toFixed(4) : null, net: +mean(oos, 'net').toFixed(4), lb: +boots[pLo].toFixed(4), lb_pct: pLo / 20, ub: +boots[1949].toFixed(4), avgR: +mean(oos, 'R').toFixed(4),
      outcomes: { win: W, loss: L, time: oos.length - W - L } },
    train: { n: tr.length, net: +mean(tr, 'net').toFixed(4) }, all: { net: +mean(fires, 'net').toFixed(4), avgR: +mean(fires, 'R').toFixed(4) },
    years_positive: `${Object.values(years).filter((v) => v > 0).length}/${Object.keys(years).length}`, by_year: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, +v.toFixed(1)])),
    avg_risk: +mean(oos, 'riskUsd').toFixed(2) }
  s.seq_power = seqPowerBlock({ fires, trainPred: (f) => f.fold < TRAIN_FOLDS, m1Start: m1[0].t, folds: FOLDS, ciLb: boots[pLo] })
  console.log(`\n── ${name}: fires ${s.fires} (${s.per_year}/yr, orders ${s.orders}, unfilled ${s.nofill}) · OOS n=${s.oos.n} dec=${dec} WR ${s.oos.wr} (LB ${s.oos.wr_lb}) · $/t ${s.oos.net} [${s.oos.lb}, ${s.oos.ub}] avgR ${s.oos.avgR} · TRAIN ${s.train.net} · years+ ${s.years_positive}`)
  return s
}
const primary = summarise('PRIMARY causal · money path · lane per side', simulate())
printSeqPower('LEVEL_FADE', primary.seq_power)
const s1 = summarise('S1 spread × 1.5', simulate({ spreadMult: 1.5 }))
const s2 = summarise('S2 fill-through $0.10', simulate({ fillThroughUsd: 0.10 }))
const legacy = summarise('REPORT legacy (look-ahead) radar · same path', simulate({ legacy: true }))
const oneLane = summarise('REPORT one position overall', simulate({ laneMode: 'one' }))
const gates1 = { C1_C4: primary.seq_power.verdict === 'SHIP', S1_spread_x1_5: s1.oos.lb > 0, S2_fill_through: s2.oos.lb > 0 }
const verdict1 = Object.values(gates1).every(Boolean) ? 'SHIP' : 'SHADOW'
// ── RULE 2 (refresh) — the 97.5% bound (percentile 25 of 2000 = 1.25%) ──
const P2 = 25
const r2 = summarise('RULE 2 REFRESH causal · money path', simulate({ refresh: true }), { pLo: P2 })
printSeqPower('LEVEL_FADE refresh', r2.seq_power)
const r2s1 = summarise('RULE 2 · S1 spread × 1.5', simulate({ refresh: true, spreadMult: 1.5 }), { pLo: P2 })
const r2s2 = summarise('RULE 2 · S2 fill-through $0.10', simulate({ refresh: true, fillThroughUsd: 0.10 }), { pLo: P2 })
const r2legacy = summarise('RULE 2 · REPORT legacy (look-ahead) radar', simulate({ refresh: true, legacy: true }), { pLo: P2 })
const gates2 = { C1_C4: r2.seq_power.verdict === 'SHIP', S1_spread_x1_5: r2s1.oos.lb > 0, S2_fill_through: r2s2.oos.lb > 0 }
const verdict2 = Object.values(gates2).every(Boolean) ? 'SHIP' : 'SHADOW'
const gates = verdict1 === 'SHIP' ? gates1 : gates2
const verdict = verdict1 === 'SHIP' ? 'SHIP' : verdict2
const chosen = verdict1 === 'SHIP' ? primary : r2
const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), book: 'LEVEL_FADE', verdict, rule_used: verdict1 === 'SHIP' ? 'rule1' : 'rule2-refresh', gates, failed: Object.entries(gates).filter(([, v]) => !v).map(([k]) => k),
  rule1: { verdict: verdict1, gates: gates1 }, rule2: { verdict: verdict2, gates: gates2, bound: '97.5% (Bonferroni, 2 rules)' },
  rule: { radar: 'levelRadar.js (causal)', order: 'ordersToPlace — limit at R1 (sell) / S1 (buy), one per side', stop_atr4: RADAR.stopAtr, tgt_atr4: RADAR.tgtAtr, window_15m: RADAR.windowBars, resolution: { seq_all: true, lock_mode: 'level', bid_ask: true, be: 'none' } },
  shipped: { wr: chosen.oos.wr, lb: chosen.oos.wr_lb, n: chosen.oos.dec, net_per_trade_oos: chosen.oos.net, net_per_trade_lb: chosen.oos.lb, net_per_trade_ub: chosen.oos.ub, net_per_trade_train: chosen.train.net,
    outcomes_oos: { n: chosen.oos.n, ...chosen.oos.outcomes }, avg_risk: chosen.avg_risk, per_year: chosen.per_year, years_positive: chosen.years_positive },
  seq_power: chosen.seq_power, arms: { primary, s1, s2, legacy, one_lane: oneLane, rule2: r2, rule2_s1: r2s1, rule2_s2: r2s2, rule2_legacy: r2legacy } }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(`\n⇒ LEVEL_FADE VERDICT: ${verdict}${out.failed.length ? ' (failed: ' + out.failed.join(', ') + ')' : ''}\nwrote ${OUT}`)
