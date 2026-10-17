// ════════════════════════════════════════════════════════════════════════════════
// study_swing_candle_atlas.mjs — Phase 1 of the swing-candle study: the candle atlas at swing points on all 16 timeframes (2026-10-17).
// Pre-registered: docs/SWING_CANDLE_SPEC.md (+ dated clarifications). Core counting: scripts/lib/swing_atlas.mjs (smoke: smoke_swing_atlas.mjs).
// Output: data/master/swing_candle_atlas.json + docs/SWING_CANDLE_ATLAS.md.  Optional: TF=4H,1D (subset) for a quick run.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { cleanForTv, buildCandles, TFS } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { loadContext } from '../src/master/marketContext.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'
import { compareRates, holm } from '../src/core/studyStats.js'
import { atlasEvents, terciles, atlasCounts } from './lib/swing_atlas.mjs'

const FROM = HISTORY_CONTINUOUS_FROM, TO = Date.parse('2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
const NEWS_FROM = Date.parse('2020-03-31T00:00:00Z'), VOL_FROM = Date.parse('2024-10-09T00:00:00Z')
const NEWS_SPLIT = NEWS_FROM + 0.6 * (TO - NEWS_FROM), VOL_SPLIT = VOL_FROM + 0.6 * (TO - VOL_FROM), MIN_OOS = 30
const ONLY = process.env.TF ? process.env.TF.split(',') : TFS
const isTrain = (t) => t < SPLIT
const nyHour = (t) => Math.floor((((t + nyOffsetMs(t)) % 86400000) + 86400000) % 86400000 / 3600000)
const lowerBound = (arr, t) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m } return lo }
const anyIn = (arr, a, z, f = () => true) => { for (let k = lowerBound(arr, a); k < arr.length && arr[k].t < z; k++) if (f(arr[k])) return true; return false }

console.log('loading 1m: gold, DXY (6 pairs), silver, CME gold futures …')
const G = cleanForTv((await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars).bars
const holes = findHoles(G)
const D = cleanForTv((await loadDxyBars('1m', { from: FROM, to: TO })).bars).bars
const S = cleanForTv((await loadBars('XAGUSD', '1m', { from: FROM, to: TO })).bars).bars
const F = cleanForTv(fs.readFileSync(path.join(TURBO.historyAsset('GOLD_FUT'), '1m.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((b) => b.t <= TO), { realVolume: true }).bars
const ctxAll = loadContext(), HI = ctxAll.ff.filter((e) => e.impact === 'high' && e.t >= FROM && e.t <= TO), NEWS = ctxAll.news.filter((x) => x.t <= TO)
console.log(`  gold ${G.length} · DXY ${D.length} · silver ${S.length} · futures ${F.length} · high-impact USD events ${HI.length} · news ${NEWS.length} · holes ${holes.length}`)

const res = { at: new Date().toISOString(), spec: 'docs/SWING_CANDLE_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), timeframes: {} }
for (const tf of ONLY) {
  const t0 = Date.now(), C = buildCandles(G, tf); markIncomplete(C, holes)
  const breaks = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0))
  const byT = (bars) => new Map(buildCandles(bars, tf).map((c) => [c.t, c]))
  const DX = byT(D), XA = byT(S), FUc = buildCandles(F, tf), FU = new Map(FUc.map((c, k) => [c.t, { c, k }]))
  const ctx = (i) => { const c = C[i], a = c.t, z = c.close_t, w0 = C[i - 3].t, out = {}
    out['ctx|hi_event_candle'] = anyIn(HI, a, z); out['ctx|hi_event_window'] = anyIn(HI, w0, z)
    out['ctx|usd_pos_surprise_candle'] = anyIn(HI, a, z, (e) => e.better === 1); out['ctx|usd_neg_surprise_candle'] = anyIn(HI, a, z, (e) => e.better === 2)
    const d0 = DX.get(a), d3 = DX.get(w0); if (d0) out['ctx|dxy_up_candle'] = d0.c > d0.o; if (d0 && d3) out['ctx|dxy_up_window'] = d0.c > d3.o
    const x0 = XA.get(a); if (x0) out['ctx|silver_up_candle'] = x0.c > x0.o
    if (a >= NEWS_FROM) out['ctx|news_in_candle'] = anyIn(NEWS, a, z)
    const f = FU.get(a); if (f && a >= VOL_FROM && !f.c.roll && f.k >= 20) { const v = FUc.slice(f.k - 20, f.k).map((x) => x.v).sort((p, q) => p - q), med = (v[9] + v[10]) / 2
      if (med > 0) { out['vol|heavy'] = f.c.v >= 1.5 * med; out['vol|light'] = f.c.v <= 0.67 * med } }
    for (const e of [HI]) { /* look-ahead guard: everything above lies inside [open of −3, end of offset 0] by construction */ }
    return out }
  const ctxSplit = (key, t) => key === 'ctx|news_in_candle' ? (t < NEWS_SPLIT ? 'T' : 'O') : key.startsWith('vol|') ? (t < VOL_SPLIT ? 'T' : 'O') : null
  const runK = (k, withRandom) => { const ev = atlasEvents(C, { k, breaks, seed: 17, nRandom: withRandom ? 3 : 0, nyHour }); const cuts = terciles(C, ev, breaks, isTrain); return { ev, out: atlasCounts(C, ev, { breaks, isTrain, cuts, ctx, ctxSplit }) } }
  const main = runK(3, true), k2 = runK(2, false), k5 = runK(5, false)
  const R = { candles: C.length, broken_candles: breaks.size, swings: main.out.n, amp_median_atr: null, confirm_lag_median_bars: null, confirmed_by_offset: main.out.confirmed_by_offset, sides: {} }
  const amps = main.ev.swings.map((s) => s.amp_atr).filter((x) => x != null).sort((a, b) => a - b); R.amp_median_atr = amps.length ? +amps[amps.length >> 1].toFixed(2) : null
  const lags = main.ev.swings.map((s) => s.knownI - s.i).sort((a, b) => a - b); R.confirm_lag_median_bars = lags.length ? lags[lags.length >> 1] : null
  for (const side of ['H', 'L']) {
    const cells = main.out.cells[side], oosN = main.out.n[side].S.O, rows = []
    for (const [key, c] of Object.entries(cells)) {
      const O = compareRates(c.S.O[0], c.S.O[1], c.C1.O[0], c.C1.O[1]), T = compareRates(c.S.T[0], c.S.T[1], c.C1.T[0], c.C1.T[1])
      const R2 = c.C2.O[1] ? compareRates(c.S.O[0], c.S.O[1], c.C2.O[0], c.C2.O[1]) : null
      const d2 = k2.out.cells[side][key], d5 = k5.out.cells[side][key]
      const s2 = d2 ? compareRates(d2.S.O[0], d2.S.O[1], d2.C1.O[0], d2.C1.O[1]).diff : null, s5 = d5 ? compareRates(d5.S.O[0], d5.S.O[1], d5.C1.O[0], d5.C1.O[1]).diff : null
      rows.push({ key, swing_oos: O.p1, c1_oos: O.p2, c2_oos: R2?.p1 != null ? R2.p2 : null, ratio_c1: O.ratio, diff_c1: O.diff, p: O.p, n_s: c.S.O[1], n_c1: c.C1.O[1], train_diff: T.diff, train_swing: T.p1, train_c1: T.p2, diff_c2: R2?.diff ?? null, k2_diff: s2, k5_diff: s5 }) }
    holm(rows)
    for (const r of rows) { const sg = Math.sign(r.diff_c1 ?? 0), same = (x) => x == null || Math.sign(x) === sg
      r.verdict = oosN < MIN_OOS ? 'DESCRIBED_ONLY' : r.holm_pass && sg !== 0 && Math.sign(r.train_diff ?? 0) === sg && same(r.diff_c2) && r.k2_diff != null && r.k5_diff != null && Math.sign(r.k2_diff) === sg && Math.sign(r.k5_diff) === sg ? 'FINDING'
        : r.holm_pass && Math.sign(r.train_diff ?? 0) !== sg ? 'INCONSISTENT' : r.holm_pass ? 'FAILS_ROBUSTNESS' : 'NO_DIFFERENCE' }
    R.sides[side] = { oos_swings: oosN, findings: rows.filter((r) => r.verdict === 'FINDING').length, rows: rows.sort((a, b) => (a.p ?? 1) - (b.p ?? 1)) } }
  res.timeframes[tf] = R
  console.log(`${tf.padEnd(4)} candles ${C.length} · swings H ${R.swings.H.S.T}+${R.swings.H.S.O} L ${R.swings.L.S.T}+${R.swings.L.S.O} (TRAIN+OOS) · failed H ${R.swings.H.C1.T + R.swings.H.C1.O} L ${R.swings.L.C1.T + R.swings.L.C1.O} · amp ${R.amp_median_atr} ATR · lag ${R.confirm_lag_median_bars} · FINDINGS H ${R.sides.H.findings} L ${R.sides.L.findings} · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
fs.writeFileSync(path.join(TURBO.master, 'swing_candle_atlas.json'), JSON.stringify(res))
console.log('→ data/master/swing_candle_atlas.json')
