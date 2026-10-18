// smoke_confirm3m.mjs — the trade simulator of scripts/lib/confirm3m.mjs on hand-built BID minutes: full spread per round trip, stop first when stop and
// target share a minute, R and ATR targets, sells exit at the ASK, time stop at 300 min. (The trigger finder is proved on real data by
// scripts/audit_confirm3m.mjs: independent second finder + causal prefix replay.)
import { simulate, C3M } from './lib/confirm3m.mjs'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const T0 = Date.UTC(2026, 0, 6, 14), MIN = 60000, sp = () => 0.2
const mins = (ed = {}, n = 400) => Array.from({ length: n }, (_, k) => ({ t: T0 + k * MIN, o: 100, h: 100.1, l: 99.9, c: 100, ...(ed[k] ?? {}) }))
const buy = { side: 'BUY', tipPx: 99, atr15: 2, trigT: T0 }, sell = { side: 'SELL', tipPx: 101, atr15: 2, trigT: T0 }
let r = simulate(mins({ 5: { h: 101.5 } }), buy, ['1R', 'R', 1], sp)
ok('BUY: entry = open + full spread (100.2), stop = tip − 0.1 ATR (98.8), R = 1.4, 1R target 101.6 not reached by 101.5', r.entry === 100.2 && Math.abs(r.stop - 98.8) < 1e-9 && Math.abs(r.R - 1.4) < 1e-9 && r.how === 'time', JSON.stringify(r))
r = simulate(mins({ 5: { h: 101.7 } }), buy, ['1R', 'R', 1], sp)
ok('BUY: bid high reaches 101.6 → +1R', r.how === 'target' && Math.abs(r.r - 1) < 1e-9)
r = simulate(mins({ 5: { h: 101.7, l: 98.7 } }), buy, ['1R', 'R', 1], sp)
ok('stop and target in the same minute → STOP first (−1R)', r.how === 'stop' && r.r === -1)
r = simulate(mins({ 7: { l: 96 } }), buy, ['2ATR', 'A', 2], sp)
ok('ATR target 4 away not reached, stop hit → −1R', r.how === 'stop' && r.r === -1)
r = simulate(mins({ 5: { l: 98.5 } }), sell, ['1R', 'R', 1], sp)
ok('SELL: entry at the bid open (100), stop 101.2, target 98.8 needs the ASK (bid low + 0.2) ≤ 98.8 → bid low 98.5 hits', r.entry === 100 && Math.abs(r.stop - 101.2) < 1e-9 && r.how === 'target', JSON.stringify(r))
r = simulate(mins({ 5: { l: 98.65 } }), sell, ['1R', 'R', 1], sp)
ok('SELL: bid low 98.65 → ask 98.85 > 98.8 → target NOT hit', r.how === 'time')
r = simulate(mins({ 5: { h: 101.05 } }), sell, ['1R', 'R', 1], sp)
ok('SELL: stop on the ASK: bid high 101.05 + 0.2 ≥ 101.2 → stopped', r.how === 'stop')
r = simulate(mins(), buy, ['1R', 'R', 1], sp)
ok(`time stop after ${C3M.TIME_MIN} min at the bid close (100 − 100.2 = −0.2 = −0.14R)`, r.how === 'time' && Math.abs(r.pnl + 0.2) < 1e-9 && r.exitT === T0 + (C3M.TIME_MIN - 1) * MIN)
r = simulate(mins({ 0: { o: 98.5, l: 98.4 } }), buy, ['1R', 'R', 1], sp)
ok('entry already beyond the stop → skipped (never a negative R)', r.skipped === 'entry beyond stop', JSON.stringify(r))
console.log(`${fail ? '❌' : '✅'} CONFIRM3M SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
