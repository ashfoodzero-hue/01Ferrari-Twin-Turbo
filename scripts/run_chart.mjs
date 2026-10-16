// run_chart.mjs — Ferrari Twin Turbo LIVE CHART server (2026-10-09; Ashraf: "build a live candles chart on the app so I see it"; then
// "Main XAU, Silver, DXY, WTI and the majors that give early indication … give % for each … real data, zero guessing").
// http://127.0.0.1:7444 — bound to this computer only. READ-ONLY over the app's own files; it never writes and never decides.
//   GET /                   the chart page (ops/chart/index.html)
//   GET /api/series         every chartable series with its source and live status
//   GET /api/bars?sym=&tf=  closed candles (+ the current bucket so far as `partial`)
//   GET /api/live?sym=      quote + the FORMING minute (display only), market-state geometry (range + confirmation triggers, from
//                           marketState.marketStateGeometry), stream health, the latest gold decision
//   GET /api/drivers        every driver's live structure state + the MEASURED agreement / lead % vs XAU (data/master/xau_leaders.json)
//   GET /api/bias           compact BULLISH/BEARISH per driver (closed 3m + 15m: close vs EMA10 — the Matrix's DXY rule) + the 15m gold
//                           "whale" gauge (goldWhale.js: big-volume pressure in CME GC futures, 10 min delayed) with its MEASURED verdict
//   GET /api/gamma          today's GLD gamma levels in XAU (data/options/gld/<latest>.json, gamma_snapshot.mjs) + the forward-test verdict
//   GET /api/fvg?tf=        ACTIVE STRONG FVGs on 3m / 15m / 1h (src/master/fvg.js — the rule of study_fvg_strong.mjs) + that study's measured numbers
//   GET /api/calendar       USD economic calendar for gold (data/calendar/upcoming.json, fetch_calendar.mjs) + each release's MEASURED gold reaction
//   GET /api/monitor        IN-TRADE monitor for the open Matrix trade: live chance of TP1 / TP2 (the position formula — measured calibrated
//                           on 13 y + the live strategy, trade_monitor_study.json); the fitted model and the close advice are shown ONLY if validated
//   GET /api/forward        the PAPER FORWARD TEST of BUY_D1-x (data/inv90/forward/ledger.jsonl + forward_summary.json, written by the hourly
//                           forward hook) — every signal joined with its resolve; read-only, never a live order
//   GET /api/levels         S/R levels in force now for the 5m chart: PDH/PDL, P2DH/P2DL, TDH/TDL (src/master/dayLevels.js) + the 2 nearest
//                           unbroken 1h swing highs / lows (pivot = strict extreme of 2 bars each side, last 5 days) — each with its MEASURED 13y
//                           bounce vs a random level (day_levels_study.json); + the measured 5m order-flow result at levels (2 y CME, test-only)
//                           and the live order-flow status (BLOCKED: no live futures trades on the current Polygon plan — red rule)
//   GET /api/matrix         the FERRARI MATRIX paper trade box (data/master/matrix_state.json, written by matrix_tick.mjs) + its verdict
// Series: the live stream symbols (src/data/symbols.js) · DXY = rebuilt from its six pairs (src/data/dxy.js, validated vs the
// official daily close: median |diff| 0.032 %) · WTI = CL front-month futures, which Polygon serves 10 MIN DELAYED on our plan —
// always labelled DELAYED, never part of any signal or %. Supervised by run_twin.mjs (npm start); alone: npm run chart
import '../src/core/bootEnv.js'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { SYMBOLS, BY_SYM } from '../src/data/symbols.js'
import { streamStatus } from '../src/data/tickStream.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { marketStateGeometry, readMarketState } from '../src/master/marketState.js'
import { loadDxyBars, dxyValue, DXY_WEIGHTS } from '../src/data/dxy.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'
import { wtiBars, futBars } from '../src/data/wti.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { emaStack } from '../src/master/emaLevels.js'
import { fvgAt } from '../src/master/fvg.js'
import { dailyStats, dayLevelsAt } from '../src/master/dayLevels.js'
import { resolveMatrixTrade } from '../src/master/ferrariMatrix.js'
import { retestSetups } from '../src/master/retestSetup.js'
import { liveMonitor } from '../src/master/tradeMonitor.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { quotesFile } from '../src/core/paths.js'
import { bucket15, whaleAt, WHALE } from '../src/master/goldWhale.js'
import { streamBars } from '../src/data/backfillReader.js'
import { streamDxy1m } from '../src/data/dxy.js'
import { formingScore } from '../src/master/macroMagnet.js'
import { wallEvents, swingWallEvents, holdLabel } from '../src/master/wallDefense.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'

export const CHART_PORT = +(process.env.TWIN_CHART_PORT || 7444)
const PAGE = path.join(TURBO.root, 'ops', 'chart', 'index.html')
const TF = { '1m': [60000, 2], '3m': [180000, 4], '5m': [300000, 7], '15m': [900000, 30], '1h': [3600000, 120], '4h': [14400000, 365], '1d': [86400000, 1100] }   // tf → [ms, days shown]
const DERIVED = { DXY: { label: 'DXY (rebuilt from 6 pairs)', source: 'ICE formula on live Polygon EUR/JPY/GBP/CAD/SEK/CHF', delayed: false }, WTI: { label: 'WTI crude (CL front month)', source: 'Polygon CL futures', delayed: true, delay_min: 10 } }
const isSeries = (s) => !!BY_SYM[s] || !!DERIVED[s]
const cache = new Map()
const cached = async (key, ttl, fn) => { const c = cache.get(key); if (c && Date.now() - c.at < ttl) return c.v; const v = await fn(); cache.set(key, { at: Date.now(), v }); return v }
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
// WALL-PRESSURE BUBBLES (2026-10-16, docs/WALL_BUBBLES_SPEC.md): the shared engine on the last 36 h of gold 1m (24 h profile + a day of tests),
// classes from the study (STRONG threshold = its TRAIN p66), measured OOS holds from wall_bubbles_study.json, and each bubble's own outcome once its
// 60 min have passed (live record, the same hold rule). Background-refreshed at most once a minute — never blocks a request. Read-only.
const WBF = { at: 0, val: null, busy: false }
async function refreshWalls() {
  if (WBF.busy || Date.now() - WBF.at < 60000) return; WBF.busy = true
  try { const st = J('wall_bubbles_study.json'); if (!st) { WBF.val = { available: false, why: 'wall_bubbles_study.json missing' }; return }
    // 5 days of 1m: the volume profile needs 24 h; SWING walls (2026-10-16, study (bc)) need older unbroken pivots too
    const now = Date.now(), M = (await loadBars('XAUUSD', '1m', { from: now - 5 * 86400000 })).bars.filter((b) => b.t + 60000 <= now), sw = J('swing_walls_study.json')
    const ev = wallEvents(M, { from: now - 24 * 3600000 }), m66 = st.strong_threshold_train_p66, C = st.classes
    const clsOf = (thr) => (e) => !e.defense ? null : e.mag > thr ? 'STRONG' : e.defStronger ? 'DEF>PUSH' : 'DEFENSE'
    const mk = (kind, list, cls, holds) => list.map((e) => ({ e, c: cls(e) })).filter((x) => x.c).map(({ e, c }) => { const lab = holdLabel(M, e), h = lab !== null ? lab : M.length - 1 - e.di >= 60 ? null : undefined   // decided as soon as the rule decides; pending while undecided < 60 min
      return { kind, side: e.type === 'ceiling' ? 'RESISTANCE' : 'SUPPORT', type: e.type, wall: +e.wall.toFixed(2), touchT: e.t, decisionT: e.decisionT, cls: c, count: e.count, measured_hold: holds[c]?.oos_hold ?? null, outcome: h === undefined ? 'pending' : h === null ? 'timeout' : h ? 'HELD' : 'BROKE' } })
    const levelsOf = (ms) => { const B = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) B.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } if (c && c.t + ms <= now) B.push(c)
      const P = confirmedPivots(B, 5), kk = (x) => ({ knownT: B[x.knownAt].t + ms, px: x.px }); return { highs: P.highs.map(kk), lows: P.lows.map(kk) } }
    // the nearest UNBROKEN swing ceiling / floor right now (a swing high stays a ceiling until a 1m close goes above it)
    const nearest = (L) => { const last = M.at(-1), alive = (px, knownT, up) => !M.some((b) => b.t >= knownT && (up ? b.c > px : b.c < px))
      const ce = L.highs.filter((x) => x.px > last.c && alive(x.px, x.knownT, true)).sort((a, b) => a.px - b.px)[0], fl = L.lows.filter((x) => x.px < last.c && alive(x.px, x.knownT, false)).sort((a, b) => b.px - a.px)[0]
      return { ceiling: ce ? +ce.px.toFixed(2) : null, floor: fl ? +fl.px.toFixed(2) : null } }
    let bubbles = mk('VOL', ev, clsOf(m66), C), swing = {}
    if (sw) for (const [kind, tf, ms] of [['SW3', '3m', 180000], ['SW15', '15m', 900000]]) { const L = levelsOf(ms), V = sw.variants[tf]
      bubbles = bubbles.concat(mk(kind, swingWallEvents(M, L, { from: now - 24 * 3600000 }), clsOf(V.strong_threshold_train_p66), V.classes)); swing[tf] = { nearest: nearest(L), measured: { base: V.base.oos, defense: V.classes.DEFENSE.oos_hold, def_push: V.classes['DEF>PUSH'].oos_hold, strong: V.classes.STRONG.oos_hold, attack: V.classes.ATTACK.oos_hold } } }
    bubbles.sort((a, b) => a.touchT - b.touchT)
    const done = bubbles.filter((b) => b.outcome === 'HELD' || b.outcome === 'BROKE')
    WBF.val = { available: true, computed_at: new Date(now).toISOString(), bubbles, swing, last_close: M.at(-1)?.c ?? null, attacked_last24h: ev.filter((e) => !e.defense).length,
      measured: { base: st.base.oos, attack: C.ATTACK.oos_hold, defense: C.DEFENSE.oos_hold, def_push: C['DEF>PUSH'].oos_hold, strong: C.STRONG.oos_hold, stacking: st.stacking, rsi_confirms: st.rsi_confirms, source: 'data/master/wall_bubbles_study.json' },
      live24h: { resolved: done.length, held: done.filter((b) => b.outcome === 'HELD').length } }
  } catch (e) { WBF.val = { available: false, why: e.message } } finally { WBF.at = Date.now(); WBF.busy = false } }
// FORMING 4H magnet preview: the closed bars macro_tick saved + the minutes since (≤ a few hours) through the SAME engine. PROVISIONAL.
const MGF = { at: 0, val: null, busy: false }
async function refreshForming() {
  if (MGF.busy || Date.now() - MGF.at < 60000) return; MGF.busy = true
  try { const b = J('macro_magnet_bars.json'); if (!b?.gold?.length || !b?.dxy?.length) { MGF.val = null; return }
    const H4 = 4 * 3600000, mins = async (src) => { const out = []; for await (const x of src) out.push(x); return out }
    const gm = await mins(streamBars('XAUUSD', '1m', { from: b.gold.at(-1).t + H4 })), dm = await mins(streamDxy1m({ from: b.dxy.at(-1).t + H4 }))
    const fg = await formingScore(b.gold, gm), fd = await formingScore(b.dxy, dm)
    const pick = (r) => r && { long: r.long, short: r.short, side: r.side, A: r.A, B: r.B, C: r.C, D: r.D, bsl: r.bsl, ssl: r.ssl, rsi: +r.rsi.toFixed(2), bar: new Date(r.partial.t).toISOString(), closes_at: new Date(r.partial.closes_at).toISOString(), minutes: r.partial.minutes, last_minute: new Date(r.partial.last_minute).toISOString() }
    MGF.val = fg ? { provisional: true, gold: pick(fg), dxy: pick(fd), dxy_relation: !fd ? 'none' : fd.side !== fg.side ? 'confirms' : 'against', computed_at: new Date().toISOString() } : null
  } catch (e) { MGF.val = { provisional: true, error: e.message } } finally { MGF.at = Date.now(); MGF.busy = false } }
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body) }
const readHb = () => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, 'stream_heartbeat.json'), 'utf8')) } catch { return null } }

// ── WTI (delayed) — src/data/wti.js is the one reader (front month by session volume) ──

/** One source for every series: closed bars of `sym` at `tf` since `from`. */
async function seriesBars(sym, tf, from) {
  if (sym === 'DXY') return { bars: (await loadDxyBars(tf, { from })).bars }
  if (sym === 'WTI') return wtiBars(tf, from)
  return { bars: (await loadBars(sym, tf, { from })).bars }
}

async function bars(sym, tf) {
  const [ms, days] = TF[tf]
  return cached(`b|${sym}|${tf}`, sym === 'WTI' ? 60000 : tf === '1m' ? 3000 : ms >= 14400000 ? 60000 : 10000, async () => {
    const now = Date.now(), from = Math.floor((now - days * 86400000) / ms) * ms
    const got = await seriesBars(sym, tf, from)
    const lagMs = DERIVED[sym]?.delayed ? DERIVED[sym].delay_min * 60000 : 0
    const closed = got.bars.filter((b) => b.t + ms <= now - lagMs)
    // the current bucket so far, from CLOSED minutes only (display; the forming minute is merged in the browser). Not for WTI (delayed).
    const bucket = Math.floor(now / ms) * ms
    const mins = tf === '1m' || sym === 'WTI' ? [] : (await seriesBars(sym, '1m', bucket)).bars.filter((b) => b.t >= bucket)
    const partial = mins.length ? { t: bucket, o: mins[0].o, h: Math.max(...mins.map((b) => b.h)), l: Math.min(...mins.map((b) => b.l)), c: mins.at(-1).c, v: mins.reduce((s, b) => s + b.v, 0), minutes: mins.length } : null
    return { sym, tf, ms, ...(DERIVED[sym] ?? { label: sym, source: 'Polygon live forex ticks → verified 1m', delayed: false }), ticker: got.ticker ?? null,
      closed: closed.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })), partial, generated: now }
  })
}

/** The live quote + forming minute for a series. DXY: the formula on the six pairs' bids / forming minutes (only if all six present). */
function quoteOf(sym, hb) {
  if (BY_SYM[sym]) return hb?.symbols?.[sym] ?? null
  if (sym !== 'DXY' || !hb?.symbols) return null
  const pairs = Object.keys(DXY_WEIGHTS), q = Object.fromEntries(pairs.map((p) => [p, hb.symbols[p]]))
  if (pairs.some((p) => !q[p])) return null
  const bid = dxyValue(Object.fromEntries(pairs.map((p) => [p, q[p].bid]))), ask = dxyValue(Object.fromEntries(pairs.map((p) => [p, q[p].ask])))
  const f = pairs.map((p) => q[p].forming), t = f[0]?.t
  const forming = f.every((x) => x && x.t === t) ? (() => { const o = dxyValue(Object.fromEntries(pairs.map((p, k) => [p, f[k].o]))), c = dxyValue(Object.fromEntries(pairs.map((p, k) => [p, f[k].c]))); return { t, o, c, h: Math.max(o, c), l: Math.min(o, c), v: 0, forming: true } })() : null
  return { bid, ask: Math.max(bid, ask), forming, derived: true, last_tick_at: pairs.map((p) => q[p].last_tick_at).sort()[0] }
}

async function geometry(sym) {
  return cached(`g|${sym}`, sym === 'WTI' ? 60000 : 15000, async () => {
    const lagMs = DERIVED[sym]?.delayed ? DERIVED[sym].delay_min * 60000 : 0
    const b15 = (await seriesBars(sym, '15m', Date.now() - 10 * 86400000)).bars.filter((b) => b.t + 900000 <= Date.now() - lagMs)
    const g = marketStateGeometry(b15), s = readMarketState(b15)
    if (!g) return null
    const last = b15.at(-1), prev = b15.at(-2)
    return { rangeHigh: +g.rangeHigh.toFixed(5), rangeLow: +g.rangeLow.toFixed(5), sellTrigger: g.dnTrigger, buyTrigger: g.upTrigger, needVolume: sym === 'DXY' ? 'n/a (index)' : `${g.volMult}× avg`,
      sinceT: g.sinceT, state: s?.state, allowedSide: s?.allowedSide, message: s?.message, barT: g.last.t, close: last.c, change15m: prev ? +((last.c - prev.c) / prev.c * 100).toFixed(3) : null }
  })
}

async function live(sym) {
  const hb = readHb()
  // DISPLAY grace: the previous minute settles ~3 s after it closes (CA lag), so the chart allows one extra minute before saying STALE.
  // Trading decisions keep their own strict wait (twin_tick → waitStreamSettled on the exact decision minute).
  const needMinute = Math.floor(Date.now() / 60000) * 60000 - 2 * 60000
  const st = BY_SYM[sym] ? streamStatus({ hb, pidAlive, symbols: [sym], maxBeatAgeMs: 15000, needMinute })
    : sym === 'DXY' ? streamStatus({ hb, pidAlive, symbols: Object.keys(DXY_WEIGHTS), maxBeatAgeMs: 15000, needMinute })
    : { live: false, why: 'DELAYED 10 min on our Polygon plan — display only, never used in a signal' }
  const sig = J('signal_tiers.json')
  return { sym, now: Date.now(), ...(DERIVED[sym] ?? {}), stream: { live: st.live, why: st.why, at: hb?.at ?? null, connected: hb?.connected ?? false, market_open: hb?.market_open ?? null },
    quote: quoteOf(sym, hb), geometry: await geometry(sym),
    decision: sym === 'XAUUSD' && sig ? { bars_to: sig.bars_to, published: sig.published_utc, summary: sig.summary, data: sig.data } : null }
}

async function drivers() {
  const study = J('xau_leaders.json')
  const list = ['XAUUSD', 'XAGUSD', 'DXY', 'WTI', ...(study?.display_extra ?? [])]
  const rows = []
  for (const s of list) { let g = null; try { g = await geometry(s) } catch { /* shown as unavailable */ }
    rows.push({ sym: s, label: DERIVED[s]?.label ?? s, delayed: !!DERIVED[s]?.delayed, state: g?.state ?? null, close: g?.close ?? null, change15m: g?.change15m ?? null, measured: study?.assets?.[s] ?? null }) }
  const all = study ? Object.entries(study.assets).map(([sym, m]) => ({ sym, agreement: m.agreement_oos, corr: m.corr_oos, sign: m.sign, lead60: m.lead60, useful: m.useful_leader })).sort((x, y) => (y.agreement ?? 0) - (x.agreement ?? 0)) : []
  return { at: Date.now(), study: study ? { generated: study.generated_utc, window: study.window, method: study.method_short, useful_leaders: study.useful_leaders } : null, rows, all }
}

// ── USD CALENDAR (Forex Factory + Fed + BLS + Polygon holidays) with the MEASURED gold reaction per release type (event_reaction_study.json) ──
const CAL_TYPE = [[/\bCPI\b|Consumer Price Index/, 'CPI'], [/Non-Farm Employment Change|Employment Situation/, 'NFP'], [/\bPPI\b|Producer Price Index/, 'PPI'], [/JOLTS/, 'JOLTS'], [/Federal Funds Rate|FOMC Statement|FOMC rate decision/, 'FOMC'],
  [/Retail Sales/, 'RETAIL'], [/Fed Chair(man)? .*Speaks|Chair(man)? .* speaks/, 'FED_CHAIR']]
// Forex Factory names a Board member as "FOMC Member <Surname> Speaks" — measured as FED_GOV only if that surname is in the Fed BOARD speech list
// (history.json, last 3 y); regional Fed presidents are not in that list → shown as not measured.
let boardNames = { at: 0, set: new Set() }
const board = () => { if (Date.now() - boardNames.at > 3600000) { try { const h = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'history.json'), 'utf8')).events
  boardNames = { at: Date.now(), set: new Set(h.filter((e) => e.type === 'FED_GOV' && e.t > Date.now() - 3 * 365 * 86400000).map((e) => (e.who || '').replace(/ speaks$/, '').split(' ').at(-1))) } } catch {} } return boardNames.set }
const calType = (name) => { const m = name.match(/^FOMC Member (\S+) Speaks/); if (m) return board().has(m[1]) ? 'FED_GOV' : null; return CAL_TYPE.find(([r]) => r.test(name))?.[1] ?? null }
function calendar() {
  let up = null; try { up = JSON.parse(fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'upcoming.json'), 'utf8')) } catch { return { available: false, why: 'calendar not fetched yet (fetch_calendar.mjs runs from run_twin every 30 min)' } }
  const st = J('event_reaction_study.json'), now = Date.now()
  const measured = (name) => { const ty = calType(name); const r = ty && st?.results?.[ty]; return r ? { type: ty, n: r.events, range_x: r.size.median_ratio_60m, over2x: r.size.share_over_2x, after_1_4h_x: r.size.median_ratio_60_240, median_move: r.size.median_abs_move_60m, up_share: r.direction_up_60m.share, first_move_persists: r.persistence.verdict === 'PERSISTS' } : null }
  const events = up.events.filter((e) => e.t >= now - 3 * 3600000 && e.t <= now + 8 * 86400000 && ['high', 'medium', 'holiday'].includes(e.impact)).map((e) => ({ ...e, measured: measured(e.name) }))
  return { available: true, fetched: up.at, age_min: Math.round((now - Date.parse(up.at)) / 60000), scope: up.scope, sources: up.sources, crosscheck: up.crosscheck, holidays: up.holidays, events, study_window: st?.window ?? null }
}

// ── STRONG FVG marks (Ashraf: "mark the valid strong FVG") — the exact study rule, with its MEASURED result on every mark ──
const FVG_TF = { '3m': 180000, '15m': 900000, '1h': 3600000 }
async function fvgMarks(tf) {
  return cached('fvg|' + tf, 20000, async () => {
    const ms = FVG_TF[tf], now = Date.now(), study = J('fvg_strong_study.json')
    const trend = {}
    for (const t2 of ['1h', '4h']) { const m2 = t2 === '1h' ? 3600000 : 14400000, B2 = (await loadBars('XAUUSD', t2, { from: now - 400 * m2 })).bars.filter((b) => b.t + m2 <= now), tr = emaStack(B2).trend
      trend[t2] = (T) => { let k = -1; for (let j = B2.length - 1; j >= 0; j--) if (B2[j].t + m2 <= T) { k = j; break } return k >= 0 ? tr[k] : null } }
    const B = (await loadBars('XAUUSD', tf, { from: now - 400 * ms })).bars.filter((b) => b.t + ms <= now), A = atrArr(B, 14), out = []
    for (let i = Math.max(22, B.length - 300); i < B.length; i++) {
      const F = fvgAt(B, A, i, B[i].t + ms, (t2, T) => trend[t2](T)); if (!F || !F.strong) continue
      const stopLine = F.up ? F.bot - 0.1 * F.atr : F.top + 0.1 * F.atr; let broken = null, retested = null
      for (let k = i + 1; k < B.length; k++) { if (retested == null && (F.up ? B[k].l <= F.top : B[k].h >= F.bot)) retested = B[k].t; if (F.up ? B[k].l <= stopLine : B[k].h >= stopLine) { broken = B[k].t; break } }
      if (broken == null && B.length - i <= 100) out.push({ t: B[i - 2].t, knownT: B[i].t + ms, up: F.up, top: F.top, bot: F.bot, retested })
    }
    const cellOf = (x) => study?.cells?.[`${tf}|${x}`]?.oos
    return { tf, rule: study?.rules?.strong ?? null, marks: out, measured: study ? { x025: cellOf(0.25), x01: cellOf(0.1), verdict: study.verdict, reached_95: study.reached_95 } : null }
  })
}

// ── IN-TRADE MONITOR — the open trade's live chance of TP1 / TP2 (study_trade_monitor.mjs decides what may be shown) ──
async function monitor() {
  const m = J('matrix_state.json'), o = m?.open; if (!o) return { open: false }
  const now = Date.now(), m1 = (await loadBars('XAUUSD', '1m', { from: o.sig.decisionT - 60000 })).bars.filter((b) => b.t + 60000 <= now)
  return liveMonitor({ sig: o.sig, m1, quote: readHb()?.symbols?.XAUUSD, spreadAt: makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from: now - 2 * 86400000 }) }), study: J('trade_monitor_study.json'), now, resolve: resolveMatrixTrade })
}

// ── GAMMA: the latest daily GLD snapshot (written by gamma_snapshot.mjs) + its forward test (study_gamma_levels.mjs) — context only ──
function gamma() {
  const dir = path.join(TURBO.root, 'data', 'options', 'gld'); let f = null
  try { f = fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().at(-1) } catch {}
  const st = J('gamma_levels_study.json')
  if (!f) return { available: false, why: 'no gamma snapshot recorded yet (run_twin records one each US weekday at 14:30 UTC)' }
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  return { available: true, day: d.day, at: d.at, regime: d.gld_levels.regime, total_net_gex: d.gld_levels.total_net_gex, ratio: d.ratio, gld_price: d.gld_price, gld_minute: d.gld_minute,
    coverage: d.coverage.oi_coverage, xau: d.xau_levels, age_h: +((Date.now() - Date.parse(d.at)) / 3600000).toFixed(1),
    study: st ? { verdict: st.verdict, reading: st.reading, days: st.days_recorded, resolved: st.all.resolved } : null }
}

// ── BIAS strip: one rule for every driver = last CLOSED candle vs EMA10 of closes (the Ferrari Matrix's DXY rule), on 3m and 15m ──
const emaLast = (xs, n = 10) => { const k = 2 / (n + 1); let e = null; for (const x of xs) e = e == null ? x : x * k + e * (1 - k); return e }
async function bias() {
  return cached('bias', 15000, async () => {
    const study = J('xau_leaders.json'), wstudy = J('gold_whale_study.json'), rows = []
    for (const sym of ['XAUUSD', 'XAGUSD', 'DXY', 'WTI']) {
      const r = { sym, label: { XAUUSD: 'Gold', XAGUSD: 'Silver', DXY: 'DXY', WTI: 'WTI' }[sym], delayed: sym === 'WTI', sign_vs_gold: sym === 'XAUUSD' ? 1 : study?.assets?.[sym]?.sign ?? null }
      for (const tf of ['3m', '15m']) { try { const c = (await bars(sym, tf)).closed.slice(-60); const e = emaLast(c.map((b) => b.c)); const last = c.at(-1)
        r[tf] = last ? { dir: last.c > e ? 'BULLISH' : 'BEARISH', close: last.c, ema10: +e.toFixed(5), barT: last.t } : null } catch { r[tf] = null } }
      rows.push(r)
    }
    let whale = null
    try { const now = Date.now(), g = (await futBars('GC', '1m', now - 3 * 86400000)), m1 = g.bars.filter((b) => b.t + 60000 <= now - WHALE.delayMs)
      const w = whaleAt(bucket15(m1), now); whale = w && { ...w, ticker: g.ticker, stale: now - (w.lastDeliveredT + WHALE.tfMs) > 3 * 3600000 } } catch (e) { whale = { error: String(e.message).slice(0, 120) } }
    return { at: Date.now(), rule: 'last closed candle vs EMA10 of closes (3m and 15m)', rows, whale,
      whale_study: wstudy ? { verdict: wstudy.verdict, reading: wstudy.reading, oos_win: wstudy.oos.win_share, oos_base: wstudy.oos.baseline, oos_n: wstudy.oos.resolved, window: wstudy.window } : null }
  })
}

// ── MACRO (Polygon /fed/v1 — measured available on our key) and NEWS (Polygon /v2/reference/news) — context only ──
const pget = async (p) => (await fetchJsonResilient(`https://api.polygon.io${p}${p.includes('?') ? '&' : '?'}apiKey=${polygonKey()}`, { timeoutMs: 12000 })).json ?? {}
async function macro() {
  return cached('macro', 10 * 60000, async () => {
    const [y, inf, exp, lab] = await Promise.all(['/fed/v1/treasury-yields?limit=6&sort=date.desc', '/fed/v1/inflation?limit=3&sort=date.desc', '/fed/v1/inflation-expectations?limit=3&sort=date.desc', '/fed/v1/labor-market?limit=3&sort=date.desc'].map(pget))
    const Y = y.results ?? [], I = inf.results ?? [], E = exp.results ?? [], L = lab.results ?? []
    return { at: Date.now(), source: 'Polygon /fed/v1 (US Treasury, BLS, BEA, Cleveland Fed via Polygon)',
      yields: Y[0] && { date: Y[0].date, y2: Y[0].yield_2_year, y10: Y[0].yield_10_year, y30: Y[0].yield_30_year, prev_date: Y[1]?.date, d10_bp: Y[1] ? +((Y[0].yield_10_year - Y[1].yield_10_year) * 100).toFixed(1) : null, curve_10_2: +(Y[0].yield_10_year - Y[0].yield_2_year).toFixed(2) },
      inflation: I[0] && { date: I[0].date, cpi: I[0].cpi, cpi_core: I[0].cpi_core, pce_core: I[0].pce_core, prev: I[1] && { date: I[1].date, cpi: I[1].cpi }, cpi_mom_pct: I[1] ? +((I[0].cpi / I[1].cpi - 1) * 100).toFixed(2) : null },
      expectations: E[0] && { date: E[0].date, breakeven_10y: E[0].market_10_year, breakeven_5y: E[0].market_5_year },
      real_10y_approx: Y[0] && E[0] ? { value: +(Y[0].yield_10_year - E[0].market_10_year).toFixed(2), note: `10y yield (${Y[0].date}) − 10y breakeven (${E[0].date}) — different dates, approximate` } : null,
      labor: L[0] && { date: L[0].date, unemployment: L[0].unemployment_rate, participation: L[0].labor_force_participation_rate, earnings: L[0].avg_hourly_earnings } }
  })
}
async function news() {
  return cached('news', 2 * 60000, async () => {
    const seen = new Set(), items = []
    for (const tk of ['GLD', 'IAU', 'GDX', 'SLV']) { const r = await pget(`/v2/reference/news?ticker=${tk}&limit=15&order=desc&sort=published_utc`)
      for (const n of r.results ?? []) { if (seen.has(n.id)) continue; seen.add(n.id); items.push({ id: n.id, title: n.title, publisher: n.publisher?.name, url: n.article_url, published: n.published_utc, tickers: (n.tickers ?? []).slice(0, 6) }) } }
    items.sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    return { at: Date.now(), source: 'Polygon /v2/reference/news (GLD, IAU, GDX, SLV)', note: 'information only — measured: headline direction does not predict gold (0 of 207 configurations)', items: items.slice(0, 25) }
  })
}

// ── S/R LEVELS for the 5m chart — the levels are context; every label carries the measured result, never a "will bounce" claim ──
async function levelMarks() {
  return cached('levels', 30000, async () => {
    const now = Date.now(), M = (await loadBars('XAUUSD', '1m', { from: now - 12 * 86400000 })).bars.filter((b) => b.t + 60000 <= now)
    if (!M.length) return { levels: [], note: 'no 1m data' }
    const last = M.at(-1).c, L = dayLevelsAt(M, dailyStats(M).list, now), study = J('day_levels_study.json'), out = []
    const meas = (k) => { const o = study?.bounce?.[k]?.oos; return o ? { bounce: o.bounce, control: o.control, net: o.net, n: o.resolved, verdict: study.bounce[k].verdict ?? study.verdict_bounce } : null }
    if (L) for (const k of ['PDH', 'PDL', 'P2DH', 'P2DL', 'TDH', 'TDL']) if (L[k] != null) out.push({ kind: k, price: L[k], measured: meas(k) })
    // 1h swing levels (the L-SW1H rule of study_orderflow_footprint.mjs --levels=new), from closed 1h bars
    const H = (await loadBars('XAUUSD', '1h', { from: now - 8 * 86400000 })).bars.filter((b) => b.t + 3600000 <= now), piv = []
    for (let j = 2; j < H.length - 2; j++) { const w = H.slice(j - 2, j + 3); if (H[j].t < now - 5 * 86400000) continue
      const hi = w.every((x, q) => q === 2 || x.h < H[j].h), lo = w.every((x, q) => q === 2 || x.l > H[j].l)
      if (hi && H.slice(j + 1).every((x) => x.h < H[j].h)) piv.push({ kind: 'SW1H-H', price: H[j].h, t: H[j].t })
      if (lo && H.slice(j + 1).every((x) => x.l > H[j].l)) piv.push({ kind: 'SW1H-L', price: H[j].l, t: H[j].t }) }
    out.push(...piv.filter((p) => p.kind === 'SW1H-H').sort((a, b) => a.price - b.price).slice(0, 2), ...piv.filter((p) => p.kind === 'SW1H-L').sort((a, b) => b.price - a.price).slice(0, 2))
    const of = J('orderflow_footprint_study.json'), c = (f, s) => of?.cells?.[`${f}|1R|${s}`]?.oos
    return { at: now, last, levels: out.map((x) => ({ ...x, dist: +(x.price - last).toFixed(2) })),
      orderflow: { live: 'BLOCKED', why: 'no live gold futures trades / bid-ask on the current Polygon plan (Futures Starter = 1m bars, 10 min delayed) — red rule: no guessed delta',
        measured_5m: of ? { aggressive_vp: c('L-VP', 'C4'), aggressive_hl: c('L-HL', 'C4'), delta_flip_vp: c('L-VP', 'C5'), delta_flip_hl: c('L-HL', 'C5'), three_plus_vp: c('L-VP', 'COUNT>=3'), three_plus_hl: c('L-HL', 'COUNT>=3') } : null,
        source: '2 y real CME GC trades with the exchange aggressor flag (Databento, test-only), first touch of prev-day VP / H-L, 1 R, out of sample' },
      note: '13 y XAU spot: no level type bounces more than a random level (day_levels_study.json, volume_profile_study.json); 1h swing levels: bounce not measured on spot' }
  })
}

// ── RETEST setups of the last 24 h (src/master/retestSetup.js) — DISPLAY ONLY, labelled with the measured 13 y result; resolved at 1 R / 2 R
// on closed 1m bids (SELL buys back at the ask = bid + measured spread), stop first inside a minute ──
async function retestBoxes() {
  return cached('retest', 20000, async () => {
    const now = Date.now(), B = (await loadBars('XAUUSD', '3m', { from: now - 3 * 86400000 })).bars.filter((b) => b.t + 180000 <= now)
    const M = (await loadBars('XAUUSD', '1m', { from: now - 2 * 86400000 })).bars.filter((b) => b.t + 60000 <= now), sp = makeSpreadAt()
    const study = J('retest_scalp_study.json')?.cells?.['base|1R']?.oos
    const boxes = retestSetups(B).filter((s) => s.t >= now - 86400000).map((s) => { const sell = s.side === 'SELL', R = s.risk, tp1 = sell ? s.entry - R : s.entry + R, tp2 = sell ? s.entry - 2 * R : s.entry + 2 * R
      let status = 'OPEN', exitT = null
      for (const b of M) { if (b.t < s.t) continue; const spr = sp(b.t)
        if (sell ? b.h + spr >= s.sl : b.l <= s.sl) { status = 'LOSS'; exitT = b.t; break }
        if (sell ? b.l + spr <= tp1 : b.h >= tp1) { status = 'TP1'; exitT = b.t; break } }
      return { ...s, tp1: +tp1.toFixed(2), tp2: +tp2.toFixed(2), status, exitT } })
    return { at: now, boxes, measured: study ? { wr: study.wr, net: study.net, n: study.n } : null, note: 'unvalidated: 13 y OOS 37 % WR at 1 R, −$0.59/trade' }
  })
}

// ── SCALP 85 % (paper, 2026-10-15, Ashraf: "run the Matrix with the 3× stop / small-target exit as a paper SCALP box"): the SAME live
// Matrix signals (data/paper/matrix_trades.jsonl, written by matrix_tick) with the docs/MATRIX_85WR_SPEC.md exit stop 3r / target 0.25r
// (r = the Matrix risk), 24 h; BUY pays the ask and exits at the bid, SELL mirrored; stop first inside a minute. Signals come from the
// live Matrix (one position at a time on ITS exits), so the live set is the Matrix's, not an independent book. DISPLAY / RECORD ONLY.
async function scalp85() {
  return cached('scalp85', 120000, async () => {   // 2 min: it re-reads days of 1m bars; 20 s blocked the single-threaded server (measured 2026-10-15)
    const now = Date.now(); let L = []
    try { L = fs.readFileSync(path.join(TURBO.root, 'data', 'paper', 'matrix_trades.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) } catch {}
    const seen = new Map(); for (const x of L) if (x.sig && !seen.has(x.id)) seen.set(x.id, x.sig)
    const sigs = [...seen.values()].sort((a, b) => a.decisionT - b.decisionT); if (!sigs.length) return { boxes: [], live: { n: 0, w: 0, net: 0 } }
    const M = (await loadBars('XAUUSD', '1m', { from: sigs[0].decisionT - 60000 })).bars.filter((b) => b.t + 60000 <= now), sp = makeSpreadAt()
    const all = sigs.map((s) => { const up = s.side === 'BUY', fill = up ? s.entry + sp(s.decisionT) : s.entry, r = s.risk, sl = up ? fill - 3 * r : fill + 3 * r, tp = up ? fill + 0.25 * r : fill - 0.25 * r
      let status = 'OPEN', exitT = null, net = null
      for (const b of M) { if (b.t < s.decisionT) continue; const spr = sp(b.t)
        if (up ? b.l <= sl : b.h + spr >= sl) { status = 'LOSS'; exitT = b.t; net = -(3 * r + Math.min(0.3, 0.05 * (s.atr || r))); break }
        if (up ? b.h >= tp : b.l + spr <= tp) { status = 'WIN'; exitT = b.t; net = 0.25 * r; break }
        if (b.t >= s.decisionT + 86400000) { status = 'TIME'; exitT = b.t; net = up ? b.c - fill : fill - (b.c + spr); break } }
      return { side: s.side, t: s.decisionT, entry: +fill.toFixed(2), sl: +sl.toFixed(2), tp: +tp.toFixed(2), risk: +(3 * r).toFixed(2), status, exitT, net: net == null ? null : +net.toFixed(2) } })
    const done = all.filter((x) => x.net != null), study = J('matrix_85wr_study.json')
    return { boxes: all.filter((x) => x.t >= now - 3 * 86400000), live: { n: done.length, w: done.filter((x) => x.net > 0).length, net: +done.reduce((a, x) => a + x.net, 0).toFixed(2), since: new Date(sigs[0].decisionT).toISOString() },
      measured: { no_wti_13y: study?.primary_noWTI_13y?.['stop3r|tp0.25r']?.oos ?? null, wti_2y: study?.report_WTI_2y?.['stop3r|tp0.25r']?.oos ?? null } }
  })
}

// ── PAPER FORWARD TEST (BUY_D1-x, docs/INVESTIGATION_90WR_2026-10-11.md) — the ledger is the only source; nothing is recomputed here ──
function forward(arm) {   // arm 'freq' (2026-10-15) = the ≈ 1 trade/day arm in data/inv90/forward_freq/; default = the 92 % arm
  const dir = path.join(TURBO.root, 'data', 'inv90', arm === 'freq' ? 'forward_freq' : 'forward'); let lines = [], summary = null
  try { lines = fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) } catch {}
  try { summary = JSON.parse(fs.readFileSync(path.join(dir, 'forward_summary.json'), 'utf8')) } catch {}
  const res = new Map(lines.filter((e) => e.type === 'resolve').map((e) => [e.id, e]))
  const trades = lines.filter((e) => e.type === 'signal').map((s) => { const r = res.get(s.id)
    return { id: s.id, t: s.t, side: 'BUY', entry: s.entry_ask, target: s.target, stop: s.stop, score: s.score, thr: s.thr, late_min: s.late_min ?? 0,
      status: r ? (r.net > 0 ? 'WIN' : 'LOSS') : 'OPEN', why: r?.why ?? null, exit_t: r?.exit_t ?? null, exit: r?.exit ?? null, net: r?.net ?? null } })
  return { candidate: summary?.candidate ?? 'BUY_D1-x', summary, trades, note: 'paper forward test — 0.2×ATR1d target / 2×ATR1d stop, 7-day horizon; research candidate, NOT validated (0/67 passed the gate)' }
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1'), sym = (u.searchParams.get('sym') || 'XAUUSD').toUpperCase(), tf = u.searchParams.get('tf') || '15m'
    if (u.pathname === '/' || u.pathname === '/index.html') return send(res, 200, fs.readFileSync(PAGE, 'utf8'), 'text/html; charset=utf-8')
    if (u.pathname === '/api/series') return send(res, 200, { series: [...SYMBOLS.map((s) => ({ sym: s.sym, role: s.role, delayed: false })), ...Object.entries(DERIVED).map(([k, v]) => ({ sym: k, ...v }))], tfs: Object.keys(TF) })
    if (u.pathname === '/api/symbols') return send(res, 200, { symbols: SYMBOLS, tfs: Object.keys(TF) })
    if (u.pathname === '/api/drivers') return send(res, 200, await drivers())
    if (u.pathname === '/api/macro') return send(res, 200, await macro())
    if (u.pathname === '/api/news') return send(res, 200, await news())
    if (u.pathname === '/api/monitor') return send(res, 200, await monitor())
    if (u.pathname === '/api/calendar') return send(res, 200, calendar())
    if (u.pathname === '/api/fvg') { if (!FVG_TF[tf]) return send(res, 200, { tf, marks: [], note: 'strong FVGs are marked on 3m, 15m and 1h only' }); return send(res, 200, await fvgMarks(tf)) }
    if (u.pathname === '/api/gamma') return send(res, 200, gamma())
    if (u.pathname === '/api/forward') return send(res, 200, forward(u.searchParams.get('arm')))
    if (u.pathname === '/api/retest') return send(res, 200, await retestBoxes())
    if (u.pathname === '/api/scalp85') return send(res, 200, await scalp85())
    if (u.pathname === '/api/levels') return send(res, 200, await levelMarks())
    if (u.pathname === '/api/bias') return send(res, 200, await bias())
    // 4H MACRO MAGNET tile (2026-10-16): the state macro_tick.mjs writes — Ashraf's Pine score + its MEASURED 13 y result + the live record — plus
    // the FORMING preview of the open 4H candle (provisional; refreshed in the background at most once a minute, never blocks a request). Read-only.
    if (u.pathname === '/api/walls') { refreshWalls(); return send(res, 200, WBF.val ?? { available: false, why: 'computing — first refresh in progress' }) }
    if (u.pathname === '/api/magnet') { const m = J('macro_magnet_state.json'); refreshForming(); return send(res, 200, m ? { ...m, stale: Date.now() - Date.parse(m.at) > 5 * 3600000, forming: MGF.val } : { available: false, why: 'macro_tick.mjs has not run yet' }) }
    if (u.pathname === '/api/matrix') { const m = J('matrix_state.json'); return send(res, 200, { open: m?.open ? { ...m.open, ctx: undefined } : null, structure: m?.structure ?? null, watch: m?.watch && Date.now() - m.watch.barT < 6 * 60000 ? m.watch : null, last_closed: m?.last_closed ?? null, verdict: m?.verdict?.verdict ?? J('ferrari_matrix_gate.json')?.verdict ?? 'UNVALIDATED', backtest: m?.verdict ?? null, at: m?.at ?? null, data_live: m?.data_live ?? null, data_why: m?.data_why ?? null }) }
    if (!isSeries(sym)) return send(res, 400, { error: 'unknown symbol', symbols: [...SYMBOLS.map((s) => s.sym), ...Object.keys(DERIVED)] })
    if (u.pathname === '/api/bars') { if (!TF[tf]) return send(res, 400, { error: 'unknown tf', tfs: Object.keys(TF) }); return send(res, 200, await bars(sym, tf)) }
    if (u.pathname === '/api/live') return send(res, 200, await live(sym))
    return send(res, 404, { error: 'not found' })
  } catch (e) { return send(res, 500, { error: String(e.message).slice(0, 200) }) }
})
server.on('error', (e) => { console.error(`chart server: ${e.code === 'EADDRINUSE' ? `port ${CHART_PORT} already in use (another chart server is running)` : e.message}`); process.exit(e.code === 'EADDRINUSE' ? 2 : 1) })
server.listen(CHART_PORT, '127.0.0.1', () => console.log(`chart: http://127.0.0.1:${CHART_PORT} (pid ${process.pid})`))
