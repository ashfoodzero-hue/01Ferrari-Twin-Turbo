// report_swing_footprint.mjs — data/master/swing_footprint_atlas.json → docs/SWING_FOOTPRINT_ATLAS.md (2026-10-17). Plain words, n behind every number,
// FINDINGS separated, and the HEAD-TO-HEAD (spec §3): for every footprint finding, the strongest candle-shape gap at the same offset on the same events.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const A = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_footprint_atlas.json'), 'utf8'))
const pc = (x) => (x == null ? '—' : (100 * x).toFixed(0) + '%'), band = (d) => { const a = Math.abs(d) * 100; return a >= 10 ? 'clear' : a >= 5 ? 'moderate' : 'tiny' }
const where = (o, side) => { const ext = side === 'L' ? 'low' : 'high'; o = Number(o); return o < 0 ? `${-o} candle${o < -1 ? 's' : ''} before the ${ext}` : o === 0 ? `the ${ext} candle` : `${o} candle${o > 1 ? 's' : ''} after the ${ext} (still holding)` }
const W = { delta_pos: 'has POSITIVE delta (more aggressive buying)', stacked_buy3: 'shows STACKED BUY imbalances (≥ 3 levels, 3:1)', stacked_sell3: 'shows STACKED SELL imbalances (≥ 3 levels, 3:1)', absorption_low: 'shows ABSORPTION at its low (heavy selling soaked up, closes upper half)', absorption_high: 'shows ABSORPTION at its high (heavy buying soaked up, closes lower half)',
  cum_delta_pos: 'has POSITIVE summed delta over the extreme + 3 candles before', delta_divergence: { L: 'is a new low WITH positive delta (delta divergence)', H: 'is a new high WITH negative delta (delta divergence)' },
  'delta_frac:hi': 'has STRONG buying delta (top third)', 'delta_frac:lo': 'has STRONG selling delta (bottom third)', 'delta_frac:mid': 'has balanced delta', 'poc_loc:hi': 'has its most-traded price near the HIGH', 'poc_loc:lo': 'has its most-traded price near the LOW', 'poc_loc:mid': 'has its most-traded price in the middle',
  'low_vol_frac:hi': 'has HEAVY volume at its low', 'low_vol_frac:lo': 'has THIN volume at its low', 'low_vol_frac:mid': 'has medium volume at its low', 'high_vol_frac:hi': 'has HEAVY volume at its high', 'high_vol_frac:lo': 'has THIN volume at its high', 'high_vol_frac:mid': 'has medium volume at its high',
  'low_sell_frac:hi': 'has HEAVY aggressive selling at its low', 'low_sell_frac:lo': 'has LITTLE aggressive selling at its low', 'low_sell_frac:mid': 'has medium selling at its low', 'high_buy_frac:hi': 'has HEAVY aggressive buying at its high', 'high_buy_frac:lo': 'has LITTLE aggressive buying at its high', 'high_buy_frac:mid': 'has medium buying at its high',
  'rel_volume:hi': 'trades HIGH volume vs its last 20 candles', 'rel_volume:lo': 'trades LOW volume vs its last 20 candles', 'rel_volume:mid': 'trades normal volume' }
const say = (key, side) => { const [a, b] = key.split('|'); const w = W[b]; return `${where(a, side)} ${typeof w === 'object' ? w[side] : w ?? b}` }
const L = ['# Swing footprint atlas: Phase 2 results', '', `Generated ${A.at}. Spec: \`docs/SWING_FOOTPRINT_SPEC.md\`. Real CME gold futures footprints ${A.window[0].slice(0, 10)} → ${A.window[1].slice(0, 10)}, joined to the spot candles by time. TRAIN → OOS from ${A.oos_from.slice(0, 10)}.`, '',
  'A FINDING follows the same rule as Phase 1: OOS Holm (footprint measures only), the same sign in TRAIN, vs random candles and at 2× / 5× ATR. The **head-to-head** column gives the strongest CANDLE-SHAPE gap on the same events at the same offset: if it is as large, the footprint adds little.', '',
  '## Overview', '', '| TF | swings H (TRAIN+OOS) | swings L | footprint FINDINGS H | L |', '|---|---|---|---|---|']
for (const [tf, r] of Object.entries(A.timeframes)) L.push(`| ${tf} | ${r.swings.H.S.T}+${r.swings.H.S.O} | ${r.swings.L.S.T}+${r.swings.L.S.O} | ${r.sides.H.oos_swings < 30 ? 'described only' : r.sides.H.findings} | ${r.sides.L.oos_swings < 30 ? 'described only' : r.sides.L.findings} |`)
for (const [tf, r] of Object.entries(A.timeframes)) { L.push('', `## ${tf}`)
  for (const side of ['L', 'H']) { const s = r.sides[side], name = side === 'L' ? 'Swing LOWS' : 'Swing HIGHS'
    const bestCandle = (off) => s.rows.filter((x) => x.ref && x.key.replace('cdl:', '').split('|')[0] === off && x.diff_c1 != null).sort((a, b) => Math.abs(b.diff_c1) - Math.abs(a.diff_c1))[0]
    if (s.oos_swings < 30) { L.push('', `### ${name}: DESCRIBED ONLY (${s.oos_swings} OOS swings)`, '', '| what (footprint) | swing | failed | random | n |', '|---|---|---|---|---|')
      for (const x of s.rows.filter((x) => !x.ref && x.diff_c1 != null).sort((a, b) => Math.abs(b.diff_c1) - Math.abs(a.diff_c1)).slice(0, 6)) L.push(`| ${say(x.key, side)} | ${pc(x.swing_oos)} | ${pc(x.c1_oos)} | ${pc(x.c2_oos)} | ${x.n_s} |`); continue }
    const F = s.rows.filter((x) => x.verdict === 'FINDING').sort((a, b) => Math.abs(b.diff_c1) - Math.abs(a.diff_c1))
    L.push('', `### ${name}: ${F.length} footprint finding${F.length === 1 ? '' : 's'} (${s.oos_swings} OOS swings)`)
    if (F.length) { L.push('', '| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |', '|---|---|---|---|---|---|---|')
      for (const x of F) { const off = x.key.split('|')[0], c = bestCandle(off)
        L.push(`| ${say(x.key, side)} | **${pc(x.swing_oos)}** | ${pc(x.c1_oos)} | ${pc(x.c2_oos)} | ${band(x.diff_c1)} ${(100 * x.diff_c1 > 0 ? '+' : '') + (100 * x.diff_c1).toFixed(0)} pt | ${pc(x.train_swing)} / ${pc(x.train_c1)} | ${c ? `${c.key.replace('cdl:', '')} ${(100 * c.diff_c1 > 0 ? '+' : '') + (100 * c.diff_c1).toFixed(0)} pt` : '—'} |`) } }
    else L.push('', 'No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).')
    const other = s.rows.filter((x) => x.verdict === 'INCONSISTENT' || x.verdict === 'FAILS_ROBUSTNESS'); if (other.length) L.push('', `Passed OOS but NOT proven (${other.length}): ` + other.slice(0, 6).map((x) => `${say(x.key, side)} [${x.verdict.toLowerCase().replace('_', ' ')}]`).join('; ')) } }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_FOOTPRINT_ATLAS.md'), L.join('\n') + '\n'); console.log('→ docs/SWING_FOOTPRINT_ATLAS.md')
