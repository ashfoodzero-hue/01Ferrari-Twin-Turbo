// inv90/walkforward.mjs — Part 1 of docs/INVESTIGATION_90WR_2026-10-11.md: yearly walk-forward GBDT scores for ONE candidate (side × bracket).
//   usage: node scripts/inv90/walkforward.mjs BUY_B1
// For each year Y = 2016 … 2026: bins + model fitted ONLY on rows with time < Jan 1 Y − 2 days; scores written for the rows of Y.
// Output: data/inv90/scores_<cand>.bin (Float32 per dataset row, NaN = not scored) + wf_<cand>.json (per-year feature usage, row counts).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { fitBins, binAll, train, predict, usage } from './gbdt.mjs'

const cand = process.argv[2], XF = process.argv.includes('--x'), STRONG = process.argv.includes('--strong'),   // --strong: Part 7a GBDT settings
  DIR = path.join(TURBO.root, 'data', 'inv90')
const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'dataset_meta.json'), 'utf8')), W = meta.width, n = meta.rows
const raw = fs.readFileSync(path.join(DIR, 'dataset.bin')), D = new Float32Array(raw.buffer, raw.byteOffset, n * W)
const T = new Float64Array(fs.readFileSync(path.join(DIR, 'dataset_times.bin')).buffer.slice(0))
// Part 4 candidates (I1/I2/D1/D2) take their label from outcomes2.bin; a NaN outcome (not tradeable at that time) is neither trained on nor scored
const P4 = /_(I1|I2|D1|D2)$/.test(cand), O2 = P4 ? JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')) : null
const O2D = P4 ? new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0)) : null, o2c = P4 ? O2.cols.indexOf(cand + '_net') : -1
const yc = P4 ? -1 : meta.features.length + meta.outcomes.indexOf(cand); if (!P4 && yc < meta.features.length) throw new Error('unknown candidate ' + cand)
if (P4 && o2c < 0) throw new Error('unknown Part 4 candidate ' + cand)
const label = (r) => (P4 ? O2D[r * O2.width + o2c] : D[r * W + yc])
const FEATS = meta.features.map((f, i) => [f, i]).filter(([f]) => f !== 'A')   // raw ATR in $ is not stationary → excluded
// --x (Part 5b): + the 10 cross-market features of features2.bin (negative index = column in features2)
const X2 = XF ? JSON.parse(fs.readFileSync(path.join(DIR, 'features2_meta.json'), 'utf8')) : null, X2D = XF ? new Float32Array(fs.readFileSync(path.join(DIR, 'features2.bin')).buffer.slice(0)) : null
if (XF) X2.names.forEach((nm, k) => FEATS.push([nm, -1 - k]))
const F = FEATS.length
const X = new Float32Array(n * F), y = new Uint8Array(n)
const valid = new Uint8Array(n)
for (let r = 0; r < n; r++) { for (let k = 0; k < F; k++) { const c = FEATS[k][1]; X[r * F + k] = c >= 0 ? D[r * W + c] : X2D[r * X2.width + (-1 - c)] } const v = label(r); valid[r] = Number.isFinite(v) ? 1 : 0; y[r] = v > 0 ? 1 : 0 }
const scores = new Float32Array(n).fill(NaN), log = { cand, features: FEATS.map(([f]) => f), years: {} }
for (let Y = 2016; Y <= 2026; Y++) {
  const y0 = Date.UTC(Y, 0, 1), y1 = Date.UTC(Y + 1, 0, 1), trRows = [], teRows = []
  const emb = P4 && /D\d$/.test(cand) ? 9 * 86400000 : 2 * 86400000   // 7-day outcomes need a 9-day embargo
  for (let r = 0; r < n; r++) { if (!valid[r]) continue; if (T[r] < y0 - emb) trRows.push(r); else if (T[r] >= y0 && T[r] < y1) teRows.push(r) }
  if (!teRows.length) continue
  const t0 = Date.now(), edges = fitBins(X, n, F, trRows), Xb = binAll(X, n, F, edges), model = train(Xb, n, F, y, trRows, STRONG ? { seed: Y, trees: 400, depth: 5, lr: 0.03, minLeaf: 200, sub: 0.5 } : { seed: Y })
  for (const r of teRows) scores[r] = predict(model, Xb, n, r)
  const u = usage(model, F), top = u.map((c, k) => [FEATS[k][0], c]).sort((a, b) => b[1] - a[1]).slice(0, 10)
  log.years[Y] = { train: trRows.length, test: teRows.length, base_wr_train: +(trRows.reduce((s, r) => s + y[r], 0) / trRows.length).toFixed(4), top_features: top, sec: Math.round((Date.now() - t0) / 1000) }
  console.log(cand, Y, JSON.stringify(log.years[Y]))
}
fs.writeFileSync(path.join(DIR, `scores_${cand}${XF ? '_x' : ''}${STRONG ? 's' : ''}.bin`), Buffer.from(scores.buffer))
fs.writeFileSync(path.join(DIR, `wf_${cand}${XF ? '_x' : ''}${STRONG ? 's' : ''}.json`), JSON.stringify({ at: new Date().toISOString(), ...log }, null, 1))
console.log('done', cand)
