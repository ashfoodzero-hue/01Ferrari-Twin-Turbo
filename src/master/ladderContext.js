// ladderContext.js — the swing study's flip ladder, LIVE, as INFORMATION only (2026-10-17; docs/LADDER_CONTEXT_SPEC.md; source: docs/SWING_STUDY_BOOK.md §5B).
// For each anchor timeframe: its current leg's running extreme (the study's 3×ATR ZigZag), which lower timeframes have CONFIRMED a swing at exactly that
// price (the study's exact-price rule), and the study's OOS odds for the deepest flipped step — quoted from data/master/swing_ladder_atlas.json, never
// recomputed. CLOSED candles only (a lower timeframe "flipped" only once its confirming candle has closed). The trade tests found NO entry edge (0/60).
import { buildCandles, candleOpen } from '../core/nyCandles.js'
import { zigzag } from './swings.js'
import { indexSwings, flipAt } from '../../scripts/lib/swing_ladder.mjs'

export const LADDER_STEPS = Object.freeze({ '15m': ['1m', '3m', '5m'], '1H': ['5m', '15m', '30m'], '4H': ['1H', '2H', '3H'], '1D': ['4H', '6H', '9H'] })   // three, two, one step below
export const WINDOW_DAYS = Object.freeze({ '15m': 120, '1H': 120, '4H': 400, '1D': 1460 })
export const FOOTER = 'ⓘ information only — the study\'s trade tests found NO profitable entry from this (0 of 60, book §5F-5H)'

/** Closed candles of `tf` from 1m bars at time `now` (drops the bucket still forming at `now`). */
export function closedCandles(m1, tf, now) { const C = buildCandles(m1, tf), cur = candleOpen(now, tf); return C.length && C.at(-1).t === cur ? C.slice(0, -1) : C }
/**
 * Ladder state of one anchor at `now`. m1 = cleaned 1m bars (closed minutes ≤ now), sliced to the anchor's window. atlas = swing_ladder_atlas.json.
 * @returns { anchor, leg: 'down'|'up'|null, side: 'L'|'H', extreme, extreme_t, steps: [{ tf, flipped, flipT }], deepest, odds: {…}, last_confirmed }
 */
export function ladderState(m1, anchor, now, atlas) {
  const bars = m1.filter((b) => b.t + 60000 <= now)
  const CA = closedCandles(bars, anchor, now), A = zigzag(CA, { k: 3 }).swings
  const last = A.at(-1); if (!last) return { anchor, leg: null, why: 'no confirmed anchor swing yet' }
  const leg = last.type === 'H' ? 'down' : 'up', side = leg === 'down' ? 'L' : 'H'
  // running extreme since the last confirmed anchor swing's extreme candle opened (1m data up to now — the study's live-trigger rule)
  const t0 = CA[last.i].t; let ext = null, extT = null
  for (const b of bars) { if (b.t < t0) continue; if (side === 'L' ? (ext == null || b.l < ext) : (ext == null || b.h > ext)) { ext = side === 'L' ? b.l : b.h; extT = b.t } }
  if (ext == null) return { anchor, leg, why: 'no minutes in the leg yet' }
  const a0 = candleOpen(extT, anchor), a1 = Math.max(now, a0 + 60000)   // the anchor candle holding the extreme (may still be forming)
  const steps = LADDER_STEPS[anchor].map((tf) => { const C = closedCandles(bars, tf, now), idx = indexSwings(C, zigzag(C, { k: 3 }).swings), f = flipAt(idx, side, ext, a0, a1)
    return { tf, flipped: f != null && f <= now, flipT: f != null && f <= now ? f : null } })
  const deepest = [...steps].reverse().find((s) => s.flipped)?.tf ?? null
  const S = atlas?.anchors?.[anchor]?.sides?.[side], ev = deepest ? S?.evidence?.find((e) => e.key === deepest) : null, base = S?.evidence?.[0]?.O?.base ?? null
  const odds = { base, p_real: ev ? ev.O.p_real_given_flip : null, n: ev ? ev.O.n_flipped : null, verdict: ev ? ev.verdict : null, lead_min: ev ? ev.O.lead_min_median : null,
    label: !deepest ? 'no ladder step flipped yet' : ev?.verdict === 'NO_EVIDENCE' || ev?.verdict === 'INCONSISTENT' ? 'no evidence' : ev?.verdict === 'DESCRIBED_ONLY' ? 'n small' : 'proven (OOS + TRAIN)' }
  return { anchor, leg, side, extreme: ext, extreme_txt: ext.toFixed(2), extreme_t: new Date(extT).toISOString(), anchor_candle: new Date(a0).toISOString(), steps, deepest, odds,
    last_confirmed: { type: last.type, px: last.px, at: new Date(CA[last.knownI].close_t).toISOString() }, footer: FOOTER }
}
