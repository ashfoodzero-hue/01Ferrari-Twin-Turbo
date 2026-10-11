// ════════════════════════════════════════════════════════════════════════════════
// study_fvg.mjs — do FAIR VALUE GAPS hold on gold? (2026-10-09; Ashraf: "the real valid FVG where price will 100% bounce … test FVG")
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (written before the first run). Data: XAU spot, Polygon BID, the twin's 1m store, 2013-07-21 → TURBO_VAL_TO (13 y).
//   FVG (3-candle, closed bars of tf ∈ {3m, 15m, 1h}): BULLISH at bar i when low[i] > high[i−2] → zone [high[i−2], low[i]];
//        BEARISH when high[i] < low[i−2] → zone [high[i], low[i−2]]. Known at the CLOSE of bar i (never earlier).
//   variants: ALL = zone ≥ 0.1·ATR14(tf) · BIG = zone ≥ 0.5·ATR14(tf) (the "valid", displacement-sized gap) → 6 variants, Bonferroni α/6
//   event = the FIRST 1m retest after the gap is known, within 100 tf-bars: bullish → a 1m low ≤ zone top (bearish mirrored)
//   BOUNCE (geometry, bid): buffer = 0.1·ATR; stop line = zone bottom − buffer; R = top − stop; bounce ⇔ price reaches top + R before
//        the stop line, within 24 h. The touch minute counts only against (a stop inside it = fail; a target inside it is ignored —
//        the order inside one minute is unknown). Bearish mirrored.
//   CONTROL (same test without a gap): for every event, the same side / R / buffer anchored at the close of a random 1m bar within
//        ±2 weeks (seeded) — the bounce share any level would get from gold's own drift and volatility.
//   MONEY PATH: limit at the zone edge (long fills when the ASK ≤ top: bid ≤ top − spread; short fills at the bid ≥ bottom), stop at the
//        stop line (+ slippage min(0.30, 0.05·ATR)), target top + R; exits compared on the correct side (long sells at the bid; short
//        buys at the ask = bid + spread); stop first inside a minute; target only after the fill minute; 24 h → market. Measured spread.
//   split: TRAIN = first 60 % of the window, OOS = last 40 %. FROZEN TAPE: 1m data stop at TO; an event counts only if its 24 h fit
//   before TO (added 2026-10-09 after measuring that end-of-tape trades closed on the live last minute → runs were not reproducible).
//   A variant HOLDS ⇔ OOS bounce Wilson LB (z = 2.64, one-sided α 0.05/6) > OOS control share AND TRAIN bounce > TRAIN control AND
//        OOS money-path mean $/trade bootstrap 2.5 % bound > 0. Otherwise: "FVG does not hold better than any level".
// Output: data/master/fvg_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race as raceM, seeded, limitTrade } from '../src/master/bounceTest.js'
const race = (...a) => raceM(M, ...a)

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const SPLIT = FROM + 0.6 * (TO - FROM), HZ = 24 * 60, Z = 2.64, BUF = 0.1, EXPIRE = 100
const TFS = { '3m': 180000, '15m': 900000, '1h': 3600000 }, SIZES = { ALL: 0.1, BIG: 0.5 }
const spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars   // frozen tape: nothing after TO (reproducible)
const MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log(`1m bars ${M.length.toLocaleString()} · ${new Date(FROM).toISOString().slice(0, 10)} → ${new Date(TO).toISOString().slice(0, 16)}`)

// money path = bounceTest.limitTrade (entry at the zone edge, stop beyond it, 1:1 target)
const money = (kTouch, up, top, bot, R, buf, atr, tEnd) => limitTrade(M, kTouch, up, up ? top : bot, up ? bot - buf : top + buf, up ? top + R : bot - R, spreadAt, Math.min(0.3, 0.05 * atr), tEnd)
const rnd = seeded(987654321)

const results = {}
for (const [tf, ms] of Object.entries(TFS)) {
  const B = (await loadBars('XAUUSD', tf, { from: FROM - 3 * 86400000, to: TO })).bars, A = atrArr(B, 14)
  for (const [vName, minSize] of Object.entries(SIZES)) {
    const ev = []
    for (let i = 16; i < B.length; i++) { const a = A[i]; if (!(a > 0) || B[i].t < FROM) continue
      const bull = B[i].l > B[i - 2].h, bear = B[i].h < B[i - 2].l; if (!bull && !bear) continue
      const top = bull ? B[i].l : B[i - 2].l, bot = bull ? B[i - 2].h : B[i].h, size = top - bot; if (size < minSize * a) continue
      const known = B[i].t + ms, expire = known + EXPIRE * ms, up = bull, buf = BUF * a, R = up ? top - (bot - buf) : (top + buf) - bot
      // first 1m retest
      let k = lb(known), kT = -1; for (; k < M.length && M[k].t < expire; k++) { if (up ? M[k].l <= top : M[k].h >= bot) { kT = k; break } }
      if (kT < 0) continue
      const tEnd = M[kT].t + HZ * 60000; if (tEnd > TO) continue   // only events fully resolvable inside the frozen tape
      const stopLine = up ? bot - buf : top + buf
      const pierced = up ? M[kT].l <= stopLine : M[kT].h >= stopLine
      const free = race(kT + 1, up, up ? top + R : bot - R, stopLine, tEnd), bounce = pierced ? false : free   // free = DIAGNOSTIC: no touch-minute penalty
      // control: same side/R/buffer at a random 1m close within ±2 weeks
      const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
      const ctrl = race(kc + 1, up, up ? c0 + R : c0 - R, up ? c0 - R : c0 + R, M[kc].t + HZ * 60000)
      const net = money(kT, up, top, bot, R, buf, a, tEnd)
      ev.push({ t: M[kT].t, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', side: up ? 'BUY' : 'SELL', sizeAtr: size / a, bounce, free, pierced, ctrl, net, R })
    }
    const S = (part) => { const E = ev.filter((e) => e.part === part), r = E.filter((e) => e.bounce != null), w = r.filter((e) => e.bounce).length
      const c = E.filter((e) => e.ctrl != null), cw = c.filter((e) => e.ctrl).length, mn = E.filter((e) => e.net != null)
      const mean = mn.length ? mn.reduce((s, e) => s + e.net, 0) / mn.length : null
      const boots = []; for (let b = 0; b < 1000 && mn.length; b++) { let s = 0; for (let j = 0; j < mn.length; j++) s += mn[(rnd() * mn.length) | 0].net; boots.push(s / mn.length) }; boots.sort((x, y) => x - y)
      return { events: E.length, resolved: r.length, bounce: r.length ? +(w / r.length).toFixed(4) : null, bounce_lb: r.length ? +wilsonLowerBound(w, r.length, Z).toFixed(4) : null,
        control: c.length ? +(cw / c.length).toFixed(4) : null, trades: mn.length, net_per_trade: mean == null ? null : +mean.toFixed(4), net_lb: boots.length ? +boots[25].toFixed(4) : null,
        pierced_share: E.length ? +(E.filter((e) => e.pierced).length / E.length).toFixed(4) : null,
        bounce_no_touch_penalty: (() => { const f = E.filter((e) => e.free != null); return f.length ? +(f.filter((e) => e.free).length / f.length).toFixed(4) : null })(),
        avg_R: E.length ? +(E.reduce((s, e) => s + e.R, 0) / E.length).toFixed(2) : null, net_in_R: mn.length ? +(mn.reduce((s, e) => s + e.net / e.R, 0) / mn.length).toFixed(4) : null }
    }
    const TR = S('TRAIN'), OOS = S('OOS')
    const years = {}; for (const e of ev) { if (e.bounce == null) continue; const y = new Date(e.t).getUTCFullYear(); years[y] ??= { n: 0, b: 0 }; years[y].n++; if (e.bounce) years[y].b++ }
    const holds = OOS.resolved >= 100 && OOS.bounce_lb > OOS.control && TR.bounce > TR.control && OOS.net_lb > 0
    results[`${tf}_${vName}`] = { tf, variant: vName, min_size_atr: minSize, train: TR, oos: OOS, verdict: holds ? 'HOLDS' : 'DOES_NOT_HOLD',
      by_year: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, +(v.b / v.n).toFixed(3)])), best_year_bounce: Math.max(...Object.values(years).map((v) => v.b / v.n)) }
    console.log(`${tf} ${vName}: [diag no-penalty ${OOS.bounce_no_touch_penalty}, pierced ${OOS.pierced_share}] OOS bounce ${OOS.bounce} (LB ${OOS.bounce_lb}) vs control ${OOS.control} · TRAIN ${TR.bounce} vs ${TR.control} · OOS $/t ${OOS.net_per_trade} [LB ${OOS.net_lb}] (${OOS.net_in_R} R, n ${OOS.trades}) → ${holds ? 'HOLDS' : 'DOES NOT HOLD'}`)
  }
}
const any = Object.values(results).some((r) => r.verdict === 'HOLDS')
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { tfs: Object.keys(TFS), sizes_atr: SIZES, buffer_atr: BUF, expire_bars: EXPIRE, horizon_min: HZ, z: Z }, results, verdict: any ? 'SOME_FVG_HOLDS' : 'FVG_DOES_NOT_HOLD',
  max_oos_bounce: Math.max(...Object.values(results).map((r) => r.oos.bounce ?? 0)) }
fs.writeFileSync(path.join(TURBO.master, 'fvg_study.json'), JSON.stringify(out, null, 1))
console.log('\n=> FVG VERDICT: ' + out.verdict + ' · best OOS bounce share ' + out.max_oos_bounce + ' · wrote data/master/fvg_study.json')
