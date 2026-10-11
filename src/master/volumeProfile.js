// ════════════════════════════════════════════════════════════════════════════════
// volumeProfile.js — the VOLUME PROFILE of a set of 1m bars (2026-10-09; TOOL 4 of Ashraf's one-by-one plan). ONE module for the studies
// (study_volume_profile.mjs, study_vp_matrix_filter.mjs) and the chart.
// ────────────────────────────────────────────────────────────────────────────────
// WHAT THE VOLUME IS (measured, stated, never dressed up): XAU spot "volume" = Polygon's count of quote updates per minute (TICK ACTIVITY,
// live, 13 y) — not traded contracts. GC (CME gold futures) volume = real exchange contracts (10 min delayed live, ~2 y history), priced
// in FUTURES — converted to spot with the same-minute basis by the caller.
// RULE (pre-registered): each 1m bar's volume is spread UNIFORMLY over its [low, high] range in bins of `bin` dollars; POC = the bin with
// the most volume (ties → the one nearest the profile's volume-weighted mean); VALUE AREA = grow from the POC, each step adding the
// neighbouring bin (above or below) with more volume, until ≥ 70 % of the total → VAH / VAL = the area's top / bottom bin edges.
// ════════════════════════════════════════════════════════════════════════════════
export const VA_SHARE = 0.7

/** @returns {{ poc, vah, val, total, bins }} prices in the bars' own units; null if no volume */
export function volumeProfile(bars, bin) {
  if (!(bin > 0) || !bars.length) return null
  const vol = new Map(); let total = 0, wsum = 0
  for (const b of bars) { const v = b.v || 0; if (!(v > 0)) continue
    const lo = Math.floor(b.l / bin), hi = Math.floor(b.h / bin), share = v / (hi - lo + 1)
    for (let k = lo; k <= hi; k++) vol.set(k, (vol.get(k) || 0) + share)
    total += v; wsum += v * (b.h + b.l) / 2 }
  if (!(total > 0)) return null
  const keys = [...vol.keys()].sort((a, b) => a - b), mean = wsum / total
  let poc = keys[0]; for (const k of keys) { const d = vol.get(k) - vol.get(poc); if (d > 1e-12 || (Math.abs(d) <= 1e-12 && Math.abs((k + 0.5) * bin - mean) < Math.abs((poc + 0.5) * bin - mean))) poc = k }
  let top = poc, bot = poc, acc = vol.get(poc)
  while (acc < VA_SHARE * total) {
    const up = vol.get(top + 1), dn = vol.get(bot - 1)
    if (up == null && dn == null) { if (top >= keys.at(-1) && bot <= keys[0]) break; top++; bot--; continue }   // gaps: step over empty bins
    if ((up ?? -1) >= (dn ?? -1)) { top++; acc += up ?? 0 } else { bot--; acc += dn ?? 0 }
  }
  return { poc: (poc + 0.5) * bin, vah: (top + 1) * bin, val: bot * bin, total, bins: keys.length }
}
