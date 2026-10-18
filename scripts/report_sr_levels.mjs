// report_sr_levels.mjs — the S/R levels atlas for XAU / XAG / DXY / WTI, generated FROM data/master/sr_levels_<short>.json (study_sr_levels.mjs) and
// sr_audit_<short>_<tf>.json (audit_sr_levels.mjs). Writes data/master/sr_levels_study.json + docs/SR_LEVELS_ATLAS.md. Never typed by hand.
// A strength class is "STRONG" only if: lift vs placebo significant after Holm, lift > 0 in TRAIN and in the last 3 years with the last-3-years lower
// bound > 0 (spec §3). The reversed walk-forward test gives the chance level.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { holm, rng } from '../src/core/studyStats.js'

const INS = [['XAUUSD', 'xau', 'XAU'], ['XAGUSD', 'xag', 'Silver'], ['DXY_ICE', 'dxy_ice', 'DXY'], ['WTI', 'wti', 'WTI']], TFS = ['1H', '4H', '1D', '1W', '1M'], MIN_N = 30, B = 1000, WEEK = 7 * 86400000
const D = Object.fromEntries(INS.map(([s, sh]) => [s, JSON.parse(fs.readFileSync(path.join(TURBO.master, `sr_levels_${sh}.json`), 'utf8'))]))
const NM = Object.fromEntries(INS.map(([s, , n]) => [s, n])), pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %'), pp = (x) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} pp`)
// event: [tf, side, phase, held_before, outcome(0 held,1 broke,2 open), t, offset(0 real), confluence, reaction_tercile, volume_tercile, age]
function lift(E, seed = 1) {
  const g = new Map(); let kr = 0, nr = 0, kp = 0, np = 0
  for (const e of E) { if (e[4] === 2) continue; const w = Math.floor(e[5] / WEEK); if (!g.has(w)) g.set(w, [0, 0, 0, 0]); const b = g.get(w), y = e[4] === 0 ? 1 : 0
    if (e[6] === 0) { b[0] += y; b[1]++; kr += y; nr++ } else { b[2] += y; b[3]++; kp += y; np++ } }
  const o = { n_real: nr, n_placebo: np, real: nr ? kr / nr : null, placebo: np ? kp / np : null }; o.lift = nr && np ? o.real - o.placebo : null
  if (!nr || !np) return { ...o, lo: null, hi: null, p: null }
  const bl = [...g.values()], R = rng(seed), v = []
  for (let k = 0; k < B; k++) { let a = 0, b = 0, c = 0, d = 0; for (let j = 0; j < bl.length; j++) { const x = bl[(R() * bl.length) | 0]; a += x[0]; b += x[1]; c += x[2]; d += x[3] } if (b && d) v.push(a / b - c / d) }
  v.sort((x, y) => x - y); const le = v.filter((x) => x <= 0).length / v.length, ge = v.filter((x) => x >= 0).length / v.length
  return { ...o, lo: v[Math.floor(0.025 * v.length)], hi: v[Math.floor(0.975 * v.length)], p: Math.min(1, 2 * Math.min(le, ge)) }
}
// strength classes (spec §2): within a timeframe, and the sum score S = tf rank (1-5) + confluence + min(touches, 3) across timeframes
const CLASSES = [
  ['all levels', () => true],
  ['confluence 0', (e) => e[7] === 0], ['confluence 1', (e) => e[7] === 1], ['confluence 2+', (e) => e[7] >= 2],
  ['held before 0', (e) => e[3] === 0], ['held before 1', (e) => e[3] === 1], ['held before 2', (e) => e[3] === 2], ['held before 3+', (e) => e[3] >= 3],
  ['reaction low', (e) => e[8] === 0], ['reaction mid', (e) => e[8] === 1], ['reaction high', (e) => e[8] === 2],
  ['volume low', (e) => e[9] === 0], ['volume mid', (e) => e[9] === 1], ['volume high', (e) => e[9] === 2],
  ['flipped level', (e) => e[2] === 1], ['first-phase level', (e) => e[2] === 0]]
const score = (e) => e[0] + 1 + e[7] + Math.min(e[3], 3)
const res = { at: new Date().toISOString(), spec: 'docs/SR_LEVELS_SPEC.md', cells: [], by_class: {}, per_year: {}, audit: {} }
const addCell = (s, scope, cls, E, split) => { const a = lift(E); const c = { key: `${s}|${scope}|${cls}`, sym: s, scope, cls, all: a }
  if (a.n_real < MIN_N) c.described_only = true; else { c.p = a.p; c.train = split ? lift(E.filter((e) => e[5] < split)) : null; c.test = split ? lift(E.filter((e) => e[5] >= split)) : null }
  res.cells.push(c); return c }
for (const [s] of INS) { const split = D[s].split ? Date.parse(D[s].split) : null, ALL = []
  for (const tf of TFS) { const E = D[s].tf[tf].events; ALL.push(...E); res.by_class[`${s}|${tf}`] = {}
    for (const [cls, f] of CLASSES) { const c = addCell(s, tf, cls, E.filter(f), split); res.by_class[`${s}|${tf}`][cls] = { all: c.all, train: c.train ?? null, test: c.test ?? null, described_only: !!c.described_only } }
    const yrs = {}; for (const e of E) { const y = new Date(e[5]).getUTCFullYear(); (yrs[y] ??= []).push(e) }
    res.per_year[`${s}|${tf}`] = Object.fromEntries(Object.entries(yrs).map(([y, G]) => [y, lift(G)])) }
  const smax = Math.max(...ALL.map(score)); for (let v = 1; v <= smax; v++) addCell(s, 'score', `S = ${v}`, ALL.filter((e) => score(e) === v), split) }
holm(res.cells.filter((c) => !c.described_only))
for (const c of res.cells) { c.walk_forward_pass = !!(c.train && c.test && c.train.lift > 0 && c.test.lift > 0 && c.test.lo > 0); c.walk_forward_mirror = !!(c.train && c.test && c.train.lift < 0 && c.test.lift < 0 && c.test.hi < 0)
  c.STRONG = !!(c.holm_pass && c.all.lift > 0 && c.walk_forward_pass) }
const tested = res.cells.filter((c) => !c.described_only), wf = tested.filter((c) => c.walk_forward_pass), wfm = tested.filter((c) => c.walk_forward_mirror), strong = tested.filter((c) => c.STRONG)
res.summary = { kinds_tested: tested.length, holm_more: tested.filter((c) => c.holm_pass && c.all.lift > 0).length, holm_less: tested.filter((c) => c.holm_pass && c.all.lift < 0).length, walk_forward_pass: wf.length, walk_forward_mirror_chance: wfm.length, strong: strong.map((c) => c.key) }
for (const [s, sh] of INS) for (const tf of ['4H', '1D']) { const f = path.join(TURBO.master, `sr_audit_${sh}_${tf}.json`); if (fs.existsSync(f)) res.audit[`${s}|${tf}`] = JSON.parse(fs.readFileSync(f, 'utf8')) }
fs.writeFileSync(path.join(TURBO.master, 'sr_levels_study.json'), JSON.stringify(res, null, 1))

const L = []
L.push('# S/R levels on 1H / 4H / 1D / 1W / 1M: which are really strong? XAU, Silver, DXY, WTI', '',
  `Generated from \`data/master/sr_levels_study.json\` (${res.at}). Spec \`docs/SR_LEVELS_SPEC.md\`; rules \`src/master/srLevels.js\` (proved by \`smoke_sr_levels\`); audit \`scripts/audit_sr_levels.mjs\`. Window: last 6 years (TRAIN → ${D.XAUUSD.split.slice(0, 10)}, TEST = last 3 years); WTI ${D.WTI.window[0].slice(0, 10)} → (≈ 2 years, Polygon, DELAYED feed, described only).`, '',
  '**How to read:** a level = a confirmed swing of its timeframe. A touch HELD when price bounced 1 ATR before a candle closed 0.5 ATR through. Every real level is copied 4× shifted ±0.75 / ±1.5 ATR (placebo). **A class of level is STRONG only if it beats its placebo copies after the Holm correction AND in both the first 3 and the last 3 years.**', '')
L.push(`## 1. The answer`, '', `- Classes tested (n ≥ ${MIN_N}): **${tested.length}**. Beat placebo after Holm: **${res.summary.holm_more}** (worse: ${res.summary.holm_less}).`,
  `- Walk-forward passes: ${wf.length}; the reversed test passes ${wfm.length} (chance level) → ${wf.length > 2 * Math.max(1, wfm.length) ? 'clearly above chance' : 'at the level of chance'}.`,
  `- **STRONG (all conditions): ${strong.length ? strong.map((c) => `${NM[c.sym]} ${c.scope} ${c.cls} (held ${pc(c.all.real)} vs placebo ${pc(c.all.placebo)}, n ${c.all.n_real})`).join('; ') : 'NONE — no class of S/R level holds better than a shifted copy of itself.'}**`, '')
L.push('## 2. Per asset and timeframe (all levels)', '', '| Asset | TF | Levels alive | Real touches | Real held | Placebo held | Lift (95 %) | TRAIN | Last 3 y |', '|---|---|---|---|---|---|---|---|---|')
for (const [s] of INS) for (const tf of TFS) { const c = res.by_class[`${s}|${tf}`]['all levels'], a = c.all
  L.push(`| ${NM[s]} | ${tf} | ${D[s].tf[tf].levels_alive_in_window} | ${a.n_real} | ${pc(a.real)} | ${pc(a.placebo)} | ${pp(a.lift)} (${pp(a.lo)} … ${pp(a.hi)})${c.described_only ? ' *described only*' : ''} | ${c.train ? pp(c.train.lift) : 'n/a'} | ${c.test ? pp(c.test.lift) : 'n/a'} |`) }
L.push('', '## 3. Strength classes (top 20 by lift lower bound, n ≥ 30)', '', '| Asset | Scope | Class | Real touches | Real | Placebo | Lift (95 %) | p (Holm) | TRAIN / last 3 y |', '|---|---|---|---|---|---|---|---|---|')
for (const c of [...tested].sort((a, b) => b.all.lo - a.all.lo).slice(0, 20)) L.push(`| ${NM[c.sym]} | ${c.scope} | ${c.cls} | ${c.all.n_real} | ${pc(c.all.real)} | ${pc(c.all.placebo)} | ${pp(c.all.lift)} (${pp(c.all.lo)} … ${pp(c.all.hi)}) | ${c.p_holm?.toFixed(3) ?? '—'}${c.holm_pass ? ' ✔' : ''} | ${c.train ? pp(c.train.lift) : 'n/a'} / ${c.test ? pp(c.test.lift) : 'n/a'} |`)
L.push('', '## 4. The strength score S = tf rank + confluence + min(held before, 3)', '', '| Asset | ' + Array.from({ length: 10 }, (_, k) => `S=${k + 1}`).join(' | ') + ' |', '|---|' + '---|'.repeat(10))
for (const [s] of INS) L.push(`| ${NM[s]} | ` + Array.from({ length: 10 }, (_, k) => { const c = res.cells.find((x) => x.key === `${s}|score|S = ${k + 1}`); return c && c.all.n_real ? `${pc(c.all.real)} vs ${pc(c.all.placebo)} <sub>${c.all.n_real}</sub>` : '—' }).join(' | ') + ' |')
L.push('', '## 5. Per year (lift, all levels)', '', '| Asset | TF | ' + [2020, 2021, 2022, 2023, 2024, 2025, 2026].join(' | ') + ' |', '|---|---|' + '---|'.repeat(7))
for (const [s] of INS) for (const tf of TFS) { const Y = res.per_year[`${s}|${tf}`]; L.push(`| ${NM[s]} | ${tf} | ` + [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (Y[y] && Y[y].n_real >= 10 ? `${pp(Y[y].lift)} <sub>${Y[y].n_real}</sub>` : '—')).join(' | ') + ' |') }
L.push('', '## 6. Audit (the measuring itself)', '', '| Asset | TF | Independent second implementation: evaluations · differences | Positive control (cheating levels at the real next swing): held vs placebo |', '|---|---|---|---|')
for (const [k, a] of Object.entries(res.audit)) { const [s, tf] = k.split('|'), r = a.positive_control; L.push(`| ${NM[s]} | ${tf} | ${a.independent_evaluator.evaluations} · **${a.independent_evaluator.differences}** | ${pc(r.real[0] / r.real[1])} (n ${r.real[1]}) vs ${pc(r.placebo[0] / r.placebo[1])} (n ${r.placebo[1]}) |`) }
L.push('', '## Honest limits', '', '- 1W ≈ 310 and 1M ≈ 72 candles in 6 years: their classes are mostly "described only".', '- Volume = 2 years of CME futures (none for DXY). WTI = 2 years, delayed feed.', '- One fixed level rule (confirmed ZigZag swings). No trade rule is proposed.')
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SR_LEVELS_ATLAS.md'), L.join('\n') + '\n')
console.log(`written data/master/sr_levels_study.json + docs/SR_LEVELS_ATLAS.md · classes tested ${tested.length} · Holm MORE ${res.summary.holm_more} / LESS ${res.summary.holm_less} · walk-forward ${wf.length} vs reversed ${wfm.length} · STRONG ${strong.length}`)
