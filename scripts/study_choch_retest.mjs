// ════════════════════════════════════════════════════════════════════════════════
// study_choch_retest.mjs [XAUUSD|XAGUSD] — CHOCH_4H_ADX_SPEC ADDENDUM B (written before its numbers; Ashraf 2026-10-20): a 4H CHoCH that broke an S/R
// level (4H / 1D, srLevels.js), the retest of that level without trading through the order block, a clear confirmation candle, ADX before vs after.
// K = 18 (G0/G1/G2 × T1/T2/T3 × BUY/SELL). Setups: scripts/lib/choch4h.mjs retestSetups; trades: choch4h.trade (E1 at the minute after the confirmation,
// stop OB extreme ∓ 0.1 ATR). Output: data/master/choch_retest_study[_xag].json (+ trades for the audit).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit, SHORT } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt, loadSpreadTable } from '../src/master/spreadModel.js'
import { swingLevels, evaluateLevel } from '../src/master/srLevels.js'
import { wilson, rng } from '../src/core/studyStats.js'
import { CH, findChochs, retestSetups, obChochSetups, trade } from './lib/choch4h.mjs'

const SYM = process.argv[2] || 'XAUUSD', SH = SYM === 'XAUUSD' ? '' : '_' + SHORT[SYM], K_CELLS = 18, ALPHA = 0.05 / K_CELLS
const SPLIT = Date.parse('2021-07-01T00:00:00Z'), END = Date.parse('2026-10-16T21:00:00Z'), WEEK = 7 * 86400000
const M = (await clean1m(SYM, { reopenClamp: false })).filter((b) => b.t < END), holes = findHoles(M), K = kit(SYM, { reopenClamp: false })
const build = (tf) => { const c = K.build(M, tf); markIncomplete(c, holes); return c }
const C = build('4H'), spreadAt = SYM === 'XAUUSD' ? makeSpreadAt() : makeSpreadAt({ table: loadSpreadTable(path.join(TURBO.master, 'spread_table_XAGUSD.json')) })
const levels = []
for (const tf of ['4H', '1D']) { const Ct = tf === '4H' ? C : build(tf), At = atrArr(Ct, 14), br = new Set(Ct.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0))
  for (const lv of swingLevels(Ct, br)) { const e = evaluateLevel(Ct, At, lv); levels.push({ tf, px: lv.px, side0: lv.side, bornT: Ct[lv.birth].close_t, flipT: e.flips.length ? Ct[e.flips[0]].close_t : Infinity }) } }
const { events, A, X } = findChochs(C, M, { from: M[0].t + 60 * 86400000 })
// --structure = ADDENDUM C (the CHoCH's own broken level) · --long = D (long-swing exits) · --ob = E (retest into the OB, first 15m CHoCH inside it)
const OBM = process.argv.includes('--ob'), STRUCT = process.argv.includes('--structure'), TAG = (OBM ? '_ob' : STRUCT ? '_struct' : '') + (process.argv.includes('--long') ? '_long' : '')
const { setups, funnel } = OBM ? obChochSetups(C, A, X, events, build('15m'), M) : retestSetups(C, A, X, events, STRUCT ? 'structure' : levels, M)
console.log(SYM, 'levels', levels.length, 'funnel', JSON.stringify(funnel), 'G1', setups.filter((x) => x.g1).length, 'G2', setups.filter((x) => x.g2).length)

function bootOneSided(items, { B = 10000, seed = 11 } = {}) {
  if (!items.length) return { mean: null, lo: null }
  const g = new Map(); for (const it of items) { const k = Math.floor(it.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(it.x) }
  const blocks = [...g.values()], rr = rng(seed), v = new Float64Array(B)
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let k = 0; k < blocks.length; k++) for (const x of blocks[(rr() * blocks.length) | 0]) { s += x; n++ } v[b] = n ? s / n : 0 }
  v.sort(); return { mean: items.reduce((s, it) => s + it.x, 0) / items.length, lo: v[Math.floor(ALPHA * B)] }
}
function summ(T) { const n = T.length; if (!n) return { n: 0 }
  const w = T.filter((x) => x.pnl > 0).length, bs = bootOneSided(T.map((x) => ({ t: x.entryT, x: x.pnl }))), byY = {}
  for (const x of T) (byY[new Date(x.entryT).getUTCFullYear()] ??= []).push(x.pnl)
  const yrs = Object.entries(byY).filter(([, v]) => v.length >= 5).map(([y, v]) => ({ y: +y, n: v.length, usd: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) }))
  return { n, wr: +(w / n).toFixed(4), wr_lo: +wilson(w, n).lo.toFixed(4), usd: +bs.mean.toFixed(3), usd_lo: +bs.lo.toFixed(3), R: +(T.reduce((s, x) => s + x.r, 0) / n).toFixed(4), years: yrs, years_pos: yrs.length ? +(yrs.filter((y) => y.usd > 0).length / yrs.length).toFixed(3) : null } }
// --long (ADDENDUM D, Ashraf "long swing trades only, not scalp"): exits X1 3R · X2 5R · X3 hold to the OPPOSITE 4H CHoCH; cap 120 candles
const LONG = process.argv.includes('--long'), CAP = LONG ? 120 : CH.HORIZON
const endOf = (i) => (C[i + 1 + CAP] ?? C.at(-1)).t
const opp = (x) => { const o = events.find((e) => e.side !== x.side && e.decisionT > x.decisionT); return o ? o.decisionT + 60000 : Infinity }
const TGTS = LONG ? [['X1', 'R', 3], ['X2', 'R', 5], ['X3', 'R', 1e9]] : [['T1', 'R', 1], ['T2', 'R', 2], ['T3', 'A', 2]]
const cells = [], tradesOut = {}
for (const side of ['BUY', 'SELL']) for (const [gate, f] of [['G0', () => true], ['G1', (x) => x.g1], ['G2', (x) => x.g2]]) for (const tg of TGTS) {
  const S = setups.filter((x) => x.side === side && f(x)), T = []; let busy = -Infinity, skipped = 0
  for (const x of S) { if (x.decisionT <= busy) continue; const r = trade(M, x, 'E1', tg, spreadAt, tg[0] === 'X3' ? Math.min(endOf(x.confI), opp(x)) : endOf(x.confI), 0); if (!r || r.open) continue; if (r.skipped) { skipped++; continue }
    busy = r.exitT; T.push({ ...r, t: x.t, confT: x.confT, side, v: x.v, ob: x.ob, atr: x.atr, decisionT: x.decisionT }) }
  const key = `${side}|${gate}|${tg[0]}`, c = { key, side, gate, target: tg[0], setups: S.length, skipped, TRAIN: summ(T.filter((x) => x.entryT < SPLIT)), OOS: summ(T.filter((x) => x.entryT >= SPLIT)), ALL: summ(T) }
  c.checks = { n30: c.OOS.n >= 30, money_oos: c.OOS.n > 0 && c.OOS.usd > 0 && c.OOS.usd_lo > 0, money_train: c.TRAIN.n > 0 && c.TRAIN.usd > 0, years60: (c.OOS.years_pos ?? 0) >= 0.6 }
  c.pass = Object.values(c.checks).every(Boolean); cells.push(c); tradesOut[key] = T
  console.log(key.padEnd(14), 'setups', S.length, '| TRAIN', c.TRAIN.n, c.TRAIN.wr, c.TRAIN.usd, '| OOS', c.OOS.n, 'WR', c.OOS.wr, 'lo', c.OOS.wr_lo, '$', c.OOS.usd, 'lo', c.OOS.usd_lo, '| all', c.ALL.n, 'WR', c.ALL.wr, '$', c.ALL.usd, c.pass ? 'PASS' : '') }
const out = { spec: 'docs/CHOCH_4H_ADX_SPEC.md ADDENDUM ' + (OBM ? 'E' : STRUCT ? 'C' : 'B') + (LONG ? ' + D (long-swing exits)' : ''), symbol: SYM, built_at: new Date().toISOString(), split: new Date(SPLIT).toISOString(), funnel, K: K_CELLS, alpha_per_cell: ALPHA, passes: cells.filter((c) => c.pass).map((c) => c.key), cells }
fs.writeFileSync(path.join(TURBO.master, `choch_retest${TAG}_study${SH}.json`), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(TURBO.master, `choch_retest${TAG}_trades${SH}.json`), JSON.stringify({ trades: tradesOut, setups }))
console.log('PASSES', out.passes.length, out.passes)
