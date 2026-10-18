// report_structure_3m.mjs — the 3m structure-confirmation atlas for XAU / XAG / DXY / WTI, generated FROM data/master/structure_3m_<short>.json
// (scripts/study_structure_3m.mjs). Writes data/master/structure_3m_confirmation.json + docs/STRUCTURE_3M_CONFIRMATION_ATLAS.md. Never typed by hand.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { compareRates, holm, wilson } from '../src/core/studyStats.js'

const INS = [['XAUUSD', 'xau', 'XAU'], ['XAGUSD', 'xag', 'Silver'], ['DXY_ICE', 'dxy_ice', 'DXY'], ['WTI', 'wti', 'WTI']], TFS = ['15m', '1H', '4H', '1D'], MIN_N = 30
const D = Object.fromEntries(INS.map(([s, sh]) => [s, JSON.parse(fs.readFileSync(path.join(TURBO.master, `structure_3m_${sh}.json`), 'utf8'))]))
// item → [label, denominator filter, yes test]
const ok = (r) => r.status === 'ok', lv = (r) => ok(r) && r.has_level, cf = (r) => lv(r) && r.confirmed
const ITEMS = [
  ['has_level', 'A 3m confirmation level exists in the leg', ok, (r) => r.has_level],
  ['level_known_at_tip', 'The level was already a confirmed 3m pivot when the tip printed', lv, (r) => r.level_known_at_tip],
  ['sweep', 'Tip = liquidity sweep of the previous 3m pivot (closes back inside)', lv, (r) => r.sweep],
  ['confirmed', '3m close beyond the level BEFORE the tip breaks (within 20 anchor candles)', lv, (r) => r.confirmed],
  ['wick_first', 'A wick went through the level before the confirming close', cf, (r) => r.wick_first],
  ['v_turn', 'V-turn (no 3m higher low / lower high before confirmation)', cf, (r) => r.v_turn],
  ['hl_turn', '3m higher low / lower high formed before confirmation', cf, (r) => r.hl_turn],
  ['double_tip', 'Double tip (second test within 0.25 anchor ATR)', cf, (r) => r.double_tip],
  ['strong_conf_candle', 'Strong confirming candle (body ≥ 60 %, close in top 25 %)', cf, (r) => r.strong_conf_candle],
  ['retest', 'Price came back to the level after confirmation', cf, (r) => r.retest],
  ['retest_held', 'The retest HELD (no 3m close back through the level)', (r) => cf(r) && r.retest, (r) => r.retest_held],
  ['second_conf', 'Second confirmation (next 3m pivot closed through) before the tip broke', cf, (r) => r.second_conf],
  ['extension', 'After confirmation: 1:1 extension reached before the tip broke', cf, (r) => r.after_conf === 'extension'] ]
const NUM = [['level_dist_anchor_atr', 'Level distance from tip (anchor ATR)'], ['level_dist_atr3', 'Level distance from tip (3m ATR)'], ['level_dist_pct', 'Level distance from tip (% of price)'],
  ['minutes_to_conf', 'Minutes from tip to confirming close'], ['close_beyond_atr3', 'Confirming close beyond the level (3m ATR)'], ['body_frac', 'Confirming candle body / range'], ['close_loc', 'Confirming close location in its range']]
const rate = (rows, it) => { const d = rows.filter(it[2]), k = d.filter(it[3]).length; return { k, n: d.length, p: d.length ? k / d.length : null } }
const q = (a, f) => { a = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(f * a.length))] : null }
const pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %'), fx = (x, d = 2) => (x == null ? '—' : (+x).toFixed(d))
const res = { at: new Date().toISOString(), spec: 'docs/STRUCTURE_3M_CONFIRMATION_SPEC.md', window: D.XAUUSD.window, regression_same_swings_as_tables: true, cells: {}, real_vs_failed: [], cross: [], precision: {}, medians: {} }

for (const [s] of INS) for (const tf of TFS) { const R = D[s].tf[tf].rows; if (!D[s].tf[tf].regression_same_swings_as_table) res.regression_same_swings_as_tables = false
  const real = R.filter((r) => r.group === 'real'), fail = R.filter((r) => r.group === 'failed')
  for (const it of ITEMS) { const a = rate(real, it), b = rate(fail, it), c = compareRates(a.k, a.n, b.k, b.n)
    res.cells[`${s}|${tf}|${it[0]}`] = { real: a, failed: b, real_lb: wilson(a.k, a.n).lo }
    res.real_vs_failed.push({ key: `${s}|${tf}|${it[0]}`, sym: s, tf, item: it[0], p: c.p, diff: c.diff, n_real: a.n, n_failed: b.n }) }
  const cr = real.filter(cf).length, cfl = fail.filter(cf).length, all = R.filter((r) => r.group !== 'real'), cfa = all.filter(cf).length
  res.precision[`${s}|${tf}`] = { real_tips: real.length, failed_tips: fail.length, base_share_real: real.length / (real.length + fail.length), confirmed_real: cr, confirmed_failed: cfl, precision: cr / (cr + cfl || 1),
    all_failed_tips: all.length, confirmed_all_failed: cfa, base_share_real_all: real.length / (real.length + all.length), precision_vs_all_failed: cr / (cr + cfa || 1) }
  // how early: does the 3m confirmation come before the anchor ZigZag itself confirms the swing (published table, confirmed_at)?
  const tab = Object.fromEntries(fs.readFileSync(path.join(TURBO.root, 'docs', 'swing_book', `${INS.find((x) => x[0] === s)[1]}_1y_swings`, `${tf}.csv`), 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).map((a) => [a[1], a[11]]))
  const early = real.filter(cf).filter((r) => tab[r.candle]), ek = early.filter((r) => r.conf_at <= tab[r.candle]).length
  res.precision[`${s}|${tf}`].conf_before_anchor_confirm = { k: ek, n: early.length, p: early.length ? ek / early.length : null }
  res.medians[`${s}|${tf}`] = Object.fromEntries(NUM.map(([k]) => { const v = real.filter((r) => (k.startsWith('level') ? lv(r) : cf(r))).map((r) => r[k]); return [k, { p25: q(v, 0.25), med: q(v, 0.5), p75: q(v, 0.75), n: v.filter((x) => x != null).length }] })) }
holm(res.real_vs_failed)
for (const tf of TFS) for (const it of ITEMS) for (let i = 0; i < INS.length; i++) for (let j = i + 1; j < INS.length; j++) {
  const a = res.cells[`${INS[i][0]}|${tf}|${it[0]}`].real, b = res.cells[`${INS[j][0]}|${tf}|${it[0]}`].real, c = compareRates(a.k, a.n, b.k, b.n)
  res.cross.push({ key: `${tf}|${it[0]}|${INS[i][0]}~${INS[j][0]}`, tf, item: it[0], a: INS[i][0], b: INS[j][0], pa: a.p, pb: b.p, na: a.n, nb: b.n, diff: c.diff, p: c.p }) }
holm(res.cross)
fs.writeFileSync(path.join(TURBO.master, 'structure_3m_confirmation.json'), JSON.stringify(res, null, 1))

// ── atlas ─────────────────────────────────────────────────────────────────────
const L = [], NM = Object.fromEntries(INS.map(([s, , n]) => [s, n])), IL = Object.fromEntries(ITEMS.map((x) => [x[0], x[1]]))
const rvf = Object.fromEntries(res.real_vs_failed.map((r) => [r.key, r]))
L.push('# 3m structure confirmation at the swing tips: XAU, Silver, DXY, WTI (last year)', '',
  `Generated from \`data/master/structure_3m_confirmation.json\` (${res.at}); rules in \`docs/STRUCTURE_3M_CONFIRMATION_SPEC.md\`, exact operational choices in the header of \`scripts/study_structure_3m.mjs\`, proved by \`smoke_structure_3m\`. Every tip: \`docs/swing_book/structure3m/<asset>_<tf>.csv\`.`, '',
  `Window ${res.window[0].slice(0, 10)} → ${res.window[1].slice(0, 10)}. Anchor swings = exactly the published last-year swing tables (rebuilt and checked equal: **${res.regression_same_swings_as_tables ? 'all 16 tables identical' : 'MISMATCH'}**). DXY = TradingView ICE session. Controls = FAILED extremes of the same timeframe (pulled back ≥ 1 ATR, then broken).`, '',
  '**How to read:** "real" = at the real swing tips; "failed" = at tips that looked like a turn and then broke. A pattern helps in real time only if it is clearly MORE common at real tips than at failed ones (✔ = significant after Holm across all 208 comparisons). A pattern that is high at both is just how price moves, not a sign of a real turn.', '')

L.push('## 1. The confirmation level, exactly', '')
L.push('For a LOW tip the confirmation level is **the last 3m lower high (3-candle pivot) of the leg into the tip**; the swing is confirmed by the **first 3m CLOSE above it**. Mirror for a HIGH tip. Typical numbers at REAL tips (median, P25-P75):', '')
L.push('| Timeframe | Asset | Tips | Level distance (anchor ATR) | (3m ATR) | (% of price) | Minutes tip → confirmation | Close beyond (3m ATR) | Confirming body / range | 3m confirmation came BEFORE the anchor swing was confirmed |', '|---|---|---|---|---|---|---|---|---|---|')
for (const tf of TFS) for (const [s] of INS) { const m = res.medians[`${s}|${tf}`], P = res.precision[`${s}|${tf}`], g = (k, d = 2) => `${fx(m[k].med, d)} (${fx(m[k].p25, d)}-${fx(m[k].p75, d)})`
  L.push(`| ${tf} | ${NM[s]} | ${P.real_tips} | ${g('level_dist_anchor_atr')} | ${g('level_dist_atr3', 1)} | ${g('level_dist_pct', 2)} | ${g('minutes_to_conf', 0)} | ${g('close_beyond_atr3')} | ${g('body_frac')} | ${pc(P.conf_before_anchor_confirm.p)} (n ${P.conf_before_anchor_confirm.n}) |`) }
L.push('')

L.push('## 2. Does the 3m confirmation tell a real swing from a failed one? (precision)', '')
L.push('| Timeframe | Asset | Real tips | Failed tips | Share real (base) | Confirmed: real | Confirmed: failed | **Precision** (share real among confirmed) | Lift | Audit: EVERY failed extreme (no pullback filter): tips · confirmed · precision |', '|---|---|---|---|---|---|---|---|---|---|')
const sg = (x) => `${x >= 0 ? '+' : ''}${Math.round(100 * x)} pp`
for (const tf of TFS) for (const [s] of INS) { const P = res.precision[`${s}|${tf}`]
  L.push(`| ${tf} | ${NM[s]} | ${P.real_tips} | ${P.failed_tips} | ${pc(P.base_share_real)} | ${P.confirmed_real} | ${P.confirmed_failed} | **${pc(P.precision)}** | ${sg(P.precision - P.base_share_real)} | ${P.all_failed_tips} · ${P.confirmed_all_failed} · ${pc(P.precision_vs_all_failed)} |`) }
L.push('', 'The audit column is the real-time view: at the moment a 3m confirmation prints, every running extreme that got one is a candidate, whatever its later pullback.', '')

L.push('## 3. How it works at the tip: every pattern, real vs failed, four assets', '')
for (const tf of TFS) {
  L.push(`### ${tf}${tf === '1D' ? ' (10-15 swings per asset: described only, cannot be proven)' : ''}`, '', '| Pattern | ' + INS.map(([, , n]) => `${n} real / failed`).join(' | ') + ' |', '|---|' + INS.map(() => '---|').join(''))
  for (const it of ITEMS) L.push(`| ${it[1]} | ` + INS.map(([s]) => { const c = res.cells[`${s}|${tf}|${it[0]}`], r = rvf[`${s}|${tf}|${it[0]}`]
    return `${pc(c.real.p)} / ${pc(c.failed.p)}${r.holm_pass ? (r.diff > 0 ? ' ✔' : ' ✖') : ''} <sub>n ${c.real.n}/${c.failed.n}</sub>` }).join(' | ') + ' |')
  L.push('', '✔ = significantly MORE common at real tips; ✖ = significantly LESS common at real tips (Holm).', '') }

L.push('## 4. What is in common with a high % (≥ 80 % at real tips in ALL four assets)', '')
for (const tf of TFS) { const hi = ITEMS.filter((it) => INS.every(([s]) => (res.cells[`${s}|${tf}|${it[0]}`].real.p ?? 0) >= 0.8))
  L.push(`- **${tf}:** ` + (hi.length ? hi.map((it) => { const re = INS.map(([s]) => pc(res.cells[`${s}|${tf}|${it[0]}`].real.p)).join(' / '), fa = INS.map(([s]) => pc(res.cells[`${s}|${tf}|${it[0]}`].failed.p)).join(' / '), sep = INS.filter(([s]) => rvf[`${s}|${tf}|${it[0]}`].holm_pass && rvf[`${s}|${tf}|${it[0]}`].diff > 0).length
    return `${IL[it[0]]}: real ${re}; failed ${fa}; separates real from failed in ${sep}/4 assets` }).join('; ') : 'none')) }
L.push('')

L.push('## 5. Do they act the same? Every significant difference between assets (real tips, Holm across all 312 comparisons)', '')
const sig = res.cross.filter((c) => c.holm_pass).sort((a, b) => TFS.indexOf(a.tf) - TFS.indexOf(b.tf) || Math.abs(b.diff) - Math.abs(a.diff))
if (!sig.length) L.push('None: no pattern differs significantly between any two assets.')
else { L.push('| Timeframe | Pattern | Asset A | Asset B | Difference | p (Holm) |', '|---|---|---|---|---|---|')
  for (const c of sig) L.push(`| ${c.tf} | ${IL[c.item]} | ${NM[c.a]} ${pc(c.pa)} (n ${c.na}) | ${NM[c.b]} ${pc(c.pb)} (n ${c.nb}) | ${c.diff > 0 ? '+' : ''}${Math.round(100 * c.diff)} pp | ${fx(c.p_holm, 3)} |`) }
const tested = res.cross.filter((c) => c.p != null).length, noDxy = sig.filter((c) => c.a !== 'DXY_ICE' && c.b !== 'DXY_ICE'), shape = sig.filter((c) => ['strong_conf_candle', 'wick_first'].includes(c.item))
const bodyMed = (s) => fx(res.medians[`${s}|15m`].body_frac.med)
res.cross_summary = { significant: sig.length, tested, without_dxy: noDxy.length, candle_shape_or_wick: shape.length }
L.push('', `- **XAU, Silver and WTI against each other: ${noDxy.length} significant difference${noDxy.length === 1 ? '' : 's'}**${noDxy.length ? ` (${noDxy.map((c) => `${c.tf} ${c.item} ${NM[c.a]}~${NM[c.b]}`).join(', ')})` : ': they act the same at the tip'}.`,
  `- **${noDxy.length ? 'The other differences involve DXY.' : 'Every difference involves DXY.'}** ${shape.length} of ${sig.length} are candle shape / wick items. They are a DATA effect, not behaviour: DXY minutes are rebuilt from 6 pairs with no intra-minute wick, so the median confirming body / range is ${bodyMed('DXY_ICE')} for DXY vs ${bodyMed('XAUUSD')} XAU, ${bodyMed('XAGUSD')} Silver, ${bodyMed('WTI')} WTI (15m).`)
L.push('', `${sig.length} of ${tested} asset-pair comparisons differ significantly; everything else is statistically the same behaviour. Pairs with n < ${MIN_N} on either side rarely reach significance (low power), so "same" on 1D means "not distinguishable", not "proven equal".`, '')
L.push('## Honest limits', '', '- The anchor swing is known only afterwards: sections 1 and 3 (real column) describe what happened at real tips. Only the real-vs-failed comparison and the precision table say what a trader could use at the moment.',
  '- DXY minutes are rebuilt from 6 pairs (no real intra-minute wicks), so its 3m wicks are smoother.', '- One year only. No trade rule is proposed here.')
fs.writeFileSync(path.join(TURBO.root, 'docs', 'STRUCTURE_3M_CONFIRMATION_ATLAS.md'), L.join('\n') + '\n')
console.log(`written data/master/structure_3m_confirmation.json + docs/STRUCTURE_3M_CONFIRMATION_ATLAS.md (${L.length} lines); real-vs-failed Holm passes ${res.real_vs_failed.filter((r) => r.holm_pass).length}/${res.real_vs_failed.length}; cross-asset differences ${sig.length}/${tested}`)
