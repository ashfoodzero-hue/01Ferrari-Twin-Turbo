// freeze_ml_sell.mjs — freezes the LIVE paper model of the ML SELL scalp (Ashraf 2026-10-25: "build the live PAPER forward test of the ML SELL X3 model
// (same feature code, scored like the other paper books, chart box SELL only, no Telegram trade alerts yet)"). The live model for year Y is EXACTLY the
// walk-forward model measured for Y (fit < Y−1, threshold on Y−1; SCALP_SELL_ML_SPEC): re-run the walk-forward with the same seed, capture year Y,
// and require its 2026 selection to equal the study's (row count). Writes data/scalp_ml/ml_sell_x3_<Y>.json (model, bin edges, threshold, features,
// the measured backtest of that year, and the selected decision times + scores for the parity smoke). Re-run each January for the new year.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { hourAtr } from './lib/scalp_v2.mjs'
import { FEATURES, buildFeatures, labelRows, walkForward } from './lib/scalp_ml.mjs'

const Y = +(process.argv.find((a) => a.startsWith('--year='))?.slice(7) || new Date().getUTCFullYear())
const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), spreadAt = makeSpreadAt()
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]   // the study's sequence (the row sampler is seeded across years)
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] })
const B = first.B.filter((b) => b.t + 180000 <= TO), D = first.D, m1 = first.m1.filter((b) => b.t + 60000 <= TO)
const S1 = (await loadBars('XAGUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const S3 = (await loadBars('XAGUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars.filter((b) => b.t + 180000 <= TO)
const fe = buildFeatures({ B, m1, S1, S3, D, ha: hourAtr(m1), spreadAt }), net = labelRows({ B, m1, fe, exit: 'X3', spreadAt })
const wf = walkForward({ fe, net, years: YEARS, capture: [Y] }), entry = wf.log.find((l) => l.year === Y)
const study = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), 'utf8')).cells.X3.years.find((l) => l.year === Y)
if (!entry?.frozen || entry.selected !== study.selected) { console.error(`✗ year ${Y}: selected ${entry?.selected} ≠ study ${study?.selected} — not frozen`); process.exit(1) }
const robust = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'scalp_sell_ml_robust.json'), 'utf8'))
const out = { name: 'ML SELL X3', year: Y, spec: 'docs/SCALP_SELL_ML_SPEC.md', built_at: new Date().toISOString(), exit: { tgtA: 0.25, stopA: 3, horizon_min: 1440 },
  features: FEATURES, threshold: entry.frozen.cut, threshold_rule: entry.threshold, fit_end: entry.frozen.fit_end, edges: entry.frozen.edges, model: entry.frozen.model,
  measured: { year: robust.years[Y] ?? null, P1: JSON.parse(fs.readFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), 'utf8')).cells.X3.P1, P2: JSON.parse(fs.readFileSync(path.join(TURBO.master, 'scalp_sell_ml_study.json'), 'utf8')).cells.X3.P2 },
  parity_rows: entry.frozen.picked }
const dir = path.join(TURBO.root, 'data', 'scalp_ml'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `ml_sell_x3_${Y}.json`), JSON.stringify(out))
console.log(`✅ frozen ML SELL X3 for ${Y}: fit < ${out.fit_end}, threshold ${out.threshold.toFixed(5)} (${JSON.stringify(entry.threshold)}), ${entry.selected} selected rows = study`)
