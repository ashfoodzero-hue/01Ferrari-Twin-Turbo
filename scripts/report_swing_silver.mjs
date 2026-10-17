// report_swing_silver.mjs — data/master/swing_silver_atlas.json → docs/SWING_SILVER_ATLAS.md (2026-10-17). Every cell, both periods, with n.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const A = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_silver_atlas.json'), 'utf8'))
const pc = (x) => (x == null ? '—' : (100 * x).toFixed(0) + '%'), mn = (m) => { if (m == null) return '—'; const a = Math.abs(m); return (m < 0 ? '−' : '') + (a >= 1440 ? (a / 1440).toFixed(1) + ' d' : a >= 60 ? (a / 60).toFixed(1) + ' h' : a.toFixed(0) + ' min') }
const L = ['# Swing study Phase 3C: silver and DXY as extra evidence', '', `Generated ${A.at}. Spec \`docs/SWING_SILVER_SPEC.md\`. OOS from ${A.oos_from.slice(0, 10)}. A sign counts only if silver / DXY had ALREADY confirmed its swing when gold's one-step-below timeframe flipped.`, '']
for (const [a, r] of Object.entries(A.anchors)) for (const side of ['L', 'H']) { const s = r.sides[side]
  L.push(`## ${a} ${side === 'L' ? 'lows' : 'highs'} (gold ladder = ${r.one_step})`, '', `Ladder alone: **${pc(s.R1.O.p_real)}** (n ${s.R1.O.n}; TRAIN ${pc(s.R1.T.p_real)}).`, '',
    '| sign already confirmed at the gold ladder flip | real WITH sign (OOS) | Wilson 95 % | n | real WITHOUT sign | TRAIN with / without | no-data excluded | verdict |', '|---|---|---|---|---|---|---|---|')
  for (const [k, v] of Object.entries(s.A)) L.push(`| ${k} | **${pc(v.O.p_real)}** | ${pc(v.O.wilson_lo)} – ${pc(v.O.wilson_hi)} | ${v.O.n} | ${pc(v.O.p_real_without)} | ${pc(v.T.p_real)} / ${pc(v.T.p_real_without)} | ${v.excluded_no_data} | ${v.verdict} |`)
  const B = s.B_wait_for_silver; L.push('', `Waiting for silver (one step below) to confirm (descriptive): real ${pc(B.O.p_real)} (n ${B.O.n}; ${B.O.waited} had to wait, median ${mn(B.O.wait_min_median)}); TRAIN ${pc(B.T.p_real)} (n ${B.T.n}).`, '') }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_SILVER_ATLAS.md'), L.join('\n') + '\n'); console.log('→ docs/SWING_SILVER_ATLAS.md')
