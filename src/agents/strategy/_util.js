// ════════════════════════════════════════════════════════════════════════════════
// strategy/_util.js — shared helpers for anticipatory setups (R4 ahead-of-time).
// Ashraf Ferrari Turbo 2 — AI Trading. P3 Strategy agent (2026-06-24).
// ════════════════════════════════════════════════════════════════════════════════

const r3 = (x) => +Number(x).toFixed(3)
export const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x))

/** Dealing-range equilibrium (premium/discount split) from the look-ahead-free profile. */
export function equilibrium(q) {
  const vp = q.volume_profile
  if (vp && vp.lo != null && vp.hi != null && vp.hi > vp.lo) return (vp.lo + vp.hi) / 2
  return null
}

/** Nearest active resistance strictly above / support strictly below a price. */
export function nearestResistance(q, price) {
  let best = null
  for (const l of q.levels) if (l.price > price && (!best || l.price < best.price)) best = l
  return best
}
export function nearestSupport(q, price) {
  let best = null
  for (const l of q.levels) if (l.price < price && (!best || l.price > best.price)) best = l
  return best
}

/**
 * Validate + package an armed setup. ENFORCES R4: the entry must be a limit the price has
 * NOT yet reached (UP → entry below price; DOWN → entry above), with sl/entry/tp geometry
 * correct and a minimum reward:risk. Returns null if any guard fails (so a setup can never
 * emit a reactive / un-fillable plan).
 */
export function mkArmed({ direction, setup, entry, sl, tp, score, confidence, s, evidence = [], owns = [], minRr = 1.0, maxLeadAtr = 4 }) {
  const up = direction === 'UP'
  if (!(s.atr > 0) || s.price == null) return null
  if (up && !(sl < entry && entry < tp)) return null
  if (!up && !(tp < entry && entry < sl)) return null
  if (up && !(entry < s.price)) return null          // ahead-of-time: limit below current price
  if (!up && !(entry > s.price)) return null          // ahead-of-time: limit above current price
  const rr = Math.abs(tp - entry) / Math.abs(entry - sl)
  if (!(rr >= minRr)) return null
  const leadAtr = Math.abs(s.price - entry) / s.atr
  if (leadAtr > maxLeadAtr) return null               // too far → limit won't realistically fill
  return {
    setup, direction,
    plan: { entry: r3(entry), sl: r3(sl), tp: r3(tp) },
    rr: +rr.toFixed(2),
    score: clamp(score), confidence: clamp(confidence),
    lead: { atr: +leadAtr.toFixed(2), dollars: +Math.abs(s.price - entry).toFixed(2) },
    evidence: [...evidence, { label: 'plan_entry', value: r3(entry), weight: 1 }, { label: 'plan_sl', value: r3(sl), weight: 1 }, { label: 'plan_tp', value: r3(tp), weight: 1 }, { label: 'lead_atr', value: +leadAtr.toFixed(2), weight: 1 }],
    owns,
  }
}
