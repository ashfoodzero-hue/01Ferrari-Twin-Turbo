// report_confirm3m.mjs — the 3m-confirmation money test atlas (XAU / XAG / DXY / WTI), generated FROM data/master/confirm3m_<short>[_gross].json
// (study_confirm3m.mjs) + confirm3m_audit_<short>.json. Writes data/master/confirm3m_study.json + docs/CONFIRM3M_MONEY_ATLAS.md. Never typed by hand.
// PASS (spec §4): $/trade after spreads > 0 with week-block bootstrap lower bound > 0 in TRAIN (folds 0-4) AND OOS (folds 5-7), same sign in ≥ 6 of 8
// folds, ≥ 100 OOS trades, Holm across every arm × split × target. Assets without a measured spread (DXY, WTI) are reported in R before costs only.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { holm, rng, wilson } from '../src/core/studyStats.js'

const INS = [['XAUUSD', 'xau', 'XAU'], ['XAGUSD', 'xag', 'Silver'], ['DXY_ICE', 'dxy_ice', 'DXY'], ['WTI', 'wti', 'WTI']], B = 2000, WEEK = 7 * 86400000
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
const SPLITS = [['all entries', () => true], ['NOT at any S/R level', (r) => r[4] < 0], ['at an S/R level (any tf)', (r) => r[4] >= 0], ['at a 1H level (highest)', (r) => r[4] === 0], ['at a 4H level (highest)', (r) => r[4] === 1],
  ['at a 1D level (highest)', (r) => r[4] === 2], ['at a 1W / 1M level', (r) => r[4] >= 3], ['confluence 2+ other tfs', (r) => r[5] >= 3], ['level held 2+ times before', (r) => r[6] >= 2], ['"usual strong" (1D+ or confluence or held 2+)', (r) => r[7] === 1],
  ['3m higher low / lower high first', (r) => r[3] === 1], ['usual strong + higher low first', (r) => r[7] === 1 && r[3] === 1]]
function stat(xs, days, unit) {   // xs: [{t, v (unit), r}]
  if (!xs.length) return { n: 0 }
  const n = xs.length, w = xs.filter((x) => x.v > 0).length, mean = xs.reduce((s, x) => s + x.v, 0) / n, mr = xs.reduce((s, x) => s + x.r, 0) / n
  const g = new Map(); for (const x of xs) { const k = Math.floor(x.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(x.v) }
  const bl = [...g.values()], R = rng(3), v = []
  for (let b = 0; b < B; b++) { let s = 0, c = 0; for (let k = 0; k < bl.length; k++) for (const y of bl[(R() * bl.length) | 0]) { s += y; c++ } v.push(s / c) }
  v.sort((a, b) => a - b); const p = Math.min(1, 2 * Math.min(v.filter((x) => x <= 0).length, v.filter((x) => x >= 0).length) / v.length)
  let eq = 0, peak = 0, dd = 0; for (const x of xs) { eq += x.v; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq) }
  return { n, per_day: n / days, wr: w / n, wr_lo: wilson(w, n).lo, mean, mean_r: mr, lo: v[Math.floor(0.025 * B)], hi: v[Math.floor(0.975 * B)], p, max_dd: dd, unit }
}
const res = { at: new Date().toISOString(), spec: 'docs/CONFIRM3M_MONEY_SPEC.md', cells: [], gross: {}, audit: {} }
for (const [s, sh] of INS) { const D = J(`confirm3m_${sh}.json`); if (!D) continue
  const net = /^measured/.test(D.cost), unit = net ? '$ after spreads' : 'R before costs', T = D.trades
  for (const [arm, ai] of [['confirm close', 8], ['holding retest', 9]]) for (let ti = 0; ti < D.targets.length; ti++) for (const [sp, f] of SPLITS) {
    const rows = T.filter(f).map((r) => (r[ai]?.[ti] ? { t: r[0], fold: r[2], r: r[ai][ti][0], v: net ? r[ai][ti][1] : r[ai][ti][0] } : null)).filter(Boolean)
    const all = stat(rows, D.days, unit), tr = stat(rows.filter((x) => x.fold <= 4), D.days * 5 / 8, unit), oos = stat(rows.filter((x) => x.fold >= 5), D.days * 3 / 8, unit)
    const folds = Array.from({ length: 8 }, (_, f) => { const x = rows.filter((y) => y.fold === f); return x.length ? x.reduce((a, y) => a + y.v, 0) / x.length : null })
    const pos = folds.filter((x) => x != null && x > 0).length
    res.cells.push({ key: `${s}|${arm}|${D.targets[ti]}|${sp}`, sym: s, arm, target: D.targets[ti], split: sp, unit, net, all, train: tr, oos, folds_positive: pos, p: oos.n >= 100 ? oos.p : null,
      pass_rule: !!(net && tr.n && oos.n >= 100 && tr.mean > 0 && tr.lo > 0 && oos.mean > 0 && oos.lo > 0 && pos >= 6) }) }
  const G = J(`confirm3m_${sh}_gross.json`)
  if (G) res.gross[s] = Object.fromEntries(G.targets.map((tg, ti) => [tg, Object.fromEntries(SPLITS.slice(0, 10).map(([sp, f]) => { const x = G.trades.filter(f).map((r) => r[8]?.[ti]).filter(Boolean); return [sp, { n: x.length, wr: x.filter((v) => v[1] > 0).length / (x.length || 1), mean_r: x.reduce((a, v) => a + v[0], 0) / (x.length || 1) }] }))]))
  const A = J(`confirm3m_audit_${sh}.json`); if (A) res.audit[s] = A }
holm(res.cells.filter((c) => c.p != null)); for (const c of res.cells) c.PASS = !!(c.pass_rule && c.holm_pass)
const passed = res.cells.filter((c) => c.PASS); res.summary = { cells: res.cells.length, passed: passed.map((c) => c.key) }
fs.writeFileSync(path.join(TURBO.master, 'confirm3m_study.json'), JSON.stringify(res, null, 1))
const NM = Object.fromEntries(INS.map(([s, , n]) => [s, n])), pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %'), f2 = (x, u) => (x == null ? '—' : u.startsWith('$') ? `${x >= 0 ? '+' : '−'}$${Math.abs(x).toFixed(2)}` : `${x >= 0 ? '+' : ''}${x.toFixed(3)}R`)
const L = ['# Money test: entering on the 3m confirmation at 15m swing tips — overall and AT S/R levels', '',
  `Generated from \`data/master/confirm3m_study.json\` (${res.at}). Spec \`docs/CONFIRM3M_MONEY_SPEC.md\` (+ ADDENDUM A full spread, B raw minutes). Code \`scripts/lib/confirm3m.mjs\` (proved by \`smoke_confirm3m\` and \`audit_confirm3m.mjs\`).`, '',
  '**How to read:** every entry is a real-time 3m confirmation at the running tip of a 15m leg; stop just beyond the tip; 4 fixed targets; 1-minute fills, stop first. XAU and Silver pay their MEASURED spread (full round trip on bid minutes); DXY (not tradable) and WTI (no measured spread) are in R before costs.', '',
  `## 1. The answer`, '', `- Cells tested: ${res.cells.length} (4 assets × 2 entry styles × 4 targets × ${SPLITS.length} splits). **PASS (after spreads, TRAIN + OOS + folds + Holm): ${passed.length ? passed.map((c) => c.key).join('; ') : 'NONE'}.**`, '']
L.push('## 2. Before costs — is there any edge at all? (diagnostic, spread 0)', '', '| Asset | Target | All entries | NOT at a level | At a level | At a 1D level | Usual strong |', '|---|---|---|---|---|---|---|')
for (const [s] of INS) { const G = res.gross[s] ?? (s === 'DXY_ICE' || s === 'WTI' ? null : null); const D = G ?? (s === 'DXY_ICE' || s === 'WTI' ? Object.fromEntries(['1R', '2R', '1ATR', '2ATR'].map((tg) => [tg, Object.fromEntries(SPLITS.slice(0, 10).map(([sp]) => { const c = res.cells.find((x) => x.key === `${s}|confirm close|${tg}|${sp}`); return [sp, c ? { n: c.all.n, wr: c.all.wr, mean_r: c.all.mean_r } : null] }))])) : null)
  if (!D) continue
  for (const tg of ['1R', '2R', '1ATR', '2ATR']) { const g = (sp) => { const x = D[tg]?.[sp]; return x && x.n ? `WR ${pc(x.wr)} · ${f2(x.mean_r, 'R')} <sub>n ${x.n}</sub>` : '—' }
    L.push(`| ${NM[s]} | ${tg} | ${g('all entries')} | ${g('NOT at any S/R level')} | ${g('at an S/R level (any tf)')} | ${g('at a 1D level (highest)')} | ${g('"usual strong" (1D+ or confluence or held 2+)')} |`) } }
L.push('', '## 3. The money result (entry at the confirming close)', '')
for (const [s] of INS) { const cs = res.cells.filter((c) => c.sym === s && c.arm === 'confirm close'); if (!cs.length) continue
  L.push(`### ${NM[s]} (${cs[0].unit})`, '', '| Split | Target | Trades | /day | WR | Per trade (95 %) | TRAIN | OOS | Folds + | PASS |', '|---|---|---|---|---|---|---|---|---|---|')
  for (const c of cs) L.push(`| ${c.split} | ${c.target} | ${c.all.n} | ${c.all.per_day?.toFixed(2) ?? '—'} | ${pc(c.all.wr)} | ${f2(c.all.mean, c.unit)} (${f2(c.all.lo, c.unit)} … ${f2(c.all.hi, c.unit)}) | ${f2(c.train.mean, c.unit)} | ${f2(c.oos.mean, c.unit)} | ${c.folds_positive}/8 | ${c.PASS ? '**PASS**' : '—'} |`)
  L.push('') }
L.push('## 4. Second entry style: on a holding retest of the level (best 12 cells by OOS lower bound)', '', '| Asset | Split | Target | Trades | WR | Per trade | OOS | Folds + | PASS |', '|---|---|---|---|---|---|---|---|---|')
for (const c of res.cells.filter((x) => x.arm === 'holding retest' && x.oos.n).sort((a, b) => b.oos.lo - a.oos.lo).slice(0, 12)) L.push(`| ${NM[c.sym]} | ${c.split} | ${c.target} | ${c.all.n} | ${pc(c.all.wr)} | ${f2(c.all.mean, c.unit)} | ${f2(c.oos.mean, c.unit)} (lo ${f2(c.oos.lo, c.unit)}) | ${c.folds_positive}/8 | ${c.PASS ? '**PASS**' : '—'} |`)
L.push('', '## 5. Audit', '', '| Asset | Independent trigger finder (180 d) | Causal prefix replay | Independent simulator | Positive control (entry at the TRUE tip, 1R) |', '|---|---|---|---|---|')
for (const [s, a] of Object.entries(res.audit)) L.push(`| ${NM[s]} | ${a.finder.lib} = ${a.finder.naive} (only one side: ${a.finder.only_naive + a.finder.only_lib}) | ${a.prefix_differences} differences | ${a.simulator.checks} checks · ${a.simulator.differences} differences | ${a.positive_control_1R.won}/${a.positive_control_1R.n} won |`)
L.push('', '## Honest limits', '', '- One fixed entry rule and stop; other stops / targets are new studies, never tuned on these numbers.', '- DXY is not tradable (R only); WTI has 2 years and no measured spread (R only, described).', '- Weekly / monthly level splits are small.')
fs.writeFileSync(path.join(TURBO.root, 'docs', 'CONFIRM3M_MONEY_ATLAS.md'), L.join('\n') + '\n')
console.log(`written data/master/confirm3m_study.json + docs/CONFIRM3M_MONEY_ATLAS.md · cells ${res.cells.length} · PASS ${passed.length}`)
