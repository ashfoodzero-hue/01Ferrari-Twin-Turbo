// ════════════════════════════════════════════════════════════════════════════════
// elliott.js — a MECHANICAL Elliott Wave count (2026-10-09; TOOL 5 of Ashraf's one-by-one plan; Ashraf chose: the proposed count + the ABC
// correction). ONE module for the studies (study_elliott.mjs, study_elliott_matrix_filter.mjs) and the chart. No discretion anywhere.
// ────────────────────────────────────────────────────────────────────────────────
// SWINGS: confirmed 5/5 pivots (ferrariMatrix.confirmedPivots — a pivot is known 5 closed bars after it), merged into an ALTERNATING
// zig-zag in the order they become known: a pivot of the same type as the last point REPLACES it only if more extreme. Causal by
// construction: the zig-zag at time T uses only pivots known by T.
// BULL 1-2-3-4 on the last five points L0 H1 L2 H3 L4 (bear = mirror), the three hard rules in their stage-4 form:
//   wave 2 does not go below the start of wave 1:   L2 > L0
//   wave 3 extends beyond wave 1 AND is not shorter: H3 > H1 and (H3 − L2) ≥ (H1 − L0)   → wave 3 can never become the shortest
//   wave 4 does not overlap wave 1:                  L4 > H1   (and L4 < H3)
//   → emits W5 { dir:'UP', target: H3 (wave 5 must exceed it), invalid: L4 }
// BULL 1-2-3-4-5 on six points L0 H1 L2 H3 L4 H5: the stage-4 rules + H5 > H3 + wave 3 not the shortest of (1, 3, 5)
//   → emits ABC { dir:'DOWN' (the correction), target: L4 (the wave-4 area), knownAt of H5 }
// Each pattern instance is emitted ONCE, when it first becomes valid (keyed by its points' bar indices).
// ════════════════════════════════════════════════════════════════════════════════
import { confirmedPivots } from './ferrariMatrix.js'

/** Alternating zig-zag updates in knowledge order: [{ seq (copy of the last 6 points), knownAt }] */
function zigzagUpdates(B) {
  const P = confirmedPivots(B), ev = [...P.highs.map((x) => ({ ...x, k: 'H' })), ...P.lows.map((x) => ({ ...x, k: 'L' }))].sort((a, b) => a.knownAt - b.knownAt || a.j - b.j)
  const seq = [], out = []
  for (const e of ev) {
    const last = seq.at(-1)
    if (last && last.k === e.k) { if (e.k === 'H' ? e.px > last.px : e.px < last.px) seq[seq.length - 1] = e; else continue }
    else seq.push(e)
    out.push({ seq: seq.slice(-6), knownAt: e.knownAt })
  }
  return out
}

/** All W5 and ABC pattern instances on bars B: [{ kind, dir, pts, target, invalid, knownAt (bar index) }] */
export function elliottPatterns(B) {
  const out = [], seen = new Set()
  for (const { seq, knownAt } of zigzagUpdates(B)) {
    const n = seq.length
    if (n >= 5) { const [p0, p1, p2, p3, p4] = seq.slice(-5)
      for (const up of [true, false]) {
        const s = up ? 1 : -1, ok = p0.k === (up ? 'L' : 'H') && s * (p2.px - p0.px) > 0 && s * (p3.px - p1.px) > 0 && s * (p3.px - p2.px) >= s * (p1.px - p0.px) && s * (p4.px - p1.px) > 0 && s * (p3.px - p4.px) > 0
        const key = 'W5' + [p0, p1, p2, p3, p4].map((p) => p.j).join(',')
        if (ok && !seen.has(key)) { seen.add(key); out.push({ kind: 'W5', dir: up ? 'UP' : 'DOWN', pts: [p0, p1, p2, p3, p4].map((p) => p.px), target: p3.px, invalid: p4.px, knownAt }) } } }
    if (n >= 6) { const [p0, p1, p2, p3, p4, p5] = seq.slice(-6)
      for (const up of [true, false]) {
        const s = up ? 1 : -1, w1 = s * (p1.px - p0.px), w3 = s * (p3.px - p2.px), w5 = s * (p5.px - p4.px)
        const ok = p0.k === (up ? 'L' : 'H') && s * (p2.px - p0.px) > 0 && s * (p3.px - p1.px) > 0 && w3 >= w1 && s * (p4.px - p1.px) > 0 && s * (p3.px - p4.px) > 0 && s * (p5.px - p3.px) > 0 && !(w3 < w1 && w3 < w5)
        const key = 'ABC' + [p0, p1, p2, p3, p4, p5].map((p) => p.j).join(',')
        if (ok && !seen.has(key)) { seen.add(key); out.push({ kind: 'ABC', dir: up ? 'DOWN' : 'UP', pts: [p0, p1, p2, p3, p4, p5].map((p) => p.px), target: p4.px, top: p5.px, knownAt }) } } }
  }
  return out
}
