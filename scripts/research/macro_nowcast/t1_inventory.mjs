// ════════════════════════════════════════════════════════════════════════════════
// t1_inventory.mjs — T1 step 1: label all 85 numbered FF releases (a) BUILDABLE / (b) PUBLIC NOWCAST ONLY / (c) NOT BUILDABLE / (F) FED, by the
// rule pre-registered in docs/research/macro_nowcast/2026-10-30_T1_inventory_SPEC.md (Ashraf 10-30: "news/macros must cover everything").
// Reads release NAMES and row counts only (no actual / forecast value is used). Verifies every candidate input: FRED / ALFRED vintage dates
// since 2013-07, daily market series, earlier FF prints (≥ 40 rows), the Daily Treasury Statement. A failed input = MISSING (never assumed).
// Output: data/research/macro_nowcast/inputs/2026-10-30_T1_inventory.json
// ════════════════════════════════════════════════════════════════════════════════
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'

const KEY = process.env.FRED_API_KEY, FROM = '2013-07-01', OUT = path.join(TURBO.root, 'data', 'research', 'macro_nowcast', 'inputs'); fs.mkdirSync(OUT, { recursive: true })
const ff = fs.readFileSync(path.join(TURBO.root, 'data', 'calendar', 'ff_history.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const REL = {}; for (const r of ff) { if (r.actual == null && r.forecast == null) continue; const o = (REL[r.name] ??= { n: 0, first: r.t, last: r.t, impact: {} }); o.n++; o.last = r.t; o.impact[r.impact] = (o.impact[r.impact] || 0) + 1 }
const MARKET = new Set(['GASREGW', 'DCOILWTICO', 'DTWEXBGS'])
// the spec §2 table, verbatim (coverage = the pre-registered weight-coverage judgement)
const CPI_IN = ['GASREGW', 'PPIFIS', 'DCOILWTICO', 'CPIAUCSL', 'CPILFESL', 'CPIENGSL', 'CPIUFDSL', 'CUSR0000SAH1', 'CUSR0000SETA02']
const GDP_IN = ['RSAFS', 'PCE', 'BOPGSTB', 'BUSINV', 'TTLCONS', 'GDPC1']
const MAP = {
  'CPI m/m': { route: 'i+iii', inputs: CPI_IN }, 'CPI y/y': { route: 'i+iii', inputs: CPI_IN }, 'Core CPI m/m': { route: 'i+iii', inputs: CPI_IN }, 'Core CPI y/y': { route: 'i+iii', inputs: CPI_IN },
  'Core PCE Price Index m/m': { route: 'i', inputs: ['CPILFESL', 'PPIFIS', 'PCEPILFE'] },
  'Personal Income m/m': { route: 'i', inputs: ['PAYEMS', 'AWHI', 'CES0500000003', 'PI'] },
  'Personal Spending m/m': { route: 'i', inputs: ['RSAFS', 'TOTALSA', 'PCE'] },
  'Advance GDP q/q': { route: 'i', inputs: GDP_IN, competitor: 'GDPNOW' },
  'Advance GDP Price Index q/q': { route: 'i', inputs: ['CPIAUCSL', 'PPIFIS', 'IR', 'GDPCTPI'] },
  'Prelim GDP q/q': { route: 'ii', inputs: ['FF:Advance GDP q/q', ...GDP_IN] }, 'Final GDP q/q': { route: 'ii', inputs: ['FF:Prelim GDP q/q', ...GDP_IN] },
  'Prelim GDP Price Index q/q': { route: 'ii', inputs: ['FF:Advance GDP Price Index q/q'] }, 'Final GDP Price Index q/q': { route: 'ii', inputs: ['FF:Prelim GDP Price Index q/q'] },
  'Non-Farm Employment Change': { route: 'iii', inputs: ['FF:ADP Non-Farm Employment Change', 'ICSA', 'CCSA'] },   // ADPMNUSNERSA dropped: duplicate of the FF ADP first print (addendum A)
  'Unemployment Rate': { route: 'iii', inputs: ['CCSA', 'ICSA', 'UNRATE'] },
  'Unemployment Claims': { route: 'ii/iii', inputs: ['ICSA'] },
  'Industrial Production m/m': { route: 'i', inputs: ['AWHMAN', 'MANEMP', 'INDPRO'] },
  'Capacity Utilization Rate': { route: 'i', inputs: ['INDPRO', 'TCU'] },
  'Factory Orders m/m': { route: 'i', inputs: ['FF:Durable Goods Orders m/m', 'DGORDER', 'AMTMNO'] },
  'Business Inventories m/m': { route: 'i', inputs: ['FF:Prelim Wholesale Inventories m/m', 'RETAILIMSA', 'AMTMTI', 'BUSINV'] },
  'Final Wholesale Inventories m/m': { route: 'ii', inputs: ['FF:Prelim Wholesale Inventories m/m'] },
  'Trade Balance': { route: 'ii/i', inputs: ['FF:Goods Trade Balance', 'BOPGSTB'] },
  'Current Account': { route: 'i', inputs: ['BOPGSTB', 'IEABC'] },
  'Final Manufacturing PMI': { route: 'ii', inputs: ['FF:Flash Manufacturing PMI'] }, 'Final Services PMI': { route: 'ii', inputs: ['FF:Flash Services PMI'] },
  'Revised UoM Consumer Sentiment': { route: 'ii', inputs: ['FF:Prelim UoM Consumer Sentiment'] }, 'Revised UoM Inflation Expectations': { route: 'ii', inputs: ['FF:Prelim UoM Inflation Expectations'] },
  'Prelim Nonfarm Productivity q/q': { route: 'i', inputs: ['FF:Advance GDP q/q', 'OUTNFB', 'HOANBS', 'OPHNFB', 'ULCNFB'] }, 'Prelim Unit Labor Costs q/q': { route: 'i', inputs: ['FF:Advance GDP q/q', 'OUTNFB', 'HOANBS', 'OPHNFB', 'ULCNFB'] },
  'Revised Nonfarm Productivity q/q': { route: 'ii', inputs: ['FF:Prelim Nonfarm Productivity q/q', 'FF:Prelim GDP q/q'] }, 'Revised Unit Labor Costs q/q': { route: 'ii', inputs: ['FF:Prelim Unit Labor Costs q/q', 'FF:Prelim GDP q/q'] },
  'Import Prices m/m': { route: 'iii', inputs: ['DCOILWTICO', 'DTWEXBGS', 'IR'] },
  'Federal Budget Balance': { route: 'iii', inputs: ['DTS', 'MTSDS133FMS'] },
  'Core Retail Sales m/m': { route: 'iii', inputs: ['TOTALSA', 'GASREGW'], coverage_fail: 'autos ≈ 20 % + gasoline ≈ 8-9 % < 50 % (core excludes autos); no free dated card-spending series known' },
  'Retail Sales m/m': { route: 'iii', inputs: ['TOTALSA', 'GASREGW'], coverage_fail: 'autos ≈ 20 % + gasoline ≈ 8-9 % < 50 %; no free dated card-spending series known' },
  'Federal Funds Rate': { route: 'F' },
}
const cache = new Map()
async function verify(id, need) {
  if (cache.has(id)) return cache.get(id); let r
  try {
    if (id.startsWith('FF:')) { const x = REL[id.slice(3)]; r = x && x.n >= 40 ? { ok: true, kind: 'FF earlier print', rows: x.n, first: new Date(x.first).toISOString().slice(0, 10) } : { ok: false, kind: 'FF earlier print', why: x ? `only ${x.n} rows` : 'not in calendar' } }
    else if (id === 'DTS') { const u = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance?filter=record_date:lte:2013-07-31&sort=-record_date&page[size]=1'
      const j = await (await fetch(u)).json(); const d = j.data?.[0]?.record_date; r = d ? { ok: true, kind: 'Daily Treasury Statement', first_checked: d } : { ok: false, kind: 'Daily Treasury Statement', why: 'no record ≤ 2013-07' } }
    else if (MARKET.has(id)) { const j = await (await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${KEY}&file_type=json&observation_start=${FROM}&observation_end=2013-08-31`)).json()
      const s = await (await fetch(`https://api.stlouisfed.org/fred/series?series_id=${id}&api_key=${KEY}&file_type=json`)).json()
      r = j.observations?.length ? { ok: true, kind: 'market / weekly price (known_t = date + 1 day)', obs_in_2013_07_08: j.observations.length, title: s.seriess?.[0]?.title, frequency: s.seriess?.[0]?.frequency } : { ok: false, kind: 'market', why: j.error_message ?? 'no observations in 2013-07/08' } }
    else { const s = await (await fetch(`https://api.stlouisfed.org/fred/series?series_id=${id}&api_key=${KEY}&file_type=json`)).json()
      if (!s.seriess?.length) r = { ok: false, kind: 'FRED', why: s.error_message ?? 'series not found' }
      else { const v = await (await fetch(`https://api.stlouisfed.org/fred/series/vintagedates?series_id=${id}&api_key=${KEY}&file_type=json&realtime_start=${FROM}&limit=10000`)).json(), n = v.vintage_dates?.length ?? 0
        r = { ok: n >= need, kind: 'FRED / ALFRED vintages', vintages_since_2013_07: n, first_vintage: v.vintage_dates?.[0] ?? null, need, title: s.seriess[0].title, frequency: s.seriess[0].frequency, ...(n >= need ? {} : { why: `${n} vintages < ${need}` }) } } }
  } catch (e) { r = { ok: false, why: `fetch failed: ${e.message}` } }
  cache.set(id, r); return r
}
const out = { at: new Date().toISOString(), spec: 'docs/research/macro_nowcast/2026-10-30_T1_inventory_SPEC.md', releases: {} , counts: {} }
for (const [name, x] of Object.entries(REL).sort((a, b) => b[1].n - a[1].n)) {
  const m = MAP[name], row = { rows: x.n, first: new Date(x.first).toISOString().slice(0, 10), last: new Date(x.last).toISOString().slice(0, 10), impact: x.impact }
  if (x.n < 40) Object.assign(row, { route: m?.route ?? null, label: 'c', why: `only ${x.n} rows (< 40)` })
  else if (!m) Object.assign(row, { route: null, label: 'c', why: 'no earlier hard input (spec §2: every other numbered release → c)' })
  else if (m.route === 'F') Object.assign(row, { route: 'F', label: 'F', why: 'Fed decision → T1-F (surprise vs futures-implied path)' })
  else { const need = Math.floor(0.8 * x.n), res = {}; for (const id of m.inputs) res[id] = await verify(id, MARKET.has(id) || id.startsWith('FF:') || id === 'DTS' ? 0 : need)
    const missing = Object.entries(res).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.why}`)
    const comp = m.competitor ? await verify(m.competitor, 0) : null
    Object.assign(row, { route: m.route, inputs: res, ...(comp ? { competitor: { id: m.competitor, ...comp } } : {}) })
    if (m.coverage_fail) Object.assign(row, { label: 'c', why: `weight coverage: ${m.coverage_fail}` })
    else if (missing.length) Object.assign(row, { label: comp?.ok ? 'b' : 'c', why: `MISSING inputs → drops a label: ${missing.join('; ')}` })
    else Object.assign(row, { label: 'a', why: 'all inputs verified' }) }
  out.releases[name] = row; out.counts[row.label] = (out.counts[row.label] || 0) + 1
}
const f = path.join(OUT, '2026-10-30_T1_inventory.json'); fs.writeFileSync(f, JSON.stringify(out, null, 1))
console.log(`  labels: ${JSON.stringify(out.counts)}`)
for (const [k, v] of Object.entries(out.releases)) if (v.label !== 'c' || v.route) console.log(`  ${v.label}  ${k.padEnd(38)} ${v.why}`)
console.log(`  written ${path.relative(TURBO.root, f)}`)
