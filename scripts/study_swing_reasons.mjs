// ════════════════════════════════════════════════════════════════════════════════
// study_swing_reasons.mjs — the reasons checklist at every XAU 1D / 4H swing of the last year (docs/SWING_REASONS_CHECKLIST_SPEC.md; Ashraf
// 2026-10-18: "Yes, run it as written"). Every item uses only what was published by that time; ❌ items are reported as "no data".
// Writes docs/swing_book/xau_reasons/<tf>.csv + data/master/xau_swing_reasons.json. Controls: random candles (same TF, same NY hour, same
// year window, ≥ 3 candles from any swing), 3 per swing, same checklist → "at swings vs at ordinary candles".
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { raw1m, clean1m, kit, SHORT } from './lib/series_1m.mjs'
import { loadDxyBars } from '../src/data/dxy.js'
import { cleanForTv, buildCandles, candleOpen } from '../src/core/nyCandles.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { atr as atrArr, rsi as rsiArr, ema as emaArr } from '../src/core/indicators.js'
import { anatomy } from '../src/master/candleFeatures.js'
import { footprintCandles, footprintRead } from '../src/master/footprintTf.js'
import { indexSwings, flipAt } from './lib/swing_ladder.mjs'
import { rng } from '../src/core/studyStats.js'

const HR = 3600000, DAY = 24 * HR
const SYM = process.argv[2] || 'XAUUSD', K = kit(SYM), PARTNER = SYM === 'XAUUSD' ? 'XAGUSD' : 'XAUUSD'   // partner = the cross-asset check (items 22 / 23)
const raw = await raw1m(SYM, HISTORY_CONTINUOUS_FROM)
const M = K.clean(raw), holes = findHoles(M), LAST = M.at(-1).t, FROM = LAST - 365 * DAY, PRE = FROM - 60 * DAY
const log = (s) => console.log(`  ${s}`)
// ── context series (1m), price-at helpers ──
const ser = async (sym) => { try { const b = (await loadBars(sym, '1m', { from: PRE })).bars; return { t: Float64Array.from(b.map((x) => x.t)), c: Float64Array.from(b.map((x) => x.c)), v: Float64Array.from(b.map((x) => x.v || 0)) } } catch { return null } }
const S = { DXY: await (async () => { const b = (await loadDxyBars('1m', { from: PRE })).bars; return { t: Float64Array.from(b.map((x) => x.t)), c: Float64Array.from(b.map((x) => x.c)) } })() }
for (const s of ['USDJPY', 'BTCUSD', 'USDTRY', 'USDZAR', 'USDCNH', 'USDINR', 'WTI', 'GOLD_FUT', 'SILVER_FUT', 'GLD']) S[s] = await ser(s)
// the instrument's own real exchange volume (item 25): gold → CME GC, silver → CME SI, WTI → its own CL volume, DXY → none (an index)
const VOL = SYM === 'XAUUSD' ? S.GOLD_FUT : SYM === 'XAGUSD' ? S.SILVER_FUT : SYM === 'WTI' ? S.WTI : null
const ROUND = { XAUUSD: [50, 100], XAGUSD: [1, 5], WTI: [5, 10], DXY: [0.5, 1], DXY_ICE: [0.5, 1] }[SYM]
log('context series: ' + Object.entries(S).map(([k, v]) => `${k} ${v ? v.t.length : 'none'}`).join(' · '))
const lbT = (T, t) => { let lo = 0, hi = T.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m + 1; else hi = m } return lo - 1 }
const pxAt = (s, t) => { if (!s) return null; const i = lbT(s.t, t); return i >= 0 && t - s.t[i] < 3 * DAY ? s.c[i] : null }
const chg = (s, a, z) => { const x = pxAt(s, a), y = pxAt(s, z); return x && y ? y / x - 1 : null }
const sumV = (s, a, z) => { if (!s) return null; let v = 0, n = 0; for (let i = Math.max(0, lbT(s.t, a) + 1); i < s.t.length && s.t[i] < z; i++) { v += s.v[i]; n++ } return n ? v : null }
// ── calendar / news ──
const cal = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events
const ff = fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'ff_history.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const news = fs.readFileSync(path.join(TURBO.root, 'data', 'news', 'polygon_news.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const yields = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'macro', 'treasury-yields.json'), 'utf8')).rows.map((r) => ({ t: Date.parse(r.date), y: r.yield_10_year })).sort((a, b) => a.t - b.t)
const infl = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'macro', 'inflation-expectations.json'), 'utf8')).rows.map((r) => ({ t: Date.parse(r.date), e: r.model_10_year })).sort((a, b) => a.t - b.t)
const KW = { war: /\b(war|attack|missile|strike|invasion|conflict|military|troops|ceasefire|iran|israel|ukraine|russia)\b/i, tariff: /\b(tariff|trade war|sanction|export ban|duties)\b/i, fiscal: /\b(shutdown|debt ceiling|deficit|default|downgrade|treasury auction)\b/i }
const inWin = (arr, a, z) => arr.filter((e) => e.t >= a && e.t < z)
const ffKind = (n) => (/CPI|PPI|PCE/i.test(n) ? 'inflation' : /Non-Farm|Unemployment|Claims|JOLTS|ADP|Employment/i.test(n) ? 'jobs' : /Retail Sales|ISM|PMI|GDP|Durable|Industrial/i.test(n) ? 'growth' : 'other')
const surprise = (e) => (e.better === 1 ? 'USD+' : e.better === 2 ? 'USD−' : e.actual ? 'inline' : 'n/a')
// ── candles + swings per timeframe ──
const tfData = (tf, series = M) => { const C = K.build(series, tf); markIncomplete(C, holes); const br = new Set(C.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)); return { C, A: atrArr(C, 14), sw: zigzag(C, { k: 3, breaks: br }).swings } }
const AG = await clean1m(PARTNER)   // partner minutes, built on the TARGET's session grid in tfData (candle times align)
const ladderOf = { '4H': ['1H', '2H', '3H'], '1D': ['4H', '6H', '9H'] }, htfOf = { '4H': '1D', '1D': '1W' }
const fpCache = {}
async function runTf(tf) {
  const G = tfData(tf), { C, A, sw } = G, SV = tfData(tf, AG), H = tfData(htfOf[tf]), D1 = tfData('1D'), W1 = tfData('1W')
  const ladder = ladderOf[tf].map((x) => { const T = tfData(x); return indexSwings(T.C, T.sw) })
  const R = rsiArr(C, 14), E = emaArr(C, 50)
  fpCache[tf] ??= SYM === 'XAUUSD' ? new Map((await footprintCandles(tf)).map((f) => [f.t, f])) : new Map()   // CME GC footprint: gold only
  const idxOf = new Map(C.map((c, i) => [c.t, i])), svIdx = new Map(SV.C.map((c, i) => [c.t, i]))
  const yearI = C.map((c, i) => i).filter((i) => C[i].t >= FROM)
  const dists = yearI.map((i) => (A[i - 1] > 0 && E[i] != null ? Math.abs(C[i].c - E[i]) / A[i - 1] : null)).filter((x) => x != null).sort((a, b) => a - b), P90d = dists[Math.floor(0.9 * (dists.length - 1))]
  const legs = sw.filter((s) => s.t >= FROM && s.amp_atr != null).map((s) => s.amp_atr).sort((a, b) => a - b), P90l = legs[Math.floor(0.9 * (legs.length - 1))]
  const vByHour = (i) => { const c = C[i], hrs = []; for (let d = 1; d <= 20; d++) { const t = c.t - d * DAY, j = idxOf.get(t); if (j != null) { const v = sumV(VOL, C[j].t, C[j].close_t); if (v) hrs.push(v) } } hrs.sort((a, b) => a - b); return hrs.length >= 5 ? hrs[hrs.length >> 1] : null }
  const gldDay = (t) => { const d0 = candleOpen(t, '1D'), d = [], v = sumV(S.GLD, d0, d0 + DAY); for (let k = 1; k <= 20; k++) { const x = sumV(S.GLD, d0 - k * DAY, d0 - (k - 1) * DAY); if (x) d.push(x) } d.sort((a, b) => a - b); return v && d.length >= 10 ? v / d[d.length >> 1] : null }
  // the checklist for candle i treated as a turn of type ('H' | 'L'); prevSame / prevOpp = previous swings (for swings) or the last known ones (controls)
  function check(i, type, ctx) {
    const c = C[i], up = type === 'L' ? 1 : -1, a = A[i - 1], ta = C[Math.max(0, i - 1)].t, tz = C[Math.min(C.length - 1, i + 1)].close_t, la = ctx.prev ? C[ctx.prev.i].t : ta, px = type === 'L' ? c.l : c.h, r = {}
    const dx = SYM.startsWith('DXY') ? null : chg(S.DXY, ta, tz); r.r01_dxy_against = dx == null ? null : (up > 0 ? dx <= -0.0015 : dx >= 0.0015); r.r01_dxy_pct = dx   // n/a for DXY itself
    const day = candleOpen(c.t, '1D'), yi = yields.findIndex((y) => y.t >= day - DAY && y.t <= day + DAY), y0 = yi > 0 ? yields[yi - 1].y : null, y1 = yi >= 0 ? yields[yi].y : null
    r.r02_yield_bp = y0 != null && y1 != null ? +((y1 - y0) * 100).toFixed(1) : null; r.r02_yield_move = r.r02_yield_bp == null ? null : Math.abs(r.r02_yield_bp) >= 5
    const ie = infl.filter((x) => x.t <= c.t).at(-1); r.r03_real_yield = y1 != null && ie ? +(y1 - ie.e).toFixed(2) : null
    const off = inWin(cal, ta, tz); r.r04_fomc = off.some((e) => e.type === 'FOMC'); r.r05_fed_speech = off.filter((e) => e.type === 'FED_CHAIR' || e.type === 'FED_GOV').map((e) => e.who).join('; ') || false
    const fe = inWin(ff, ta, tz).filter((e) => e.impact === 'high' || e.impact === 'medium')
    for (const kind of ['inflation', 'jobs', 'growth']) { const x = fe.filter((e) => ffKind(e.name) === kind); r[`r0${kind === 'inflation' ? 6 : kind === 'jobs' ? 7 : 8}_${kind}`] = x.length ? x.map((e) => `${e.name} ${surprise(e)}`).join('; ') : false }
    r.r09_other_high = fe.filter((e) => e.impact === 'high' && ffKind(e.name) === 'other').map((e) => e.name).join('; ') || false
    r.r10_holiday = inWin(ff, ta, tz).some((e) => e.impact === 'holiday')
    const nw = inWin(news.map((n) => ({ ...n, t: n.t ?? Date.parse(n.published_utc) })), ta - DAY, tz), txt = nw.map((n) => n.title + ' ' + (n.description ?? '')).join(' ')
    r.r11_war_news = nw.length ? KW.war.test(txt) : null; r.r12_tariff_news = nw.length ? KW.tariff.test(txt) : null; r.r13_fiscal_news = nw.length ? KW.fiscal.test(txt) : null
    const jp = chg(S.USDJPY, ta, tz), bt = chg(S.BTCUSD, ta, tz); r.r14_risk_off = jp == null && bt == null ? null : (jp != null && jp <= -0.005) || (bt != null && bt <= -0.05)
    const tr = chg(S.USDTRY, ta, tz), za = chg(S.USDZAR, ta, tz); r.r15_em_stress = tr == null && za == null ? null : (tr != null && tr >= 0.01) || (za != null && za >= 0.01)
    const cn = chg(S.USDCNH, ta, tz), inr = chg(S.USDINR, ta, tz); r.r16_cny_weak = cn == null ? null : cn >= 0.003; r.r17_inr_weak = inr == null ? null : inr >= 0.003
    r.r18_cb_buying = 'no data'; r.r20_cot = 'no data'; r.r21_stocks_vix = 'no data'
    const gr = SYM === 'XAUUSD' ? gldDay(c.t) : null; r.r19_gld_volume = gr == null ? null : gr >= 2   // GLD = gold ETF: gold only
    const sj = svIdx.get(c.t); r.r22_silver_confirms = sj == null ? null : SV.sw.some((s) => s.type === type && Math.abs(s.i - sj) <= 1)
    if (ctx.prevSame) { const pj = svIdx.get(C[ctx.prevSame.i].t), beyond = up > 0 ? px < ctx.prevSame.px : px > ctx.prevSame.px
      const sNow = sj != null ? (up > 0 ? Math.min(...[-1, 0, 1].map((d) => SV.C[sj + d]?.l ?? Infinity)) : Math.max(...[-1, 0, 1].map((d) => SV.C[sj + d]?.h ?? -Infinity))) : null
      const sThen = pj != null ? (up > 0 ? Math.min(...[-1, 0, 1].map((d) => SV.C[pj + d]?.l ?? Infinity)) : Math.max(...[-1, 0, 1].map((d) => SV.C[pj + d]?.h ?? -Infinity))) : null
      r.r23_silver_diverges = sNow == null || sThen == null ? null : beyond && (up > 0 ? sNow >= sThen : sNow <= sThen) } else r.r23_silver_diverges = null
    const wt = chg(S.WTI, ta, tz); r.r24_oil_shock = wt == null ? null : Math.abs(wt) >= 0.03
    const gv = sumV(VOL, c.t, c.close_t), gm = vByHour(i); r.r25_cme_volume_x = gv && gm ? +(gv / gm).toFixed(2) : null; r.r25_cme_spike = r.r25_cme_volume_x == null ? null : r.r25_cme_volume_x >= 2
    const fp = fpCache[tf].get(c.t), fr = fp ? footprintRead(fp) : null; r.r26_absorption = fr ? (up > 0 ? !!fr.absorption_low : !!fr.absorption_high) : null
    const near = (L) => a > 0 && Math.abs(px - L) <= 0.25 * a
    const priorSame = sw.filter((s) => s.type === type && C[s.knownI].close_t <= c.t).slice(-6).map((s) => s.px).concat(D1.sw.filter((s) => s.type === type && D1.C[s.knownI].close_t <= c.t).slice(-4).map((s) => s.px), W1.sw.filter((s) => s.type === type && W1.C[s.knownI].close_t <= c.t).slice(-3).map((s) => s.px))
    r.r27_prior_swing_level = priorSame.some(near)
    const an = anatomy(c, C[i - 1], a); r.r28_liquidity_sweep = up > 0 ? !!an.sweep_low_reclaim : !!an.sweep_high_reject
    r.r29_round_number = ROUND.some((st) => near(Math.round(px / st) * st))
    const di = D1.C.findIndex((x) => x.t > c.t) - 1, pd = di >= 1 ? D1.C[di - 1] : null, wi = W1.C.findIndex((x) => x.t > c.t) - 1, pw = wi >= 1 ? W1.C[wi - 1] : null
    r.r30_prev_day_week = (pd && near(up > 0 ? pd.l : pd.h)) || (pw && near(up > 0 ? pw.l : pw.h)) || false
    r.r31_rsi_divergence = ctx.prevSame && R[i] != null && R[ctx.prevSame.i] != null ? (up > 0 ? px < ctx.prevSame.px && R[i] > R[ctx.prevSame.i] : px > ctx.prevSame.px && R[i] < R[ctx.prevSame.i]) : null
    const dist = a > 0 && E[i] != null ? Math.abs(c.c - E[i]) / a : null, legA = ctx.prev && a > 0 ? Math.abs(px - ctx.prev.px) / a : null
    r.r32_overextended = dist == null ? null : dist > P90d || (legA != null && legA > P90l)
    r.r33_climax_candle = a > 0 ? (c.h - c.l) >= 2 * a : null
    const ht = H.sw.filter((s) => H.C[s.knownI].close_t <= c.t).at(-1); r.r34_htf_leg = ht ? ((ht.type === 'L' ? 1 : -1) === up ? 'with' : 'against') : null
    r.r35_lower_tfs_flipped = ctx.isSwing ? ladder.reduce((n, idx) => { const f = flipAt(idx, type, px, c.t, c.close_t); return n + (f != null && f <= C[ctx.knownI].close_t ? 1 : 0) }, 0) : null
    const nyH = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(new Date(c.t)) % 24
    r.r36_session = tf === '1D' ? 'daily' : nyH >= 18 || nyH < 3 ? 'ASIA' : nyH < 8 ? 'LONDON' : 'NEWYORK'
    const d = new Date(c.td), lastDom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    r.r37_week_open = c.t <= candleOpen(c.t, '1W') + HR && c.close_t > candleOpen(c.t, '1W'); r.r37_month_end = d.getUTCDate() >= lastDom - 3; r.r37_quarter_end = r.r37_month_end && [2, 5, 8, 11].includes(d.getUTCMonth())
    const bd = []; for (let x = lastDom; x >= 1 && bd.length < 4; x--) { const w = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), x)).getUTCDay(); if (w !== 0 && w !== 6) bd.push(x) }
    r.r38_options_expiry = d.getUTCDate() === bd[3]
    r.r39_month = d.toISOString().slice(0, 7)
    return r
  }
  const rows = [], ctrl = [], rr = rng(2026 + tf.length), swingI = new Set(sw.map((s) => s.i))
  const pool = yearI.filter((i) => i > 30 && ![-3, -2, -1, 0, 1, 2, 3].some((d) => swingI.has(i + d)) && !C[i].incomplete)
  for (let n = 0; n < sw.length; n++) { const s = sw[n]; if (s.t < FROM) continue
    const prevSame = sw.slice(0, n).reverse().find((x) => x.type === s.type), prev = sw[n - 1]
    rows.push({ swing: s.type === 'H' ? 'HIGH' : 'LOW', candle: new Date(C[s.i].t).toISOString(), price: +s.px.toFixed(2), leg_atr: s.amp_atr != null ? +s.amp_atr.toFixed(2) : null, ...check(s.i, s.type, { prev, prevSame, isSwing: true, knownI: s.knownI }) })
    const hr = new Date(C[s.i].t).getUTCHours(), cands = pool.filter((i) => new Date(C[i].t).getUTCHours() === hr)
    for (let k = 0; k < 3 && cands.length; k++) { const i = cands[Math.floor(rr() * cands.length)], ps = sw.filter((x) => x.type === s.type && C[x.knownI].close_t <= C[i].t).at(-1), pv = sw.filter((x) => C[x.knownI].close_t <= C[i].t).at(-1)
      ctrl.push(check(i, s.type, { prev: pv, prevSame: ps, isSwing: false })) } }
  return { rows, ctrl }
}
const out = { at: new Date().toISOString(), symbol: SYM, partner: PARTNER, session: K.session, spec: 'docs/SWING_REASONS_CHECKLIST_SPEC.md', window: [new Date(FROM).toISOString(), new Date(LAST).toISOString()], tf: {} }
const dir = path.join(TURBO.root, 'docs', 'swing_book', `${SHORT[SYM]}_reasons`); fs.mkdirSync(dir, { recursive: true })
for (const tf of ['1D', '4H']) { const { rows, ctrl } = await runTf(tf)
  const keys = Object.keys(rows[0]).filter((k) => /^r\d\d_/.test(k)), prev = {}
  for (const k of keys) { const isTrue = (v) => v === true || (typeof v === 'string' && v && v !== 'no data' && !/^(with|against|daily|ASIA|LONDON|NEWYORK)$/.test(v) && !/^\d{4}-\d{2}$/.test(v))
    const sv = rows.map((r) => r[k]).filter((v) => v !== null && v !== 'no data' && typeof v !== 'number'), cv = ctrl.map((r) => r[k]).filter((v) => v !== null && v !== 'no data' && typeof v !== 'number')
    if (!sv.length) continue; prev[k] = { at_swings: +(sv.filter(isTrue).length / sv.length).toFixed(3), n_swings: sv.length, at_random: cv.length ? +(cv.filter(isTrue).length / cv.length).toFixed(3) : null, n_random: cv.length } }
  const H = Object.keys(rows[0]); fs.writeFileSync(path.join(dir, `${tf}.csv`), [H.join(',')].concat(rows.map((r) => H.map((k) => { const v = r[k]; return v == null ? '' : typeof v === 'string' ? `"${v.replace(/"/g, "'")}"` : typeof v === 'number' ? +v.toFixed(4) : v }).join(','))).join('\n') + '\n')
  out.tf[tf] = { swings: rows.length, controls: ctrl.length, prevalence: prev, rows }
  log(`${tf}: ${rows.length} swings · ${ctrl.length} random candles`) }
fs.writeFileSync(path.join(TURBO.master, `${SHORT[SYM]}_swing_reasons.json`), JSON.stringify(out, null, 1))
log(`written docs/swing_book/${SHORT[SYM]}_reasons/ + data/master/${SHORT[SYM]}_swing_reasons.json`)
