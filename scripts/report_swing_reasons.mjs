// report_swing_reasons.mjs — docs/SWING_REASONS_ATLAS.md generated FROM data/master/xau_swing_reasons.json (never typed by hand).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { compareRates, holm } from '../src/core/studyStats.js'

const S = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'xau_swing_reasons.json'), 'utf8')), L = []
const NAME = { r01_dxy_against: '1 DXY against gold', r02_yield_move: '2 10y yield move ≥ 5 bp', r04_fomc: '4 FOMC', r05_fed_speech: '5 Fed speech', r06_inflation: '6 Inflation data', r07_jobs: '7 Jobs data',
  r08_growth: '8 Growth data', r09_other_high: '9 Other high-impact USD', r10_holiday: '10 Holiday / thin', r11_war_news: '11 War headline ◐', r12_tariff_news: '12 Tariff headline ◐', r13_fiscal_news: '13 Fiscal headline ◐',
  r14_risk_off: '14 Risk-off (yen / BTC)', r15_em_stress: '15 EM stress (TRY / ZAR)', r16_cny_weak: '16 Yuan weak ◐', r17_inr_weak: '17 Rupee weak ◐', r19_gld_volume: '19 GLD volume ≥ 2× ◐', r22_silver_confirms: '22 Silver confirms',
  r23_silver_diverges: '23 Silver diverges', r24_oil_shock: '24 Oil shock ≥ 3 %', r25_cme_spike: '25 CME volume ≥ 2×', r26_absorption: '26 Order-flow absorption', r27_prior_swing_level: '27 Prior swing level',
  r28_liquidity_sweep: '28 Liquidity sweep', r29_round_number: '29 Round number', r30_prev_day_week: '30 Prev day / week extreme', r31_rsi_divergence: '31 RSI divergence', r32_overextended: '32 Overextended',
  r33_climax_candle: '33 Climax candle', r37_week_open: '37 Week open', r37_month_end: '37 Month end', r37_quarter_end: '37 Quarter end', r38_options_expiry: '38 Options expiry ◐' }
const yes = (v) => v === true || (typeof v === 'string' && v && v !== 'no data' && !/^(with|against|daily|ASIA|LONDON|NEWYORK)$/.test(v) && !/^\d{4}-\d{2}$/.test(v))
const pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %')
L.push('# Why gold made its waves — the reasons at every XAU 1D / 4H swing (last year)', '', `Generated from \`data/master/xau_swing_reasons.json\` (${S.at}). Checklist + rules: \`docs/SWING_REASONS_CHECKLIST_SPEC.md\`. Every row: \`docs/swing_book/xau_reasons/1D.csv\`, \`4H.csv\`.`, '',
  `Window ${S.window[0].slice(0, 10)} → ${S.window[1].slice(0, 10)}. Swings: ZigZag 3 × ATR(14), TradingView-exact candles (reopen spikes clamped). Each reason is checked at the swing candle ± 1 candle with only what was published by then.`, '',
  '**How to read this:** "at swings" vs "at random candles" (same timeframe, same hour). A reason counts as a candidate driver only if it is clearly MORE frequent at swings than at ordinary candles. Present ≠ caused it; 13 daily and 80 4H swings describe, they cannot prove.', '')
for (const tf of ['1D', '4H']) { const T = S.tf[tf]
  L.push(`## ${tf}: how often each reason was present — at ${T.swings} swings vs ${T.controls} random candles`, '', '| Reason | At swings | At random candles | Swings checked | p (Holm) | Reading |', '|---|---|---|---|---|---|')
  const rows = Object.entries(T.prevalence).filter(([k]) => NAME[k]).map(([k, p]) => { const k1 = Math.round(p.at_swings * p.n_swings), k2 = p.at_random == null ? 0 : Math.round(p.at_random * p.n_random)
    return { k, p, d: p.at_random == null ? 0 : p.at_swings - p.at_random, key: k, pv: p.at_random == null ? null : compareRates(k1, p.n_swings, k2, p.n_random).p } }).sort((a, b) => b.d - a.d)
  holm(rows.map((r) => Object.assign(r, { p: r.pv, pRow: r.p }) && { key: r.k, p: r.pv, ref: r })).forEach((x) => { x.ref.holm = x.holm_pass; x.ref.pHolm = x.p_holm })
  for (const r of rows) { const p = r.pRow, d = r.d
    let read = r.holm && d > 0 ? '**MORE frequent at swings (significant after correction)**' : r.pv != null && r.pv < 0.05 && d > 0 ? 'more frequent at swings (p < 0.05, not significant after correction)' : r.holm && d < 0 ? '**LESS frequent at swings (significant)**' : d >= 0.1 ? 'tendency at swings, not significant (small sample)' : d <= -0.1 ? 'tendency against, not significant' : 'about the same as ordinary candles'
    if (r.k === 'r26_absorption') read = 'uninformative at this timeframe (the rule never fires on candles this big)'
    if (r.k === 'r29_round_number' && tf === '1D') read = 'uninformative on daily (a $50 level is almost always within 0.25 ATR)'
    if (r.k === 'r22_silver_confirms' || r.k === 'r23_silver_diverges') read += ' — silver co-moves with gold: expected, not a cause'
    L.push(`| ${NAME[r.k]} | ${pc(p.at_swings)} | ${pc(p.at_random)} | ${p.n_swings} | ${r.pHolm == null ? '—' : r.pHolm.toFixed(3)} | ${read} |`) }
  const cat = (key) => { const c = {}; for (const r of T.rows) { const v = r[key] ?? 'n/a'; c[v] = (c[v] || 0) + 1 } return Object.entries(c).map(([v, n]) => `${v} ${n}`).join(' · ') }
  L.push('', `- **34 Higher-timeframe leg (${tf === '1D' ? '1W' : '1D'}) at the turn:** ${cat('r34_htf_leg')}`, `- **35 Lower timeframes already turned at the same price** (of 3): ${cat('r35_lower_tfs_flipped')}`)
  if (tf === '4H') L.push(`- **36 Session of the swing candle:** ${cat('r36_session')}`)
  L.push(`- **No data (never guessed):** 18 central-bank buying · 20 COT positioning · 21 stocks / VIX.`, '')
  L.push(`### ${tf}: every swing and the reasons present`, '')
  if (tf === '1D') { for (const r of T.rows) { L.push(`**${r.swing} ${r.price} — ${r.candle.slice(0, 10)}** (leg ${r.leg_atr ?? '—'} ATR)`, '')
      const items = Object.keys(NAME).filter((k) => yes(r[k])).map((k) => `${NAME[k]}${typeof r[k] === 'string' ? `: ${r[k]}` : ''}`)
      L.push(items.length ? items.map((x) => `- ${x}`).join('\n') : '- (none of the measured reasons)', `- DXY ${r.r01_dxy_pct != null ? (100 * r.r01_dxy_pct).toFixed(2) + ' %' : '—'} · 10y yield ${r.r02_yield_bp ?? '—'} bp · CME volume ×${r.r25_cme_volume_x ?? '—'} · 1W leg ${r.r34_htf_leg ?? '—'} · lower TFs turned ${r.r35_lower_tfs_flipped ?? '—'}/3`, '') } }
  else { L.push('| Swing | Candle (UTC) | Price | Leg ATR | Reasons present (numbers from the list) | 1D leg | Session |', '|---|---|---|---|---|---|---|')
    for (const r of T.rows) L.push(`| ${r.swing} | ${r.candle.slice(0, 16).replace('T', ' ')} | ${r.price} | ${r.leg_atr ?? '—'} | ${Object.keys(NAME).filter((k) => yes(r[k])).map((k) => NAME[k].split(' ')[0]).join(', ') || '—'} | ${r.r34_htf_leg ?? '—'} | ${r.r36_session} |`) }
  L.push('') }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_REASONS_ATLAS.md'), L.join('\n') + '\n')
console.log('written docs/SWING_REASONS_ATLAS.md (' + L.length + ' lines)')
