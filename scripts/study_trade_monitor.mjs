// ════════════════════════════════════════════════════════════════════════════════
// study_trade_monitor.mjs — the IN-TRADE MONITOR: is a live P(TP1) / P(TP2) for an open Matrix trade MEASURABLY better than the
// coin-flip math, and is there a close-advice rule that beats holding? (2026-10-09)
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run).
//   trades   = scripts/lib/matrix_trades.mjs: A13 = without WTI, 2013-07 → VAL_TO (17k) · W2 = with WTI, 2024-10 → VAL_TO (the live strategy)
//   REPLAY   = minute by minute with the EXACT rules of ferrariMatrix.resolveMatrixTrade (fill at the ask, stop first, TP1 → stop to the fill,
//              TP2, 24 h) — PARITY: every replayed trade's P&L must equal the trade's own P&L (else the study aborts)
//   samples  = every 3rd minute close while the trade is open (max 480 min), state per src/master/tradeMonitor.js; outcome = TP1 reached
//              (phase 1) / TP2 reached (phase 2)
//   SPLIT    = chronological: TRAIN = A13 trades before 2023-01-01; OOS = A13 trades from 2023-01-01 AND every W2 trade (time-disjoint)
//   MODEL    = logistic per phase, fit on TRAIN (tradeMonitor.fitLogistic)
//   VALID ⇔ in BOTH OOS arms and BOTH phases: Brier(model) < Brier(random-walk p) AND < Brier(constant TRAIN base rate) AND every
//            calibration decile with n ≥ 200 within 0.08 of its observed rate
//   CLOSE ADVICE: exit at the market at the FIRST sample with P(TP1) < θ (phase 1) / P(TP2) < θ (phase 2, remaining half); θ chosen on TRAIN
//            from {0.05 … 0.40}; SHOWN ⇔ A13-OOS paired (exit − hold) $/trade bootstrap 2.5 % bound > 0 AND W2 mean (exit − hold) > 0
// Output: data/master/trade_monitor_model.json (coefficients + validation) · data/master/trade_monitor_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { MATRIX } from '../src/master/ferrariMatrix.js'
import { features, predict, fitLogistic, brier, FEATURE_NAMES } from '../src/master/tradeMonitor.js'
import { matrixTrades } from './lib/matrix_trades.mjs'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), SPLIT = Date.parse('2023-01-01T00:00:00Z')
const STRIDE = 3, MAXMIN = 480, THETAS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4], spreadAt = makeSpreadAt(), rnd = seeded(7070707)
const FROM13 = HISTORY_CONTINUOUS_FROM + 7 * 86400000
// context series (closed bars only are ever used at a sample)
const D1 = (await loadDxyBars('1m', { from: FROM13 - 86400000, to: VAL_TO })).bars, DT = Float64Array.from(D1.map((b) => b.t))
const X1 = (await loadBars('XAGUSD', '1m', { from: FROM13 - 86400000, to: VAL_TO })).bars, XT = Float64Array.from(X1.map((b) => b.t))
const DH = (await loadDxyBars('1h', { from: FROM13 - 30 * 86400000, to: VAL_TO })).bars, DHA = atrArr(DH, 14), DHT = Float64Array.from(DH.map((b) => b.t + 3600000))
const XH = (await loadBars('XAGUSD', '1h', { from: FROM13 - 30 * 86400000, to: VAL_TO })).bars, XHA = atrArr(XH, 14), XHT = Float64Array.from(XH.map((b) => b.t + 3600000))
const lbA = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const lastClose = (A, T, t) => { const k = lbA(T, t + 1) - 1; return k >= 0 && t - T[k] <= 5 * 60000 ? A[k].c : null }   // the last 1m close at/before t
const atrAt = (T, A, t) => { const k = lbA(T, t + 1) - 1; return k >= 0 ? A[k] : null }   // ATR of the last 1h bar closed by t
console.log(`context: DXY 1m ${D1.length.toLocaleString()} · XAG 1m ${X1.length.toLocaleString()}`)

/** replay one trade minute by minute (resolveMatrixTrade rules) → { pnl, samples[] } */
function replay(f, m1, k0) {
  const s = f.sig, up = s.side === 'BUY', s0 = spreadAt(s.decisionT - 60000), fill = up ? s.entry + s0 : s.entry, slip = Math.min(0.30, 0.05 * (s.atr || 0)), end = s.decisionT + MATRIX.horizonMin * 60000, R = s.risk
  const pnlAt = (px) => (up ? px - fill : fill - px)
  let stop = s.sl, tp1Hit = false, leg1 = null, leg2 = null, last = null, mae = 0, mfe = 0
  const d0 = lastClose(D1, DT, s.decisionT - 60000), x0 = lastClose(X1, XT, s.decisionT - 60000), dA = atrAt(DHT, DHA, s.decisionT), xA = atrAt(XHT, XHA, s.decisionT)
  let pre = 0, preN = 0; for (let k = Math.max(0, k0 - 60); k < k0; k++) { pre += m1[k].v || 0; preN++ }
  const preRate = preN ? pre / preN : null, samples = [], vol = []
  for (let k = k0; k < m1.length; k++) { const b = m1[k]
    if (b.t < s.decisionT) continue
    if (b.t >= end) break
    last = b; const sp = up ? 0 : spreadAt(b.t), hi = b.h + sp, lo = b.l + sp
    if (up ? lo <= stop : hi >= stop) { const px = up ? stop - slip : stop + slip; if (!tp1Hit) leg1 = pnlAt(px); leg2 = pnlAt(px); break }
    if (!tp1Hit && (up ? hi >= s.tp1 : lo <= s.tp1)) { tp1Hit = true; leg1 = pnlAt(s.tp1); stop = fill }
    if (tp1Hit && (up ? hi >= s.tp2 : lo <= s.tp2)) { leg2 = pnlAt(s.tp2); break }
    mae = Math.max(mae, (up ? fill - lo : hi - fill) / R); mfe = Math.max(mfe, (up ? hi - fill : fill - lo) / R)
    vol.push(b.v || 0)
    const mins = (b.t - s.decisionT) / 60000 + 1
    if (mins % STRIDE === 0 && mins <= MAXMIN) {
      const c = up ? b.c : b.c + spreadAt(b.t)
      const p = !tp1Hit ? (up ? (c - s.sl) / (s.tp1 - s.sl) : (s.sl - c) / (s.sl - s.tp1)) : (up ? (c - fill) / (s.tp2 - fill) : (fill - c) / (fill - s.tp2))
      const d = lastClose(D1, DT, b.t), x = lastClose(X1, XT, b.t), dir = up ? 1 : -1
      const act = preRate ? (vol.slice(-5).reduce((a, v) => a + v, 0) / Math.min(5, vol.length)) / preRate : null
      samples.push({ phase: tp1Hit ? 2 : 1, p, minutes: mins, maeR: mae, mfeR: mfe, dxyFor: d0 != null && d != null && dA > 0 ? -dir * (d - d0) / dA : 0, xagFor: x0 != null && x != null && xA > 0 ? dir * (x - x0) / xA : 0, act: act ?? 1,
        exitNow: (up ? b.c : b.c + spreadAt(b.t)) , t: b.t })
    }
  }
  if (leg1 == null || leg2 == null) { if (last && last.t + 60000 >= end) { const px = up ? last.c : last.c + spreadAt(last.t); if (leg1 == null) leg1 = pnlAt(px) - slip; if (leg2 == null) leg2 = pnlAt(px) - slip } }
  const pnl = leg1 == null || leg2 == null ? null : +(0.5 * leg1 + 0.5 * leg2).toFixed(4)
  const reachedTp1 = tp1Hit, reachedTp2 = leg2 != null && Math.abs(leg2 - pnlAt(s.tp2)) < 1e-9
  for (const x of samples) { x.y = x.phase === 1 ? (reachedTp1 ? 1 : 0) : (reachedTp2 ? 1 : 0)
    const exitPnl = pnlAt(x.exitNow) - slip; x.exitTotal = x.phase === 1 ? exitPnl : 0.5 * leg1 + 0.5 * exitPnl }
  return { pnl, samples, fill }
}

async function arm(name, from, useWti) {
  const { fires, m1 } = await matrixTrades({ from, to: VAL_TO, useWti, spreadAt }), MT = Float64Array.from(m1.map((b) => b.t))
  const out = []; let mismatch = 0
  for (const f of fires) { const k0 = lbA(MT, f.sig.decisionT), r = replay(f, m1, k0)
    if (r.pnl == null || Math.abs(r.pnl - f.net) > 1e-6) { mismatch++; continue }
    out.push({ t: f.t, net: f.net, samples: r.samples }) }
  console.log(`${name}: trades ${fires.length} · replay parity ${fires.length - mismatch}/${fires.length} · samples ${out.reduce((s, x) => s + x.samples.length, 0).toLocaleString()}`)
  if (mismatch) throw new Error(`${name}: ${mismatch} replayed trades do not reproduce their P&L — the monitor would not follow the backtest rules`)
  return out
}
const A13 = await arm('A13 (no WTI, 13y)', FROM13, false), W2 = await arm('W2 (with WTI, live strategy)', WTI_FROM, true)
const rowsOf = (trades, phase) => trades.flatMap((tr) => tr.samples.filter((s) => s.phase === phase).map((s) => ({ ...s, x: features(s) })))
const TR = A13.filter((t) => t.t < SPLIT), O13 = A13.filter((t) => t.t >= SPLIT)
const result = { at: new Date().toISOString(), rules: { split: '2023-01-01', stride_min: STRIDE, max_min: MAXMIN, features: FEATURE_NAMES }, phases: {} }, model = { features: FEATURE_NAMES, phases: {} }
for (const phase of [1, 2]) {
  const tr = rowsOf(TR, phase), m = fitLogistic(tr), base = tr.reduce((s, r) => s + r.y, 0) / tr.length
  model.phases[phase] = { w: m.w, train_n: tr.length, train_base_rate: +base.toFixed(4) }
  const evalArm = (rows) => { const bm = brier(rows, (r) => predict(m, r)), brw = brier(rows, (r) => Math.min(1, Math.max(0, r.p))), bc = brier(rows, () => base)
    const dec = []; for (let d = 0; d < 10; d++) { const xs = rows.filter((r) => { const q = predict(m, r); return q >= d / 10 && q < (d + 1) / 10 }); if (xs.length) dec.push({ bin: `${d * 10}-${d * 10 + 10}%`, n: xs.length, predicted: +(xs.reduce((s, r) => s + predict(m, r), 0) / xs.length).toFixed(3), observed: +(xs.reduce((s, r) => s + r.y, 0) / xs.length).toFixed(3) }) }
    const calOk = dec.filter((d) => d.n >= 200).every((d) => Math.abs(d.predicted - d.observed) <= 0.08)
    return { n: rows.length, brier_model: +bm.toFixed(5), brier_random_walk: +brw.toFixed(5), brier_constant: +bc.toFixed(5), calibration: dec, calibrated: calOk, valid: bm < brw && bm < bc && calOk } }
  // DIAGNOSTIC (added after the first run, labelled): is the fit converged? On TRAIN the model contains logit(p) and must be ≥ as good as p
  const trB = { model: +brier(tr, (r) => predict(m, r)).toFixed(5), random_walk: +brier(tr, (r) => Math.min(1, Math.max(0, r.p))).toFixed(5) }
  const m2 = fitLogistic(tr, { iters: 3000, lr: 1 }), trB2 = +brier(tr, (r) => predict(m2, r)).toFixed(5)
  const rwDec = (rows) => { const out = []; for (let d = 0; d < 10; d++) { const xs = rows.filter((r) => { const q = Math.min(0.9999, Math.max(0, r.p)); return q >= d / 10 && q < (d + 1) / 10 }); if (xs.length) out.push({ bin: `${d * 10}-${d * 10 + 10}%`, n: xs.length, predicted: +(xs.reduce((a, r) => a + Math.min(1, Math.max(0, r.p)), 0) / xs.length).toFixed(3), observed: +(xs.reduce((a, r) => a + r.y, 0) / xs.length).toFixed(3) }) } return out }
  console.log(`  diag phase ${phase}: TRAIN Brier model(400 it) ${trB.model} · model(3000 it) ${trB2} · coin-flip ${trB.random_walk}`)
  const r13 = evalArm(rowsOf(O13, phase)), r2 = evalArm(rowsOf(W2, phase))
  r13.coin_flip_calibration = rwDec(rowsOf(O13, phase)); r2.coin_flip_calibration = rwDec(rowsOf(W2, phase))
  const r13b = brier(rowsOf(O13, phase), (r) => predict(m2, r)), r2b = brier(rowsOf(W2, phase), (r) => predict(m2, r))
  console.log(`  diag phase ${phase}: OOS Brier with the 3000-it fit: 13y ${r13b.toFixed(5)} · W2 ${r2b.toFixed(5)}`)
  console.log(`  diag phase ${phase}: coin-flip calibration OOS-13y ` + r13.coin_flip_calibration.map((d) => `${d.bin}:${d.observed}(n${d.n})`).join(' '))
  result.phases[phase] = { train_n: tr.length, diagnostic: { train_brier: trB, train_brier_3000it: trB2 }, coefficients: Object.fromEntries(FEATURE_NAMES.map((k, i) => [k, +m.w[i].toFixed(4)])), oos_A13: r13, oos_W2: r2, valid: r13.valid && r2.valid }
  console.log(`phase ${phase} (${phase === 1 ? 'P(TP1)' : 'P(TP2 | TP1)'}): Brier OOS-13y model ${r13.brier_model} vs coin-flip ${r13.brier_random_walk} vs constant ${r13.brier_constant} · calibrated ${r13.calibrated} | W2 model ${r2.brier_model} vs ${r2.brier_random_walk} vs ${r2.brier_constant} · calibrated ${r2.calibrated} → ${result.phases[phase].valid ? 'VALID' : 'NOT VALID'}`)
}
// CLOSE ADVICE: θ on TRAIN, then paired (exit − hold) on OOS
const decide = (trades, theta) => trades.map((tr) => { const s = tr.samples.find((x) => predict(model.phases[x.phase], x) < theta); return s ? s.exitTotal - tr.net : 0 })
const meanOf = (a) => a.reduce((s, x) => s + x, 0) / a.length
let best = null; for (const th of THETAS) { const m = meanOf(decide(TR, th)); if (!best || m > best.m) best = { th, m } }
const d13 = decide(O13, best.th), d2 = decide(W2, best.th), boots = []
for (let b = 0; b < 2000; b++) { let s = 0; for (let j = 0; j < d13.length; j++) s += d13[(rnd() * d13.length) | 0]; boots.push(s / d13.length) }; boots.sort((a, b) => a - b)
result.close_advice = { theta: best.th, train_gain: +best.m.toFixed(4), oos_A13_gain: +meanOf(d13).toFixed(4), oos_A13_lb: +boots[50].toFixed(4), oos_W2_gain: +meanOf(d2).toFixed(4), triggered_share_A13: +(d13.filter((x) => x !== 0).length / d13.length).toFixed(3),
  shown: boots[50] > 0 && meanOf(d2) > 0 }
console.log(`close advice: θ ${best.th} (TRAIN +$${best.m.toFixed(3)}/trade) · OOS-13y ${result.close_advice.oos_A13_gain} [LB ${result.close_advice.oos_A13_lb}] · W2 ${result.close_advice.oos_W2_gain} → ${result.close_advice.shown ? 'SHOWN' : 'NOT SHOWN (it does not beat holding)'}`)
result.verdict = { monitor_valid: result.phases[1].valid && result.phases[2].valid, phase1_valid: result.phases[1].valid, phase2_valid: result.phases[2].valid, close_advice_shown: result.close_advice.shown }
model.validation = result.verdict; model.close_advice = { theta: best.th, shown: result.close_advice.shown }; model.at = result.at
fs.writeFileSync(path.join(TURBO.master, 'trade_monitor_model.json'), JSON.stringify(model, null, 1))
fs.writeFileSync(path.join(TURBO.master, 'trade_monitor_study.json'), JSON.stringify(result, null, 1))
console.log(`\n=> TRADE MONITOR: ${JSON.stringify(result.verdict)}`)
