// ════════════════════════════════════════════════════════════════════════════════
// study_order_block.mjs — do ORDER BLOCKS hold, and does their STRENGTH matter? (2026-10-11; Ashraf: "strength of OB" → "go").
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (written before the first run). XAU spot 1m BID (Polygon), FROZEN TAPE, 2013-07-21 → TURBO_VAL_TO. tf 5m, 15m, 1h, 4h.
//   OB + STRENGTH: src/master/orderBlock.js (one rule). Event = the FIRST 1m retest of the near edge within 50 tf-bars after the OB is known.
//   TRADE: LIMIT at the near edge (bounceTest.limitTrade, measured spread), stop = far edge ∓ 0.1·ATR, target 1 R or 2 R (R = near edge → stop),
//          24 h horizon. Bounce share = race (touch-minute pierce of the stop = fail). Control = a random 1m bar within ±10 days, same distances.
//   cells = 4 tf × {ALL, STRONG} × {1 R, 2 R} = 16 → z 2.73 (one-sided α 0.05/16) on the bounce share AND on the money bound.
//   HOLDS ⇔ OOS resolved ≥ 100 AND OOS bounce Wilson LB > OOS control AND TRAIN bounce > TRAIN control AND OOS money bound (α 0.05/16) > 0
//          AND TRAIN money mean > 0. Split TRAIN 60 % / OOS 40 % by time.
//   DIAGNOSTIC (descriptive): OOS bounce / money by displacement bucket (1.5-2, 2-2.5, 2.5-3.5, ≥ 3.5 ATR) at 1 R — "does strength matter?".
// Output: data/master/order_block_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { levelStat } from './lib/study_stats.mjs'
import { orderBlockAt, OB_RULE } from '../src/master/orderBlock.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const TMS = [1, 2], Z = 2.73, Q = 0.05 / 16, MIN_N = 100, FRESH = 50, HZ = 86400000, TFS = ['5m', '15m', '1h', '4h'], CTRL = 14400
const spreadAt = makeSpreadAt(), rnd = seeded(20261012)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log(`1m bars ${M.length.toLocaleString()}`)
const stat = (E) => { const s = levelStat(E, rnd, Z), mn = E.filter((e) => e.net != null), boots = []
  for (let b = 0; b < 2000 && mn.length; b++) { let x = 0; for (let j = 0; j < mn.length; j++) x += mn[(rnd() * mn.length) | 0].net; boots.push(x / mn.length) }; boots.sort((x, y) => x - y)
  return { ...s, money_wr: mn.length ? +(mn.filter((e) => e.net > 0).length / mn.length).toFixed(4) : null, net_lb_bonf: boots.length ? +boots[Math.floor(Q * boots.length)].toFixed(4) : null, avg_risk: mn.length ? +(mn.reduce((x, e) => x + e.D, 0) / mn.length).toFixed(2) : null } }
const verdict = (TR, OOS) => (OOS.resolved < MIN_N ? 'UNDERPOWERED' : OOS.bounce_lb > OOS.control && TR.bounce > TR.control && OOS.net_lb_bonf > 0 && TR.net > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')

const cells = {}, diag = {}
for (const tf of TFS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: FROM - 3 * 86400000, to: TO })).bars, A = atrArr(B, 14)
  const EV = {}; for (const g of ['ALL', 'STRONG']) for (const tm of TMS) EV[`${g}|${tm}`] = []
  const D1 = []; let obs = 0
  for (let j = 22; j < B.length - OB_RULE.k; j++) { if (B[j].t < FROM) continue
    const ob = orderBlockAt(B, A, j); if (!ob) continue; obs++
    const known = B[ob.knownIdx].t + ms, up = ob.up, near = up ? ob.top : ob.bot, stopLine = up ? ob.bot - 0.1 * ob.atr : ob.top + 0.1 * ob.atr, D = Math.abs(near - stopLine)
    let kT = -1; for (let k = lb(known); k < M.length && M[k].t < known + FRESH * ms; k++) { if (up ? M[k].l <= near : M[k].h >= near) { kT = k; break } }
    if (kT < 0) continue
    const tEnd = M[kT].t + HZ; if (tEnd > TO) continue
    const part = M[kT].t < SPLIT ? 'TRAIN' : 'OOS', pierced = up ? M[kT].l <= stopLine : M[kT].h >= stopLine
    const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * CTRL))), c0 = M[kc].c
    for (const tm of TMS) { const tgt = up ? near + tm * D : near - tm * D
      const e = { t: M[kT].t, part, D, disp: ob.disp, bounce: pierced ? false : race(M, kT + 1, up, tgt, stopLine, tEnd),
        ctrl: race(M, kc + 1, up, up ? c0 + tm * D : c0 - tm * D, up ? c0 - D : c0 + D, M[kc].t + HZ),
        net: limitTrade(M, kT, up, near, stopLine, tgt, spreadAt, Math.min(0.3, 0.05 * ob.atr), tEnd) }
      EV[`ALL|${tm}`].push(e); if (ob.strong) EV[`STRONG|${tm}`].push(e); if (tm === 1) D1.push(e) }
  }
  for (const [k, E] of Object.entries(EV)) { const [g, tm] = k.split('|'), TR = stat(E.filter((e) => e.part === 'TRAIN')), OOS = stat(E.filter((e) => e.part === 'OOS'))
    const c = (cells[`${tf}|${g}|${tm}R`] = { tf, group: g, target_R: +tm, train: TR, oos: OOS, verdict: verdict(TR, OOS) })
    console.log(`${tf.padEnd(3)} ${g.padEnd(6)} ${tm}R  OOS bounce ${OOS.bounce} (LB ${OOS.bounce_lb}) vs random ${OOS.control} · money WR ${OOS.money_wr} $/t ${OOS.net} [LB ${OOS.net_lb_bonf}] n ${OOS.trades} risk $${OOS.avg_risk} · TRAIN bounce ${TR.bounce}/${TR.control} $/t ${TR.net} → ${c.verdict}`) }
  const bins = [[1.5, 2], [2, 2.5], [2.5, 3.5], [3.5, Infinity]]
  diag[tf] = { order_blocks: obs, by_displacement_1R_oos: Object.fromEntries(bins.map(([lo, hi]) => [`${lo}-${hi === Infinity ? '+' : hi}`, (({ resolved, bounce, control, money_wr, net, trades }) => ({ resolved, bounce, control, money_wr, net, trades }))(stat(D1.filter((e) => e.part === 'OOS' && e.disp >= lo && e.disp < hi)))])) }
  console.log(`${tf.padEnd(3)} strength buckets (OOS, 1R): ` + JSON.stringify(diag[tf].by_displacement_1R_oos))
}
const holds = Object.entries(cells).filter(([, c]) => c.verdict === 'HOLDS').map(([k]) => k)
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { ob: OB_RULE, retest_within_bars: FRESH, stop: 'far edge ∓ 0.1·ATR', targets_R: TMS, z: Z, money_alpha: Q, min_n: MIN_N }, cells, diagnostic: diag, holding: holds,
  verdict: holds.length ? 'SOME_ORDER_BLOCKS_HOLD' : 'ORDER_BLOCKS_DO_NOT_HOLD' }
fs.writeFileSync(path.join(TURBO.master, 'order_block_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> ORDER BLOCKS: ${out.verdict}${holds.length ? ' (' + holds.join(', ') + ')' : ''}`)
