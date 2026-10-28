// ════════════════════════════════════════════════════════════════════════════════
// inv90/forward_buyd1.mjs — FORWARD TEST (paper, record-only) of the investigation's closest candidate BUY_D1-x (2026-10-11; Ashraf: "continue").
// docs/INVESTIGATION_90WR_2026-10-11.md → "Forward test". NEVER trades. Since 2026-10-16 a NEW, fresh signal sends one Telegram
// "TRADE SETUP READY — SWING TRADE" notice (src/master/tradeAlert.js; stale/backfilled signals are never sent).
// ────────────────────────────────────────────────────────────────────────────────
// FROZEN once (first run): the GBDT trained on ALL research rows with a known BUY_D1 outcome (features = dataset features − A + the 10
// cross-market features), and the threshold = the pooled rule over every OOS year 2016-2026 (WR ≥ 92 %, mean > 0, n ≥ 30, D1 policy).
// Saved to data/inv90/forward/model_BUY_D1_x.json — never retrained.
// EACH RUN: rebuilds features for every closed 15m bar from (cutoff − 30 d) to now with the SAME builders (--forward modes), scores the bars
// after the frozen cutoff that were not processed before, applies the D1 policy (≤ 5 open, ≤ 5 new/day, ≥ 1 h apart) and APPENDS signals
// to data/inv90/forward/ledger.jsonl; open trades are resolved on the 1m store (target 0.2·ATR1d / stop 2·ATR1d / 7 d; buy at the ask
// with the MEASURED live spread). Append-only: a recorded signal is never rewritten. Summary → forward_summary.json.
// PRE-REGISTERED forward verdict: none before 100 resolved trades; then the same G2/G3 as Part 4 (WR ≥ 90 % with Wilson LB ≥ 88 %, mean $ > 0
// with bootstrap LB > 0). At 0.33/day expect ~ 10 months to 100 trades.
// ════════════════════════════════════════════════════════════════════════════════
import '../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../../src/core/paths.js'
import { loadBars } from '../../src/data/backfillReader.js'
import { atr } from '../../src/core/indicators.js'
import { makeSpreadAt, loadLiveSpreads } from '../../src/master/spreadModel.js'
import { fitBins, binAll, train, predict } from './gbdt.mjs'
import { wilsonLB } from './gate.mjs'
import { alertSetup, swingSetup } from '../../src/master/tradeAlert.js'
import { signalsHalted } from '../../src/core/dataHealth.js'

// DATA HEALTH GATE (2026-10-18): the ledger is APPEND-ONLY, so nothing is scored or resolved on a STALE database. The bars are not lost:
// the next healthy run scores them (late_min records the delay; a late signal is never sent to Telegram).
{ const h = signalsHalted(); if (h.halted) { console.log(`  ⛔ forward test skipped — DATABASE STALE (${h.why})`); process.exit(0) } }

const here = path.dirname(fileURLToPath(import.meta.url)), DIR = path.join(TURBO.root, 'data', 'inv90'), FD = path.join(DIR, 'forward'); fs.mkdirSync(FD, { recursive: true })
// ARM (2026-10-15, Ashraf: "add it"): default = the 92 % arm (unchanged). --arm=freq = the ≈ 1 trade/day arm of Part 7b: the STRONG GBDT
// (400 trees, depth 5) and the FREQUENCY-ANCHORED threshold (highest score whose pooled 2016-2026 policy gives ≥ 1.0 trade/trading day).
// It has its own model / ledger / summary in data/inv90/forward_freq/ and reuses the forward features of data/inv90/forward/ (--no-build).
const ARM = process.argv.includes('--arm=freq') ? 'freq' : 'p92', AD = ARM === 'freq' ? path.join(DIR, 'forward_freq') : FD; fs.mkdirSync(AD, { recursive: true })
const ARMC = ARM === 'freq' ? { name: 'BUY_D1-xs (≈1/day)', idp: 'BUY_D1xs_', model: 'model_BUY_D1_xs.json', scores: 'scores_BUY_D1_xs.bin', train: { seed: 2027, trees: 400, depth: 5, lr: 0.03, minLeaf: 200, sub: 0.5 } }
  : { name: 'BUY_D1-x', idp: 'BUY_D1x_', model: 'model_BUY_D1_x.json', scores: 'scores_BUY_D1_x.bin', train: { seed: 2027 } }
const CUT = Date.parse('2026-10-09T06:00:00Z'), DAY = 86400000, MODEL = path.join(AD, ARMC.model), LEDGER = path.join(AD, 'ledger.jsonl')
// BRACKET (2026-10-16, Ashraf: "the SL must be reasonable" → chose E3; study (bo) swing_bracket_study*.json): arm 1 → E3 = target 0.5·ATR1d /
// stop 1·ATR1d (73.0 % WR, +$3.76/t 2022-26, beats random buys by +$3.78/t); arm 2 FAILED every reasonable bracket (E3 −$0.73/t, worse than
// random) → keeps E0 0.2/2 and records SILENTLY (no Telegram). Each signal stores its own bracket; old E0 signals resolve on their own levels.
// BRACKET L4H (2026-10-28, Ashraf: "swing trade must have … SL not more than 10$" + "must trigger at the correct level" → "Yes, switch both swing
// paper tests to the level entry (4h low limit), $10 stop, $20 target, record only"; study (ek) swing_bracket_study*_level4h.json): BOTH arms —
// a BUY LIMIT at the low of the last 4 h before the signal, valid 24 h, filled when the ask reaches it (bid low ≤ level − measured spread);
// stop level − $10, target level + $20, 7-day time stop from the fill; not filled in 24 h → EXPIRED (no trade, not in the WR). NO Telegram.
// Measured 2022-26: arm 1 39.8 % WR +$1.77/t, arm 2 40.6 % WR +$2.01/t (beat random buys in both periods; up to 17 / 32 losses in a row).
// L4H3 (same day, ~10:xx UTC, Ashraf: "Yes, switch both swing paper tests to 3 lots at the 4h-low limit: TP1 $10, then the other 2 lots to
// break-even, running to +$50 or 7 days. Record only."; study (em) swing_scalp_entry_lots3.json): same limit / fill / expiry as L4H; 3 lots,
// stop level − $10 each; lot 1 exits at TP1 = level + $10; then lots 2-3 move to break-even from the next minute and exit at BE, at the cap
// level + $50 (`target`), or at the 7-day time stop. net = $ for the whole setup (risk $30). No L4H (single-lot) signal was ever recorded.
// Measured (L4H entry, TP1 $10): setups in profit 52-56 %, $/setup 13 y +5.23 / +6.02, 2 y live-rule +7.97 / +7.35 (arm 1 / arm 2).
// ARM 1 BACK TO E0 (2026-10-28 ~08:20 UTC, Ashraf: "Yes, bring back swing arm 1 with the checkpoint bracket E0 (0.2× ATR target / 2× ATR stop) as the
// only signal passing the 92% rule: show its box, record only, no Telegram"): arm 1 = E0 — market BUY at the ask, target + 0.2·ATR1d, stop − 2·ATR1d,
// 7 days (the checkpoint-2026-10-16 bracket; study (bo) OOS 92.0 % WR +$3.30/t, TRAIN 92.3 % +$0.84, avg risk ≈ $94, losing years 2017 / 2020 / 2022).
// Arm 2 stays L4H3. The chart box is allowed by src/master/wrGate.js ('SWING_E0'); Telegram stays OFF.
const BR = ARM === 'freq' ? { name: 'L4H3', lookMs: 4 * 3600000, validMs: 86400000, stopUsd: 10, tp1Usd: 10, capUsd: 50, lots: 3 } : { name: 'E0', tm: 0.2, sm: 2 }, TELEGRAM = false
const readMeta = (d) => JSON.parse(fs.readFileSync(path.join(d, 'dataset_meta.json'), 'utf8'))
const f32 = (f) => { const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }

// ── 1. the frozen model (built once) ─────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(MODEL)) {
  const meta = readMeta(DIR), W = meta.width, n = meta.rows, D = f32(path.join(DIR, 'dataset.bin')), X2m = JSON.parse(fs.readFileSync(path.join(DIR, 'features2_meta.json'), 'utf8')), X2 = f32(path.join(DIR, 'features2.bin'))
  const O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = f32(path.join(DIR, 'outcomes2.bin')), oc = O.cols.indexOf('BUY_D1_net')
  const FEATS = [...meta.features.filter((f) => f !== 'A'), ...X2m.names], F = FEATS.length, X = new Float32Array(n * F), y = new Uint8Array(n), rows = []
  for (let r = 0; r < n; r++) { let k = 0; for (const [i, f] of meta.features.entries()) if (f !== 'A') X[r * F + k++] = D[r * W + i]; for (let j = 0; j < X2m.width; j++) X[r * F + k++] = X2[r * X2m.width + j]
    const v = OD[r * O.width + oc]; if (Number.isFinite(v)) { rows.push(r); y[r] = v > 0 ? 1 : 0 } }
  const edges = fitBins(X, n, F, rows), Xb = binAll(X, n, F, edges), model = train(Xb, n, F, y, rows, ARMC.train)
  const P4 = JSON.parse(fs.readFileSync(path.join(DIR, 'part4_pooled_x_results.json'), 'utf8')).candidates.BUY_D1.picks
  // threshold for the forward period = the pooled rule over ALL OOS years 2016-2026 (exactly what part4_select would pick for 2027)
  const S = f32(path.join(DIR, ARMC.scores)), T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0))
  const prev = []; for (let r = 0; r < n; r++) if (Number.isFinite(S[r]) && new Date(T[r]).getUTCFullYear() >= 2016) prev.push(r)
  const sc = prev.map((r) => S[r]).sort((a, b) => b - a); let thr = null, pick = null
  const pol = (th) => { const out = [], open = []; let day = -1, nd = 0, last = -Infinity
    for (const r of prev) { const t = T[r], d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 } const net = OD[r * O.width + oc]; if (!Number.isFinite(net) || S[r] < th) continue
      while (open.length && open[0] <= t) open.shift(); if (nd >= 5 || open.length >= 5 || t - last < 3600000) continue
      open.push(t + OD[r * O.width + O.cols.indexOf('BUY_D1_dur')] * 60000); open.sort((a, b) => a - b); nd++; last = t; out.push(net) } return out }
  if (ARM === 'freq') {   // Part 7b anchor: the HIGHEST threshold whose pooled policy averages ≥ 1.0 trade per trading day (part7_freq.mjs grid)
    const tdays = new Set(prev.map((r) => Math.floor(T[r] / DAY))).size
    for (const q of Array.from({ length: 80 }, (_, i) => 0.0005 * Math.pow(1.11, i)).filter((x) => x <= 0.9)) { const th = sc[Math.max(0, Math.floor(q * sc.length) - 1)], tr = pol(th)
      if (tr.length / tdays >= 1.0) { const w = tr.filter((x) => x > 0).length; thr = th; pick = { q: +q.toFixed(5), n: tr.length, per_day: +(tr.length / tdays).toFixed(3), wr: +(w / tr.length).toFixed(4), net: +(tr.reduce((a, b) => a + b, 0) / tr.length).toFixed(3) }; break } } }
  else for (const q of [0.5, 0.3, 0.2, 0.15, 0.1, 0.075, 0.05, 0.03, 0.02, 0.015, 0.01, 0.0075, 0.005, 0.003, 0.002, 0.001, 0.0005]) { const th = sc[Math.max(0, Math.floor(q * sc.length) - 1)], tr = pol(th)
    const w = tr.filter((x) => x > 0).length, m = tr.reduce((a, b) => a + b, 0) / Math.max(1, tr.length); if (tr.length >= 30 && w / tr.length >= 0.92 && m > 0) { thr = th; pick = { q, n: tr.length, wr: +(w / tr.length).toFixed(4), net: +m.toFixed(3) }; break } }
  if (thr == null) throw new Error('no threshold qualifies — forward test cannot start')
  fs.writeFileSync(MODEL, JSON.stringify({ at: new Date().toISOString(), candidate: ARMC.name, arm: ARM, cutoff: new Date(CUT).toISOString(), features: FEATS, edges: edges.map((e) => Array.from(e)), model, thr, pick, part4_2026_pick: P4['2026'] }))
  console.log(`frozen model saved · threshold ${thr.toFixed(4)} (pooled 2016-2026: top ${pick.q * 100}% → ${pick.n} t, ${pick.wr * 100}% WR, $${pick.net})`)
}
const FM = JSON.parse(fs.readFileSync(MODEL, 'utf8')); FM.edges = FM.edges.map((e) => Float64Array.from(e))

// ── 2. features for every closed bar from (cutoff − 30 d) to now — the SAME builders ───────────────────────────────────
const from = new Date(CUT - 30 * DAY).toISOString()
if (!process.argv.includes('--no-build')) {   // --no-build: reuse the forward features just rebuilt by the 92 % arm (run right after it)
  execFileSync(process.execPath, ['--max-old-space-size=8000', path.join(here, 'build_dataset.mjs'), `--forward-from=${from}`], { stdio: 'ignore', windowsHide: true, timeout: 20 * 60000 })
  execFileSync(process.execPath, ['--max-old-space-size=8000', path.join(here, 'build_features2.mjs'), '--forward'], { stdio: 'ignore', windowsHide: true, timeout: 20 * 60000 }) }
const meta = readMeta(FD), W = meta.width, n = meta.rows, D = f32(path.join(FD, 'dataset.bin')), X2m = JSON.parse(fs.readFileSync(path.join(FD, 'features2_meta.json'), 'utf8')), X2 = f32(path.join(FD, 'features2.bin'))
const T = new Float64Array(fs.readFileSync(path.join(FD, 'dataset_times.bin')).buffer.slice(0)), F = FM.features.length
if (JSON.stringify([...meta.features.filter((f) => f !== 'A'), ...X2m.names]) !== JSON.stringify(FM.features)) throw new Error('feature list differs from the frozen model')
const X = new Float32Array(n * F); for (let r = 0; r < n; r++) { let k = 0; for (const [i, f] of meta.features.entries()) if (f !== 'A') X[r * F + k++] = D[r * W + i]; for (let j = 0; j < X2m.width; j++) X[r * F + k++] = X2[r * X2m.width + j] }
const Xb = binAll(X, n, F, FM.edges), aCol = meta.features.indexOf('A')

// ── 3. ledger: append new signals (D1 policy), resolve open trades ───────────────────────────────────────────────
const L = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const signals = L.filter((e) => e.type === 'signal'), resolved = new Map(L.filter((e) => e.type === 'resolve').map((e) => [e.id, e]))
const lastDone = L.filter((e) => e.type === 'scan').reduce((m, e) => Math.max(m, e.to), CUT)
const M = (await loadBars('XAUUSD', '1m', { from: CUT - 2 * DAY, to: Date.now() })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const live = loadLiveSpreads(path.join(TURBO.root, 'data', 'history', 'XAUUSD', 'quotes_1m.jsonl'), { from: CUT - DAY }), spread = makeSpreadAt({ live })
const D1 = (await loadBars('XAUUSD', '1d', { from: CUT - 60 * DAY, to: Date.now() })).bars, A1 = atr(D1, 14), D1c = D1.map((b) => b.t + DAY)
const atrD = (t) => { let i = -1; for (let k = 0; k < D1c.length; k++) if (D1c[k] <= t) i = k; return i >= 0 ? A1[i] : null }
const now = Date.now(), add = [], res = []
// L4H fill: index of the first minute (within the 24 h validity) whose bid low lets the ask reach the limit; null = not yet, false = expired
const fillOf = (s) => { for (let k = lb(s.t); k < M.length && M[k].t < s.valid_until; k++) if (M[k].l <= s.entry_limit - spread(M[k].t)) return k
  return M.length && M[M.length - 1].t + 60000 >= s.valid_until ? false : null }
// resolution of a signal on the 1m store as far as it exists (null = still open). Buy at the ask; exits at the bid; stop first in a minute
// (an L4H trade: from its fill minute — the fill minute itself is checked for the stop first, conservative).
const isLim = (s) => s.bracket === 'L4H' || s.bracket === 'L4H3'
// L4H3 phase 1 (all 3 lots on): index where TP1 is first reached, or where the time stop / stop ended the setup first (stop first in a minute)
const phase1 = (s, k0, t0) => { for (let k = k0; k < M.length; k++) { const b = M[k]
  if (b.t >= t0 + 7 * DAY) return { end: k, why: 'TIME' }; if (b.l <= s.stop) return { end: k, why: 'STOP' }; if (b.h >= s.tp1) return { tp1: k } } return null }
const resolve = (s) => { let k0 = lb(s.t), t0 = s.t
  if (isLim(s)) { const f = fillOf(s); if (f === null) return null; if (f === false) return { exit_t: s.valid_until, exit: null, why: 'EXPIRED', net: null }; k0 = f; t0 = M[f].t }
  if (s.bracket === 'L4H3') { const e = s.entry_ask, p = phase1(s, k0, t0); if (!p) return null   // net = $ for the whole 3-lot setup
    if (p.why === 'TIME') { const j = M[p.end - 1]; return { exit_t: j.t + 60000, exit: j.c, why: 'TIME', net: +(3 * (j.c - e)).toFixed(3) } }
    if (p.why === 'STOP') return { exit_t: M[p.end].t + 60000, exit: s.stop, why: 'STOP', net: +(3 * (s.stop - e - Math.min(0.3, 0.05 * s.atr_1d))).toFixed(3) }
    const tp1_t = M[p.tp1].t, g = s.tp1 - e   // lot 1 banked; lots 2-3 at break-even from the NEXT minute
    for (let j = p.tp1 + 1; j < M.length; j++) { const b = M[j]
      if (b.t >= t0 + 7 * DAY) { const z = M[j - 1]; return { exit_t: z.t + 60000, exit: z.c, why: 'TP1+TIME', tp1_t, net: +(g + 2 * (z.c - e)).toFixed(3) } }
      if (b.l <= e) return { exit_t: b.t + 60000, exit: e, why: 'TP1+BE', tp1_t, net: +g.toFixed(3) }
      if (b.h >= s.target) return { exit_t: b.t + 60000, exit: s.target, why: 'TP1+RUN', tp1_t, net: +(g + 2 * (s.target - e)).toFixed(3) } }
    return null }
  for (let k = k0; k < M.length; k++) { const b = M[k]
    if (b.t >= t0 + 7 * DAY) { const j = M[k - 1]; return { exit_t: j.t + 60000, exit: j.c, why: 'TIME', net: +(j.c - s.entry_ask).toFixed(3) } }
    if (b.l <= s.stop) return { exit_t: b.t + 60000, exit: s.stop, why: 'STOP', net: +(s.stop - s.entry_ask - Math.min(0.3, 0.05 * s.atr_1d)).toFixed(3) }
    if (b.h >= s.target) return { exit_t: b.t + 60000, exit: s.target, why: 'TARGET', net: +(s.target - s.entry_ask).toFixed(3) } } return null }
const exitOf = (s) => resolved.get(s.id)?.exit_t ?? res.find((x) => x.id === s.id)?.exit_t ?? Infinity
for (const s of signals) if (!resolved.has(s.id)) { const o = resolve(s); if (o) res.push({ type: 'resolve', id: s.id, ...o, resolved_at: new Date(now).toISOString() }) }
// L4H fills are recorded once as their own ledger line (the chart shows PENDING limit → OPEN trade)
const filled = new Set(L.filter((e) => e.type === 'fill').map((e) => e.id)), fills = []
const noteFill = (s) => { if (!isLim(s) || filled.has(s.id)) return; const f = fillOf(s); if (typeof f === 'number') { filled.add(s.id); fills.push({ type: 'fill', id: s.id, fill_t: M[f].t, fill: s.entry_limit, recorded_at: new Date(now).toISOString() }) } }
// L4H3: the TP1 moment is recorded once (chart: "TP1 hit · runners at BE") while the 2 runners are still open
const tp1Done = new Set(L.filter((e) => e.type === 'tp1').map((e) => e.id))
const noteTp1 = (s) => { if (s.bracket !== 'L4H3' || tp1Done.has(s.id) || resolved.has(s.id) || res.some((x) => x.id === s.id)) return; const f = fillOf(s); if (typeof f !== 'number') return
  const p = phase1(s, f, M[f].t); if (p?.tp1 != null) { tp1Done.add(s.id); fills.push({ type: 'tp1', id: s.id, tp1_t: M[p.tp1].t, tp1: s.tp1, recorded_at: new Date(now).toISOString() }) } }
for (const s of signals) { noteFill(s); noteTp1(s) }
let maxT = lastDone
for (let r = 0; r < n; r++) { const t = T[r]; if (t <= lastDone || t < CUT) continue; maxT = Math.max(maxT, t)
  const p = predict(FM.model, Xb, n, r); if (p < FM.thr) continue
  const prior = [...signals, ...add], day = Math.floor(t / DAY)
  const today = prior.filter((s) => Math.floor(s.t / DAY) === day).length, lastSig = prior.reduce((m, s) => Math.max(m, s.t), -Infinity)
  const open = prior.filter((s) => s.t <= t && exitOf(s) > t).length   // a position closed before t is known closed at t (causal)
  if (today >= 5 || open >= 5 || t - lastSig < 3600000) continue
  const k0 = lb(t), c = M[k0 - 1]?.c, Dv = atrD(t); if (c == null || !(Dv > 0)) continue
  const head = { type: 'signal', id: `${ARMC.idp}${new Date(t).toISOString()}`, t, bar: new Date(t).toISOString(), score: +p.toFixed(4), thr: +FM.thr.toFixed(4), close_bid: c, spread: +spread(t).toFixed(3), atr_1d: +Dv.toFixed(2) }
  let sig
  if (BR.name === 'E0') { const entry = c + spread(t)   // market BUY at the ask (the checkpoint bracket)
    sig = { ...head, entry_ask: +entry.toFixed(2), target: +(entry + BR.tm * Dv).toFixed(2), stop: +(entry - BR.sm * Dv).toFixed(2), recorded_at: new Date(now).toISOString(), late_min: Math.round((now - t) / 60000), bracket: BR.name }
  } else { let lvl = Infinity; for (let j = lb(t - BR.lookMs); j < k0; j++) lvl = Math.min(lvl, M[j].l); if (!Number.isFinite(lvl)) continue
    sig = { ...head, entry_limit: +lvl.toFixed(2), entry_ask: +lvl.toFixed(2), valid_until: t + BR.validMs, lots: BR.lots, tp1: +(lvl + BR.tp1Usd).toFixed(2), target: +(lvl + BR.capUsd).toFixed(2), stop: +(lvl - BR.stopUsd).toFixed(2),
      recorded_at: new Date(now).toISOString(), late_min: Math.round((now - t) / 60000), bracket: BR.name } }
  add.push(sig); noteFill(sig); noteTp1(sig); const o = resolve(sig); if (o) res.push({ type: 'resolve', id: sig.id, ...o, resolved_at: new Date(now).toISOString() })
}
const lines = [...add, ...fills, ...res, { type: 'scan', from: lastDone, to: maxT, at: new Date(now).toISOString(), rows_scored: T.filter((t) => t > lastDone && t >= CUT).length }]
fs.appendFileSync(LEDGER, lines.map((x) => JSON.stringify(x)).join('\n') + '\n')
// ── 4. summary ───────────────────────────────────────────────────────────────────────────────────────────────────
// the summary / verdict count ONLY the arm's current bracket (arm 1: E3 from 2026-10-16; the earlier E0 signals stay in the ledger, not in this verdict)
const inBr = (s) => (s.bracket ?? 'E0') === BR.name, all = [...signals, ...add].filter(inBr), ids = new Set(all.map((s) => s.id))
// EXPIRED limits (never filled) are no trade: counted apart, never in the WR. L4H3 forward verdict (pre-registered 2026-10-28 before any
// L4H3 signal): none before 100 filled + resolved setups; then PASS = mean $/setup > 0 AND setups in profit ≥ 45 % (study: 52-56 %).
// wr = share of SETUPS that ended in profit (TP1 reached = profit, since the runners exit at BE or better).
const rAll = [...resolved.values(), ...res].filter((x) => ids.has(x.id)), expired = rAll.filter((x) => x.why === 'EXPIRED').length
const rs = rAll.filter((x) => x.net != null), nets = rs.map((x) => x.net), w = nets.filter((x) => x > 0).length
const sum = { at: new Date(now).toISOString(), candidate: ARMC.name, arm: ARM, bracket: BR, telegram: TELEGRAM, cutoff: new Date(CUT).toISOString(), threshold: FM.thr, scanned_to: new Date(maxT).toISOString(), signals: all.length, resolved: rs.length, expired,
  open: all.filter((s) => !isLim(s) || filled.has(s.id)).length - rs.length, pending: all.length - rAll.length - (all.filter((s) => !isLim(s) || filled.has(s.id)).length - rs.length),
  wr: rs.length ? +(w / rs.length).toFixed(4) : null, wilson_lb: rs.length ? +wilsonLB(w, rs.length, 1.96).toFixed(4) : null, net_mean: rs.length ? +(nets.reduce((a, b) => a + b, 0) / rs.length).toFixed(3) : null,
  // E0 (arm 1): the original pre-registered forward verdict — WR ≥ 90 % with Wilson LB ≥ 88 % and mean $ > 0; L4H3 (arm 2): the 2026-10-28 rule above
  verdict: rs.length < 100 ? `NO VERDICT YET (${rs.length}/100 resolved)` : BR.name === 'E0' ? (w / rs.length >= 0.9 && wilsonLB(w, rs.length, 1.96) >= 0.88 && nets.reduce((a, b) => a + b, 0) > 0 ? 'FORWARD PASS (check bootstrap LB)' : 'FORWARD FAIL')
    : (w / rs.length >= 0.45 && nets.reduce((a, b) => a + b, 0) > 0 ? 'FORWARD PASS' : 'FORWARD FAIL') }
fs.writeFileSync(path.join(AD, 'forward_summary.json'), JSON.stringify(sum, null, 1))
console.log(`forward ${ARMC.name}: +${add.length} signals, +${res.length} resolved · total ${sum.signals} signals, ${sum.resolved} resolved, WR ${sum.wr} $/t ${sum.net_mean} · ${sum.verdict}`)
// 📨 Telegram (2026-10-16): each NEW signal, once; tradeAlert skips anything recorded > TWIN_ALERT_MAX_LATE_MIN after its bar (backfill / catch-up)
for (const s of TELEGRAM && ARM !== 'freq' ? add : []) { const r = await alertSetup(swingSetup(s, { arm: ARM, summary: sum })); console.log(`  📨 telegram SWING ${s.id}: ${r.sent ? 'sent' : r.dryRun ? 'dry run (no TWIN_TELEGRAM_* in .env)' : r.skipped || r.error || 'not sent ' + r.status}`) }
