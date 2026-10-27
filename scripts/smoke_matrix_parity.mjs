// smoke_matrix_parity.mjs — the SCALP live parity watcher (scripts/lib/matrix_parity.mjs) + its health rule (dataHealth.js check 10). 2026-10-27.
import { classifyParity, liveDiff } from './lib/matrix_parity.mjs'
import { assessHealth } from '../src/core/dataHealth.js'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const T0 = Date.parse('2026-10-27T12:00:00Z'), sig = (k, side = 'BUY') => ({ t: T0 + k * 180000, decisionT: T0 + (k + 1) * 180000, side, entry: 4000 + k })
const yes = { wall: true, wti_not_bullish: true, dxy_not_bullish: true, green_candle: true }
const row = (k, extra = {}) => ({ bar: new Date(T0 + k * 180000).toISOString(), live: true, halted: false, open: false, barPresent: true, buy: { ...yes }, sell: null, wti: { o: 100, c: 100.1, lastMinuteT: T0 }, wtiN: 200, ...extra })
const S = [sig(0), sig(1), sig(2), sig(3), sig(4), sig(5), sig(6), sig(7), sig(8)]
const decisions = new Map([[S[2].t, row(2, { open: true })], [S[4].t, row(4, { live: false, why: 'XAUUSD settled only through …' })], [S[5].t, row(5, { buy: { ...yes, wti_not_bullish: false } })],
  [S[6].t, row(6, { barPresent: false })], [S[8].t, row(8)]])
const runs = new Map([[S[3].decisionT, { exit: 'killed', killed: true, ms: 120000 }], [S[7].decisionT, { exit: 0, ms: 5000 }]])
const R = classifyParity(S, { decisions, opened: new Set([S[0].decisionT]), vetoed: new Set([S[1].decisionT]), runs })
const st = R.map((r) => r.status)
ok(st[0] === 'OPENED', 'a signal the tick opened → OPENED')
ok(st[1] === 'VETOED', 'a signal in matrix_vetoed → VETOED')
ok(st[2] === 'BUSY', 'live tick had a trade open → BUSY (not a problem)')
ok(st[3] === 'TICK_FAILED' && /killed/.test(R[3].reason), 'tick killed at its limit → TICK_FAILED with the kill')
ok(st[4] === 'NOT_LIVE', 'data not live at the decision → NOT_LIVE (the data gate, not a problem)')
ok(st[5] === 'MISSED' && /wti_not_bullish=false/.test(R[5].reason) && /WTI hour o 100 c 100.1/.test(R[5].reason), 'live saw WTI bullish, now not → MISSED with the WTI candle it saw')
ok(st[6] === 'MISSED' && /not in the store/.test(R[6].reason), 'closed bar missing at the decision → MISSED')
ok(st[7] === 'TICK_FAILED' && /no decision record/.test(R[7].reason), 'tick ran but wrote no record → TICK_FAILED')
ok(st[8] === 'MISSED' && /every condition TRUE/.test(R[8].reason), 'live saw every condition true but opened nothing → MISSED')
ok(classifyParity([sig(9)], { busy: [[T0, T0 + 3600000]] })[0].status === 'BUSY', 'no decision row (before the log) but inside a journaled trade → BUSY')
ok(liveDiff('SELL', { sell: { wall: true, wti_bullish: true, dxy_bullish: false, close_below_swing_low: true } }).includes('dxy_bullish=false'), 'SELL checklist read the same way')
// health rule
const now = Date.parse('2026-10-27T15:00:00Z'), base = { now, feeds: null }
const codes = (I) => assessHealth({ ...base, ...I }).issues.map((x) => x.code)
const par = (problems, at = now - 60000) => ({ at: new Date(at).toISOString(), signals: 3, counts: { OPENED: 1, MISSED: problems.length }, problems })
const p1 = { t: now - 3600000, side: 'BUY', entry: 4030, status: 'MISSED', reason: 'live saw wti_not_bullish=false', found: new Date(now - 600000).toISOString() }
ok(codes({ parity: par([p1]) }).includes('MATRIX_PARITY'), 'a MISSED signal found in the last 3 h → MATRIX_PARITY WARN')
ok(assessHealth({ ...base, parity: par([p1]) }).issues.find((x) => x.code === 'MATRIX_PARITY').text.includes('wti_not_bullish=false'), 'the warning carries the measured reason')
ok(!codes({ parity: par([{ ...p1, found: new Date(now - 4 * 3600000).toISOString() }]) }).includes('MATRIX_PARITY'), 'found > 3 h ago → no longer an issue (kept in the ledger)')
ok(!codes({ parity: par([]) }).includes('MATRIX_PARITY') && !codes({ parity: par([]) }).includes('MATRIX_PARITY_STALE'), 'clean parity → no parity issue')
ok(codes({ parity: par([], now - 20 * 60000) }).includes('MATRIX_PARITY_STALE'), 'parity verdict 20 min old → MATRIX_PARITY_STALE')
ok(codes({ parity: par([]), matrixRuns: [{ exit: 0 }, { exit: 'killed', killed: true, at: '2026-10-27T14:03:08Z' }, { exit: 'killed', killed: true, at: '2026-10-27T14:05:08Z' }] }).includes('MATRIX_TICK_FAILED'), 'two killed ticks in a row → MATRIX_TICK_FAILED')
ok(!codes({ parity: par([]), matrixRuns: [{ exit: 'killed', killed: true }, { exit: 0 }] }).includes('MATRIX_TICK_FAILED'), 'one kill then a good run → no issue')
ok(!codes({ now: Date.parse('2026-10-25T12:00:00Z'), parity: par([p1], now - 99 * 3600000) }).some((c) => c.startsWith('MATRIX_')), 'market closed (Sunday) → not judged')
console.log(fail ? `❌ MATRIX PARITY SMOKE: ${pass} passed, ${fail} failed` : `✅ MATRIX PARITY SMOKE: ${pass} passed, 0 failed`)
process.exit(fail ? 1 : 0)
