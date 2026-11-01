// collect_daily.mjs — the Source Map's DAILY COLLECTOR (2026-11-01; Ashraf: "yes build the daily collector"; design SOURCE_MAP_v1 §6).
// Records once a day every source that has NO dated history (HIST / FWD in the map), so from today on each value carries the wall-clock time it was
// fetched = its known_t. DATED sources (ALFRED, FF calendar, Polygon) are NOT copied: they are rebuilt exactly when needed.
// Research only: nothing here feeds a signal. Failures are written to the folder log only (Ashraf Q3: no Telegram).
// Output: data/research/macro_nowcast/daily/<source>/<YYYY-MM-DD>.json.gz  {fetched_at, source, url (keys removed), status, sha256, same_as_previous, body}
//         data/research/macro_nowcast/daily/collect_log.jsonl (one row per run) + last_run.json
// Usage: node scripts/research/macro_nowcast/collect_daily.mjs [--only=name,name]
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { TURBO } from '../../../src/core/paths.js'

const E = process.env, DIR = path.join(TURBO.root, 'data', 'research', 'macro_nowcast', 'daily'), DAY = new Date().toISOString().slice(0, 10)
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const UA = { 'user-agent': 'Mozilla/5.0 (FerrariTwinTurbo research collector)' }
const redact = (u) => u.replace(/(api_key|apiKey|key|UserID|registrationkey)=[^&]+/gi, '$1=REDACTED')
// GDELT allows about one request per 5 s and answers 429 above that → 4 grouped queries (OR), 15 s apart, retried (first run 11-01: 6 × 429 with 12 single queries)
const GEO = { mideast: '(Iran OR Israel OR "Saudi Arabia" OR Hormuz OR Houthi OR Yemen OR Jordan OR Syria OR Iraq OR Egypt)', oil_opec: '(OPEC OR "oil supply" OR "crude oil" OR "oil price")',
  powers: '(Russia OR Ukraine OR Taiwan OR "North Korea" OR Pakistan OR Turkey)', fed_gold: '("Federal Reserve" OR "gold price" OR "Treasury yields" OR "dollar index")' }
// whole words only (first run 11-01 matched "Gold Glove" and "Award"): geopolitics, Fed, macro, oil, gold PRICE
const PM_RE = /\b(Iran|Israel|Saudi|Hormuz|ceasefire|war with|invade|invasion|Russia|Ukraine|China|Taiwan|North Korea|Fed|Federal Reserve|FOMC|rate cuts?|rate hikes?|recession|inflation|CPI|oil|crude|tariffs?|gold price|price of gold|XAU)\b/i

// ONE list of sources (the map's HIST / FWD leaves). kind 'raw' = save the body as fetched; 'json' = parse + optional pick()
const SOURCES = [
  { name: 'zillow_zori', url: 'https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv', kind: 'raw' },
  { name: 'manheim_index', url: 'https://site.manheim.com/en/services/consulting/used-vehicle-value-index.html', kind: 'raw' },
  { name: 'cleveland_nowcast', url: 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting', kind: 'raw' },
  { name: 'nyfed_staff_nowcast', url: 'https://www.newyorkfed.org/research/policy/nowcast', kind: 'raw' },
  { name: 'gpr_daily', url: 'https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls', kind: 'raw' },
  { name: 'nyfed_gscpi', url: 'https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx', kind: 'raw' },
  { name: 'nyfed_acm_termpremium', url: 'https://www.newyorkfed.org/medialibrary/media/research/data_indicators/ACMTermPremium.xls', kind: 'raw' },
  { name: 'eurostat_hicp', url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?geo=EA&coicop=CP00&coicop=TOT_X_NRG_FOOD&lastTimePeriod=3', kind: 'json' },
  { name: 'ecb_dfr', url: 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?lastNObservations=5&format=csvdata', kind: 'raw' },
  { name: 'bakerhughes_rigs', url: 'https://rigcount.bakerhughes.com/', kind: 'raw' },
  { name: 'cftc_cot_disagg', url: 'https://www.cftc.gov/dea/newcot/f_disagg.txt', kind: 'raw' },
  { name: 'treasury_auctions', url: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=60', kind: 'json' },
  { name: 'fed_speeches_rss', url: 'https://www.federalreserve.gov/feeds/speeches.xml', kind: 'raw' },
  { name: 'un_news_mideast_rss', url: 'https://news.un.org/feed/subscribe/en/news/region/middle-east/feed/rss.xml', kind: 'raw' },
  { name: 'eia_weekly_petroleum', url: `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${E.EIA_KEY}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&facets[series][]=WGTSTUS1&facets[series][]=WDISTUS1&facets[series][]=WCSSTUS1&sort[0][column]=period&sort[0][direction]=desc&length=40`, kind: 'json', needs: 'EIA_KEY' },
  { name: 'bea_gdp_t10101', url: `https://apps.bea.gov/api/data/?UserID=${E.BEA_API_KEY}&method=GetData&DataSetName=NIPA&TableName=T10101&Frequency=Q&Year=X&ResultFormat=JSON`, kind: 'json', needs: 'BEA_API_KEY',
    pick: (j) => (j.BEAAPI?.Results?.Data ?? []).filter((r) => r.TimePeriod >= `${new Date().getUTCFullYear() - 2}`) },
  // prediction markets: paged (first run 11-01: the top 500 Polymarket markets held only 2 matches, Kalshi's first 1,000 markets none)
  { name: 'polymarket_open', url: 'https://gamma-api.polymarket.com/markets?closed=false', custom: async () => { const out = []
    for (let off = 0; off < 5000; off += 500) { const j = await (await fetch(`https://gamma-api.polymarket.com/markets?closed=false&limit=500&offset=${off}`, { headers: UA, signal: AbortSignal.timeout(60000) })).json()
      if (!Array.isArray(j) || !j.length) break
      for (const m of j) if (PM_RE.test(m.question ?? '')) out.push({ id: m.id, q: m.question, end: m.endDate, prices: m.outcomePrices, outcomes: m.outcomes, vol: m.volume }) }
    return out } },
  { name: 'kalshi_open', url: 'https://api.elections.kalshi.com/trade-api/v2/events?status=open', custom: async () => { const out = []; let cursor = ''
    for (let p = 0; p < 30; p++) { const j = await (await fetch(`https://api.elections.kalshi.com/trade-api/v2/events?status=open&with_nested_markets=true&limit=200${cursor ? `&cursor=${cursor}` : ''}`, { headers: UA, signal: AbortSignal.timeout(60000) })).json()
      for (const e of j.events ?? []) if (PM_RE.test(`${e.title} ${e.sub_title ?? ''}`) || /World|Economics|Financials/i.test(e.category ?? ''))
        for (const m of e.markets ?? []) out.push({ event: e.title, cat: e.category, t: m.ticker, title: m.title ?? m.yes_sub_title, close: m.close_time,
          ...Object.fromEntries(Object.entries(m).filter(([k]) => /price|bid|ask|volume|open_interest/i.test(k))) })   // every price field as Kalshi names it
      cursor = j.cursor; if (!cursor) break }
    return out } },
  ...Object.entries(GEO).map(([k, q]) => ({ name: `gdelt_${k}`, gdelt: true,
    url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=250&timespan=1d&format=json&sort=datedesc`, kind: 'json' })),
]

async function fetchOne(s) {
  if (s.custom) { const body = JSON.stringify(await s.custom()); return { status: 200, ok: true, ctype: 'application/json', encoding: 'utf8', body } }
  const r = await fetch(s.url, { headers: UA, signal: AbortSignal.timeout(60000) }), buf = Buffer.from(await r.arrayBuffer())
  let body = buf.toString(s.kind === 'raw' && !/csv|txt|xml|html|json/i.test(r.headers.get('content-type') ?? '') ? 'base64' : 'utf8'), encoding = /base64/.test(body) ? 'utf8' : 'utf8'
  if (s.kind === 'raw' && !/csv|txt|xml|html|json/i.test(r.headers.get('content-type') ?? '')) encoding = 'base64'
  if (s.kind === 'json' && r.ok) { const j = JSON.parse(buf.toString('utf8')); body = JSON.stringify(s.pick ? s.pick(j) : j) }
  return { status: r.status, ok: r.ok, ctype: r.headers.get('content-type'), encoding, body }
}
async function acled() {   // ACLED: OAuth token from the myACLED account Ashraf stores in .env (ACLED_EMAIL / ACLED_PASSWORD); last 7 days, Middle East + watch list
  if (!E.ACLED_EMAIL || !E.ACLED_PASSWORD) return { status: 0, ok: false, skipped: 'ACLED_EMAIL / ACLED_PASSWORD not in .env' }
  const tok = await (await fetch('https://acleddata.com/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: E.ACLED_EMAIL, password: E.ACLED_PASSWORD, grant_type: 'password', client_id: 'acled' }) })).json()
  if (!tok.access_token) return { status: 401, ok: false, skipped: 'token refused: ' + JSON.stringify(tok).slice(0, 160) }
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const u = `https://acleddata.com/api/acled/read?_format=json&event_date=${from}|${DAY}&event_date_where=BETWEEN&region=Middle%20East&limit=5000`
  const r = await fetch(u, { headers: { Authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' } }), t = await r.text()
  return { status: r.status, ok: r.ok, ctype: r.headers.get('content-type'), encoding: 'utf8', body: t, url: u }
}

fs.mkdirSync(DIR, { recursive: true })
const log = { at: new Date().toISOString(), day: DAY, ok: [], same: [], failed: {}, skipped: {} }
const list = [...SOURCES, { name: 'acled_mideast_7d', acled: true, url: 'https://acleddata.com/api/acled/read' }].filter((s) => !ONLY.length || ONLY.includes(s.name))
for (const s of list) {
  try {
    if (s.needs && !E[s.needs]) { log.skipped[s.name] = `${s.needs} missing in .env`; continue }
    if (s.name === 'bea_gdp_t10101') s.url = s.url.replace('Year=X', `Year=${new Date().getUTCFullYear() - 1},${new Date().getUTCFullYear()}`)
    let res = null   // 3 tries: timeouts and 429 are transient (first run 11-01: EIA / BEA ETIMEDOUT that had answered 200 an hour earlier)
    for (let k = 0; k < 3; k++) { try { res = s.acled ? await acled() : await fetchOne(s) } catch (e) { res = { ok: false, status: String(e.cause?.code || e.message).slice(0, 80) } }
      if (res.ok || res.skipped || (typeof res.status === 'number' && res.status !== 429 && res.status < 500 && res.status !== 0)) break
      await new Promise((r) => setTimeout(r, (s.gdelt ? 30000 : 10000) * (k + 1))) }
    if (res.skipped) { log.skipped[s.name] = res.skipped; continue }
    if (!res.ok) { log.failed[s.name] = `HTTP ${res.status}`; continue }
    const sha = crypto.createHash('sha256').update(res.body).digest('hex'), d = path.join(DIR, s.name); fs.mkdirSync(d, { recursive: true })
    const prev = fs.readdirSync(d).filter((f) => f.endsWith('.json.gz') && !f.startsWith(DAY)).sort().at(-1)
    const prevSha = prev ? JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, prev))).toString()).sha256 : null
    const same = prevSha === sha
    const rec = { fetched_at: new Date().toISOString(), source: s.name, url: redact(res.url ?? s.url), status: res.status, ctype: res.ctype, sha256: sha, same_as_previous: same ? prev : null, encoding: res.encoding, body: same ? null : res.body }
    fs.writeFileSync(path.join(d, `${DAY}.json.gz`), zlib.gzipSync(JSON.stringify(rec)))
    ;(same ? log.same : log.ok).push(s.name)
  } catch (e) { log.failed[s.name] = String(e.cause?.code || e.message).slice(0, 160) }
  if (s.gdelt) await new Promise((r) => setTimeout(r, 15000))   // GDELT: ≥ 5 s between requests; 15 s measured safe margin
}
fs.appendFileSync(path.join(DIR, 'collect_log.jsonl'), JSON.stringify(log) + '\n')
fs.writeFileSync(path.join(DIR, 'last_run.json'), JSON.stringify(log, null, 1))
console.log(`collect_daily ${DAY}: new ${log.ok.length} · unchanged ${log.same.length} · failed ${Object.keys(log.failed).length} ${JSON.stringify(log.failed)} · skipped ${JSON.stringify(log.skipped)}`)
process.exit(Object.keys(log.failed).length ? 1 : 0)
