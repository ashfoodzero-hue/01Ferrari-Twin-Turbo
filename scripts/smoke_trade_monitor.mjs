// smoke_trade_monitor.mjs — the IN-TRADE MONITOR (src/master/tradeMonitor.js liveMonitor + study_trade_monitor.mjs): the position formula,
// the phase from the backtest's own resolver, a REAL trade replayed live, and the study's verdicts.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { liveMonitor } from '../src/master/tradeMonitor.js'
import { resolveMatrixTrade } from '../src/master/ferrariMatrix.js'
import { loadBars } from '../src/data/backfillReader.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), J = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8'))
console.log('\n██ IN-TRADE MONITOR SMOKE ██')
const sig = { side: 'BUY', entry: 100, sl: 98, tp1: 104, tp2: 106, risk: 2, decisionT: 0, atr: 1 }
await ok('position formula: phase 1 = (bid − SL)/(TP1 − SL); phase 2 = (bid − fill)/(TP2 − fill); a SELL reads the ASK', () => {
  const a = liveMonitor({ sig, m1: [], quote: { bid: 101, ask: 101.5 }, spreadAt: () => 0.5, study: null, now: 60000, resolve: () => ({ done: false, tp1Hit: false, fill: 100.5 }) })
  assert.equal(a.phase, 1); assert.equal(a.p_tp1, 0.5); assert.equal(a.p_tp2_after_tp1, +((104 - 100.5) / (106 - 100.5)).toFixed(3))
  const b = liveMonitor({ sig, m1: [], quote: { bid: 103, ask: 103.5 }, spreadAt: () => 0.5, study: null, now: 60000, resolve: () => ({ done: false, tp1Hit: true, fill: 100.5 }) })
  assert.equal(b.phase, 2); assert.equal(b.p_tp2, +((103 - 100.5) / 5.5).toFixed(3))
  const s = liveMonitor({ sig: { side: 'SELL', entry: 100, sl: 102, tp1: 96, tp2: 94, risk: 2, decisionT: 0 }, m1: [], quote: { bid: 98.5, ask: 99 }, spreadAt: () => 0.5, study: null, now: 60000, resolve: () => ({ done: false, tp1Hit: false, fill: 100 }) })
  assert.equal(s.p_tp1, +((102 - 99) / 6).toFixed(3))
})
await ok('REAL trade (2026-10-09 11:18 BUY 4180.82): open and measured at 11:40; finished (SL) on the full path — via the backtest resolver', async () => {
  const row = fs.readFileSync(path.join(root, 'data', 'paper', 'matrix_trades.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).find((r) => r.id === 'MATRIX@1791544680000' && r.status === 'OPENED')
  const m1 = (await loadBars('XAUUSD', '1m', { from: row.sig.decisionT - 60000, to: row.sig.decisionT + 3 * 3600000 })).bars, sp = makeSpreadAt()
  const T = Date.parse('2026-10-09T11:40:00Z'), part = m1.filter((b) => b.t + 60000 <= T), last = part.at(-1)
  const a = liveMonitor({ sig: row.sig, m1: part, quote: { bid: last.c, ask: last.c + 0.4 }, spreadAt: sp, study: null, now: T, resolve: resolveMatrixTrade })
  assert(a.open && !a.done && a.phase === 1); assert(Math.abs(a.p_tp1 - (last.c - row.sig.sl) / (row.sig.tp1 - row.sig.sl)) < 0.001)
  const z = liveMonitor({ sig: row.sig, m1, quote: { bid: m1.at(-1).c, ask: m1.at(-1).c + 0.4 }, spreadAt: sp, study: null, now: row.sig.decisionT + 3 * 3600000, resolve: resolveMatrixTrade })
  assert(z.done && z.outcome === 'SL', JSON.stringify(z))
})
await ok('study: verdicts follow the pre-registered rules; the shown formula is calibrated within 0.08 on BOTH OOS arms and phases', () => {
  const S = J('data', 'master', 'trade_monitor_study.json')
  for (const ph of ['1', '2']) { const P = S.phases[ph]; for (const a of ['oos_A13', 'oos_W2']) { const r = P[a]
      assert.equal(r.valid, r.brier_model < r.brier_random_walk && r.brier_model < r.brier_constant && r.calibrated)
      for (const d of r.coin_flip_calibration.filter((x) => x.n >= 200)) assert(Math.abs(d.predicted - d.observed) <= 0.08, `phase ${ph} ${a} ${d.bin}`) }
    assert.equal(P.valid, P.oos_A13.valid && P.oos_W2.valid) }
  assert.equal(S.close_advice.shown, S.close_advice.oos_A13_lb > 0 && S.close_advice.oos_W2_gain > 0)
})
console.log(process.exitCode ? '✗ IN-TRADE MONITOR SMOKE FAILED' : `✅ IN-TRADE MONITOR SMOKE: ${n} passed, 0 failed`)
