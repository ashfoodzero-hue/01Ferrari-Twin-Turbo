// ════════════════════════════════════════════════════════════════════════════════
// fvg.js — FAIR VALUE GAP detection + the "STRONG" rule (2026-10-09). ONE place for study_fvg_strong.mjs and the chart (/api/fvg).
// ────────────────────────────────────────────────────────────────────────────────
// FVG at bar i (closed): BULLISH when low[i] > high[i−2] → zone [high[i−2], low[i]]; BEARISH when high[i] < low[i−2] → zone [high[i], low[i−2]].
// STRONG (Ashraf's "valid strong FVG", pre-registered in study_fvg_strong.mjs) ⇔ BIG zone ≥ 0.5·ATR14 AND displacement: middle candle body
// ≥ 1.5·ATR14 AND the 1h + 4h EMA 20/50/200 stacks both agree
// with the gap's direction at its known time (trendAt supplied by the caller — closed bars only). [activity s2 = middle-candle v ≥ 1.5 × 20-bar mean is kept as a record only — dropped from STRONG 2026-10-17]
// MEASURED (fvg_strong_study.json, 13 y): no strong FVG bounces better than a random level by a margin that pays; none reaches 95 %.
// ════════════════════════════════════════════════════════════════════════════════
export const FVG_RULE = Object.freeze({ big: 0.5, body: 1.5, activity: 1.5, activityBars: 20 })

/** The FVG formed at bar i (or null): { i, up, top, bot, size, big, s1, s2, s3, strong }. A = ATR14 array; trendAt(tf, T) → 'BULL'|'BEAR'|… */
export function fvgAt(B, A, i, knownT, trendAt) {
  const a = A[i]; if (i < FVG_RULE.activityBars + 2 || !(a > 0)) return null
  const bull = B[i].l > B[i - 2].h, bear = B[i].h < B[i - 2].l; if (!bull && !bear) return null
  const top = bull ? B[i].l : B[i - 2].l, bot = bull ? B[i - 2].h : B[i].h, mid = B[i - 1]
  let vs = 0; for (let k = i - FVG_RULE.activityBars - 1; k < i - 1; k++) vs += B[k].v || 0
  const big = top - bot >= FVG_RULE.big * a, s1 = Math.abs(mid.c - mid.o) >= FVG_RULE.body * a, s2 = (mid.v || 0) >= FVG_RULE.activity * (vs / FVG_RULE.activityBars)
  const want = bull ? 'BULL' : 'BEAR', s3 = trendAt ? trendAt('1h', knownT) === want && trendAt('4h', knownT) === want : null
  // VOLUME DROPPED 2026-10-17 (Ashraf approved the volume audit, docs/VOLUME_AUDIT_RESULTS.md §5): s2 reads spot `v` (a quote count, not volume),
  // so STRONG no longer requires it. s2 is still returned for the record only.
  return { i, up: bull, top, bot, size: top - bot, atr: a, big, s1, s2, s3, strong: big && s1 && s3 === true }
}
