// ════════════════════════════════════════════════════════════════════════════════
// proSignal.js — the PROFESSIONAL A+ structural SWING signal. 🏆 THE ONE SURVIVING EDGE. (R3/R6/R8.)
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading (2026-06-28). /ULTRADEEPTHINK discovery, validated.
//
// ⚠ PROMOTED 2026-07-17: this header used to call it "the deflation-clean SECOND edge... additive to the MICRO,
// never replaces it". There is no first edge to be second to any more. **The MICRO is REFUTED** — its $0.25 target
// sat UNDER the $0.30 spread, so it lost at a 100% win rate; the tiny TP that bought the 97% is exactly what killed
// it. **SWEEP_DIVERGENCE is REFUTED** — 89.34% of its fills landed inside the confirmation bar (look-ahead).
// PRO_SWING is the only tier that survived the causal-fill audit (2026-07-17, `src/core/outcomeResolver.js`:
// `resolveManagedLimit` fills from bar i+1, never inside the signal bar; stop-first; BE arms only after the bar
// resolves; costs modeled) — plus DIAMOND_SWING at ~8/yr. See docs/SIGNAL_MAP.md (generated; the only trustworthy
// statement of what ships).
//
// 🚨 AND READ THIS BEFORE QUOTING THE 89%: the 89% is NOT the edge. `sl 2·ATR / tp 0.5R` is 2:1 AGAINST (breakeven
// 66.7%) and BE-scratch converts losers to scratches — the same WR-flattering shape that made the MICRO look like a
// 97% machine. **The edge is the +$1.21/trade OOS (n=2,653).** This tier lives where the MICRO died for exactly one
// reason: its 1·ATR target (MEASURED $8.15 today / $9.96 on the 1y-avg 15m ATR) sits ~27x OUTSIDE the $0.30 spread. Geometry, not win rate, is what pays.
//
// A+ structural entry
// (displaced/sweep setup [fvg_continuation·ob_discount_tap·sweep_reclaim] · grade A/B = HTF 1h+4h aligned +
// discount/premium side · inside a London/NY KILLZONE) managed with BREAK-EVEN/SCRATCH (arm BE at +0.2R →
// reversals scratch flat, not loss) at 2-ATR stop / 0.5-R target. VALIDATED 23y look-ahead-free, cost-adj:
//   decisive WR ~89% (LB 87%) · +$0.9/trade net · ~0.75/day · POSITIVE both directions in EVERY regime
//   (bull/bear/range/high-vol) · TRAIN +$0.64 & OOS +$1.5-2.0/t · DSR 1.000 · PBO 0% (pro_deflated + pro_regime).
// A SWING tier — never relabeled as 97% (it's ~89% DECISIVE, i.e. excluding scratches). It was once described as
// "ADDITIVE to the MICRO — never replaces it"; that framing died with the MICRO on 2026-07-17.
// Look-ahead-free (candidates from query(at)). Pure detection; the engine resolves/journals it.
// ════════════════════════════════════════════════════════════════════════════════
import { generateCandidates } from '../agents/strategy/search.js'
import { makeAgentSignal, makeDataHealth } from '../core/agentContract.js'
import { prepareQuality, gradeSetup } from './setupQuality.js'
import { sessionOf } from '../agents/microstructure/marketRegime.js'

export const PRO_CONFIG = Object.freeze({
  setups: Object.freeze(['fvg_continuation', 'ob_discount_tap', 'sweep_reclaim']),
  grades: Object.freeze(['A', 'B']),               // HTF-aligned + right side of range
  killzones: Object.freeze(['LONDON_KZ', 'NY_KZ']),
  slAtr: 2.0, tgtR: 0.5, beTriggerR: 0.2, beLockR: 0,
  // VALIDATED stats (23y, look-ahead-free, cost-adj, regime-robust, two-sided, deflated) — honest, measured.
  validated: Object.freeze({ wr: 0.89, lb: 0.87, avg$: 0.9, perDay: 0.75, regime_robust: true, two_sided: true, deflated: 'DSR 1.000 · PBO 0%', basis: 'A+ structural + break-even/scratch' }),
})
const KZ = new Set(PRO_CONFIG.killzones), GR = new Set(PRO_CONFIG.grades), SU = new Set(PRO_CONFIG.setups)

const neutral = (tsUtc, reason) => {
  const s = makeAgentSignal({ agent: 'pro_swing', tf: '15m', direction: 'NEUTRAL', score: 0, confidence: 0, evidence: [{ label: 'reason', value: reason, weight: 0 }], dataHealth: makeDataHealth([{ name: 'bars', age_s: 0, fresh: true }]), tsUtc })
  s.plan = null; s.tier = 'PRO_SWING'; s.validated = null; return s
}

/** Build the BE-managed plan + contract signal for one A+ candidate. PURE. */
export function buildProSignal(cand, tsUtc) {
  const up = cand.direction === 'UP', risk = PRO_CONFIG.slAtr * cand.atr
  const sl = +(up ? cand.entry - risk : cand.entry + risk).toFixed(3)
  const tp = +(up ? cand.entry + PRO_CONFIG.tgtR * risk : cand.entry - PRO_CONFIG.tgtR * risk).toFixed(3)
  const conf = Math.round(PRO_CONFIG.validated.lb * 100)
  const sig = makeAgentSignal({
    agent: 'pro_swing', tf: '15m', direction: cand.direction, score: conf, confidence: conf,
    evidence: [
      { label: 'setup', value: `${cand.setup} (A+ structural)`, weight: 1 },
      { label: 'grade', value: cand.grade, weight: 1 },
      { label: 'killzone', value: cand.kz, weight: 1 },
      { label: 'management', value: 'break-even/scratch @0.2R', weight: 1 },
    ],
    dataHealth: makeDataHealth([{ name: 'bars', age_s: 0, fresh: true }]), tsUtc,
  })
  sig.plan = { type: 'maker_limit_managed', entry: cand.entry, sl, tp, slAtr: PRO_CONFIG.slAtr, tgtR: PRO_CONFIG.tgtR, beTriggerR: PRO_CONFIG.beTriggerR, beLockR: PRO_CONFIG.beLockR, atr: +cand.atr.toFixed(3) }
  sig.tier = 'PRO_SWING'
  sig.validated = { ...PRO_CONFIG.validated }
  return sig
}

/** Every A+ setup ARMED within the last `freshBars` bars (look-ahead-free).
 *  `rawOut` (optional array): receives every fresh RAW candidate (atr>0, no setup/grade/KZ filter) — the
 *  frontier-candidate paper recorder's stream (Gate D). Additive: passing it changes nothing else. */
export function findProSetups(bars, at, { freshBars = 6, rawOut = null } = {}) {
  const visible = bars.filter((b) => b.t <= at)
  if (visible.length < 250) return []
  // ⛔ DO NOT PASS `fromIdx` HERE. It was tried on 2026-07-17 to cut this call from 235s to 240ms, it FAILED the
  // equivalence measurement (1 real mismatch: the full scan found `fvg_continuation DOWN`, the bounded scan found
  // NOTHING), and it is then PROVABLY unsound — not mis-tuned, unfixable:
  //
  //   generateCandidates suppresses a repeat key within `cooldown` (8) bars — and CRUCIALLY, a suppressed bar does
  //   NOT update `lastSeen`. So the full scan's lastSeen can be OLDER than a bounded scan's, and an older lastSeen
  //   EMITS where a newer one suppresses. Counter-example, cooldown 8, key at bars 6518/6524/6530:
  //     full  (start 0)    → 6518 emit (lastSeen=6518) · 6524 gap 6 <8 SUPPRESS (lastSeen STAYS 6518) · 6530 gap 12 → EMIT
  //     bounded (start 6519) →                            6524 emit (lastSeen=6524) · 6530 gap 6 <8 → SUPPRESS
  //   Bar 6530: the full scan takes the trade, the bounded scan does not. And for a key recurring on every bar the
  //   emit LATTICE PHASE is fixed by the first occurrence the scan sees — shift the start one bar, shift every
  //   later emit. The phase depends on all prior history, so the required lookback is UNBOUNDED.
  //
  // The lesson is bigger than the bug: a PASSING equivalence sample would NOT have made this safe, because the
  // failure depends on key-recurrence density at whichever bars you happen to sample. Sampling could only ever
  // find the bug, never prove its absence. The counter-example settles it.
  //
  // The cost is real (235s on 26k bars: ingest is only 333ms, but wm.query is 19ms × every bar). It is paid the
  // honest way — the roster runs on its own cadence with its own budget, the same pattern liveEngine.mjs already
  // uses for the 105s signal engine. Slow and correct beats fast and silently different.
  // includeLastBar (2026-08-19): `visible` is closed bars only. The generator's default stops one bar short as a
  // safety margin against a forming bar; paying that margin here costs the live book the first fill bar the
  // backtest legitimately uses — measured on IMPULSE_CONT as 73.59% WR / +$0.353 (SHIP) → 62.14% / +$0.096 with a
  // negative CI lower bound (SHADOW). Proven causal in smoke_include_last_bar (25/25 full-object perturbation).
  const { candidates } = generateCandidates(visible, { includeLastBar: true })
  if (!candidates?.length) return []
  const prep = prepareQuality(visible)
  const lastIdx = visible.length - 1
  const out = []
  for (const c of candidates) {
    if (c.i == null || c.i < lastIdx - freshBars || c.atr <= 0) continue
    if (rawOut) rawOut.push(c)                       // raw fresh stream for the frontier recorder — BEFORE tier filters
    if (!SU.has(c.setup)) continue
    const grade = gradeSetup(c, prep).grade
    if (!GR.has(grade)) continue
    const kz = sessionOf(c.t).killzone
    if (!KZ.has(kz)) continue
    out.push({ ...c, grade, kz })
  }
  return out
}

/** The latest A+ PRO_SWING signal as-of the last bar (≤ now), else NEUTRAL. */
export function latestProSignal(bars, { freshBars = 6 } = {}) {
  const tsUtc = bars.length ? new Date(bars.at(-1).t).toISOString() : new Date(0).toISOString()
  if (!bars || bars.length < 250) return neutral(tsUtc, 'insufficient bars')
  const setups = findProSetups(bars, bars.at(-1).t, { freshBars })
  if (!setups.length) return neutral(tsUtc, 'no A+ structural setup armed in a killzone')
  return buildProSignal(setups[setups.length - 1], tsUtc)   // the freshest
}

/** Compact card for cockpit/Telegram. */
export function proSignalCard(sig) {
  return { agent: 'pro_swing', tier: 'PRO_SWING', direction: sig.direction, confidence_pct: sig.confidence, plan: sig.plan ?? null, validated: sig.validated ?? null, health: sig.data_health.ok ? 'OK' : 'GATED', ts_utc: sig.ts_utc }
}
