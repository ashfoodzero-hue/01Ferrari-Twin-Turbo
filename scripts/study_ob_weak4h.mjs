// ════════════════════════════════════════════════════════════════════════════════
// study_ob_weak4h.mjs — CONFIRMATION test of the one lead from study_order_block.mjs (2026-10-11; Ashraf: "test the weak 4H order blocks properly").
// ────────────────────────────────────────────────────────────────────────────────
// The lead (seen ONLY in the OOS 40 %, descriptive, post-hoc): 4h OBs with displacement 1.5-2 ATR → bounce 56.4 % vs random 46.9 %, +$1.19/t.
// PRE-REGISTERED HERE, before this script ran: the SAME rule (orderBlock.js, disp ∈ [1.5, 2)), the SAME trade (limit at the near edge, stop far
// edge ∓ 0.1·ATR, 1 R, 24 h, measured spread) — evaluated on data the lead was NOT found on, and stressed:
//   T1 TRAIN 60 % (2013-07 → split, unseen for this bucket): bounce > random control AND money mean > 0 AND bootstrap 2.5 % bound > 0.
//   T2 per year: money mean > 0 in ≥ 70 % of years with ≥ 20 trades.
//   T3 spread × 1.5 on the full window: money bound > 0.
//   T4 neighbours (robustness): disp [1.5, 1.75) and [1.75, 2) each money mean > 0 on the full window.
//   CONFIRMED ⇔ T1 AND T2 AND T3 AND T4. Otherwise the lead is noise.
//   Also reported (no verdict): the WR / $ frontier at targets 0.25 R … 2 R — what a "90 % WR" costs on this setup.
// Output: data/master/ob_weak4h_confirm.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { orderBlockAt } from '../src/master/orderBlock.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const HZ = 86400000, FRESH = 50, ms = RESAMPLE_TF_MS['4h'], base = makeSpreadAt(), rnd = seeded(20261013)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const B = (await loadBars('XAUUSD', '4h', { from: FROM - 3 * 86400000, to: TO })).bars, A = atrArr(B, 14)
const EV = []
for (let j = 22; j < B.length - 3; j++) { if (B[j].t < FROM) continue
  const ob = orderBlockAt(B, A, j); if (!ob || ob.disp >= 2) continue
  const known = B[ob.knownIdx].t + ms, up = ob.up, near = up ? ob.top : ob.bot, stop = up ? ob.bot - 0.1 * ob.atr : ob.top + 0.1 * ob.atr, D = Math.abs(near - stop)
  let kT = -1; for (let k = lb(known); k < M.length && M[k].t < known + FRESH * ms; k++) if (up ? M[k].l <= near : M[k].h >= near) { kT = k; break }
  if (kT < 0 || M[kT].t + HZ > TO) continue
  const tEnd = M[kT].t + HZ, pierced = up ? M[kT].l <= stop : M[kT].h >= stop, kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
  const money = (tm, mult = 1) => limitTrade(M, kT, up, near, stop, up ? near + tm * D : near - tm * D, mult === 1 ? base : (t) => mult * base(t), Math.min(0.3, 0.05 * ob.atr), tEnd)
  EV.push({ t: M[kT].t, up, disp: ob.disp, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', year: new Date(M[kT].t).getUTCFullYear(),
    bounce: pierced ? false : race(M, kT + 1, up, up ? near + D : near - D, stop, tEnd), ctrl: race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + HZ),
    net: money(1), net15: money(1, 1.5), frontier: Object.fromEntries([0.25, 0.5, 0.75, 1, 1.5, 2].map((tm) => [tm, money(tm)])) })
}
const S = (E, k = 'net') => { const r = E.filter((e) => e.bounce != null), c = E.filter((e) => e.ctrl != null), m = E.filter((e) => e[k] != null).map((e) => e[k]), bs = []
  for (let b = 0; b < 2000 && m.length; b++) { let s = 0; for (let i = 0; i < m.length; i++) s += m[(rnd() * m.length) | 0]; bs.push(s / m.length) }; bs.sort((x, y) => x - y)
  return { n: m.length, bounce: r.length ? +(r.filter((e) => e.bounce).length / r.length).toFixed(4) : null, control: c.length ? +(c.filter((e) => e.ctrl).length / c.length).toFixed(4) : null,
    money_wr: m.length ? +(m.filter((x) => x > 0).length / m.length).toFixed(4) : null, net: m.length ? +(m.reduce((s, x) => s + x, 0) / m.length).toFixed(3) : null, net_lb: bs.length ? +bs[50].toFixed(3) : null } }
const tr = S(EV.filter((e) => e.part === 'TRAIN')), oos = S(EV.filter((e) => e.part === 'OOS')), all = S(EV), stress = S(EV, 'net15')
const years = {}; for (const y of [...new Set(EV.map((e) => e.year))].sort()) years[y] = S(EV.filter((e) => e.year === y))
const yq = Object.values(years).filter((y) => y.n >= 20), posY = yq.filter((y) => y.net > 0).length
const bySide = Object.fromEntries(['BUY', 'SELL'].flatMap((sd) => [['2013-2021', (e) => e.year <= 2021], ['2022-2026', (e) => e.year >= 2022]].map(([p, f]) => [sd + ' ' + p, S(EV.filter((e) => (e.up === (sd === 'BUY')) && f(e)))])))
const lo = S(EV.filter((e) => e.disp < 1.75)), hi = S(EV.filter((e) => e.disp >= 1.75))
const tests = { T1_train: tr.bounce > tr.control && tr.net > 0 && tr.net_lb > 0, T2_years: posY >= 0.7 * yq.length, T3_spread_x1_5: stress.net_lb > 0, T4_neighbours: lo.net > 0 && hi.net > 0 }
const frontier = Object.fromEntries([0.25, 0.5, 0.75, 1, 1.5, 2].map((tm) => { const m = EV.map((e) => e.frontier[tm]).filter((x) => x != null); return [tm + 'R', { n: m.length, wr: +(m.filter((x) => x > 0).length / m.length).toFixed(4), net: +(m.reduce((s, x) => s + x, 0) / m.length).toFixed(3) }] }))
const out = { at: new Date().toISOString(), rule: '4h OB, displacement 1.5-2 ATR, first retest, limit at near edge, 1 R', train: tr, oos, all, spread_x1_5: stress, years, positive_years: `${posY}/${yq.length}`, neighbours: { '1.5-1.75': lo, '1.75-2': hi }, by_side_era: bySide, frontier, tests,
  verdict: Object.values(tests).every(Boolean) ? 'CONFIRMED' : 'NOT_CONFIRMED' }
fs.writeFileSync(path.join(TURBO.master, 'ob_weak4h_confirm.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify({ train: tr, oos, all, stress, positive_years: out.positive_years, years: Object.fromEntries(Object.entries(years).map(([y, s]) => [y, `${s.net} n${s.n}`])), lo, hi, frontier, tests }, null, 1))
console.log('\n=> WEAK 4H ORDER BLOCKS: ' + out.verdict)
