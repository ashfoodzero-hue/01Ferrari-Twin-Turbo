// ════════════════════════════════════════════════════════════════════════════════
// seq_power.mjs — the SEQUENCED-ERA power block every book must carry after the 2026-08-14 fill-bar fix.
// ────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (Perfection-Gate, 2026-08-15). The TURBO_SEQ_GATE=1 artifacts written on 2026-08-14 resolve the
// WHOLE 23y with `resolveManagedLimitSeq`, but 1m coverage only starts 2013-07. Before that the resolver falls back
// to the PESSIMISTIC rule (stop chargeable on the fill bar, target never). The OOS folds (5-7 ≈ 2017→2026) are 100%
// sequenced — but the TRAIN folds (0-4 ≈ 2003→2017) are only ~40% sequenced, so **every train number in those
// artifacts is biased DOWNWARD by construction**. Four books were about to be demoted on exactly that number.
// A demotion decided on a biased statistic is an inference, not a measurement. This module supplies the measurement:
// every statistic recomputed on the SEQUENCED ERA ONLY (t ≥ 1m coverage start), with the sample size attached so an
// unpowered train block returns "no information", never "no" (test-power iron rule).
//
// It also carries the PRE-REGISTERED ship criteria — written before any of the seven books was re-run, so the
// classification cannot be tuned to a result. Criteria and their reasons:
//   C1 evidence   dec ≥ 100 sequenced OOS decisive trades          (the standing power bar)
//   C2 OOS        bootstrap 95% CI lower bound on $/trade > 0      (positive after cost, not just on the mean)
//   C3 walk-fwd   sequenced TRAIN net > 0, evaluated ONLY when the train block is POWERED (dec ≥ 30)
//   C4 folds      ≥ 2/3 of POWERED sequenced folds net > 0, with ≥ 3 powered folds (regime robustness)
// Verdicts: SHIP (all evaluable criteria pass) · SHADOW (an evaluable criterion FAILS) · UNPROVEN (a criterion
// cannot be evaluated for want of power — record, never promote, never advertise, and never call it refuted).
// ════════════════════════════════════════════════════════════════════════════════

export const POWERED_DEC = 30          // decisive trades needed before a block/fold carries information
export const MIN_OOS_DEC = 100         // C1
export const MIN_POWERED_FOLDS = 3     // C4
export const FOLD_PASS_SHARE = 2 / 3   // C4

/** WIN/LOSS/SCRATCH tally + decisive WR + net/avgR for a set of resolved fires. */
export function statsOf(xs) {
  const W = xs.filter((x) => x.outcome === 'WIN').length
  const L = xs.filter((x) => x.outcome === 'LOSS').length
  const S = xs.filter((x) => x.outcome === 'SCRATCH').length
  const dec = W + L
  const mean = (k) => (xs.length ? xs.reduce((s, x) => s + (x[k] ?? 0), 0) / xs.length : 0)
  return { n: xs.length, win: W, scratch: S, loss: L, dec,
    wr: dec ? +(W / dec).toFixed(4) : null,
    net: +mean('net').toFixed(4), avgR: +mean('R').toFixed(4),
    powered: dec >= POWERED_DEC }
}

/**
 * Recompute train / OOS / per-fold on the SEQUENCED ERA ONLY and classify against the pre-registered criteria.
 * @param {object} o
 *   fires      resolved trades: { t, fold?, outcome, net, R, seq? }
 *   trainPred  (fire) => true when the fire belongs to the TRAIN block (validators split by fold OR chronologically)
 *   m1Start    ms of the first sub-bar available (below it the resolver was pessimistic, not sequenced)
 *   folds      number of folds when the validator uses regime-spanned folds; 0/undefined ⇒ no fold sheet
 *   ciLb       the OOS bootstrap 95% lower bound on $/trade already computed by the validator
 */
export function seqPowerBlock({ fires, trainPred, m1Start, folds = 0, ciLb = null }) {
  const era = fires.filter((f) => f.t >= m1Start)
  const pess = era.filter((f) => f.seq && f.seq !== 'seq').length
  const train = statsOf(era.filter(trainPred))
  const oos = statsOf(era.filter((f) => !trainPred(f)))

  let foldSheet = null, poweredPass = null, poweredN = null
  if (folds > 0 && fires.some((f) => f.fold != null)) {
    foldSheet = []
    for (let f = 0; f < folds; f++) {
      const s = statsOf(era.filter((x) => x.fold === f))
      foldSheet.push({ fold: f, n: s.n, dec: s.dec, wr: s.wr, net: s.net, avgR: s.avgR,
        powered: s.powered, pass: s.powered ? s.net > 0 : null })
    }
    poweredN = foldSheet.filter((f) => f.powered).length
    poweredPass = foldSheet.filter((f) => f.pass === true).length
  }

  // ── the pre-registered criteria, evaluated ───────────────────────────────────
  const C = []
  C.push({ id: 'C1_evidence', pass: oos.dec >= MIN_OOS_DEC, evaluable: true,
    detail: `sequenced OOS decisive n=${oos.dec} (need ≥${MIN_OOS_DEC})` })
  C.push({ id: 'C2_oos_ci', pass: ciLb != null ? ciLb > 0 : null, evaluable: ciLb != null,
    detail: ciLb != null ? `bootstrap 95% LB $${ciLb.toFixed(4)}/t` : 'no CI supplied' })
  C.push({ id: 'C3_walk_forward', pass: train.powered ? train.net > 0 : null, evaluable: train.powered,
    detail: train.powered
      ? `sequenced TRAIN net $${train.net.toFixed(4)}/t (dec ${train.dec})`
      : `sequenced TRAIN UNPOWERED (dec ${train.dec} < ${POWERED_DEC}) — no information, not a refutation` })
  C.push({ id: 'C4_folds', pass: poweredN != null && poweredN >= MIN_POWERED_FOLDS ? poweredPass / poweredN >= FOLD_PASS_SHARE : null,
    evaluable: poweredN != null && poweredN >= MIN_POWERED_FOLDS,
    detail: poweredN == null ? 'validator uses a chronological split — no fold sheet'
      : `${poweredPass}/${poweredN} powered sequenced folds net>0 (need ≥${(100 * FOLD_PASS_SHARE).toFixed(0)}%, ≥${MIN_POWERED_FOLDS} powered folds)` })

  const failed = C.filter((c) => c.evaluable && c.pass === false)
  const unevaluable = C.filter((c) => !c.evaluable)
  const verdict = failed.length ? 'SHADOW' : unevaluable.length ? 'UNPROVEN' : 'SHIP'

  return {
    criteria_version: 'seq-ship-v1 (pre-registered 2026-08-15, before any book was re-run)',
    m1_start: new Date(m1Start).toISOString(),
    sequenced_era_only: true,
    era_fires: era.length, era_fires_pessimistic: pess,
    train_seq: train, oos_seq: oos, folds_seq: foldSheet,
    powered_folds: poweredN == null ? null : `${poweredPass}/${poweredN}`,
    criteria: C, failed: failed.map((c) => c.id), unevaluable: unevaluable.map((c) => c.id),
    verdict,
  }
}

/** One-line console summary — every validator prints the same shape so the sheet is comparable across books. */
export function printSeqPower(name, blk) {
  console.log(`\n── SEQUENCED-ERA POWER (${name}) · since ${blk.m1_start.slice(0, 10)} ──`)
  console.log(`   TRAIN  n=${blk.train_seq.n} dec=${blk.train_seq.dec} WR ${blk.train_seq.wr == null ? '—' : (100 * blk.train_seq.wr).toFixed(2) + '%'} · net ${blk.train_seq.net >= 0 ? '+' : ''}$${blk.train_seq.net.toFixed(4)}/t ${blk.train_seq.powered ? '(POWERED)' : '(UNPOWERED — no information)'}`)
  console.log(`   OOS    n=${blk.oos_seq.n} dec=${blk.oos_seq.dec} WR ${blk.oos_seq.wr == null ? '—' : (100 * blk.oos_seq.wr).toFixed(2) + '%'} · net ${blk.oos_seq.net >= 0 ? '+' : ''}$${blk.oos_seq.net.toFixed(4)}/t`)
  if (blk.folds_seq) for (const f of blk.folds_seq)
    console.log(`   fold ${f.fold} · n ${String(f.n).padStart(4)} · dec ${String(f.dec).padStart(4)} · net ${f.net >= 0 ? '+' : ''}$${f.net.toFixed(4)} ${f.powered ? (f.pass ? '✓' : '✗') : '· unpowered'}`)
  for (const c of blk.criteria) console.log(`   ${c.pass === true ? '✅' : c.pass === false ? '❌' : '⬜'} ${c.id} — ${c.detail}`)
  console.log(`   ⇒ ${blk.verdict}${blk.verdict === 'SHADOW' ? ' (failed: ' + blk.failed.join(', ') + ')' : blk.verdict === 'UNPROVEN' ? ' (cannot evaluate: ' + blk.unevaluable.join(', ') + ')' : ''}\n`)
}
