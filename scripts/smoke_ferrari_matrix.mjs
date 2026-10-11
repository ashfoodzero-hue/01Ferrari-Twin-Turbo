// smoke_ferrari_matrix.mjs — the Ferrari Matrix scalp module (src/master/ferrariMatrix.js): WTI-as-delivered, the trade resolver's
// branches (bid/ask, half at TP1 + break-even, TP2, stop-first, horizon), and the signal's causality on real data.
import assert from 'node:assert'
import { wtiHourAt, resolveMatrixTrade, matrixSignals, MATRIX } from '../src/master/ferrariMatrix.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ FERRARI MATRIX SMOKE ██')
const H = Date.UTC(2026, 9, 9, 10), m1 = (t, o, c) => ({ t, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 })
await ok('WTI hour AS DELIVERED: at 10:25 the 10:00 hour shows only minutes up to 10:14 (10 min delay); at 10:05 it shows the 09:00 hour', () => {
  const w = []; for (let k = -60; k < 30; k++) w.push(m1(H + k * 60000, 80 + k * 0.01, 80 + k * 0.01 + 0.005))
  const a = wtiHourAt(w, H + 25 * 60000); assert.equal(a.hourT, H); assert.equal(a.lastMinuteT, H + 14 * 60000); assert.equal(a.o, w[60].o)
  const b = wtiHourAt(w, H + 5 * 60000); assert.equal(b.hourT, H - 3600000)
  assert.equal(wtiHourAt([], H), null)
})
const sp = () => 0.5
const sig = (side, entry, sl, tp1, tp2) => ({ side, entry, sl, tp1, tp2, decisionT: H, atr: 2 })
const path = (pts) => pts.map(([k, l, h]) => ({ t: H + k * 60000, o: l, h, l, c: h, v: 1 }))
await ok('BUY: entry at the ASK (close + spread); half at TP1, stop moves to the fill; the rest exits at break-even → P&L = half of (TP1 − fill)', () => {
  const r = resolveMatrixTrade(sig('BUY', 100, 98, 110, 115), path([[0, 99.5, 105], [1, 104, 110.2], [2, 100.3, 106]]), sp)
  assert.equal(r.fill, 100.5); assert.equal(r.outcome, 'TP1+BE'); assert.equal(r.pnl, +(0.5 * (110 - 100.5) + 0.5 * (100.5 - 0.1 - 100.5)).toFixed(4))
})
await ok('BUY: TP1 then TP2 → both halves paid', () => {
  const r = resolveMatrixTrade(sig('BUY', 100, 98, 110, 115), path([[0, 99.5, 111], [1, 110, 115.5]]), sp)
  assert.equal(r.outcome, 'TP1+TP2'); assert.equal(r.pnl, +(0.5 * 9.5 + 0.5 * 14.5).toFixed(4))
})
await ok('SELL: exits compare the ASK (bid + spread) — a TP touched on the bid only is not paid; stop fires when the ask reaches it', () => {
  const r1 = resolveMatrixTrade(sig('SELL', 100, 102, 90, 85), path([[0, 90, 99], [1, 90.2, 99]]), sp, { horizonMin: 3 })
  assert.notEqual(r1.outcome, 'TP1+TP2'); assert(!r1.tp1Hit, 'bid 90 + 0.5 spread = ask 90.5 > TP1 90')
  const r2 = resolveMatrixTrade(sig('SELL', 100, 102, 90, 85), path([[0, 99, 101.6]]), sp)
  assert.equal(r2.outcome, 'SL'); assert.equal(r2.pnl, +(100 - (102 + 0.1)).toFixed(4))
})
await ok('a minute touching BOTH the stop and TP1 is a stop (pessimistic); the horizon closes the rest at the market; a live path ends OPEN', () => {
  assert.equal(resolveMatrixTrade(sig('BUY', 100, 98, 110, 115), path([[0, 97, 111]]), sp).outcome, 'SL')
  assert.equal(resolveMatrixTrade(sig('BUY', 100, 98, 110, 115), path([[0, 99, 101], [1, 99, 101]]), sp, { horizonMin: 2 }).outcome, 'TIME')
  const r = resolveMatrixTrade(sig('BUY', 100, 98, 110, 115), path([[0, 99, 101]]), sp, { nowT: H + 120000 }); assert.equal(r.done, false); assert.equal(r.outcome, 'OPEN')
})
await ok('SIGNAL causality: a signal on bar i is unchanged when every later bar is removed (pivots confirm only after 5 closed bars)', async () => {
  const { loadBars } = await import('../src/data/backfillReader.js'); const { loadDxyBars } = await import('../src/data/dxy.js'); const fs = await import('node:fs')
  const from = Date.parse('2026-09-01'), to = Date.parse('2026-09-20')
  const B = (await loadBars('XAUUSD', '3m', { from, to })).bars, D = (await loadDxyBars('3m', { from, to })).bars
  const W = fs.readFileSync(new URL('../data/history/WTI/1m.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => b.t >= from - 7200000 && b.t <= to)
  const all = matrixSignals(B, D, W); assert(all.length > 0, 'no signals in the window — cannot test causality')
  for (const s of all.filter((_, k) => k % Math.max(1, Math.floor(all.length / 25)) === 0)) {
    const cut = matrixSignals(B.slice(0, s.i + 1), D.filter((d) => d.t <= s.t), W.filter((w) => w.t + 60000 <= s.decisionT)).find((x) => x.i === s.i)
    assert(cut, 'signal at ' + new Date(s.t).toISOString() + ' vanished when the future was cut'); assert.equal(cut.side, s.side); assert.equal(cut.sl, s.sl); assert.equal(cut.tp1, s.tp1)
  }
})
await ok('LIVE-WINDOW PARITY: matrix_tick evaluates on a 3-day window — every signal it would see equals the full-history signal (EMA/ATR warm-up converged)', async () => {
  const { loadBars } = await import('../src/data/backfillReader.js'); const { loadDxyBars } = await import('../src/data/dxy.js'); const fs = await import('node:fs')
  const from = Date.parse('2026-08-20'), to = Date.parse('2026-09-20')
  const B = (await loadBars('XAUUSD', '3m', { from, to })).bars, D = (await loadDxyBars('3m', { from, to })).bars
  const W = fs.readFileSync(new URL('../data/history/WTI/1m.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => b.t >= from - 7200000 && b.t <= to)
  const full = matrixSignals(B, D, W).filter((s) => s.t >= Date.parse('2026-09-10')); assert(full.length > 0)
  let checked = 0
  for (const s of full.filter((_, k) => k % Math.max(1, Math.floor(full.length / 20)) === 0)) {
    const w0 = s.decisionT - 3 * 86400000, b = B.filter((x) => x.t >= w0 && x.t <= s.t), d = D.filter((x) => x.t >= w0 && x.t <= s.t)
    const live = matrixSignals(b, d, W.filter((w) => w.t >= s.decisionT - 4 * 3600000 && w.t + 60000 <= s.decisionT), { from: b.length - 1 }).find((x) => x.i === b.length - 1)
    assert(live, 'live window missed the signal at ' + new Date(s.t).toISOString()); assert.equal(live.side, s.side); assert.equal(live.sl, s.sl); assert.equal(live.tp2, s.tp2); checked++
  }
  // and the reverse: no live-window signal that full history lacks (sample of non-signal bars near the walls)
  const fullT = new Set(matrixSignals(B, D, W).map((s) => s.t)); let extra = 0
  for (let i = B.findIndex((x) => x.t >= Date.parse('2026-09-15')); i < B.length; i += 37) { const w0 = B[i].t + 180000 - 3 * 86400000, b = B.filter((x) => x.t >= w0 && x.t <= B[i].t), d = D.filter((x) => x.t >= w0 && x.t <= B[i].t)
    const live = matrixSignals(b, d, W.filter((w) => w.t + 60000 <= B[i].t + 180000), { from: b.length - 1 }).find((x) => x.i === b.length - 1); if (live && !fullT.has(B[i].t)) extra++ }
  assert.equal(extra, 0, extra + ' live-window signal(s) absent from full history'); assert(checked > 0)
})
await ok('STRUCTURE = SIGNAL: on every sampled signal bar, matrixStructure (the chart checklist) shows ALL conditions of that side met, and the walls equal the signal ctx', async () => {
  const { loadBars } = await import('../src/data/backfillReader.js'); const { loadDxyBars } = await import('../src/data/dxy.js'); const fs = await import('node:fs'); const { matrixStructure } = await import('../src/master/ferrariMatrix.js')
  const from = Date.parse('2026-09-01'), to = Date.parse('2026-09-20')
  const B = (await loadBars('XAUUSD', '3m', { from, to })).bars, D = (await loadDxyBars('3m', { from, to })).bars
  const W = fs.readFileSync(new URL('../data/history/WTI/1m.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => b.t >= from - 7200000 && b.t <= to)
  const sigs = matrixSignals(B, D, W); assert(sigs.length > 0)
  for (const s of sigs.filter((_, k) => k % Math.max(1, Math.floor(sigs.length / 15)) === 0)) {
    const S = matrixStructure(B.slice(0, s.i + 1), D.filter((d) => d.t <= s.t), W.filter((w) => w.t + 60000 <= s.decisionT))
    assert(Object.values(s.side === 'BUY' ? S.buy : S.sell).every((v) => v === true), s.side + ' at ' + new Date(s.t).toISOString() + ' checklist ' + JSON.stringify(s.side === 'BUY' ? S.buy : S.sell))
    assert.equal(S.levels.ceiling, s.ctx.ceiling); assert.equal(S.levels.intWall, s.ctx.intWall); assert.equal(S.levels.cushion, s.ctx.cushion)
  }
})
console.log(process.exitCode ? '✗ FERRARI MATRIX SMOKE FAILED' : `✅ FERRARI MATRIX SMOKE: ${n} passed, 0 failed`)
