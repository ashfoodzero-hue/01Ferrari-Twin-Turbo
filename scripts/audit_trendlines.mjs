// audit_trendlines.mjs <SYM> [tf] — Perfection-Gate audit of the trendline study (2026-10-18), on real candles:
//   (1) an INDEPENDENT second implementation of the touch / outcome rules, written separately from src/master/trendlines.js, must give the same
//       touches and outcomes on a random sample of real AND placebo lines (0 differences);
//   (2) POSITIVE CONTROL: deliberately cheating horizontal "support" lines at the price of the NEXT major swing low (born 10 candles before it, only
//       if price is ≥ 1 ATR above then) — the machinery must show a respect rate far above their own placebo copies. If it cannot, a null result on
//       real trendlines would mean nothing.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { rng } from '../src/core/studyStats.js'
import { TL, fractalPivots, majorPivots, buildLines, evaluateLine } from '../src/master/trendlines.js'

const SYM = process.argv[2] || 'XAUUSD', TF = process.argv[3] || '4H', KIT = kit(SYM), M = await clean1m(SYM), holes = findHoles(M)
const C = KIT.build(M, TF); markIncomplete(C, holes)
const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14)

// (1) independent evaluator — explicit state machine
function naive(ln, off) {
  const val = (x) => ln.p1 + (ln.p2 - ln.p1) * (x - ln.i1) / (ln.i2 - ln.i1) + off, sup = ln.side === 'support'
  const through = (k, a) => (sup ? C[k].c <= val(k) - TL.TOL * a : C[k].c >= val(k) + TL.TOL * a)
  for (let k = ln.i2 + 1; k <= ln.birth; k++) if (through(k, A[k - 1] || ln.atrBirth)) return 'unborn'
  let state = 'WAIT', res = [], cur = null
  for (let k = ln.birth + 1; k < C.length; k++) { const a = A[k - 1]; if (!(a > 0)) continue
    const nearD = sup ? C[k].l - val(k) : val(k) - C[k].h, farD = sup ? C[k].h - val(k) : val(k) - C[k].l
    if (state === 'WAIT') { if (through(k, a)) return res.join(';') + '|U' + k; if (nearD >= TL.AWAY * a) state = 'ARMED'; continue }
    if (state === 'ARMED') { if (nearD <= TL.TOL * a) { cur = [k]; if (through(k, a)) return res.concat(k + 'B' + k).join(';') + '|B'; state = 'TOUCH' } continue }
    if (state === 'TOUCH') { if (through(k, a)) return res.concat(cur[0] + 'B' + k).join(';') + '|B'; if (farD >= TL.R * a) { res.push(cur[0] + 'R' + k); state = 'WAIT' } } }
  return res.concat(state === 'TOUCH' ? [cur[0] + 'O'] : []).join(';') + '|O'
}
const lib = (ln, off) => { const e = evaluateLine(C, A, ln, off); if (!e.born) return 'unborn'
  const s = e.touches.map((t) => t.i + (t.outcome === 'respect' ? 'R' + t.resolvedI : t.outcome === 'break' ? 'B' + t.resolvedI : 'O')).join(';')
  return s + (e.end === 'break_unarmed' ? '|U' + e.endI : e.end === 'break' ? '|B' : '|O') }
const lines = [...buildLines(C, majorPivots(C, breaks), A), ...buildLines(C, fractalPivots(C), A)], R = rng(11)
let checked = 0, diffs = 0
for (let n = 0; n < 600; n++) { const ln = lines[(R() * lines.length) | 0]
  for (const d of [0, ...TL.PLACEBO]) { const a = naive(ln, d * ln.atrBirth), b = lib(ln, d * ln.atrBirth); checked++; if (a !== b) { diffs++; if (diffs <= 3) console.log('  DIFF', JSON.stringify({ i1: ln.i1, i2: ln.i2, d, naive: a.slice(0, 80), lib: b.slice(0, 80) })) } } }
console.log(`  (1) independent evaluator: ${checked} line evaluations (real + placebo) · differences ${diffs}`)

// (2) positive control: cheating horizontal supports at the next major swing low
const sw = majorPivots(C, breaks).filter((p) => p.type === 'L'), pc = { real: [0, 0], placebo: [0, 0] }
for (const s of sw) { const b = s.i - 10; if (b < 15 || !(A[b] > 0) || C[b].l < s.px + A[b]) continue
  const ln = { side: 'support', i1: b - 2, p1: s.px, i2: b - 1, p2: s.px, slope: 0, birth: b, atrBirth: A[b] }
  for (const d of [0, ...TL.PLACEBO]) { const e = evaluateLine(C, A, ln, d * A[b]); if (!e.born || !e.touches.length) continue
    const t = e.touches[0]; if (t.outcome === 'open') continue; const g = d ? pc.placebo : pc.real; g[1]++; if (t.outcome === 'respect') g[0]++ } }
const pr = (g) => `${g[1] ? Math.round(100 * g[0] / g[1]) : '—'} % (n ${g[1]})`
console.log(`  (2) positive control (cheating lines at the real next swing low, first test): respected ${pr(pc.real)} vs its placebo copies ${pr(pc.placebo)}`)
const res = { at: new Date().toISOString(), symbol: SYM, tf: TF, independent_evaluator: { evaluations: checked, differences: diffs }, positive_control: { real: pc.real, placebo: pc.placebo } }
fs.writeFileSync(path.join(TURBO.master, `trendlines_audit_${SHORT[SYM]}_${TF}.json`), JSON.stringify(res, null, 1))
process.exit(diffs ? 1 : 0)
