// independent_resolver.mjs — the AUDIT's second trade resolver, written from the rules (not calling ferrariMatrix.resolveMatrixTrade), 2026-10-22.
// Rules: BUY fills at entry + spread, SELL at entry (bid); SELL exits compare bid + spread; stop first inside a minute (slip min(0.30, 0.05·atr));
// half at TP1 then stop to the fill price; half at TP2; open at the 24 h horizon → closed at the market less slip. Used by audit_matrix_aligned.mjs and
// audit_scalp_v2.mjs: 0 differences against the live resolver = the money path is priced right.
import { MATRIX } from '../../src/master/ferrariMatrix.js'

export function resolveIndependent(s, m1, spreadAt, horizonMin = MATRIX.horizonMin) {   // horizonMin = the time stop (2026-10-24; default 24 h)
  const buy = s.side === 'BUY', fill = buy ? s.entry + spreadAt(s.decisionT - 60000) : s.entry, slip = Math.min(0.30, 0.05 * (s.atr || 0)), end = s.decisionT + horizonMin * 60000
  const gain = (px) => (buy ? px - fill : fill - px); let stop = s.sl, half1 = null, half2 = null, tp1 = false, lastBar = null, next = null
  for (const m of m1) { if (m.t < s.decisionT) continue; if (m.t >= end) { next = m; break } lastBar = m
    const sp = buy ? 0 : spreadAt(m.t), hi = m.h + sp, lo = m.l + sp
    if (buy ? lo <= stop : hi >= stop) { const px = buy ? stop - slip : stop + slip; if (half1 == null) half1 = gain(px); half2 = gain(px); break }
    if (!tp1 && (buy ? hi >= s.tp1 : lo <= s.tp1)) { tp1 = true; half1 = gain(s.tp1); stop = fill }
    if (tp1 && (buy ? hi >= s.tp2 : lo <= s.tp2)) { half2 = gain(s.tp2); break } }
  if (half2 == null && lastBar && lastBar.t + 60000 >= end) { const px = buy ? lastBar.c : lastBar.c + spreadAt(lastBar.t); if (half1 == null) half1 = gain(px) - slip; half2 = gain(px) - slip }
  // the horizon passed while the market was closed (weekend): out at the first price after it — the reopening bar's open (2026-10-26)
  else if (half2 == null && next) { const px = buy ? next.o : next.o + spreadAt(next.t); if (half1 == null) half1 = gain(px) - slip; half2 = gain(px) - slip }
  return half1 == null || half2 == null ? null : +(0.5 * half1 + 0.5 * half2).toFixed(4)
}
