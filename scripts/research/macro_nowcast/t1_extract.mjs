// T1 step 2, stage E (spec docs/research/macro_nowcast/2026-11-01_T1_step2_blind_nowcast_SPEC.md §0-§3 + addendum A).
// Writes inputs/release_schedule.jsonl and inputs/rows/<slug>.jsonl for the 33 BUILDABLE releases.
// BLIND RULE: every value written carries known_t < the row's release_t. The target's own CURRENT print and every FF
// `forecast` are never written. Own PAST prints are written only with t < release_t.
// Usage: node scripts/research/macro_nowcast/t1_extract.mjs            (full run; raw API answers cached in inputs/raw/)
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { TURBO } from '../../../src/core/paths.js'
import { ffValue } from './ffValue.mjs'

const KEY = process.env.FRED_API_KEY, DAY = 86400e3
const IN = path.join(TURBO.root, 'data', 'research', 'macro_nowcast', 'inputs'), RAW = path.join(IN, 'raw'), ROWS = path.join(IN, 'rows')
const FF_FILE = path.join(TURBO.root, 'data', 'calendar', 'ff_history.jsonl')

// ---- the 33 releases (spec §1) -------------------------------------------------------------------------------------
const Q = 'q', M = 'm', W = 'w'
export const RELEASES = [
  { n: 1, name: 'Unemployment Claims', freq: W, kind: 'claims' },
  { n: 2, name: 'Non-Farm Employment Change', freq: M, kind: 'nfp', timing: 'PAYEMS' },
  { n: 3, name: 'Unemployment Rate', freq: M, kind: 'unrate', timing: 'UNRATE' },
  { n: 4, name: 'Personal Income m/m', freq: M, kind: 'income', timing: 'PI' },
  { n: 5, name: 'Personal Spending m/m', freq: M, kind: 'spending', timing: 'PCE' },
  { n: 6, name: 'Industrial Production m/m', freq: M, kind: 'ip', timing: 'INDPRO' },
  { n: 7, name: 'Capacity Utilization Rate', freq: M, kind: 'ip', timing: 'TCU' },
  { n: 8, name: 'Factory Orders m/m', freq: M, kind: 'factory', timing: 'AMTMNO' },
  { n: 9, name: 'Business Inventories m/m', freq: M, kind: 'businv', timing: 'BUSINV' },
  { n: 10, name: 'Final Wholesale Inventories m/m', freq: M, kind: 'mii', earlier: 'Prelim Wholesale Inventories m/m' },
  { n: 11, name: 'Trade Balance', freq: M, kind: 'trade', timing: 'BOPGSTB' },
  { n: 12, name: 'Current Account', freq: Q, kind: 'curacct', timing: 'IEABC' },
  { n: 13, name: 'Import Prices m/m', freq: M, kind: 'import', timing: 'IR' },
  { n: 14, name: 'Federal Budget Balance', freq: M, kind: 'budget', timing: 'MTSDS133FMS' },
  { n: 15, name: 'CPI m/m', freq: M, kind: 'cpi', timing: 'CPIAUCSL' },
  { n: 16, name: 'Core CPI m/m', freq: M, kind: 'corecpi', timing: 'CPILFESL' },
  { n: 17, name: 'CPI y/y', freq: M, kind: 'cpiyy', timing: 'CPIAUCSL', base: 'CPIAUCSL' },
  { n: 18, name: 'Core CPI y/y', freq: M, kind: 'cpiyy', timing: 'CPILFESL', base: 'CPILFESL' },
  { n: 19, name: 'Core PCE Price Index m/m', freq: M, kind: 'corepce', timing: 'PCEPILFE' },
  { n: 20, name: 'Advance GDP q/q', freq: Q, kind: 'gdp' },
  { n: 21, name: 'Advance GDP Price Index q/q', freq: Q, kind: 'gdpprice' },
  { n: 22, name: 'Prelim GDP q/q', freq: Q, kind: 'mii', earlier: 'Advance GDP q/q' },
  { n: 23, name: 'Final GDP q/q', freq: Q, kind: 'mii', earlier: 'Prelim GDP q/q' },
  { n: 24, name: 'Prelim GDP Price Index q/q', freq: Q, kind: 'mii', earlier: 'Advance GDP Price Index q/q' },
  { n: 25, name: 'Final GDP Price Index q/q', freq: Q, kind: 'mii', earlier: 'Prelim GDP Price Index q/q' },
  { n: 26, name: 'Prelim Nonfarm Productivity q/q', freq: Q, kind: 'prod' },
  { n: 27, name: 'Prelim Unit Labor Costs q/q', freq: Q, kind: 'prod', ulc: true },
  { n: 28, name: 'Revised Nonfarm Productivity q/q', freq: Q, kind: 'mii', earlier: 'Prelim Nonfarm Productivity q/q', gdpRev: +1 },
  { n: 29, name: 'Revised Unit Labor Costs q/q', freq: Q, kind: 'mii', earlier: 'Prelim Unit Labor Costs q/q', gdpRev: -1 },
  { n: 30, name: 'Revised UoM Consumer Sentiment', freq: M, kind: 'mii', earlier: 'Prelim UoM Consumer Sentiment' },
  { n: 31, name: 'Revised UoM Inflation Expectations', freq: M, kind: 'mii', earlier: 'Prelim UoM Inflation Expectations' },
  { n: 32, name: 'Final Manufacturing PMI', freq: M, kind: 'mii', earlier: 'Flash Manufacturing PMI' },
  { n: 33, name: 'Final Services PMI', freq: M, kind: 'mii', earlier: 'Flash Services PMI' },
]
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const VINTAGED = ['ICSA', 'CCSA', 'AWHI', 'CES0500000003', 'RSAFS', 'TOTALSA', 'AWHMAN', 'MANEMP', 'AMTMTI', 'BOPGSTB', 'CPIUFDSL',
  'CPILFESL', 'CUSR0000SAH1', 'PPIFIS', 'CPIAUCSL', 'BUSINV', 'IR']
const MARKET = ['GASREGW', 'DCOILWTICO', 'DTWEXBGS']
const TIMING = [...new Set(RELEASES.map((r) => r.timing).filter(Boolean))]

// ---- dates -----------------------------------------------------------------------------------------------------------
const NYF = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
export const nyDate = (t) => NYF.format(new Date(t))
const dms = (d) => Date.parse(d + 'T00:00:00Z')
const addDays = (d, k) => new Date(dms(d) + k * DAY).toISOString().slice(0, 10)
const addMonths = (d, k) => { const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + k; return `${y + Math.floor(m / 12)}-${String(((m % 12) + 12) % 12 + 1).padStart(2, '0')}-01` }
const qStart = (d) => `${d.slice(0, 4)}-${String(Math.floor((+d.slice(5, 7) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
const qMonths = (q) => [q, addMonths(q, 1), addMonths(q, 2)]

// ---- raw fetch with cache (addendum A.6) -------------------------------------------------------------------------------
async function cached(name, url) {
  const f = path.join(RAW, name)
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  for (let k = 0; k < 5; k++) {
    try { const r = await fetch(url); if (r.ok) { const j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); return j } } catch {}
    await new Promise((s) => setTimeout(s, 2000 * (k + 1)))
  }
  throw new Error('fetch failed: ' + name)
}
async function fredObs(id, type) {
  const base = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${KEY}&file_type=json&observation_start=2008-01-01`
  const q = type === 'market' ? '' : `&realtime_start=2013-06-01&realtime_end=9999-12-31&output_type=${type === 'initial' ? 4 : 1}`
  const out = []
  for (let off = 0; ; off += 100000) {
    const j = await cached(`fred_${id}_${type}_${off}.json`, `${base}${q}&limit=100000&offset=${off}`)
    if (!j.observations) throw new Error(`FRED ${id} ${type}: ${j.error_message}`)
    out.push(...j.observations); if (j.observations.length < 100000) break
  }
  return out.filter((o) => o.value !== '.').map((o) => ({ d: o.date, v: Number(o.value), rs: o.realtime_start, re: o.realtime_end }))
}

// ---- as-of views (spec §2) -----------------------------------------------------------------------------------------------
// FRED vintaged: value of each observation in the latest vintage with date < release NY date (cut = day before).
function asOfVintage(rows, cut) { const m = new Map(); for (const o of rows) if (o.rs <= cut && cut <= o.re) m.set(o.d, { v: o.v, k: o.rs }); return m }
// Market daily / weekly: observation D usable only if D + 1 day < release NY date; known_t = D + 1 day.
function asOfMarket(rows, nyd) { const m = new Map(); for (const o of rows) { const k = addDays(o.d, 1); if (k < nyd) m.set(o.d, { v: o.v, k }) } return m }

const feat = (value, obs_date, known, source) => (value == null || !Number.isFinite(value) ? null : { value, obs_date, known_t: typeof known === 'number' ? known : dms(known), source })
const kmax = (...ks) => ks.reduce((a, b) => (dms(a) > dms(b) ? a : b))
function mmOf(view, month) { const a = view.get(month), b = view.get(addMonths(month, -1)); return a && b ? { v: (a.v / b.v - 1) * 100, k: kmax(a.k, b.k) } : null }
function monthAvg(view, month) {
  const xs = [...view].filter(([d]) => d.slice(0, 7) === month.slice(0, 7)); if (!xs.length) return null
  return { v: xs.reduce((s, [, x]) => s + x.v, 0) / xs.length, k: xs.reduce((a, [, x]) => kmax(a, x.k), xs[0][1].k), n: xs.length }
}
function latest(view) { let best = null; for (const [d, x] of view) if (!best || d > best[0]) best = [d, x]; return best }
function qMean(view, q, need = 3) {
  const xs = qMonths(q).map((m) => view.get(m)).filter(Boolean); if (xs.length < need) return null
  return { v: xs.reduce((s, x) => s + x.v, 0) / xs.length, k: xs.reduce((a, x) => kmax(a, x.k), xs[0].k), n: xs.length }
}
const annQ = (a, b) => (a && b ? { v: ((a.v / b.v) ** 4 - 1) * 100, k: kmax(a.k, b.k) } : null)
const mean3mm = (view, last) => { const xs = [0, 1, 2].map((i) => mmOf(view, addMonths(last, -i))); return xs.every(Boolean) ? { v: (xs[0].v + xs[1].v + xs[2].v) / 3, k: xs.reduce((a, x) => kmax(a, x.k), xs[0].k) } : null }

// ---- DTS (addendum A.4) ---------------------------------------------------------------------------------------------------
const DTS_DROP_CATG = /Public Debt Cash|Sub-Total|Total|Transfers to|Transfers from|Change in Balance of Uncollected/i
const DTS_KEEP_ACCT = /Federal Reserve Account|Treasury General Account \(TGA\)/i, DTS_DROP_ACCT = /Short-Term Cash Investments|Tax and Loan|Total/i
async function dtsMonth(month) {
  const from = month, to = addDays(addMonths(month, 1), -1), rows = []
  for (let p = 1; ; p++) {
    const u = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/deposits_withdrawals_operating_cash?fields=record_date,account_type,transaction_type,transaction_catg,transaction_today_amt&filter=record_date:gte:${from},record_date:lte:${to}&page[size]=10000&page[number]=${p}`
    const j = await cached(`dts_${month.slice(0, 7)}_${p}.json`, u); rows.push(...(j.data || [])); if (p >= (j.meta?.['total-pages'] ?? 1)) break
  }
  let net = 0, last = null, kept = 0
  for (const r of rows) {
    if (!r.transaction_catg || DTS_DROP_CATG.test(r.transaction_catg) || !DTS_KEEP_ACCT.test(r.account_type ?? '') || DTS_DROP_ACCT.test(r.account_type ?? '')) continue
    const a = Number(r.transaction_today_amt); if (!Number.isFinite(a)) continue
    net += /^Deposits/i.test(r.transaction_type) ? a : /^Withdrawals/i.test(r.transaction_type) ? -a : 0; kept++
    if (!last || r.record_date > last) last = r.record_date
  }
  return kept ? { net, last } : null
}

// ---- load everything ---------------------------------------------------------------------------------------------------------
export async function loadSources() {
  fs.mkdirSync(RAW, { recursive: true })
  const ff = new Map()
  for (const l of fs.readFileSync(FF_FILE, 'utf8').split('\n')) {
    if (!l) continue; const r = JSON.parse(l)
    // only name, time and the printed value are kept; the consensus (`forecast`) is never read into memory
    const v = ffValue(r.actual); if (!ff.has(r.name)) ff.set(r.name, new Map())
    ff.get(r.name).set(r.t, v ? v.value : null)
  }
  const FF = new Map([...ff].map(([k, m]) => [k, [...m].map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t)]))
  const vint = {}, mkt = {}, init = {}
  for (const id of VINTAGED) vint[id] = await fredObs(id, 'vintage')
  for (const id of MARKET) mkt[id] = await fredObs(id, 'market')
  for (const id of TIMING) init[id] = await fredObs(id, 'initial')
  return { FF, vint, mkt, init }
}

// ---- reference period (addendum A.1) --------------------------------------------------------------------------------------------
function refPeriod(rel, nyd, S) {
  if (rel.kind === 'mii') return null
  if (rel.kind === 'claims') { const dow = new Date(dms(nyd)).getUTCDay(); return addDays(nyd, -((dow + 1) % 7 || 7)) }
  if (['gdp', 'gdpprice', 'prod'].includes(rel.kind)) return addMonths(qStart(nyd), -3)
  const hits = (S.init[rel.timing] || []).filter((o) => Math.abs(dms(o.rs) - dms(nyd)) <= DAY).map((o) => o.d).sort()
  if (hits.length) return rel.freq === Q ? qStart(hits.at(-1)) : hits.at(-1)
  if (rel.kind === 'budget' && nyd < '2015-09-11') return addMonths(nyd.slice(0, 8) + '01', -1)
  if (rel.kind === 'curacct' && nyd < '2014-06-18') return qStart(addMonths(nyd.slice(0, 8) + '01', -3))
  return null
}
const ffBefore = (S, name, t, windowDays) => { const xs = (S.FF.get(name) || []).filter((r) => r.t < t && r.t >= t - windowDays * DAY && r.v != null); return xs.at(-1) ?? null }
const surveyWeek = (month) => { const d12 = month.slice(0, 8) + '12', dow = new Date(dms(d12)).getUTCDay(); return addDays(d12, (6 - dow + 7) % 7) }

// ---- one row (the only place features are made). cutShiftDays < 0 is the audit-3 leak probe -----------------------------------
export function buildRow(rel, t, S, { cutShiftDays = 0 } = {}) {
  const nydTrue = nyDate(t), ref = refPeriod(rel, nydTrue, S)
  const tc = t + cutShiftDays * DAY, nyd = nyDate(tc), cut = addDays(nyd, -1)
  const V = (id) => asOfVintage(S.vint[id], cut), MK = (id) => asOfMarket(S.mkt[id], nyd)
  const own = (S.FF.get(rel.name) || []).filter((r) => r.t < tc && r.v != null)
  const f = {}, put = (k, x, src, od) => { f[k] = x ? feat(x.v, od ?? null, x.k, src) : null }
  const ownK = (k) => { const r = own.at(-k); return r ? { v: r.v, k: r.t } : null }
  const win = rel.freq === Q ? 100 : 45
  let earlier = null
  if (rel.kind !== 'mii' && rel.kind !== 'claims' && rel.kind !== 'cpiyy' && rel.kind !== 'budget') put('own_1', ownK(1), 'FF own previous print')

  if (rel.kind === 'mii') {
    const e = ffBefore(S, rel.earlier, tc, win); earlier = e ? { t: e.t, value: e.v, name: rel.earlier } : null
    if (rel.gdpRev) {
      const p = ffBefore(S, 'Prelim GDP q/q', tc, win), a = p ? ffBefore(S, 'Advance GDP q/q', p.t, 100) : null
      put('gdp_rev', p && a ? { v: p.v - a.v, k: p.t } : null, 'FF Prelim GDP − Advance GDP')
    }
  } else if (ref == null) {
    // no reference period → no features (counted by the predictor as ref MISSING)
  } else if (rel.kind === 'claims') {
    const v = V('ICSA'), l = v.get(addDays(ref, -7)), xs = [7, 14, 21, 28].map((k) => v.get(addDays(ref, -k)))
    put('icsa_last', l, 'ALFRED ICSA', addDays(ref, -7))
    put('icsa_4wk', xs.every(Boolean) ? { v: xs.reduce((s, x) => s + x.v, 0) / 4, k: xs.reduce((a, x) => kmax(a, x.k), xs[0].k) } : null, 'ALFRED ICSA', addDays(ref, -7))
  } else if (rel.kind === 'nfp' || rel.kind === 'unrate') {
    const i = V('ICSA'), c = V('CCSA'), sw = surveyWeek(ref), sp = surveyWeek(addMonths(ref, -1))
    const d = (vw, lg) => { const a = vw.get(sw), b = vw.get(sp); return a && b ? { v: lg ? Math.log(a.v / b.v) : a.v - b.v, k: kmax(a.k, b.k) } : null }
    put('icsa_sw_chg', d(i, rel.kind === 'unrate'), 'ALFRED ICSA survey week', sw); put('ccsa_sw_chg', d(c, rel.kind === 'unrate'), 'ALFRED CCSA survey week', sw)
    if (rel.kind === 'nfp') { const e = ffBefore(S, 'ADP Non-Farm Employment Change', tc, 10); put('adp', e ? { v: e.v, k: e.t } : null, 'FF ADP') }
  } else if (rel.kind === 'income') {
    const a = V('AWHI'), w = V('CES0500000003'), bill = (m) => (a.get(m) && w.get(m) ? { v: a.get(m).v * w.get(m).v, k: kmax(a.get(m).k, w.get(m).k) } : null)
    const x = bill(ref), y = bill(addMonths(ref, -1)); put('wagebill_mm', x && y ? { v: (x.v / y.v - 1) * 100, k: kmax(x.k, y.k) } : null, 'ALFRED AWHI×CES0500000003', ref)
  } else if (rel.kind === 'spending') {
    put('rsafs_mm', mmOf(V('RSAFS'), ref), 'ALFRED RSAFS', ref); put('totalsa_mm', mmOf(V('TOTALSA'), ref), 'ALFRED TOTALSA', ref)
  } else if (rel.kind === 'ip') {
    const a = V('AWHMAN'), e = V('MANEMP'), h = (m) => (a.get(m) && e.get(m) ? { v: a.get(m).v * e.get(m).v, k: kmax(a.get(m).k, e.get(m).k) } : null)
    const x = h(ref), y = h(addMonths(ref, -1)); put('mfg_hours_mm', x && y ? { v: (x.v / y.v - 1) * 100, k: kmax(x.k, y.k) } : null, 'ALFRED AWHMAN×MANEMP', ref)
  } else if (rel.kind === 'factory') {
    const e = ffBefore(S, 'Durable Goods Orders m/m', tc, 45); put('durables', e ? { v: e.v, k: e.t } : null, 'FF Durable Goods Orders')
  } else if (rel.kind === 'businv') {
    const e = ffBefore(S, 'Prelim Wholesale Inventories m/m', tc, 45); put('prelim_wholesale', e ? { v: e.v, k: e.t } : null, 'FF Prelim Wholesale')
    put('amtmti_mm', mmOf(V('AMTMTI'), ref), 'ALFRED AMTMTI', ref)
  } else if (rel.kind === 'trade') {
    const e = ffBefore(S, 'Goods Trade Balance', tc, 45); put('goods_adv', e ? { v: e.v, k: e.t } : null, 'FF Goods Trade Balance')
  } else if (rel.kind === 'curacct') {
    const b = V('BOPGSTB'), xs = qMonths(ref).map((m) => b.get(m))
    put('trade_q_sum', xs.every(Boolean) ? { v: xs.reduce((s, x) => s + x.v, 0), k: xs.reduce((a, x) => kmax(a, x.k), xs[0].k) } : null, 'ALFRED BOPGSTB 3 months', ref)
  } else if (rel.kind === 'import') {
    const ma = (id) => { const v = MK(id), a = monthAvg(v, ref), b = monthAvg(v, addMonths(ref, -1)); return a && b ? { v: (a.v / b.v - 1) * 100, k: kmax(a.k, b.k) } : null }
    put('wti_mm', ma('DCOILWTICO'), 'FRED DCOILWTICO month avg', ref); put('usd_mm', ma('DTWEXBGS'), 'FRED DTWEXBGS month avg', ref)
  } else if (rel.kind === 'budget') {
    const d = S.dts.get(ref)
    const ok = d && d.last >= ref.slice(0, 8) + '25' && addDays(d.last, 2) <= nyd
    put('dts_net', ok ? { v: d.net, k: addDays(d.last, 2) } : null, 'Treasury DTS deposits − withdrawals', ref)
    const o12 = own.filter((r) => r.t <= tc - 350 * DAY && r.t >= tc - 380 * DAY).at(-1); put('own_12', o12 ? { v: o12.v, k: o12.t } : null, 'FF own print 12 months earlier')
  } else if (rel.kind === 'cpi') {
    const g = MK('GASREGW'), a = monthAvg(g, ref), b = monthAvg(g, addMonths(ref, -1)); put('gas_mm', a && b ? { v: (a.v / b.v - 1) * 100, k: kmax(a.k, b.k) } : null, 'FRED GASREGW month avg', ref)
    const fd = V('CPIUFDSL'), co = V('CPILFESL'), last = addMonths(ref, -1)
    put('food_3m', latest(fd)?.[0] === last ? mean3mm(fd, last) : null, 'ALFRED CPIUFDSL', last); put('core_3m', latest(co)?.[0] === last ? mean3mm(co, last) : null, 'ALFRED CPILFESL', last)
  } else if (rel.kind === 'corecpi') {
    const co = V('CPILFESL'), sh = V('CUSR0000SAH1'), pp = V('PPIFIS'), last = addMonths(ref, -1)
    put('core_3m', latest(co)?.[0] === last ? mean3mm(co, last) : null, 'ALFRED CPILFESL', last); put('shelter_3m', latest(sh)?.[0] === last ? mean3mm(sh, last) : null, 'ALFRED CUSR0000SAH1', last)
    const lp = latest(pp); put('ppi_mm', lp && lp[0] >= last ? mmOf(pp, lp[0]) : null, 'ALFRED PPIFIS latest', lp?.[0])
  } else if (rel.kind === 'cpiyy') {
    put('own_1', ownK(1), 'FF own previous print'); put('base_mm', mmOf(V(rel.base), addMonths(ref, -12)), `ALFRED ${rel.base} m/m one year earlier`, addMonths(ref, -12))
  } else if (rel.kind === 'corepce') {
    const pp = V('PPIFIS'), lp = latest(pp)
    put('corecpi_mm', mmOf(V('CPILFESL'), ref), 'ALFRED CPILFESL', ref); put('ppi_mm', lp && lp[0] >= addMonths(ref, -1) ? mmOf(pp, lp[0]) : null, 'ALFRED PPIFIS latest', lp?.[0])
  } else if (rel.kind === 'gdp') {
    const r = V('RSAFS'), b = V('BOPGSTB'), bi = V('BUSINV'), pq = addMonths(ref, -3)
    put('rsafs_qq', annQ(qMean(r, ref), qMean(r, pq)), 'ALFRED RSAFS quarter mean', ref)
    const bq = qMean(b, ref, 2), bp = qMean(b, pq, 2); put('trade_q_chg', bq && bp ? { v: bq.v - bp.v, k: kmax(bq.k, bp.k) } : null, 'ALFRED BOPGSTB quarter mean (≥2 months)', ref)
    const lm = qMonths(ref).filter((m) => bi.get(m)).at(-1), x = lm && bi.get(lm), y = bi.get(addMonths(ref, -1))
    put('businv_chg', x && y ? { v: x.v - y.v, k: kmax(x.k, y.k) } : null, 'ALFRED BUSINV', lm)
  } else if (rel.kind === 'gdpprice') {
    const c = V('CPIAUCSL'), ir = V('IR'), pq = addMonths(ref, -3)
    put('cpi_qq', annQ(qMean(c, ref), qMean(c, pq)), 'ALFRED CPIAUCSL quarter mean', ref); put('import_qq', annQ(qMean(ir, ref), qMean(ir, pq)), 'ALFRED IR quarter mean', ref)
  } else if (rel.kind === 'prod') {
    const a = V('AWHI'), pq = addMonths(ref, -3), e = ffBefore(S, 'Advance GDP q/q', tc, 100)
    put('adv_gdp', e ? { v: e.v, k: e.t } : null, 'FF Advance GDP'); put('hours_qq', annQ(qMean(a, ref), qMean(a, pq)), 'ALFRED AWHI quarter mean', ref)
    if (rel.ulc) { const w = V('CES0500000003'); put('ahe_qq', annQ(qMean(w, ref), qMean(w, pq)), 'ALFRED CES0500000003 quarter mean', ref) }
  }
  return { slug: slug(rel.name), name: rel.name, n: rel.n, freq: rel.freq, kind: rel.kind, release_t: t, ref_period: ref, features: f, earlier, own_hist: own.map((r) => ({ t: r.t, value: r.v })) }
}

// ---- main --------------------------------------------------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(ROWS, { recursive: true })
  const S = await loadSources()
  const ffEnd = Math.max(...[...S.FF.values()].flat().map((r) => r.t))
  // DTS months needed = every budget reference month
  const bud = RELEASES.find((r) => r.kind === 'budget'), months = new Set()
  for (const { t } of S.FF.get(bud.name)) { const p = refPeriod(bud, nyDate(t), S); if (p) months.add(p) }
  S.dts = new Map(); for (const m of [...months].sort()) S.dts.set(m, await dtsMonth(m))
  const sched = [], man = { at: new Date().toISOString(), spec: 'docs/research/macro_nowcast/2026-11-01_T1_step2_blind_nowcast_SPEC.md + addendum A', ff_end: new Date(ffEnd).toISOString(), files: {} }
  for (const rel of RELEASES) {
    const inst = S.FF.get(rel.name) || [], rows = inst.map(({ t }) => buildRow(rel, t, S))
    for (const r of rows) sched.push({ slug: r.slug, name: r.name, release_t: r.release_t, ref_period: r.ref_period })
    const txt = rows.map((r) => JSON.stringify(r)).join('\n') + '\n', file = `${slug(rel.name)}.jsonl`
    fs.writeFileSync(path.join(ROWS, file), txt)
    const nf = rows.map((r) => Object.values(r.features).filter(Boolean).length + (r.earlier ? 1 : 0))
    man.files[file] = { sha256: crypto.createHash('sha256').update(txt).digest('hex'), rows: rows.length, ref_missing: rows.filter((r) => r.kind !== 'mii' && !r.ref_period).length,
      feature_null: Object.fromEntries([...new Set(rows.flatMap((r) => Object.keys(r.features)))].map((k) => [k, rows.filter((r) => !r.features[k]).length])),
      earlier_null: rel.kind === 'mii' ? rows.filter((r) => !r.earlier).length : undefined, mean_inputs: +(nf.reduce((a, b) => a + b, 0) / nf.length).toFixed(2) }
    console.log(rel.n, rel.name, rows.length, JSON.stringify(man.files[file].feature_null), man.files[file].ref_missing, man.files[file].earlier_null ?? '')
  }
  sched.sort((a, b) => a.release_t - b.release_t)
  const st = sched.map((r) => JSON.stringify(r)).join('\n') + '\n'
  fs.writeFileSync(path.join(IN, 'release_schedule.jsonl'), st)
  man.release_schedule = { sha256: crypto.createHash('sha256').update(st).digest('hex'), rows: sched.length }
  man.dts_months = { n: S.dts.size, null: [...S.dts].filter(([, v]) => !v).map(([k]) => k) }
  fs.writeFileSync(path.join(IN, 'MANIFEST_inputs.json'), JSON.stringify(man, null, 1))
  console.log('schedule rows', sched.length, 'DTS months', S.dts.size, 'null', man.dts_months.null.length)
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1) })
