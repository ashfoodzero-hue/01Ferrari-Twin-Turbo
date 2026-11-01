// Source Map v1 (2026-11-01): HTTP reachability of every non-FRED candidate source (status, type, size). Reachable != dated history.
const U = {
 cleveland_nowcast: 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting',
 nyfed_staff_nowcast: 'https://www.newyorkfed.org/research/policy/nowcast',
 zillow_zori_csv: 'https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv',
 apartmentlist: 'https://www.apartmentlist.com/research/category/data-rent-estimates',
 manheim_index: 'https://site.manheim.com/en/services/consulting/used-vehicle-value-index.html',
 eia_crude_stocks_xls: 'https://www.eia.gov/dnav/pet/hist_xls/WCESTUS1w.xls',
 eia_gasoline_stocks_xls: 'https://www.eia.gov/dnav/pet/hist_xls/WGTSTUS1w.xls',
 eia_api_v2: 'https://api.eia.gov/v2/',
 gpr_daily_xls: 'https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls',
 nyfed_gscpi_xlsx: 'https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx',
 eurostat_hicp_api: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?geo=EA&coicop=CP00&lastTimePeriod=1',
 china_nbs: 'https://data.stats.gov.cn/english/',
 bls_api_v2: 'https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SETE',
 bls_relative_importance: 'https://www.bls.gov/cpi/tables/relative-importance/home.htm',
 challenger: 'https://www.challengergray.com/blog/category/job-cuts-reports/',
 adp_ner: 'https://adpemploymentreport.com/',
 opec_momr: 'https://www.opec.org/opec_web/en/publications/338.htm',
 bakerhughes_rigs: 'https://rigcount.bakerhughes.com/',
 bea_api: 'https://apps.bea.gov/api/data/?method=GETDATASETLIST',
 census_eits_api: 'https://api.census.gov/data/timeseries/eits/resconst?get=cell_value,time_slot_id&time=2026-08&category_code=STARTS&data_type_code=TOTAL&seasonally_adj=yes&geo_level_code=US',
 cftc_cot: 'https://www.cftc.gov/dea/newcot/f_disagg.txt',
 ecb_data_api: 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?lastNObservations=1&format=csvdata',
}
const out = {}
await Promise.all(Object.entries(U).map(async ([k, u]) => {
  try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) }); const b = await r.text(); out[k] = `${r.status} ${r.headers.get('content-type')?.split(';')[0]} ${b.length}B ${b.slice(0, 90).replace(/\s+/g, ' ')}` }
  catch (e) { out[k] = 'ERR ' + (e.cause?.code || e.name) }
}))
for (const k of Object.keys(U)) console.log(k.padEnd(24), out[k])
