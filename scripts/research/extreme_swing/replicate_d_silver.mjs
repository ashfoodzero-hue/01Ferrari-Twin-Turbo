// replicate_d_silver.mjs — EXTREME SWING addendum C (2026-11-01, written before any silver number; Ashraf: "Yes, test on silver"):
// replicate the two gold D hypotheses (D1 weekly RSI divergence, D2 weekly range ≥ 2 ATR) on XAGUSD weekly ZigZag k = 3 legs, same rules (extreme_lib.mjs).
// PRIMARY control = in-leg weeks that were also a new in-leg extreme. READ-ONLY research. → data/research/extreme_swing/2026-11-01_silver_d_replication.json
import '../../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'
import { clean1m, kit } from '../../lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../../../src/core/dataHoles.js'
import { zigzag } from '../../../src/master/swings.js'
import { atr as atrArr, rsi as rsiArr, sma as smaArr } from '../../../src/core/indicators.js'
import { holm } from '../../../src/core/studyStats.js'
import { r2, mkLegs, makeDFeat, rate } from './extreme_lib.mjs'

const ES = path.join(TURBO.root, 'data', 'research', 'extreme_swing'), iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')
const M = await clean1m('XAGUSD'), holes = findHoles(M), W = kit('XAGUSD').build(M, '1W'); markIncomplete(W, holes)
const bW = new Set(W.map((c, i) => (c.incomplete ? i : -1)).filter((i) => i >= 0)), AW = atrArr(W, 14), RW = rsiArr(W, 14), SW20 = smaArr(W, 20)
const SWW = zigzag(W, { k: 3, breaks: bW }).swings, audit = {}

// pivot audit vs the published silver 1W table (addendum C.2)
{ const L = fs.readFileSync(path.join(TURBO.root, 'docs', 'swing_book', 'xag_1y_swings', '1W.csv'), 'utf8').trim().split(/\r?\n/), H = L[0].split(',')
  const rows = L.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [H[i], v])))
  const from = Date.parse(rows[0].candle_open), to = Date.parse(rows.at(-1).confirmed_at)
  const mine = SWW.filter((s) => s.t >= from && W[s.knownI].close_t <= to + 60000).map((s) => `${s.type === 'H' ? 'HIGH' : 'LOW'}|${iso(s.t)}|${s.px.toFixed(3)}`)
  const pub = rows.map((r) => `${r.type}|${r.candle_open}|${(+r.price).toFixed(3)}`)
  audit.pivots_vs_published_1W = { published: pub.length, rebuilt: mine.length, equal: mine.join() === pub.join(), only_published: pub.filter((x) => !mine.includes(x)), only_rebuilt: mine.filter((x) => !pub.includes(x)) } }

const legs = mkLegs(SWW, W, bW, AW), dFeat = makeDFeat({ W, AW, RW, SW20 }), WK = []
for (const leg of legs) for (let w = leg.si + 1; w <= leg.ei; w++) WK.push({ leg, w, end: w === leg.ei, era: leg.era, feat: dFeat(leg, w) })
const fair = WK.filter((r) => r.feat && r.feat.newExt)
audit.end_weeks_not_new_extreme = WK.filter((r) => r.end && r.feat && !r.feat.newExt).length

const gold = JSON.parse(fs.readFileSync(path.join(ES, '2026-11-01_extreme_swing.json'), 'utf8')).D
const items = ['D1_rsi_divergence', 'D2_vol_climax'].map((k) => { const g = (r) => (r.feat ? r.feat[k] : null)
  return { key: k, p: null, PRIMARY_fair: rate(fair, k, g), beside_all_in_leg: rate(WK, k, g), OLD_fair: rate(fair.filter((r) => r.era === 'OLD'), k, g), MODERN_fair: rate(fair.filter((r) => r.era === 'MODERN'), k, g),
    gold_fair: gold[k].diag_ctrl_new_extreme_weeks_only } })
for (const it of items) it.p = it.PRIMARY_fair.p
holm(items)
const voidRun = !audit.pivots_vs_published_1W.equal
for (const it of items) { const P = it.PRIMARY_fair
  it.checks = { ratio_gt_1: P.ratio > 1, holm_pass: it.holm_pass, n_end_30: P.n_end >= 30, same_sign_both_eras: it.OLD_fair.ratio > 1 && it.MODERN_fair.ratio > 1 }
  it.verdict = voidRun ? 'VOID (pivot audit)' : P.n_end < 30 ? 'DESCRIBED ONLY (n < 30)' : Object.values(it.checks).every(Boolean) ? 'PASS' : 'FAIL' }
const sz = (dir) => { const L = legs.filter((l) => l.dir === dir).map((l) => l.sizeAtr).sort((a, b) => a - b); return { n: L.length, median_size_atr: r2(L[Math.floor(L.length / 2)]) } }
const out = { spec: 'docs/research/extreme_swing/2026-11-01_EXTREME_SWING_SPEC.md addendum C', built_at: new Date().toISOString(), data_to: iso(M.at(-1).t), audit,
  counts: { weekly_candles: W.length, pivots: SWW.length, legs: legs.length, legs_modern: legs.filter((l) => l.era === 'MODERN').length, fair_control_weeks: fair.filter((r) => !r.end).length, up: sz(1), down: sz(-1) },
  items: items.map(({ key, p, p_holm, holm_pass, verdict, checks, PRIMARY_fair, beside_all_in_leg, OLD_fair, MODERN_fair, gold_fair }) => ({ key, verdict, p, p_holm: p_holm == null ? null : +p_holm.toPrecision(3), holm_pass, checks, PRIMARY_fair, OLD_fair, MODERN_fair, beside_all_in_leg, gold_fair })),
  legs: legs.map((l) => ({ dir: l.dir > 0 ? 'UP' : 'DOWN', start: iso(W[l.si].t), end: iso(W[l.ei].t), start_px: r2(l.sPx, 3), end_px: r2(l.ePx, 3), size_atr: r2(l.sizeAtr), weeks: l.candles,
    end_D1: dFeat(l, l.ei)?.D1_rsi_divergence ?? null, end_D2: dFeat(l, l.ei)?.D2_vol_climax ?? null })) }
fs.writeFileSync(path.join(ES, '2026-11-01_silver_d_replication.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify({ audit, counts: out.counts, items: out.items.map((i) => ({ key: i.key, verdict: i.verdict, checks: i.checks, P: i.PRIMARY_fair, OLD: i.OLD_fair, MOD: i.MODERN_fair })) }, null, 1))
