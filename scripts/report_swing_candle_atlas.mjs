// report_swing_candle_atlas.mjs — data/master/swing_candle_atlas.json → docs/SWING_CANDLE_ATLAS.md (2026-10-17). Plain words, the n behind every
// number, FINDINGS separated from everything else. Pure formatting — no statistics are computed here.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const A = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_candle_atlas.json'), 'utf8'))
const pc = (x) => (x == null ? '—' : (100 * x).toFixed(0) + '%')
const where = (o, side) => { const ext = side === 'L' ? 'low' : 'high'; o = Number(o); return o < 0 ? `${-o} candle${o < -1 ? 's' : ''} before the ${ext}` : o === 0 ? `the ${ext} candle itself` : `${o} candle${o > 1 ? 's' : ''} after the ${ext} (${ext} still holding)` }
const WORDS = { dir_bull: 'is bullish', dir_bear: 'is bearish', dir_doji: 'is a doji', inside: 'is an inside bar', outside: 'is an outside bar', bull_engulf: 'is a bullish engulfing', bear_engulf: 'is a bearish engulfing',
  sweep_low_reclaim: 'takes the previous low and closes back above it', sweep_high_reject: 'takes the previous high and closes back below it', hammer: 'is a hammer', shooting_star: 'is a shooting star', marubozu: 'is a marubozu (almost all body)',
  'range_atr:hi': 'is a LARGE candle (top third of range)', 'range_atr:lo': 'is a SMALL candle (bottom third of range)', 'range_atr:mid': 'is a medium-size candle', 'body_atr:hi': 'has a LARGE body', 'body_atr:lo': 'has a SMALL body', 'body_atr:mid': 'has a medium body',
  'body_frac:hi': 'is mostly body', 'body_frac:lo': 'is mostly wick', 'body_frac:mid': 'is half body', 'upper_wick_frac:hi': 'has a LONG upper wick', 'upper_wick_frac:lo': 'has almost no upper wick', 'upper_wick_frac:mid': 'has a medium upper wick',
  'lower_wick_frac:hi': 'has a LONG lower wick', 'lower_wick_frac:lo': 'has almost no lower wick', 'lower_wick_frac:mid': 'has a medium lower wick', 'close_loc:hi': 'closes in its TOP third', 'close_loc:lo': 'closes in its BOTTOM third', 'close_loc:mid': 'closes in its middle third',
  'gap_atr:hi': 'opens with a gap UP', 'gap_atr:lo': 'opens with a gap DOWN', 'gap_atr:mid': 'opens with no real gap',
  'leg_bars:hi': 'ends a LONG leg (many candles since the previous swing)', 'leg_bars:lo': 'ends a SHORT leg (few candles)', 'leg_bars:mid': 'ends a medium-length leg', 'leg_atr:hi': 'ends a BIG leg (size in ATR)', 'leg_atr:lo': 'ends a SMALL leg', 'leg_atr:mid': 'ends a medium leg',
  beyond_prev_same: { L: 'is a LOWER low than the previous swing low', H: 'is a HIGHER high than the previous swing high' },
  hi_event_candle: 'contains a HIGH-impact USD release', hi_event_window: 'has a HIGH-impact USD release in the extreme candle or the 3 before', usd_pos_surprise_candle: 'contains a USD-POSITIVE surprise (actual better than forecast)', usd_neg_surprise_candle: 'contains a USD-NEGATIVE surprise',
  dxy_up_candle: 'happens while the DXY candle is UP', dxy_up_window: 'happens while DXY rose over the extreme + 3 candles before', silver_up_candle: 'happens while the silver candle is UP', news_in_candle: 'has gold news published inside it (2020+)', heavy: 'has HEAVY real CME volume (≥ 1.5× its 20-candle median; 2024-10+)', light: 'has LIGHT real CME volume (≤ 0.67×; 2024-10+)' }
const band = (d) => { const a = Math.abs(d) * 100; return a >= 10 ? 'clear' : a >= 5 ? 'moderate' : 'tiny' }   // ADDENDUM B (presentation only)
const say = (key, side) => { const [a, b] = key.split('|'); const off = /^-?\d+$/.test(a) ? a : '0'; const w = WORDS[b]; const txt = typeof w === 'object' ? w[side] : w ?? b; return a === 'ctx' || a === 'vol' ? `the ${side === 'L' ? 'low' : 'high'} candle ${txt}` : `${where(off, side)} ${txt}` }
function headline() { const agg = {}
  for (const [tf, r] of Object.entries(A.timeframes)) for (const side of ['L', 'H']) for (const x of r.sides[side].rows) if (x.verdict === 'FINDING' && Math.abs(x.diff_c1) >= 0.05) (agg[side + '|' + x.key] ??= []).push({ tf, x })
  const rows = Object.entries(agg).filter(([, v]) => v.length >= 5).sort((a, b) => b[1].length - a[1].length)
  const pick = (v) => (v.find((z) => z.tf === '1H') ?? v.find((z) => z.tf === '15m') ?? v[0])
  const sec = (title, f) => { const r = rows.filter(([k]) => f(k.split('|')[1])); if (!r.length) return []
    return ['', '### ' + title, '', '| side | what | timeframes | example (OOS): swing / failed / random |', '|---|---|---|---|', ...r.map(([k, v]) => { const side = k.split('|')[0], key = k.slice(2), e = pick(v)
      return `| ${side === 'L' ? 'low' : 'high'} | ${say(key, side)} | ${v.map((z) => z.tf).join(', ')} | ${e.tf}: **${pc(e.x.swing_oos)}** / ${pc(e.x.c1_oos)} / ${pc(e.x.c2_oos)} |` })] }
  return ['## Headline: proven on ≥ 5 timeframes with at least a moderate (≥ 5 point) gap', '',
    'Read as: "at a real swing this happens X % of the time, at a failed extreme Y %, at a random candle Z %".',
    ...sec('Knowable AT the extreme candle (or before)', (o) => o === 'ctx' || o === 'vol' || Number(o) <= 0),
    ...sec('In the candles AFTER the extreme (extreme still holding; addendum A)', (o) => Number(o) > 0), ''] }
const L = ['# Swing-candle atlas: Phase 1 results', '', `Generated ${A.at} from \`data/master/swing_candle_atlas.json\`. Spec: \`docs/SWING_CANDLE_SPEC.md\` (+ clarifications + addendum A).`, '',
  `Window ${A.window[0].slice(0, 10)} → ${A.window[1].slice(0, 10)}. Rules found on TRAIN, tested on OOS (from ${A.oos_from.slice(0, 10)}).`, '',
  'A **FINDING** must meet all of the following:', '',
  '- OOS swing vs failed-extreme difference passing Holm across every measure of that timeframe and side;', '- the same sign in TRAIN;', '- the same sign vs random candles;', '- the same sign with swings of 2× and 5× ATR.', '',
  '**Labels for everything else:**', '', '- "described only" = fewer than 30 OOS swings, so it cannot be proven;', '- "inconsistent" = the sign flips between periods;', '- "fails robustness" = passes OOS but breaks one of the checks.', '',
  ...headline(), '## Overview', '', '| TF | candles | swings H (TRAIN+OOS) | swings L | median size (ATR) | confirmed after (bars) | FINDINGS highs | FINDINGS lows |', '|---|---|---|---|---|---|---|---|']
for (const [tf, r] of Object.entries(A.timeframes)) L.push(`| ${tf} | ${r.candles.toLocaleString()} | ${r.swings.H.S.T}+${r.swings.H.S.O} | ${r.swings.L.S.T}+${r.swings.L.S.O} | ${r.amp_median_atr} | ${r.confirm_lag_median_bars} | ${r.sides.H.oos_swings < 30 ? 'described only' : r.sides.H.findings} | ${r.sides.L.oos_swings < 30 ? 'described only' : r.sides.L.findings} |`)
for (const [tf, r] of Object.entries(A.timeframes)) {
  L.push('', `## ${tf}`, '', `${r.candles.toLocaleString()} candles; median swing ${r.amp_median_atr} ATR, confirmed a median ${r.confirm_lag_median_bars} candles after the extreme.`, '',
    `Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows ${pc(r.confirmed_by_offset.L['1'])} / ${pc(r.confirmed_by_offset.L['2'])} / ${pc(r.confirmed_by_offset.L['3'])}, highs ${pc(r.confirmed_by_offset.H['1'])} / ${pc(r.confirmed_by_offset.H['2'])} / ${pc(r.confirmed_by_offset.H['3'])}.`)
  for (const side of ['L', 'H']) { const s = r.sides[side], name = side === 'L' ? 'Swing LOWS' : 'Swing HIGHS'
    if (s.oos_swings < 30) { L.push('', `### ${name}: DESCRIBED ONLY (${s.oos_swings} OOS swings; cannot be proven)`, '', 'The largest observed OOS differences, for description only:', '', '| what | swing | failed extreme | random | n swings |', '|---|---|---|---|---|')
      for (const x of s.rows.filter((x) => x.diff_c1 != null).sort((a, b) => Math.abs(b.diff_c1) - Math.abs(a.diff_c1)).slice(0, 8)) L.push(`| ${say(x.key, side)} | ${pc(x.swing_oos)} | ${pc(x.c1_oos)} | ${pc(x.c2_oos)} | ${x.n_s} |`); continue }
    const F = s.rows.filter((x) => x.verdict === 'FINDING').sort((a, b) => Math.abs(b.diff_c1) - Math.abs(a.diff_c1))
    L.push('', `### ${name}: ${F.length} finding${F.length === 1 ? '' : 's'} (${s.oos_swings} OOS swings)`)
    if (F.length) { L.push('', '| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |', '|---|---|---|---|---|---|')
      for (const x of F) L.push(`| ${say(x.key, side)} | **${pc(x.swing_oos)}** | ${pc(x.c1_oos)} | ${pc(x.c2_oos)} | ${band(x.diff_c1)} ${(100 * x.diff_c1 > 0 ? '+' : '') + (100 * x.diff_c1).toFixed(0)} pt | ${pc(x.train_swing)} / ${pc(x.train_c1)} |`) }
    else L.push('', 'No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).')
    const other = s.rows.filter((x) => x.verdict === 'INCONSISTENT' || x.verdict === 'FAILS_ROBUSTNESS')
    if (other.length) L.push('', `Passed OOS but NOT proven (${other.length}): ` + other.slice(0, 6).map((x) => `${say(x.key, side)} [${x.verdict.toLowerCase().replace('_', ' ')}]`).join('; ') + (other.length > 6 ? ' …' : '')) } }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_CANDLE_ATLAS.md'), L.join('\n') + '\n')
console.log('→ docs/SWING_CANDLE_ATLAS.md')
