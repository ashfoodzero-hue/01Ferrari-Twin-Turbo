// inv90/diag_scores.mjs — MEASURES whether the walk-forward model ranks trades at all (descriptive, no verdict): pooled OOS 2016-2026 AUC,
// and WR / $ per row by score bucket (top 0.1 %, 0.5 %, 1 %, 5 %, 10 %, 50 %, all) — raw rows, before the trade policy.
import fs from 'node:fs'
import path from 'node:path'
import { loadDataset, DIR } from './gate.mjs'
const ds = loadDataset(), out = {}
for (const cand of ['BUY', 'SELL'].flatMap((s) => [1, 2, 3, 4].map((b) => `${s}_B${b}`))) {
  const S = new Float32Array(fs.readFileSync(path.join(DIR, `scores_${cand}.bin`)).buffer.slice(0)), c = ds.col(cand), xs = []
  for (let r = 0; r < ds.n; r++) if (Number.isFinite(S[r])) xs.push([S[r], ds.get(r, c)])
  xs.sort((a, b) => a[0] - b[0]); let pos = 0, sr = 0; xs.forEach(([, v], i) => { if (v > 0) { pos++; sr += i + 1 } }); const auc = (sr - pos * (pos + 1) / 2) / (pos * (xs.length - pos))
  const desc = xs.slice().reverse(), b = {}
  for (const q of [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]) { const k = Math.max(1, Math.floor(q * desc.length)), top = desc.slice(0, k); b['top ' + q * 100 + '%'] = { n: k, wr: +(top.filter((x) => x[1] > 0).length / k).toFixed(4), net: +(top.reduce((s, x) => s + x[1], 0) / k).toFixed(3) } }
  out[cand] = { auc: +auc.toFixed(4), buckets: b }
  console.log(cand.padEnd(8), 'AUC', auc.toFixed(3), Object.entries(b).map(([k, v]) => `${k}: ${(v.wr * 100).toFixed(1)}% $${v.net}`).join(' | '))
}
fs.writeFileSync(path.join(DIR, 'diag_scores.json'), JSON.stringify({ at: new Date().toISOString(), out }, null, 1))
