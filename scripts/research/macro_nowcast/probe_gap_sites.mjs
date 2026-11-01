// Source Map v1 gap check (2026-11-01): reachability of the extra sources (dollar / bond demand, gold flows, positioning, Fed text, sentiment).
const U = {
 treasury_auctions: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=1',
 gld_holdings_csv: 'https://www.spdrgoldshares.com/assets/dynamic/GLD/GLD_US_archive_EN.csv',
 cot_history_zip: 'https://www.cftc.gov/files/dea/history/fut_disagg_txt_2024.zip',
 fed_speeches_rss: 'https://www.federalreserve.gov/feeds/speeches.xml',
 nyfed_acm_termpremium: 'https://www.newyorkfed.org/medialibrary/media/research/data_indicators/ACMTermPremium.xls',
 reddit_gold: 'https://www.reddit.com/r/Gold/new.json?limit=1',
 wgc_goldhub: 'https://www.gold.org/goldhub/data',
}
for (const [k, u] of Object.entries(U)) { try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) }); const b = await r.arrayBuffer(); console.log(k.padEnd(22), r.status, r.headers.get('content-type')?.split(';')[0], b.byteLength + 'B', Buffer.from(b).toString('utf8', 0, 80).replace(/[^\x20-\x7e]/g, '.')) } catch (e) { console.log(k.padEnd(22), 'ERR', e.cause?.code || e.name) } }
