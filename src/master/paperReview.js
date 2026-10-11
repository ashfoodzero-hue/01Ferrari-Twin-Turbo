// ════════════════════════════════════════════════════════════════════════════════
// paperReview.js — the ONE vocabulary for judging paper fires (2026-09-06).
// ────────────────────────────────────────────────────────────────────────────────
// WHY: promotion_review.mjs recognised a scratch only as "STOPPED with pnl ≥ 0" (the representation before the
// paper trader gained state:'SCRATCH'), so EVERY break-even exit vanished from "resolved" — IMPULSE_CONT read
// "2 resolved" with 9 completed trades — and a scratch carrying −0.67R (the 09-08 exit-path defect) could never
// reach the scoreboard. A state name that means two things is a bug (SIGNAL_MAP vocabulary rule); this module
// is the single classifier every review must import. REPORT-ONLY helpers; nothing here changes state.
// ════════════════════════════════════════════════════════════════════════════════
import { mulberry32 } from '../core/rng.js'

/** A scratch worse than this fraction of risk is not a scratch — it is an exit-path defect to investigate. */
export const SCRATCH_ANOMALY_R = -0.25
/** Realised cost per trade the artifact's net figure implies (BE20 gate, exit-aware: maker entry, taker exit). */
export const REALISED_COST_USD = 0.229
/** The promotion bar: resolved fires a paper book needs before review (one constant — the cockpit's progress
 *  string, the page's "needs N more" and promotion_review all read THIS, 2026-09-07). */
export const PROMOTION_MIN_FIRES = 50

/** A CONFIRMED FIRE: a journal row that was not refused and carries an entry (2026-09-07 — this predicate existed
 *  in four consumers; one definition, so "fires" can never mean four things). */
export const isFire = (r) => !!r && r.state !== 'REFUSED' && r.entry != null

/** WIN | SCRATCH | LOSS | FLAT (timeout ≥ 0) | null (not resolved). Both representations of a scratch are recognised. */
export function classifyFire(r) {
  if (!r || r.state === 'REFUSED' || r.entry == null) return null
  if (r.state === 'TARGET') return 'WIN'
  if (r.state === 'SCRATCH') return 'SCRATCH'
  if (r.state === 'STOPPED') return (r.pnl ?? -1) >= 0 ? 'SCRATCH' : 'LOSS'
  if (r.state === 'TIMEOUT') return (r.pnl ?? 0) < 0 ? 'LOSS' : 'FLAT'
  return null
}
export const isResolved = (r) => classifyFire(r) != null
/** Exit-path anomaly: a "scratch" that lost more than |SCRATCH_ANOMALY_R|·risk, or a "win" with negative P&L. */
export function anomalyOf(r) {
  const c = classifyFire(r); if (!c || r.risk == null || r.pnl == null) return null
  if (c === 'SCRATCH' && r.pnl < SCRATCH_ANOMALY_R * r.risk) return `SCRATCH at ${(r.pnl / r.risk).toFixed(2)}R (exit path — see paper_be_audit)`
  if (c === 'WIN' && r.pnl < 0) return 'TARGET with negative P&L'
  return null
}

/**
 * Is the trial's realised P&L consistent with the artifact's outcome distribution?
 * Draws each taken trade's outcome from {win, scratch, loss} with the artifact probabilities, pays
 * tgtR·risk / beLockR·risk / −risk minus the realised cost, and returns P(sum ≤ observed) — a one-sided p that
 * says how often the artifact itself would produce a run this bad. Small p = breakage watch; it is NOT a
 * confirmation of the edge at any n (that needs the ≥50 bar and Wilson).
 */
export function onTrackTest(taken, outcomes, geometry, { cost = REALISED_COST_USD, draws = 10000, seed = 12345, pnlOf = (r) => r.pnl } = {}) {
  const xs = taken.filter((r) => r.risk > 0 && pnlOf(r) != null)
  if (xs.length < 3 || !outcomes) return { n: xs.length, p: null, observed: null, expected: null }
  const observed = xs.reduce((s, r) => s + pnlOf(r), 0)
  const pw = outcomes.p_win ?? outcomes.win, ps = outcomes.p_scratch ?? outcomes.scratch, pl = outcomes.p_loss ?? outcomes.loss
  const tgtR = geometry?.tgt_r ?? 0.5, beL = geometry?.be_lock_r ?? 0.1
  const exp = xs.reduce((s, r) => s + (pw * tgtR * r.risk + ps * beL * r.risk - pl * r.risk - cost), 0)
  const rng = mulberry32(seed); let below = 0
  for (let d = 0; d < draws; d++) { let sum = 0
    for (const r of xs) { const u = rng(); sum += (u < pw ? tgtR * r.risk : u < pw + ps ? beL * r.risk : -r.risk) - cost }
    if (sum <= observed) below++ }
  return { n: xs.length, observed: +observed.toFixed(2), expected: +exp.toFixed(2), p: +(below / draws).toFixed(4), cost }
}


/**
 * THE VALIDATOR'S OWN COUNTING RULE (2026-09-09). validate_impulse_cont_ship.mjs admits ONE trade at a time per fold
 * (`nextFree`): a new candidate is skipped while the previous trade is unresolved; a NOFILL neither blocks nor counts.
 * The live recorder journals EVERY signal (evidence — 8 of IMPULSE_CONT's first 15 fires overlapped a live trade,
 * 6 were no-fills), so raw "fires" run ~2.7× the validated rate and "resolved" counts trades the backtest would have
 * skipped. Promotion must be scored on the validated book's semantics: this replays the rule over the journal.
 * @returns {{ accepted: object[], overlapped: object[] }}  accepted = the sequential, validator-equivalent series
 */
export function sequentialFires(rows, tier) {
  const fires = rows.filter((r) => r.tier === tier && isFire(r)).sort((a, b) => a.t - b.t)
  const accepted = [], overlapped = []
  let busyUntil = -Infinity
  for (const r of fires) {
    if (r.t < busyUntil) { overlapped.push(r); continue }
    accepted.push(r)
    if (r.state === 'EXPIRED' || (r.state !== 'PENDING' && r.state !== 'OPEN' && !r.filledAt)) continue     // no fill: never blocks (validator: NOFILL → continue)
    if (r.state === 'PENDING' || r.state === 'OPEN') { busyUntil = Infinity; continue }                       // unresolved: blocks until it ends
    const end = r.closedAt ?? r.resolvedAt ?? r.expiredAt ?? null
    busyUntil = end != null ? end : r.t + 64 * 900_000                                                           // the validator's 64-bar horizon as the fallback
  }
  return { accepted, overlapped }
}

// 🔥 DENSE SUB-BOOK (2026-09-26, record-only). study_density_gate.mjs: IMPULSE_CONT on days with causal big-move density ≥ 6 earned
// $0.87/t vs $0.35/t (8/8 folds, viable at the measured spread), but the lift over the whole book is NOT powered — so the forward
// trial measures it: the sub-book is the sequential series of the fires that carry a readiness stamp with dens30 ≥ DENSE_GATE,
// judged with the same lane rule (the gate is applied BEFORE the lane, exactly as the study did). Never a gate, never a size.
// ERA-NEUTRAL (study_density_gate_relative, same day): the absolute dens30 scales with the price level (0% of 2017-18 trades were
// "dense ≥ 6", 100% of 2026's; the live gauge reads 54) — an absolute gate never switches off today. The sub-book key is therefore
// dens_rel = dens30 / its trailing-1y median, gate ≥ 1.5 (the pre-registered cell: TRAIN $0.29 vs $0.20, 8/8 folds, within-era
// lift +$0.10/t in 6/9 years — unpowered, hence record-only).
export const DENSE_GATE = 1.5
export const isDense = (r) => r?.readiness?.dens_rel != null && r.readiness.dens_rel >= DENSE_GATE
export function subBookReview(rows, tier, { minFires = PROMOTION_MIN_FIRES } = {}) {
  const fires = rows.filter((r) => r.tier === tier && isFire(r))
  const stamped = fires.filter((r) => r.readiness?.dens_rel != null)
  const seq = sequentialFires(rows.filter((r) => r.tier !== tier || isDense(r)), tier)   // the dense stream only, lane rule inside it
  const sres = seq.accepted.filter(isResolved); const c = (k) => sres.filter((r) => classifyFire(r) === k).length
  return { gate: `dens30 ≥ ${DENSE_GATE}× its 1y median`, record_only: true, stamped: stamped.length, unstamped: fires.length - stamped.length, fires: seq.accepted.length, overlapped: seq.overlapped.length, resolved: sres.length, W: c('WIN'), SC: c('SCRATCH'), L: c('LOSS'), progress: `${sres.length}/${minFires}`,
    pnl: +sres.filter((r) => r.pnl != null).reduce((s, r) => s + r.pnl, 0).toFixed(2), note: 'RECORD ONLY sub-book, never a gate (study_density_gate 2026-09-26): rows before the stamp shipped are unstamped, never counted as dense' }
}

/** Full per-tier review numbers (report-only). corrected = optional map id → corrected pnl (from paper_be_audit). */
export function reviewTier(rows, tier, S, { minFires = PROMOTION_MIN_FIRES, corrected = null } = {}) {
  const fires = rows.filter((r) => r.tier === tier && isFire(r))
  const res = fires.filter(isResolved)
  const cls = (c) => res.filter((r) => classifyFire(r) === c)
  const W = cls('WIN').length, SC = cls('SCRATCH').length, L = cls('LOSS').length, FL = cls('FLAT').length
  const anomalies = res.map((r) => ({ id: r.id, t: r.t, why: anomalyOf(r) })).filter((a) => a.why)
  const taken = res.filter((r) => r.pnl != null)
  const pnlOf = corrected ? (r) => (corrected.has(r.id) ? corrected.get(r.id) : r.pnl) : (r) => r.pnl
  // the reference distribution must be the one the trial's own exit rule produces (2026-09-14): the paper trader pays the
  // EA's lock semantics, so a tier that carries `outcomesTraded` (the frozen set re-resolved under that rule) is tested
  // against it; `outcomes` (the shipped 'level' artifact) remains the fallback and the promotion citation.
  const onTrackBasis = S?.outcomesTraded ? 'traded' : 'level'
  const outcomes = S?.outcomesTraded ?? S?.outcomes ?? null
  const onTrack = onTrackTest(taken, outcomes, S?.geometry ?? null)
  const onTrackCorrected = corrected ? onTrackTest(taken, outcomes, S?.geometry ?? null, { pnlOf }) : null
  const shares = res.length ? { win: +(W / res.length).toFixed(3), scratch: +(SC / res.length).toFixed(3), loss: +(L / res.length).toFixed(3) } : null
  const seq = sequentialFires(rows, tier); const sres = seq.accepted.filter(isResolved); const scls = (c) => sres.filter((r) => classifyFire(r) === c).length
  // the on-track P&L test also runs on the validator-equivalent series — the raw set includes stacked entries the artifact never priced
  const onTrackSequential = onTrackTest(sres.filter((r) => r.pnl != null), outcomes, S?.geometry ?? null, corrected ? { pnlOf } : {})
  // PROMOTION PREREQUISITES (2026-09-15): the sequential count AND the EA-rule reference. The trial pays the EA's lock
  // semantics; a tier whose only artifact is the 'level' one has never been priced under the rule it would trade live,
  // so it cannot read READY however many fires it has (study_be_lock_semantics.mjs produces outcomesTraded). A review
  // without a roster entry (S null) is count-only — there is nothing to require of it.
  const readyBlockers = [...(sres.length >= minFires ? [] : [`${minFires - sres.length} more sequential resolved fires`]),
    ...(S && !S.outcomesTraded ? ['no outcomesTraded in TIER_STATS (the EA lock-semantics reference — run study_be_lock_semantics for this book)'] : [])]
  const ready = readyBlockers.length === 0
  // TOUCH-ONLY FILLS (2026-09-16): the recorder stamps fillThroughUsd on every fill; a fill that never traded more than the
  // roster's fill-through tolerance beyond the limit is one a real resting limit may miss — measured ~10× more valuable than
  // the average fill (study_be_lock_semantics). Counted on the sequential series so the desk sees the exposure grow with n.
  const fillTol = S?.outcomesTraded?.fillThroughToleranceUsd ?? null
  const measuredFills = seq.accepted.filter((r) => r.filledAt && r.fillThroughUsd != null)
  const touchOnly = fillTol == null ? null : measuredFills.filter((r) => r.fillThroughUsd < fillTol).length
  const fills = { measured: measuredFills.length, touch_only: touchOnly, touch_only_share: fillTol != null && measuredFills.length ? +(touchOnly / measuredFills.length).toFixed(3) : null, tolerance_usd: fillTol }
  const sequential = { fires: seq.accepted.length, overlapped: seq.overlapped.length, resolved: sres.length, W: scls('WIN'), SC: scls('SCRATCH'), L: scls('LOSS'), progress: `${sres.length}/${minFires}`, ready, onTrack: onTrackSequential, fills,
    note: 'validator-equivalent series: one trade at a time, no-fills never block (validate_impulse_cont_ship.mjs nextFree) — the count promotion is scored on' }
  const subBooks = { dense: subBookReview(rows, tier, { minFires }) }
  return { tier, fires: fires.length, resolved: res.length, W, SC, L, FL, progress: `${res.length}/${minFires}`, ready, readyBlockers, sequential, subBooks, shares, anomalies, onTrack, onTrackCorrected, onTrackBasis,
    pnlJournal: +taken.reduce((s, r) => s + r.pnl, 0).toFixed(2), pnlCorrected: corrected ? +taken.reduce((s, r) => s + pnlOf(r), 0).toFixed(2) : null }
}
