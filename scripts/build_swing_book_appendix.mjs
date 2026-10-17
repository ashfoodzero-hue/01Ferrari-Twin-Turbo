// build_swing_book_appendix.mjs — the COMPLETE, unfiltered record of every phase of the swing study (2026-10-17; Ashraf: "make a full book that
// records these analysis in details … do not drop anything … any small info could be very important later"). Regenerates the appendices of
// docs/SWING_STUDY_BOOK.md from the result files — every measured row, every timeframe, both sides, findings AND non-findings:
//   docs/swing_book/phase1/<TF>.md   + docs/swing_book/phase1_all_rows.csv
//   docs/swing_book/phase2/<TF>.md   + docs/swing_book/phase2_all_rows.csv   (once data/master/swing_footprint_atlas.json exists)
// Pure formatting — no statistics are computed here. Re-run after every study run.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const OUT = path.join(TURBO.root, 'docs', 'swing_book'), pc = (x) => (x == null ? '' : (100 * x).toFixed(1))
const band = (d) => (d == null ? '' : Math.abs(d) >= 0.1 ? 'clear' : Math.abs(d) >= 0.05 ? 'moderate' : 'tiny')
const COLS = ['timeframe', 'side', 'measure', 'swing_oos_pct', 'failed_oos_pct', 'random_oos_pct', 'gap_pt', 'effect', 'n_swing_oos', 'n_failed_oos', 'p', 'p_holm', 'train_swing_pct', 'train_failed_pct', 'k2_gap_pt', 'k5_gap_pt', 'verdict']
function phase(name, file, title) {
  const f = path.join(TURBO.master, file); if (!fs.existsSync(f)) { console.log(`  ${name}: ${file} not found — skipped`); return }
  const A = JSON.parse(fs.readFileSync(f, 'utf8')), dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true })
  const csv = [COLS.join(',')], index = [`# ${title}: complete tables`, '', `Source: \`data/master/${file}\` (${A.at}). Every measured row; nothing filtered. Columns are explained in docs/SWING_STUDY_BOOK.md §A.`, '', '| TF | file | swings H (TRAIN+OOS) | swings L | findings H | findings L |', '|---|---|---|---|---|---|']
  for (const [tf, r] of Object.entries(A.timeframes)) {
    const md = [`# ${title}: ${tf}, every row`, '', `Candles ${r.candles?.toLocaleString?.() ?? '—'} · broken (holes) ${r.broken_candles ?? '—'} · median swing ${r.amp_median_atr ?? '—'} ATR · median confirmation ${r.confirm_lag_median_bars ?? '—'} candles.`]
    if (r.confirmed_by_offset) md.push('', `Already confirmed by candle +1 / +2 / +3: lows ${pc(r.confirmed_by_offset.L['1'])} / ${pc(r.confirmed_by_offset.L['2'])} / ${pc(r.confirmed_by_offset.L['3'])} % · highs ${pc(r.confirmed_by_offset.H['1'])} / ${pc(r.confirmed_by_offset.H['2'])} / ${pc(r.confirmed_by_offset.H['3'])} %.`)
    if (r.swings) md.push('', `Events (TRAIN / OOS): swing highs ${r.swings.H.S.T} / ${r.swings.H.S.O} · failed highs ${r.swings.H.C1.T} / ${r.swings.H.C1.O} · random (high side) ${r.swings.H.C2.T} / ${r.swings.H.C2.O} · swing lows ${r.swings.L.S.T} / ${r.swings.L.S.O} · failed lows ${r.swings.L.C1.T} / ${r.swings.L.C1.O} · random (low side) ${r.swings.L.C2.T} / ${r.swings.L.C2.O}.`)
    for (const side of ['L', 'H']) { const s = r.sides[side]; if (!s) continue
      md.push('', `## ${side === 'L' ? 'Swing LOWS' : 'Swing HIGHS'} (${s.oos_swings} OOS swings${s.oos_swings < 30 ? ' — DESCRIBED ONLY' : ''}; ${s.findings} findings)`, '',
        '| measure | swing % | failed % | random % | gap pt | effect | n swing | n failed | p (OOS) | p Holm | TRAIN swing / failed % | gap at 2× / 5× ATR | verdict |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|')
      for (const x of s.rows) { const gap = x.diff_c1 == null ? '' : (100 * x.diff_c1).toFixed(1)
        md.push(`| ${x.key} | ${pc(x.swing_oos)} | ${pc(x.c1_oos)} | ${pc(x.c2_oos)} | ${gap} | ${band(x.diff_c1)} | ${x.n_s} | ${x.n_c1} | ${x.p == null ? '' : x.p.toExponential(2)} | ${x.p_holm == null ? '' : x.p_holm.toExponential(2)} | ${pc(x.train_swing)} / ${pc(x.train_c1)} | ${x.k2_diff == null ? '' : (100 * x.k2_diff).toFixed(1)} / ${x.k5_diff == null ? '' : (100 * x.k5_diff).toFixed(1)} | ${x.verdict} |`)
        csv.push([tf, side, x.key, pc(x.swing_oos), pc(x.c1_oos), pc(x.c2_oos), gap, band(x.diff_c1), x.n_s, x.n_c1, x.p ?? '', x.p_holm ?? '', pc(x.train_swing), pc(x.train_c1), x.k2_diff == null ? '' : (100 * x.k2_diff).toFixed(1), x.k5_diff == null ? '' : (100 * x.k5_diff).toFixed(1), x.verdict].join(',')) } }
    fs.writeFileSync(path.join(dir, `${tf}.md`), md.join('\n') + '\n')
    index.push(`| ${tf} | [${tf}.md](${name}/${tf}.md) | ${r.swings ? r.swings.H.S.T + '+' + r.swings.H.S.O : '—'} | ${r.swings ? r.swings.L.S.T + '+' + r.swings.L.S.O : '—'} | ${r.sides.H?.findings ?? '—'} | ${r.sides.L?.findings ?? '—'} |`) }
  fs.writeFileSync(path.join(OUT, `${name}_all_rows.csv`), csv.join('\n') + '\n'); fs.writeFileSync(path.join(OUT, `${name}_index.md`), index.join('\n') + '\n')
  console.log(`  ${name}: ${csv.length - 1} rows → docs/swing_book/${name}_all_rows.csv + ${Object.keys(A.timeframes).length} timeframe files`) }
fs.mkdirSync(OUT, { recursive: true })
phase('phase1', 'swing_candle_atlas.json', 'Phase 1 candle atlas')
phase('phase2', 'swing_footprint_atlas.json', 'Phase 2 footprint atlas')
// Phase 3 (flip ladder) — every ladder / evidence / cross-asset row, both periods
{ const f = path.join(TURBO.master, 'swing_ladder_atlas.json')
  if (fs.existsSync(f)) { const A = JSON.parse(fs.readFileSync(f, 'utf8')), dir = path.join(OUT, 'phase3'); fs.mkdirSync(dir, { recursive: true })
    const csv = ['part,anchor,side,item,period,n,share_or_real_given_flip,base,median_delay_or_lead_min,q1,q3,before_anchor_share,extra,verdict']
    for (const [anc, r] of Object.entries(A.anchors)) { const md = [`# Phase 3 flip ladder: anchor ${anc}, every row`, '', `Source: data/master/swing_ladder_atlas.json (${A.at}).`]
      for (const side of ['L', 'H']) { const s = r.sides[side]; md.push('', `## ${side === 'L' ? 'Lows' : 'Highs'} (real ${s.real_swings.T}+${s.real_swings.O}, failed ${s.failed.T}+${s.failed.O})`, '', '### A. Ladder', '', '| TF | period | n real | flipped | share | delay median / q1 / q3 (min) | vs anchor conf median (min) | before anchor |', '|---|---|---|---|---|---|---|---|')
        for (const [X, row] of Object.entries(s.ladder)) for (const sp of ['T', 'O']) { const o = row[sp]; md.push(`| ${X} | ${sp} | ${o.n} | ${o.flipped} | ${pc(o.share)} | ${o.delay_min_median ?? ''} / ${o.delay_min_q1 ?? ''} / ${o.delay_min_q3 ?? ''} | ${o.vs_anchor_conf_min_median ?? ''} | ${pc(o.before_anchor_share)} |`)
          csv.push(['ladder', anc, side, X, sp, o.n, pc(o.share), '', o.delay_min_median ?? '', o.delay_min_q1 ?? '', o.delay_min_q3 ?? '', pc(o.before_anchor_share), row.flag, ''].join(',')) }
        md.push('', '### B. Evidence', '', '| flipped | period | candidates | base | n flipped | real given flip | Wilson lo | real if NOT flipped | lead median (min) | p | verdict |', '|---|---|---|---|---|---|---|---|---|---|---|')
        for (const e of s.evidence) for (const sp of ['T', 'O']) { const o = e[sp]; md.push(`| ${e.key} | ${sp} | ${o.candidates} | ${pc(o.base)} | ${o.n_flipped} | ${pc(o.p_real_given_flip)} | ${pc(o.wilson_lo)} | ${pc(o.p_real_not_flipped)} | ${o.lead_min_median ?? ''} | ${o.p == null ? '' : o.p.toExponential(2)} | ${sp === 'O' ? e.verdict : ''} |`)
          csv.push(['evidence', anc, side, e.key, sp, o.n_flipped, pc(o.p_real_given_flip), pc(o.base), o.lead_min_median ?? '', '', '', '', `not_flipped ${pc(o.p_real_not_flipped)}`, sp === 'O' ? e.verdict : ''].join(',')) }
        md.push('', '### C. DXY / silver', '', '| series | group_period | n | matched | share | extreme earlier | same candle | extreme lead median (candles) | confirm earlier | confirm lead median (min) |', '|---|---|---|---|---|---|---|---|---|---|')
        for (const [nm, row] of Object.entries(s.cross)) for (const [g, o] of Object.entries(row)) { md.push(`| ${nm} | ${g} | ${o.n} | ${o.matched} | ${pc(o.share)} | ${pc(o.extreme_earlier_share)} | ${pc(o.extreme_same_candle_share)} | ${o.extreme_lead_candles_median ?? ''} | ${pc(o.confirm_earlier_share)} | ${o.confirm_lead_min_median ?? ''} |`)
          csv.push(['cross', anc, side, nm, g, o.n, pc(o.share), '', o.confirm_lead_min_median ?? '', '', '', pc(o.extreme_earlier_share), `same ${pc(o.extreme_same_candle_share)}`, ''].join(',')) }
        md.push('', '### Order (smaller TF first, all pairs)', '', Object.entries(s.order).map(([k, v]) => `${k}: ${pc(v.x_first)} (tie ${pc(v.tie)}, n ${v.both})`).join(' · ')) }
      fs.writeFileSync(path.join(dir, `${anc}.md`), md.join('\n') + '\n') }
    fs.writeFileSync(path.join(OUT, 'phase3_all_rows.csv'), csv.join('\n') + '\n'); console.log(`  phase3: ${csv.length - 1} rows → docs/swing_book/phase3_all_rows.csv + ${Object.keys(A.anchors).length} anchor files`) } }
