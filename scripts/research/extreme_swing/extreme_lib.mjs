// extreme_lib.mjs — ONE place for the EXTREME SWING leg builder and the D exhaustion features (spec addenda B.3, B.9; moved here unchanged
// from study_extreme_swing.mjs on 2026-11-01 for addendum C, the silver replication). Used by study_extreme_swing.mjs and replicate_d_silver.mjs.
import { compareRates } from '../../../src/core/studyStats.js'

export const MODERN = Date.parse('2020-01-01T00:00:00Z')
export const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d))

/** Legs = consecutive alternating ZigZag pivots with no break inside (addendum B.3). */
export function mkLegs(SW, C, breaks, A) { const out = []
  for (let n = 0; n + 1 < SW.length; n++) { const s = SW[n], e = SW[n + 1]; if (s.type === e.type) continue
    let br = false; for (let i = s.i + 1; i <= e.i; i++) if (breaks.has(i)) { br = true; break } if (br) continue
    const dir = s.type === 'L' ? 1 : -1, atrS = A[s.i] ?? s.atr
    let ext = dir > 0 ? -Infinity : Infinity, adverse = 0
    for (let i = s.i; i <= e.i; i++) { const c = C[i]; if (dir > 0) { ext = Math.max(ext, c.h); adverse = Math.max(adverse, ext - c.l) } else { ext = Math.min(ext, c.l); adverse = Math.max(adverse, c.h - ext) } }
    out.push({ n, dir, si: s.i, ei: e.i, sT: s.t, eT: e.t, sPx: s.px, ePx: e.px, startKnownT: C[s.knownI].close_t, endKnownT: C[e.knownI].close_t, atrStart: atrS,
      size: Math.abs(e.px - s.px), pct: (e.px - s.px) / s.px * 100, sizeAtr: Math.abs(e.px - s.px) / atrS, candles: e.i - s.i, adverseAtr: adverse / atrS, era: s.t >= MODERN ? 'MODERN' : 'OLD' }) }
  return out }

/** D features of week w inside leg (addendum B.9); only candles ≤ w are read. W = weekly candles, AW = ATR(14), RW = RSI(14), SW20 = SMA(20). */
export function makeDFeat({ W, AW, RW, SW20 }) {
  return (leg, w) => { const c = W[w], a = AW[w], ap = AW[w - 1]; if (!a || !ap) return null
    let newExt = true; for (let i = leg.si + 1; i < w; i++) if (leg.dir > 0 ? W[i].h >= c.h : W[i].l <= c.l) { newExt = false; break } if (w === leg.si) newExt = false
    let lastExtRsi = null; for (let i = leg.si + 1; i < w; i++) { let ne = true; for (let k = leg.si + 1; k < i; k++) if (leg.dir > 0 ? W[k].h >= W[i].h : W[k].l <= W[i].l) { ne = false; break } if (ne) lastExtRsi = RW[i] }
    let run = 0; for (let i = w; i > 0; i--) { if (leg.dir > 0 ? W[i].c > W[i - 1].c : W[i].c < W[i - 1].c) run++; else break }
    return { newExt, D1_rsi_divergence: newExt && lastExtRsi != null && RW[w] != null && (leg.dir > 0 ? RW[w] < lastExtRsi : RW[w] > lastExtRsi), D2_vol_climax: c.h - c.l >= 2 * ap,
      D3_stretch: SW20[w] != null && Math.abs(c.c - SW20[w]) >= 3 * a, D4_run6: run >= 6 } } }

/** End weeks vs control weeks: rows [{ end, ... }], getter → true / false / null (null = not measurable). */
export function rate(rows, key, getter) { const E = rows.filter((r) => r.end), Cc = rows.filter((r) => !r.end)
  const ok = (r) => getter(r) != null, kE = E.filter((r) => ok(r) && getter(r)), kC = Cc.filter((r) => ok(r) && getter(r)), nE = E.filter(ok).length, nC = Cc.filter(ok).length
  const cr = compareRates(kE.length, nE, kC.length, nC)
  return { key, n_end: nE, k_end: kE.length, n_ctrl: nC, k_ctrl: kC.length, rate_end: r2(cr.p1, 3), rate_ctrl: r2(cr.p2, 3), ratio: r2(cr.ratio, 2), p: cr.p == null ? null : +cr.p.toPrecision(3),
    precision: kE.length + kC.length ? r2(kE.length / (kE.length + kC.length), 3) : null, recall: nE ? r2(kE.length / nE, 3) : null } }
