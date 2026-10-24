// study_scalp_v3.mjs — SCALP_ENTRY_V3_SPEC (written before any v3 number, 2026-10-24; Ashraf: "Try again"). P1 / P2 = POST-HOC (built from v2 — at best a
// forward-test candidate), N1 two-bar exhaustion + N2 gold-only spike = NEW, both sides. K = 10. Harness identical to study_scalp_v2.mjs (same tape, split,
// stats, live resolver via matrix_trades.mjs, random control). READ-ONLY research. → data/master/scalp_v3_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { EXITS, hourAtr, costFloorBuy, confirmBuy, twoBarExhaustion, goldOnlySpike } from './lib/scalp_v2.mjs'
import { blockBootstrapMean, wilson, rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), SPLIT = Date.parse('2021-06-30T12:36:00Z'), LAST2Y = Date.parse('2024-10-22T00:00:00Z')
const K = 10, LEVEL = 1 - (2 * 0.05) / K, spreadAt = makeSpreadAt(), R = rng(2410)
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1)
const silver1m = (await loadBars('XAGUSD', '1m', { from: FROM - 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
console.log(`tape: gold ${m1.length} 1m, silver ${silver1m.length} 1m`)
const stat = (F) => { const n = F.length, w = F.filter((f) => f.net > 0).length, s = F.reduce((a, f) => a + f.net, 0)
  return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilson(w, n).lo.toFixed(4) : null, usd: n ? +(s / n).toFixed(3) : null,
    lb: n ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null } }
const halves = (F) => ({ TRAIN: stat(F.filter((f) => f.t < SPLIT)), OOS: stat(F.filter((f) => f.t >= SPLIT)), LAST2Y: stat(F.filter((f) => f.t >= LAST2Y)) })
const price = async (sigs) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => sigs })).fires
const byHourHalf = new Map(); m1.forEach((b, j) => { const k = `${new Date(b.t).getUTCHours()}|${b.t < SPLIT ? 0 : 1}`; if (!byHourHalf.has(k)) byHourHalf.set(k, []); byHourHalf.get(k).push(j) })
function control(sigs, exit) { const x = EXITS[exit]; return sigs.map((s) => { const L = byHourHalf.get(`${new Date(s.t).getUTCHours()}|${s.t < SPLIT ? 0 : 1}`), b = m1[L[Math.floor(R() * L.length)]]
  const h = ha.at(b.t + 60000); if (!h) return null; const up = s.side === 'BUY', e = b.c
  return { ...s, t: b.t, decisionT: b.t + 60000, entry: e, sl: up ? e - x.stop * h.A : e + x.stop * h.A, tp1: up ? e + x.tgt * h.A : e - x.tgt * h.A, tp2: up ? e + x.tgt * h.A : e - x.tgt * h.A, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { control: true } } })
  .filter(Boolean).sort((a, b) => a.decisionT - b.decisionT) }

const CELLS = [ ['P1', 'BUY', 'X3', true, (x) => costFloorBuy(m1, data.B, { exit: x, spreadAt, ha })], ['P2', 'BUY', 'X3', true, (x) => confirmBuy(m1, data.B, { exit: x, ha })] ]
for (const side of ['BUY', 'SELL']) for (const x of ['X1', 'X3']) { CELLS.push(['N1', side, x, false, (e) => twoBarExhaustion(m1, data.B, { exit: e, ha })]); CELLS.push(['N2', side, x, false, (e) => goldOnlySpike(m1, data.B, { exit: e, silver1m, ha })]) }
const out = { spec: 'docs/SCALP_ENTRY_V3_SPEC.md', built_at: new Date().toISOString(), tape: [new Date(FROM).toISOString(), new Date(TO).toISOString()], split: new Date(SPLIT).toISOString(), K, cells: {} }
for (const [ent, side, exit, posthoc, gen] of CELLS) {
  const S = gen(exit).filter((s) => s.side === side), F = await price(S), C = await price(control(S, exit)), c = { entry: ent, side, exit, posthoc, signals: S.length, ...halves(F), control: halves(C) }
  c.checks = { train_wr92: c.TRAIN.wr >= 0.92 && c.TRAIN.wr_lb >= 0.88, oos_wr92: c.OOS.wr >= 0.92 && c.OOS.wr_lb >= 0.88, train_money: c.TRAIN.usd > 0 && c.TRAIN.lb > 0,
    oos_money: c.OOS.usd > 0 && c.OOS.lb > 0, beats_control_train: c.TRAIN.usd > c.control.TRAIN.usd, beats_control_oos: c.OOS.usd > c.control.OOS.usd, oos_n30: c.OOS.n >= 30, last2y_money: c.LAST2Y.usd > 0 }
  const all = Object.values(c.checks).every(Boolean); c.verdict = !all ? 'fail' : posthoc ? 'FORWARD-TEST CANDIDATE (post-hoc)' : 'PASS'
  c.missed = Object.entries(c.checks).filter(([, v]) => !v).map(([k]) => k); out.cells[`${ent}|${side}|${exit}`] = c
  console.log(`${ent} ${side} ${exit}${posthoc ? ' (post-hoc)' : ''}: sig ${S.length} · TRAIN ${JSON.stringify(c.TRAIN)} · OOS ${JSON.stringify(c.OOS)} · 2y ${c.LAST2Y.usd} · ctrl TRAIN ${c.control.TRAIN.usd} OOS ${c.control.OOS.usd} · ${c.verdict}`) }
const C = Object.entries(out.cells)
out.passes = { BUY: C.filter(([, c]) => c.side === 'BUY' && c.verdict === 'PASS').map(([k]) => k), SELL: C.filter(([, c]) => c.side === 'SELL' && c.verdict === 'PASS').map(([k]) => k) }
out.forward_candidates = C.filter(([, c]) => c.verdict.startsWith('FORWARD')).map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'scalp_v3_study.json'), JSON.stringify(out, null, 1))
console.log('PASSES', JSON.stringify(out.passes), '| FORWARD CANDIDATES', JSON.stringify(out.forward_candidates))
