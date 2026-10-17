// ════════════════════════════════════════════════════════════════════════════════
// orderBlock.js — ORDER BLOCK detection + STRENGTH (2026-10-11; Ashraf: "strength of OB"). ONE place for study_order_block.mjs (and any chart use).
// ────────────────────────────────────────────────────────────────────────────────
// BULLISH OB at bar j (closed): bar j is a DOWN candle (c < o) and the next K = 3 bars displace UP: their highest high − low[j] ≥ 1.5·ATR14(j)
// AND bar j+3 closes above high[j] (structure leaves the block). Zone = [low[j], high[j]], known at the close of bar j+3. BEARISH mirrored.
// STRENGTH (pre-registered): disp = displacement in ATR · relVol = mean volume of bars j+1..j+3 ÷ mean volume of the 20 bars before j.
//   STRONG ⇔ disp ≥ 2.5 (relVol ≥ 1.5 was dropped 2026-10-17: spot v is a quote count — docs/VOLUME_AUDIT_RESULTS.md).
// ════════════════════════════════════════════════════════════════════════════════
export const OB_RULE = Object.freeze({ k: 3, disp: 1.5, strongDisp: 2.5, strongVol: 1.5, volBars: 20 })

/** The OB whose candle is bar j (needs bars j+1..j+K closed) or null: { j, up, top, bot, atr, disp, relVol, strong, knownIdx }. */
export function orderBlockAt(B, A, j) {
  const K = OB_RULE.k, a = A[j]; if (j < OB_RULE.volBars || j + K >= B.length || !(a > 0)) return null
  const b = B[j], last = B[j + K]
  let hh = -Infinity, ll = Infinity, vs = 0, vi = 0
  for (let k = j + 1; k <= j + K; k++) { hh = Math.max(hh, B[k].h); ll = Math.min(ll, B[k].l); vi += B[k].v || 0 }
  for (let k = j - OB_RULE.volBars; k < j; k++) vs += B[k].v || 0
  const up = b.c < b.o && last.c > b.h, dn = b.c > b.o && last.c < b.l; if (!up && !dn) return null
  const disp = (up ? hh - b.l : b.h - ll) / a; if (disp < OB_RULE.disp) return null
  const relVol = vs > 0 ? (vi / K) / (vs / OB_RULE.volBars) : 0
  // VOLUME DROPPED 2026-10-17 (Ashraf approved the volume audit, docs/VOLUME_AUDIT_RESULTS.md §5): relVol reads spot `v` (a quote count, not
  // volume), so STRONG = displacement only. relVol is still returned for the record only.
  return { j, up, top: b.h, bot: b.l, atr: a, disp, relVol, strong: disp >= OB_RULE.strongDisp, knownIdx: j + K }
}
