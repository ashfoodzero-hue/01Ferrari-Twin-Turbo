// ════════════════════════════════════════════════════════════════════════════════
// study_gann_time_direction.mjs — can the REAL Gann time effect be TRADED? (2026-10-09; Ashraf: "Gann time + direction test")
// ────────────────────────────────────────────────────────────────────────────────
// Context: diagnose_gann_time.mjs measured that a swing high OR low arrives near swingEnd + f·(own duration) more often than a
// shuffled-duration null, in exactly 3 cells on both halves: 1h ½×, 1h 1×, 4h ½×. It says WHEN, not WHICH WAY. This test adds a direction.
// PRE-REGISTERED (before the first run). XAU spot 1m BID, FROZEN TAPE, 2013-07-21 → TURBO_VAL_TO. Swing states: fibLevels.swingStates.
//   window   = t* ± 3 bars, t* = swingEnd + f·duration; act at the window START T0 = t* − 3 bars (must be ≥ when the swing became known)
//   direction = REVERSE the move since the swing end: price at T0 below the swing-end price → BUY (the expected turn is a low);
//               above it → SELL
//   stop     = beyond the extreme since the swing end (BUY: the lowest low from swingEnd to T0) ± 0.5·ATR14(tf); target = 1 R (1:1);
//              horizon 10 bars; MARKET entry at T0 (a BUY pays the ask) — bounceTest.limitTrade; measured spread; stop slippage
//   CONTROL  = the identical rule at shuffled-duration windows (swingEnd + f·duration of ANOTHER swing state — elapsed-time matched)
//   cells    = 1h ½× · 1h 1× · 4h ½×.  TRADEABLE ⇔ OOS mean $/trade one-sided bootstrap bound (α 0.05/3) > 0 AND OOS mean > control
//              OOS mean AND TRAIN mean $/trade > 0.  Win rate and R reported.
// Output: data/master/gann_time_direction.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded, limitTrade } from '../src/master/bounceTest.js'
import { swingStates } from '../src/master/fibLevels.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const CELLS = [['1h', 0.5], ['1h', 1], ['4h', 0.5]], WIN = 3, HZB = 10, STOP_ATR = 0.5, Q = 0.05 / 3
const spreadAt = makeSpreadAt(), rnd = seeded(13131313)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }

function trade(s, dur, f, A, B, ms) {
  const endT = Math.max(s.hT, s.lT), endPx = s.hT > s.lT ? s.H : s.L, tStar = endT + f * dur, T0 = tStar - WIN * ms
  if (T0 < s.knownT || T0 < FROM) return null
  const hz = HZB * ms, tEnd = T0 + hz; if (tEnd > TO) return null
  const k0 = lb(T0); if (k0 >= M.length || M[k0].t >= T0 + ms) return null
  const kE = lb(endT); let lo = Infinity, hi = -Infinity; for (let k = kE; k < k0; k++) { if (M[k].l < lo) lo = M[k].l; if (M[k].h > hi) hi = M[k].h }
  if (!Number.isFinite(lo)) return null
  let bi = 0, bh = B.length; while (bi < bh) { const m = (bi + bh) >> 1; if (B[m].t + ms <= T0) bi = m + 1; else bh = m }
  const a = bi ? A[bi - 1] : null; if (!(a > 0)) return null
  const px = M[k0].o, up = px < endPx, entry = up ? px + spreadAt(M[k0].t) : px
  const stop = up ? lo - STOP_ATR * a : hi + STOP_ATR * a, R = Math.abs(entry - stop); if (!(R > 0)) return null
  const tgt = up ? entry + R : entry - R
  const net = limitTrade(M, k0, up, entry, stop, tgt, spreadAt, Math.min(0.3, 0.05 * a), tEnd); if (net == null) return null
  return { t: T0, part: T0 < SPLIT ? 'TRAIN' : 'OOS', up, net, R: net / R }
}
const summ = (E) => { const n = E.length, mean = n ? E.reduce((s, e) => s + e.net, 0) / n : null, boots = []
  for (let b = 0; b < 3000 && n; b++) { let s = 0; for (let j = 0; j < n; j++) s += E[(rnd() * n) | 0].net; boots.push(s / n) }; boots.sort((x, y) => x - y)
  return { n, wr: n ? +(E.filter((e) => e.net > 0).length / n).toFixed(4) : null, net: mean == null ? null : +mean.toFixed(4), net_lb: n ? +boots[Math.floor(Q * boots.length)].toFixed(4) : null, avg_R: n ? +(E.reduce((s, e) => s + e.R, 0) / n).toFixed(4) : null } }

const cells = {}
for (const [tf, f] of CELLS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, A = atrArr(B, 14)
  const states = swingStates(B, (i) => B[i].t + ms).filter((s) => s.knownT >= FROM && s.knownT <= TO && Math.abs(s.hT - s.lT) > 0)
  const durs = states.map((s) => Math.abs(s.hT - s.lT)), perm = durs.map((d) => [rnd(), d]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
  const G = [], C = []
  states.forEach((s, q) => { const g = trade(s, durs[q], f, A, B, ms); if (g) G.push(g); const c = trade(s, perm[q], f, A, B, ms); if (c) C.push(c) })
  const r = { gann: { train: summ(G.filter((e) => e.part === 'TRAIN')), oos: summ(G.filter((e) => e.part === 'OOS')) }, control: { train: summ(C.filter((e) => e.part === 'TRAIN')), oos: summ(C.filter((e) => e.part === 'OOS')) } }
  r.verdict = r.gann.oos.net_lb > 0 && r.gann.oos.net > r.control.oos.net && r.gann.train.net > 0 ? 'TRADEABLE' : 'NOT_TRADEABLE'
  cells[`${tf} ${f}×`] = r
  console.log(`${tf} ${f}×: GANN OOS n ${r.gann.oos.n} WR ${r.gann.oos.wr} $/t ${r.gann.oos.net} (LB ${r.gann.oos.net_lb}, ${r.gann.oos.avg_R} R) · TRAIN $/t ${r.gann.train.net} | CONTROL OOS $/t ${r.control.oos.net} WR ${r.control.oos.wr} → ${r.verdict}`)
}
const ok = Object.entries(cells).filter(([, r]) => r.verdict === 'TRADEABLE').map(([k]) => k)
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), rules: { cells: CELLS, window_bars: WIN, stop_atr: STOP_ATR, rr: 1, horizon_bars: HZB, alpha: Q }, cells,
  verdict: ok.length ? 'GANN_TIME_TRADEABLE' : 'GANN_TIME_NOT_TRADEABLE', tradeable: ok }
fs.writeFileSync(path.join(TURBO.master, 'gann_time_direction.json'), JSON.stringify(out, null, 1))
console.log(`\n=> GANN TIME + DIRECTION: ${out.verdict}${ok.length ? ' (' + ok.join(', ') + ')' : ''}`)
