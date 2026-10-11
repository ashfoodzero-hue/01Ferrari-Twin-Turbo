// ════════════════════════════════════════════════════════════════════════════════
// promotion_review.mjs — the paper-book PROMOTION REVIEW, as one command (2026-08-09; vocabulary fix 2026-09-06).
// ────────────────────────────────────────────────────────────────────────────────
// REPORT-ONLY. Never changes state, never promotes — promotion to live (EA) is Ashraf's explicit call.
// For each paperOnly book this reads the paper journal and reports:
//   • progress toward the ≥50-resolved-fires bar — a RESOLVED fire is WIN, SCRATCH, LOSS or FLAT (one vocabulary:
//     src/master/paperReview.js; the old review recognised scratches only as "STOPPED pnl≥0" and lost every
//     break-even exit — IMPULSE_CONT read "2 resolved" with 9 completed trades)
//   • observed WIN/SCRATCH/LOSS shares vs the artifact's outcome distribution, and an ON-TRACK test: how often the
//     artifact itself would produce a P&L run this bad (small p = breakage watch, never a confirmation)
//   • EXIT-PATH ANOMALIES: a "scratch" worse than −0.25R or a "win" with negative P&L (the 09-08 defect class)
//   • the BE-audit corrected P&L (Turbo2's audit for inherited rows + the twin's own; journals are never rewritten)
//   • the trial rows = Turbo2's journal (READ-ONLY, the same book — smoke:parity) + the twin's own, merged by id
//     (src/master/trialJournal.js, 2026-10-08)
//   • runtime OVERLAP vs higher-priority books (0.30% entry AND ±6h — the portfolio dedup rule)
// Priority (fixed): SWING_TRADE → TREND_CONT → PULLBACK_CONT → IMPULSE_CONT → BREAK_RETEST → OFFHOURS_REV → H1 → H4.
// Usage: npm run promotion:review   (or node scripts/promotion_review.mjs)
// ════════════════════════════════════════════════════════════════════════════════



import { TIER_STATS } from '../src/master/tierStats.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { reviewTier, isResolved, isFire, PROMOTION_MIN_FIRES } from '../src/master/paperReview.js'
import { loadTrial } from '../src/master/trialJournal.js'

const PRIORITY = ['IMPULSE_CONT']   // Ferrari Twin Turbo: the one validated book
const PAPER_BOOKS = PRIORITY.filter((t) => TIER_STATS[t]?.paperOnly && !TIER_STATS[t]?.shadow)
const SHADOW_BOOKS = PRIORITY.filter((t) => TIER_STATS[t]?.shadow)
const MIN_FIRES = PROMOTION_MIN_FIRES   // one constant, shared with the cockpit's progress/remaining (2026-09-07)
const OVERLAP = { pricePct: 0.003, windowMs: 6 * 3600000 }

// the trial = Turbo2's journal (READ-ONLY, same book — smoke:parity) + the twin's own, merged by id (src/master/trialJournal.js)
const trial = loadTrial(PRIORITY)
const rows = trial.rows
const corrected = trial.corrected

console.log(`\n████ PROMOTION REVIEW — paper books vs the ≥${MIN_FIRES}-fire bar (report-only; promotion = Ashraf's call) ████`)
console.log(`journal: ${rows.length} rows (${trial.sources.inherited} inherited from Turbo2 read-only · ${trial.sources.rescored} inherited fires RE-SCORED on the twin's Polygon bars · ${trial.sources.own} twin) · books under trial: ${PAPER_BOOKS.join(', ') || '(none flagged paperOnly)'}${trial.audits.length ? ` · BE audit ${trial.audits.join(' + ')} (${corrected.size} rows re-resolved, journals untouched)` : ''}\n`)

const firesOf = (tier) => rows.filter((r) => r.tier === tier && isFire(r))
for (const tier of PAPER_BOOKS) {
  const S = TIER_STATS[tier]
  const v = reviewTier(rows, tier, S, { minFires: MIN_FIRES, corrected })
  console.log(`── ${tier} (${S.tf}) — artifact: WR ${(100 * S.wr).toFixed(1)}% · outcomes win ${(100 * S.outcomes.win).toFixed(0)}% / scratch ${(100 * S.outcomes.scratch).toFixed(0)}% / loss ${(100 * S.outcomes.loss).toFixed(1)}% · ${S.perYear}/yr · ${S.source}`)
  console.log(`   paper: ${v.fires} fires · ${v.resolved} resolved (${v.W}W/${v.SC}S/${v.L}L${v.FL ? `/${v.FL} flat` : ''}) · progress ${v.progress}${v.shares ? ` · shares win ${v.shares.win} / scratch ${v.shares.scratch} / loss ${v.shares.loss}` : ''}`)
  console.log(`   sequential (the validator's one-at-a-time rule — what promotion is scored on): ${v.sequential.fires} fires (${v.sequential.overlapped} overlapped, skipped) · ${v.sequential.resolved} resolved (${v.sequential.W}W/${v.sequential.SC}S/${v.sequential.L}L) · progress ${v.sequential.progress}${v.sequential.fills?.tolerance_usd != null && v.sequential.fills.measured ? ` · touch-only fills ${v.sequential.fills.touch_only}/${v.sequential.fills.measured} (< $${v.sequential.fills.tolerance_usd} through — the ones a resting limit may miss)` : ''}${v.sequential.onTrack && v.sequential.onTrack.p != null ? ` · on-track (sequential): observed $${v.sequential.onTrack.observed} vs expected $${v.sequential.onTrack.expected} (n ${v.sequential.onTrack.n}, p ${v.sequential.onTrack.p})` : ''}`)
  console.log(`   P&L: journal $${v.pnlJournal}${v.pnlCorrected != null ? ` · BE-audit corrected $${v.pnlCorrected}` : ''} · on-track test vs the ${v.onTrackBasis === 'traded' ? 'EA-semantics (traded) distribution' : "artifact's (level) distribution"}: observed $${v.onTrack.observed} vs expected $${v.onTrack.expected} (n ${v.onTrack.n}, P(this bad or worse) = ${v.onTrack.p})${v.onTrackCorrected ? ` · corrected: $${v.onTrackCorrected.observed}, p ${v.onTrackCorrected.p}` : ''}`)
  const d = v.subBooks?.dense; if (d) console.log(`   🔥 dense sub-book (${d.gate}, record-only — never a gate): ${d.fires} fires · ${d.resolved} resolved (${d.W}W/${d.SC}S/${d.L}L) · P&L $${d.pnl} · stamped ${d.stamped}/${d.stamped + d.unstamped} rows (rows before 2026-09-26 carry no stamp)`)
  if (v.onTrack.p != null && v.onTrack.p < 0.05) console.log(`   🚨 BREAKAGE WATCH — the artifact would produce a run this bad <5% of the time; diagnose (fills, exits, cost) before trusting the trial`)
  if (v.anomalies.length) { console.log(`   🚨 EXIT-PATH ANOMALIES (${v.anomalies.length}): ` + v.anomalies.map((a) => `${new Date(a.t).toISOString().slice(0, 16)} ${a.why}${corrected?.has(a.id) ? ` → BE audit re-resolves to $${corrected.get(a.id)}` : ''}`).join(' · ')) }
  if (!v.ready) console.log(`   ⏳ NOT READY — ${v.readyBlockers.join(" · ")} (~${S.perDay > 0 ? Math.ceil((MIN_FIRES - v.sequential.resolved) / S.perDay) : '?'} trading days at the 23y rate). No promotion statistics until then.`)
  else {
    const dec = v.W + v.L, wr = dec ? v.W / dec : null, lb = dec ? wilsonLowerBound(v.W, dec) : null, lossRate = v.resolved ? v.L / v.resolved : 0
    const lossBreak = lossRate > 2.5 * S.outcomes.loss
    console.log(`   📊 READY FOR REVIEW: decisive WR ${wr != null ? (100 * wr).toFixed(1) : '—'}% (LB ${lb != null ? (100 * lb).toFixed(1) : '—'}%) · loss-rate ${(100 * lossRate).toFixed(1)}% vs artifact ${(100 * S.outcomes.loss).toFixed(1)}%`)
    console.log(`   ${lossBreak ? '🚨 LOSS-RATE BREAKAGE (>2.5× artifact) — investigate before ANY promotion talk' : '✓ no gross breakage at this sample size (NOTE: n≈50 cannot confirm the WR — it can only catch breakage)'}`)
  }
  const higher = PRIORITY.slice(0, PRIORITY.indexOf(tier)); const hiFires = higher.flatMap((h) => firesOf(h).map((r) => ({ t: r.t, entry: r.entry })))
  const fires = firesOf(tier); let dup = 0
  for (const f of fires) if (hiFires.some((h) => Math.abs(h.t - f.t) <= OVERLAP.windowMs && Math.abs(h.entry - f.entry) / f.entry <= OVERLAP.pricePct)) dup++
  if (fires.length) console.log(`   overlap vs higher-priority books: ${dup}/${fires.length} (${(100 * dup / fires.length).toFixed(0)}%) — incremental ${fires.length - dup} fires are what promotion adds\n`); else console.log('')
}
if (SHADOW_BOOKS.length) {
  console.log(`── 📓 SHADOW BOOKS — recording, NOT promotable (sequenced-fill re-ship 2026-08-15) ──`)
  for (const tier of SHADOW_BOOKS) {
    const S = TIER_STATS[tier], v = reviewTier(rows, tier, S, { minFires: MIN_FIRES, corrected })
    console.log(`   📓 ${tier.padEnd(15)} ${String(v.fires).padStart(4)} fires / ${String(v.resolved).padStart(3)} resolved (${v.W}W/${v.SC}S/${v.L}L; sequential ${v.sequential.resolved}: ${v.sequential.W}W/${v.sequential.SC}S/${v.sequential.L}L) · $${v.pnlJournal}${v.pnlCorrected != null && v.pnlCorrected !== v.pnlJournal ? ` (corrected $${v.pnlCorrected})` : ''}${v.anomalies.length ? ` · 🚨 ${v.anomalies.length} exit anomal${v.anomalies.length > 1 ? 'ies' : 'y'}` : ''} · seq TRAIN $${S.seqTrainUsd}/t · ${S.shadowWhy.split(':')[1]?.trim().slice(0, 70) ?? ''}`)
  }
  console.log('   A forward trial cannot promote these: the BACKTEST failed walk-forward, and ~50 fires cannot overturn a')
  console.log('   measurement made on hundreds. The route back is a re-validation that PASSES, not a paper streak.\n')
}
console.log('Rule reminders: promotion needs Ashraf\'s explicit call · runtime overlap-dedup ships WITH the promotion · a book that breaks gets tuned/redesigned/dropped, never shipped as-is.\n')
