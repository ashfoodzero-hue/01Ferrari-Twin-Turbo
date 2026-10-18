// swing_nextmove.mjs — the core of the 15m NEXT-MOVE study (docs/SWING_NEXTMOVE_15M_SPEC.md, pre-registered 2026-10-18). Pure functions over one
// timeframe's candles + the 1m tape, so the study and its smoke (planted swings) run the very same code.
//   event   : a confirmed ZigZag swing, measured from its CONFIRMATION candle close (knownI) — nothing earlier uses later data
//   Q1 race : from the confirmation close, +X·ATR with the leg before −X·ATR against, on 1m bars; same minute = against (pessimistic)
//   Q2 size : full leg (swing → next swing), remaining after confirmation, adverse before the next extreme — ATR and $
//   Q3 time : 15m bars confirmation → next extreme, and → its confirmation
//   Q4 end  : does the next extreme land within ±0.25 ATR of a level known at the confirmation close (vs the same level shifted 1-3 ATR)
import { zigzag } from '../../src/master/swings.js'
import { atr as atrArr } from '../../src/core/indicators.js'
import { rng } from '../../src/core/studyStats.js'

export const XS = [0.5, 1, 2], HIT_ATR = 0.25, RACE_MAX_MS = 10 * 86400000

/** First index in ascending T (Float64Array) with T[i] ≥ t. */
export function lowerBound(T, t) { let lo = 0, hi = T.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T[m] < t) lo = m + 1; else hi = m } return lo }

/** Race on 1m bars from time t0: dir +1 = up. → true (with first), false (against first or same minute), null (unresolved by the cap). */
export function race(M, MT, t0, p0, dir, x, a) {
  const up = p0 + dir * x * a, dn = p0 - dir * x * a
  for (let j = lowerBound(MT, t0); j < M.length && M[j].t < t0 + RACE_MAX_MS; j++) { const b = M[j]
    const against = dir > 0 ? b.l <= dn : b.h >= dn, withLeg = dir > 0 ? b.h >= up : b.l <= up
    if (against) return false
    if (withLeg) return true }
  return null
}

/** Events of one timeframe: every confirmed swing whose leg to the NEXT swing (and that swing's confirmation) touches no break. */
export function nextMoveEvents(C, { k = 3, breaks = new Set() } = {}) {
  const A = atrArr(C, 14), { swings } = zigzag(C, { k, breaks }), out = []
  const brk = [...breaks].sort((x, y) => x - y), anyBreak = (a, z) => { let lo = 0, hi = brk.length; while (lo < hi) { const m = (lo + hi) >> 1; if (brk[m] < a) lo = m + 1; else hi = m } return lo < brk.length && brk[lo] <= z }
  for (let n = 0; n < swings.length; n++) { const s = swings[n], e = s.knownI, a = A[e]
    if (!(a > 0) || anyBreak(s.i, e)) continue
    const nx = swings[n + 1] && swings[n + 1].type !== s.type && !anyBreak(e, swings[n + 1].knownI) ? swings[n + 1] : null
    out.push({ n, s, e, a, dir: s.type === 'L' ? 1 : -1, t0: C[e].close_t, p0: C[e].c, next: nx, prev: swings[n - 1] ?? null }) }
  return { events: out, swings, A }
}

/** Q2 + Q3 for one event (needs ev.next). */
export function legMeasures(C, ev) {
  const { s, e, a, dir, p0, next } = ev; if (!next) return null
  let adverse = 0; for (let j = e + 1; j <= next.i; j++) { const v = dir > 0 ? p0 - C[j].l : C[j].h - p0; if (v > adverse) adverse = v }
  return { full_atr: Math.abs(next.px - s.px) / a, full_usd: Math.abs(next.px - s.px), rem_atr: (next.px - p0) * dir / a, rem_usd: (next.px - p0) * dir,
    adv_atr: adverse / a, adv_usd: adverse, bars_to_extreme: next.i - e, bars_to_confirm: next.knownI - e }
}

/** Q4 levels known at the confirmation close, in the leg's direction (beyond p0). levels: [{ type, px }] supplied by the caller. */
export function levelHits(ev, levels, seed) {
  const r = rng(seed), out = []
  for (const L of levels) { if (L.px == null || !((L.px - ev.p0) * ev.dir > 0)) continue
    const hit = ev.next ? Math.abs(ev.next.px - L.px) <= HIT_ATR * ev.a : null
    let sg = r() < 0.5 ? -1 : 1; const d = (1 + 2 * r()) * ev.a; let sh = L.px + sg * d
    if (!((sh - ev.p0) * ev.dir > 0)) sh = L.px - sg * d            // keep the shifted level in the leg's direction (it must be reachable too)
    out.push({ type: L.type, hit, ctrl: ev.next ? Math.abs(ev.next.px - sh) <= HIT_ATR * ev.a : null, d: (L.px - ev.p0) * ev.dir / ev.a }) }   // d: distance in ATR (ADDENDUM A)
  return out
}

/** Quantiles of a numeric array. */
export function quant(v, ps = [0.1, 0.25, 0.5, 0.75, 0.9]) {
  const s = v.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null
  return Object.fromEntries(ps.map((p) => [`p${Math.round(p * 100)}`, +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))].toFixed(4)]).concat([['n', s.length]]))
}
