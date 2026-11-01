// study_matrix_nowall_sell.mjs — the Matrix 3m SELL WITHOUT the ceiling-wall rule (continuation SELL in a slide), spec docs/MATRIX_NOWALL_SELL_SPEC.md
// (pre-registered 2026-11-01 before any number; Ashraf: "this big drop we never ever fired a trade … we are missing something in our … conditions").
// Origin: MASTER §7 (fn) — on 2026-10-30 the SELL conditions held on 35 bars and only the wall blocked them. READ-ONLY research: nothing live is touched.
// Money = resolveMatrixTrade via scripts/lib/matrix_trades.mjs (same sequencing / spread / stop-first as every Matrix study). → data/master/matrix_nowall_sell_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades, wti1m } from './lib/matrix_trades.mjs'
import { makeAligned } from './lib/matrix_aligned.mjs'
import { MATRIX } from '../src/master/ferrariMatrix.js'
import { makeNowall } from './lib/matrix_nowall.mjs'
import { tradingDate } from '../src/core/nyCandles.js'
import { blockBootstrapMean } from '../src/core/studyStats.js'

const TO = Date.parse('2026-10-30T21:00:00Z'), spreadAt = makeSpreadAt(), K = 4, LEVEL = 1 - (2 * 0.05) / K   // one-sided α/K lower bound
const FRI = [Date.parse('2026-10-29T21:00:00Z'), TO]
const WINDOWS = { PRIMARY: { from: Date.parse('2024-10-10T00:00:00Z'), wti: true, split: Date.parse('2025-12-26T03:00:00Z'), cells: { NW: false, 'NW-1H': true } },
  ROBUST_13Y: { from: Date.parse('2013-07-21T00:00:00Z'), wti: false, split: Date.parse('2021-06-30T12:36:00Z'), cells: { NW13: false, 'NW13-1H': true } } }
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), KT = kit('XAUUSD', { reopenClamp: false })
const { stateAt } = makeAligned(M, KT)
const WT = wti1m(TO)
const audit = { lookahead_violations: 0 }

// ONE place for the rule (spec §1, moved 2026-11-01 to scripts/lib/matrix_nowall.mjs): wti = WTI hour bullish; struct = 1H DOWN; mode 'choch' = control
const nwSignals = makeNowall({ stateAt, WT, audit })

const stat = (F, days) => { const n = F.length, s = F.reduce((a, f) => a + f.net, 0), oc = {}; for (const f of F) oc[f.outcome] = (oc[f.outcome] || 0) + 1
  return { n, wr: n ? +(F.filter((f) => f.net > 0).length / n).toFixed(3) : null, usd: n ? +(s / n).toFixed(3) : null, total: +s.toFixed(1), per_day: days ? +(n / days).toFixed(2) : null, outcomes: oc } }
const lb = (F) => (F.length ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null)
const out = { spec: 'docs/MATRIX_NOWALL_SELL_SPEC.md', built_at: new Date().toISOString(), tape_to: new Date(TO).toISOString(), K, windows: {}, audits: audit }

for (const [wname, W] of Object.entries(WINDOWS)) {
  const first = await matrixTrades({ from: W.from, to: TO, useWti: false, spreadAt, signals: nwSignals({ wti: W.wti, struct: false, mode: 'choch' }) })
  const data = { B: first.B, D: first.D, m1: first.m1 }
  // trading days in the window + NY-session day change (big DOWN / UP days = bottom / top 20 %)
  const day = new Map(); for (const b of data.m1) { if (b.t < W.from) continue; const d = tradingDate(b.t); const x = day.get(d); if (!x) day.set(d, { o: b.o, c: b.c }); else x.c = b.c }
  const chg = [...day].map(([d, x]) => [d, x.c - x.o]).sort((a, b) => a[1] - b[1]), q = Math.floor(chg.length * 0.2)
  const downD = new Set(chg.slice(0, q).map((x) => x[0])), upD = new Set(chg.slice(-q).map((x) => x[0])), nDays = day.size
  const arms = [['TRAIN', (t) => t < W.split], ['OOS', (t) => t >= W.split], ['ALL', () => true]]
  const daysIn = (ok) => [...day.keys()].filter((d) => ok(d + 12 * 3600000)).length
  const summarize = (F) => { const r = {}
    for (const [a, ok] of arms) { const G = F.filter((f) => ok(f.t)); r[a] = { ...stat(G, daysIn(ok)), lb: lb(G) } }
    const years = {}; for (const f of F) { const y = new Date(f.t).getUTCFullYear(); (years[y] ??= []).push(f) }
    r.per_year = Object.fromEntries(Object.entries(years).map(([y, G]) => [y, stat(G)]))
    r.big_down_days = stat(F.filter((f) => downD.has(tradingDate(f.t)))); r.big_up_days = stat(F.filter((f) => upD.has(tradingDate(f.t))))
    r.friday_2026_10_30 = F.filter((f) => f.t >= FRI[0] && f.t < FRI[1]).map((f) => ({ t: new Date(f.t).toISOString(), entry: f.sig.entry, sl: +f.sig.sl.toFixed(2), tp1: +f.sig.tp1.toFixed(2), outcome: f.raw, net: +f.net.toFixed(2) }))
    return r }
  const res = { split: new Date(W.split).toISOString(), days: nDays, control_choch: summarize(first.fires), cells: {} }
  for (const [cell, struct] of Object.entries(W.cells)) {
    const F = (await matrixTrades({ from: W.from, to: TO, useWti: false, spreadAt, data, signals: nwSignals({ wti: W.wti, struct }) })).fires
    res.cells[cell] = summarize(F); console.log(wname, cell, JSON.stringify({ TRAIN: res.cells[cell].TRAIN, OOS: res.cells[cell].OOS, ALL: res.cells[cell].ALL }))
    if (cell === 'NW') { // audit 3: determinism
      const G = (await matrixTrades({ from: W.from, to: TO, useWti: false, spreadAt, data, signals: nwSignals({ wti: W.wti, struct }) })).fires
      audit.deterministic = F.map((f) => `${f.t}|${f.net}`).join(',') === G.map((f) => `${f.t}|${f.net}`).join(',')
      // audit 1: parity of the NW condition bars on 2026-10-30 with the live decision log
      const S = nwSignals({ wti: true, struct: false })(data.B, data.D, data.B.findIndex((b) => b.t >= FRI[0])).filter((s) => s.t < FRI[1] - MATRIX.tfMs)
      const live = fs.readFileSync(path.join(TURBO.paper, 'matrix_decisions.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
        .filter((r) => r.sell && r.sell.wti_bullish && r.sell.dxy_bullish && r.sell.close_below_swing_low && Date.parse(r.bar) >= FRI[0] && Date.parse(r.bar) < FRI[1]).map((r) => r.bar)
      const mine = S.map((s) => new Date(s.t).toISOString()), L = new Set(live), Mi = new Set(mine)
      audit.friday_parity = { live_bars: L.size, study_bars: Mi.size, only_live: [...L].filter((x) => !Mi.has(x)), only_study: [...Mi].filter((x) => !L.has(x)) }
      console.log('PARITY', JSON.stringify(audit.friday_parity), 'DETERMINISTIC', audit.deterministic)
    }
  }
  console.log(wname, 'control_choch', JSON.stringify({ TRAIN: res.control_choch.TRAIN, OOS: res.control_choch.OOS }))
  out.windows[wname] = res
}
// pass rule (spec §4)
const P = out.windows.PRIMARY, R = out.windows.ROBUST_13Y, pair = { NW: 'NW13', 'NW-1H': 'NW13-1H' }
for (const [wname, W] of Object.entries(out.windows)) for (const [cell, c] of Object.entries(W.cells)) {
  const k = { train_pos: c.TRAIN.usd > 0, oos_pos: c.OOS.usd > 0, train_lb_pos: c.TRAIN.lb > 0, oos_lb_pos: c.OOS.lb > 0, oos_n30: c.OOS.n >= 30,
    beats_control_train: c.TRAIN.usd > W.control_choch.TRAIN.usd, beats_control_oos: c.OOS.usd > W.control_choch.OOS.usd }
  if (wname === 'PRIMARY') k.robust13y_all_pos = R.cells[pair[cell]].ALL.usd > 0
  c.checks = k; c.pass = Object.values(k).every(Boolean) }
out.passes = Object.entries(out.windows).flatMap(([w, W]) => Object.entries(W.cells).filter(([, c]) => c.pass).map(([c]) => `${w}:${c}`))
fs.writeFileSync(path.join(TURBO.master, 'matrix_nowall_sell_study.json'), JSON.stringify(out, null, 1))
console.log('AUDITS', JSON.stringify(audit), '| PASSES', JSON.stringify(out.passes))
