// study_warning_aftermath.mjs — EXHAUSTION WARNING aftermath (docs/research/extreme_swing/2026-11-01_WARNING_AFTERMATH_SPEC.md + addendum A,
// written before any number; Ashraf 2026-11-01: "Yes, build and run"). Part 1: do the CAUSAL D1 / D2 warnings still mark leg ends (gold + silver)?
// Part 2: what happens after a warning — hold (P0) vs exit (P1) vs tighten (P2), each against the same action at non-warning new extremes.
// Counter-trend trade = described only. READ-ONLY research. → data/research/extreme_swing/2026-11-01_warning_aftermath.json + warnings.jsonl
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'
import { clean1m, kit } from '../../lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../../../src/core/dataHoles.js'
import { zigzag } from '../../../src/master/swings.js'
import { atr as atrArr, rsi as rsiArr, sma as smaArr } from '../../../src/core/indicators.js'
import { compareRates, holm, rng } from '../../../src/core/studyStats.js'
import { makeSpreadAt } from '../../../src/master/spreadModel.js'
import { r2, mkLegs, makeDFeat, rate, causalWarnings } from './extreme_lib.mjs'

const ES = path.join(TURBO.root, 'data', 'research', 'extreme_swing'), iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')
const SETS = ['D1', 'D2', 'ANY'], POL = ['P1', 'P2'], K2 = 6, ALPHA = 0.05, BOOT = 5000, PLAC = 1000, PLAC_B = 400, PLAC_LIMIT = 0.05 + 3 * Math.sqrt(0.05 * 0.95 / 1000)
const q = (arr, p) => { const s = arr.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const k = (s.length - 1) * p, lo = Math.floor(k); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (k - lo) }
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
const spreadAt = makeSpreadAt()

// leg-cluster bootstrap of mean(lift | warning) − mean(lift | control): rows [{ legKey, lift, isW }]
function clusterDiff(rows, { B = BOOT, seed = 11 } = {}) {
  const g = new Map(); for (const r of rows) { if (!g.has(r.legKey)) g.set(r.legKey, []); g.get(r.legKey).push(r) }
  const legs = [...g.values()], diff = (L) => { let sw = 0, nw = 0, sc = 0, nc = 0; for (const G of L) for (const r of G) { if (r.isW) { sw += r.lift; nw++ } else { sc += r.lift; nc++ } } return nw && nc ? sw / nw - sc / nc : null }
  const obs = diff(legs), rr = rng(seed), v = []
  for (let b = 0; b < B; b++) { const L = []; for (let i = 0; i < legs.length; i++) L.push(legs[(rr() * legs.length) | 0]); const d = diff(L); if (d != null) v.push(d) }
  v.sort((a, b) => a - b)
  return { diff: obs, lb: v[Math.floor((ALPHA / K2) * v.length)], p: Math.max(1 / B, v.filter((x) => x <= 0).length / v.length) } }

async function metal(sym) {
  const M = await clean1m(sym), holes = findHoles(M), W = kit(sym).build(M, '1W'); markIncomplete(W, holes)
  const breaks = new Set(W.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)), AW = atrArr(W, 14), RW = rsiArr(W, 14), SW20 = smaArr(W, 20)
  const SW = zigzag(W, { k: 3, breaks }).swings, audit = {}
  // audit: the hindsight D tables reproduce (ft) / (fu) through the same code path (spec §4)
  { const legs = mkLegs(SW, W, breaks, AW), dFeat = makeDFeat({ W, AW, RW, SW20 }), WK = []
    for (const leg of legs) for (let w = leg.si + 1; w <= leg.ei; w++) WK.push({ end: w === leg.ei, feat: dFeat(leg, w) })
    const fair = WK.filter((r) => r.feat && r.feat.newExt), mine = ['D1_rsi_divergence', 'D2_vol_climax'].map((k) => rate(fair, k, (r) => (r.feat ? r.feat[k] : null)))
    const saved = sym === 'XAUUSD' ? ['D1_rsi_divergence', 'D2_vol_climax'].map((k) => JSON.parse(fs.readFileSync(path.join(ES, '2026-11-01_extreme_swing.json'), 'utf8')).D[k].diag_ctrl_new_extreme_weeks_only)
      : JSON.parse(fs.readFileSync(path.join(ES, '2026-11-01_silver_d_replication.json'), 'utf8')).items.map((i) => i.PRIMARY_fair)
    audit.reproduces_hindsight_D = JSON.stringify(mine) === JSON.stringify(saved) }
  const { rows, audit: ca } = causalWarnings({ W, AW, RW, SW, breaks }); audit.causal_violations = ca.causal_violations
  // ── Part 2 values per row ──
  for (const r of rows) { if (!r.known) continue
    const c0 = W[r.w].c, ex = W[r.end.knownI], A = r.atr, cost = (t) => (sym === 'XAUUSD' ? spreadAt(t) : 0)
    r.weeks_to_end = r.end.i - r.w
    r.further_atr = Math.max(0, r.dir > 0 ? r.end.px - W[r.w].h : W[r.w].l - r.end.px) / A
    let adv = 0; for (let i = r.w + 1; i <= r.end.i; i++) adv = Math.max(adv, r.dir > 0 ? c0 - W[i].l : W[i].h - c0); r.adverse_atr = adv / A
    const P0 = (r.dir * (ex.c - c0) - cost(ex.close_t - 60000)) / A, P1 = -cost(W[r.w].close_t - 60000) / A
    const walk = (stop, side) => { for (let i = r.w + 1; i <= r.end.knownI; i++) { const b = W[i]
        if (side > 0 ? b.o <= stop : b.o >= stop) return { px: b.o, t: b.t }; if (side > 0 ? b.l <= stop : b.h >= stop) return { px: stop, t: b.t } }
      return { px: ex.c, t: ex.close_t - 60000 } }
    const s2 = walk(r.dir > 0 ? W[r.w].l - 0.1 * A : W[r.w].h + 0.1 * A, r.dir), P2 = (r.dir * (s2.px - c0) - cost(s2.t)) / A
    const s3 = walk(r.dir > 0 ? W[r.w].h + 0.25 * A : W[r.w].l - 0.25 * A, -r.dir), CT = (-r.dir * (s3.px - c0) - cost(s3.t)) / A
    Object.assign(r, { P0, P1, P2, lift_P1: P1 - P0, lift_P2: P2 - P0, counter_atr: CT, counter_stopped: s3.px !== ex.c, cost_atr: cost(ex.close_t - 60000) / A }) }
  const R = rows.filter((r) => r.known)
  // ── Part 1 ──
  const p1 = SETS.map((s) => { const cr = (L) => { const w = L.filter((r) => r[s]), n = L.filter((r) => !r[s]), c = compareRates(w.filter((r) => r.TRUE).length, w.length, n.filter((r) => r.TRUE).length, n.length)
      return { warnings: w.length, true_in_warnings: w.filter((r) => r.TRUE).length, non_warnings: n.length, true_in_non: n.filter((r) => r.TRUE).length, precision: r2(c.p1, 3), base_non_warning: r2(c.p2, 3), ratio: r2(c.ratio, 2), p: c.p == null ? null : +c.p.toPrecision(3) } }
    return { key: s, p: null, ALL: cr(R), OLD: cr(R.filter((r) => r.era === 'OLD')), MODERN: cr(R.filter((r) => r.era === 'MODERN')), n_TRUE: R.filter((r) => r.TRUE).length,
      base_rate_all_new_extremes: r2(R.filter((r) => r.TRUE).length / R.length, 3) } })
  for (const x of p1) x.p = x.ALL.p
  holm(p1)
  for (const x of p1) x.checks = { ratio_gt_1: x.ALL.ratio > 1, holm_pass: x.holm_pass, n_TRUE_30: x.n_TRUE >= 30, same_sign_eras: x.OLD.ratio > 1 && x.MODERN.ratio > 1 }
  // ── Part 2 ──
  const p2 = []
  for (const s of SETS) for (const pol of POL) { const rowsX = R.map((r) => ({ legKey: r.legKey, lift: r['lift_' + pol], isW: r[s], era: r.era }))
    const cd = clusterDiff(rowsX), era = (e) => { const X = rowsX.filter((r) => r.era === e); return r2(mean(X.filter((r) => r.isW).map((r) => r.lift)) - mean(X.filter((r) => !r.isW).map((r) => r.lift)), 3) }
    // placebo (spec §4 + addendum A.4): the same number of warnings per leg on random new-extreme weeks of that leg
    const byLeg = new Map(); rowsX.forEach((r, i) => { if (!byLeg.has(r.legKey)) byLeg.set(r.legKey, []); byLeg.get(r.legKey).push(i) })
    const pr = rng(500 + p2.length); let pp = 0
    for (let d = 0; d < PLAC; d++) { const isW = new Array(rowsX.length).fill(false)
      for (const idx of byLeg.values()) { const nW = idx.filter((i) => rowsX[i].isW).length, sh = idx.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(pr() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]] } for (let j = 0; j < nW; j++) isW[sh[j]] = true }
      const c = clusterDiff(rowsX.map((r, i) => ({ ...r, isW: isW[i] })), { B: PLAC_B, seed: 900 + d }); if (c.diff > 0 && c.lb > 0) pp++ }
    const W_ = rowsX.filter((r) => r.isW), C_ = rowsX.filter((r) => !r.isW)
    p2.push({ key: `${s}|${pol}`, set: s, policy: pol, n_warnings: W_.length, n_control: C_.length, mean_lift_warnings: r2(mean(W_.map((r) => r.lift)), 3), mean_lift_control: r2(mean(C_.map((r) => r.lift)), 3),
      diff: r2(cd.diff, 3), lb: r2(cd.lb, 3), p: cd.p, era_OLD_diff: era('OLD'), era_MODERN_diff: era('MODERN'), placebo_pass_rate: pp / PLAC, placebo_void: pp / PLAC > PLAC_LIMIT, part1_gate: p1.find((x) => x.key === s).checks }) }
  holm(p2)
  // ── aftermath + counter-trade (descriptive) ──
  const after = Object.fromEntries(SETS.map((s) => { const X = R.filter((r) => r[s]), F = X.filter((r) => !r.TRUE)
    return [s, { n: X.length, TRUE: X.filter((r) => r.TRUE).length, weeks_to_end_q: [0.5, 0.75, 0.9].map((p) => q(X.map((r) => r.weeks_to_end), p)),
      false_further_run_atr_q: [0.25, 0.5, 0.75, 0.9].map((p) => r2(q(F.map((r) => r.further_atr), p))), adverse_atr_q: [0.5, 0.75, 0.9].map((p) => r2(q(X.map((r) => r.adverse_atr), p))),
      false_more_warnings_before_end_median: q(F.map((r) => X.filter((x) => x.legKey === r.legKey && x.w > r.w && x.w <= r.end.i).length), 0.5),
      P0_hold_mean_atr: r2(mean(X.map((r) => r.P0)), 3), P2_tighten_mean_atr: r2(mean(X.map((r) => r.P2)), 3),
      counter_trade: { n: X.length, wr: r2(X.filter((r) => r.counter_atr > 0).length / X.length, 3), mean_atr: r2(mean(X.map((r) => r.counter_atr)), 3), stopped: X.filter((r) => r.counter_stopped).length } }] }))
  const cur = rows.filter((r) => !r.known).slice(-3).map((r) => ({ week: iso(r.t), dir: r.dir > 0 ? 'UP' : 'DOWN', pivot_px: r2(r.pivot.px, 3), D1: r.D1, D2: r.D2 }))
  const lastP = SW.filter((s) => s.knownI < W.length).at(-1)
  return { sym, audit, counts: { weeks: W.length, pivots: SW.length, causal_new_extreme_rows: rows.length, with_outcome: R.length, open_leg_rows: rows.length - R.length },
    gold_median_cost_atr: sym === 'XAUUSD' ? r2(q(R.map((r) => r.cost_atr), 0.5), 5) : 'no measured silver spread (addendum A.1): costs 0',
    part1: p1.map(({ key, ALL, OLD, MODERN, n_TRUE, base_rate_all_new_extremes, p_holm, holm_pass, checks }) => ({ key, ALL, OLD, MODERN, n_TRUE, base_rate_all_new_extremes, p_holm: r2(p_holm, 5), holm_pass, checks })),
    part2: p2.map((x) => ({ ...x, p_holm: r2(x.p_holm, 5) })), aftermath: after,
    current: { last_confirmed_pivot: { type: lastP.type, candle: iso(lastP.t), px: r2(lastP.px, 3) }, last_week: iso(W.at(-1).t), last_close: r2(W.at(-1).c, 3), recent_causal_new_extreme_weeks: cur },
    rows: rows.map((r) => ({ sym, week: iso(r.t), dir: r.dir, era: r.era, D1: r.D1, D2: r.D2, TRUE: r.TRUE, weeks_to_end: r.weeks_to_end ?? null, further_atr: r2(r.further_atr, 3), P0: r2(r.P0, 3), P2: r2(r.P2, 3), counter_atr: r2(r.counter_atr, 3) })) } }

const G = await metal('XAUUSD'); console.log('GOLD', JSON.stringify({ audit: G.audit, counts: G.counts, part1: G.part1 }))
const S = await metal('XAGUSD'); console.log('SILVER', JSON.stringify({ audit: S.audit, counts: S.counts, part1: S.part1 }))
// verdicts (spec §2, §4): both metals
const voidRun = [G, S].some((m) => !m.audit.reproduces_hindsight_D || m.audit.causal_violations > 0) || [G, S].some((m) => m.part2.some((x) => x.placebo_void))
const part1Pass = Object.fromEntries(SETS.map((s) => [s, [G, S].every((m) => Object.values(m.part1.find((x) => x.key === s).checks).every(Boolean))]))
const verdicts = []
for (const s of SETS) for (const pol of POL) { const g = G.part2.find((x) => x.key === `${s}|${pol}`), v = S.part2.find((x) => x.key === `${s}|${pol}`)
  const ok = (x) => x.diff > 0 && x.lb > 0 && x.holm_pass && x.n_warnings >= 30 && x.era_OLD_diff > 0 && x.era_MODERN_diff > 0
  verdicts.push({ key: `${s}|${pol}`, verdict: voidRun ? 'VOID' : !part1Pass[s] ? 'DESCRIBED ONLY (Part 1 gate failed)' : ok(g) && ok(v) ? 'PASS' : 'FAIL', gold: { diff: g.diff, lb: g.lb, p: g.p, holm: g.holm_pass }, silver: { diff: v.diff, lb: v.lb, p: v.p, holm: v.holm_pass } }) }
const strip = (m) => { const { rows, ...rest } = m; return rest }
const out = { spec: 'docs/research/extreme_swing/2026-11-01_WARNING_AFTERMATH_SPEC.md (+ addendum A)', built_at: new Date().toISOString(), void: voidRun, part1_pass: part1Pass, verdicts, gold: strip(G), silver: strip(S) }
fs.writeFileSync(path.join(ES, '2026-11-01_warning_aftermath.json'), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(ES, 'warnings.jsonl'), [...G.rows, ...S.rows].map((r) => JSON.stringify(r)).join('\n') + '\n')
console.log('PART1_PASS', JSON.stringify(part1Pass), 'VOID', voidRun)
console.log('VERDICTS', JSON.stringify(verdicts))
for (const m of [G, S]) console.log(m.sym, 'AFTER', JSON.stringify(m.aftermath), 'P2', JSON.stringify(m.part2.map((x) => [x.key, x.n_warnings, x.mean_lift_warnings, x.mean_lift_control, x.diff, x.lb, x.placebo_pass_rate])), 'CURRENT', JSON.stringify(m.current), 'COST', m.gold_median_cost_atr)
