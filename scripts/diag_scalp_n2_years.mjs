// diag_scalp_n2_years.mjs — DIAGNOSTIC (measures, does not select; 2026-10-24): why v3 N2 "gold-only spike" BUY loses in 2013-21 and wins in 2021-26.
// Per calendar year: n, WR, $/t, the median target ($) and the median spread / target ratio at entry — same entries, exits and live resolver as the study.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { hourAtr, goldOnlySpike } from './lib/scalp_v2.mjs'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), spreadAt = makeSpreadAt()
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1)
const silver1m = (await loadBars('XAGUSD', '1m', { from: FROM - 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null }
const out = { at: new Date().toISOString(), cells: {} }
for (const exit of ['X1', 'X3']) {
  const S = goldOnlySpike(m1, data.B, { exit, silver1m, ha }).filter((s) => s.side === 'BUY')
  const F = (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => S })).fires, Y = {}
  for (const f of F) { const y = new Date(f.t).getUTCFullYear(); (Y[y] ??= []).push(f) }
  out.cells[exit] = Object.fromEntries(Object.entries(Y).map(([y, L]) => [y, { n: L.length, wr: +(L.filter((f) => f.net > 0).length / L.length).toFixed(3), usd: +(L.reduce((s, f) => s + f.net, 0) / L.length).toFixed(3),
    target_med: +med(L.map((f) => f.sig.reward)).toFixed(2), spread_to_target_med: +med(L.map((f) => spreadAt(f.sig.decisionT - 60000) / f.sig.reward)).toFixed(3) }]))
  console.log(exit); for (const [y, r] of Object.entries(out.cells[exit])) console.log(`  ${y}  n ${String(r.n).padStart(4)}  WR ${(100 * r.wr).toFixed(1)} %  $/t ${r.usd >= 0 ? '+' : ''}${r.usd}  target ~$${r.target_med}  spread/target ${r.spread_to_target_med}`) }
fs.writeFileSync(path.join(TURBO.master, 'diag_scalp_n2_years.json'), JSON.stringify(out, null, 1))
