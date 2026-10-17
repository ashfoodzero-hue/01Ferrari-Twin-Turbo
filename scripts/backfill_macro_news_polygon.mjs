// backfill_macro_news_polygon.mjs — Polygon MACRO series + gold-related NEWS, full history (2026-10-17; Ashraf: "make sure we also have the news
// and macros at the same time of the candles reading at each time frame"). Polygon is THE source (RED RULE); every row keeps its raw fields.
//   macro: /fed/v1/{treasury-yields (daily, 1962+), inflation (monthly CPI, 1947+), inflation-expectations (monthly, 1982+), labor-market (monthly, 1948+)}
//   news : /v2/reference/news for gold tickers (GLD, IAU, GDX, NEM, SLV) — Polygon's news archive starts 2020 (measured 2026-10-17)
// Output: data/macro/{name}.json { at, source, rows[] } · data/news/polygon_news.jsonl (deduped by id, ascending by published_utc).
// The rows carry their REFERENCE date only; when each value became KNOWN is decided in src/master/marketContext.js (never assumed here).
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const KEY = process.env.POLYGON_API_KEY, sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function all(url, max = 100000) { const rows = []; let u = url, pages = 0
  while (u && rows.length < max) { const r = await fetch(u + (u.includes('apiKey=') ? '' : (u.includes('?') ? '&' : '?') + 'apiKey=' + KEY))
    if (r.status === 429) { await sleep(15000); continue }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${u.slice(0, 90)}`)
    const j = await r.json(); rows.push(...(j.results || [])); u = j.next_url || null; pages++; if (pages % 20 === 0) console.log(`    … ${rows.length} rows`); await sleep(250) }
  return rows }
const MAC = path.join(TURBO.data, 'macro'), NEWS = path.join(TURBO.data, 'news'); fs.mkdirSync(MAC, { recursive: true }); fs.mkdirSync(NEWS, { recursive: true })
for (const ep of ['treasury-yields', 'inflation', 'inflation-expectations', 'labor-market']) {
  const rows = await all(`https://api.polygon.io/fed/v1/${ep}?limit=50000&sort=date.asc`)
  fs.writeFileSync(path.join(MAC, ep + '.json'), JSON.stringify({ at: new Date().toISOString(), source: 'polygon /fed/v1/' + ep, rows }))
  console.log(`macro ${ep}: ${rows.length} rows ${rows[0]?.date} → ${rows.at(-1)?.date}`) }
const byId = new Map()
for (const tk of ['GLD', 'IAU', 'GDX', 'NEM', 'SLV']) {
  const rows = await all(`https://api.polygon.io/v2/reference/news?ticker=${tk}&limit=1000&order=asc&sort=published_utc`)
  let k = 0; for (const n of rows) if (!byId.has(n.id)) { byId.set(n.id, { id: n.id, t: Date.parse(n.published_utc), published_utc: n.published_utc, title: n.title, description: n.description ?? null, publisher: n.publisher?.name ?? null, tickers: n.tickers ?? [], keywords: n.keywords ?? [], url: n.article_url ?? null, insights: n.insights ?? null }); k++ }
  console.log(`news ${tk}: ${rows.length} articles (${k} new)`) }
const news = [...byId.values()].sort((a, b) => a.t - b.t)
fs.writeFileSync(path.join(NEWS, 'polygon_news.jsonl'), news.map((n) => JSON.stringify(n)).join('\n') + '\n')
console.log(`news total: ${news.length} articles ${news[0]?.published_utc} → ${news.at(-1)?.published_utc}`)
