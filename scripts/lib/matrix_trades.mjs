// matrix_trades.mjs — the Ferrari Matrix trade SEQUENCE on history (one trade at a time; a new setup only after the previous closes),
// ONE place for validate_ferrari_matrix.mjs (the gate) and every filter study (study_fib_matrix_filter.mjs, …). 2026-10-09.
// FROZEN TAPE: 1m data stop at `to`; a trade that has not finished by `to` is NOT counted (deterministic, reproducible runs).
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { loadDxyBars } from '../../src/data/dxy.js'
import { TURBO } from '../../src/core/paths.js'
import { matrixSignals, resolveMatrixTrade, MATRIX } from '../../src/master/ferrariMatrix.js'
import { buildRegimeSpannedFolds, assignFold } from '../../src/core/regimeSplitter.js'

let W = null
export const wti1m = (to) => (W ??= fs.readFileSync(path.join(TURBO.historyAsset('WTI'), '1m.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))).filter((b) => b.t <= to)

/** @returns {{ fires, signals, B, m1, folds, startI }} fires: [{ t, fold, side, outcome, raw, net, R, risk, reward, sig }] */
// keep (2026-10-19, MATRIX_DXY_CONFLICT_SPEC): optional signal filter applied BEFORE sequencing — keep(sig, { B, D, W }) → false drops it. Default: none.
export async function matrixTrades({ from, to, useWti = true, spreadAt, maxMiss = 0, keep = null }) {
  const B = (await loadBars('XAUUSD', '3m', { from: from - 3 * 86400000, to })).bars
  const D = (await loadDxyBars('3m', { from: from - 3 * 86400000, to })).bars
  const m1 = (await loadBars('XAUUSD', '1m', { from, to })).bars
  const T1 = m1.map((b) => b.t)
  const lb = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
  const startI = B.findIndex((b) => b.t >= from), { folds } = buildRegimeSpannedFolds(B.slice(startI), { folds: 8 })
  const Wt = useWti ? wti1m(to) : [], all = matrixSignals(B, D, Wt, { from: startI, useWti, maxMiss }), sigs = keep ? all.filter((s) => keep(s, { B, D, W: Wt })) : all
  const fires = []; let busyUntil = -Infinity
  for (const s of sigs) {
    if (s.decisionT <= busyUntil) continue
    const k = lb(s.decisionT), path1m = m1.slice(k, k + MATRIX.horizonMin + 5)
    const r = resolveMatrixTrade(s, path1m, spreadAt); if (!r.done) continue
    busyUntil = r.exitT + 60000
    const outcome = r.outcome === 'TP1+TP2' ? 'WIN' : r.outcome === 'TP1+BE' ? 'SCRATCH' : r.outcome === 'SL' ? 'LOSS' : r.pnl > 0 ? 'WIN' : 'LOSS'
    fires.push({ t: s.decisionT, fold: assignFold(folds, s.i - startI), side: s.side, outcome, raw: r.outcome, net: r.pnl, R: r.pnl / s.risk, risk: s.risk, reward: s.reward, seq: 'seq', sig: s })
  }
  return { fires, signals: sigs.length, B, m1, folds, startI }
}
