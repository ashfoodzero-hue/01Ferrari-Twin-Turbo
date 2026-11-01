// Source Map v1 (2026-11-01): one tiny call per free key Ashraf registered; prints status + a sample, never the key.
import '../../../src/core/bootEnv.js'
const E = process.env, out = {}
const get = async (name, url, pick) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); const t = await r.text(); let s; try { s = pick(JSON.parse(t)) } catch { s = t.slice(0, 120) } out[name] = `${r.status} ${JSON.stringify(s).slice(0, 220)}` } catch (e) { out[name] = 'ERR ' + (e.cause?.code || e.name) } }
await get('EIA weekly crude stocks', `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${E.EIA_KEY}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&sort[0][column]=period&sort[0][direction]=desc&length=2`, (j) => j.response?.data ?? j.error ?? j)
await get('BEA NIPA GDP T10101', `https://apps.bea.gov/api/data/?UserID=${E.BEA_API_KEY}&method=GetData&DataSetName=NIPA&TableName=T10101&Frequency=Q&Year=2026&ResultFormat=JSON`, (j) => j.BEAAPI?.Results?.Error ?? (j.BEAAPI?.Results?.Data ?? []).slice(0, 1))
await get('Census EITS housing starts', `https://api.census.gov/data/timeseries/eits/resconst?get=cell_value,time_slot_id,category_code&time=2026&data_type_code=TOTAL&seasonally_adj=yes&key=${E.Census_API_Key}`, (j) => j.slice(0, 2))
{ const r = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seriesid: ['CUSR0000SETE'], startyear: '2026', endyear: '2026', registrationkey: E.BLS_API_KEY }) }).catch((e) => null)
  const j = r ? await r.json() : null; out['BLS motor vehicle insurance CPI'] = `${r?.status} ${j?.status} ${JSON.stringify(j?.message)} ${JSON.stringify(j?.Results?.series?.[0]?.data?.[0])}` }
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(32), v)
