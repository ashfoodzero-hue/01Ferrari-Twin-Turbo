// ════════════════════════════════════════════════════════════════════════════════
// study_xau_dxy_sr.mjs — XAU and DXY together at S/R levels on the SAME timeframe (spec docs/XAU_DXY_SR_SPEC.md, written before any number;
// Ashraf 2026-10-19: "what if XAU and DXY check them at the same time frame at S/R level and tell me what u find").
//   Part 1: every XAU level test (real + placebo) tagged by DXY at the same candle (gold-grid DXY = identical candle times): OPPOSITE / SAME / NONE.
//   Part 2: the XAU 3m-confirmation entries (confirm3m_xau.json) tagged by an opposite / same DXY 3m confirmation in the 15 (60) min before entry.
// Output: data/master/xau_dxy_sr.json + docs/XAU_DXY_SR_ATLAS.md (generated).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { compareRates, holm, rng } from '../src/core/studyStats.js'
import { SR, swingLevels, evaluateLevel } from '../src/master/srLevels.js'

const TFS = ['1H', '4H', '1D', '1W', '1M'], OFFS = [0, ...SR.PLACEBO], WEEK = 7 * 86400000, B = 1000
const yearsBack = (t, y) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime() }
const MX = await clean1m('XAUUSD'), MD = await clean1m('DXY'), KX = kit('XAUUSD'), KD = kit('DXY'), HX = findHoles(MX), HD = findHoles(MD)
const LAST = Math.min(MX.at(-1).t, MD.at(-1).t), FROM = yearsBack(LAST, 6), SPLIT = yearsBack(LAST, 3)
function tests(K, M, H, tf, offsets) { const C = K.build(M, tf); markIncomplete(C, H); const A = atrArr(C, 14), br = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), out = []
  for (const lv of swingLevels(C, br)) offsets.forEach((d, oi) => { for (const t of evaluateLevel(C, A, lv, d * lv.atr).touches) if (C[t.i].t >= FROM && C[t.i].t <= LAST && t.outcome !== 'open') out.push({ t: C[t.i].t, side: t.side, held: t.outcome === 'held', oi }) })
  return out }
function lift(E, seed = 1) { const g = new Map(); let kr = 0, nr = 0, kp = 0, np = 0
  for (const e of E) { const w = Math.floor(e.t / WEEK); if (!g.has(w)) g.set(w, [0, 0, 0, 0]); const b = g.get(w), y = e.held ? 1 : 0; if (e.oi === 0) { b[0] += y; b[1]++; kr += y; nr++ } else { b[2] += y; b[3]++; kp += y; np++ } }
  const o = { n_real: nr, n_placebo: np, real: nr ? kr / nr : null, placebo: np ? kp / np : null, k_real: kr }; o.lift = nr && np ? o.real - o.placebo : null; if (!nr || !np) return o
  const bl = [...g.values()], R = rng(seed), v = []; for (let k = 0; k < B; k++) { let a = 0, b = 0, c = 0, d = 0; for (let j = 0; j < bl.length; j++) { const x = bl[(R() * bl.length) | 0]; a += x[0]; b += x[1]; c += x[2]; d += x[3] } if (b && d) v.push(a / b - c / d) }
  v.sort((x, y) => x - y); return { ...o, lo: v[Math.floor(0.025 * v.length)], hi: v[Math.floor(0.975 * v.length)], p: Math.min(1, 2 * Math.min(v.filter((x) => x <= 0).length, v.filter((x) => x >= 0).length) / v.length) } }
// ── Part 1 ──
const res = { at: new Date().toISOString(), spec: 'docs/XAU_DXY_SR_SPEC.md', window: [new Date(FROM).toISOString(), new Date(LAST).toISOString()], split: new Date(SPLIT).toISOString(), part1: {}, part2: {} }, cells = []
for (const tf of TFS) { const X = tests(KX, MX, HX, tf, OFFS), D = tests(KD, MD, HD, tf, [0]), C = KX.build(MX, tf), step = new Map(C.map((c, i) => [c.t, i]))
  const dAt = new Map(); for (const d of D) { if (!dAt.has(d.t)) dAt.set(d.t, new Set()); dAt.get(d.t).add(d.side) }
  const near = (t, w) => { const i = step.get(t); const s = new Set(); for (let k = -w; k <= w; k++) { const c = C[i + k]; if (c && dAt.has(c.t)) for (const x of dAt.get(c.t)) s.add(x) } return s }
  const tag = (x, w) => { const s = w ? near(x.t, w) : dAt.get(x.t) ?? new Set(), opp = x.side === 'support' ? 'resistance' : 'support'; return s.has(opp) ? 'OPPOSITE' : s.has(x.side) ? 'SAME SIDE' : 'NONE' }
  res.part1[tf] = { xau_tests_real: X.filter((x) => x.oi === 0).length, dxy_tests: D.length, cond: {}, loose: {} }
  for (const [store, w] of [['cond', 0], ['loose', 1]]) for (const cond of ['OPPOSITE', 'SAME SIDE', 'NONE']) { const E = X.filter((x) => tag(x, w) === cond)
    const a = lift(E), tr = lift(E.filter((x) => x.t < SPLIT)), te = lift(E.filter((x) => x.t >= SPLIT)); res.part1[tf][store][cond] = { all: a, train: tr, test: te }
    if (store === 'cond' && a.n_real >= 30) cells.push({ key: `${tf}|${cond}`, p: a.p, ref: res.part1[tf][store][cond] }) }
  const o = res.part1[tf].cond.OPPOSITE.all, n = res.part1[tf].cond.NONE.all; res.part1[tf].opposite_vs_none = o.n_real && n.n_real ? compareRates(o.k_real, o.n_real, n.k_real, n.n_real) : null
  console.log(`  ${tf}: XAU tests ${res.part1[tf].xau_tests_real} · OPPOSITE ${o.n_real} held ${Math.round(100 * o.real)} % vs placebo ${Math.round(100 * o.placebo)} % · NONE ${n.n_real} held ${Math.round(100 * n.real)} % vs ${Math.round(100 * n.placebo)} %`) }
holm(cells); for (const c of cells) { c.ref.holm_pass = c.holm_pass; c.ref.p_holm = c.p_holm }
// ── Part 2 ──
const X3 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'confirm3m_xau.json'), 'utf8')), D3 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'confirm3m_dxy_ice.json'), 'utf8')), GX = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'confirm3m_xau_gross.json'), 'utf8'))
const dT = D3.trades.map((r) => ({ t: r[0], side: r[1], at: r[4] >= 0 })).sort((a, b) => a.t - b.t), grossBy = new Map(GX.trades.map((r) => [r[0] + ':' + r[1], r[8]]))
const lbT = (t) => { let a = 0, b = dT.length; while (a < b) { const m = (a + b) >> 1; if (dT[m].t < t) a = m + 1; else b = m } return a }
const dxyTag = (r, win) => { let opp = null, same = null; for (let k = lbT(r[0] - win); k < dT.length && dT[k].t <= r[0]; k++) { if (dT[k].side !== r[1]) opp = dT[k]; else same = dT[k] } return opp ? { c: 'DXY OPPOSITE (agrees)', at: opp.at } : same ? { c: 'DXY SAME (against)', at: same.at } : { c: 'NO DXY confirmation', at: false } }
function money(rows, ti) { const x = rows.map((r) => ({ t: r[0], fold: r[2], v: r[8]?.[ti]?.[1], r: r[8]?.[ti]?.[0], g: grossBy.get(r[0] + ':' + r[1])?.[ti]?.[0] })).filter((y) => y.v != null)
  if (!x.length) return { n: 0 }; const m = (a) => a.reduce((s, y) => s + y, 0) / a.length
  const g = new Map(); for (const y of x) { const k = Math.floor(y.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(y.v) } const bl = [...g.values()], R = rng(9), v = []
  for (let b = 0; b < B; b++) { let s = 0, c = 0; for (let k = 0; k < bl.length; k++) for (const z of bl[(R() * bl.length) | 0]) { s += z; c++ } v.push(s / c) } v.sort((a, b) => a - b)
  const tr = x.filter((y) => y.fold <= 4), oo = x.filter((y) => y.fold >= 5), folds = Array.from({ length: 8 }, (_, f) => { const z = x.filter((y) => y.fold === f).map((y) => y.v); return z.length ? m(z) : null })
  return { n: x.length, per_day: x.length / X3.days, wr: x.filter((y) => y.v > 0).length / x.length, mean: m(x.map((y) => y.v)), mean_r: m(x.map((y) => y.r)), gross_r: m(x.map((y) => y.g).filter((z) => z != null)), gross_wr: x.filter((y) => y.g > 0).length / x.length,
    lo: v[Math.floor(0.025 * B)], hi: v[Math.floor(0.975 * B)], train: tr.length ? m(tr.map((y) => y.v)) : null, oos: oo.length ? m(oo.map((y) => y.v)) : null, n_oos: oo.length, folds_positive: folds.filter((z) => z != null && z > 0).length } }
for (const win of [15, 60]) { const W = win * 60000, T = X3.trades.map((r) => ({ r, d: dxyTag(r, W) })), out = (res.part2[`${win} min`] = {})
  for (const [sp, f] of [['all XAU entries', () => true], ['XAU at an S/R level', (x) => x.r[4] >= 0], ['XAU at a level AND DXY confirmation at a DXY level', (x) => x.r[4] >= 0 && x.d.at]])
    for (const c of ['DXY OPPOSITE (agrees)', 'DXY SAME (against)', 'NO DXY confirmation']) out[`${sp} | ${c}`] = Object.fromEntries(X3.targets.map((tg, ti) => [tg, money(T.filter((x) => f(x) && x.d.c === c).map((x) => x.r), ti)])) }
fs.writeFileSync(path.join(TURBO.master, 'xau_dxy_sr.json'), JSON.stringify(res, null, 1))
// ── atlas ──
const pc = (x) => (x == null ? '—' : Math.round(100 * x) + ' %'), pp = (x) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} pp`), usd = (x) => (x == null ? '—' : `${x >= 0 ? '+' : '−'}$${Math.abs(x).toFixed(2)}`)
const L = ['# XAU and DXY together at S/R levels, on the same timeframe', '', `Generated from \`data/master/xau_dxy_sr.json\` (${res.at}); spec \`docs/XAU_DXY_SR_SPEC.md\` (written before the numbers). Window ${res.window[0].slice(0, 10)} → ${res.window[1].slice(0, 10)}; DXY = gold-grid candles (identical candle times).`, '',
  '## Part 1 — does XAU\'s level hold more when DXY is at the opposite level on the same candle?', '', '| TF | DXY at the same candle | XAU real tests | XAU held | Placebo held | Lift (95 %) | p (Holm) | First 3 y | Last 3 y |', '|---|---|---|---|---|---|---|---|---|']
for (const tf of TFS) { for (const c of ['OPPOSITE', 'SAME SIDE', 'NONE']) { const x = res.part1[tf].cond[c], a = x.all
  L.push(`| ${tf} | ${c} | ${a.n_real} | ${pc(a.real)} | ${pc(a.placebo)} | ${pp(a.lift)} (${pp(a.lo)} … ${pp(a.hi)})${a.n_real < 30 ? ' *few*' : ''} | ${x.p_holm?.toFixed(3) ?? '—'}${x.holm_pass ? ' ✔' : ''} | ${pp(x.train.lift)} | ${pp(x.test.lift)} |`) }
  const ov = res.part1[tf].opposite_vs_none; L.push(`| ${tf} | *OPPOSITE vs NONE (real held)* | | ${ov ? pp(ov.diff) : '—'} | | | p ${ov?.p?.toFixed(3) ?? '—'} (unadjusted) | | |`) }
L.push('', 'Robustness (DXY test within ±1 candle):', '', '| TF | OPPOSITE held vs placebo | SAME SIDE | NONE |', '|---|---|---|---|')
for (const tf of TFS) { const g = (c) => { const a = res.part1[tf].loose[c].all; return `${pc(a.real)} vs ${pc(a.placebo)} <sub>${a.n_real}</sub>` }; L.push(`| ${tf} | ${g('OPPOSITE')} | ${g('SAME SIDE')} | ${g('NONE')} |`) }
L.push('', '## Part 2 — the XAU 3m-confirmation entry when DXY confirms the opposite turn just before (money after spreads)', '')
for (const [win, P] of Object.entries(res.part2)) { L.push(`### DXY confirmation within ${win} before the XAU entry`, '', '| Split | DXY | Target | Trades | /day | WR | $ / trade (95 %) | Before costs | TRAIN | OOS | Folds + |', '|---|---|---|---|---|---|---|---|---|---|---|')
  for (const [k, byT] of Object.entries(P)) { const [sp, c] = k.split(' | '); for (const [tg, m] of Object.entries(byT)) if (m.n) L.push(`| ${sp} | ${c} | ${tg} | ${m.n} | ${m.per_day.toFixed(2)} | ${pc(m.wr)} | ${usd(m.mean)} (${usd(m.lo)} … ${usd(m.hi)}) | WR ${pc(m.gross_wr)} · ${m.gross_r >= 0 ? '+' : ''}${m.gross_r.toFixed(3)}R | ${usd(m.train)} | ${usd(m.oos)} (n ${m.n_oos}) | ${m.folds_positive}/8 |`) }
  L.push('') }
fs.writeFileSync(path.join(TURBO.root, 'docs', 'XAU_DXY_SR_ATLAS.md'), L.join('\n') + '\n')
console.log('written data/master/xau_dxy_sr.json + docs/XAU_DXY_SR_ATLAS.md')
