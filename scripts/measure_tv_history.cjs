// measure_tv_history.cjs — read OANDA:XAUUSD candles for every TradingView resolution back to a date, from Ashraf's TradingView over CDP (9222),
// (argv[5] = symbol, default OANDA:XAUUSD) loading older history with mainSeries().requestMoreData until the date is reached or TradingView stops giving more; RESTORES symbol,
// resolution and visible range. Usage: node scripts/measure_tv_history.cjs <out.json> <fromISO> [res,res,…]
const CDP = require('C:/Users/Ashraf/tradingview-mcp-jackson/node_modules/chrome-remote-interface')
const fs = require('fs')
const API = 'window.TradingViewApi._activeChartWidgetWV.value()'
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))
const OUT = process.argv[2], FROM = Date.parse(process.argv[3]) / 1000
const RES = (process.argv[4] || '1M,1W,3D,2D,1D,540,360,240,180,120,60,30,15,5,3,1').split(','), WANT = process.argv[5] || 'OANDA:XAUUSD'
;(async () => {
  const page = (await CDP.List({ port: 9222 })).find((t) => t.type === 'page' && /tradingview\.com\/chart/.test(t.url))
  const c = await CDP({ port: 9222, target: page })
  const ev = async (e) => (await c.Runtime.evaluate({ expression: e, returnByValue: true, awaitPromise: true })).result.value
  const origSym = await ev(`${API}.symbol()`), origRes = await ev(`${API}.resolution()`), origRange = await ev(`${API}.getVisibleRange()`)
  const want = WANT, short = (s) => String(s).split(':').pop(), out = { symbol: want, from: process.argv[3], at: new Date().toISOString(), res: {} }
  const first = () => ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); return b && b.size() ? b.valueAt(b.firstIndex())[0] : null})()`)
  try {
    if (short(origSym) !== short(want)) { await ev(`${API}.setSymbol('${want}', {})`); await sleep(3000) }
    for (const r of RES) {
      await ev(`${API}.setResolution('${r}', {})`); await sleep(2500)
      let f = await first(), stall = 0
      for (let k = 0; k < 400 && f != null && f > FROM && stall < 6; k++) {
        await ev(`${API}._chartWidget.model().mainSeries().requestMoreData(2000)`); await sleep(1200)
        const f2 = await first(); if (f2 == null || f2 >= f) stall++; else stall = 0; f = f2 }
      const bars = await ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); var o=[]; for(var i=b.firstIndex();i<=b.lastIndex();i++){var v=b.valueAt(i); if(v) o.push([v[0],v[1],v[2],v[3],v[4]])} return o})()`)
      out.res[r] = bars
      console.log(r, bars.length, 'bars from', new Date(bars[0][0] * 1000).toISOString(), bars[0][0] <= FROM ? '(full year)' : '(TradingView stopped earlier)')
      fs.writeFileSync(OUT, JSON.stringify(out))
    }
  } finally {
    if (short(origSym) !== short(want)) { await ev(`${API}.setSymbol('${origSym}', {})`); await sleep(1500) }
    await ev(`${API}.setResolution('${origRes}', {})`); await sleep(1000)
    if (origRange) await ev(`${API}.setVisibleRange({from: ${origRange.from}, to: ${origRange.to}})`)
    console.log('restored', origSym, origRes); await c.close()
  }
})().catch((e) => { console.error(e.message); process.exit(1) })
