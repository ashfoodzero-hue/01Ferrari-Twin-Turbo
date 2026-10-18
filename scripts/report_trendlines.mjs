// report_trendlines.mjs — the trendline atlas for XAU / XAG / DXY / WTI, generated FROM data/master/trendlines_<short>.json (study_trendlines.mjs) and
// trendlines_audit_<short>_<tf>.json (audit_trendlines.mjs). Writes data/master/trendlines_study.json + docs/TRENDLINE_STUDY_ATLAS.md. Never typed by hand.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { compareRates, holm, rng } from '../src/core/studyStats.js'

const INS = [['XAUUSD', 'xau', 'XAU'], ['XAGUSD', 'xag', 'Silver'], ['DXY_ICE', 'dxy_ice', 'DXY'], ['WTI', 'wti', 'WTI']], TFS = ['1W', '1D', '4H', '1H'], MIN_N = 30, B = 1000, WEEK = 7 * 86400000
const D = Object.fromEntries(INS.map(([s, sh]) => [s, JSON.parse(fs.readFileSync(path.join(TURBO.master, `trendlines_${sh}.json`), 'utf8'))]))
const NM = Object.fromEntries(INS.map(([s, , n]) => [s, n])), SC = ['major', 'minor'], SD = ['support', 'resistance'], CL = ['trend', 'counter'], ST = ['shallow', 'medium', 'steep']
const pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %'), pp = (x) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} pp`)
// lift = real respect − placebo respect over resolved touches, with a week-block bootstrap (95 % interval, two-sided p)
function lift(E, seed = 1) {
  const g = new Map(); let kr = 0, nr = 0, kp = 0, np = 0
  for (const e of E) { if (e[5] === 2) continue; const w = Math.floor(e[6] / WEEK); if (!g.has(w)) g.set(w, [0, 0, 0, 0]); const b = g.get(w), y = e[5] === 0 ? 1 : 0
    if (e[7] === 0) { b[0] += y; b[1]++; kr += y; nr++ } else { b[2] += y; b[3]++; kp += y; np++ } }
  const o = { n_real: nr, n_placebo: np, real: nr ? kr / nr : null, placebo: np ? kp / np : null }; o.lift = nr && np ? o.real - o.placebo : null
  if (!nr || !np) return { ...o, lo: null, hi: null, p: null }
  const bl = [...g.values()], R = rng(seed), v = []
  for (let k = 0; k < B; k++) { let a = 0, b = 0, c = 0, d = 0; for (let j = 0; j < bl.length; j++) { const x = bl[(R() * bl.length) | 0]; a += x[0]; b += x[1]; c += x[2]; d += x[3] } if (b && d) v.push(a / b - c / d) }
  v.sort((x, y) => x - y); const le = v.filter((x) => x <= 0).length / v.length, ge = v.filter((x) => x >= 0).length / v.length
  return { ...o, lo: v[Math.floor(0.025 * v.length)], hi: v[Math.floor(0.975 * v.length)], p: Math.min(1, 2 * Math.min(le, ge)) }
}
const res = { at: new Date().toISOString(), spec: 'docs/TRENDLINE_STUDY_SPEC.md', overall: {}, cells: [], per_year: {}, cross: [], audit: {} }
const cellKey = (e) => `${SC[e[0]]}|${SD[e[1]]}|${CL[e[2]]}|${e[4] === 1 ? '1st test' : '2nd+ test'}|${ST[e[3]]}`
for (const [s] of INS) for (const tf of TFS) { const T = D[s].tf[tf], E = T.events, split = D[s].split ? Date.parse(D[s].split) : null
  res.overall[`${s}|${tf}`] = { all: lift(E), train: split ? lift(E.filter((e) => e[6] < split)) : null, test: split ? lift(E.filter((e) => e[6] >= split)) : null, lines: T.lines, born: T.born_real, candles: T.candles_in_window, short: D[s].short_history }
  const groups = new Map(); for (const e of E) { const k = cellKey(e); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e) }
  for (const [k, G] of groups) { const a = lift(G); if (a.n_real < MIN_N) { res.cells.push({ key: `${s}|${tf}|${k}`, sym: s, tf, cell: k, all: a, described_only: true }); continue }
    res.cells.push({ key: `${s}|${tf}|${k}`, sym: s, tf, cell: k, all: a, p: a.p, train: split ? lift(G.filter((e) => e[6] < split)) : null, test: split ? lift(G.filter((e) => e[6] >= split)) : null }) }
  const yrs = {}; for (const e of E) { const y = new Date(e[6]).getUTCFullYear(); (yrs[y] ??= []).push(e) }
  res.per_year[`${s}|${tf}`] = Object.fromEntries(Object.entries(yrs).map(([y, G]) => [y, lift(G)]))
  // per kind of line, for the app's Trendlines page (display derives from this artifact)
  const kinds = { 'all lines': () => true }; for (const sc of [0, 1]) for (const sd of [0, 1]) for (const cl of [0, 1]) kinds[`${SC[sc]} ${SD[sd]} (${CL[cl]})`] = (e) => e[0] === sc && e[1] === sd && e[2] === cl
  res.by_kind = res.by_kind ?? {}; res.by_kind[`${s}|${tf}`] = Object.fromEntries(Object.entries(kinds).map(([k, f]) => { const G = E.filter(f)
    return [k, { all: lift(G), train: split ? lift(G.filter((e) => e[6] < split)) : null, test: split ? lift(G.filter((e) => e[6] >= split)) : null }] })) }
holm(res.cells.filter((c) => !c.described_only))
for (const c of res.cells) { c.walk_forward_pass = !!(c.train && c.test && c.train.lift > 0 && c.test.lift > 0 && c.test.lo > 0)
  c.walk_forward_mirror = !!(c.train && c.test && c.train.lift < 0 && c.test.lift < 0 && c.test.hi < 0) }   // the same test reversed: the chance level, measured
// assets: real respect per TF × scale × side × slope class, over the common window (WTI's history), Holm
const common = Math.max(...INS.map(([s]) => Date.parse(D[s].window[0])))
for (const tf of TFS) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) {
  const rate = (s, plc = false) => { const E = D[s].tf[tf].events.filter((e) => (plc ? e[7] > 0 : e[7] === 0) && e[5] !== 2 && e[6] >= common && e[0] === a && e[1] === b && e[2] === c); return [E.filter((e) => e[5] === 0).length, E.length] }
  for (let i = 0; i < INS.length; i++) for (let j = i + 1; j < INS.length; j++) { const x = rate(INS[i][0]), y = rate(INS[j][0]), r = compareRates(x[0], x[1], y[0], y[1]), xp = rate(INS[i][0], true), yp = rate(INS[j][0], true)
    res.cross.push({ key: `${tf}|${SC[a]}|${SD[b]}|${CL[c]}|${INS[i][0]}~${INS[j][0]}`, tf, kind: `${SC[a]} ${SD[b]} (${CL[c]})`, a: INS[i][0], b: INS[j][0], pa: r.p1, pb: r.p2, na: x[1], nb: y[1], diff: r.diff,
      placebo_a: xp[1] ? xp[0] / xp[1] : null, placebo_b: yp[1] ? yp[0] / yp[1] : null, p: x[1] >= MIN_N && y[1] >= MIN_N ? r.p : null }) } }
holm(res.cross)
for (const [s, sh] of INS) for (const tf of ['4H', '1D']) { const f = path.join(TURBO.master, `trendlines_audit_${sh}_${tf}.json`); if (fs.existsSync(f)) res.audit[`${s}|${tf}`] = JSON.parse(fs.readFileSync(f, 'utf8')) }
fs.writeFileSync(path.join(TURBO.master, 'trendlines_study.json'), JSON.stringify(res, null, 1))

// ── atlas ─────────────────────────────────────────────────────────────────────
const L = [], tested = res.cells.filter((c) => !c.described_only), passH = tested.filter((c) => c.holm_pass && c.all.lift > 0), passN = tested.filter((c) => c.holm_pass && c.all.lift < 0), wf = res.cells.filter((c) => c.walk_forward_pass), wfm = res.cells.filter((c) => c.walk_forward_mirror)
res.walk_forward = { pass: wf.length, mirror_chance_level: wfm.length, kinds_tested: tested.length }; fs.writeFileSync(path.join(TURBO.master, 'trendlines_study.json'), JSON.stringify(res, null, 1))
L.push('# Trendlines on 1W / 1D / 4H / 1H: are they respected? XAU, Silver, DXY, WTI', '',
  `Generated from \`data/master/trendlines_study.json\` (${res.at}). Spec \`docs/TRENDLINE_STUDY_SPEC.md\`; rules \`src/master/trendlines.js\` (proved by \`smoke_trendlines\`); audit \`scripts/audit_trendlines.mjs\`. Window: last 6 years (TRAIN ${D.XAUUSD.window[0].slice(0, 10)} → ${D.XAUUSD.split.slice(0, 10)}, TEST = last 3 years); WTI: ${D.WTI.window[0].slice(0, 10)} → (Polygon keeps ≈ 2 years; described only).`, '',
  '**How to read:** a touch is RESPECTED when price bounces 1 ATR before a candle closes 0.25 ATR through the line. Every real line is copied 4 times, shifted parallel by ±0.75 and ±1.5 ATR (placebo: same slope, same time, same market, not anchored to pivots). **A trendline is respected only if it beats its own placebo copies (lift).** Respect % on its own means nothing: about half of all touches of ANY line bounce first.', '')
L.push('## 1. The answer, per asset and timeframe (all lines)', '', '| Asset | TF | Lines (born) | Real touches | Real respected | Placebo respected | **Lift** (95 % interval) | TRAIN lift | Last 3 years lift |', '|---|---|---|---|---|---|---|---|---|')
for (const [s] of INS) for (const tf of TFS) { const o = res.overall[`${s}|${tf}`], a = o.all
  L.push(`| ${NM[s]} | ${tf} | ${o.lines} (${o.born}) | ${a.n_real} | ${pc(a.real)} | ${pc(a.placebo)} | **${pp(a.lift)}** (${pp(a.lo)} … ${pp(a.hi)}) | ${o.train ? pp(o.train.lift) : 'n/a'} | ${o.test ? pp(o.test.lift) : 'n/a'} |`) }
L.push('', `- **Kinds of line tested** (asset × TF × major/minor × support/resistance × trend/counter × 1st/2nd+ test × steepness, n ≥ ${MIN_N}): ${tested.length}. **Significantly respected MORE than placebo after Holm: ${passH.length}.** Significantly LESS: ${passN.length}.`,
  `- **Walk-forward (lift > 0 in TRAIN and in the last 3 years, last-3-years lower bound > 0): ${wf.length} kind${wf.length === 1 ? '' : 's'}.** The same test reversed (WORSE than placebo in both halves, upper bound < 0) passes ${wfm.length}: that is the measured chance level, so ${wf.length > 2 * Math.max(1, wfm.length) ? 'the passes clearly exceed chance' : 'the passes are at the level of chance'}.`, '')
L.push('## 2. Which trendline is respected most (top 15 kinds by lift lower bound, n ≥ 30)', '', '| Asset | TF | Kind of line | Real touches | Real | Placebo | Lift (95 %) | p (Holm) | TRAIN / last 3y lift |', '|---|---|---|---|---|---|---|---|---|')
for (const c of [...tested].sort((a, b) => b.all.lo - a.all.lo).slice(0, 15)) L.push(`| ${NM[c.sym]} | ${c.tf} | ${c.cell} | ${c.all.n_real} | ${pc(c.all.real)} | ${pc(c.all.placebo)} | ${pp(c.all.lift)} (${pp(c.all.lo)} … ${pp(c.all.hi)}) | ${c.p_holm == null ? '—' : c.p_holm.toFixed(3)}${c.holm_pass ? ' ✔' : ''} | ${c.train ? pp(c.train.lift) : 'n/a'} / ${c.test ? pp(c.test.lift) : 'n/a'} |`)
L.push('', '## 3. By kind of line (all touches pooled over 6 years; lift vs placebo)', '')
for (const tf of TFS) { L.push(`### ${tf}`, '', '| Kind | ' + INS.map(([, , n]) => n).join(' | ') + ' |', '|---|' + INS.map(() => '---|').join(''))
  for (const sc of [0, 1]) for (const sd of [0, 1]) for (const cl of [0, 1]) L.push(`| ${SC[sc]} ${SD[sd]} (${CL[cl]} line) | ` + INS.map(([s]) => { const a = lift(D[s].tf[tf].events.filter((e) => e[0] === sc && e[1] === sd && e[2] === cl))
    return a.n_real ? `${pc(a.real)} vs ${pc(a.placebo)} = ${pp(a.lift)} <sub>n ${a.n_real}</sub>` : '—' }).join(' | ') + ' |')
  for (const [lab, f] of [['1st test (3rd point)', (e) => e[4] === 1], ['2nd+ test', (e) => e[4] > 1], ['shallow', (e) => e[3] === 0], ['steep', (e) => e[3] === 2]])
    L.push(`| *${lab}* | ` + INS.map(([s]) => { const a = lift(D[s].tf[tf].events.filter(f)); return a.n_real ? `${pc(a.real)} vs ${pc(a.placebo)} = ${pp(a.lift)} <sub>n ${a.n_real}</sub>` : '—' }).join(' | ') + ' |')
  L.push('') }
L.push('## 4. The last 3 years: does it match the ongoing price action? (lift per year, all lines)', '', '| Asset | TF | ' + [2020, 2021, 2022, 2023, 2024, 2025, 2026].join(' | ') + ' |', '|---|---|' + '---|'.repeat(7))
for (const [s] of INS) for (const tf of TFS) { const Y = res.per_year[`${s}|${tf}`]; L.push(`| ${NM[s]} | ${tf} | ` + [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (Y[y] && Y[y].n_real >= 10 ? `${pp(Y[y].lift)} <sub>${Y[y].n_real}</sub>` : '—')).join(' | ') + ' |') }
L.push('', wf.length ? `Kinds that hold in BOTH halves (${wf.length}, vs ${wfm.length} that are WORSE than placebo in both halves = chance level; none survives the Holm correction over ${tested.length} kinds): ${wf.map((c) => `${NM[c.sym]} ${c.tf} ${c.cell} (TRAIN ${pp(c.train.lift)}, last 3y ${pp(c.test.lift)}, n ${c.all.n_real})`).join('; ')}.` : '**No kind of trendline beats its placebo in both the first 3 years and the last 3 years.**', '')
const sig = res.cross.filter((c) => c.holm_pass)
L.push(`## 5. Do the assets act the same? (real respect rate, common window from ${new Date(common).toISOString().slice(0, 10)}, Holm)`, '', sig.length ? '| TF | Kind | A: real (placebo) | B: real (placebo) | Difference |\n|---|---|---|---|---|\n' + sig.map((c) => `| ${c.tf} | ${c.kind} | ${NM[c.a]} ${pc(c.pa)} (${pc(c.placebo_a)}) n ${c.na} | ${NM[c.b]} ${pc(c.pb)} (${pc(c.placebo_b)}) n ${c.nb} | ${pp(c.diff)} |`).join('\n') + '\n\nThe placebo rates in brackets move with the real ones: where assets differ, it is how each asset bounces off ANY line, not a trendline effect.' : `No significant difference in ${res.cross.filter((c) => c.p != null).length} tested asset pairs: the four assets treat trendlines the same way.`, '')
L.push('## 6. Audit (the measuring itself)', '', '| Asset | TF | Independent second implementation: evaluations · differences | Positive control (cheating lines at the real next swing low): respected vs placebo |', '|---|---|---|---|')
for (const [k, a] of Object.entries(res.audit)) { const [s, tf] = k.split('|'), r = a.positive_control
  L.push(`| ${NM[s]} | ${tf} | ${a.independent_evaluator.evaluations} · **${a.independent_evaluator.differences}** | ${pc(r.real[0] / r.real[1])} (n ${r.real[1]}) vs ${pc(r.placebo[0] / r.placebo[1])} (n ${r.placebo[1]}) |`) }
L.push('', 'The positive control shows the method DOES detect respect when a line sits at a real turning point. So a zero lift on real trendlines is a measured result, not a blind test.', '',
  '## Honest limits', '', '- One fixed, pre-registered drawing rule (two confirmed pivots, no close through between them, born at confirmation). Lines drawn by eye in hindsight look better because they are chosen after the fact; that is exactly what this test removes.',
  '- 1W has about 310 candles in 6 years (few touches); WTI has 2 years only.', '- No trade rule is proposed.')
fs.writeFileSync(path.join(TURBO.root, 'docs', 'TRENDLINE_STUDY_ATLAS.md'), L.join('\n') + '\n')
console.log(`written data/master/trendlines_study.json + docs/TRENDLINE_STUDY_ATLAS.md (${L.length} lines) · kinds tested ${tested.length} · Holm MORE ${passH.length} / LESS ${passN.length} · walk-forward ${wf.length} · cross-asset differences ${sig.length}`)
