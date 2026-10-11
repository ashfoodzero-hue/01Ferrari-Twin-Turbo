// ════════════════════════════════════════════════════════════════════════════════
// study_break_continue.mjs — BREAK-AND-CONTINUE on low timeframes (2026-10-09; Ashraf: "run the break and continue test").
// Origin: in 4 independent tests (FVG, Fib, EMA, day H/L) levels on 5m / 3m were RUN THROUGH more often than random levels. This tests
// whether that is TRADEABLE.
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot 1m BID, 2013-07-21 → TURBO_VAL_TO, FROZEN TAPE. tf ∈ {3m, 5m}.
//   LEVEL TOUCHES (the exact event definitions of the earlier studies):
//     FIB  — first touch of each of the 7 Fib/inverse-Fib prices while the swing state is in force (study_fib_levels.mjs)
//     EMA  — EMA 20/50/200 touched from the side a CLEAR bar closed on, one per approach (study_ema_levels.mjs)
//     FVG  — first retest (≤ 100 bars) of every FVG ≥ 0.1·ATR (study_fvg.mjs ALL); the level that must break = the zone's FAR edge
//   TRADE (the break): support touched (approached from above) → SELL STOP at level − 0.1·ATR; resistance → BUY STOP at level + 0.1·ATR;
//     valid 10 tf-bars from the touch; stop = entry ∓ D back through the level, target = entry ± D onward (1:1), D ∈ {0.25, 0.5, 1.0}·ATR14(tf);
//     horizon 24 h; bounceTest.stopEntryTrade (sell at the bid / buy at the ask, measured spread, slippage min(0.30, 0.05·ATR))
//   CONTROL: the identical order built at the close of a random 1m bar within ±2 weeks, same direction, same D and window
//   cells = 2 tf × 3 sources × 3 D = 18; TRADEABLE ⇔ OOS fills ≥ 100 AND OOS mean $/trade one-sided bootstrap bound (α 0.05/18) > 0 AND
//     OOS mean > control OOS mean AND TRAIN mean > 0.  Split TRAIN 60 % / OOS 40 %.
// Output: data/master/break_continue_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded, stopEntryTrade } from '../src/master/bounceTest.js'
import { swingStates, fibPrice, FIB_POS } from '../src/master/fibLevels.js'
import { emaStack, EMA_N } from '../src/master/emaLevels.js'
import { fvgAt } from '../src/master/fvg.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const DS = [0.25, 0.5, 1.0], BUF = 0.1, FILLBARS = 10, HZ = 86400000, CELLS = 18, MIN_N = 100, Q = 0.05 / CELLS
const spreadAt = makeSpreadAt(), rnd = seeded(31337)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const firstTouch = (k0, tEnd, support, px) => { for (let k = k0; k < M.length && M[k].t < tEnd; k++) { if (support ? M[k].l <= px : M[k].h >= px) return k } return -1 }
console.log(`1m bars ${M.length.toLocaleString()}`)

function touches(tf) {
  const ms = RESAMPLE_TF_MS[tf], out = { FIB: [], EMA: [], FVG: [] }
  return loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO }).then(({ bars: B }) => {
    const A = atrArr(B, 14)
    // FIB
    const states = swingStates(B, (i) => B[i].t + ms)
    for (let q = 0; q < states.length; q++) { const s = states[q], a = A[s.fromI]; if (!(a > 0) || s.knownT < FROM || s.knownT > TO) continue
      const until = Math.min(q + 1 < states.length ? states[q + 1].knownT : Infinity, s.knownT + 100 * ms, TO), k0 = lb(s.knownT); if (k0 >= M.length || M[k0].t >= until) continue
      for (const { p } of FIB_POS) { const px = fibPrice(s, p), support = M[k0].o > px, k = firstTouch(k0, until, support, px); if (k >= 0) out.FIB.push({ k, level: px, support, a }) } }
    // EMA
    const { E } = emaStack(B)
    for (const n of EMA_N) { const e = E[n]; let fired = null
      for (let i = 0; i + 1 < B.length; i++) { const lvl = e[i], a = A[i]; if (!Number.isFinite(lvl) || !(a > 0)) { fired = null; continue }
        const side = B[i].l > lvl ? 'above' : B[i].h < lvl ? 'below' : null
        if (!side || side !== fired) fired = side === fired ? fired : null
        if (!side || fired) continue
        const t0 = B[i].t + ms, t1 = Math.min(B[i + 1].t + ms, TO); if (t0 < FROM || t0 >= TO) continue
        const k = firstTouch(lb(t0), t1, side === 'above', lvl); if (k < 0) continue
        fired = side; out.EMA.push({ k, level: lvl, support: side === 'above', a }) } }
    // FVG (ALL ≥ 0.1·ATR): the far edge must break
    for (let i = 22; i < B.length; i++) { if (B[i].t < FROM) continue
      const F = fvgAt(B, A, i, B[i].t + ms, null); if (!F || F.size < 0.1 * F.atr) continue
      const known = B[i].t + ms, near = F.up ? F.top : F.bot, k = firstTouch(lb(known), known + 100 * ms, F.up, near); if (k < 0) continue
      out.FVG.push({ k, level: F.up ? F.bot : F.top, support: F.up, a: F.atr }) }
    return { out, ms }
  })
}
function trade(k, level, support, a, D, ms) {
  const up = !support, entry = up ? level + BUF * a : level - BUF * a, stop = up ? entry - D * a : entry + D * a, tgt = up ? entry + D * a : entry - D * a
  const tEnd = M[k].t + HZ; if (tEnd > TO) return null
  return stopEntryTrade(M, k, up, entry, stop, tgt, spreadAt, Math.min(0.3, 0.05 * a), M[k].t + FILLBARS * ms, tEnd)
}
const summ = (xs) => { const v = xs.filter((x) => x != null), n = v.length, mean = n ? v.reduce((s, x) => s + x, 0) / n : null, b = []
  for (let i = 0; i < 1500 && n; i++) { let s = 0; for (let j = 0; j < n; j++) s += v[(rnd() * n) | 0]; b.push(s / n) }; b.sort((x, y) => x - y)
  return { n, wr: n ? +(v.filter((x) => x > 0).length / n).toFixed(4) : null, net: mean == null ? null : +mean.toFixed(4), net_lb: n ? +b[Math.floor(Q * b.length)].toFixed(4) : null } }

const cells = {}
for (const tf of ['3m', '5m']) {
  const { out, ms } = await touches(tf)
  for (const [src, evs] of Object.entries(out)) {
    for (const D of DS) {
      const G = { TRAIN: [], OOS: [] }, C = { TRAIN: [], OOS: [] }
      for (const e of evs) { const part = M[e.k].t < SPLIT ? 'TRAIN' : 'OOS'
        G[part].push(trade(e.k, e.level, e.support, e.a, D, ms))
        const kc = Math.min(M.length - 2, Math.max(0, e.k + Math.round((rnd() * 2 - 1) * 14400))); C[part].push(trade(kc, M[kc].c, e.support, e.a, D, ms)) }
      const r = { tf, src, D, touches: evs.length, train: summ(G.TRAIN), oos: summ(G.OOS), control_oos: summ(C.OOS), control_train: summ(C.TRAIN) }
      r.verdict = r.oos.n >= MIN_N && r.oos.net_lb > 0 && r.oos.net > r.control_oos.net && r.train.net > 0 ? 'TRADEABLE' : 'NOT_TRADEABLE'
      cells[`${tf}|${src}|${D}`] = r
      console.log(`${tf} ${src.padEnd(3)} D${D}: OOS fills ${r.oos.n} WR ${r.oos.wr} $/t ${r.oos.net} [LB ${r.oos.net_lb}] vs control ${r.control_oos.net} (WR ${r.control_oos.wr}) · TRAIN $/t ${r.train.net} → ${r.verdict}`)
    }
  }
}
const ok = Object.values(cells).filter((c) => c.verdict === 'TRADEABLE').map((c) => `${c.tf} ${c.src} D${c.D}`)
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { tfs: ['3m', '5m'], sources: ['FIB', 'EMA', 'FVG'], d_atr: DS, buffer_atr: BUF, fill_bars: FILLBARS, alpha: Q }, cells, tradeable: ok, verdict: ok.length ? 'BREAK_CONTINUE_TRADEABLE' : 'BREAK_CONTINUE_NOT_TRADEABLE' }
fs.writeFileSync(path.join(TURBO.master, 'break_continue_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> BREAK & CONTINUE: ${out.verdict}${ok.length ? ' (' + ok.join(', ') + ')' : ''}`)
