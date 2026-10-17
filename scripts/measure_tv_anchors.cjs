// measure_tv_anchors.cjs — read candle open times (and OHLC) for each resolution from Ashraf's TradingView chart over CDP. Changes only the chart's
// resolution (and, with a symbol argument, its symbol) and RESTORES both at the end.
// Usage (repo root; TradingView started with --remote-debugging-port=9222):
//   node scripts/measure_tv_anchors.cjs data/master/tv_anchor_reference.json                       (the chart's current symbol)
//   node scripts/measure_tv_anchors.cjs data/master/tv_anchor_reference_XAGUSD.json OANDA:XAGUSD   (switch symbol, then restore)
const CDP = require('C:/Users/Ashraf/tradingview-mcp-jackson/node_modules/chrome-remote-interface')
const fs = require('fs')
const API = 'window.TradingViewApi._activeChartWidgetWV.value()'
const RES = ['1', '3', '5', '15', '30', '60', '120', '180', '240', '360', '540', '1D', '2D', '3D', '1W', '1M']
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))
;(async () => {
  const targets = await CDP.List({ port: 9222 })
  const page = targets.find((t) => t.type === 'page' && /tradingview\.com\/chart/.test(t.url))
  const c = await CDP({ port: 9222, target: page })
  const ev = async (expr) => (await c.Runtime.evaluate({ expression: expr, returnByValue: true, awaitPromise: true })).result.value
  const origSym = await ev(`${API}.symbol()`), orig = await ev(`${API}.resolution()`), want = process.argv[3] || origSym
  const short = (s) => String(s).split(':').pop()
  try {
    if (want !== origSym) { await ev(`${API}.setSymbol('${want}', {})`); for (let k = 0; k < 40 && short(await ev(`${API}.symbol()`)) !== short(want); k++) await sleep(500); await sleep(2000) }
    const out = { symbol: await ev(`${API}.symbol()`), original_symbol: origSym, original_resolution: orig, at: new Date().toISOString(), res: {} }
    if (short(out.symbol) !== short(want)) throw new Error(`chart did not switch to ${want} (shows ${out.symbol})`)
    for (const r of RES) {
      await ev(`${API}.setResolution('${r}', {})`)
      let bars = null, prevFirst = null
      for (let k = 0; k < 40; k++) { await sleep(500)
        bars = await ev(`(function(){var b=${API}._chartWidget.model().mainSeries().bars(); if(!b||!b.size()) return null; var e=b.lastIndex(), s=Math.max(b.firstIndex(), e-400), o=[]; for(var i=s;i<=e;i++){var v=b.valueAt(i); if(v) o.push([v[0],v[1],v[2],v[3],v[4]])} return {sym:${API}.symbol(), res:${API}.resolution(), n:b.size(), bars:o}})()`)
        // settled = right symbol + resolution, enough bars, and the same first bar on two consecutive reads (no half-loaded series)
        if (bars && short(bars.sym) === short(want) && bars.res === r && bars.bars.length > 20) { if (prevFirst === bars.bars[0][0]) break; prevFirst = bars.bars[0][0] } }
      out.res[r] = bars
      console.log(r, bars ? `${bars.n} bars, last ${new Date(bars.bars.at(-1)[0] * 1000).toISOString()}` : 'none')
    }
    fs.writeFileSync(process.argv[2], JSON.stringify(out))
  } finally {
    if (want !== origSym) { await ev(`${API}.setSymbol('${origSym}', {})`); await sleep(1500) }
    await ev(`${API}.setResolution('${orig}', {})`)
    console.log('restored', origSym, orig)
    await c.close()
  }
})().catch((e) => { console.error(e.message); process.exit(1) })
