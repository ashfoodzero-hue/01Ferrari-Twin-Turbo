// measure_tv_daily.cjs — read OANDA:XAUUSD DAILY candles back to 2019 from Ashraf's TradingView over CDP (port 9222) and restore the chart.
// Used 2026-10-18 to prove the Polygon 2020-11-15 → 12-31 New-York-local stamps (src/data/sourceQuirks.js).
// Usage: node scripts/measure_tv_daily.cjs data/master/tv_daily_reference_2018_2026.json
const CDP = require('C:/Users/Ashraf/tradingview-mcp-jackson/node_modules/chrome-remote-interface')
const fs = require('fs')
const API = 'window.TradingViewApi._activeChartWidgetWV.value()'
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))
;(async () => {
  const page = (await CDP.List({ port: 9222 })).find((t) => t.type === 'page' && /tradingview\.com\/chart/.test(t.url))
  const c = await CDP({ port: 9222, target: page })
  const ev = async (e) => (await c.Runtime.evaluate({ expression: e, returnByValue: true, awaitPromise: true })).result.value
  const origSym = await ev(`${API}.symbol()`), origRes = await ev(`${API}.resolution()`), origRange = await ev(`${API}.getVisibleRange()`)
  const want = 'OANDA:XAUUSD', short = (s) => String(s).split(':').pop()
  try {
    if (short(origSym) !== short(want)) { await ev(`${API}.setSymbol('${want}', {})`); await sleep(3000) }
    await ev(`${API}.setResolution('1D', {})`); await sleep(2500)
    for (let k = 0; k < 30; k++) { const first = await ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); return b && b.size() ? b.valueAt(b.firstIndex())[0] : null})()`); if (first && first * 1000 <= Date.parse('2019-10-01')) break; await ev(`${API}._chartWidget.model().mainSeries().requestMoreData(300)`); await sleep(1500) }
    let bars = null
    for (let k = 0; k < 40; k++) { await sleep(750)
      bars = await ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); if(!b||!b.size()) return null; var o=[]; for(var i=b.firstIndex();i<=b.lastIndex();i++){var v=b.valueAt(i); if(v) o.push([v[0],v[1],v[2],v[3],v[4]])} return o})()`)
      if (bars && bars.length && bars[0][0] * 1000 <= Date.parse('2019-10-01')) break }
    fs.writeFileSync(process.argv[2], JSON.stringify({ symbol: want, at: new Date().toISOString(), bars }))
    console.log('daily bars', bars?.length, 'first', bars && new Date(bars[0][0] * 1000).toISOString())
  } finally {
    if (short(origSym) !== short(want)) { await ev(`${API}.setSymbol('${origSym}', {})`); await sleep(1500) }
    await ev(`${API}.setResolution('${origRes}', {})`); await sleep(1000)
    if (origRange) await ev(`${API}.setVisibleRange({from: ${origRange.from}, to: ${origRange.to}})`)
    console.log('restored', origSym, origRes); await c.close()
  }
})().catch((e) => { console.error(e.message); process.exit(1) })
