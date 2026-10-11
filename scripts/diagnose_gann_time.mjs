// ════════════════════════════════════════════════════════════════════════════════
// diagnose_gann_time.mjs — is tool 6's "Gann time turns" result REAL or a CONTROL ARTIFACT? (2026-10-09, perfection gate: measure, don't infer)
// ────────────────────────────────────────────────────────────────────────────────
// study_gann.mjs (pre-registered) compared windows at swingEnd + f·duration (f = ½, 1, 2) with windows at swingEnd + f′·duration, f′ uniform
// in [0.25, 2.5]. Suspected artifact: the chance of a new pivot depends on how long ago the swing ended (elapsed time), and ½× / 1× sit EARLY.
// THE GANN CLAIM is specific: turns come at fractions of THIS swing's own duration. Its proper null keeps every window's elapsed time
// distribution and breaks only the link to the swing's own duration:
//   NULL S (shuffle): the same window at swingEnd + f·duration′, duration′ = the duration of ANOTHER swing state of the same tf (a seeded
//   permutation of all durations), with the same validity constraints. PERMS permutations (default 2000; Bonferroni over 9 cells needs p < 0.0056) → the null distribution of the hit rate.
//   GANN TIME IS REAL ⇔ permutation p < 0.05/9 = 0.0056 (per cell, 9 cells).
// Also reported: hit rate by elapsed bars since the swing end (the hazard curve) for every window the study could form.
// Output: data/master/gann_time_diagnostic.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { seeded } from '../src/master/bounceTest.js'
import { swingStates } from '../src/master/fibLevels.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { GANN_TIME } from '../src/master/gannBox.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const PART = process.env.PART === 'TRAIN' ? 'TRAIN' : 'OOS'   // PART=TRAIN re-runs the same test on the training half (robustness)
const WIN = 3, PERMS = +(process.env.PERMS || 2000), TFS = ['1h', '4h', '1d'], rnd = seeded(20262026), out = {}
for (const tf of TFS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars
  const states = swingStates(B, (i) => B[i].t + ms).filter((s) => s.knownT >= FROM && s.knownT <= TO && Math.abs(s.hT - s.lT) > 0)
  const P = confirmedPivots(B), PT = Float64Array.from([...P.highs, ...P.lows].map((p) => p.t).sort((a, b) => a - b)), lastJudgeable = B.at(-1).t - 5 * ms
  const pivotIn = (t0, t1) => { let lo = 0, hi = PT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (PT[m] < t0) lo = m + 1; else hi = m } return lo < PT.length && PT[lo] <= t1 }
  const durs = states.map((s) => Math.abs(s.hT - s.lT))
  const rate = (durOf, f) => { let n = 0, h = 0
    states.forEach((s, q) => { const end = Math.max(s.hT, s.lT), t = end + f * durOf(q), w0 = t - WIN * ms, w1 = t + WIN * ms
      if ((PART === 'OOS' ? t < SPLIT : t >= SPLIT || t < FROM) || w0 < s.knownT || w1 > lastJudgeable || w1 > TO) return; n++; if (pivotIn(w0, w1)) h++ })
    return { n, hit: n ? h / n : null } }
  out[tf] = {}
  for (const f of GANN_TIME) {
    const actual = rate((q) => durs[q], f), nulls = []
    for (let k = 0; k < PERMS; k++) { const perm = durs.map((d, i) => [rnd(), d]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); const r = rate((q) => perm[q], f); if (r.hit != null) nulls.push(r.hit) }
    nulls.sort((a, b) => a - b); const p99 = nulls[Math.floor(0.99 * (nulls.length - 1))], pval = (nulls.filter((x) => x >= actual.hit).length + 1) / (nulls.length + 1)
    out[tf][f] = { oos_n: actual.n, actual: +actual.hit.toFixed(4), shuffled_mean: +(nulls.reduce((s, x) => s + x, 0) / nulls.length).toFixed(4), shuffled_p99: +p99.toFixed(4), p_value: +pval.toFixed(4), verdict: pval < 0.05 / 9 ? 'REAL_GANN_TIME' : 'ARTIFACT_OR_NOISE' }
    console.log(`${tf.padEnd(3)} ${f}×: ${PART} n ${actual.n} · actual ${out[tf][f].actual} · shuffled-duration null mean ${out[tf][f].shuffled_mean} (p99 ${out[tf][f].shuffled_p99}) · p ${out[tf][f].p_value} → ${out[tf][f].verdict}`)
  }
  // hazard curve: hit rate by elapsed bars after the swing end, over every judgeable window position 1..40 bars
  const hz = []; for (let e = 4; e <= 40; e += 4) { let n = 0, h = 0
    for (const s of states) { const end = Math.max(s.hT, s.lT), t = end + e * ms, w0 = t - WIN * ms, w1 = t + WIN * ms; if (t < SPLIT || w0 < s.knownT || w1 > lastJudgeable) continue; n++; if (pivotIn(w0, w1)) h++ }
    hz.push({ elapsed_bars: e, n, hit: n ? +(h / n).toFixed(4) : null }) }
  out[tf].hazard_oos = hz
  console.log(`${tf.padEnd(3)} hazard (OOS hit by elapsed bars): ` + hz.map((x) => `${x.elapsed_bars}:${x.hit}`).join(' '))
}
const real = Object.entries(out).flatMap(([tf, o]) => GANN_TIME.filter((f) => o[f].verdict === 'REAL_GANN_TIME').map((f) => `${tf} ${f}×`))
fs.writeFileSync(path.join(TURBO.master, PART === 'OOS' ? 'gann_time_diagnostic.json' : 'gann_time_diagnostic_train.json'), JSON.stringify({ at: new Date().toISOString(), rule: 'permutation p (shuffled durations) < 0.05/9', perms: PERMS, results: out, real, verdict: real.length ? 'SOME_GANN_TIME_IS_REAL' : 'GANN_TIME_IS_AN_ELAPSED_TIME_ARTIFACT' }, null, 1))
console.log(`\n=> GANN TIME DIAGNOSTIC: ${real.length ? 'REAL in ' + real.join(', ') : 'artifact — the effect is elapsed time, not the swing\'s own duration'}`)
