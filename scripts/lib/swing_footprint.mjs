// swing_footprint.mjs — the counting core of Phase 2 (docs/SWING_FOOTPRINT_SPEC.md, 2026-10-17): footprint measures at swings (S), failed
// extremes (C1) and random candles (C2), the SAME events as Phase 1 (scripts/lib/swing_atlas.mjs atlasEvents). Candle-shape measures of the
// same events in the same window are counted alongside under the `cdl:` prefix — REFERENCE only (head-to-head), never in the Holm family.
// fpAt(t) → { fc, k } | undefined: the footprint candle with the same open time as spot candle t (fc from footprintTf.footprintCandles) and its index.
import { footprintRead } from '../../src/master/footprintTf.js'
import { OFFSETS, windowMeasures } from './swing_atlas.mjs'

export const FP_NUMS = ['delta_frac', 'poc_loc', 'low_vol_frac', 'high_vol_frac', 'low_sell_frac', 'high_buy_frac', 'rel_volume']
export const FP_BOOLS = ['delta_pos', 'stacked_buy3', 'stacked_sell3', 'absorption_low', 'absorption_high']

/** Footprint measures of the window around spot candle i (per offset; an offset whose footprint candle is missing or spans a roll is left out). */
export function fpWindow(C, i, fpAt, fpList) {
  const bools = {}, nums = {}, deltas = {}
  for (const o of OFFSETS) { const j = i + o; if (j < 0 || j >= C.length) continue
    const hit = fpAt(C[j].t); if (!hit || hit.fc.roll) continue
    const r = footprintRead(hit.fc); if (!r) continue
    deltas[o] = hit.fc.delta
    bools[`${o}|delta_pos`] = hit.fc.delta > 0; bools[`${o}|stacked_buy3`] = r.stacked_buy >= 3; bools[`${o}|stacked_sell3`] = r.stacked_sell >= 3
    bools[`${o}|absorption_low`] = r.absorption_low; bools[`${o}|absorption_high`] = r.absorption_high
    for (const n of ['delta_frac', 'poc_loc', 'low_vol_frac', 'high_vol_frac', 'low_sell_frac', 'high_buy_frac']) nums[`${o}|${n}`] = r[n]
    if (hit.k >= 20) { const v = fpList.slice(hit.k - 20, hit.k).map((x) => x.v).sort((a, b) => a - b), med = (v[9] + v[10]) / 2; if (med > 0) nums[`${o}|rel_volume`] = hit.fc.v / med } }
  return { bools, nums, deltas }
}
/** Window measures at offset 0: summed delta of −3 … 0 and the delta divergence (new extreme vs −3 … −1 with delta against the move). */
export function fpWindowSigns(C, i, side, deltas) {
  const out = {}
  if ([-3, -2, -1, 0].every((o) => deltas[o] != null)) out['0|cum_delta_pos'] = deltas[-3] + deltas[-2] + deltas[-1] + deltas[0] > 0
  if (deltas[0] != null && i >= 3) { const prevLo = Math.min(C[i - 1].l, C[i - 2].l, C[i - 3].l), prevHi = Math.max(C[i - 1].h, C[i - 2].h, C[i - 3].h)
    out['0|delta_divergence'] = side === 'L' ? C[i].l < prevLo && deltas[0] > 0 : C[i].h > prevHi && deltas[0] < 0 }
  return out
}
const bin = (v, cut) => v == null || !isFinite(v) ? null : v < cut[0] ? 'lo' : v < cut[1] ? 'mid' : 'hi'
const offOf = (key) => { const o = Number(key.replace(/^cdl:/, '').split('|')[0]); return Number.isFinite(o) ? o : 0 }
/** TRAIN-C1 tercile cut-offs (footprint numerics + candle numerics) per side, for events inside the window. */
export function fpTerciles(C, ev, { inWin, isTrain, fpAt, fpList, breaks }) {
  const cuts = { H: {}, L: {} }
  for (const side of ['H', 'L']) { const vals = {}
    for (const f of ev.c1) { if (f.type !== side || !inWin(C[f.i].t) || !isTrain(C[f.i].t)) continue
      const w = fpWindow(C, f.i, fpAt, fpList); for (const [key, v] of Object.entries(w.nums)) if (v != null && isFinite(v)) (vals[key] ??= []).push(v)
      const m = windowMeasures(C, ev.A, f.i, breaks); if (m) for (const [key, v] of Object.entries(m.nums)) if (v != null && isFinite(v)) (vals['cdl:' + key] ??= []).push(v) }
    for (const [key, v] of Object.entries(vals)) { v.sort((a, b) => a - b); cuts[side][key] = [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]] } }
  return cuts
}
/** Count S / C1 / C2 per side and TRAIN/OOS (within the window). C1 at offset +k only while still unbroken (addendum A). */
export function fpCounts(C, ev, { inWin, isTrain, fpAt, fpList, breaks, cuts }) {
  const out = { H: {}, L: {} }, n = { H: { S: { T: 0, O: 0 }, C1: { T: 0, O: 0 }, C2: { T: 0, O: 0 } }, L: { S: { T: 0, O: 0 }, C1: { T: 0, O: 0 }, C2: { T: 0, O: 0 } } }
  const add = (side, grp, split, key, val) => { const c = (out[side][key] ??= { S: { T: [0, 0], O: [0, 0] }, C1: { T: [0, 0], O: [0, 0] }, C2: { T: [0, 0], O: [0, 0] } })[grp][split]; c[1]++; if (val) c[0]++ }
  const record = (side, grp, i, maxOff = Infinity) => { if (!inWin(C[i].t)) return
    const w = fpWindow(C, i, fpAt, fpList); if (w.deltas[0] == null) return   // no footprint on the extreme candle itself → not an event here
    const split = isTrain(C[i].t) ? 'T' : 'O'; n[side][grp][split]++
    for (const [key, v] of Object.entries(w.bools)) if (offOf(key) <= maxOff) add(side, grp, split, key, v)
    for (const [key, v] of Object.entries(w.nums)) { if (offOf(key) > maxOff) continue; const b = cuts[side][key] && bin(v, cuts[side][key]); if (b) for (const z of ['lo', 'mid', 'hi']) add(side, grp, split, `${key}:${z}`, b === z) }
    for (const [key, v] of Object.entries(fpWindowSigns(C, i, side, w.deltas))) add(side, grp, split, key, v)
    const m = windowMeasures(C, ev.A, i, breaks)   // candle-shape reference on the very same event
    if (m) { for (const [key, v] of Object.entries(m.bools)) if (offOf(key) <= maxOff) add(side, grp, split, 'cdl:' + key, v)
      for (const [key, v] of Object.entries(m.nums)) { if (offOf(key) > maxOff) continue; const b = cuts[side]['cdl:' + key] && bin(v, cuts[side]['cdl:' + key]); if (b) for (const z of ['lo', 'mid', 'hi']) add(side, grp, split, `cdl:${key}:${z}`, b === z) } } }
  for (const s of ev.swings) record(s.type, 'S', s.i)
  for (const f of ev.c1) record(f.type, 'C1', f.i, f.supersededI - f.i - 1)
  for (const x of ev.random) record(x.forType, 'C2', x.i)
  return { cells: out, n }
}
