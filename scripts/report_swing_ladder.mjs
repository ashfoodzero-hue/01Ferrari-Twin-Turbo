// report_swing_ladder.mjs — data/master/swing_ladder_atlas.json → docs/SWING_LADDER_ATLAS.md (2026-10-17). Plain words; n behind every number.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const A = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), 'utf8'))
const pc = (x) => (x == null ? '—' : (100 * x).toFixed(0) + '%'), mn = (m) => { if (m == null) return '—'; const a = Math.abs(m); const s = a >= 1440 ? (a / 1440).toFixed(1) + ' d' : a >= 60 ? (a / 60).toFixed(1) + ' h' : a.toFixed(0) + ' min'; return (m < 0 ? '−' : '') + s }
const L = ['# Swing flip ladder: Phase 3 results', '', `Generated ${A.at}. Spec \`docs/SWING_LADDER_SPEC.md\`. Window ${A.window[0].slice(0, 10)} → ${A.window[1].slice(0, 10)}; OOS from ${A.oos_from.slice(0, 10)}.`, '',
  '"X flipped" = timeframe X confirmed its own swing at EXACTLY the same price as the anchor swing. The flip time is the close of X\'s confirming candle.',
  '"Delay" is measured from the close of the anchor\'s extreme candle; "vs anchor" from the anchor\'s own confirmation (negative = before).', '']
for (const [anc, r] of Object.entries(A.anchors)) {
  L.push(`## Anchor ${anc}`)
  for (const side of ['L', 'H']) { const s = r.sides[side], name = side === 'L' ? 'swing LOWS (how Bear becomes Bull)' : 'swing HIGHS (how Bull becomes Bear)'
    L.push('', `### ${anc} ${name}: real ${s.real_swings.T}+${s.real_swings.O}, failed ${s.failed.T}+${s.failed.O} (TRAIN+OOS)`, '', '#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)', '',
      '| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |', '|---|---|---|---|---|---|---|')
    for (const [X, row] of Object.entries(s.ladder)) { const o = row.O, t = row.T
      L.push(`| ${X}${X === anc ? ' (anchor)' : ''} | ${pc(o.share)} (${pc(t.share)}) | ${mn(o.delay_min_median)} | ${mn(o.delay_min_q1)} … ${mn(o.delay_min_q3)} | ${mn(o.vs_anchor_conf_min_median)} | ${pc(o.before_anchor_share)} | ${row.flag} |`) }
    L.push('', '#### B. Is a lower-timeframe flip evidence? (the knowable question)', '', 'Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor\'s outcome was known): the share that became a REAL anchor swing, vs the base rate.', '',
      '| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |', '|---|---|---|---|---|---|---|---|---|')
    for (const e of s.evidence) L.push(`| ${e.key} | **${pc(e.O.p_real_given_flip)}** | ${pc(e.O.base)} | ${pc(e.O.p_real_not_flipped)} | ${e.lift == null ? '—' : (e.lift > 0 ? '+' : '') + (100 * e.lift).toFixed(0) + ' pt'} | ${e.O.n_flipped} | ${pc(e.T.p_real_given_flip)} / ${pc(e.T.base)} | ${mn(e.O.lead_min_median)} | ${e.verdict} |`)
    L.push('', '#### C. DXY and silver at the same moment (±3 anchor candles)', '', '| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |', '|---|---|---|---|---|---|---|---|')
    for (const [nm, row] of Object.entries(s.cross)) { const o = row.real_O, f = row.failed_O
      L.push(`| ${nm} (${nm === 'DXY' ? 'opposite swing' : 'same swing'}) | ${pc(o.share)} (n ${o.n}) | ${pc(o.extreme_earlier_share)} | ${pc(o.extreme_same_candle_share)} | ${o.extreme_lead_candles_median ?? '—'} | ${pc(o.confirm_earlier_share)} | ${mn(o.confirm_lead_min_median)} | ${pc(f.share)} (n ${f.n}) |`) }
    const ord = Object.entries(s.order).filter(([k]) => { const [x, y] = k.split('<'); return Object.keys(s.ladder).indexOf(y) - Object.keys(s.ladder).indexOf(x) === 1 })
    if (ord.length) L.push('', 'Order: did the smaller of two neighbouring timeframes flip first?', '', ord.map(([k, v]) => `${k}: ${pc(v.x_first)} first (tie ${pc(v.tie)}, n ${v.both})`).join(' · ')) } L.push('') }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_LADDER_ATLAS.md'), L.join('\n') + '\n'); console.log('→ docs/SWING_LADDER_ATLAS.md')
