// ════════════════════════════════════════════════════════════════════════════════
// study_choch_4h_adx.mjs [XAUUSD|XAGUSD] — the 4H CHoCH that really changes the trend, ADX at it, and the exact entry (spec
// docs/CHOCH_4H_ADX_SPEC.md, written before any number; Ashraf 2026-10-20 "Yes, run it as written"). Rules + trades: scripts/lib/choch4h.mjs.
// Part A: REAL rate by side, by ADX bucket / rising / DI agreement, vs the rest (Holm) and vs random 4H closes in the same trend state (control).
// Part B: K = 36 money cells (E1/E2/E3 × T1/T2/T3 × BUY/SELL × ALL/ADX-gated — the gate chosen on TRAIN only). XAG = replication (report).
// Output: data/master/choch_4h_adx_study[_xag].json (+ trades for the audit).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit, SHORT } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt, loadSpreadTable } from '../src/master/spreadModel.js'
import { wilson, holm, rng, compareRates } from '../src/core/studyStats.js'
import { CH, findChochs, outcome, trade, ADX_RULES, bucketOf } from './lib/choch4h.mjs'

const SYM = process.argv[2] || 'XAUUSD', SH = SYM === 'XAUUSD' ? '' : '_' + SHORT[SYM], K_CELLS = 36, ALPHA = 0.05 / K_CELLS
const SPLIT = Date.parse('2021-07-01T00:00:00Z'), END = Date.parse('2026-10-16T21:00:00Z'), WEEK = 7 * 86400000
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a)
const M = (await clean1m(SYM, { reopenClamp: false })).filter((b) => b.t < END)
const C = kit(SYM, { reopenClamp: false }).build(M, '4H'); markIncomplete(C, findHoles(M))
const spreadAt = SYM === 'XAUUSD' ? makeSpreadAt() : makeSpreadAt({ table: loadSpreadTable(path.join(TURBO.master, 'spread_table_XAGUSD.json')) })
const FROM = M[0].t + 60 * 86400000
const { events, state, A, X } = findChochs(C, M, { from: FROM })
for (const e of events) e.outcome = outcome(C, e.i, e.side, e.close, e.tip, e.atr)
log(SYM, '4H candles', C.length, 'CHoCH', events.length, 'BUY', events.filter((e) => e.side === 'BUY').length, 'SELL', events.filter((e) => e.side === 'SELL').length)

// ── Part A ──
const decided = (E) => E.filter((e) => e.outcome === 'REAL' || e.outcome === 'FAILED'), realRate = (E) => { const d = decided(E), k = d.filter((e) => e.outcome === 'REAL').length; return { n: d.length, real: k, rate: d.length ? +(k / d.length).toFixed(4) : null, lo: d.length ? +wilson(k, d.length).lo.toFixed(4) : null } }
// control: random closes in the same trend state (down for BUY, up for SELL), same year, 3× n; tip = extreme since the last pivot of the trend's side
const r = rng(2026), ctrl = []
for (const side of ['BUY', 'SELL']) { const want = side === 'BUY' ? -1 : 1, byY = {}
  for (let i = 30; i < C.length - 1; i++) if (state[i] === want && !C[i].incomplete && A[i] > 0 && X.adx[i] != null && C[i].t >= FROM) (byY[new Date(C[i].t).getUTCFullYear()] ??= []).push(i)
  for (const e of events.filter((x) => x.side === side)) { const P = byY[new Date(e.t).getUTCFullYear()]; if (!P) continue
    for (let k = 0; k < 3; k++) { const i = P[(r() * P.length) | 0]; let tip = side === 'BUY' ? Infinity : -Infinity; for (let j = Math.max(0, i - 10); j <= i; j++) tip = side === 'BUY' ? Math.min(tip, C[j].l) : Math.max(tip, C[j].h)
      ctrl.push({ side, i, t: C[i].t, adx: X.adx[i], adx3: X.adx[i - 3], pdi: X.plusDI[i], mdi: X.minusDI[i], outcome: outcome(C, i, side, C[i].c, tip, A[i]) }) } } }
const partA = { sides: {} }, rows = []
for (const side of ['BUY', 'SELL']) { const E = events.filter((e) => e.side === side), Cc = ctrl.filter((e) => e.side === side)
  const S = { all: realRate(E), train: realRate(E.filter((e) => e.t < SPLIT)), oos: realRate(E.filter((e) => e.t >= SPLIT)), control: realRate(Cc), undecided: E.filter((e) => e.outcome === 'NONE').length, open: E.filter((e) => e.outcome === 'OPEN').length, by_rule: {} }
  for (const rule of ADX_RULES) { const inR = E.filter(rule.f), outR = E.filter((e) => !rule.f(e)), a = realRate(inR), b = realRate(outR), cmp = compareRates(a.real, a.n, b.real, b.n)
    const row = { key: `${side}|${rule.id}`, side, rule: rule.id, in: a, rest: b, train: realRate(inR.filter((e) => e.t < SPLIT)), oos: realRate(inR.filter((e) => e.t >= SPLIT)), control: realRate(Cc.filter(rule.f)), diff: cmp.diff != null ? +cmp.diff.toFixed(4) : null, p: cmp.p }
    S.by_rule[rule.id] = row; rows.push(row) }
  partA.sides[side] = S }
holm(rows, 0.05)
for (const row of rows) log('A', row.key.padEnd(18), 'REAL', row.in.rate, `(n ${row.in.n})`, 'rest', row.rest.rate, 'train', row.train.rate, 'oos', row.oos.rate, 'control', row.control.rate, 'holm', row.holm_pass)

// ── Part B ──
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
  const how = {}; for (const x of T) how[x.how] = (how[x.how] ?? 0) + 1
  return { n, wr: +(w / n).toFixed(4), wr_lo: +wilson(w, n).lo.toFixed(4), usd: +bs.mean.toFixed(3), usd_lo: +bs.lo.toFixed(3), R: +(T.reduce((s, x) => s + x.r, 0) / n).toFixed(4), years: yrs, years_pos: yrs.length ? +(yrs.filter((y) => y.usd > 0).length / yrs.length).toFixed(3) : null, exits: how } }
const endOf = (i) => (C[i + 1 + CH.HORIZON] ?? C.at(-1)).t, limEnd = (i) => (C[i + 1 + CH.LIMIT_CANDLES] ?? C.at(-1)).t
function runCell(E, kind, target) { const T = []; let busy = -Infinity, skipped = 0
  for (const e of E) { if (e.decisionT <= busy) continue
    const x = trade(M, e, kind, target, spreadAt, endOf(e.i), limEnd(e.i)); if (!x || x.open) continue; if (x.skipped) { skipped++; continue }
    busy = x.exitT; T.push({ ...x, sweep: undefined, i: e.i, t: e.t, side: e.side, tip: e.tip, level: e.level, close: e.close, atr: e.atr, decisionT: e.decisionT, adx: e.adx }) }
  return { T, skipped } }
const TARGETS = [['T1', 'R', 1], ['T2', 'R', 2], ['T3', 'A', 2]], cells = [], tradesOut = {}
for (const side of ['BUY', 'SELL']) for (const kind of ['E1', 'E2', 'E3']) for (const tg of TARGETS) {
  const E = events.filter((e) => e.side === side), all = runCell(E, kind, tg)
  // ADX-gated: the rule with the highest TRAIN $/trade (n ≥ 30), chosen on TRAIN only, then applied once to OOS
  let best = null
  for (const rule of ADX_RULES) { const g = runCell(E.filter(rule.f), kind, tg).T.filter((x) => x.entryT < SPLIT); if (g.length < 30) continue
    const u = g.reduce((s, x) => s + x.pnl, 0) / g.length; if (!best || u > best.u) best = { rule: rule.id, u } }
  const gated = best ? runCell(E.filter(ADX_RULES.find((x) => x.id === best.rule).f), kind, tg) : { T: [], skipped: 0 }
  for (const [arm, R] of [['ALL', all], ['ADX', gated]]) {
    const key = `${side}|${kind}|${tg[0]}|${arm}`, tr = R.T.filter((x) => x.entryT < SPLIT), oo = R.T.filter((x) => x.entryT >= SPLIT)
    const c = { key, side, entry: kind, target: tg[0], arm, adx_rule: arm === 'ADX' ? best?.rule ?? null : null, skipped: R.skipped, TRAIN: summ(tr), OOS: summ(oo) }
    c.checks = { n30: c.OOS.n >= 30, money_oos: c.OOS.n > 0 && c.OOS.usd > 0 && c.OOS.usd_lo > 0, money_train: c.TRAIN.n > 0 && c.TRAIN.usd > 0, years60: (c.OOS.years_pos ?? 0) >= 0.6 }
    c.pass = Object.values(c.checks).every(Boolean); cells.push(c); tradesOut[key] = R.T
    log('B', key.padEnd(18), c.adx_rule ?? '', 'TRAIN', c.TRAIN.n, c.TRAIN.wr, c.TRAIN.usd, '| OOS', c.OOS.n, 'WR', c.OOS.wr, '$', c.OOS.usd, 'lo', c.OOS.usd_lo, 'yrs+', c.OOS.years_pos, c.pass ? 'PASS' : '') } }

const out = { spec: 'docs/CHOCH_4H_ADX_SPEC.md', symbol: SYM, built_at: new Date().toISOString(), data: { from: new Date(M[0].t).toISOString(), to: new Date(M.at(-1).t).toISOString(), split: new Date(SPLIT).toISOString(), candles_4h: C.length },
  events: { n: events.length, by_outcome: Object.fromEntries(['REAL', 'FAILED', 'NONE', 'OPEN'].map((o) => [o, events.filter((e) => e.outcome === o).length])) }, partA, partB: { K: K_CELLS, alpha_per_cell: ALPHA, passes: cells.filter((c) => c.pass).map((c) => c.key), cells } }
fs.writeFileSync(path.join(TURBO.master, `choch_4h_adx_study${SH}.json`), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(TURBO.master, `choch_4h_adx_events${SH}.json`), JSON.stringify(events))
fs.writeFileSync(path.join(TURBO.master, `choch_4h_adx_trades${SH}.json`), JSON.stringify(tradesOut))
log('PASSES', out.partB.passes.length, out.partB.passes)
