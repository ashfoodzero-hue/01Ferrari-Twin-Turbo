// audit_sr_levels.mjs <SYM> [tf] — Perfection-Gate audit of the S/R study (2026-10-18), on real candles:
//   (1) an INDEPENDENT second implementation of the level rules (touch / held / broke / flip / retire), written separately from src/master/srLevels.js,
//       must give identical touches, outcomes and flips on a random sample of real AND placebo levels (0 differences);
//   (2) POSITIVE CONTROL: deliberately cheating levels at the price of the NEXT swing (born 10 candles before it, only if price is ≥ 1 ATR away then)
//       — the method must show a first-test hold rate far above their placebo copies, or a null result on real levels would mean nothing.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { rng } from '../src/core/studyStats.js'
import { SR, swingLevels, evaluateLevel } from '../src/master/srLevels.js'

const SYM = process.argv[2] || 'XAUUSD', TF = process.argv[3] || '4H', K = kit(SYM), M = await clean1m(SYM), holes = findHoles(M)
const C = K.build(M, TF); markIncomplete(C, holes)
const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14), L = swingLevels(C, breaks)
function naive(lv, off) {   // explicit state machine: WAIT → ARMED → TOUCH; flip once, retire on the second close-through
  const p = lv.px + off; let sup = lv.side === 'support', flipped = false, state = 'WAIT', cur = null, out = []
  const thru = (k, a) => (sup ? C[k].c <= p - SR.BREAK * a : C[k].c >= p + SR.BREAK * a)
  for (let k = lv.birth + 1; k < C.length; k++) { const a = A[k - 1]; if (!(a > 0)) continue
    const nearD = sup ? C[k].l - p : p - C[k].h, farD = sup ? C[k].h - p : p - C[k].l
    const doFlip = (tag) => { out.push(tag); if (flipped) return true; flipped = true; sup = !sup; state = 'WAIT'; return false }
    if (state === 'WAIT') { if (thru(k, a)) { if (doFlip('F' + k)) return out.join(';') + '|X'; continue } if (nearD >= SR.AWAY * a) state = 'ARMED'; continue }
    if (state === 'ARMED') { if (nearD <= SR.TOUCH * a) { cur = k; if (thru(k, a)) { if (doFlip(k + 'B' + k)) return out.join(';') + '|X'; continue } state = 'TOUCH' } continue }
    if (state === 'TOUCH') { if (thru(k, a)) { if (doFlip(cur + 'B' + k)) return out.join(';') + '|X'; continue } if (farD >= SR.R * a) { out.push(cur + 'H' + k); state = 'WAIT' } } }
  if (state === 'TOUCH') out.push(cur + 'O')
  return out.join(';') + '|O'
}
const lib = (lv, off) => { const e = evaluateLevel(C, A, lv, off), parts = []; let fi = 0
  for (const t of e.touches) { while (fi < e.flips.length && e.flips[fi] < t.i) { parts.push('F' + e.flips[fi]); fi++ }
    if (t.outcome === 'held') parts.push(t.i + 'H' + t.resolvedI); else if (t.outcome === 'broke') { parts.push(t.i + 'B' + t.resolvedI); if (e.flips[fi] === t.resolvedI) fi++ } else parts.push(t.i + 'O') }
  while (fi < e.flips.length) { parts.push('F' + e.flips[fi]); fi++ }
  return parts.join(';') + (e.end === 'retired' ? '|X' : '|O') }
const R = rng(13); let checked = 0, diffs = 0
for (let n = 0; n < 500; n++) { const lv = L[(R() * L.length) | 0]
  for (const d of [0, ...SR.PLACEBO]) { const a = naive(lv, d * lv.atr), b = lib(lv, d * lv.atr); checked++; if (a !== b) { diffs++; if (diffs <= 3) console.log('  DIFF', JSON.stringify({ i: lv.i, d, naive: a.slice(0, 90), lib: b.slice(0, 90) })) } } }
console.log(`  (1) independent evaluator: ${checked} level evaluations (real + placebo) · differences ${diffs}`)
const pc = { real: [0, 0], placebo: [0, 0] }
for (const s of L) { const b = s.i - 10; if (b < 15 || !(A[b] > 0)) continue; const sup = s.side === 'support'
  if (sup ? C[b].l < s.px + A[b] : C[b].h > s.px - A[b]) continue
  const lv = { side: s.side, px: s.px, birth: b }
  for (const d of [0, ...SR.PLACEBO]) { const e = evaluateLevel(C, A, lv, d * A[b]); const t = e.touches[0]; if (!t || t.outcome === 'open') continue; const g = d ? pc.placebo : pc.real; g[1]++; if (t.outcome === 'held') g[0]++ } }
const pr = (g) => `${g[1] ? Math.round(100 * g[0] / g[1]) : '—'} % (n ${g[1]})`
console.log(`  (2) positive control (cheating levels at the real next swing, first test): held ${pr(pc.real)} vs placebo ${pr(pc.placebo)}`)
fs.writeFileSync(path.join(TURBO.master, `sr_audit_${SHORT[SYM]}_${TF}.json`), JSON.stringify({ at: new Date().toISOString(), symbol: SYM, tf: TF, independent_evaluator: { evaluations: checked, differences: diffs }, positive_control: pc }, null, 1))
process.exit(diffs ? 1 : 0)
