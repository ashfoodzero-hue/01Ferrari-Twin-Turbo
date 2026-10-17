// measure_tv_anchors.cjs — read candle open times (and OHLC) for each resolution from the active TradingView chart. Read-only except changing the chart's resolution
// (restored at the end). Usage: node scripts/measure_tv_anchors.cjs data/master/tv_anchor_reference.json (from the repo root; TradingView started with --remote-debugging-port=9222)
const CDP = require('C:/Users/Ashraf/tradingview-mcp-jackson/node_modules/chrome-remote-interface')
const fs = require('fs')
const API = 'window.TradingViewApi._activeChartWidgetWV.value()'
const RES = ['1', '3', '5', '15', '30', '60', '120', '180', '240', '360', '540', '1D', '2D', '3D', '1W', '1M']
;(async () => {
  const targets = await CDP.List({ port: 9222 })
  const page = targets.find((t) => t.type === 'page' && /tradingview\.com\/chart/.test(t.url))
  const c = await CDP({ port: 9222, target: page })
  const ev = async (expr) => (await c.Runtime.evaluate({ expression: expr, returnByValue: true, awaitPromise: true })).result.value
  const sym = await ev(`${API}.symbol()`), orig = await ev(`${API}.resolution()`)
  const out = { symbol: sym, original_resolution: orig, at: new Date().toISOString(), res: {} }
  for (const r of RES) {
    await ev(`${API}.setResolution('${r}', {})`)
    let bars = null
    for (let k = 0; k < 40; k++) { await new Promise((s) => setTimeout(s, 500))
      bars = await ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); if(!b||!b.size()) return null; var e=b.lastIndex(), s=Math.max(b.firstIndex(), e-400), o=[]; for(var i=s;i<=e;i++){var v=b.valueAt(i); if(v) o.push([v[0],v[1],v[2],v[3],v[4]])} return {res:${API}.resolution(), n:b.size(), bars:o}})()`)
      if (bars && bars.res === r && bars.bars.length > 20) break }
    out.res[r] = bars
    console.log(r, bars ? `${bars.n} bars, last ${new Date(bars.bars.at(-1)[0] * 1000).toISOString()}` : 'none')
  }
  await ev(`${API}.setResolution('${orig}', {})`)
  fs.writeFileSync(process.argv[2], JSON.stringify(out))
  console.log('symbol', sym, 'restored', orig)
  await c.close()
})().catch((e) => { console.error(e.message); process.exit(1) })
