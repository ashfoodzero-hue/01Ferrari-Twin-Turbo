// ════════════════════════════════════════════════════════════════════════════════
// tradeMonitor.js — IN-TRADE CONFIDENCE for an open Ferrari Matrix trade: P(TP1) and P(TP2) from the trade's live state (2026-10-09;
// Ashraf: "give a confidence % to stay on the trade or advice to close it when we see the real risk only against the trade").
// ONE module: the study (scripts/study_trade_monitor.mjs — replay + fit + validation) and the live endpoint (/api/monitor).
// ────────────────────────────────────────────────────────────────────────────────
// STATE at a minute close (only what is known then), for a BUY (SELL mirrored):
//   phase 1 (TP1 not yet hit): p = (bid − SL) / (TP1 − SL)  · phase 2 (TP1 hit, stop at the fill): p = (bid − fill) / (TP2 − fill)
//   the RANDOM-WALK baseline = p itself (the "correct math" without information)
//   features: logit(p), log(1 + minutes in trade), MAE and MFE so far in R, DXY move since entry against/for the trade (in DXY ATR units),
//   silver move since entry for/against (in silver ATR units), tick-activity ratio (last 5 min vs the 60 min before entry)
// The model is a plain logistic regression per phase — coefficients live in data/master/trade_monitor_model.json (fit on TRAIN only).
// ════════════════════════════════════════════════════════════════════════════════
export const MON = Object.freeze({ clampP: 0.02 })

const logit = (p) => Math.log(p / (1 - p))
const sig = (z) => 1 / (1 + Math.exp(-z))

/** the trade-state point → the feature vector (fixed order; phase-specific model). */
export function features(s) {
  const p = Math.min(1 - MON.clampP, Math.max(MON.clampP, s.p))
  return [1, logit(p), Math.log1p(s.minutes), s.maeR, s.mfeR, s.dxyFor ?? 0, s.xagFor ?? 0, Math.log(Math.max(0.1, s.act ?? 1))]
}
export const FEATURE_NAMES = ['bias', 'logit(position)', 'log(1+minutes)', 'MAE (R)', 'MFE (R)', 'DXY for the trade', 'silver for the trade', 'log activity']

/** P(target) from a fitted model {w} (or the random-walk baseline when no model). */
export function predict(model, s) {
  if (!model?.w) return Math.min(1, Math.max(0, s.p))
  const x = features(s); let z = 0; for (let i = 0; i < x.length; i++) z += model.w[i] * x[i]; return sig(z)
}

/** Logistic regression by plain gradient descent with L2 (deterministic). rows: [{ x:[...], y:0|1 }] */
export function fitLogistic(rows, { iters = 400, lr = 0.5, l2 = 1e-4 } = {}) {
  const d = rows[0].x.length, w = new Array(d).fill(0), n = rows.length
  // standardise columns (except bias) for stable steps, then fold the scaling back into w
  const mu = new Array(d).fill(0), sd = new Array(d).fill(1)
  for (let j = 1; j < d; j++) { let s = 0, q = 0; for (const r of rows) { s += r.x[j]; q += r.x[j] * r.x[j] } mu[j] = s / n; sd[j] = Math.sqrt(Math.max(1e-12, q / n - mu[j] * mu[j])) }
  const z = (r, j) => (j === 0 ? 1 : (r.x[j] - mu[j]) / sd[j])
  for (let it = 0; it < iters; it++) {
    const g = new Array(d).fill(0)
    for (const r of rows) { let t = 0; for (let j = 0; j < d; j++) t += w[j] * z(r, j); const e = sig(t) - r.y; for (let j = 0; j < d; j++) g[j] += e * z(r, j) }
    for (let j = 0; j < d; j++) w[j] -= lr * (g[j] / n + (j ? l2 * w[j] : 0))
  }
  const raw = new Array(d).fill(0); raw[0] = w[0]; for (let j = 1; j < d; j++) { raw[j] = w[j] / sd[j]; raw[0] -= w[j] * mu[j] / sd[j] }
  return { w: raw }
}

export const brier = (rows, f) => rows.reduce((s, r) => s + (f(r) - r.y) ** 2, 0) / rows.length

/**
 * LIVE monitor state for an open trade — PURE (the chart's /api/monitor and the smoke test both call it).
 * The position formula is what is shown: it has no fitted parameters and is MEASURED calibrated (study_trade_monitor.mjs); the fitted model and
 * the close advice are reported only through `study.verdict` / `study.close_advice`.
 * @param resolve  ferrariMatrix.resolveMatrixTrade (passed in — the SAME rules as the backtest)
 */
export function liveMonitor({ sig: s, m1, quote, spreadAt, study, now, resolve }) {
  const up = s.side === 'BUY', r = resolve(s, m1, spreadAt, { nowT: now })
  if (r.done) return { open: true, done: true, outcome: r.outcome, note: 'the trade has finished — the box clears at the next 3m tick' }
  const px = quote ? (up ? quote.bid : quote.ask) : null; if (px == null) return { open: true, error: 'no live quote' }
  const fill = r.fill, phase = r.tp1Hit ? 2 : 1
  const p = phase === 1 ? (up ? (px - s.sl) / (s.tp1 - s.sl) : (s.sl - px) / (s.sl - s.tp1)) : (up ? (px - fill) / (s.tp2 - fill) : (fill - px) / (fill - s.tp2))
  const clamp = (x) => Math.max(0, Math.min(1, x)), tp2AfterTp1 = up ? (s.tp1 - fill) / (s.tp2 - fill) : (fill - s.tp1) / (fill - s.tp2)
  const cal = (ph) => { const devs = ['oos_A13', 'oos_W2'].flatMap((a) => study?.phases?.[ph]?.[a]?.coin_flip_calibration ?? []).filter((d) => d.n >= 200).map((d) => Math.abs(d.predicted - d.observed)); return devs.length ? +Math.max(...devs).toFixed(3) : null }
  let mae = 0, mfe = 0; for (const b of m1) { if (b.t < s.decisionT) continue; mae = Math.max(mae, up ? fill - b.l : b.h - fill); mfe = Math.max(mfe, up ? b.h - fill : fill - b.l) }
  return { open: true, side: s.side, phase, price: px, fill, minutes: Math.round((now - s.decisionT) / 60000), mae: +mae.toFixed(2), mfe: +mfe.toFixed(2), risk: +s.risk.toFixed(2),
    p_tp1: phase === 1 ? +clamp(p).toFixed(3) : 1, p_tp2: phase === 2 ? +clamp(p).toFixed(3) : +(clamp(p) * clamp(tp2AfterTp1)).toFixed(3), p_tp2_after_tp1: +clamp(tp2AfterTp1).toFixed(3),
    method: 'position between stop and target (no fitted parameters)', calibration_max_error: { tp1: cal('1'), tp2: cal('2') },
    model: study ? { valid: study.verdict.monitor_valid, note: study.verdict.monitor_valid ? 'fitted model validated' : 'fitted model (DXY, silver, activity, time, MAE/MFE) did NOT beat the position formula out of sample — not used' } : null,
    close_advice: study?.close_advice ? { shown: study.close_advice.shown, note: study.close_advice.shown ? 'validated' : `no close rule beat holding (OOS 13y ${study.close_advice.oos_A13_gain >= 0 ? '+' : ''}${study.close_advice.oos_A13_gain} $/trade, live strategy ${study.close_advice.oos_W2_gain} $/trade) — hold to TP / SL` } : null }
}
