// ════════════════════════════════════════════════════════════════════════════════
// study_wave_reasons.mjs [XAUUSD] — T0 wave reason ledger (docs/research/wave_reasons/2026-10-30_T0_wave_reasons_SPEC.md v1 + addendum B;
// parent SPEC docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md v1.1 A4). Ashraf 2026-10-30: "make sure we understand the
// market in every step at each time frame and find the reason for each move and wave".
// Every ZigZag turn (3 × ATR14) on 16 TFs, 2013-07-14 → now; 24 reason items judged at D = turn candle close (window = candle before + turn
// candle, every input known_t ≤ D, asserted); controls C1 failed extremes (pullback ≥ 1 ATR; C1-all audit) + C2 random same TF / hour / year.
// Stats: lift vs C1 (Katz LB), Holm TRAIN / OOS, walk-forward 2018-2025, week-block bootstrap, shuffled-label null, swing-book equality.
// Output: data/research/wave_reasons/<sym>/<tf>.jsonl (not committed) + data/research/wave_reasons/2026-10-30_<sym>_T0_summary.json
// ════════════════════════════════════════════════════════════════════════════════
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../../../src/core/paths.js'
import { loadBars } from '../../../src/data/backfillReader.js'
import { clean1m, kit, SHORT } from '../../lib/series_1m.mjs'
import { TFS } from '../../../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../../../src/core/dataHoles.js'
import { zigzag } from '../../../src/master/swings.js'
import { atr as atrArr, rsi as rsiArr, ema as emaArr } from '../../../src/core/indicators.js'
import { anatomy } from '../../../src/master/candleFeatures.js'
import { footprintCandles, footprintRead } from '../../../src/master/footprintTf.js'
import { compareRates, holm, rng } from '../../../src/core/studyStats.js'

const SYM = process.argv[2] || 'XAUUSD', ONLY = process.argv[3] ? process.argv[3].split(',') : null
const HR = 3600000, DAY = 24 * HR, START = HISTORY_CONTINUOUS_FROM, TRAIN_END = Date.parse('2021-07-01T00:00:00Z')
const OUT = path.join(TURBO.root, 'data', 'research', 'wave_reasons'), ROWDIR = path.join(OUT, SHORT[SYM]); fs.mkdirSync(ROWDIR, { recursive: true })
const log = (s) => console.log(`  ${s}`), t0 = Date.now()
const ITEMS = ['news_high', 'news_surprise_sup', 'news_surprise_any', 'fed_event', 'head_war', 'head_tariff', 'head_fiscal', 'dxy_sup', 'yield_sup',
  'lvl_prior_swing', 'lvl_prev_day_week', 'lvl_round', 'sweep', 'climax', 'compression_before', 'rsi_div', 'overextended',
  'open_hour', 'month_end', 'holiday_near', 'cme_vol_spike', 'absorption', 'gld_vol_spike', 'htf_with']
const GROUP = { news_high: 1, news_surprise_sup: 1, news_surprise_any: 1, fed_event: 1, head_war: 2, head_tariff: 2, head_fiscal: 2, dxy_sup: 3, yield_sup: 3,
  lvl_prior_swing: 4, lvl_prev_day_week: 4, lvl_round: 4, sweep: 5, climax: 5, compression_before: 5, rsi_div: 5, overextended: 5,
  open_hour: 6, month_end: 6, holiday_near: 6, cme_vol_spike: 7, absorption: 7, gld_vol_spike: 7, htf_with: 8 }
const TFI = Object.fromEntries(TFS.map((tf, i) => [tf, i])), DAILY = new Set(['1D', '2D', '3D', '1W', '1M'])

// ── helpers ──
const lb = (T, x) => { let lo = 0, hi = T.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T[m] < x) lo = m + 1; else hi = m } return lo }   // first index with T ≥ x
const lastLE = (T, x) => lb(T, x + 1e-9) - 1   // works for integer-ms times: last index with T ≤ x
const pct = (arr, q) => { if (arr.length < 50) return null; const s = Float64Array.from(arr).sort(); return s[Math.floor(q * (s.length - 1))] }
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)] }
const yearOf = (t) => new Date(t).getUTCFullYear()
const nyHourCache = new Map(), NYF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' })
const nyHour = (t) => { const k = Math.floor(t / HR); let h = nyHourCache.get(k); if (h == null) { h = +NYF.format(new Date(k * HR)) % 24; nyHourCache.set(k, h) } return h }

// ── context data (each with its coverage; outside it → null = MISSING) ──
const ff = fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'ff_history.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).sort((a, b) => a.t - b.t)
const FF = { T: Float64Array.from(ff.map((e) => e.t)), e: ff, start: ff[0].t, end: ff.at(-1).t }
const FEDRX = /FOMC|Federal Funds Rate|Fed Chair|Powell|Yellen/i
const ffIn = (a, z) => { const out = []; for (let j = lb(FF.T, a); j < FF.T.length && FF.T[j] <= z; j++) out.push(FF.e[j]); return out }
const news = fs.readFileSync(path.join(TURBO.root, 'data', 'news', 'polygon_news.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((n) => ({ t: n.t ?? Date.parse(n.published_utc), x: `${n.title ?? ''} ${n.description ?? ''}` })).sort((a, b) => a.t - b.t)
const KW = { war: /\b(war|attack|missile|strike|invasion|conflict|military|troops|ceasefire|iran|israel|ukraine|russia)\b/i, tariff: /\b(tariff|trade war|sanction|export ban|duties)\b/i, fiscal: /\b(shutdown|debt ceiling|deficit|default|downgrade|treasury auction)\b/i }
const NW = { T: Float64Array.from(news.map((n) => n.t)), war: news.map((n) => KW.war.test(n.x)), tariff: news.map((n) => KW.tariff.test(n.x)), fiscal: news.map((n) => KW.fiscal.test(n.x)), start: news[0].t, end: news.at(-1).t }
const newsAny = (k, a, z) => { if (a < NW.start || z > NW.end) return null; for (let j = lb(NW.T, a); j < NW.T.length && NW.T[j] <= z; j++) if (NW[k][j]) return true; return false }
const newsCount = (a, z) => { if (a < NW.start || z > NW.end) return null; let n = 0; for (let j = lb(NW.T, a); j < NW.T.length && NW.T[j] <= z; j++) if (NW.war[j] || NW.tariff[j] || NW.fiscal[j]) n++; return n }
const yrows = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'macro', 'treasury-yields.json'), 'utf8')).rows.filter((r) => r.yield_10_year != null).map((r) => ({ k: Date.parse(r.date) + DAY, y: r.yield_10_year })).sort((a, b) => a.k - b.k)
const Y = { K: Float64Array.from(yrows.map((r) => r.k)), y: yrows.map((r) => r.y) }
const yieldAt = (t) => { const j = lastLE(Y.K, t); return j >= 0 && t - Y.K[j] < 5 * DAY ? { y: Y.y[j], k: Y.K[j] } : null }
async function minuteVol(sym) { try { const b = (await loadBars(sym, '1m', { from: START })).bars; const T = new Float64Array(b.length), CV = new Float64Array(b.length + 1)
  b.forEach((x, i) => { T[i] = x.t; CV[i + 1] = CV[i] + (x.v || 0) }); return { T, CV, start: b[0]?.t ?? Infinity, end: b.at(-1)?.t ?? -Infinity } } catch { return null } }
const volIn = (S, a, z) => { const i = lb(S.T, a), j = lb(S.T, z); return j > i ? S.CV[j] - S.CV[i] : 0 }   // minutes with t ∈ [a, z)
const GF = await minuteVol('GOLD_FUT'), GLD = await minuteVol('GLD')
log(`context: FF ${ff.length} (${new Date(FF.start).toISOString().slice(0, 10)} → ${new Date(FF.end).toISOString().slice(0, 10)}) · news ${news.length} · yields ${yrows.length} · GOLD_FUT ${GF?.T.length ?? 'none'} · GLD ${GLD?.T.length ?? 'none'}`)

// ── candles ──
const K = kit(SYM), M = await clean1m(SYM), holes = findHoles(M)
const DX = SYM === 'XAUUSD' ? await clean1m('DXY') : null
log(`${SYM} minutes ${M.length} · holes ${holes.length} · DXY minutes ${DX?.length ?? 0} (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
function tfSet(tf) { const C = K.build(M, tf); markIncomplete(C, holes); const breaks = new Set(); C.forEach((c, i) => { if (c.incomplete) breaks.add(i) })
  const z = zigzag(C, { k: 3, atrLen: 14, breaks }); return { C, breaks, sw: z.swings, failed: z.failed } }
// the previous calendar year's percentile thresholds (causal: year Y uses Y−1 values only)
function prevYearThr(C, val, q) { const by = new Map(); C.forEach((c, i) => { const v = val(i); if (v != null && isFinite(v)) { const y = yearOf(c.t); if (!by.has(y)) by.set(y, []); by.get(y).push(v) } })
  const thr = new Map(); for (const [y, a] of by) thr.set(y + 1, pct(a, q)); return thr }
// swing lists by type sorted by knownT (for "last confirmed by time t")
const byKnown = (sw) => { const o = {}; for (const ty of ['H', 'L']) { const a = sw.filter((s) => s.type === ty).sort((x, y) => x.knownT - y.knownT); o[ty] = { a, K: Float64Array.from(a.map((s) => s.knownT)) } } const all = [...sw].sort((x, y) => x.knownT - y.knownT); o.all = { a: all, K: Float64Array.from(all.map((s) => s.knownT)) }; return o }
const lastKnown = (ix, t, n = 1) => { const j = lastLE(ix.K, t); return j < 0 ? [] : ix.a.slice(Math.max(0, j - n + 1), j + 1) }

// 1D / 1W reference sets (levels l1 / l2), built once
const D1 = tfSet('1D'), W1 = tfSet('1W'), D1K = byKnown(D1.sw), W1K = byKnown(W1.sw)
const D1T = Float64Array.from(D1.C.map((c) => c.t)), W1T = Float64Array.from(W1.C.map((c) => c.t))
const ORDER = [...TFS].reverse()   // 1M first, so each TF's higher TF is already done
let htfIdx = null
const summary = { at: new Date().toISOString(), symbol: SYM, spec: 'docs/research/wave_reasons/2026-10-30_T0_wave_reasons_SPEC.md (v1 + addendum B)', items: ITEMS, train_end: '2021-06-30', tf: {}, audit: { known_t_violations: 0, swing_book: {}, dropped: {} } }
const swingBook = (tf) => { const f = path.join(TURBO.root, 'docs', 'swing_book', `${SHORT[SYM]}_1y_swings`, `${tf}.csv`); if (!fs.existsSync(f)) return null
  const L = fs.readFileSync(f, 'utf8').trim().split('\n'), H = L[0].split(','); return L.slice(1).map((l) => { const v = l.split(','), o = {}; H.forEach((h, i) => (o[h] = v[i])); return o }) }
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')

for (const tf of ORDER) {
  if (ONLY && !ONLY.includes(tf)) { if (ORDER.indexOf(tf) < Math.max(...ONLY.map((x) => ORDER.indexOf(x)))) htfIdx = byKnown(tfSet(tf).sw); continue }
  const tT = Date.now(), G = tf === '1D' ? D1 : tf === '1W' ? W1 : tfSet(tf), { C, sw, failed } = G
  const A = atrArr(C, 14), A5 = atrArr(C, 5), A50 = atrArr(C, 50), R = rsiArr(C, 14), E = emaArr(C, 50), ownK = byKnown(sw), htf = htfIdx
  // swing-book equality (bias audit 2)
  // 1m: on Windows 1m.csv and 1M.csv are the SAME file (case-insensitive), the 1M table overwrote it → check the recorded 1m counts instead (addendum C)
  const rec = tf === '1m' ? JSON.parse(fs.readFileSync(path.join(TURBO.master, `${SHORT[SYM]}_1y_swings.json`), 'utf8')) : null
  if (rec) { const a = Date.parse(rec.window[0]), z = Date.parse(rec.window[1]), built = Date.parse(rec.at), x = rec.tf['1m']
    const mine = sw.filter((s) => C[s.i].t >= a && C[s.i].t <= z && s.knownT <= built), got = { swings: mine.length, highs: mine.filter((s) => s.type === 'H').length, lows: mine.filter((s) => s.type === 'L').length, first: mine[0] ? iso(C[mine[0].i].t) : null, last: mine.at(-1) ? iso(C[mine.at(-1).i].t) : null }
    summary.audit.swing_book[tf] = { method: 'recorded 1m counts in data/master/' + `${SHORT[SYM]}_1y_swings.json` + ' (1m.csv overwritten by 1M.csv)', book: x, mine: got, confirmed_after_book: sw.filter((s) => C[s.i].t >= a && C[s.i].t <= z && s.knownT > built).length,
      pass: got.swings === x.swings && got.highs === x.highs && got.lows === x.lows && got.first === x.first && got.last === x.last } }
  const book = rec ? null : swingBook(tf); if (book && book.length) { const a = Date.parse(book[0].candle_open), z = Date.parse(book.at(-1).candle_open)
    const mine = sw.filter((s) => C[s.i].t >= a && C[s.i].t <= z).map((s) => ({ k: `${iso(C[s.i].t)}|${s.type === 'H' ? 'HIGH' : 'LOW'}`, px: s.px }))
    const bk = new Map(book.map((r) => [`${r.candle_open}|${r.type}`, +r.price])), mk = new Map(mine.map((m) => [m.k, m.px]))
    let missing = 0, extra = 0, pxdiff = 0; for (const [k, p] of bk) { if (!mk.has(k)) missing++; else if (Math.abs(mk.get(k) - p) > 0.011) pxdiff++ } for (const k of mk.keys()) if (!bk.has(k)) extra++
    summary.audit.swing_book[tf] = { book: bk.size, mine: mk.size, missing, extra, price_diff: pxdiff, pass: missing === 0 && extra === 0 && pxdiff === 0 } }
  // DXY candles on the same TF (gold grid), aligned by candle open
  let dxyC = null, dxyThr = null; if (DX) { const DC = K.build(DX, tf); const m = new Map(DC.map((c) => [c.t, c.c])); dxyC = m
    dxyThr = prevYearThr(DC, (i) => (i > 0 && DC[i - 1].c > 0 ? Math.abs(DC[i].c / DC[i - 1].c - 1) : null), 0.8) }
  const extThr = prevYearThr(C, (i) => (A[i - 1] > 0 && E[i] != null ? Math.abs(C[i].c - E[i]) / A[i - 1] : null), 0.9)
  // footprints (TF ≤ 4H, gold only)
  let FP = null; if (SYM === 'XAUUSD' && TFI[tf] <= TFI['4H']) { try { FP = new Map((await footprintCandles(tf)).map((f) => [f.t, f])) } catch (e) { log(`${tf}: footprints unavailable (${e.message})`) } }
  let fpStart = Infinity, fpEnd = -Infinity; if (FP) for (const t of FP.keys()) { if (t < fpStart) fpStart = t; if (t > fpEnd) fpEnd = t }
  const dropped = { warmup: 0, incomplete: 0, before_start: 0 }

  // ── the 24 items for candle i treated as a turn of type ty ──
  function items(i, ty) {
    const c = C[i], p = C[i - 1], a = A[i - 1], D = c.close_t, W0 = p.t, up = ty === 'L' ? 1 : -1, px = ty === 'L' ? c.l : c.h, r = {}
    let maxK = -Infinity; const k = (t) => { if (t > maxK) maxK = t }
    // 1 news (FF; scheduled release time = known time of actual / better)
    if (W0 >= FF.start && D <= FF.end) { const ev = ffIn(W0, D); ev.forEach((e) => k(e.t))
      r.news_high = ev.some((e) => e.impact === 'high')
      const hm = ev.filter((e) => e.impact === 'high' || e.impact === 'medium')
      r.news_surprise_sup = hm.some((e) => (up > 0 ? e.better === 2 : e.better === 1)); r.news_surprise_any = hm.some((e) => e.better === 1 || e.better === 2)
      r.fed_event = ev.some((e) => FEDRX.test(e.name)) } else { r.news_high = r.news_surprise_sup = r.news_surprise_any = r.fed_event = null }
    // 2 headlines
    for (const kw of ['war', 'tariff', 'fiscal']) r[`head_${kw}`] = newsAny(kw, W0, D)
    // 3 dollar / rates
    if (dxyC) { const x = dxyC.get(c.t), y = dxyC.get(p.t), thr = dxyThr.get(yearOf(c.t)); if (x && y && thr != null) { const ch = x / y - 1; r.dxy_sup = (up > 0 ? ch < 0 : ch > 0) && Math.abs(ch) >= thr } else r.dxy_sup = null } else r.dxy_sup = null
    if (DAILY.has(tf)) { const y0 = yieldAt(W0), y1 = yieldAt(D); if (y0 && y1) { k(y1.k); const bp = (y1.y - y0.y) * 100; r.yield_sup = up > 0 ? bp <= -5 : bp >= 5 } else r.yield_sup = null } else r.yield_sup = null
    // 4 levels
    const near = (L) => a > 0 && L != null && Math.abs(px - L) <= 0.25 * a
    const lv = [...lastKnown(ownK[ty], c.t, 6), ...lastKnown(D1K[ty], c.t, 4), ...lastKnown(W1K[ty], c.t, 4)]; lv.forEach((s) => k(s.knownT))
    r.lvl_prior_swing = lv.some((s) => near(s.px))
    if (TFI[tf] < TFI['1W']) { const dj = lastLE(D1T, c.t), wj = lastLE(W1T, c.t), pd = dj >= 1 ? D1.C[dj - 1] : null, pw = wj >= 1 ? W1.C[wj - 1] : null
      if (pd) k(pd.close_t); if (pw) k(pw.close_t)
      r.lvl_prev_day_week = (pd && pd.close_t <= c.t && near(up > 0 ? pd.l : pd.h)) || (pw && pw.close_t <= c.t && near(up > 0 ? pw.l : pw.h)) || false } else r.lvl_prev_day_week = null
    r.lvl_round = near(Math.round(px / 50) * 50)
    // 5 liquidity / exhaustion
    const an = anatomy(c, p, a); r.sweep = up > 0 ? !!an.sweep_low_reclaim : !!an.sweep_high_reject
    r.climax = c.h - c.l >= 2 * a
    r.compression_before = A5[i - 1] > 0 && A50[i - 1] > 0 ? A5[i - 1] / A50[i - 1] <= 0.7 : null
    const ps = lastKnown(ownK[ty], c.t, 1)[0]; if (ps && R[i] != null && R[ps.i] != null) { k(ps.knownT); r.rsi_div = up > 0 ? px < ps.px && R[i] > R[ps.i] : px > ps.px && R[i] < R[ps.i] } else r.rsi_div = null
    const et = extThr.get(yearOf(c.t)); r.overextended = et != null && E[i] != null ? Math.abs(c.c - E[i]) / a >= et : null
    // 6 session / time
    if (TFI[tf] <= TFI['1H']) { let hit = false; for (let t = Math.floor(c.t / HR) * HR; t < c.close_t; t += HR) if ([3, 8, 9, 18].includes(nyHour(t))) { hit = true; break } r.open_hour = hit } else r.open_hour = null
    if (TFI[tf] <= TFI['1D']) { const d = new Date(c.td), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); r.month_end = d.getUTCDate() >= last - 2
      r.holiday_near = D - DAY >= FF.start && D + DAY <= FF.end ? ffIn(D - DAY, D + DAY).some((e) => e.impact === 'holiday') : null } else { r.month_end = null; r.holiday_near = null }
    // 7 flows
    if (GF && TFI[tf] < TFI['1D'] && c.t >= GF.start + 21 * DAY && c.close_t <= GF.end) { const v = volIn(GF, c.t, c.close_t), hist = []
      for (let d = 1; d <= 20; d++) { const x = volIn(GF, c.t - d * DAY, c.close_t - d * DAY); if (x > 0) hist.push(x) } const m = hist.length >= 5 ? med(hist) : null
      r.cme_vol_spike = m ? v >= 2 * m : null } else r.cme_vol_spike = null
    if (FP && c.t >= fpStart && c.t <= fpEnd) { const f = FP.get(c.t), fr = f ? footprintRead(f) : null; r.absorption = fr ? (up > 0 ? !!fr.absorption_low : !!fr.absorption_high) : null } else r.absorption = null
    if (GLD && tf === '1D' && c.t >= GLD.start + 30 * DAY && c.close_t <= GLD.end) { const v = volIn(GLD, c.t, c.close_t), hist = []
      for (let d = 1; d <= 20 && i - d >= 0; d++) { const x = volIn(GLD, C[i - d].t, C[i - d].close_t); if (x > 0) hist.push(x) } r.gld_vol_spike = hist.length >= 10 && v > 0 ? v >= 2 * med(hist) : null } else r.gld_vol_spike = null
    // 8 higher TF
    if (htf) { const hs = lastKnown(htf.all, D, 1)[0]; if (hs) { k(hs.knownT); r.htf_with = hs.type === ty } else r.htf_with = null } else r.htf_with = null
    // addendum D inputs (not reason items): volatility stratum, surprise AGAINST the new wave, big DXY move either way
    const rv = (c.h - c.l) / a; r._vb = rv < 1 ? 0 : rv < 1.5 ? 1 : rv < 2 ? 2 : 3
    r._sa = r.news_surprise_any == null ? null : ffIn(W0, D).some((e) => (e.impact === 'high' || e.impact === 'medium') && (up > 0 ? e.better === 1 : e.better === 2))
    if (dxyC) { const x = dxyC.get(c.t), y = dxyC.get(p.t), thr = dxyThr.get(yearOf(c.t)); r._db = x && y && thr != null ? Math.abs(x / y - 1) >= thr : null } else r._db = null
    if (maxK > D) summary.audit.known_t_violations++
    return r
  }
  const ok = (i) => { if (i < 51) { dropped.warmup++; return false } if (C[i].incomplete || C[i - 1].incomplete) { dropped.incomplete++; return false } if (C[i].t < START) { dropped.before_start++; return false } if (!(A[i - 1] > 0)) { dropped.warmup++; return false } return true }
  const valid = (i) => i >= 51 && !C[i].incomplete && !C[i - 1].incomplete && C[i].t >= START && A[i - 1] > 0   // controls: same rule, not counted as dropped turns
  // ── real turns + wave rows ──
  const ws = fs.createWriteStream(path.join(ROWDIR, `${tf}.jsonl`)), rows = []   // rows: { set, t, it } compact for stats
  const pack = (r) => ITEMS.map((x) => (r[x] == null ? -1 : r[x] ? 1 : 0)), ext = (r) => [r._vb, r._sa == null ? -1 : +r._sa, r._db == null ? -1 : +r._db]
  for (let n = 0; n < sw.length; n++) { const s = sw[n]; if (!ok(s.i)) continue
    const r = items(s.i, s.type), nx = sw[n + 1], c = C[s.i]
    const carried = nx ? { wave_to: iso(C[nx.i].t), size_atr: nx.amp_atr != null ? +nx.amp_atr.toFixed(2) : null, bars: nx.i - s.i, atr_per_bar: nx.amp_atr != null ? +(nx.amp_atr / Math.max(1, nx.i - s.i)).toFixed(3) : null,
      high_events_in_wave: c.t >= FF.start && C[nx.i].close_t <= FF.end ? ffIn(c.t, C[nx.i].close_t).filter((e) => e.impact === 'high').length : null,
      headlines_in_wave: newsCount(c.t, C[nx.i].close_t), dxy_pct_over_wave: dxyC && dxyC.get(c.t) && dxyC.get(C[nx.i].t) ? +((dxyC.get(C[nx.i].t) / dxyC.get(c.t) - 1) * 100).toFixed(3) : null } : { wave_to: null }
    ws.write(JSON.stringify({ turn: s.type === 'H' ? 'HIGH' : 'LOW', candle: iso(c.t), decision_t: iso(c.close_t), confirmed_t: iso(s.knownT), price: +s.px.toFixed(2), ...r, unexplained: ITEMS.every((x) => !r[x]), carried_DESCRIPTIVE: carried }) + '\n')
    rows.push({ set: 'R', t: c.t, it: pack(r), x: ext(r) }) }
  await new Promise((res) => ws.end(res))
  // ── controls ──
  for (const f of failed) { if (!valid(f.i)) continue; const r = items(f.i, f.type), it = pack(r), x = ext(r); rows.push({ set: 'A', t: C[f.i].t, it, x }); if (f.pullback_atr >= 1.0) rows.push({ set: 'F', t: C[f.i].t, it, x }) }
  const near3 = new Uint8Array(C.length); for (const s of sw) for (let d = -3; d <= 3; d++) if (s.i + d >= 0 && s.i + d < C.length) near3[s.i + d] = 1
  const pool = new Map(); C.forEach((c, i) => { if (i >= 51 && !near3[i] && !c.incomplete && !C[i - 1].incomplete && c.t >= START && A[i - 1] > 0) { const key = yearOf(c.t) * 100 + new Date(c.t).getUTCHours(); if (!pool.has(key)) pool.set(key, []); pool.get(key).push(i) } })
  const rr = rng(2026 + TFI[tf]); for (const s of sw) { if (!valid(s.i)) continue; const P = pool.get(yearOf(C[s.i].t) * 100 + new Date(C[s.i].t).getUTCHours()); if (!P) continue
    for (let q = 0; q < 3; q++) { const i = P[Math.floor(rr() * P.length)], r = items(i, s.type); rows.push({ set: 'C', t: C[i].t, it: pack(r), x: ext(r) }) } }
  summary.audit.dropped[tf] = dropped
  summary.tf[tf] = { rows, n: { real: rows.filter((r) => r.set === 'R').length, C1: rows.filter((r) => r.set === 'F').length, C1_all: rows.filter((r) => r.set === 'A').length, C2: rows.filter((r) => r.set === 'C').length } }
  log(`${tf.padEnd(3)} candles ${String(C.length).padStart(8)} · turns ${summary.tf[tf].n.real} · C1 ${summary.tf[tf].n.C1} (all ${summary.tf[tf].n.C1_all}) · C2 ${summary.tf[tf].n.C2} · ${((Date.now() - tT) / 1000).toFixed(0)} s`)
  htfIdx = ownK
}

// ════ statistics ════
const SPLITS = { TRAIN: (t) => t < TRAIN_END, OOS: (t) => t >= TRAIN_END }
const katzLB = (k1, n1, k2, n2) => (k1 > 0 && k2 > 0 ? Math.exp(Math.log((k1 / n1) / (k2 / n2)) - 1.96 * Math.sqrt(1 / k1 - 1 / n1 + 1 / k2 - 1 / n2)) : null)
function count(rows, set, j, pred) { let k = 0, n = 0; for (const r of rows) if (r.set === set && pred(r.t)) { const v = r.it[j]; if (v >= 0) { n++; k += v } } return { k, n } }
function cells(tfRows, label = (r) => r.set) {   // label() lets the shuffled null relabel R / F
  const out = []
  for (const [tf, { rows }] of Object.entries(tfRows)) { const L = rows.map((r) => ({ ...r, set: label(r) }))
    ITEMS.forEach((item, j) => { const c = { tf, item, group: GROUP[item] }
      for (const [sp, pr] of Object.entries(SPLITS)) { const a = count(L, 'R', j, pr), b = count(L, 'F', j, pr), cc = count(L, 'C', j, pr), cmp = compareRates(a.k, a.n, b.k, b.n)
        c[sp] = { real: a, C1: b, C2: cc, p_real: a.n ? +(a.k / a.n).toFixed(4) : null, p_C1: b.n ? +(b.k / b.n).toFixed(4) : null, p_C2: cc.n ? +(cc.k / cc.n).toFixed(4) : null,
          lift: cmp.ratio != null ? +cmp.ratio.toFixed(3) : null, lift_LB: katzLB(a.k, a.n, b.k, b.n), p: cmp.p, lift_C2: cc.n && cc.k ? +((a.k / a.n) / (cc.k / cc.n)).toFixed(3) : null, p_C2v: compareRates(a.k, a.n, cc.k, cc.n).p } }
      const wf = []; for (let y = 2018; y <= 2025; y++) { const pr = (t) => yearOf(t) === y, a = count(L, 'R', j, pr), b = count(L, 'F', j, pr); if (a.n >= 30 && b.n >= 30) wf.push({ y, d: a.k / a.n - b.k / b.n }) }
      c.wf = wf; if (c.TRAIN.real.n || c.OOS.real.n) out.push(c) }) }
  for (const sp of Object.keys(SPLITS)) { const fam = out.map((c) => ({ key: `${c.tf}|${c.item}`, p: c[sp].real.n && c[sp].C1.n ? c[sp].p : null, c })); holm(fam); fam.forEach((f) => (f.c[sp].holm = f.holm_pass)) }
  { const fam = out.map((c) => ({ p: c.OOS.real.n && c.OOS.C2.n ? c.OOS.p_C2v : null, c })); holm(fam); fam.forEach((f) => (f.c.OOS.holm_C2 = f.holm_pass)) }
  for (const c of out) { const powered = ['TRAIN', 'OOS'].every((sp) => c[sp].real.n >= 100 && c[sp].C1.n >= 100), dir = Math.sign((c.OOS.lift ?? 1) - 1)
    const sameTrain = Math.sign((c.TRAIN.lift ?? 1) - 1) === dir && dir !== 0, wfOk = c.wf.length > 0 && c.wf.filter((w) => Math.sign(w.d) === dir).length / c.wf.length >= 0.8
    const lbOk = dir > 0 ? c.OOS.lift_LB != null && c.OOS.lift_LB > 1 : c.OOS.lift_LB != null && c.OOS.lift != null && Math.exp(2 * Math.log(c.OOS.lift) - Math.log(c.OOS.lift_LB)) < 1   // anti: Katz UB < 1
    c.pass15 = powered && sameTrain && c.TRAIN.holm && c.OOS.holm && lbOk && wfOk
    c.label = !powered ? 'DESCRIBED ONLY' : c.pass15 ? (dir > 0 ? 'REASON (pending bootstrap)' : 'ANTI-REASON (pending bootstrap)') : c.OOS.holm_C2 && (c.OOS.lift_C2 ?? 1) > 1 ? 'present at turns, not knowable' : 'present, not explanatory'
    c.wf_same_sign = c.wf.length ? `${c.wf.filter((w) => Math.sign(w.d) === dir).length}/${c.wf.length}` : '0/0' }
  return out
}
const real = cells(summary.tf)
// week-block bootstrap (B = 1000) of the OOS lift, only for cells passing 1-5
for (const c of real.filter((x) => x.pass15)) { const j = ITEMS.indexOf(c.item), rows = summary.tf[c.tf].rows.filter((r) => (r.set === 'R' || r.set === 'F') && r.t >= TRAIN_END && r.it[j] >= 0)
  const wk = new Map(); for (const r of rows) { const w = Math.floor(r.t / (7 * DAY)); if (!wk.has(w)) wk.set(w, { rk: 0, rn: 0, fk: 0, fn: 0 }); const o = wk.get(w); if (r.set === 'R') { o.rn++; o.rk += r.it[j] } else { o.fn++; o.fk += r.it[j] } }
  const W = [...wk.values()], rr = rng(7), L = []; for (let b = 0; b < 1000; b++) { let rk = 0, rn = 0, fk = 0, fn = 0; for (let q = 0; q < W.length; q++) { const o = W[Math.floor(rr() * W.length)]; rk += o.rk; rn += o.rn; fk += o.fk; fn += o.fn } if (rn && fn && fk) L.push((rk / rn) / (fk / fn)) }
  L.sort((a, b) => a - b); c.boot = { lo: +L[Math.floor(0.025 * L.length)].toFixed(3), hi: +L[Math.floor(0.975 * L.length)].toFixed(3), B: L.length }
  const anti = c.OOS.lift < 1; c.pass = anti ? c.boot.hi < 1 : c.boot.lo > 1; c.label = c.pass ? (anti ? 'ANTI-REASON' : 'REASON') : 'present, not explanatory (bootstrap failed)' }
// ── addendum D diagnostics for every REASON / ANTI-REASON cell ──
const JA = ITEMS.indexOf('news_surprise_any'), JS = ITEMS.indexOf('news_surprise_sup'), JD = ITEMS.indexOf('dxy_sup')
for (const c of real.filter((x) => x.pass)) { const j = ITEMS.indexOf(c.item), rows = summary.tf[c.tf].rows.filter((r) => (r.set === 'R' || r.set === 'F') && r.t >= TRAIN_END && r.it[j] >= 0)
  // D1: Mantel-Haenszel risk ratio vs C1 within volatility strata, week-block bootstrap B = 500
  const wk = new Map(); for (const r of rows) { const w = Math.floor(r.t / (7 * DAY)); if (!wk.has(w)) wk.set(w, Array.from({ length: 4 }, () => ({ rk: 0, rn: 0, fk: 0, fn: 0 }))); const o = wk.get(w)[r.x[0]]; if (r.set === 'R') { o.rn++; o.rk += r.it[j] } else { o.fn++; o.fk += r.it[j] } }
  const mh = (weeks) => { const S = Array.from({ length: 4 }, () => ({ rk: 0, rn: 0, fk: 0, fn: 0 })); for (const w of weeks) w.forEach((o, k) => { S[k].rk += o.rk; S[k].rn += o.rn; S[k].fk += o.fk; S[k].fn += o.fn })
    let num = 0, den = 0; for (const s of S) { const N = s.rn + s.fn; if (s.rn && s.fn) { num += (s.rk * s.fn) / N; den += (s.fk * s.rn) / N } } return { v: den > 0 ? num / den : null, S } }
  const W = [...wk.values()], est = mh(W), rb = rng(11), L = []; for (let b = 0; b < 500; b++) { const pick = []; for (let q = 0; q < W.length; q++) pick.push(W[Math.floor(rb() * W.length)]); const m = mh(pick).v; if (m != null) L.push(m) } L.sort((a, b) => a - b)
  const anti = c.OOS.lift < 1, lo = L[Math.floor(0.025 * L.length)], hi = L[Math.floor(0.975 * L.length)]
  c.D1 = { mh_lift: est.v != null ? +est.v.toFixed(3) : null, lo: +lo.toFixed(3), hi: +hi.toFixed(3), strata: est.S.map((s) => ({ real: `${s.rk}/${s.rn}`, C1: `${s.fk}/${s.fn}` })),
    label: c.item === 'climax' ? 'is the volatility burst (stratum variable)' : (anti ? hi < 1 : lo > 1) ? 'SURVIVES VOLATILITY' : 'volatility, not a reason of its own' }
  // D2: direction — among turns with a surprise (news items) / a big DXY move (dxy_sup), the share that SUPPORTS the new wave, real vs C1
  const dir = (cond, supJ) => { const a = rows.filter((r) => r.set === 'R' && cond(r)), b = rows.filter((r) => r.set === 'F' && cond(r)), ka = a.filter((r) => r.it[supJ] === 1).length, kb = b.filter((r) => r.it[supJ] === 1).length, cmp = compareRates(ka, a.length, kb, b.length)
    return { real: `${ka}/${a.length}`, C1: `${kb}/${b.length}`, p_real: a.length ? +(ka / a.length).toFixed(3) : null, p_C1: b.length ? +(kb / b.length).toFixed(3) : null, p: cmp.p, label: cmp.p != null && cmp.p < 0.05 && ka / a.length > kb / b.length ? 'direction carries information' : 'tells WHEN, not WHICH WAY' } }
  if (/^news_|^fed_event$/.test(c.item)) c.D2 = dir((r) => r.it[JA] === 1, JS)
  if (c.item === 'dxy_sup') { const all = summary.tf[c.tf].rows.filter((r) => (r.set === 'R' || r.set === 'F') && r.t >= TRAIN_END && r.x[2] === 1); c.D2 = dir.call(null, () => true, JD); const a = all.filter((r) => r.set === 'R'), b = all.filter((r) => r.set === 'F')
    const ka = a.filter((r) => r.it[JD] === 1).length, kb = b.filter((r) => r.it[JD] === 1).length, cmp = compareRates(ka, a.length, kb, b.length)
    c.D2 = { among: 'big DXY move either way', real: `${ka}/${a.length}`, C1: `${kb}/${b.length}`, p_real: +(ka / a.length).toFixed(3), p_C1: +(kb / b.length).toFixed(3), p: cmp.p, label: cmp.p < 0.05 && ka / a.length > kb / b.length ? 'direction carries information' : 'tells WHEN, not WHICH WAY' } } }
// shuffled-label null (bias audit 4): permute R / F labels within TF × year, re-run steps 1-5
const rs = rng(7), shuffledTf = {}
for (const [tf, { rows }] of Object.entries(summary.tf)) { const g = new Map(); rows.forEach((r, idx) => { if (r.set === 'R' || r.set === 'F') { const y = yearOf(r.t); if (!g.has(y)) g.set(y, []); g.get(y).push(idx) } })
  const lab = rows.map((r) => r.set); for (const idx of g.values()) { const L = idx.map((i) => lab[i]); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [L[i], L[j]] = [L[j], L[i]] } idx.forEach((i, q) => (lab[i] = L[q])) }
  shuffledTf[tf] = { rows: rows.map((r, i) => ({ ...r, set: lab[i] })) } }
const nullCells = cells(shuffledTf)
summary.audit.shuffled_null = { cells: nullCells.length, pass_1_5: nullCells.filter((c) => c.pass15).length, median_abs_log_lift_OOS: +med(nullCells.filter((c) => c.OOS.lift).map((c) => Math.abs(Math.log(c.OOS.lift)))).toFixed(4), pass: nullCells.filter((c) => c.pass15).length === 0 }
summary.audit.K = { TRAIN: real.filter((c) => c.TRAIN.real.n && c.TRAIN.C1.n).length, OOS: real.filter((c) => c.OOS.real.n && c.OOS.C1.n).length }
// UNEXPLAINED shares per TF (real vs C1 vs C2)
summary.unexplained = {}; for (const [tf, { rows }] of Object.entries(summary.tf)) { const sh = (set) => { const L = rows.filter((r) => r.set === set); return L.length ? +(L.filter((r) => r.it.every((v) => v !== 1)).length / L.length).toFixed(4) : null }
  summary.unexplained[tf] = { real: sh('R'), C1: sh('F'), C1_all: sh('A'), C2: sh('C') } }
// stress sub-periods for every REASON / ANTI-REASON
const STRESS = { '2013-15': [2013, 2015], '2016-19': [2016, 2019], '2020': [2020, 2020], '2022': [2022, 2022], '2023-26': [2023, 2026] }
for (const c of real.filter((x) => x.pass)) { const j = ITEMS.indexOf(c.item), rows = summary.tf[c.tf].rows; c.stress = {}
  for (const [k, [a, z]] of Object.entries(STRESS)) { const pr = (t) => yearOf(t) >= a && yearOf(t) <= z, x = count(rows, 'R', j, pr), y = count(rows, 'F', j, pr); c.stress[k] = { n_real: x.n, n_C1: y.n, lift: x.n && y.n && y.k ? +((x.k / x.n) / (y.k / y.n)).toFixed(3) : null } } }
for (const tf of Object.keys(summary.tf)) delete summary.tf[tf].rows
summary.cells = real; summary.reasons = real.filter((c) => c.pass).map((c) => `${c.tf} ${c.item} ${c.label} OOS lift ${c.OOS.lift} (LB ${c.OOS.lift_LB?.toFixed(3)}, boot ${c.boot.lo}-${c.boot.hi}) n ${c.OOS.real.n}/${c.OOS.C1.n} wf ${c.wf_same_sign} · D1 ${c.D1.label} (MH ${c.D1.mh_lift} ${c.D1.lo}-${c.D1.hi})${c.D2 ? ` · D2 ${c.D2.label} (${c.D2.p_real} vs ${c.D2.p_C1})` : ''}`)
summary.audit.swing_book_all_pass = Object.values(summary.audit.swing_book).every((x) => x.pass)
summary.audit.valid = summary.audit.known_t_violations === 0 && summary.audit.swing_book_all_pass && summary.audit.shuffled_null.pass
summary.runtime_s = Math.round((Date.now() - t0) / 1000)
const sf = path.join(OUT, `2026-10-30_${SHORT[SYM]}_T0_summary${ONLY ? '_partial' : ''}.json`); fs.writeFileSync(sf, JSON.stringify(summary, null, 1))
log(`audit: known_t violations ${summary.audit.known_t_violations} · swing book ${summary.audit.swing_book_all_pass ? 'PASS' : 'FAIL'} · shuffled null passes ${summary.audit.shuffled_null.pass_1_5} → ${summary.audit.valid ? 'VALID' : 'VOID'}`)
log(`K TRAIN ${summary.audit.K.TRAIN} · OOS ${summary.audit.K.OOS} · REASON / ANTI cells ${summary.reasons.length}`); summary.reasons.forEach((s) => log('  ' + s))
log(`written ${path.relative(TURBO.root, sf)} · ${summary.runtime_s} s`)
