// ml_sell_live.mjs — the LIVE PAPER forward test of the ML SELL X3 scalp (2026-10-25, Ashraf: "build the live PAPER forward test of the ML SELL X3 model
// (same feature code, scored like the other paper books, chart box SELL only, no Telegram trade alerts yet)"). ONE place, called by matrix_tick each 3m close.
// • Model = the frozen walk-forward model of the current year (data/scalp_ml/ml_sell_x3_<Y>.json, freeze_ml_sell.mjs) — no model for the year → no trade.
// • Features = scalp_ml.buildFeatures (the study's code) on a 20-day window that starts on a UTC day; smoke_ml_sell proves window = full-history scores.
// • One paper SELL at a time at the just-closed 3m bar's close when score ≥ the frozen threshold; resolved by the live resolver (resolveMatrixTrade).
// • PAPER ONLY: no order, no Telegram. Journal data/paper/ml_sell_trades.jsonl, state data/master/ml_sell_state.json, review data/master/ml_sell_review.json.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { loadBars } from '../../src/data/backfillReader.js'
import { loadDxyBars } from '../../src/data/dxy.js'
import { resolveMatrixTrade } from '../../src/master/ferrariMatrix.js'
import { binAll, predict } from '../inv90/gbdt.mjs'
import { hourAtr } from './scalp_v2.mjs'
import { buildFeatures, sellSig } from './scalp_ml.mjs'

import { makeSpreadAt } from '../../src/master/spreadModel.js'
const DAY = 86400000, BAR = 180000
// the FEATURE 'cost' uses the measured spread TABLE — exactly what the model was trained on; paper trades are PRICED with the caller's live spreads
const FEATURE_SPREAD = makeSpreadAt()
// windowDays 20: the slowest-settling input (Wilder ATR14 of hourly bars) carries (13/14)^480 ≈ 4e-16 of the window start — exact at float precision
export const ML_SELL = Object.freeze({ windowDays: 20, journal: path.join(TURBO.paper, 'ml_sell_trades.jsonl'), state: path.join(TURBO.master, 'ml_sell_state.json'),
  review: path.join(TURBO.master, 'ml_sell_review.json'), scores: path.join(TURBO.paper, 'ml_sell_scores.jsonl'), modelFile: (y) => path.join(TURBO.root, 'data', 'scalp_ml', `ml_sell_x3_${y}.json`) })
const cache = new Map()
export function loadModel(year) {
  if (cache.has(year)) return cache.get(year)
  let m = null; try { m = JSON.parse(fs.readFileSync(ML_SELL.modelFile(year), 'utf8')); m.edges = m.edges.map((e) => Float64Array.from(e)) } catch { m = null }
  cache.set(year, m); return m
}
/** Score the 3m bar closing at closeT (its open = closeT − 3 min) from a window of stored data ending at closeT. → { score, row, A, bar } or { why }. */
export async function scoreAt(closeT, { spreadAt = FEATURE_SPREAD, model = loadModel(new Date(closeT - BAR).getUTCFullYear()) } = {}) {
  if (!model) return { why: `no frozen model for ${new Date(closeT - BAR).getUTCFullYear()} (run freeze_ml_sell.mjs)` }
  const from = Math.floor((closeT - ML_SELL.windowDays * DAY) / DAY) * DAY, to = closeT - 1
  const closed = (len) => (r) => r.bars.filter((b) => b.t + len <= closeT)   // closed bars only, each series by its own length
  const [B, m1, S1, S3, D] = await Promise.all([loadBars('XAUUSD', '3m', { from, to }).then(closed(BAR)), loadBars('XAUUSD', '1m', { from, to }).then(closed(60000)),
    loadBars('XAGUSD', '1m', { from, to }).then(closed(60000)), loadBars('XAGUSD', '3m', { from, to }).then(closed(BAR)), loadDxyBars('3m', { from, to }).then(closed(BAR))])
  const i = B.length - 1; if (i < 0 || B[i].t !== closeT - BAR) return { why: `the 3m bar ${new Date(closeT - BAR).toISOString()} is not in the store yet` }
  const fe = buildFeatures({ B, m1, S1, S3, D, ha: hourAtr(m1), spreadAt }); if (!Number.isFinite(fe.A[i])) return { why: 'no hourly ATR yet' }
  const row = Array.from(fe.X.subarray(i * fe.F, (i + 1) * fe.F)), Xb = binAll(Float32Array.from(row), 1, fe.F, model.edges)
  return { score: predict(model.model, Xb, 1, 0), threshold: model.threshold, row, A: fe.A[i], bar: B[i], B, i, decisionT: fe.T[i], model_year: model.year }
}
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const rows = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) } catch { return [] } }
/** One live tick (matrix_tick, every 3m close): resolve the open paper SELL, then (data live, nothing open) score the just-closed bar and open one if due. */
export async function mlSellTick({ lastClose, dataLive, why = null, spreadAt, write = true }) {
  const st = readJ(ML_SELL.state) ?? { open: null }, out = { at: new Date().toISOString(), bar: new Date(lastClose - BAR).toISOString(), open: st.open, last_closed: st.last_closed ?? null, decision: null, paper: true }
  if (st.open) { const m1 = (await loadBars('XAUUSD', '1m', { from: st.open.sig.decisionT - 60000 })).bars.filter((b) => b.t + 60000 <= lastClose)
    const r = resolveMatrixTrade(st.open.sig, m1, spreadAt, { nowT: lastClose })
    if (r.done) { const row = { ...st.open, status: 'CLOSED', outcome: r.outcome, pnl: r.pnl, fill: r.fill, events: r.events, closedAt: new Date(r.exitT).toISOString() }
      if (write) fs.appendFileSync(ML_SELL.journal, JSON.stringify(row) + '\n'); out.open = null; out.last_closed = { outcome: r.outcome, pnl: r.pnl, closedAt: row.closedAt } } }
  if (!out.open) {
    if (!dataLive) out.decision = { skipped: `data not live — ${why ?? 'unknown'}` }
    else { const s = await scoreAt(lastClose)
      if (s.why) out.decision = { skipped: s.why }
      else { out.decision = { score: +s.score.toFixed(5), threshold: +s.threshold.toFixed(5), fires: s.score >= s.threshold, model_year: s.model_year }
        if (s.score >= s.threshold && (!out.last_closed || Date.parse(out.last_closed.closedAt) < s.decisionT)) {
          const { i: _row, ...sig } = sellSig(s.B, s.i, s.A, 'X3', s.decisionT)
          out.open = { id: `MLSELL@${s.decisionT}`, sig, score: out.decision.score, threshold: out.decision.threshold, model_year: s.model_year, opened: new Date().toISOString(), status: 'OPEN', paper: true }
          if (write) fs.appendFileSync(ML_SELL.journal, JSON.stringify({ ...out.open, status: 'OPENED' }) + '\n') } } } }
  if (write) { fs.writeFileSync(ML_SELL.state + '.tmp', JSON.stringify(out, null, 1)); fs.renameSync(ML_SELL.state + '.tmp', ML_SELL.state); writeReview()
    // every decision's score, one short line per 3m bar (2026-10-26, Ashraf "we are not getting any sell trades": only the LAST score was kept, so "how
    // close did it get today?" needed a 15-minute replay) — a skipped tick logs its reason
    if (out.decision) fs.appendFileSync(ML_SELL.scores, JSON.stringify({ bar: out.bar, ...(out.decision.skipped ? { skipped: out.decision.skipped } : { s: out.decision.score, thr: out.decision.threshold, fires: out.decision.fires }) }) + '\n') }
  return out
}
/** Paper review vs the measured backtest (scored like the other paper books: n, WR = $ > 0, $/t). */
export function writeReview() {
  const C = rows(ML_SELL.journal).filter((r) => r.status === 'CLOSED'), n = C.length, w = C.filter((r) => r.pnl > 0).length, net = C.reduce((a, r) => a + r.pnl, 0)
  const m = loadModel(new Date().getUTCFullYear())
  const rv = { at: new Date().toISOString(), paper_since: rows(ML_SELL.journal)[0]?.opened ?? null, closed: n, wins: w, wr: n ? +(w / n).toFixed(4) : null, net: +net.toFixed(2), per_trade: n ? +(net / n).toFixed(3) : null,
    outcomes: C.reduce((o, r) => ((o[r.outcome] = (o[r.outcome] ?? 0) + 1), o), {}), measured_backtest: m?.measured ?? null, verdict: n < 30 ? `NO VERDICT YET (${n}/30 closed)` : 'compare with the measured backtest' }
  fs.writeFileSync(ML_SELL.review + '.tmp', JSON.stringify(rv, null, 1)); fs.renameSync(ML_SELL.review + '.tmp', ML_SELL.review); return rv
}
