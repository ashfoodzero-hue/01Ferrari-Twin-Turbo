// ════════════════════════════════════════════════════════════════════════════════
// validate_ferrari_matrix.mjs — the FERRARI MATRIX scalp (Ashraf's Pine method, src/master/ferrariMatrix.js) on the MONEY PATH (2026-10-09).
// ────────────────────────────────────────────────────────────────────────────────
// PRIMARY: the faithful method incl. the WTI whale filter (WTI as delivered, 10 min late) — testable only where Polygon has CL history:
// 2024-10-09 → TURBO_VAL_TO (~2 years). Signals on closed 3m gold bars; one trade at a time (a new setup only after the box closes);
// market entry at the signal close (BUY pays the ask); half at TP1 → stop to the fill → half to TP2; 1m bid path, measured spread
// (spreadModel), stop-first inside a minute, stop slippage, 24 h horizon. FROZEN TAPE (2026-10-09): 1m data stop at TURBO_VAL_TO; a trade
// still open at VAL_TO is not counted (before: it was finished on later live minutes → results drifted between runs).
// PRE-REGISTERED VERDICT (before the first run): SHIP ⇔ C1-C4 of scripts/lib/seq_power.mjs on 8 regime-spanned folds of the 3m bars
// (train folds 0-4, OOS 5-7) AND stress S1: spread × 1.5 → OOS bootstrap LB > 0. Otherwise SHADOW (paper boxes still shown, labelled).
// Outcome classes for the power block: TP1+TP2 = WIN · TP1+BE = SCRATCH · SL = LOSS · TIME/TP1+TIME by the sign of P&L.
// REPORT (never the verdict): the same method WITHOUT the WTI filter on the full 13y Polygon history, and on the same 2 years.
// Output: data/master/ferrari_matrix_gate.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { MATRIX } from '../src/master/ferrariMatrix.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { seqPowerBlock, printSeqPower } from './lib/seq_power.mjs'
import { matrixTrades } from './lib/matrix_trades.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z')
const baseSpread = makeSpreadAt()

async function run(name, { from, useWti, spreadMult = 1, maxMiss = 0 }) {
  const spreadAt = spreadMult === 1 ? baseSpread : (t) => spreadMult * baseSpread(t)
  const { fires, signals: nSig, m1 } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt, maxMiss })   // the ONE trade sequence (scripts/lib/matrix_trades.mjs)
  const sigs = { length: nSig }
  const inF = fires.filter((f) => f.fold >= 0), oos = inF.filter((f) => f.fold >= 5), tr = inF.filter((f) => f.fold < 5)
  const mean = (a, k) => (a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : 0)
  let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const boots = []; for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < oos.length; i++) s += oos[(rnd() * oos.length) | 0].net; boots.push(s / Math.max(1, oos.length)) }
  boots.sort((a, b) => a - b)
  const W1 = oos.filter((f) => f.outcome === 'WIN').length, L1 = oos.filter((f) => f.outcome === 'LOSS').length
  const days = (VAL_TO - from) / 86400000, raw = {}; for (const f of inF) raw[f.raw] = (raw[f.raw] || 0) + 1
  const years = {}; for (const f of inF) { const y = new Date(f.t).getUTCFullYear(); years[y] ??= { n: 0, net: 0 }; years[y].n++; years[y].net += f.net }
  const res = { arm: name, window: new Date(from).toISOString().slice(0, 10) + ' → ' + new Date(VAL_TO).toISOString().slice(0, 16), signals: sigs.length, trades: inF.length, per_day: +(inF.length / days).toFixed(2),
    outcomes_all: raw,
    oos: { n: oos.length, dec: W1 + L1, wr: W1 + L1 ? +(W1 / (W1 + L1)).toFixed(4) : null, wr_lb: W1 + L1 ? +wilsonLowerBound(W1, W1 + L1).toFixed(4) : null, net: +mean(oos, 'net').toFixed(4), lb: +boots[50].toFixed(4), ub: +boots[1949].toFixed(4), avgR: +mean(oos, 'R').toFixed(4) },
    train: { n: tr.length, net: +mean(tr, 'net').toFixed(4) },
    by_side: Object.fromEntries(['BUY', 'SELL'].map((sd) => { const xs = inF.filter((f) => f.side === sd); return [sd, { n: xs.length, net: +mean(xs, 'net').toFixed(4) }] })),
    by_year: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, { n: v.n, net: +(v.net / v.n).toFixed(3) }])), avg_risk: +mean(inF, 'risk').toFixed(2), avg_reward: +mean(inF, 'reward').toFixed(2) }
  res.seq_power = seqPowerBlock({ fires: inF, trainPred: (f) => f.fold < 5, m1Start: m1[0].t, folds: 8, ciLb: boots[50] })
  console.log('\n── ' + name + ' · ' + res.window + ': signals ' + res.signals + ' · trades ' + res.trades + ' (' + res.per_day + '/day) · outcomes ' + JSON.stringify(raw))
  console.log('   OOS n=' + res.oos.n + ' WR ' + res.oos.wr + ' (LB ' + res.oos.wr_lb + ') · $/t ' + res.oos.net + ' [' + res.oos.lb + ', ' + res.oos.ub + '] avgR ' + res.oos.avgR + ' · TRAIN ' + res.train.net + ' · BUY ' + JSON.stringify(res.by_side.BUY) + ' SELL ' + JSON.stringify(res.by_side.SELL) + ' · avg risk $' + res.avg_risk + ' reward $' + res.avg_reward)
  return res
}
console.log('\n████ FERRARI MATRIX (scalp, Ashraf Pine method) — money path ████')
// VARIANT (2026-10-09, Ashraf: "test the looser version without WTI"): MATRIX_VARIANT=nowti runs the SAME pre-registered gate for the
// candidate WITHOUT the WTI whale filter — primary window = the full 13 y (WTI history is no longer needed), S1 = spread × 1.5 on the
// same window, report = the last 2 y. Output: ferrari_matrix_nowti_gate.json. The default run (with WTI) is unchanged.
const NOWTI = process.env.MATRIX_VARIANT === 'nowti', ONEMISS = process.env.MATRIX_VARIANT === 'onemiss'
// VARIANT ONEMISS (2026-10-09, Ashraf: "audit that we are not missing opportunities" — after 16:33/16:36 near-misses): the SAME gate, the wall
// required, any ONE of the other three conditions may fail. Primary = with WTI, 2 y (as the live strategy); S1 spread × 1.5; report = 13 y
// without WTI (also one miss allowed). Output: ferrari_matrix_onemiss_gate.json.
if (ONEMISS) {
  const primary = await run('PRIMARY one-miss, with WTI, 2y', { from: WTI_FROM, useWti: true, maxMiss: 1 })
  printSeqPower('FERRARI_MATRIX_ONEMISS', primary.seq_power)
  const s1 = await run('S1 spread x 1.5 (one-miss)', { from: WTI_FROM, useWti: true, spreadMult: 1.5, maxMiss: 1 })
  const r13 = await run('REPORT one-miss without WTI, 13y', { from: HISTORY_CONTINUOUS_FROM + 7 * 86400000, useWti: false, maxMiss: 1 })
  const gates = { C1_C4: primary.seq_power.verdict === 'SHIP', S1_spread_x1_5: s1.oos.lb > 0 }
  const verdict = Object.values(gates).every(Boolean) ? 'SHIP' : 'SHADOW'
  fs.writeFileSync(path.join(TURBO.master, 'ferrari_matrix_onemiss_gate.json'), JSON.stringify({ at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), book: 'FERRARI_MATRIX_ONEMISS', verdict, gates,
    failed: Object.entries(gates).filter(([, v]) => !v).map(([k]) => k), params: { ...MATRIX, maxMiss: 1 }, primary, s1, report: { no_wti_13y: r13 } }, null, 1))
  console.log('\n=> FERRARI MATRIX (one miss allowed) VERDICT: ' + verdict + '\nwrote data/master/ferrari_matrix_onemiss_gate.json')
} else if (NOWTI) {
  const F13 = HISTORY_CONTINUOUS_FROM + 7 * 86400000
  const primary = await run('PRIMARY without WTI, 13y', { from: F13, useWti: false })
  printSeqPower('FERRARI_MATRIX_NOWTI', primary.seq_power)
  const s1 = await run('S1 spread x 1.5 (no WTI, 13y)', { from: F13, useWti: false, spreadMult: 1.5 })
  const last2 = await run('REPORT without WTI, last 2y', { from: WTI_FROM, useWti: false })
  const gates = { C1_C4: primary.seq_power.verdict === 'SHIP', S1_spread_x1_5: s1.oos.lb > 0 }
  const verdict = Object.values(gates).every(Boolean) ? 'SHIP' : 'SHADOW'
  fs.writeFileSync(path.join(TURBO.master, 'ferrari_matrix_nowti_gate.json'), JSON.stringify({ at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), book: 'FERRARI_MATRIX_NOWTI', verdict, gates,
    failed: Object.entries(gates).filter(([, v]) => !v).map(([k]) => k), params: MATRIX, primary, s1, report: { last_2y: last2 } }, null, 1))
  console.log('\n=> FERRARI MATRIX (no WTI) VERDICT: ' + verdict + (verdict === 'SHIP' ? '' : ' (failed: ' + Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') + ')') + '\nwrote data/master/ferrari_matrix_nowti_gate.json')
} else {
  const primary = await run('PRIMARY with WTI filter (as delivered)', { from: WTI_FROM, useWti: true })
  printSeqPower('FERRARI_MATRIX', primary.seq_power)
  const s1 = await run('S1 spread x 1.5', { from: WTI_FROM, useWti: true, spreadMult: 1.5 })
  const noWti2 = await run('REPORT without WTI, same 2y', { from: WTI_FROM, useWti: false })
  const noWti13 = await run('REPORT without WTI, 13y', { from: HISTORY_CONTINUOUS_FROM + 7 * 86400000, useWti: false })
  const gates = { C1_C4: primary.seq_power.verdict === 'SHIP', S1_spread_x1_5: s1.oos.lb > 0 }
  const verdict = Object.values(gates).every(Boolean) ? 'SHIP' : 'SHADOW'
  const out = { at: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), book: 'FERRARI_MATRIX', verdict, gates, failed: Object.entries(gates).filter(([, v]) => !v).map(([k]) => k), params: MATRIX, primary, s1, report: { no_wti_same_2y: noWti2, no_wti_13y: noWti13 } }
  fs.writeFileSync(path.join(TURBO.master, 'ferrari_matrix_gate.json'), JSON.stringify(out, null, 1))
  console.log('\n=> FERRARI MATRIX VERDICT: ' + verdict + (out.failed.length ? ' (failed: ' + out.failed.join(', ') + ')' : '') + '\nwrote data/master/ferrari_matrix_gate.json')
}
