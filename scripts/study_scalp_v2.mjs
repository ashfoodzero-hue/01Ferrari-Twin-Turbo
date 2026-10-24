// study_scalp_v2.mjs — SCALP_ENTRY_V2_SPEC (written before any number, 2026-10-23; Ashraf: "Search a different SCALP entry (not the Matrix walls) for 92% WR
// with profit on both BUY and SELL, pre-registered the same way. Try again."). F1 spike fade (k 3 / 5) + F2 1H sweep & reclaim, BUY and SELL, exits X1-X3,
// K = 18, each against a random-entry control (same side, same UTC hours, same count, same exit). READ-ONLY research. → data/master/scalp_v2_study.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { ENTRIES, EXITS, hourAtr } from './lib/scalp_v2.mjs'
import { blockBootstrapMean, wilson, rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), SPLIT = Date.parse('2021-06-30T12:36:00Z'), LAST2Y = Date.parse('2024-10-22T00:00:00Z')
const K = 18, LEVEL = 1 - (2 * 0.05) / K, spreadAt = makeSpreadAt(), R = rng(2310)
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1)
console.log(`tape: ${m1.length} 1m bars, ${data.B.length} 3m bars, ${ha.H.length} hours`)
const stat = (F) => { const n = F.length, w = F.filter((f) => f.net > 0).length, s = F.reduce((a, f) => a + f.net, 0)
  return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: n ? +wilson(w, n).lo.toFixed(4) : null, usd: n ? +(s / n).toFixed(3) : null,
    lb: n ? +(blockBootstrapMean(F.map((f) => ({ t: f.t, x: f.net })), { level: LEVEL }).lo ?? NaN).toFixed(3) : null } }
const halves = (F) => ({ TRAIN: stat(F.filter((f) => f.t < SPLIT)), OOS: stat(F.filter((f) => f.t >= SPLIT)), LAST2Y: stat(F.filter((f) => f.t >= LAST2Y)) })
const price = async (sigs) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => sigs })).fires
// random control: same side, same UTC hour, same half (era), same count, same exit — what any entry gets from the exit geometry alone
const byHourHalf = new Map(); m1.forEach((b, j) => { const k = `${new Date(b.t).getUTCHours()}|${b.t < SPLIT ? 0 : 1}`; if (!byHourHalf.has(k)) byHourHalf.set(k, []); byHourHalf.get(k).push(j) })
function control(sigs, exit) { const x = EXITS[exit]; return sigs.map((s) => { const L = byHourHalf.get(`${new Date(s.t).getUTCHours()}|${s.t < SPLIT ? 0 : 1}`), b = m1[L[Math.floor(R() * L.length)]]
  const h = ha.at(b.t + 60000); if (!h) return null; const up = s.side === 'BUY', e = b.c
  return { ...s, t: b.t, decisionT: b.t + 60000, entry: e, sl: up ? e - x.stop * h.A : e + x.stop * h.A, tp1: up ? e + x.tgt * h.A : e - x.tgt * h.A, tp2: up ? e + x.tgt * h.A : e - x.tgt * h.A, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { control: true } } })
  .filter(Boolean).sort((a, b) => a.decisionT - b.decisionT) }

const out = { spec: 'docs/SCALP_ENTRY_V2_SPEC.md', built_at: new Date().toISOString(), tape: [new Date(FROM).toISOString(), new Date(TO).toISOString()], split: new Date(SPLIT).toISOString(), K, cells: {} }
for (const [ent, gen] of Object.entries(ENTRIES)) for (const exit of Object.keys(EXITS)) {
  const all = gen(m1, data.B, { exit, ha })
  for (const side of ['BUY', 'SELL']) { const S = all.filter((s) => s.side === side), F = await price(S), C = await price(control(S, exit)), c = { entry: ent, side, exit, signals: S.length, ...halves(F), control: halves(C) }
    c.checks = { train_wr92: c.TRAIN.wr >= 0.92 && c.TRAIN.wr_lb >= 0.88, oos_wr92: c.OOS.wr >= 0.92 && c.OOS.wr_lb >= 0.88, train_money: c.TRAIN.usd > 0 && c.TRAIN.lb > 0,
      oos_money: c.OOS.usd > 0 && c.OOS.lb > 0, beats_control_train: c.TRAIN.usd > c.control.TRAIN.usd, beats_control_oos: c.OOS.usd > c.control.OOS.usd, oos_n30: c.OOS.n >= 30, last2y_money: c.LAST2Y.usd > 0 }
    c.pass = Object.values(c.checks).every(Boolean); c.missed = Object.entries(c.checks).filter(([, v]) => !v).map(([k]) => k)
    out.cells[`${ent}|${side}|${exit}`] = c
    console.log(`${ent} ${side} ${exit}: sig ${S.length} · TRAIN ${JSON.stringify(c.TRAIN)} · OOS ${JSON.stringify(c.OOS)} · 2y ${c.LAST2Y.usd} · ctrl OOS ${c.control.OOS.wr}/${c.control.OOS.usd} · ${c.pass ? 'PASS' : 'fail'}`) } }
const C = Object.entries(out.cells)
out.passes = { BUY: C.filter(([, c]) => c.side === 'BUY' && c.pass).map(([k]) => k), SELL: C.filter(([, c]) => c.side === 'SELL' && c.pass).map(([k]) => k) }
for (const side of ['BUY', 'SELL']) out[`closest_${side}`] = C.filter(([, c]) => c.side === side).sort((a, b) => a[1].missed.length - b[1].missed.length || b[1].OOS.usd - a[1].OOS.usd).slice(0, 4).map(([k, c]) => ({ cell: k, missed: c.missed, TRAIN: c.TRAIN, OOS: c.OOS, LAST2Y: c.LAST2Y }))
fs.writeFileSync(path.join(TURBO.master, 'scalp_v2_study.json'), JSON.stringify(out, null, 1))
console.log('PASSES', JSON.stringify(out.passes))
