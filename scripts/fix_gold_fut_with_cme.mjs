// fix_gold_fut_with_cme.mjs — make GOLD_FUT exchange-exact where the CME's own feed exists (2026-10-17; Ashraf: "we need all data base 100% correct").
// Audit: on minutes where Polygon and Databento (CME Globex MDP 3.0, the exchange feed) hold the SAME contract, Polygon's volume was LOWER on 30
// of 682,457 minutes (missed trades) and the close differed by one tick on ~39 k (trade order inside the same millisecond). The exchange sequence
// is the authority, so every same-contract minute where they differ takes the CME o/h/l/c/v. Roll-day minutes (different contracts) are left
// alone — the series keeps its own causal roll rule. Run AFTER every `import_futures_1m.mjs GOLD_FUT` (re-runnable, idempotent).
// Output: data/history/GOLD_FUT/1m.jsonl (patched in place, atomic) · data/history/GOLD_FUT/cme_corrections.jsonl (originals, one per patched minute).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const rd = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const DIR = TURBO.historyAsset('GOLD_FUT'), F = path.join(DIR, '1m.jsonl')
const P = rd(F), D = rd(path.join(TURBO.root, 'data', 'orderflow', 'gc_1m.jsonl')), dm = new Map(D.map((b) => [b.t, b]))
// Databento instrument id → Polygon contract code (majority over shared minutes)
const pair = new Map(); for (const b of P) { const d = dm.get(b.t); if (!d) continue; const m = pair.get(d.iid) || {}; m[b.tk] = (m[b.tk] || 0) + 1; pair.set(d.iid, m) }
const tkOf = new Map([...pair].map(([i, m]) => [i, Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]]))
const corr = [], stats = { minutes: P.length, same_contract: 0, patched: 0, volume_patched: 0, price_patched: 0 }
for (const b of P) { const d = dm.get(b.t); if (!d || tkOf.get(d.iid) !== b.tk) continue; stats.same_contract++
  const vDiff = d.v !== b.v, pDiff = ['o', 'h', 'l', 'c'].some((k) => Math.abs(d[k] - b[k]) > 1e-9)
  if (!vDiff && !pDiff) continue
  corr.push({ t: b.t, tk: b.tk, polygon: { o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }, cme: { o: d.o, h: d.h, l: d.l, c: d.c, v: d.v } })
  b.o = d.o; b.h = d.h; b.l = d.l; b.c = d.c; b.v = d.v; b.src = 'cme'; stats.patched++; if (vDiff) stats.volume_patched++; if (pDiff) stats.price_patched++ }
fs.writeFileSync(F + '.tmp', P.map((b) => JSON.stringify(b)).join('\n') + '\n'); fs.renameSync(F + '.tmp', F)
fs.writeFileSync(path.join(DIR, 'cme_corrections.jsonl'), corr.map((c) => JSON.stringify(c)).join('\n') + (corr.length ? '\n' : ''))
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest_1m.json'), 'utf8')); man.cme_patch = { at: new Date().toISOString(), ...stats, note: 'same-contract minutes patched to the CME exchange feed (Databento tbbo) — scripts/fix_gold_fut_with_cme.mjs' }
fs.writeFileSync(path.join(DIR, 'manifest_1m.json'), JSON.stringify(man, null, 1))
console.log(JSON.stringify(stats))
