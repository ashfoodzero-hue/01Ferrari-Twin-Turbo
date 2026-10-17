// report_swing_combine.mjs — data/master/swing_combine_atlas.json → docs/SWING_COMBINE_ATLAS.md (2026-10-17). Every cell, both periods, with n.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const A = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_combine_atlas.json'), 'utf8'))
const pc = (x) => (x == null ? '—' : (100 * x).toFixed(0) + '%'), mn = (m) => { if (m == null) return '—'; const a = Math.abs(m); return (m < 0 ? '−' : '') + (a >= 1440 ? (a / 1440).toFixed(1) + ' d' : a >= 60 ? (a / 60).toFixed(1) + ' h' : a.toFixed(0) + ' min') }
const NAMES = { R1: 'ladder alone (one step below) — reference', C1: 'ladder + STRONG next candle', C2: 'ladder + next candle in the right direction', C3: 'ladder + strong AND right direction', C4: 'TWO steps below + strong next candle', C5: 'strong next candle alone (no ladder)', M1: 'ladder + WEAK next candle (mirror)' }
const L = ['# Swing study Phase 3B: next candle + ladder', '', `Generated ${A.at}. Spec \`docs/SWING_COMBINE_SPEC.md\`. OOS from ${A.oos_from.slice(0, 10)}. Each cell counts a candidate only if its outcome was still undecided at the moment its signs were all visible.`, '',
  '**Caution:** leads are medians over different pools. Waiting for a later sign drops the swings that confirmed quickly, so a later cell can show a LONGER median lead. Compare leads only within a cell.', '']
for (const [a, r] of Object.entries(A.anchors)) for (const side of ['L', 'H']) { const c = r.sides[side].cells
  L.push(`## ${a} ${side === 'L' ? 'lows' : 'highs'} (one step below = ${r.one_step}, two steps = ${r.two_steps})`, '', '| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |', '|---|---|---|---|---|---|---|---|')
  for (const [k, v] of Object.entries(c)) L.push(`| ${k}: ${NAMES[k]} | **${pc(v.O.p_real)}** | ${pc(v.O.wilson_lo)} – ${pc(v.O.wilson_hi)} | ${v.O.n} | ${pc(v.O.p_real_without_sign)} | ${pc(v.T.p_real)} (n ${v.T.n}) | ${mn(v.O.lead_min_median)} | ${v.verdict} |`)
  L.push('') }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_COMBINE_ATLAS.md'), L.join('\n') + '\n'); console.log('→ docs/SWING_COMBINE_ATLAS.md')
