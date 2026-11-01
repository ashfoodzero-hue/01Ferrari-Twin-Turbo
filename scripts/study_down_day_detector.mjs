// study_down_day_detector.mjs — EARLY DOWN-DAY DETECTOR as a gate for the no-wall continuation SELL. Spec docs/DOWN_DAY_DETECTOR_SPEC.md + ADDENDUM A
// (pre-registered 2026-11-01 before any number; Ashraf: "Yes, write it" → "pls continue here now"). Why: §7 (fo) — NW SELL +$7.75/t on big DOWN days,
// −$5.95/t on big UP days, 0/4 as a standalone rule. READ-ONLY research: nothing live is touched. → data/master/down_day_detector_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { wti1m } from './lib/matrix_trades.mjs'
import { makeAligned } from './lib/matrix_aligned.mjs'
import { makeNowall } from './lib/matrix_nowall.mjs'
import { findChochs } from './lib/choch4h.mjs'
import { MATRIX, resolveMatrixTrade } from '../src/master/ferrariMatrix.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { tradingDate } from '../src/core/nyCandles.js'
import { blockBootstrapMean, wilson, rng } from '../src/core/studyStats.js'

const TO = Date.parse('2026-10-30T21:00:00Z'), SPLIT = Date.parse('2021-06-30T12:00:00Z'), FROM13 = Date.parse('2013-07-21T00:00:00Z'), FROM2 = Date.parse('2024-10-10T00:00:00Z')
const CKS = [4, 8, 12, 16], K = 12, LEVEL = 1 - (2 * 0.05) / K, H = 3600000, DAY = 86400000, FRI_TD = tradingDate(Date.parse('2026-10-30T12:00:00Z'))
const spreadAt = makeSpreadAt(), audit = { lookahead_violations: 0 }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), KT = kit('XAUUSD', { reopenClamp: false })
const { stateAt } = makeAligned(M, KT), WT = wti1m(TO), nwSignals = makeNowall({ stateAt, WT, audit })

// ── days, ATR(14, 1D) of COMPLETED days, labels (Addendum A.1) ──
const C1 = KT.build(M, '1D').filter((c) => c.close_t <= TO)
const atrB = new Array(C1.length).fill(null); { let a = null
  for (let i = 1; i < C1.length; i++) { const c = C1[i - 1], p = C1[i - 2], tr = p ? Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)) : c.h - c.l
    a = a == null ? tr : (a * 13 + tr) / 14; if (i >= 15) atrB[i] = a } }   // atrB[i] = ATR of days before i (Wilder, 14)
const move = C1.map((c, i) => (atrB[i] ? (c.c - c.o) / atrB[i] : null))
const isTrain = (t) => t >= FROM13 && t < SPLIT, isOos = (t) => t >= SPLIT
const trMoves = C1.map((c, i) => (isTrain(c.t) && move[i] != null ? move[i] : null)).filter((x) => x != null).sort((a, b) => a - b)
const THR_DOWN = trMoves[Math.floor(trMoves.length * 0.2)], THR_UP = trMoves[Math.floor(trMoves.length * 0.8)]
const y = move.map((m) => (m == null ? null : m <= THR_DOWN ? 1 : 0)), isUp = move.map((m) => m != null && m >= THR_UP)
const dayIdx = new Map(C1.map((c, i) => [c.td, i]))

// ── series helpers (each returns the value known at time T; Addendum A.2-A.5) ──
const MT = M.map((b) => b.t), last = (T, arr, end) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (end(arr[m]) <= T) lo = m + 1; else hi = m } return lo - 1 }
const priceAt = (T) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] + 60000 <= T) lo = m + 1; else hi = m } return lo ? M[lo - 1].c : null }
const ch1d = findChochs(C1, M, {}).state, T1D = C1.map((c) => c.close_t), state1D = (T) => { const k = last(T, T1D, (x) => x); return k >= 0 ? ch1d[k] : 0 }
const D3 = (await loadDxyBars('3m', { from: FROM13 - 5 * DAY, to: TO })).bars, dxyAt = (T) => { const k = last(T, D3, (b) => b.t + 180000); return k >= 0 ? D3[k].c : null }
const RAW = path.join(TURBO.root, 'data', 'research', 'down_day', 'raw'); fs.mkdirSync(RAW, { recursive: true })
const dfFile = path.join(RAW, 'DFII10.json')
if (!fs.existsSync(dfFile)) fs.writeFileSync(dfFile, await (await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=DFII10&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=2012-01-01`)).text())
const DF = JSON.parse(fs.readFileSync(dfFile, 'utf8')).observations.filter((o) => o.value !== '.').map((o) => ({ known: Date.parse(o.date + 'T00:00:00Z') + DAY, v: +o.value }))
const dfiiChg = (S) => { const k = last(S, DF, (o) => o.known); return k >= 1 ? DF[k].v - DF[k - 1].v : null }
const EV = []; for (const l of fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'ff_history.jsonl'), 'utf8').split('\n')) { if (!l) continue; const r = JSON.parse(l); if (r.impact === 'high') EV.push(r.t) }
const ffEnd = Math.max(...EV); for (const e of JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events ?? []) if (e.t > ffEnd) EV.push(e.t)
EV.sort((a, b) => a - b); const evIn = (a, b) => { const k = last(a - 1, EV, (x) => x); return EV[k + 1] != null && EV[k + 1] < b ? 1 : 0 }

const FNAMES = ['F1_day_so_far', 'F2_prev_day', 'F3_below_prev_low', 'F3_dist_prev_low', 'F4_1H', 'F4_4H', 'F5_1D', 'F6_dxy_session', 'F6_dxy_24h', 'F7_real10y_chg', 'F8_release_later', 'F9_friday']
function features(i, h, { futureF1 = false } = {}) {
  const c = C1[i], p = C1[i - 1], a = atrB[i], cp = c.t + h * H; if (!a || !p || cp >= c.close_t) return null
  const pr = priceAt(futureF1 ? cp + H : cp), d0 = dxyAt(c.t), d1 = dxyAt(cp), d24 = dxyAt(cp - DAY), df = dfiiChg(c.t)
  if (pr == null || !d0 || !d1 || !d24 || df == null || move[i - 1] == null) return null
  return [(pr - c.o) / a, move[i - 1], pr < p.l ? 1 : 0, (pr - p.l) / a, stateAt('1H', cp), stateAt('4H', cp), state1D(cp), 100 * Math.log(d1 / d0), 100 * Math.log(d1 / d24), df, evIn(cp, c.close_t), new Date(c.td).getUTCDay() === 5 ? 1 : 0]
}

// ── logistic regression, IRLS + ridge 1e-4 on standardised features (Addendum A.6) ──
function fitLogit(X, Y) {
  const p = X[0].length, mu = Array(p).fill(0), sd = Array(p).fill(0)
  for (const x of X) x.forEach((v, j) => (mu[j] += v / X.length)); for (const x of X) x.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / X.length))
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j]) || 1
  const Z = X.map((x) => [1, ...x.map((v, j) => (v - mu[j]) / sd[j])]), q = p + 1; let w = Array(q).fill(0)
  for (let it = 0; it < 50; it++) {
    const g = Array(q).fill(0), Hm = Array.from({ length: q }, () => Array(q).fill(0))
    Z.forEach((z, n) => { const pr = 1 / (1 + Math.exp(-z.reduce((s, v, j) => s + v * w[j], 0))), r = pr * (1 - pr)
      for (let j = 0; j < q; j++) { g[j] += (Y[n] - pr) * z[j]; for (let k = 0; k < q; k++) Hm[j][k] += r * z[j] * z[k] } })
    for (let j = 1; j < q; j++) { g[j] -= 1e-4 * w[j]; Hm[j][j] += 1e-4 }
    const step = solve(Hm, g); w = w.map((v, j) => v + step[j]); if (Math.max(...step.map(Math.abs)) < 1e-8) break }
  return { w, mu, sd, predict: (x) => 1 / (1 + Math.exp(-(w[0] + x.reduce((s, v, j) => s + w[j + 1] * (v - mu[j]) / sd[j], 0)))) }
}
function solve(A, b) { const n = b.length, M2 = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r; [M2[c], M2[p]] = [M2[p], M2[c]]
    for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c] / M2[c][c]; for (let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k] } }
  return M2.map((r, i) => r[n] / r[i]) }

// ── T-A per checkpoint ──
const out = { spec: 'docs/DOWN_DAY_DETECTOR_SPEC.md + ADDENDUM A', built_at: new Date().toISOString(), tape_to: new Date(TO).toISOString(), K, thresholds: { down: THR_DOWN, up: THR_UP }, features: FNAMES, checkpoints: {}, audits: audit }
const gate = {}, prob = {}
for (const h of CKS) {
  const tr = [], oos = []; for (let i = 1; i < C1.length; i++) { if (y[i] == null) continue; const x = features(i, h); if (!x) continue; (isTrain(C1[i].t) ? tr : isOos(C1[i].t) ? oos : []).push({ i, x }) }
  const m = fitLogit(tr.map((r) => r.x), tr.map((r) => y[r.i])), p0 = tr.reduce((s, r) => s + y[r.i], 0) / tr.length
  const ptr = tr.map((r) => m.predict(r.x)).sort((a, b) => a - b), thr = ptr[Math.floor(ptr.length * 0.7)]
  gate[h] = new Map(); prob[h] = new Map(); for (const r of [...tr, ...oos]) { const pv = m.predict(r.x); prob[h].set(r.i, pv); gate[h].set(r.i, pv >= thr) }
  const brier = (rows, f) => rows.reduce((s, r) => s + (f(r) - y[r.i]) ** 2, 0) / rows.length
  const bsO = brier(oos, (r) => m.predict(r.x)), bs0 = brier(oos, () => p0)
  const lbD = blockBootstrapMean(oos.map((r) => ({ t: C1[r.i].t, x: (p0 - y[r.i]) ** 2 - (m.predict(r.x) - y[r.i]) ** 2 })), { level: LEVEL }).lo
  const open = oos.filter((r) => gate[h].get(r.i)), hits = open.filter((r) => y[r.i] === 1).length, downs = oos.filter((r) => y[r.i] === 1).length
  // audit 1b: a leaking F1 (price one hour AFTER the checkpoint) must change the skill — shows the test can see a leak
  const mL = fitLogit(tr.map((r) => features(r.i, h, { futureF1: true })), tr.map((r) => y[r.i])), bsL = brier(oos, (r) => mL.predict(features(r.i, h, { futureF1: true })))
  // audit 2: shuffled TRAIN labels → refit → OOS skill must be ≤ 0 in ≥ 95 % of 200 shuffles
  const R = rng(7); let noSkill = 0
  for (let s = 0; s < 200; s++) { const Ys = tr.map((r) => y[r.i]); for (let k = Ys.length - 1; k > 0; k--) { const j = (R() * (k + 1)) | 0; [Ys[k], Ys[j]] = [Ys[j], Ys[k]] }
    const ms = fitLogit(tr.map((r) => r.x), Ys); if (brier(oos, (r) => ms.predict(r.x)) >= bs0) noSkill++ }
  out.checkpoints[h] = { n_train: tr.length, n_oos: oos.length, base_rate_train: +p0.toFixed(4), gate_threshold: +thr.toFixed(4), coefs: Object.fromEntries(['intercept', ...FNAMES].map((k, j) => [k, +m.w[j].toFixed(4)])),
    TA: { brier_oos: +bsO.toFixed(5), brier_climatology: +bs0.toFixed(5), skill: +(1 - bsO / bs0).toFixed(4), diff_lb: +lbD.toFixed(6), precision_open: +(hits / open.length).toFixed(3), precision_wilson_lb: +wilson(hits, open.length).lo.toFixed(3), recall: +(hits / downs).toFixed(3), open_days_oos: open.length },
    audit_leak_futureF1_skill: +(1 - bsL / bs0).toFixed(4), audit_shuffle_no_skill_share: noSkill / 200 }
  console.log('T-A', h, JSON.stringify(out.checkpoints[h].TA), 'leak', out.checkpoints[h].audit_leak_futureF1_skill, 'shuffle', noSkill / 200)
}

// ── T-B: NW trades resolved once, then sequenced per gate (Addendum A.7) ──
async function resolved(from, wti) {
  const B = (await loadBars('XAUUSD', '3m', { from: from - 3 * DAY, to: TO })).bars, D = (await loadDxyBars('3m', { from: from - 3 * DAY, to: TO })).bars, m1 = (await loadBars('XAUUSD', '1m', { from, to: TO })).bars
  const T1 = m1.map((b) => b.t), lb = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
  const startI = B.findIndex((b) => b.t >= from)
  return nwSignals({ wti, struct: false })(B, D, startI).map((s) => { const k = lb(s.decisionT), r = resolveMatrixTrade(s, m1.slice(k, k + MATRIX.horizonMin + 5), spreadAt)
    return { t: s.decisionT, done: r.done, exitT: r.exitT, net: r.pnl, raw: r.outcome, i: dayIdx.get(tradingDate(s.decisionT)), entry: s.entry } })
}
function sequence(S, keep) { const F = []; let busy = -Infinity
  for (const s of S) { if (!keep(s)) continue; if (s.t <= busy) continue; if (!s.done) continue; busy = s.exitT + 60000; F.push(s) } return F }
const stat = (F) => { const n = F.length, s = F.reduce((a, f) => a + f.net, 0); return { n, wr: n ? +(F.filter((f) => f.net > 0).length / n).toFixed(3) : null, usd: n ? +(s / n).toFixed(3) : null, total: +s.toFixed(1) } }
const lbOf = (F) => (F.length ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo).toFixed(3) : null)
const gateKeep = (h) => (s) => s.i != null && gate[h].get(s.i) === true && s.t >= C1[s.i].t + h * H
const prev = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'matrix_nowall_sell_study.json'), 'utf8'))
const S13 = await resolved(FROM13, false), S2 = await resolved(FROM2, true)
const U13 = sequence(S13, () => true), U2 = sequence(S2, () => true)
audit.parity_ungated = { y13: { mine: stat(U13), fo: prev.windows.ROBUST_13Y.cells.NW13.ALL }, y2: { mine: stat(U2), fo: prev.windows.PRIMARY.cells.NW.ALL } }
audit.parity_ok = audit.parity_ungated.y13.mine.n === prev.windows.ROBUST_13Y.cells.NW13.ALL.n && audit.parity_ungated.y13.mine.total === prev.windows.ROBUST_13Y.cells.NW13.ALL.total
  && audit.parity_ungated.y2.mine.n === prev.windows.PRIMARY.cells.NW.ALL.n && audit.parity_ungated.y2.mine.total === prev.windows.PRIMARY.cells.NW.ALL.total
console.log('PARITY', JSON.stringify(audit.parity_ungated), audit.parity_ok)
const oosDays = [...new Set(C1.map((c, i) => i).filter((i) => isOos(C1[i].t)))]
for (const h of CKS) {
  const G13 = sequence(S13, gateKeep(h)), G2 = sequence(S2, gateKeep(h)), tr = G13.filter((f) => isTrain(f.t)), oo = G13.filter((f) => isOos(f.t))
  const G13b = sequence(S13, gateKeep(h)); audit[`deterministic_${h}`] = JSON.stringify(G13) === JSON.stringify(G13b)
  // random gates: same number of OOS open days, 1,000 draws (Addendum A.8)
  const nOpen = oosDays.filter((i) => gate[h].get(i)).length, R = rng(7), rnd = []
  for (let k = 0; k < 1000; k++) { const pick = new Set(); const pool = [...oosDays]; for (let j = 0; j < nOpen && pool.length; j++) { const x = (R() * pool.length) | 0; pick.add(pool[x]); pool[x] = pool[pool.length - 1]; pool.pop() }
    const F = sequence(S13, (s) => s.i != null && pick.has(s.i) && s.t >= C1[s.i].t + h * H).filter((f) => isOos(f.t)); rnd.push(F.length ? F.reduce((a, f) => a + f.net, 0) / F.length : 0) }
  rnd.sort((a, b) => a - b); const p95 = rnd[949]
  const years = {}; for (const f of G13) (years[new Date(f.t).getUTCFullYear()] ??= []).push(f)
  const fri = {}; for (const hh of CKS) fri[hh] = { open: gate[hh].get(dayIdx.get(FRI_TD)) ?? null, p: +(prob[hh].get(dayIdx.get(FRI_TD)) ?? NaN).toFixed(3) }
  const r = { TB13: { TRAIN: { ...stat(tr), lb: lbOf(tr) }, OOS: { ...stat(oo), lb: lbOf(oo) } }, TB2: { ...stat(G2), lb: lbOf(G2) }, random_gate_oos_usd_p95: +p95.toFixed(3),
    up_day_cost_13y: stat(G13.filter((f) => isUp[f.i])), down_day_13y: stat(G13.filter((f) => y[f.i] === 1)), per_year: Object.fromEntries(Object.entries(years).map(([k, F]) => [k, stat(F)])),
    friday_gate: fri, friday_trades_2y: G2.filter((f) => f.i === dayIdx.get(FRI_TD)).map((f) => ({ t: new Date(f.t).toISOString(), entry: f.entry, raw: f.raw, net: +f.net.toFixed(2) })) }
  const ta = out.checkpoints[h].TA
  r.checks = { TA_skill_lb_pos: ta.diff_lb > 0, TB13_train_pos: r.TB13.TRAIN.usd > 0, TB13_oos_pos: r.TB13.OOS.usd > 0, TB13_oos_lb_pos: r.TB13.OOS.lb > 0, beats_random_p95: r.TB13.OOS.usd > p95, TB2_pos: r.TB2.usd > 0, oos_n30: r.TB13.OOS.n >= 30 }
  r.pass = Object.values(r.checks).every(Boolean); Object.assign(out.checkpoints[h], r)
  console.log('T-B', h, JSON.stringify({ TB13: r.TB13, TB2: r.TB2, p95, pass: r.pass }))
}
out.passes = CKS.filter((h) => out.checkpoints[h].pass)
out.audits_ok = audit.lookahead_violations === 0 && audit.parity_ok && CKS.every((h) => audit[`deterministic_${h}`] && out.checkpoints[h].audit_shuffle_no_skill_share >= 0.95)
fs.writeFileSync(path.join(TURBO.master, 'down_day_detector_study.json'), JSON.stringify(out, null, 1))
console.log('AUDITS_OK', out.audits_ok, '| PASSES', JSON.stringify(out.passes))
