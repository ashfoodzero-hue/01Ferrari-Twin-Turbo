// swing_atlas.mjs — the counting core of the swing-candle atlas (docs/SWING_CANDLE_SPEC.md, Phase 1, 2026-10-17). Pure functions over ONE
// timeframe's candles, so the study and its smoke (synthetic planted swings) run the very same code.
//   events   : swings (zigzag k), C1 failed extremes (pullback ≥ 1 ATR, same side), C2 random candles (same NY hour + year, ≥ 4 candles from
//              any swing) — every window −3…+3 must be clear of breaks (data holes)
//   measures : booleans per offset (anatomy labels, direction) + continuous per offset (binned into TRAIN-C1 terciles) + leg context +
//              same-time context supplied by the caller (ctx(i, side) → { name: bool | number | undefined })
//   counts   : cell[measureKey] = { S:{T:[k,n],O:[k,n]}, C1:{…}, C2:{…} }
import { zigzag } from '../../src/master/swings.js'
import { anatomy } from '../../src/master/candleFeatures.js'
import { atr as atrArr } from '../../src/core/indicators.js'
import { rng } from '../../src/core/studyStats.js'

export const OFFSETS = [-3, -2, -1, 0, 1, 2, 3]
export const BOOLS = ['inside', 'outside', 'bull_engulf', 'bear_engulf', 'sweep_low_reclaim', 'sweep_high_reject', 'hammer', 'shooting_star', 'marubozu']
export const NUMS = ['range_atr', 'body_atr', 'body_frac', 'upper_wick_frac', 'lower_wick_frac', 'close_loc', 'gap_atr']

/** Raw measures of the window around candle i (null if the window leaves the series or touches a break). */
export function windowMeasures(C, A, i, breaks) {
  for (let j = i - 4; j <= i + 3; j++) if (j < 1 || j >= C.length || breaks.has(j) || !(A[j - 1] > 0)) return null
  const bools = {}, nums = {}
  for (const o of OFFSETS) { const j = i + o, x = anatomy(C[j], C[j - 1], A[j - 1])
    bools[`${o}|dir_bull`] = x.dir === 'bull'; bools[`${o}|dir_bear`] = x.dir === 'bear'; bools[`${o}|dir_doji`] = x.dir === 'doji'
    for (const b of BOOLS) bools[`${o}|${b}`] = !!x[b]
    for (const n of NUMS) nums[`${o}|${n}`] = x[n] }
  return { bools, nums }
}
/** Leg context of an extreme at i of type 'H'|'L', given the confirmed swings list (sorted by i). */
export function legContext(C, A, swings, i, type, px) {
  // binary search (swings are in candle order): the last swing before i; the previous same-side swing is at most a few steps back (H/L alternate)
  let lo = 0, hi = swings.length; while (lo < hi) { const m = (lo + hi) >> 1; if (swings[m].i < i) lo = m + 1; else hi = m }
  let prev = lo > 0 ? swings[lo - 1] : null, prevSame = null
  for (let k = lo - 1; k >= 0 && k >= lo - 4; k--) if (swings[k].type === type) { prevSame = swings[k]; break }
  const a = A[i - 1], out = {}
  if (prev && a > 0) { out['0|leg_bars'] = i - prev.i; out['0|leg_atr'] = Math.abs(px - prev.px) / a }
  if (prevSame) out['0|beyond_prev_same'] = type === 'L' ? px < prevSame.px : px > prevSame.px   // lower low / higher high vs the previous same-side swing
  return out
}
/** Events of one timeframe. */
export function atlasEvents(C, { k = 3, breaks = new Set(), seed = 1, nRandom = 3, nyHour = () => 0 } = {}) {
  const A = atrArr(C, 14), { swings, failed } = zigzag(C, { k, breaks })
  const near = new Set(); for (const s of swings) for (let d = -3; d <= 3; d++) near.add(s.i + d)
  const pools = new Map(); for (let i = 5; i < C.length - 4; i++) { if (near.has(i)) continue; const key = new Date(C[i].t).getUTCFullYear() + '|' + nyHour(C[i].t); if (!pools.has(key)) pools.set(key, []); pools.get(key).push(i) }
  const r = rng(seed), random = []
  for (const s of swings) { const pool = pools.get(new Date(C[s.i].t).getUTCFullYear() + '|' + nyHour(C[s.i].t)); if (!pool?.length) continue
    for (let q = 0; q < nRandom; q++) random.push({ i: pool[(r() * pool.length) | 0], forType: s.type }) }
  return { A, swings, c1: failed.filter((f) => f.pullback_atr >= 1), random }
}
const bin = (v, cut) => v == null || !isFinite(v) ? null : v < cut[0] ? 'lo' : v < cut[1] ? 'mid' : 'hi'
/** TRAIN-C1 tercile cut-offs per side and continuous measure key. */
export function terciles(C, ev, breaks, isTrain, maxN = 40000) {
  const cuts = { H: {}, L: {} }
  for (const side of ['H', 'L']) { const vals = {}; let n = 0
    for (const f of ev.c1) { if (f.type !== side || !isTrain(C[f.i].t)) continue; if (n++ > maxN) break
      const m = windowMeasures(C, ev.A, f.i, breaks); if (!m) continue
      for (const [key, v] of Object.entries(m.nums)) if (v != null && isFinite(v)) (vals[key] ??= []).push(v)
      for (const [key, v] of Object.entries(legContext(C, ev.A, ev.swings, f.i, side, f.px))) if (typeof v === 'number') (vals[key] ??= []).push(v) }
    for (const [key, v] of Object.entries(vals)) { v.sort((a, b) => a - b); cuts[side][key] = [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]] } }
  return cuts
}
/** Count every measure for swings (S), failed extremes (C1) and random candles (C2), split TRAIN/OOS, per side. */
export function atlasCounts(C, ev, { breaks = new Set(), isTrain, cuts, ctx = () => ({}), ctxSplit = null } = {}) {   // ctxSplit(key, t) → 'T'|'O' for sub-period context cells (own 60/40 split)
  const out = { H: {}, L: {} }, conf = { H: OFFSETS.map(() => [0, 0]), L: OFFSETS.map(() => [0, 0]) }, n = { H: { S: { T: 0, O: 0 }, C1: { T: 0, O: 0 }, C2: { T: 0, O: 0 } }, L: { S: { T: 0, O: 0 }, C1: { T: 0, O: 0 }, C2: { T: 0, O: 0 } } }
  const add = (side, grp, split, key, val) => { const c = (out[side][key] ??= { S: { T: [0, 0], O: [0, 0] }, C1: { T: [0, 0], O: [0, 0] }, C2: { T: [0, 0], O: [0, 0] } })[grp][split]; c[1]++; if (val) c[0]++ }
  // maxOff (ADDENDUM A): a C1 failed extreme is compared at offset +k only while it was still unbroken at that candle's close (supersededI > i + k)
  const offOf = (key) => { const o = Number(key.split('|')[0]); return Number.isFinite(o) ? o : 0 }
  const record = (side, grp, i, px, withLeg, maxOff = Infinity) => { const m = windowMeasures(C, ev.A, i, breaks); if (!m) return false
    const split = isTrain(C[i].t) ? 'T' : 'O'; n[side][grp][split]++
    for (const [key, v] of Object.entries(m.bools)) if (offOf(key) <= maxOff) add(side, grp, split, key, v)
    for (const [key, v] of Object.entries(m.nums)) { if (offOf(key) > maxOff) continue; const b = cuts[side][key] && bin(v, cuts[side][key]); if (b) for (const z of ['lo', 'mid', 'hi']) add(side, grp, split, `${key}:${z}`, b === z) }
    if (withLeg) for (const [key, v] of Object.entries(legContext(C, ev.A, ev.swings, i, side, px))) { if (typeof v === 'boolean') add(side, grp, split, key, v); else { const b = cuts[side][key] && bin(v, cuts[side][key]); if (b) for (const z of ['lo', 'mid', 'hi']) add(side, grp, split, `${key}:${z}`, b === z) } }
    for (const [key, v] of Object.entries(ctx(i, side))) if (v != null && typeof v === 'boolean') add(side, grp, ctxSplit ? ctxSplit(key, C[i].t) ?? split : split, key, v)
    return true }
  for (const s of ev.swings) if (record(s.type, 'S', s.i, s.px, true)) OFFSETS.forEach((o, q) => { conf[s.type][q][1]++; if (s.knownI <= s.i + o) conf[s.type][q][0]++ })
  for (const f of ev.c1) record(f.type, 'C1', f.i, f.px, true, f.supersededI - f.i - 1)
  for (const x of ev.random) record(x.forType, 'C2', x.i, null, false)
  return { cells: out, n, confirmed_by_offset: Object.fromEntries(['H', 'L'].map((s) => [s, Object.fromEntries(OFFSETS.map((o, q) => [o, conf[s][q][1] ? conf[s][q][0] / conf[s][q][1] : null]))])) }
}
