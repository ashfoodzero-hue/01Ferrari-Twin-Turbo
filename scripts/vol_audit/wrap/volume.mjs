// vol_audit/wrap/volume.mjs — the per-mode XAUUSD volume transform (docs/VOLUME_AUDIT_SPEC.md). RESEARCH ONLY.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODE = process.env.VOL_MODE || 'raw'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const TF_MS = { '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': 3600e3, '2h': 7200e3, '4h': 14400e3, '1d': 86400e3 }

let CT = null, CS = null   // CME minute times + prefix sums of volume
function loadCme() {
  if (CT) return
  const rows = fs.readFileSync(path.join(ROOT, 'data', 'history', 'GOLD_FUT', '1m.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((a, b) => a.t - b.t)
  CT = Float64Array.from(rows.map((r) => r.t)); CS = new Float64Array(rows.length + 1)
  for (let i = 0; i < rows.length; i++) CS[i + 1] = CS[i] + (rows[i].v || 0)
}
const lowerBound = (x) => { let lo = 0, hi = CT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (CT[m] < x) lo = m + 1; else hi = m } return lo }
/** Σ CME volume over minutes in [t0, t1). */
export function cmeVolume(t0, t1) { loadCme(); return CS[lowerBound(t1)] - CS[lowerBound(t0)] }
export const CME_FIRST = () => { loadCme(); return CT[0] }

/** Mutates bars' v in place for the active mode. */
export function applyVolume(bars, tf) {
  if (MODE === 'raw' || !bars?.length) return bars
  if (MODE === 'drop') { for (const b of bars) b.v = 1; return bars }
  const ms = TF_MS[tf]; if (!ms) throw new Error(`vol_audit: no tf ms for ${tf}`)
  for (const b of bars) b.v = cmeVolume(b.t, b.t + ms)
  return bars
}
