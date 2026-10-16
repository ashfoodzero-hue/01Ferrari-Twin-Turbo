// ════════════════════════════════════════════════════════════════════════════════
// study_fast_move_bounce.mjs — after a FAST move, does a limit at the nearest active 4H candle level (small stop, BE after +$6) pay? And with a
// DXY-turn confirmation? (2026-10-16, Ashraf after 4176 → 4154.60 → 4188). Pre-registered: docs/FAST_MOVE_BOUNCE_SPEC.md.
// Output: data/master/fast_move_bounce.json. Bars are bid; long fills at ask (= bid + spread), long exits at bid; shorts the mirror.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { emaSeries } from '../src/master/ferrariMatrix.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const H4 = 4 * 3600000, MIN = 60000, K = 4, ALPHA = 0.05 / K, BE_AT = 6, TP = 15, HOLD = 4 * 3600000, NEAR = 15, STOPS = [4, 8]
const spreadAt = makeSpreadAt()
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, LV = { highs: G4.map((b) => ({ knownT: b.t + H4, px: b.h })), lows: G4.map((b) => ({ knownT: b.t + H4, px: b.l })) }
// 5m ATR14 of the last closed 5m bar, per minute (same construction as study_c4h_levels.mjs)
const atr5 = new Float64Array(M.length); { let a = null, cur = null, prevC = null
  for (let i = 0; i < M.length; i++) { const b = M[i], k = Math.floor(b.t / 300000)
    if (!cur || cur.k !== k) { if (cur) { const tr = prevC == null ? cur.h - cur.l : Math.max(cur.h - cur.l, Math.abs(cur.h - prevC), Math.abs(cur.l - prevC)); a = a == null ? tr : (a * 13 + tr) / 14; prevC = cur.c } cur = { k, h: b.h, l: b.l, c: b.c } }
    else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c } atr5[i] = a ?? 0 } }
// DXY 3m + EMA10, gold 3m closes (closed bars, keyed by 3m open time)
const D3 = (await loadDxyBars('3m', { from: FROM - 5 * 86400000, to: TO + 86400000 })).bars, dE = emaSeries(D3, 10), dBy = new Map(D3.map((b) => [b.t, b]))
const DXY_FROM = D3.length ? D3[0].t + 86400000 : Infinity
const g3c = new Map(); for (const b of M) g3c.set(Math.floor(b.t / 180000) * 180000, b.c)   // last 1m close inside each 3m bar = its close

/** Simulate from bar fi (the fill bar). side +1 long / −1 short. entry = fill price (ask for long, bid for short). */
function sim(fi, side, entry, stop) { const t0 = M[fi].t; let st = stop, be = false, j = fi
  for (; j < M.length && M[j].t <= t0 + HOLD; j++) { const b = M[j], sp = spreadAt(b.t)
    // exit prices: long exits at bid (bar values); short exits at ask (bar + sp)
    const lo = side > 0 ? b.l : b.l + sp, hi = side > 0 ? b.h : b.h + sp
    if (side > 0 ? lo <= st : hi >= st) return { net: side * (st - entry), out: be ? 'BE' : 'SL', mins: (b.t - t0) / MIN }
    if (j === fi) continue   // fill bar: only the stop is checked (order inside the bar unknown)
    if (side > 0 ? hi >= entry + TP : lo <= entry - TP) return { net: TP, out: 'TP', mins: (b.t - t0) / MIN }
    if (!be && (side > 0 ? hi >= entry + BE_AT : lo <= entry - BE_AT)) { be = true; st = entry } }
  const last = M[Math.max(fi, j - 1)]
  const px = side > 0 ? last.c : last.c + spreadAt(last.t); return { net: side * (px - entry), out: 'TIME', mins: HOLD / MIN } }

// ── events ──
const events = [], controls = [], act = { ceiling: [], floor: [] }, touched = new Map(); let hi = 0, lo = 0, lastEv = { 1: -Infinity, '-1': -Infinity }
const dqH = [], dqL = []   // monotonic deques of indices: rolling 60-min max high / min low
const fastAt = { 1: -Infinity, '-1': -Infinity }   // last minute a fast-drop (1) / fast-rally (−1) condition was true
for (let i = 1; i < M.length; i++) { const b = M[i]; if (b.t > TO) break
  while (hi < LV.highs.length && LV.highs[hi].knownT <= b.t) act.ceiling.push(LV.highs[hi++].px)
  while (lo < LV.lows.length && LV.lows[lo].knownT <= b.t) act.floor.push(LV.lows[lo++].px)
  while (dqH.length && M[dqH.at(-1)].h <= b.h) dqH.pop(); dqH.push(i); while (M[dqH[0]].t <= b.t - 60 * MIN) dqH.shift()
  while (dqL.length && M[dqL.at(-1)].l >= b.l) dqL.pop(); dqL.push(i); while (M[dqL[0]].t <= b.t - 60 * MIN) dqL.shift()
  const a = atr5[i], thr = Math.max(15, 3 * a)
  if (b.t >= FROM && a > 0) {
    for (const side of [1, -1]) { const ext = side > 0 ? M[dqH[0]].h : M[dqL[0]].l, move = side > 0 ? ext - b.c : b.c - ext
      if (move < thr) continue
      fastAt[side] = b.t
      if (b.t - lastEv[side] < 2 * 3600000) continue
      lastEv[side] = b.t
      // level: nearest active floor below (long) / ceiling above (short) within $15, untouched since the 60-min window began
      const winLo = Math.min(...M.slice(Math.max(0, i - 60), i + 1).filter((x) => x.t > b.t - 60 * MIN).map((x) => x.l)), winHi = Math.max(...M.slice(Math.max(0, i - 60), i + 1).filter((x) => x.t > b.t - 60 * MIN).map((x) => x.h))
      const cand = side > 0 ? act.floor.filter((px) => px < winLo && b.c - px <= NEAR) : act.ceiling.filter((px) => px > winHi && px - b.c <= NEAR)
      const lvl = cand.length ? (side > 0 ? Math.max(...cand) : Math.min(...cand)) : null
      events.push({ t: b.t, i, side, move: +move.toFixed(2), thr: +thr.toFixed(2), lvl, ext }) } }
  // C-TOUCH: first touch of an active level (2 h per level) with no fast move toward it in the prior 60 min
  if (b.t >= FROM) for (const [type, side, arr] of [['floor', 1, act.floor], ['ceiling', -1, act.ceiling]]) for (const px of arr) {
    if (!(type === 'floor' ? b.l <= px - spreadAt(b.t) : b.h >= px)) continue   // same fill rule as arm L (long fills at ask ≤ level)
    const key = type + px; if (b.t - (touched.get(key) ?? -Infinity) > 2 * 3600000 && b.t - fastAt[side] > 60 * MIN) controls.push({ t: b.t, i, side, lvl: px })
    touched.set(key, b.t) }
  act.ceiling = act.ceiling.filter((px) => !(b.c > px)); act.floor = act.floor.filter((px) => !(b.c < px)) }

// ── trades ──
const trades = { L4: [], L8: [], D4: [], D8: [] }, ctrl = { 4: [], 8: [] }, rnd = { 4: [], 8: [] }, rescue = []
for (const e of events) { if (e.lvl == null) continue; const s = e.side
  // L: limit at the level, valid 60 min. Long fills when ask ≤ level ⇔ bid low ≤ level − spread; short fills when bid high ≥ level.
  let fi = null; for (let j = e.i + 1; j < M.length && M[j].t <= e.t + 60 * MIN; j++) { const sp = spreadAt(M[j].t); if (s > 0 ? M[j].l <= e.lvl - sp : M[j].h >= e.lvl) { fi = j; break } }
  if (fi != null) { for (const S of STOPS) trades['L' + S].push({ t: e.t, side: s, ...sim(fi, s, e.lvl, e.lvl - s * S) })
    // rescue: does price come back to a first entry $20 beyond the level (in the trade's favour) within 4 h after the fill?
    let back = false; for (let j = fi + 1; j < M.length && M[j].t <= M[fi].t + HOLD; j++) if (s > 0 ? M[j].h >= e.lvl + 20 : M[j].l <= e.lvl - 20) { back = true; break }
    rescue.push({ t: e.t, back }) }
  // D: touch within $2 (60 min) → within 30 min a closed 3m bar with DXY back across its EMA10 AND gold back across the level → next 1m open
  if (e.t >= DXY_FROM) { let ti = null; for (let j = e.i + 1; j < M.length && M[j].t <= e.t + 60 * MIN; j++) if (s > 0 ? M[j].l <= e.lvl + 2 : M[j].h >= e.lvl - 2) { ti = j; break }
    if (ti != null) { const k0 = Math.floor(M[ti].t / 180000) * 180000
      for (let k = k0; k <= M[ti].t + 30 * MIN; k += 180000) { const d = dBy.get(k), em = dE.get(k), gc = g3c.get(k); if (!d || em == null || gc == null) continue
        if (s > 0 ? d.c < em && gc > e.lvl : d.c > em && gc < e.lvl) { let fj = ti; while (fj < M.length && M[fj].t < k + 180000) fj++; if (fj >= M.length) break
          const sp = spreadAt(M[fj].t), entry = s > 0 ? M[fj].o + sp : M[fj].o
          for (const S of STOPS) { const stop = e.lvl - s * S; if (s > 0 ? entry > stop : entry < stop) trades['D' + S].push({ t: e.t, side: s, ...sim(fj, s, entry, stop) }) }
          break } } } } }
for (const c of controls) for (const S of STOPS) ctrl[S].push({ t: c.t, side: c.side, ...sim(c.i, c.side, c.lvl, c.lvl - c.side * S) })
// C-RANDOM: one per event with a level — a random minute in the same split, same UTC hour, market entry at the next open, stop ∓S from entry
let seed = 1601; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const byHour = [0, 1].map(() => Array.from({ length: 24 }, () => [])); for (let i = 0; i < M.length - 1; i++) { const t = M[i].t; if (t >= FROM && t <= TO - HOLD) byHour[t < SPLIT ? 0 : 1][new Date(t).getUTCHours()].push(i) }
for (const e of events) { if (e.lvl == null) continue; const pool = byHour[e.t < SPLIT ? 0 : 1][new Date(e.t).getUTCHours()]; if (pool.length < 2) continue
  const i = pool[(rand() * pool.length) | 0], fj = i + 1, sp = spreadAt(M[fj].t), entry = e.side > 0 ? M[fj].o + sp : M[fj].o
  for (const S of STOPS) rnd[S].push({ t: e.t, side: e.side, ...sim(fj, e.side, entry, entry - e.side * S) }) }

// ── statistics ──
const wk = (t) => Math.floor((t + 4 * 86400000) / (7 * 86400000))
const st = (xs) => { const n = xs.length, w = xs.filter((x) => x.net > 0).length; return { n, wr: n ? +(w / n).toFixed(4) : null, net: n ? +(xs.reduce((a, x) => a + x.net, 0) / n).toFixed(3) : null,
  out: Object.fromEntries(['TP', 'BE', 'SL', 'TIME'].map((o) => [o, xs.filter((x) => x.out === o).length])) } }
const blocks = (xs) => { const g = new Map(); for (const x of xs) { const k = wk(x.t); if (!g.has(k)) g.set(k, []); g.get(k).push(x.net) } return [...g.values()] }
let bs = 7; const r2 = () => { bs = (bs * 1664525 + 1013904223) >>> 0; return bs / 4294967296 }
const bootMean = (bl) => { const s = []; let sum = 0, n = 0; for (let k = 0; k < bl.length; k++) { const b = bl[(r2() * bl.length) | 0]; for (const v of b) { sum += v; n++ } } return n ? sum / n : 0 }
const lb = (xs, ys = null) => { if (xs.length < 10) return null; const bx = blocks(xs), by = ys && blocks(ys), v = []
  for (let r = 0; r < 3000; r++) v.push(bootMean(bx) - (by ? bootMean(by) : 0)); v.sort((a, b) => a - b); return +v[Math.floor(ALPHA * v.length)].toFixed(3) }
const res = { at: new Date().toISOString(), spec: 'docs/FAST_MOVE_BOUNCE_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(), dxy_from: new Date(DXY_FROM).toISOString(),
  events: { drop: events.filter((e) => e.side > 0).length, rally: events.filter((e) => e.side < 0).length, with_level: { drop: events.filter((e) => e.side > 0 && e.lvl != null).length, rally: events.filter((e) => e.side < 0 && e.lvl != null).length } }, cells: {} }
for (const side of [1, -1]) { const name = side > 0 ? 'LONG after FAST DROP' : 'SHORT after FAST RALLY'; res.cells[name] = {}
  for (const [cell, xs0] of Object.entries(trades)) { const S = +cell.slice(1), xs = xs0.filter((x) => x.side === side), O = xs.filter((x) => x.t >= SPLIT), T = xs.filter((x) => x.t < SPLIT)
    const cO = ctrl[S].filter((x) => x.side === side && x.t >= SPLIT), rO = rnd[S].filter((x) => x.side === side && x.t >= SPLIT)
    const r = { oos: st(O), train: st(T), oos_lb: lb(O), control_touch_oos: st(cO), vs_touch_lb: lb(O, cO), random_oos: st(rO), vs_random_lb: lb(O, rO) }
    r.verdict = r.oos.n >= 100 && r.oos.net > 0 && r.oos_lb > 0 && r.vs_touch_lb > 0 && r.train.net > 0 ? 'PASS' : 'FAIL'
    res.cells[name][cell] = r
    console.log(`${name.padEnd(24)} ${cell}: OOS n ${r.oos.n} WR ${r.oos.wr} net ${r.oos.net} LB ${r.oos_lb} ${JSON.stringify(r.oos.out)} · TRAIN n ${r.train.n} net ${r.train.net} WR ${r.train.wr} · touch-ctrl ${r.control_touch_oos.net} (n ${r.control_touch_oos.n}) diff LB ${r.vs_touch_lb} · random ${r.random_oos.net} → ${r.verdict}`) } }
const rs = (xs) => ({ n: xs.length, back_20: xs.length ? +(xs.filter((x) => x.back).length / xs.length).toFixed(4) : null })
res.rescue = { definition: 'after an L fill, price returns $20 beyond the level (a first entry placed $20 earlier) within 4 h', oos: rs(rescue.filter((x) => x.t >= SPLIT)), train: rs(rescue.filter((x) => x.t < SPLIT)) }
console.log('events', JSON.stringify(res.events), '· rescue', JSON.stringify(res.rescue), '· spread stats', JSON.stringify(spreadAt.stats))
fs.writeFileSync(path.join(TURBO.master, 'fast_move_bounce.json'), JSON.stringify(res, null, 1))
// per-trade rows for the DXY addendum (study_fast_move_bounce_dxy.mjs): event time, side, cell, net, outcome
fs.writeFileSync(path.join(TURBO.master, 'fast_move_bounce_rows.json'), JSON.stringify(Object.entries(trades).flatMap(([cell, xs]) => xs.map((x) => ({ cell, t: x.t, side: x.side, net: +x.net.toFixed(3), out: x.out })))))
