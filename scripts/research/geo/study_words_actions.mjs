// study_words_actions.mjs — "WORDS vs ACTIONS: do they lead oil and gold?" (2026-11-01; Ashraf: "Yes, build and run").
// Pre-registered spec: docs/research/geo/2026-11-01_WORDS_ACTIONS_LEAD_SPEC.md (+ Addendum A, B). Research only: nothing feeds a signal.
//   Part 0 gates (coverage, anchor events, FRED vs Polygon WTI, look-ahead asserts + week-shuffle) → Part A words → actions inside a scope (K 24)
//   → Part B GDELT → gold / WTI / GVZ / OVX beyond the asset's own moves, GVZ / OVX / VIX, GPR and the scheduled-event count (K 128).
// Inputs: data/research/geo/gdelt_events_daily.jsonl · data/research/geo/inputs/fred_<ID>.json · data/research/extreme_swing/inputs/gpr_daily.jsonl
//         Polygon XAUUSD + WTI 1m (series_1m kit) · Forex Factory calendar (marketContext)
// Usage:  node --max-old-space-size=8192 scripts/research/geo/study_words_actions.mjs --part0   → data/research/geo/words_actions_part0.json
//         node --max-old-space-size=8192 scripts/research/geo/study_words_actions.mjs --full    → data/research/geo/words_actions_study.json
//         (--full refuses unless Part 0 passed on the same input hashes and this script + the spec are committed unchanged = G0.6 freeze)
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../../../src/core/paths.js'
import { rng, holm } from '../../../src/core/studyStats.js'
import { nyOffsetMs } from '../../../src/master/macroMagnet.js'
import { GEO_DIR, OUT as GDELT_FILE, loadGdeltDays } from './gdelt_events.mjs'

const DAY = 86400000, WEEK = 7 * DAY
const SPEC = 'docs/research/geo/2026-11-01_WORDS_ACTIONS_LEAD_SPEC.md', SELF = 'scripts/research/geo/study_words_actions.mjs'
const INPUTS = path.join(GEO_DIR, 'inputs'), GPR_FILE = path.join(TURBO.root, 'data', 'research', 'extreme_swing', 'inputs', 'gpr_daily.jsonl')
const SPLIT = '2021-12-31', SEED = 20261101, B_MAIN = 10000, B_SHUFFLE = 1000, SHUFFLE_RUNS = 20

// ── §1 measures ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const SCOPES = { MIDEAST: ['IRN', 'ISR', 'SAU', 'YEM', 'IRQ', 'SYR', 'LBN', 'JOR', 'EGY', 'QAT', 'ARE', 'KWT', 'OMN', 'BHR', 'PSE'],
  RU_UA: ['RUS', 'UKR'], EAST_ASIA: ['CHN', 'TWN', 'PRK', 'KOR'], WORLD: null }
export const MEASURES = ['zWORDS', 'zACTS', 'zPOSTURE', 'TALK_POSTURE']
export const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10)
const iso = (t) => new Date(t).toISOString().slice(0, 10)

/** Raw shares of one stored GDELT day for a scope (null = WORLD): scope count / world.n, a zero count → 0.5 (spec §1). */
export function rawShares(row, scope) {
  const q = [0, 0, 0, 0]; let r15 = 0
  for (const b of scope ? scope.map((c) => row.by_country[c]).filter(Boolean) : [row.world]) { for (let k = 0; k < 4; k++) q[k] += b.q[k]; r15 += b.r['15'] }
  const s = (x) => (x || 0.5) / row.world.n
  return { WORDS: s(q[2]), ACTS: s(q[3]), POSTURE: s(r15), TALK: s(q[0]) }
}
/** z of ln x(d) against ln x over the previous 90 calendar days (d excluded), ≥ 60 present, else no value. days = every calendar day in order. */
export function zSeries(days, val) {
  const out = new Map(), L = days.map((d) => (val.has(d) ? Math.log(val.get(d)) : null))
  for (let i = 0; i < days.length; i++) { if (L[i] == null) continue
    let n = 0, s = 0, s2 = 0; for (let j = Math.max(0, i - 90); j < i; j++) if (L[j] != null) { n++; s += L[j]; s2 += L[j] * L[j] }
    if (n < 60) continue
    const m = s / n, sd = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1))); if (sd > 0) out.set(days[i], (L[i] - m) / sd) }
  return out
}
/** The 16 predictors: pred[scope][measure] = Map(day → value). */
export function buildPredictors(gdelt, days) {
  const pred = {}
  for (const [sc, list] of Object.entries(SCOPES)) {
    const raw = { WORDS: new Map(), ACTS: new Map(), POSTURE: new Map(), TALK: new Map() }
    for (const d of days) { const r = gdelt.get(d); if (!r || r.missing || r.error) continue; const s = rawShares(r, list); for (const k in raw) raw[k].set(d, s[k]) }
    const z = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, zSeries(days, v)])), tp = new Map()
    for (const [d, a] of z.TALK) if (z.POSTURE.has(d)) tp.set(d, Math.min(a, z.POSTURE.get(d)))
    pred[sc] = { zWORDS: z.WORDS, zACTS: z.ACTS, zPOSTURE: z.POSTURE, TALK_POSTURE: tp }
  }
  return pred
}

// ── §2 timing ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const knownT = (d) => Date.parse(d) + DAY + 8 * 3600000   // GDELT day d is known at d + 1, 08:00 UTC
/** Wall-clock New York hh:mm on date d → UTC ms. */
export function nyTime(d, hh, mm = 0) { const wall = Date.parse(d) + (hh * 60 + mm) * 60000; return wall - nyOffsetMs(wall - nyOffsetMs(wall)) }
/** Map every GDELT calendar day to the first market date ≥ d + 1 (its first close after known_t). Returns Map(T → [d …]). */
export function mapToMarket(days, marketDates) {
  const out = new Map(); let j = 0
  for (const d of days) { const want = addDays(d, 1); while (j < marketDates.length && marketDates[j] < want) j++; if (j >= marketDates.length) break
    const T = marketDates[j]; if (!out.has(T)) out.set(T, []); out.get(T).push(d) }
  return out
}
/** Mean of a daily Map over the GDELT days of T; any missing day → null (Addendum A rule 2). */
export function meanOver(m, ds) { if (!ds?.length) return null; let s = 0; for (const d of ds) { const v = m.get(d); if (v == null) return null; s += v } return s / ds.length }

// ── regression engine ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function solve(A, b) {   // Gaussian elimination, partial pivoting; tiny ridge if singular
  const p = b.length, M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    const tmp = M[c]; M[c] = M[piv]; M[piv] = tmp; if (Math.abs(M[c][c]) < 1e-12) M[c][c] += 1e-9
    for (let r = c + 1; r < p; r++) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= p; k++) M[r][k] -= f * M[c][k] } }
  const x = Array(p).fill(0); for (let r = p - 1; r >= 0; r--) { let s = M[r][p]; for (let k = r + 1; k < p; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r] }
  return x
}
const flat = (p) => new Float64Array(p * p + p)
function accum(acc, x, y, p) { for (let i = 0; i < p; i++) { const xi = x[i]; for (let k = 0; k < p; k++) acc[i * p + k] += xi * x[k]; acc[p * p + i] += xi * y } }
function fitFrom(acc, p) { const A = [], b = []; for (let i = 0; i < p; i++) { A.push(Array.from(acc.subarray(i * p, i * p + p))); b.push(acc[p * p + i]) } return solve(A, b) }
export function ols(rows, cols) { const p = cols + 1, acc = flat(p); for (const r of rows) accum(acc, [1, ...r.x.slice(0, cols)], r.y, p); return fitFrom(acc, p) }
const predict = (beta, x) => { let s = beta[0]; for (let i = 1; i < beta.length; i++) s += beta[i] * x[i - 1]; return s }
const blockKey = (t, blockMs) => Math.floor(t / blockMs)

/** Week-block bootstrap of the LAST coefficient (the predictor). rows: { t, x:[controls…, predictor], y }. */
export function bootCoef(rows, blockMs, B, seed) {
  const p = rows[0].x.length + 1, g = new Map()
  for (const r of rows) { const k = blockKey(r.t, blockMs); if (!g.has(k)) g.set(k, flat(p)); accum(g.get(k), [1, ...r.x], r.y, p) }
  const blocks = [...g.values()], all = flat(p); for (const b of blocks) for (let i = 0; i < all.length; i++) all[i] += b[i]
  const beta = fitFrom(all, p).at(-1), R = rng(seed), acc = flat(p); let le = 0, ge = 0
  for (let s = 0; s < B; s++) { acc.fill(0); for (let k = 0; k < blocks.length; k++) { const b = blocks[(R() * blocks.length) | 0]; for (let i = 0; i < acc.length; i++) acc[i] += b[i] }
    const v = fitFrom(acc, p).at(-1); if (v <= 0) le++; if (v >= 0) ge++ }
  return { beta, p: Math.min(1, 2 * (Math.min(le, ge) + 1) / (B + 1)), n: rows.length, blocks: blocks.length }
}
/** Week-block bootstrap of a mean, one-sided p (mean ≤ 0) and the 5 % lower bound. items [{ t, v }]. */
export function bootMeanOneSided(items, blockMs, B, seed) {
  const g = new Map(); for (const it of items) { const k = blockKey(it.t, blockMs); const a = g.get(k) ?? [0, 0]; a[0] += it.v; a[1]++; g.set(k, a) }
  const blocks = [...g.values()], R = rng(seed), v = []; let le = 0
  for (let s = 0; s < B; s++) { let su = 0, n = 0; for (let k = 0; k < blocks.length; k++) { const b = blocks[(R() * blocks.length) | 0]; su += b[0]; n += b[1] } const m = su / n; v.push(m); if (m <= 0) le++ }
  v.sort((a, b) => a - b)
  return { mean: items.reduce((s, it) => s + it.v, 0) / items.length, lb5: v[Math.floor(0.05 * B)], p: (le + 1) / (B + 1) }
}
/** One cell: TRAIN/OOS coefficient bootstraps, frozen-TRAIN OOS ΔMSE, top-1 % robustness. rows carry .date. */
export function testCell(rows, blockMs, B, seed) {
  const tr = rows.filter((r) => r.date <= SPLIT), oos = rows.filter((r) => r.date > SPLIT)
  if (tr.length < 50 || oos.length < 50) return { n_train: tr.length, n_oos: oos.length, skipped: true }
  const nc = rows[0].x.length - 1
  const cTr = bootCoef(tr, blockMs, B, seed), cOos = bootCoef(oos, blockMs, B, seed + 1)
  const b0 = ols(tr, nc), b1 = ols(tr, nc + 1)
  const d = oos.map((r) => { const e0 = (r.y - predict(b0, r.x)) ** 2; return { t: r.t, y: r.y, e0, v: e0 - (r.y - predict(b1, r.x)) ** 2 } })
  const dm = bootMeanOneSided(d, blockMs, B, seed + 2)
  const cut = [...d].sort((a, b) => Math.abs(b.y) - Math.abs(a.y))[Math.floor(d.length * 0.01)]?.y ?? Infinity
  const rest = d.filter((x) => Math.abs(x.y) < Math.abs(cut))
  return { n_train: tr.length, n_oos: oos.length, coef_train: cTr.beta, p_train: cTr.p, coef_oos: cOos.beta, p_oos: cOos.p,
    dmse_oos: dm.mean, dmse_lb5: dm.lb5, p: dm.p, dmse_drop_top1pct: rest.reduce((s, x) => s + x.v, 0) / rest.length, mse_base_oos: d.reduce((s, x) => s + x.e0, 0) / d.length }
}
/** §5 pass rule after Holm: returns the first failed rule or 'PASS'. */
export function verdict(c) {
  if (c.skipped) return 'skipped (n)'
  if (!(c.p_train <= 0.05)) return '1 not visible in TRAIN'
  if (Math.sign(c.coef_train) !== Math.sign(c.coef_oos)) return '2 sign flips in OOS'
  if (!(c.dmse_oos > 0) || !c.holm_pass) return '3 no OOS forecast lift after Holm'
  if (!(c.dmse_drop_top1pct > 0)) return '4 one-event (top 1 %)'
  if (c.n_oos < 500) return '5 power (< 500 OOS)'
  return 'PASS'
}

// ── inputs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const readFred = (id) => JSON.parse(fs.readFileSync(path.join(INPUTS, `fred_${id}.json`), 'utf8'))
const FRED_IDS = ['DCOILWTICO', 'DCOILBRENTEU', 'OVXCLS', 'GVZCLS', 'VIXCLS']
function inputHashes() { return { gdelt: sha(GDELT_FILE), gpr: sha(GPR_FILE), ...Object.fromEntries(FRED_IDS.map((id) => [id, sha(path.join(INPUTS, `fred_${id}.json`))])) } }
async function dailyCloses(sym) {   // Polygon 1m → the instrument's TradingView daily candle: [{ date, c, close_t }]
  const { raw1m, kit } = await import('../../lib/series_1m.mjs'); const K = kit(sym)
  return K.build(K.clean(await raw1m(sym)), '1D').map((b) => { const date = iso(b.td)
    return { date, c: sym === 'XAUUSD' && !validGoldClose(date, b.close_t) ? NaN : b.c, close_t: b.close_t } })
}
/** Addendum C: a gold daily close is real only if its last minute is at or after 12:00 New York on its date (data-hole stubs end at 00:00 UTC). */
export const validGoldClose = (date, close_t) => close_t - 60000 >= nyTime(date, 12, 0)
/** A daily series [{ date, c, close_t }] → helpers: index by date, as-of lookup. */
function series(rows) { const dates = rows.map((r) => r.date), at = new Map(rows.map((r, i) => [r.date, i]))
  const asOf = (d) => { let lo = 0, hi = dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] <= d) lo = m + 1; else hi = m } return lo ? rows[lo - 1] : null }
  return { rows, dates, at, asOf } }

// ── Part 0 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ANCHORS = [
  { date: '2019-09-14', scope: 'MIDEAST', m: 'zACTS', what: 'Abqaiq attack' }, { date: '2020-01-03', scope: 'MIDEAST', m: 'zACTS', what: 'Soleimani strike' },
  { date: '2023-10-07', scope: 'MIDEAST', m: 'zACTS', what: 'Hamas attack on Israel' }, { date: '2024-04-13', scope: 'MIDEAST', m: 'zACTS', what: 'Iran drones + missiles on Israel' },
  { date: '2024-10-01', scope: 'MIDEAST', m: 'zACTS', what: 'Iran missiles on Israel' }, { date: '2025-06-13', scope: 'MIDEAST', m: 'zACTS', what: 'Israel strikes Iran' },
  { date: '2014-03-01', scope: 'RU_UA', m: 'zACTS', what: 'Russian forces in Crimea' }, { date: '2022-02-24', scope: 'RU_UA', m: 'zACTS', what: 'invasion of Ukraine' },
  { date: '2022-08-04', scope: 'EAST_ASIA', m: 'zPOSTURE', what: 'PLA live-fire drills around Taiwan' }]
export function anchorHit(pred, a, date = a.date) { const m = pred[a.scope][a.m]; let best = null
  for (let k = 0; k <= 2; k++) { const v = m.get(addDays(date, k)); if (v != null && (best == null || v > best)) best = v } return { best, hit: best != null && best >= 2 } }

// ── design matrices ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const wd = (d) => { const w = new Date(Date.parse(d)).getUTCDay(); return w }
const dummies = (d, set) => set.map((w) => (wd(d) === w ? 1 : 0))
/** Part A rows per (scope, predictor, horizon): x = [zACTS(d), mean d−6…d, mean d−29…d, weekday ×6, predictor]. */
export function partARows(pred, days, scope, measure, h) {
  const A = pred[scope].zACTS, P = pred[scope][measure], idx = new Map(days.map((d, i) => [d, i])), rows = []
  const meanWin = (i0, i1, need) => { let s = 0, n = 0; for (let i = i0; i <= i1; i++) { if (i < 0 || i >= days.length) continue; const v = A.get(days[i]); if (v != null) { s += v; n++ } } return n >= need ? s / n : null }
  for (const d of days) { const i = idx.get(d), p = P.get(d), a0 = A.get(d); if (p == null || a0 == null) continue
    const y = meanWin(i + 1, i + h, Math.ceil(h / 2)), m7 = meanWin(i - 6, i, 4), m30 = meanWin(i - 29, i, 15); if (y == null || m7 == null || m30 == null) continue
    rows.push({ date: d, t: Date.parse(d), y, x: [a0, m7, m30, ...dummies(d, [1, 2, 3, 4, 5, 6]), p] }) }
  return rows
}
/** Part B rows for one target on its own market calendar. */
export function partBRows({ target, mkt, closeT, map, pred, scope, measure, ctl, asserts }) {
  const P = pred[scope][measure], rows = [], c = mkt.rows, h = target.h
  for (let i = 22; i + h < c.length; i++) { const T = c[i].date, ds = map.get(T); if (!ds) continue
    const x = meanOver(P, ds); if (x == null) continue
    const tClose = closeT(c[i]), y = target.y(c, i), cv = ctl(c, i, T, ds, tClose, closeT(c[i + h]))
    if (y == null || !Number.isFinite(y) || cv == null || cv.some((v) => !Number.isFinite(v))) { asserts.dropped = (asserts.dropped ?? 0) + 1; continue }
    asserts.n++; for (const d of ds) if (!(knownT(d) < tClose)) asserts.fail++   // asserted on every row that ENTERS a fit (spec G0.5: "every GDELT day used")
    rows.push({ date: T, t: Date.parse(T), y, x: [...cv, x] }) }
  return rows
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function loadAll() {
  const gdelt = loadGdeltDays(), keys = [...gdelt.keys()].sort(), days = []
  for (let d = keys[0]; d <= keys.at(-1); d = addDays(d, 1)) days.push(d)
  const pred = buildPredictors(gdelt, days)
  const gpr = new Map(fs.readFileSync(GPR_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.date, r]))
  const fred = Object.fromEntries(FRED_IDS.map((id) => [id, series(readFred(id).obs.map(([date, c]) => ({ date, c })))]))
  const gold = series(await dailyCloses('XAUUSD'))
  const { loadContext } = await import('../../../src/master/marketContext.js')
  const ffHigh = loadContext().ff.filter((e) => e.impact === 'high').map((e) => e.t).sort((a, b) => a - b)
  return { gdelt, days, pred, gpr, fred, gold, ffHigh }
}
const countIn = (sorted, a, z) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= a) lo = m + 1; else hi = m } let n = 0; for (let i = lo; i < sorted.length && sorted[i] <= z; i++) n++; return n }

/** Every Part A + Part B design (cells), built once; shuffle() re-assigns the predictor column by whole weeks. */
function designs(D) {
  const { days, pred, gpr, fred, gold, ffHigh } = D, asserts = { n: 0, fail: 0 }, cells = []
  for (const sc of Object.keys(SCOPES)) for (const m of ['zWORDS', 'zPOSTURE', 'TALK_POSTURE']) for (const h of [7, 30])
    cells.push({ part: 'A', scope: sc, measure: m, target: `A${h}`, blockMs: 2 * WEEK, rows: partARows(pred, days, sc, m, h) })
  const lr = (c, i, k) => (c[i + k].c > 0 && c[i].c > 0 ? Math.log(c[i + k].c / c[i].c) : NaN)
  const absMean = (c, i, n) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += Math.abs(lr(c, j - 1, 1)); return s / n }
  const gprOf = (ds) => { let a = 0, b = 0, t = 0; for (const d of ds) { const g = gpr.get(d); if (!g) return null; a += g.gprd; b += g.act; t += g.threat } return [a, b, t].map((v) => Math.log(v / ds.length)) }
  const oilClose = (r) => nyTime(r.date, 14, 30), cboeClose = (r) => nyTime(r.date, 16, 15), goldClose = (r) => r.close_t
  const lnAsOf = (s, d) => { const r = s.asOf(d); return r ? Math.log(r.c) : NaN }
  const priceCtl = (signed, volSeries) => (c, i, T, ds, t0, t1) => { const g = gprOf(ds); if (!g) return null
    return [Math.abs(lr(c, i - 1, 1)), absMean(c, i, 5), absMean(c, i, 22), ...(signed ? [lr(c, i - 1, 1), lr(c, i - 5, 5)] : []),
      lnAsOf(volSeries, T), lnAsOf(fred.VIXCLS, T), ...g, countIn(ffHigh, t0, t1), ...dummies(T, [1, 2, 3, 4])] }
  const volCtl = (asset) => (c, i, T, ds, t0, t1) => { const g = gprOf(ds); if (!g) return null; const a = asset.at.get(asset.asOf(T)?.date); if (a == null || a < 22) return null
    const ac = asset.rows; return [Math.abs(lr(ac, a - 1, 1)), absMean(ac, a, 5), absMean(ac, a, 22), Math.log(c[i].c), c[i].c - c[i - 5].c, lnAsOf(fred.VIXCLS, T), ...g, countIn(ffHigh, t0, t1), ...dummies(T, [1, 2, 3, 4])] }
  const T_ = (name, h, y) => ({ name, h, y })
  const absT = (h) => (c, i) => Math.abs(lr(c, i, h)), sgnT = (h) => (c, i) => lr(c, i, h), dT = (h) => (c, i) => c[i + h].c - c[i].c
  const oil = fred.DCOILWTICO
  const specs = [
    { t: T_('G1', 1, absT(1)), mkt: gold, closeT: goldClose, ctl: priceCtl(false, fred.GVZCLS) }, { t: T_('G5', 5, absT(5)), mkt: gold, closeT: goldClose, ctl: priceCtl(false, fred.GVZCLS) },
    { t: T_('G5s', 5, sgnT(5)), mkt: gold, closeT: goldClose, ctl: priceCtl(true, fred.GVZCLS) },
    { t: T_('O1', 1, absT(1)), mkt: oil, closeT: oilClose, ctl: priceCtl(false, fred.OVXCLS) }, { t: T_('O5', 5, absT(5)), mkt: oil, closeT: oilClose, ctl: priceCtl(false, fred.OVXCLS) },
    { t: T_('O5s', 5, sgnT(5)), mkt: oil, closeT: oilClose, ctl: priceCtl(true, fred.OVXCLS) },
    { t: T_('GVZ5', 5, dT(5)), mkt: fred.GVZCLS, closeT: cboeClose, ctl: volCtl(gold) }, { t: T_('OVX5', 5, dT(5)), mkt: fred.OVXCLS, closeT: cboeClose, ctl: volCtl(oil) },
    { t: T_('B1', 1, absT(1)), mkt: fred.DCOILBRENTEU, closeT: oilClose, ctl: priceCtl(false, fred.OVXCLS), robust: true },
    { t: T_('B5', 5, absT(5)), mkt: fred.DCOILBRENTEU, closeT: oilClose, ctl: priceCtl(false, fred.OVXCLS), robust: true },
    { t: T_('B5s', 5, sgnT(5)), mkt: fred.DCOILBRENTEU, closeT: oilClose, ctl: priceCtl(true, fred.OVXCLS), robust: true }]
  for (const s of specs) { const map = mapToMarket(days, s.mkt.dates)
    for (const sc of Object.keys(SCOPES)) for (const m of MEASURES)
      cells.push({ part: s.robust ? 'B_brent' : 'B', scope: sc, measure: m, target: s.t.name, blockMs: s.t.h > 1 ? 2 * WEEK : WEEK,
        rows: partBRows({ target: s.t, mkt: s.mkt, closeT: s.closeT, map, pred, scope: sc, measure: m, ctl: s.ctl, asserts }) }) }
  return { cells, asserts }
}
/** Permute the predictor column (last x) by whole weeks: target week w takes the predictor values of week π(w), in order (cycled). */
export function shuffleWeeks(rows, seed) {
  const g = new Map(); for (const r of rows) { const k = blockKey(r.t, WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(r) }
  const weeks = [...g.keys()], perm = [...weeks], R = rng(seed); for (let i = perm.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]] }
  const out = []; weeks.forEach((w, k) => { const src = g.get(perm[k]).map((r) => r.x.at(-1)); g.get(w).forEach((r, i) => out.push({ ...r, x: [...r.x.slice(0, -1), src[i % src.length]] })) })
  return out.sort((a, b) => a.t - b.t)
}
function runCells(cells, B, seed, shuffleSeed = null) {
  const res = cells.map((c, k) => { const rows = shuffleSeed == null ? c.rows : shuffleWeeks(c.rows, shuffleSeed + k)
    return { part: c.part, scope: c.scope, measure: c.measure, target: c.target, ...testCell(rows, c.blockMs, B, seed + 7 * k) } })
  for (const part of ['A', 'B', 'B_brent']) holm(res.filter((r) => r.part === part && !r.skipped))
  for (const r of res) { if (r.mse_base_oos) r.dmse_pct = +(100 * r.dmse_oos / r.mse_base_oos).toFixed(3); r.verdict = r.part === 'B_brent' ? `described: ${verdict(r)}` : verdict(r) }
  return res
}

async function part0() {
  const t0 = Date.now(), D = await loadAll(), { gdelt, days, pred, fred } = D
  // G0.1 coverage
  const stored = days.filter((d) => { const r = gdelt.get(d); return r && !r.missing && !r.error })
  const g01 = { from: days[0], to: days.at(-1), calendar_days: days.length, stored: stored.length, pct: +(100 * stored.length / days.length).toFixed(2),
    errors: days.filter((d) => gdelt.get(d)?.error).length, bad_rows: stored.reduce((s, d) => s + gdelt.get(d).bad, 0), missing: days.filter((d) => gdelt.get(d)?.missing) }
  g01.pass = g01.pct >= 98 && g01.errors === 0
  // G0.2 anchors + placebo (same weekday, 100 random dates per anchor)
  const anchors = ANCHORS.map((a) => ({ ...a, ...anchorHit(pred, a) })), R = rng(SEED), zDays = days.filter((d) => d >= addDays(days[0], 120) && d <= addDays(days.at(-1), -3))
  let pk = 0, pn = 0; for (const a of ANCHORS) { const same = zDays.filter((d) => wd(d) === wd(a.date)); for (let k = 0; k < 100; k++) { pn++; if (anchorHit(pred, a, same[(R() * same.length) | 0]).hit) pk++ } }
  const g02 = { anchors, hits: anchors.filter((a) => a.hit).length, of: anchors.length, placebo_hit_rate: +(pk / pn).toFixed(4), placebo_n: pn }; g02.pass = g02.hits >= 8
  // G0.3 FRED vs Polygon WTI daily returns, 2024-10-09 →, top 1 % |difference| excluded
  const poly = await dailyCloses('WTI'), pm = new Map(poly.map((r) => [r.date, r.c])), common = fred.DCOILWTICO.rows.filter((r) => r.date >= '2024-10-09' && pm.has(r.date) && r.c > 0)
  const pairs = []; for (let i = 1; i < common.length; i++) pairs.push([Math.log(common[i].c / common[i - 1].c), Math.log(pm.get(common[i].date) / pm.get(common[i - 1].date)), common[i].date])
  const keep = [...pairs].sort((a, b) => Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1])).slice(0, Math.ceil(pairs.length * 0.99))
  const corr = (P) => { const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n; let sxy = 0, sxx = 0, syy = 0
    for (const [x, y] of P) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2 } return sxy / Math.sqrt(sxx * syy) }
  const g03 = { n_pairs: pairs.length, n_kept: keep.length, corr_kept: +corr(keep).toFixed(4), corr_all: +corr(pairs).toFixed(4), polygon_first: poly[0]?.date,
    dropped: pairs.filter((p) => !keep.includes(p)).map((p) => p[2]) }; g03.pass = g03.corr_kept >= 0.9
  // G0.5 look-ahead asserts + week-shuffle (20 runs, 1,000 resamples)
  const { cells, asserts } = designs(D)
  const shuffle = [], judged = cells.filter((c) => c.part !== 'B_brent')   // Brent is described only → not part of the shuffle count
  for (let s = 0; s < SHUFFLE_RUNS; s++) { const res = runCells(judged, B_SHUFFLE, SEED + 1000 * s, SEED + 100000 * (s + 1)); shuffle.push(res.filter((r) => r.verdict === 'PASS').length); console.log(`shuffle run ${s + 1}: ${shuffle.at(-1)} PASS`) }
  const g05 = { predictor_rows_checked: asserts.n, rows_dropped_before_fit: asserts.dropped ?? 0, known_after_close: asserts.fail, shuffle_pass_counts: shuffle, shuffle_mean: shuffle.reduce((a, b) => a + b, 0) / shuffle.length }
  g05.pass = asserts.fail === 0 && g05.shuffle_mean <= 1
  const n = Object.fromEntries(cells.map((c) => [`${c.part}|${c.scope}|${c.measure}|${c.target}`, c.rows.length]))
  const out = { spec: SPEC, ran_at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), inputs: inputHashes(), G0_1: g01, G0_2: g02, G0_3: g03,
    G0_4: 'smoke_ny_candles — run separately (recorded in MASTER §7)', G0_5: g05, design_rows: n, pass: g01.pass && g02.pass && g03.pass && g05.pass }
  fs.writeFileSync(path.join(GEO_DIR, 'words_actions_part0.json'), JSON.stringify(out, null, 1))
  console.log(JSON.stringify({ G0_1: { pct: g01.pct, errors: g01.errors, pass: g01.pass }, G0_2: { hits: g02.hits, placebo: g02.placebo_hit_rate, pass: g02.pass, anchors: anchors.map((a) => `${a.date} ${a.scope} ${a.m} ${a.best?.toFixed(2)} ${a.hit}`) },
    G0_3: { corr: g03.corr_kept, n: g03.n_kept, pass: g03.pass }, G0_5: { asserts: `${asserts.fail}/${asserts.n}`, shuffle: g05.shuffle_mean, pass: g05.pass }, pass: out.pass }, null, 1))
}

async function full() {
  const p0f = path.join(GEO_DIR, 'words_actions_part0.json'); if (!fs.existsSync(p0f)) throw new Error('run --part0 first')
  const p0 = JSON.parse(fs.readFileSync(p0f, 'utf8')); if (!p0.pass) throw new Error('Part 0 did not pass → the study stops (spec §0)')
  const h = inputHashes(); if (JSON.stringify(h) !== JSON.stringify(p0.inputs)) throw new Error('inputs changed since Part 0')
  const dirty = execFileSync('git', ['status', '--porcelain', '--', SELF, SPEC], { cwd: TURBO.root, encoding: 'utf8' }).trim(); if (dirty) throw new Error('G0.6 freeze: commit the script + spec first\n' + dirty)
  const commit = execFileSync('git', ['log', '-1', '--format=%H', '--', SELF], { cwd: TURBO.root, encoding: 'utf8' }).trim()
  const t0 = Date.now(), D = await loadAll(), { cells } = designs(D), res = runCells(cells, B_MAIN, SEED)
  const out = { spec: SPEC, frozen_commit: commit, ran_at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), inputs: h, split: SPLIT, B: B_MAIN, seed: SEED,
    K: { A: res.filter((r) => r.part === 'A').length, B: res.filter((r) => r.part === 'B').length }, pass: res.filter((r) => r.verdict === 'PASS'), cells: res }
  fs.writeFileSync(path.join(GEO_DIR, 'words_actions_study.json'), JSON.stringify(out, null, 1))
  const tally = (p) => { const t = {}; for (const r of res.filter((x) => x.part === p)) { const k = r.verdict.replace(/^described: /, ''); t[k] = (t[k] ?? 0) + 1 } return t }
  console.log(JSON.stringify({ K: out.K, A: tally('A'), B: tally('B'), B_brent: tally('B_brent'), pass: out.pass.map((r) => `${r.part} ${r.scope} ${r.measure} ${r.target}`) }, null, 1))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--part0')) await part0(); else if (process.argv.includes('--full')) await full(); else console.log('usage: --part0 | --full')
}
