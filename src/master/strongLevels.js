// ════════════════════════════════════════════════════════════════════════════════
// strongLevels.js — STRONG (multi-touch) S/R levels (2026-10-11; spec docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 4). ONE rule for
// study_strong_levels.mjs (13 y spot), study_orderflow_footprint.mjs --levels=strong (2 y CME) and any chart use.
// ────────────────────────────────────────────────────────────────────────────────
// Pivot: a closed 1h bar whose high (low) is strictly above (below) the 2 bars before and after; known at the close of the 2nd bar after.
// Levels for day D: pivots known before D 00:00 UTC whose bar lies in the last 10 days, highs and lows together, sorted by price;
// consecutive prices within tol = 0.1 × ATR14(1d) form one cluster. Level = the cluster's median price; touches = its pivot count.
// ════════════════════════════════════════════════════════════════════════════════
export const STRONG = Object.freeze({ windowDays: 10, tolAtr: 0.1, side: 2 })
const H1 = 3600000, DAY = 86400000

/** All 1h pivots of ascending bars H ({t,h,l}); `same(j0, j1)` may veto a window (e.g. a contract roll). */
export function hourPivots(H, same = () => true) {
  const out = [], s = STRONG.side
  for (let j = s; j < H.length - s; j++) { if (!same(j - s, j + s)) continue
    let hi = true, lo = true; for (let q = j - s; q <= j + s; q++) { if (q === j) continue; if (!(H[q].h < H[j].h)) hi = false; if (!(H[q].l > H[j].l)) lo = false }
    const known = H[j + s].t + H1
    if (hi) out.push({ t: H[j].t, known, price: H[j].h, kind: 'H' })
    if (lo) out.push({ t: H[j].t, known, price: H[j].l, kind: 'L' }) }
  return out
}

/** Strong levels in force during day d (00:00 UTC): [{ price, touches, lo, hi }] sorted by price. `pivots` ascending by known time. */
export function strongLevelsForDay(pivots, d, atr1d, keep = () => true) {
  if (!(atr1d > 0)) return []
  const tol = STRONG.tolAtr * atr1d, P = pivots.filter((p) => p.known <= d && p.t >= d - STRONG.windowDays * DAY && keep(p)).map((p) => p.price).sort((a, b) => a - b)
  const out = []; let cur = []
  const close = () => { if (!cur.length) return; const m = cur.length >> 1, med = cur.length % 2 ? cur[m] : (cur[m - 1] + cur[m]) / 2; out.push({ price: med, touches: cur.length, lo: cur[0], hi: cur.at(-1) }); cur = [] }
  for (const x of P) { if (cur.length && x - cur.at(-1) > tol) close(); cur.push(x) }
  close(); return out
}
