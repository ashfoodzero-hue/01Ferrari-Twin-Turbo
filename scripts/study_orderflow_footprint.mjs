// ════════════════════════════════════════════════════════════════════════════════
// study_orderflow_footprint.mjs — Trader Dale's five ORDER-FLOW confirmations at S/R levels, on REAL CME gold footprints (2026-10-11).
// Rules: docs/ORDERFLOW_FOOTPRINT_SPEC.md (Part 2, pre-registered before any result). Data: build_footprints.mjs (Databento tbbo, TEST-ONLY).
// ────────────────────────────────────────────────────────────────────────────────
//   levels  L-VP: previous UTC day's POC / VAH / VAL from the footprint volume (real futures volume at price, 70 % value area from the POC)
//           L-HL: previous UTC day's high / low (a day needs ≥ 600 one-minute bars to count as a "previous day")
//   touch   the FIRST 5m footprint of day D whose range reaches the level; support if that footprint opened above the level, else resistance
//   HEAVY   cell volume ≥ 3 × median non-zero cell volume of the previous 100 footprints AND ≥ 20 contracts
//   IMBAL.  buy: ask(p) ≥ 3 × bid(p − 1 tick) and ask(p) ≥ 10 · sell: bid(p) ≥ 3 × ask(p + 1 tick) and bid(p) ≥ 10
//   zone    within 0.5 × ATR14(5m) of the level
//   C1 ABSORPTION   a zone price with HEAVY bid AND HEAVY ask in F (touch) or F+1
//   C2 BIG LIMIT    short: HEAVY ask in the top 2 ticks of F or F+1 · long: HEAVY bid in the bottom 2 ticks
//   C3 TRAPPED      short: F closes up with ≥ 2 buy imbalances in its top third, F+1 closes below F's open (mirror for long)
//   C4 AGGRESSIVE   short: HEAVY bid in F+1 and F+1 closes down · long: HEAVY ask in F+1 and F+1 closes up
//   C5 DELTA        short: delta flips + → − at F (vs F−1) or at F+1 (vs F) · long: − → +
//   DECISION at the close of F (C1, C2, C5 known) and of F+1 (all five); ENTRY at the close of the first footprint where the signal is met.
//   signals: each Ck alone · COUNT ≥ 1 · ≥ 2 · ≥ 3.  TRADE: entry = that close; stop = level ∓ 0.5·ATR beyond the level; target 1 R or 2 R;
//   8 h horizon on GC 1m bars, stop first inside a minute; COST = the measured SPOT spread at entry + slippage min(0.30, 0.05·ATR) on a stop.
//   CONTROLS: (a) the same first touches with COUNT = 0 (entry at the close of F+1) · (b) a random 5m close within ±2 weeks, same side and R.
//   PASS ⇔ OOS n ≥ 100 AND OOS mean $/trade bootstrap bound (one-sided α 0.05/32) > 0 AND TRAIN mean > 0 AND OOS mean > control (a) OOS mean.
//   32 cells = {L-VP, L-HL} × 8 signals × {1 R, 2 R}. Split TRAIN 60 % / OOS 40 % by time.
//   --inferred : identical, but bid/ask volumes from the INFERRED side (what Massive Advanced would allow live) instead of the exchange flag.
//   --tf=15m|30m|1h|4h (2026-10-11, Ashraf: "make it on 5m, 15m, 30m, 1H, 4H"): the SAME rules on footprints of that timeframe, built by summing
//     the 5m footprints exactly (a bucket whose 5m bars span two contracts is dropped); ATR / HEAVY baseline / zone / stop use that timeframe;
//     horizon = 96 bars of it (= 8 h on 5m); the random control ±2 weeks; α = 0.05/160 (5 timeframes × 32 cells). Without --tf the original
//     5m run is reproduced exactly (α 0.05/32).
//   --levels=new (2026-10-11, Ashraf: "1H S/R and daily H/L" + volume profile → "go"; pre-registered before its first run) replaces the two
//     families with:  L-SW1H: 1 h SWING levels — a 1 h bar (built from the GC 1m bars) whose high is the strict highest of the 2 bars before
//     and after it (low mirrored), all 5 bars in one contract, known at the close of the 2nd bar after it; for day D the 2 nearest UNBROKEN swing
//     highs and 2 nearest unbroken swing lows (pivot in the last 5 days, known before D 00:00, no later 1 h bar traded through it, same contract
//     as D's first footprint).  L-CONF: CONFLUENCE — the previous day's high / low only when a previous-day VP level (POC/VAH/VAL) lies within
//     0.5 × ATR14 (this timeframe, at D's start) of it; the level = that high / low.  α = 0.05/320 (both batches × 5 timeframes × 32 cells).
// Output: data/master/orderflow_footprint_study[_<tf>][_newlevels][_inferred].json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { TURBO } from '../src/core/paths.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { seeded } from '../src/master/bounceTest.js'
import { hourPivots, strongLevelsForDay } from '../src/master/strongLevels.js'

const INFERRED = process.argv.includes('--inferred'), DIR = path.join(TURBO.root, 'data', 'orderflow'), TICK = 0.1, DAY = 86400000
const TFARG = (process.argv.find((a) => a.startsWith('--tf=')) || '').slice(5) || null, TF_MS = { '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000 }
if (TFARG && !TF_MS[TFARG]) { console.error('unknown --tf ' + TFARG); process.exit(1) }
const M5 = TF_MS[TFARG || '5m']   // the footprint bar length (named M5 for the original 5m study)
const NEWLV = process.argv.includes('--levels=new'), STRLV = process.argv.includes('--levels=strong'), FAMS = STRLV ? ['L-STR2', 'L-STR3'] : NEWLV ? ['L-SW1H', 'L-CONF'] : ['L-VP', 'L-HL']   // --levels=strong: spec Part 4
const HEAVY_X = 3, HEAVY_MIN = 20, IMB_X = 3, IMB_MIN = 10, ZONE = 0.5, STOP = 0.5, HZ = 96 * M5, Q = STRLV ? 0.05 / 384 : NEWLV ? 0.05 / 320 : TFARG ? 0.05 / 160 : 0.05 / 32, MIN_N = 100
const spreadAt = makeSpreadAt(), rnd = seeded(20261011)
const readJsonl = async (f) => { const out = []; for await (const l of readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity })) if (l) out.push(JSON.parse(l)); return out }
const F5 = await readJsonl(path.join(DIR, 'gc_5m_footprints.jsonl')), M = await readJsonl(path.join(DIR, 'gc_1m.jsonl'))
// footprints of the requested timeframe = exact sums of the 5m footprints (cells merged by price); buckets spanning two contracts dropped
const F = M5 === 300000 ? F5 : (() => { const out = []; let cur = null, bad = false
  const close = () => { if (cur && !bad) out.push({ ...cur, cells: [...cur.cells.entries()].sort((a, b) => a[0] - b[0]).map(([p, x]) => [p, ...x]) }); cur = null; bad = false }
  for (const b of F5) { const k = Math.floor(b.t / M5) * M5
    if (cur && cur.t !== k) close()
    if (!cur) cur = { t: k, iid: b.iid, o: b.o, h: b.h, l: b.l, c: b.c, v: 0, delta: 0, n: 0, cells: new Map() }
    if (b.iid !== cur.iid) bad = true
    cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v; cur.delta += b.delta; cur.n += b.n
    for (const [p, x, y, xi, yi] of b.cells) { const c = cur.cells.get(p) || [0, 0, 0, 0]; c[0] += x; c[1] += y; c[2] += xi; c[3] += yi; cur.cells.set(p, c) } }
  close(); return out })()
const MT = Float64Array.from(M.map((b) => b.t)), lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const cellsOf = (b) => b.cells.map(([p, bid, ask, bi, ai]) => (INFERRED ? [p, bi, ai] : [p, bid, ask]))
const deltaOf = (b) => (INFERRED ? b.cells.reduce((s, c) => s + c[4] - c[3], 0) : b.delta)
console.log(`footprints ${F.length.toLocaleString()} · 1m bars ${M.length.toLocaleString()} · side source: ${INFERRED ? 'INFERRED (quote/tick rule)' : 'EXCHANGE aggressor flag'}`)

// ATR14 on 5m (Wilder) and the rolling HEAVY threshold (median of non-zero cell volumes over the previous 100 footprints, histogram-based)
const atr = new Float64Array(F.length); { let a = null; for (let i = 1; i < F.length; i++) { const tr = Math.max(F[i].h - F[i].l, Math.abs(F[i].h - F[i - 1].c), Math.abs(F[i].l - F[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = i >= 14 ? a : 0 } }
const heavy = new Float64Array(F.length); { const CAP = 5000, hist = new Int32Array(CAP + 1); let total = 0; const add = (i, s) => { for (const [, x, y] of cellsOf(F[i])) for (const v of [x, y]) if (v > 0) { hist[Math.min(CAP, v)] += s; total += s } }
  for (let i = 0; i < F.length; i++) { if (i >= 100) { let half = total / 2, acc = 0, med = 0; for (let v = 1; v <= CAP; v++) { acc += hist[v]; if (acc >= half) { med = v; break } } heavy[i] = Math.max(HEAVY_MIN, HEAVY_X * med); add(i - 100, -1) } else heavy[i] = Infinity; add(i, 1) } }

// daily stats + previous-day levels (UTC days; ≥ 600 one-minute bars)
const days = new Map(); for (const b of M) { const d = Math.floor(b.t / DAY) * DAY; const s = days.get(d) ?? { d, n: 0, h: -Infinity, l: Infinity }; s.n++; s.h = Math.max(s.h, b.h); s.l = Math.min(s.l, b.l); s.c = b.c; days.set(d, s) }
const vpOf = new Map(); for (const b of F) { const d = Math.floor(b.t / DAY) * DAY; let m = vpOf.get(d); if (!m) vpOf.set(d, (m = new Map())); for (const [p, x, y] of cellsOf(b)) m.set(p, (m.get(p) || 0) + x + y) }
const profile = (m) => { const keys = [...m.keys()].sort((a, b) => a - b), tot = keys.reduce((s, k) => s + m.get(k), 0); if (!tot) return null
  let poc = keys[0]; for (const k of keys) if (m.get(k) > m.get(poc)) poc = k
  let lo = keys.indexOf(poc), hi = lo, acc = m.get(poc); while (acc < 0.7 * tot && (lo > 0 || hi < keys.length - 1)) { const up = hi < keys.length - 1 ? m.get(keys[hi + 1]) : -1, dn = lo > 0 ? m.get(keys[lo - 1]) : -1; if (up >= dn) { hi++; acc += up } else { lo--; acc += dn } }
  return { poc: poc * TICK, vah: keys[hi] * TICK, val: keys[lo] * TICK } }
const dayList = [...days.values()].sort((a, b) => a.d - b.d), full = dayList.filter((s) => s.n >= 600)
const prevFull = (d) => { let r = null; for (const s of full) { if (s.d >= d) break; r = s } return r }
// 1 h bars from the GC 1m bars (one contract per bar; a mixed hour is dropped) and their swing pivots (L-SW1H, --levels=new)
const H1 = []; if (NEWLV || STRLV) { let cur = null, bad = false; const close = () => { if (cur && !bad) H1.push(cur); cur = null; bad = false }
  for (const b of M) { const k = Math.floor(b.t / 3600000) * 3600000; if (cur && cur.t !== k) close()
    if (!cur) cur = { t: k, iid: b.iid, h: b.h, l: b.l }; if (b.iid !== cur.iid) bad = true; cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l) } close() }
const PIV = []; for (let j = 2; j < H1.length - 2; j++) { const w = H1.slice(j - 2, j + 3); if (w.some((x) => x.iid !== H1[j].iid)) continue
  if (w.every((x, q) => q === 2 || x.h < H1[j].h)) PIV.push({ j, hi: true, p: H1[j].h, iid: H1[j].iid, known: H1[j + 2].t + 3600000 })
  if (w.every((x, q) => q === 2 || x.l > H1[j].l)) PIV.push({ j, hi: false, p: H1[j].l, iid: H1[j].iid, known: H1[j + 2].t + 3600000 }) }
// --levels=strong (spec Part 4): multi-touch 1h pivot clusters (src/master/strongLevels.js) on GC, same contract as day D; ATR14(1d) from the
// true ranges of the full GC days before D
const SPIV = STRLV ? hourPivots(H1, (j0, j1) => H1.slice(j0, j1 + 1).every((x) => x.iid === H1[j0].iid)).map((p, k) => ({ ...p, iid: H1.find((x) => x.t === p.t).iid })) : []
function gcAtr1d(d) { const prev = full.filter((x) => x.d < d).slice(-15); if (prev.length < 15) return null; let s = 0; for (let k = 1; k < 15; k++) s += Math.max(prev[k].h - prev[k].l, Math.abs(prev[k].h - prev[k - 1].c), Math.abs(prev[k].l - prev[k - 1].c)); return s / 14 }
function strongFams(d, iid) { const L = strongLevelsForDay(SPIV, d, gcAtr1d(d), (p) => p.iid === iid); return { 'L-STR2': L.filter((x) => x.touches >= 2).map((x) => x.price), 'L-STR3': L.filter((x) => x.touches >= 3).map((x) => x.price) } }
function swingLevels(d, iid) {
  const unbroken = (v) => { for (let q = v.j + 1; q < H1.length && H1[q].t < d; q++) if (v.hi ? H1[q].h >= v.p : H1[q].l <= v.p) return false; return true }
  const live = PIV.filter((v) => v.iid === iid && v.known <= d && H1[v.j].t >= d - 5 * DAY && unbroken(v))
  const his = live.filter((v) => v.hi).sort((a, b) => a.p - b.p).slice(0, 2), los = live.filter((v) => !v.hi).sort((a, b) => b.p - a.p).slice(0, 2)
  return [...his, ...los].map((v) => v.p) }

// confirmations for a touch at footprint index i (F = i, F+1 = i + 1)
function confirm(i, level, short) {
  const a = atr[i], f0 = F[i], f1 = F[i + 1], fm = F[i - 1]; if (!f1 || !fm || f1.t - f0.t !== M5) return null
  const H0 = heavy[i], H1 = heavy[i + 1], inZone = (p) => Math.abs(p * TICK - level) <= ZONE * a
  const c0 = cellsOf(f0), c1 = cellsOf(f1), map = (cs) => new Map(cs.map(([p, x, y]) => [p, [x, y]]))
  const absorb = (cs, H) => cs.some(([p, x, y]) => inZone(p) && x >= H && y >= H)
  const bigLim = (cs, H, b) => { const top = Math.round(b.h / TICK), bot = Math.round(b.l / TICK); return cs.some(([p, x, y]) => short ? p >= top - 1 && y >= H : p <= bot + 1 && x >= H) }
  const imbs = (cs, b, buy) => { const m = map(cs), third = (b.h - b.l) / 3; let n = 0; for (const [p, x, y] of cs) { const px = p * TICK
      if (buy && px >= b.h - third) { const below = m.get(p - 1)?.[0] ?? 0; if (y >= IMB_MIN && y >= IMB_X * below) n++ }
      if (!buy && px <= b.l + third) { const above = m.get(p + 1)?.[1] ?? 0; if (x >= IMB_MIN && x >= IMB_X * above) n++ } } return n }
  const d = (b) => deltaOf(b)
  const C1F = absorb(c0, H0), C1 = C1F || absorb(c1, H1)
  const C2F = bigLim(c0, H0, f0), C2 = C2F || bigLim(c1, H1, f1)
  const C3 = short ? f0.c > f0.o && imbs(c0, f0, true) >= 2 && f1.c < f0.o : f0.c < f0.o && imbs(c0, f0, false) >= 2 && f1.c > f0.o
  const C4 = short ? c1.some(([, x]) => x >= H1) && f1.c < f1.o : c1.some(([, , y]) => y >= H1) && f1.c > f1.o
  const flip = (p, c) => (short ? d(p) > 0 && d(c) < 0 : d(p) < 0 && d(c) > 0), C5F = flip(fm, f0), C5 = C5F || flip(f0, f1)
  return { atF: { C1: C1F, C2: C2F, C5: C5F, count: [C1F, C2F, C5F].filter(Boolean).length }, atF1: { C1, C2, C3, C4, C5, count: [C1, C2, C3, C4, C5].filter(Boolean).length } }
}
function trade(i, entryIdx, level, short, TM) {
  const a = atr[i], e = F[entryIdx], entry = e.c, stop = short ? level + STOP * a : level - STOP * a, R = short ? stop - entry : entry - stop
  if (!(R > 0)) return null
  const tgt = short ? entry - TM * R : entry + TM * R, t0 = e.t + M5, cost = spreadAt(t0), slip = Math.min(0.3, 0.05 * a)
  for (let k = lb(MT, t0); k < M.length && M[k].t < t0 + HZ; k++) { const b = M[k]; if (b.iid !== e.iid) return null   // never across a contract roll
    if (short ? b.h >= stop : b.l <= stop) return -(R + slip) - cost
    if (short ? b.l <= tgt : b.h >= tgt) return TM * R - cost }
  const k = Math.min(lb(MT, t0 + HZ), M.length) - 1; if (k < 0 || M[k].iid !== e.iid) return null
  return (short ? entry - M[k].c : M[k].c - entry) - cost
}
// collect first touches
const FT = Float64Array.from(F.map((b) => b.t)), events = []
for (const s of full) {
  const d = s.d, P = prevFull(d); if (!P) continue
  const vp = vpOf.get(P.d) ? profile(vpOf.get(P.d)) : null
  let i0 = lb(FT, d); const iEnd = lb(FT, d + DAY); if (i0 >= F.length || i0 < 1) continue
  const vpl = vp ? [vp.poc, vp.vah, vp.val] : [], a0 = atr[i0 - 1]
  const fam = STRLV ? strongFams(d, F[i0].iid) : NEWLV ? { 'L-SW1H': swingLevels(d, F[i0].iid), 'L-CONF': [P.h, P.l].filter((x) => a0 > 0 && vpl.some((v) => Math.abs(v - x) <= ZONE * a0)) }
    : { 'L-VP': vpl, 'L-HL': [P.h, P.l] }
  for (const [family, levels] of Object.entries(fam)) for (const level of levels) {
    for (let i = Math.max(i0, 101); i < iEnd - 1; i++) { const b = F[i]; if (!(b.l <= level && b.h >= level)) continue
      const short = b.o < level   // opened below → resistance (short); opened above → support (long)
      const c = confirm(i, level, short); if (c) events.push({ family, i, level, short, t: b.t, c }); break }
  }
}
console.log(`first touches: ${events.length} (` + FAMS.map((f) => `${f} ${events.filter((e) => e.family === f).length}`).join(", ") + ")")
const SPLIT = F[101].t + 0.6 * (F.at(-1).t - F[101].t)
// --dump (spec Part 5, "everything combined"): every event with its causal features at the close of F+1 and the 1 R outcome of an entry
// there → data/orderflow/events_<tf>_<levels>.json, merged by scripts/study_orderflow_combined.mjs. Nothing above changes.
if (process.argv.includes('--dump')) {
  const ema = (n) => { const o = new Float64Array(F.length), k = 2 / (n + 1); let e = F[0].c; for (let i = 0; i < F.length; i++) { e = F[i].c * k + e * (1 - k); o[i] = e } return o }
  const E240 = ema(240), E600 = ema(600), RS = new Float64Array(F.length).fill(NaN); { const n = 168; let ag = 0, al = 0
    for (let i = 1; i < F.length; i++) { const d = F[i].c - F[i - 1].c; if (i <= n) { ag += Math.max(0, d) / n; al += Math.max(0, -d) / n; if (i === n) RS[i] = al ? 100 - 100 / (1 + ag / al) : 100; continue }
      ag = (ag * (n - 1) + Math.max(0, d)) / n; al = (al * (n - 1) + Math.max(0, -d)) / n; RS[i] = al ? 100 - 100 / (1 + ag / al) : 100 } }
  const rows = events.map((e) => { const i = e.i, j = i + 1, a = atr[i], f0 = F[i], f1 = F[j]; let v20 = 0, a100 = 0; for (let q = i - 20; q < i; q++) v20 += F[q].v; for (let q = i - 100; q < i; q++) a100 += atr[q]
    return { t: f0.t, i, family: e.family, short: e.short, level: e.level, c: e.c.atF1, cF: e.c.atF.count,
      x: { dF: f0.v ? deltaOf(f0) / f0.v : 0, dF1: f1.v ? deltaOf(f1) / f1.v : 0, volRel: v20 ? f0.v / (v20 / 20) : 0, atrRel: a100 ? a / (a100 / 100) : 0, distAtr: a ? Math.abs(f1.c - e.level) / a : 0,
        tr240: a ? (f1.c - E240[j]) / a : 0, tr600: a ? (f1.c - E600[j]) / a : 0, rsi: RS[j], hour: new Date(f1.t).getUTCHours(), wday: new Date(f1.t).getUTCDay() },
      net1R: trade(i, j, e.level, e.short, 1) } })
  const name = `events_${TFARG || '5m'}_${STRLV ? 'strong' : NEWLV ? 'new' : 'base'}${INFERRED ? '_inferred' : ''}.json`
  fs.writeFileSync(path.join(DIR, name), JSON.stringify({ at: new Date().toISOString(), tf: TFARG || '5m', families: FAMS, rows })); console.log('dumped', rows.length, '→', name)
}
const signals = { C1: (c) => c.atF1.C1, C2: (c) => c.atF1.C2, C3: (c) => c.atF1.C3, C4: (c) => c.atF1.C4, C5: (c) => c.atF1.C5, 'COUNT>=1': (c) => c.atF1.count >= 1, 'COUNT>=2': (c) => c.atF1.count >= 2, 'COUNT>=3': (c) => c.atF1.count >= 3 }
const entryIdx = (e, name) => { const k = name.startsWith('COUNT>=') ? +name.slice(7) : null
  if (k != null) return e.c.atF.count >= k ? e.i : e.i + 1
  return ['C1', 'C2', 'C5'].includes(name) && e.c.atF[name] ? e.i : e.i + 1 }
const summ = (xs) => { const v = xs.filter((x) => x != null), n = v.length, mean = n ? v.reduce((s, x) => s + x, 0) / n : null, b = []
  for (let r = 0; r < 2000 && n; r++) { let s = 0; for (let j = 0; j < n; j++) s += v[(rnd() * n) | 0]; b.push(s / n) }; b.sort((x, y) => x - y)
  return { n, wr: n ? +(v.filter((x) => x > 0).length / n).toFixed(4) : null, net: mean == null ? null : +mean.toFixed(3), net_lb: n ? +b[Math.floor(Q * b.length)].toFixed(3) : null } }
const cells = {}
for (const family of FAMS) for (const TM of [1, 2]) {
  const E = events.filter((e) => e.family === family), part = (e) => (e.t < SPLIT ? 'TRAIN' : 'OOS')
  const ctl = { TRAIN: [], OOS: [] }; for (const e of E.filter((x) => x.c.atF1.count === 0)) ctl[part(e)].push(trade(e.i, e.i + 1, e.level, e.short, TM))
  const rndC = { TRAIN: [], OOS: [] }; for (const e of E) { const j = Math.min(F.length - 2, Math.max(102, e.i + Math.round((rnd() * 2 - 1) * Math.round(14 * DAY / M5)))); const lvl = e.short ? F[j].c - (F[e.i].c - e.level) : F[j].c + (e.level - F[e.i].c); rndC[part(e)].push(trade(j, j, lvl, e.short, TM)) }
  for (const [name, fn] of Object.entries(signals)) {
    const G = { TRAIN: [], OOS: [] }; for (const e of E.filter((x) => fn(x.c))) G[part(e)].push(trade(e.i, entryIdx(e, name), e.level, e.short, TM))
    const r = { family, TM, signal: name, train: summ(G.TRAIN), oos: summ(G.OOS), control_no_confirmation: { train: summ(ctl.TRAIN), oos: summ(ctl.OOS) }, control_random: { oos: summ(rndC.OOS) } }
    r.verdict = r.oos.n >= MIN_N && r.oos.net_lb > 0 && r.train.net > 0 && r.oos.net > r.control_no_confirmation.oos.net ? 'PASS' : r.oos.n < MIN_N ? 'UNDERPOWERED' : 'FAIL'
    cells[`${family}|${TM}R|${name}`] = r
    console.log(`${family} ${TM}R ${name.padEnd(9)} OOS n ${String(r.oos.n).padStart(4)} WR ${r.oos.wr} $/t ${r.oos.net} [LB ${r.oos.net_lb}] · TRAIN n ${r.train.n} $/t ${r.train.net} · no-confirm OOS ${r.control_no_confirmation.oos.net} (n ${r.control_no_confirmation.oos.n}) · random ${r.control_random.oos.net} → ${r.verdict}`)
  }
}
// DIAGNOSTIC (added after the first run, descriptive only — no verdict): win rate and $ by confirmation COUNT (0 … 5) pooled over both halves,
// with the average risk R and the cost as a share of R, at 1 R.
const diag = {}
for (const family of FAMS) { diag[family] = {}
  for (const k of [0, 1, 2, 3]) { const E = events.filter((e) => e.family === family && (k === 3 ? e.c.atF1.count >= 3 : e.c.atF1.count === k)), rs = [], costs = [], nets = []
    for (const e of E) { const idx = k === 0 ? e.i + 1 : (e.c.atF.count >= k && k > 0 ? e.i : e.i + 1), a = atr[e.i], ent = F[idx].c, stop = e.short ? e.level + STOP * a : e.level - STOP * a, R = e.short ? stop - ent : ent - stop
      const n = trade(e.i, idx, e.level, e.short, 1); if (n == null || !(R > 0)) continue; nets.push(n); rs.push(R); costs.push(spreadAt(F[idx].t + M5) / R) }
    const n = nets.length, w = nets.filter((x) => x > 0).length, ph = n ? w / n : 0, z = 1.96, den = 1 + z * z / n, c = (ph + z * z / (2 * n)) / den, hw = n ? z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / den : 0
    diag[family][k === 3 ? '3+' : String(k)] = { n, wr: +ph.toFixed(4), wr_ci: [+(c - hw).toFixed(3), +(c + hw).toFixed(3)], net: n ? +(nets.reduce((s, x) => s + x, 0) / n).toFixed(3) : null, avg_R: n ? +(rs.reduce((s, x) => s + x, 0) / n).toFixed(2) : null, cost_share_of_R: n ? +(costs.reduce((s, x) => s + x, 0) / n).toFixed(3) : null } } }
console.log('DIAGNOSTIC by confirmation count (1 R, both halves): ' + JSON.stringify(diag))
const pass = Object.entries(cells).filter(([, r]) => r.verdict === 'PASS').map(([k]) => k)
const out = { timeframe: TFARG || '5m', diagnostic_by_count: diag, at: new Date().toISOString(), side_source: INFERRED ? 'inferred' : 'exchange', split: new Date(SPLIT).toISOString().slice(0, 10), touches: events.length, rules: 'docs/ORDERFLOW_FOOTPRINT_SPEC.md Part 2', cells, passing: pass,
  verdict: pass.length ? 'SOME_CONFIRMATIONS_PASS' : 'NO_CONFIRMATION_PASSES' }
fs.writeFileSync(path.join(TURBO.master, 'orderflow_footprint_study' + (TFARG ? '_' + TFARG : '') + (STRLV ? '_strong' : NEWLV ? '_newlevels' : '') + (INFERRED ? '_inferred' : '') + '.json'), JSON.stringify(out, null, 1))
console.log(`\n=> ORDER-FLOW FOOTPRINT ${out.timeframe} (${out.side_source} sides): ${out.verdict}${pass.length ? ' — ' + pass.join(', ') : ''}`)
