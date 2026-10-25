// robust_scalp_sell_ml.mjs — SCALP_SELL_ML_SPEC ADDENDUM A (written before these numbers, 2026-10-25): robustness of the passing X3 model.
// Same features, labels, walk-forward and seed as study_scalp_sell_ml.mjs (→ the same selected rows; asserted against the study's P1/P2 n), then:
// year-by-year $/t + WR, every spread × 1.5, trades per trading day. READ-ONLY. → data/master/scalp_sell_ml_robust.json
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { hourAtr } from './lib/scalp_v2.mjs'
import { buildFeatures, labelRows, walkForward, sellSig } from './lib/scalp_ml.mjs'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), P1 = Date.parse('2016-01-01T00:00:00Z'), SPLIT = Date.parse('2021-06-30T00:00:00Z')
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], spreadAt = makeSpreadAt(), wide = (t) => 1.5 * spreadAt(t)
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] })
const B = first.B.filter((b) => b.t + 180000 <= TO), D = first.D, m1 = first.m1.filter((b) => b.t + 60000 <= TO), data = { B, D, m1 }
const S1 = (await loadBars('XAGUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const S3 = (await loadBars('XAGUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 180000 <= TO)
const fe = buildFeatures({ B, m1, S1, S3, D, ha: hourAtr(m1), spreadAt }), net = labelRows({ B, m1, fe, exit: 'X3', spreadAt }), wf = walkForward({ fe, net, years: YEARS })
const trade = async (sa) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt: sa, data, signals: () => wf.selected.map((i) => sellSig(B, i, fe.A[i], 'X3', fe.T[i])) })).fires
const st = (F) => { const n = F.length; return { n, wr: n ? +(F.filter((f) => f.net > 0).length / n).toFixed(4) : null, usd: n ? +(F.reduce((a, f) => a + f.net, 0) / n).toFixed(3) : null } }
const base = await trade(spreadAt), stress = await trade(wide)
const study = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), 'utf8')).cells.X3
const p = (F, a, b) => F.filter((f) => f.t >= a && f.t < b), days = (a, b) => new Set(m1.filter((x) => x.t >= a && x.t < b).map((x) => Math.floor(x.t / 86400000))).size
const out = { spec: 'docs/SCALP_SELL_ML_SPEC.md#addendum-a', built_at: new Date().toISOString(),
  same_as_study: st(p(base, P1, SPLIT)).n === study.P1.n && st(p(base, SPLIT, Infinity)).n === study.P2.n,
  years: Object.fromEntries(YEARS.map((y) => [y, st(p(base, Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1)))])),
  spread_x1_5: { P1: st(p(stress, P1, SPLIT)), P2: st(p(stress, SPLIT, Infinity)) },
  per_day: { P1: +(p(base, P1, SPLIT).length / days(P1, SPLIT)).toFixed(2), P2: +(p(base, SPLIT, TO).length / days(SPLIT, TO)).toFixed(2) } }
const yrs = Object.values(out.years).filter((y) => y.n)
out.checks = { years_9_of_11_positive: yrs.filter((y) => y.usd > 0).length >= 9, no_year_below_minus_1: yrs.every((y) => y.usd >= -1), spread_x1_5_P1_positive: out.spread_x1_5.P1.usd > 0, spread_x1_5_P2_positive: out.spread_x1_5.P2.usd > 0 }
out.pass = out.same_as_study && Object.values(out.checks).every(Boolean)
fs.writeFileSync(path.join(TURBO.master, 'scalp_sell_ml_robust.json'), JSON.stringify(out, null, 1))
console.log('same rows as the study:', out.same_as_study); for (const [y, r] of Object.entries(out.years)) console.log(`  ${y}  n ${String(r.n).padStart(4)}  WR ${r.wr == null ? '—' : (100 * r.wr).toFixed(1) + ' %'}  $/t ${r.usd}`)
console.log('spread x1.5', JSON.stringify(out.spread_x1_5), '| per day', JSON.stringify(out.per_day), '| checks', JSON.stringify(out.checks), '| ROBUST PASS', out.pass)
