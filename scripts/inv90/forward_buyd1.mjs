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

const here = path.dirname(fileURLToPath(import.meta.url)), DIR = path.join(TURBO.root, 'data', 'inv90'), FD = path.join(DIR, 'forward'); fs.mkdirSync(FD, { recursive: true })
// ARM (2026-10-15, Ashraf: "add it"): default = the 92 % arm (unchanged). --arm=freq = the ≈ 1 trade/day arm of Part 7b: the STRONG GBDT
// (400 trees, depth 5) and the FREQUENCY-ANCHORED threshold (highest score whose pooled 2016-2026 policy gives ≥ 1.0 trade/trading day).
// It has its own model / ledger / summary in data/inv90/forward_freq/ and reuses the forward features of data/inv90/forward/ (--no-build).
const ARM = process.argv.includes('--arm=freq') ? 'freq' : 'p92', AD = ARM === 'freq' ? path.join(DIR, 'forward_freq') : FD; fs.mkdirSync(AD, { recursive: true })
const ARMC = ARM === 'freq' ? { name: 'BUY_D1-xs (≈1/day)', idp: 'BUY_D1xs_', model: 'model_BUY_D1_xs.json', scores: 'scores_BUY_D1_xs.bin', train: { seed: 2027, trees: 400, depth: 5, lr: 0.03, minLeaf: 200, sub: 0.5 } }
  : { name: 'BUY_D1-x', idp: 'BUY_D1x_', model: 'model_BUY_D1_x.json', scores: 'scores_BUY_D1_x.bin', train: { seed: 2027 } }
const CUT = Date.parse('2026-10-09T06:00:00Z'), DAY = 86400000, MODEL = path.join(AD, ARMC.model), LEDGER = path.join(AD, 'ledger.jsonl'), TM = 0.2, SM = 2
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
// resolution of a signal on the 1m store as far as it exists (null = still open). Buy at the ask; exits at the bid; stop first in a minute.
const resolve = (s) => { for (let k = lb(s.t); k < M.length; k++) { const b = M[k]
    if (b.t >= s.t + 7 * DAY) { const j = M[k - 1]; return { exit_t: j.t + 60000, exit: j.c, why: 'TIME', net: +(j.c - s.entry_ask).toFixed(3) } }
    if (b.l <= s.stop) return { exit_t: b.t + 60000, exit: s.stop, why: 'STOP', net: +(s.stop - s.entry_ask - Math.min(0.3, 0.05 * s.atr_1d)).toFixed(3) }
    if (b.h >= s.target) return { exit_t: b.t + 60000, exit: s.target, why: 'TARGET', net: +(s.target - s.entry_ask).toFixed(3) } } return null }
const exitOf = (s) => resolved.get(s.id)?.exit_t ?? res.find((x) => x.id === s.id)?.exit_t ?? Infinity
for (const s of signals) if (!resolved.has(s.id)) { const o = resolve(s); if (o) res.push({ type: 'resolve', id: s.id, ...o, resolved_at: new Date(now).toISOString() }) }
let maxT = lastDone
for (let r = 0; r < n; r++) { const t = T[r]; if (t <= lastDone || t < CUT) continue; maxT = Math.max(maxT, t)
  const p = predict(FM.model, Xb, n, r); if (p < FM.thr) continue
  const prior = [...signals, ...add], day = Math.floor(t / DAY)
  const today = prior.filter((s) => Math.floor(s.t / DAY) === day).length, lastSig = prior.reduce((m, s) => Math.max(m, s.t), -Infinity)
  const open = prior.filter((s) => s.t <= t && exitOf(s) > t).length   // a position closed before t is known closed at t (causal)
  if (today >= 5 || open >= 5 || t - lastSig < 3600000) continue
  const k0 = lb(t), c = M[k0 - 1]?.c, Dv = atrD(t); if (c == null || !(Dv > 0)) continue
  const entry = c + spread(t)
  const sig = { type: 'signal', id: `${ARMC.idp}${new Date(t).toISOString()}`, t, bar: new Date(t).toISOString(), score: +p.toFixed(4), thr: +FM.thr.toFixed(4), close_bid: c, spread: +spread(t).toFixed(3), entry_ask: +entry.toFixed(2),
    atr_1d: +Dv.toFixed(2), target: +(entry + TM * Dv).toFixed(2), stop: +(entry - SM * Dv).toFixed(2), recorded_at: new Date(now).toISOString(), late_min: Math.round((now - t) / 60000) }
  add.push(sig); const o = resolve(sig); if (o) res.push({ type: 'resolve', id: sig.id, ...o, resolved_at: new Date(now).toISOString() })
}
const lines = [...add, ...res, { type: 'scan', from: lastDone, to: maxT, at: new Date(now).toISOString(), rows_scored: T.filter((t) => t > lastDone && t >= CUT).length }]
fs.appendFileSync(LEDGER, lines.map((x) => JSON.stringify(x)).join('\n') + '\n')
// ── 4. summary ───────────────────────────────────────────────────────────────────────────────────────────────────
const all = [...signals, ...add], rs = [...resolved.values(), ...res], nets = rs.map((x) => x.net), w = nets.filter((x) => x > 0).length
const sum = { at: new Date(now).toISOString(), candidate: ARMC.name, arm: ARM, cutoff: new Date(CUT).toISOString(), threshold: FM.thr, scanned_to: new Date(maxT).toISOString(), signals: all.length, resolved: rs.length, open: all.length - rs.length,
  wr: rs.length ? +(w / rs.length).toFixed(4) : null, wilson_lb: rs.length ? +wilsonLB(w, rs.length, 1.96).toFixed(4) : null, net_mean: rs.length ? +(nets.reduce((a, b) => a + b, 0) / rs.length).toFixed(3) : null,
  verdict: rs.length < 100 ? `NO VERDICT YET (${rs.length}/100 resolved)` : (w / rs.length >= 0.9 && wilsonLB(w, rs.length, 1.96) >= 0.88 && nets.reduce((a, b) => a + b, 0) > 0 ? 'FORWARD PASS (check bootstrap LB)' : 'FORWARD FAIL') }
fs.writeFileSync(path.join(AD, 'forward_summary.json'), JSON.stringify(sum, null, 1))
console.log(`forward ${ARMC.name}: +${add.length} signals, +${res.length} resolved · total ${sum.signals} signals, ${sum.resolved} resolved, WR ${sum.wr} $/t ${sum.net_mean} · ${sum.verdict}`)
// 📨 Telegram (2026-10-16): each NEW signal, once; tradeAlert skips anything recorded > TWIN_ALERT_MAX_LATE_MIN after its bar (backfill / catch-up)
for (const s of add) { const r = await alertSetup(swingSetup(s, { arm: ARM, summary: sum })); console.log(`  📨 telegram SWING ${s.id}: ${r.sent ? 'sent' : r.dryRun ? 'dry run (no TWIN_TELEGRAM_* in .env)' : r.skipped || r.error || 'not sent ' + r.status}`) }
