// inv90/check_forward_parity.mjs — the forward features (data/inv90/forward, built by the --forward modes on the live store) must EQUAL the
// research dataset's features on the overlapping bars (after the 30-day warm-up; rel_gold_xag16 needs 500 prior rows). Output: forward/parity.json
import fs from 'node:fs'
import path from 'node:path'
import { DIR } from './gate.mjs'
const FD = path.join(DIR, 'forward'), f32 = (f) => { const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }, T64 = (d) => new Float64Array(fs.readFileSync(path.join(d, 'dataset_times.bin')).buffer.slice(0))
const mR = JSON.parse(fs.readFileSync(path.join(DIR, 'dataset_meta.json'))), mF = JSON.parse(fs.readFileSync(path.join(FD, 'dataset_meta.json'))), R = f32(path.join(DIR, 'dataset.bin')), Fw = f32(path.join(FD, 'dataset.bin'))
const x2m = JSON.parse(fs.readFileSync(path.join(DIR, 'features2_meta.json'))), XR = f32(path.join(DIR, 'features2.bin')), XF = f32(path.join(FD, 'features2.bin')), TR = T64(DIR), TF = T64(FD)
const idxR = new Map([...TR].map((t, i) => [t, i])), from = TF[0] + 8 * 86400000, bad = {}; let rows = 0, cells = 0
for (let j = 0; j < TF.length; j++) { const t = TF[j]; if (t < from) continue; const i = idxR.get(t); if (i == null) continue; rows++
  const chk = (name, a, b) => { cells++; const same = (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= 1e-4 * Math.max(1, Math.abs(a)); if (!same) (bad[name] ||= []).push({ t: new Date(t).toISOString(), research: a, forward: b }) }
  mR.features.forEach((f, k) => chk(f, R[i * mR.width + k], Fw[j * mF.width + k])); x2m.names.forEach((f, k) => chk(f, XR[i * x2m.width + k], XF[j * x2m.width + k])) }
const rowsF = TF.filter((t) => t >= from).length
const out = { at: new Date().toISOString(), overlap_rows: rows, forward_rows_in_window: rowsF, cells, mismatched_features: Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, { n: v.length, ex: v.slice(0, 2) }])) }
fs.writeFileSync(path.join(FD, 'parity.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1).slice(0, 1500))
