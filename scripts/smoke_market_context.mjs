// smoke_market_context.mjs — marketContext.js (2026-10-17): the KNOWN-AT rules never leak a value early, Forex Factory times agree with the
// official release calendar, news and events land inside the right candle. Real data on disk.
import assert from 'node:assert'
import { loadContext, contextFor } from '../src/master/marketContext.js'

let n = 0, failed = 0
const ok = (name, fn) => { try { fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ MARKET CONTEXT SMOKE ██')
const ctx = loadContext(); console.log('      coverage ' + JSON.stringify(ctx.coverage))
ok('CPI: a reference month is NEVER known before its official release (and is known right after it)', () => {
  const sep = ctx.macro.cpi.find((r) => r.date === '2026-08-01'); assert(sep, 'August 2026 CPI row')
  const rel = ctx.cal.filter((e) => e.type === 'CPI' && e.t > Date.UTC(2026, 8, 1)).map((e) => e.t).sort((a, b) => a - b)[0]
  assert.equal(sep.known_t, rel)
  assert.notEqual(contextFor(ctx, rel - 60000, rel).macro_at_open.cpi?.date, '2026-08-01', 'visible one minute before the release')
  assert.equal(contextFor(ctx, rel, rel + 60000).macro_at_open.cpi?.date, '2026-08-01')
  for (const r of ctx.macro.cpi) if (r.known_t) assert(r.known_t > Date.parse(r.date) + 27 * 86400000, 'CPI known before its month ended: ' + r.date)
})
ok('labour market: known at the first NFP after the month · yields: known two sessions later · expectations: next month', () => {
  for (const r of ctx.macro.labor) assert(r.known_t > Date.parse(r.date) + 27 * 86400000, r.date)
  for (const r of ctx.macro.yields.slice(-300)) assert(r.known_t > Date.parse(r.date) + 86400000, r.date)
  for (const r of ctx.macro.infl_expect) assert(r.known_t >= Date.parse(r.date) + 28 * 86400000, r.date)
})
ok('Forex Factory times agree with the official calendar after the time-authority fix (CPI NFP PPI JOLTS Retail FOMC: an FF event at the official minute with its actual, 100 %)', () => {
  const RE = { CPI: /CPI/, NFP: /^Non-Farm Employment Change$/, PPI: /PPI/, RETAIL: /Retail Sales/, JOLTS: /JOLTS/, FOMC: /Federal Funds Rate|FOMC Statement/ }
  const off = ctx.cal.filter((e) => RE[e.type] && e.t >= (ctx.ff[0]?.t ?? Infinity) && e.t <= Date.now())
  let hit = 0; const miss = []; for (const e of off) if (ctx.ff.some((f) => f.t === e.t && RE[e.type].test(f.name) && f.actual)) hit++; else miss.push(e.type + ' ' + new Date(e.t).toISOString())
  console.log(`      official releases in the FF window ${off.length}, matched at the exact minute with an actual ${hit}${miss.length ? ' · missing ' + miss.join(', ') : ''}`)
  assert(off.length >= 800); assert.equal(hit, off.length)
})
ok('a candle sees the events and news INSIDE it, and the event actual is only in candles from its release on', () => {
  const nfp = ctx.ff.find((f) => /^Non-Farm Employment Change$/.test(f.name) && f.t > Date.UTC(2025, 0, 1)); assert(nfp)
  const inside = contextFor(ctx, nfp.t - 3600000, nfp.t + 3600000); assert(inside.events.some((e) => e.id === nfp.id))
  const before = contextFor(ctx, nfp.t - 7200000, nfp.t); assert(!before.events.some((e) => e.id === nfp.id), 'an event leaked into the candle before it')
  const nw = ctx.news.find((x) => x.t > Date.UTC(2025, 0, 1)); assert(nw); assert(contextFor(ctx, nw.t, nw.t + 1).news.some((x) => x.id === nw.id))
  assert.equal(contextFor(ctx, Date.UTC(2016, 0, 4), Date.UTC(2016, 0, 5)).coverage.news, false, 'pre-2020 news coverage must say NO')
})
console.log(failed ? `✗ MARKET CONTEXT SMOKE: ${n} passed, ${failed} failed` : `✅ MARKET CONTEXT SMOKE: ${n} passed, 0 failed`)
