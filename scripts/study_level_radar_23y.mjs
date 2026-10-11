// 🚨 2026-10-08 (twin audit): THIS STUDY HAS LOOK-AHEAD and its fade population is NOT executable. (1) pivots are usable at the confirming
// bar's OPEN (should be its close); (2) trend1d / ATR(1d) / the 20-day range read the day still in progress. src/master/levelRadar.js
// reproduces this study exactly in `legacy` mode (smoke_level_radar) and fixes both by default. Separately, its fade population is
// filtered by a lane tied to the study's OWN 15m resolution: a live order rule cannot reproduce it, and both live-feasible rules lose
// (validate_level_fade_book.mjs → level_fade_gate.json: −$1.49 / −$0.97 per trade OOS; diagnose_level_fade_gap.json). Its numbers are
// RESEARCH HISTORY, never a claim.
// study_level_radar_23y.mjs — Ashraf (2026-09-26): "a Scalp Radar for 15m swing trades that reads all sessions through 23 years of
// real data and gives the highest-probability TARGET level and BOUNCE level with the real reason, compared to HTF structure (daily /
// 4H), at least 15 min and ideally 4 h or more ahead". This is the MEASUREMENT ENGINE behind such a radar: at every 4H bar close
// (the decision point, known hours ahead of the trades) it takes the causal daily + 4H level map, the nearest level above (R1) and
// below (S1) and the second ones, and measures over the next 4h / 8h / 24h: (a) which level price REACHES first, (b) whether the
// first touch BOUNCES or BREAKS (the weekend-study 15m rule), conditioned on distance, HTF trend, level strength, level status,
// session window, day, Fib and Gann confluence, and volume on the touch bar. Every cell carries n and a Wilson lower bound.
// CAUSAL: pivots confirm k bars after they print; levels exist only from their confirmation; Fib legs use confirmed swings only.
// PRE-REGISTERED definitions (no grid): fractal k=2 on 1d and 4h bars; cluster width 0.25·ATR(1d,14); touch = within 0.10·ATR(4h);
// BOUNCE = ≥0.50·ATR(4h) away within 4 × 15m bars of the first touch without a 15m close beyond by >0.10·ATR; BREAK = that close.
// RESEARCH ONLY — writes data/master/level_radar_23y.json (the radar's knowledge base). Never a gate, never a size.
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own Polygon 1m tape (resampled), from 2013-07-14
import { wilsonLowerBound } from '../src/core/stats.js'
import { fib } from '../src/agents/structure/fibZones.js'
import { nearestGann } from '../src/agents/structure/gannSquare9.js'
import { netDollars, COST_MODEL } from '../src/master/execution.js'
const OUT = process.env.TURBO_STUDY_OUT || path.join(TURBO.master, 'level_radar_23y.json')
const P = { k: 2, clusterAtr: 0.25, touchAtr: 0.10, breakAtr: 0.10, bounceAtr: 0.50, bounceBars: 4, lookback1d: 250, lookback4h: 180, fibTolAtr: 0.15, horizons: [16, 32, 96] }   // horizons in 15m bars: 4h / 8h / 24h
const iso = (t) => new Date(t).toISOString()
console.log('\n████ LEVEL RADAR 23y — daily + 4H causal levels, reach / bounce / break probabilities at every 4H close ████')
const { bars: m15 } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })
const B = m15.map((b) => ({ t: b.t, o: b.o ?? b.open, h: b.h ?? b.high, l: b.l ?? b.low, c: b.c ?? b.close, v: b.v ?? 0 }))
console.log('15m bars', B.length, iso(B[0].t).slice(0, 10), '->', iso(B.at(-1).t).slice(0, 10))
// ── aggregates ──
const agg = (ms) => { const out = []; let cur = null; for (const b of B) { const k = Math.floor(b.t / ms) * ms; if (!cur || cur.t !== k) { if (cur) out.push(cur); cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, i0: out.length } } else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v } } if (cur) out.push(cur); return out }
const H4 = agg(4 * 3600000), D1 = agg(86400000)
const atrOf = (bars, n) => { const out = new Array(bars.length).fill(null); let s = 0; for (let i = 1; i < bars.length; i++) { const tr = Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c)); if (i <= n) { s += tr; if (i === n) out[i] = s / n } else out[i] = (out[i - 1] * (n - 1) + tr) / n } return out }
const ATR4 = atrOf(H4, 14), ATR1 = atrOf(D1, 14)
// ── causal fractal pivots: a pivot at bar i is CONFIRMED at bar i+k's close ──
const pivots = (bars, k, tf) => { const out = []; for (let i = k; i < bars.length - k; i++) { let hi = true, lo = true; for (let m = 1; m <= k; m++) { if (!(bars[i].h > bars[i - m].h && bars[i].h > bars[i + m].h)) hi = false; if (!(bars[i].l < bars[i - m].l && bars[i].l < bars[i + m].l)) lo = false } if (hi) out.push({ price: bars[i].h, kind: 'H', t: bars[i].t, confirmT: bars[i + k].t, tf }); if (lo) out.push({ price: bars[i].l, kind: 'L', t: bars[i].t, confirmT: bars[i + k].t, tf }) } return out.sort((a, b) => a.confirmT - b.confirmT) }
const PV = [...pivots(D1, P.k, '1d'), ...pivots(H4, P.k, '4h')].sort((a, b) => a.confirmT - b.confirmT)
console.log('pivots: 1d', PV.filter((p) => p.tf === '1d').length, '· 4h', PV.filter((p) => p.tf === '4h').length)
// ── SMA20 on daily closes for the 1d trend; 4h trend = last two confirmed 4h swing highs/lows (HH+HL = UP, LH+LL = DOWN) ──
const sma20 = new Array(D1.length).fill(null); { let s = 0; for (let i = 0; i < D1.length; i++) { s += D1[i].c; if (i >= 20) s -= D1[i - 20].c; if (i >= 19) sma20[i] = s / 20 } }
const dayIdxAt = (t) => { let lo = 0, hi = D1.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (D1[m].t <= t) lo = m; else hi = m - 1 } return lo }
const h4IdxAt = (t) => { let lo = 0, hi = H4.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (H4[m].t <= t) lo = m; else hi = m - 1 } return lo }
const m15IdxAt = (t) => { let lo = 0, hi = B.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (B[m].t < t) lo = m + 1; else hi = m } return lo }
const trend4hAt = (t) => { const hs = [], ls = []; for (let i = PV.length - 1; i >= 0 && (hs.length < 2 || ls.length < 2); i--) { const p = PV[i]; if (p.tf !== '4h' || p.confirmT > t) continue; if (p.kind === 'H' && hs.length < 2) hs.push(p.price); if (p.kind === 'L' && ls.length < 2) ls.push(p.price) } if (hs.length < 2 || ls.length < 2) return 'NA'; const hh = hs[0] > hs[1], hl = ls[0] > ls[1]; return hh && hl ? 'UP' : !hh && !hl ? 'DOWN' : 'MIXED' }
// ── the level map at time t: confirmed pivots within lookback, clustered; attributes measured causally ──
function levelsAt(t, atr1) {
  const cutoff1d = t - P.lookback1d * 86400000, cutoff4h = t - P.lookback4h * 4 * 3600000
  const pts = []; for (let i = PV.length - 1; i >= 0; i--) { const p = PV[i]; if (p.confirmT > t) continue; if (p.confirmT < cutoff1d) break; if (p.tf === '4h' && p.t < cutoff4h) continue; pts.push(p) }
  pts.sort((a, b) => a.price - b.price); const width = P.clusterAtr * atr1; const cl = []
  for (const p of pts) { const c = cl.at(-1); if (c && p.price - c.anchor <= width) { c.members.push(p); c.price = c.members.reduce((s, m) => s + m.price, 0) / c.members.length } else cl.push({ anchor: p.price, price: p.price, members: [p] }) }
  return cl.map((c) => ({ price: c.price, n: c.members.length, tfs: [...new Set(c.members.map((m) => m.tf))], has1d: c.members.some((m) => m.tf === '1d'), firstT: Math.min(...c.members.map((m) => m.t)), lastT: Math.max(...c.members.map((m) => m.t)) }))
}
// touches and status since the level formed: count of 4h bars (after the level's last member) whose range came within 0.1·ATR4h; swept-reclaimed = a 4h close beyond, later a close back inside
function levelStatus(L, t, atr4) { const tol = P.touchAtr * atr4; let touches = 0, beyond = false, reclaimed = false; const i0 = h4IdxAt(L.lastT) + 1, i1 = h4IdxAt(t); for (let i = i0; i <= i1; i++) { const b = H4[i]; if (b.l <= L.price + tol && b.h >= L.price - tol) touches++; const above = b.c > L.price + tol, below = b.c < L.price - tol; if (!beyond && (above || below)) { beyond = true; L._side = above ? 'above' : 'below' } else if (beyond && !reclaimed && ((L._side === 'above' && below) || (L._side === 'below' && above))) reclaimed = true } return { touches, status: reclaimed ? 'SWEPT_RECLAIMED' : beyond ? 'BROKEN' : touches >= 2 ? 'TESTED' : 'FRESH' } }
// ── outcome of the next H bars for a level: reached? first-touch bounce/break? ──
function reachOutcome(i0, L, side, atr4, H) { const tol = P.touchAtr * atr4, brk = P.breakAtr * atr4, away = P.bounceAtr * atr4; const end = Math.min(B.length - 1, i0 + H); for (let j = i0 + 1; j <= end; j++) { const b = B[j]; const touched = side === 'R' ? b.h >= L.price - tol : b.l <= L.price + tol; if (!touched) continue; let out = 'INDECISIVE'; for (let m = j; m < Math.min(B.length, j + P.bounceBars); m++) { const x = B[m]; const closedBeyond = side === 'R' ? x.c > L.price + brk : x.c < L.price - brk; const movedAway = side === 'R' ? x.l <= L.price - away : x.h >= L.price + away; if (closedBeyond) { out = 'BREAK'; break } if (movedAway) { out = 'BOUNCE'; break } } const volAvg = (() => { let s = 0, n = 0; for (let m = j - 20; m < j; m++) if (m >= 0) { s += B[m].v; n++ } return n ? s / n : 0 })(); return { reached: true, bar: j - i0, outcome: out, volMult: volAvg > 0 ? +(B[j].v / volAvg).toFixed(2) : null } } return { reached: false } }
// ── Fib / Gann confluence for a level (causal: the last confirmed daily swing pair) ──
function fibGannAt(t, atr1) { let hs = null, ls = null; for (let i = PV.length - 1; i >= 0 && !(hs && ls); i--) { const p = PV[i]; if (p.tf !== '1d' || p.confirmT > t) continue; if (p.kind === 'H' && !hs) hs = p; if (p.kind === 'L' && !ls) ls = p } if (!hs || !ls) return { fibLevels: [], gann: null }
  const f = hs.t > ls.t ? fib(ls.price, hs.price) : fib(hs.price, ls.price); const fibLevels = f ? [...f.retr.map((r) => r.price), ...f.ext.map((e) => e.price)] : []
  const gann = nearestGann((hs.price + ls.price) / 2, [{ price: hs.price }, { price: ls.price }], { steps: 24 }); return { fibLevels, gannAll: gann.all.map((l) => l.price) } }
const near = (price, list, tol) => list.some((p) => Math.abs(p - price) <= tol)
// ── cells ──
const cells = new Map(); const add = (key, hit) => { const c = cells.get(key) || { n: 0, k: 0 }; c.n++; if (hit) c.k++; cells.set(key, c) }
const trades = []; const TAKER = Object.freeze({ ...COST_MODEL, entryMaker: false })
const seenFill = new Set(); const laneFree = { R: -1, S: -1 }; const laneFreeB = { R: -1, S: -1 }   // one trade per physical touch; one open trade per side per playbook
const fadeCandidates = []   // exported for the 1m-sequenced re-resolution (validate_level_radar_seq.mjs)
const sessionOf = (t) => { const h = new Date(t).getUTCHours(); return h < 7 ? 'ASIA' : h < 13 ? 'LONDON' : h < 21 ? 'NY' : 'LATE' }
const distBucket = (d) => d < 0.5 ? '<0.5' : d < 1 ? '0.5-1' : d < 2 ? '1-2' : d < 4 ? '2-4' : '≥4'
let points = 0, skipped = 0
const t0 = Date.now()
for (let i = 60; i < H4.length - 8; i++) {
  const t = H4[i].t + 4 * 3600000 - 1, atr4 = ATR4[i], di = dayIdxAt(t), atr1 = ATR1[di]; if (!atr4 || !atr1 || sma20[di] == null) { skipped++; continue }
  const px = H4[i].c; const lv = levelsAt(t, atr1); if (lv.length < 4) { skipped++; continue }
  const above = lv.filter((L) => L.price > px + P.touchAtr * atr4).sort((a, b) => a.price - b.price), below = lv.filter((L) => L.price < px - P.touchAtr * atr4).sort((a, b) => b.price - a.price)
  if (!above.length || !below.length) { skipped++; continue }
  const trend1d = D1[di].c > sma20[di] ? 'UP' : 'DOWN', trend4h = trend4hAt(t), sess = sessionOf(t + 1), dow = new Date(t).getUTCDay()
  const rng20 = (() => { let hi = -Infinity, lo = Infinity; for (let j = Math.max(0, di - 19); j <= di; j++) { hi = Math.max(hi, D1[j].h); lo = Math.min(lo, D1[j].l) } return { hi, lo } })(); const pos = rng20.hi > rng20.lo ? (px - rng20.lo) / (rng20.hi - rng20.lo) : 0.5; const posB = pos < 0.33 ? 'LOW3' : pos < 0.67 ? 'MID3' : 'HIGH3'
  const fg = fibGannAt(t, atr1); const i0 = m15IdxAt(t + 1) - 1
  const sides = [['R', above[0], above[1]], ['S', below[0], below[1]]]
  const first = {}
  for (const [side, L1] of sides) { const st = levelStatus(L1, t, atr4); const dist = Math.abs(L1.price - px) / atr4; const strength = (L1.has1d ? 'D' : 'H4') + (L1.n >= 3 ? '+multi' : '') + (st.touches >= 2 ? '+tested' : ''); const fibC = near(L1.price, fg.fibLevels || [], P.fibTolAtr * atr1); const gannC = fg.gannAll ? near(L1.price, fg.gannAll, P.fibTolAtr * atr1) : false
    const towards = (side === 'R' && trend1d === 'UP') || (side === 'S' && trend1d === 'DOWN') ? 'WITH-1d' : 'AGAINST-1d'; const towards4 = trend4h === 'NA' || trend4h === 'MIXED' ? 'MIXED-4h' : ((side === 'R' && trend4h === 'UP') || (side === 'S' && trend4h === 'DOWN') ? 'WITH-4h' : 'AGAINST-4h')
    for (const H of P.horizons) { const o = reachOutcome(i0, L1, side, atr4, H); const hz = H === 16 ? '4h' : H === 32 ? '8h' : '24h'; first[side + hz] = o
      add(`REACH|${hz}|dist ${distBucket(dist)}`, o.reached); add(`REACH|${hz}|dist ${distBucket(dist)}|${towards}`, o.reached); add(`REACH|${hz}|dist ${distBucket(dist)}|${towards}|${towards4}`, o.reached); add(`REACH|${hz}|${towards}|${towards4}|pos ${posB}`, o.reached); add(`REACH|${hz}|session ${sess}|dist ${distBucket(dist)}`, o.reached)
      if (o.reached && o.outcome !== 'INDECISIVE') { const b = o.outcome === 'BOUNCE'; add(`BOUNCE|${hz}|all`, b); add(`BOUNCE|${hz}|strength ${strength}`, b); add(`BOUNCE|${hz}|status ${st.status}`, b); add(`BOUNCE|${hz}|${towards}`, b); add(`BOUNCE|${hz}|${towards}|${towards4}`, b); add(`BOUNCE|${hz}|session ${sessionOf(B[i0 + o.bar].t)}`, b); add(`BOUNCE|${hz}|fib ${fibC ? 'YES' : 'no'}`, b); add(`BOUNCE|${hz}|gann ${gannC ? 'YES' : 'no'}`, b); add(`BOUNCE|${hz}|fib ${fibC ? 'YES' : 'no'}|status ${st.status}`, b); if (o.volMult != null) add(`BOUNCE|${hz}|touch-volume ${o.volMult >= 1.5 ? '≥1.5x' : '<1.5x'}`, b); add(`BOUNCE|${hz}|strength ${strength}|${towards}`, b); add(`BOUNCE|${hz}|dist ${distBucket(dist)}`, b) } }
  }
  // ── COMPOSITE "sniper" cells + costed playbooks on every reached level (24h horizon) ──
  // A = BOUNCE-FADE: maker limit AT the level, stop 0.5·ATR(4h) beyond, target 1.0·ATR(4h) back (≈ the 60-pip idea), 24h max.
  // B = BREAK-RIDE: taker entry at the first 15m CLOSE beyond the level by >0.10·ATR, stop 0.5·ATR back inside, target 1.0·ATR on.
  for (const [side, L1] of sides) { const st = levelStatus(L1, t, atr4); const dist = Math.abs(L1.price - px) / atr4; const strength = (L1.has1d ? 'D' : 'H4') + (st.touches >= 2 ? '+tested' : ''); const towards = (side === 'R' && trend1d === 'UP') || (side === 'S' && trend1d === 'DOWN') ? 'WITH-1d' : 'AGAINST-1d'
    const o = reachOutcome(i0, L1, side, atr4, 96); if (!o.reached) continue
    const touchSess = sessionOf(B[i0 + o.bar].t); const comp = `${towards}|${strength}|dist ${distBucket(dist)}|touch ${touchSess}`
    if (o.outcome !== 'INDECISIVE') add(`COMP-BOUNCE|${comp}`, o.outcome === 'BOUNCE')
    const stop = 0.5 * atr4, tgt = 1.0 * atr4, up = side === 'S'   // fade a support = BUY, fade a resistance = SELL
    // A: the limit rests AT the level. FILL = the first 15m bar that trades THROUGH the level price (not merely within the touch
    // tolerance); the fill bar is judged pessimistically (its extent beyond the level ≥ stop ⇒ LOSS; no target credit on it).
    // ONE trade per physical touch (dedupe on side+level+fill bar) and ONE open fade per side at a time (lane rule).
    { let fj = -1; for (let m = i0 + 1; m <= Math.min(B.length - 1, i0 + 96); m++) { if (up ? B[m].l <= L1.price : B[m].h >= L1.price) { fj = m; break } }
      if (fj >= 0) { const key = `${side}|${L1.price.toFixed(2)}|${fj}`; if (!seenFill.has(key) && fj >= laneFree[side]) { seenFill.add(key); const entry = L1.price; let res = null, k = fj + 1
        if (up ? B[fj].l <= entry - stop : B[fj].h >= entry + stop) res = 'LOSS'
        else for (; k <= Math.min(B.length - 1, i0 + 96); k++) { const b = B[k]; if (up ? b.l <= entry - stop : b.h >= entry + stop) { res = 'LOSS'; break } if (up ? b.h >= entry + tgt : b.l <= entry - tgt) { res = 'WIN'; break } }
        const endIdx = res === 'LOSS' && k === fj + 1 ? fj : Math.min(k, B.length - 1); laneFree[side] = endIdx + 1
        const gross = res === 'WIN' ? tgt : res === 'LOSS' ? -stop : (up ? B[endIdx].c - entry : entry - B[endIdx].c); const net = netDollars({ grossMove: gross, entryHourUtc: new Date(B[fj].t).getUTCHours(), atr: atr4 / 4, exitType: res === 'WIN' ? 'target' : 'stop' }); trades.push({ book: 'A-fade', comp, side, net, R: net / stop, year: new Date(t).getUTCFullYear(), res: res ?? 'TIME', lead_bars: fj - i0 })
        fadeCandidates.push({ decisionT: t + 1, level: +L1.price.toFixed(3), side, dir: up ? 'UP' : 'DOWN', atr4: +atr4.toFixed(4), stop: +stop.toFixed(4), tgt: +tgt.toFixed(4), comp, fillBarT: B[fj].t, res15m: res ?? 'TIME', net15m: net }) } } }
    // B: enter on the first 15m CLOSE beyond the level (within 4 bars of the touch), taker; same dedupe and lane rules
    { const j = i0 + o.bar; let ent = -1; for (let m = j; m < Math.min(B.length, j + P.bounceBars); m++) { const x = B[m]; if (side === 'R' ? x.c > L1.price + P.breakAtr * atr4 : x.c < L1.price - P.breakAtr * atr4) { ent = m; break } }
      if (ent >= 0) { const key = `B|${side}|${L1.price.toFixed(2)}|${ent}`; if (!seenFill.has(key) && ent >= laneFreeB[side]) { seenFill.add(key); const entry = B[ent].c, upB = side === 'R'; let res = null, k = ent + 1; for (; k <= Math.min(B.length - 1, i0 + 96); k++) { const b = B[k]; if (upB ? b.l <= entry - stop : b.h >= entry + stop) { res = 'LOSS'; break } if (upB ? b.h >= entry + tgt : b.l <= entry - tgt) { res = 'WIN'; break } }
        const endIdx = Math.min(k, B.length - 1); laneFreeB[side] = endIdx + 1
        const gross = res === 'WIN' ? tgt : res === 'LOSS' ? -stop : (upB ? B[endIdx].c - entry : entry - B[endIdx].c); const net = netDollars({ grossMove: gross, entryHourUtc: new Date(B[ent].t).getUTCHours(), atr: atr4 / 4, exitType: res === 'WIN' ? 'target' : 'stop' }, TAKER); trades.push({ book: 'B-break', comp, side, net, R: net / stop, year: new Date(t).getUTCFullYear(), res: res ?? 'TIME', lead_bars: ent - i0 }) } } } }
  // which side is reached FIRST within 24h (the "targeted level" question)
  const r = first.R24h, s = first.S24h; if (r && s && (r.reached || s.reached)) { const firstSide = !s.reached ? 'R' : !r.reached ? 'S' : r.bar <= s.bar ? 'R' : 'S'; const key1 = `FIRST24h|trend1d ${trend1d}|trend4h ${trend4h}|pos ${posB}`; add(key1 + '|R first', firstSide === 'R'); add(`FIRST24h|trend1d ${trend1d}|R first`, firstSide === 'R'); add(`FIRST24h|trend4h ${trend4h}|R first`, firstSide === 'R'); add(`FIRST24h|pos ${posB}|R first`, firstSide === 'R'); add(`FIRST24h|session ${sess}|trend1d ${trend1d}|R first`, firstSide === 'R') }
  points++
  if (points % 5000 === 0) console.log(`  ${points} decision points · ${Math.round((Date.now() - t0) / 1000)}s`)
}
const rows = [...cells.entries()].map(([key, c]) => ({ key, n: c.n, k: c.k, rate: +(c.k / c.n).toFixed(4), lb: +wilsonLowerBound(c.k, c.n).toFixed(4), ub: +(1 - wilsonLowerBound(c.n - c.k, c.n)).toFixed(4) })).sort((a, b) => a.key.localeCompare(b.key))
const out = { at: new Date().toISOString(), span: [iso(B[0].t).slice(0, 10), iso(B.at(-1).t).slice(0, 10)], params: P, decision_points: points, skipped, definitions: { decision: 'every 4H bar close (UTC-aligned)', levels: 'causal fractal (k=2) pivots on 1d (250-day lookback) and 4h (180-bar lookback), confirmed k bars later, clustered within 0.25·ATR(1d)', R1S1: 'nearest cluster above/below beyond 0.10·ATR(4h)', reach: 'any 15m bar within 0.10·ATR(4h) of the level inside the horizon', bounce: '≥0.50·ATR(4h) away from the level within 4×15m bars of the first touch with no 15m close beyond by >0.10·ATR', break: 'a 15m close beyond the level by >0.10·ATR(4h) within those bars', trend1d: 'daily close vs SMA20', trend4h: 'last two confirmed 4h swing highs and lows (HH+HL / LH+LL)', pos: 'position in the 20-day range (thirds)', fib: 'level within 0.15·ATR(1d) of a retracement/extension of the last confirmed daily swing (fibZones.fib)', gann: 'level within 0.15·ATR(1d) of a Square-of-9 level anchored on the last confirmed daily swing high/low (gannSquare9)', volume: '15m volume on the touch bar vs the prior-20-bar mean' }, cells: rows }
// ── playbook results per composite cell (costed), ranked by the bootstrap lower bound of net $/trade ──
const mean = (a, k) => a.length ? a.reduce((s, x) => s + (k ? x[k] : x), 0) / a.length : 0
const boot = (xs) => { let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }; const o = []; for (let b = 0; b < 1000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[(rnd() * xs.length) | 0].net; o.push(s / xs.length) } o.sort((a, b) => a - b); return { lb: +o[25].toFixed(4), ub: +o[974].toFixed(4) } }
const tstat = (xs) => { const W = xs.filter((x) => x.res === 'WIN').length, L = xs.filter((x) => x.res === 'LOSS').length; const years = {}; for (const x of xs) { years[x.year] = years[x.year] || 0; years[x.year] += x.net } const ys = Object.values(years); const bs = boot(xs); const lead = xs.map((x) => x.lead_bars).sort((a, b) => a - b); return { n: xs.length, win: W, loss: L, time: xs.length - W - L, wr: +(W / Math.max(1, W + L)).toFixed(4), wilson_lb: +wilsonLowerBound(W, Math.max(1, W + L)).toFixed(4), net_per_trade: +mean(xs, 'net').toFixed(4), net_lb: bs.lb, net_ub: bs.ub, avgR: +mean(xs, 'R').toFixed(4), sum_net: +xs.reduce((s, x) => s + x.net, 0).toFixed(1), years_positive: ys.filter((v) => v > 0).length, years: ys.length, median_lead_15m_bars: lead[Math.floor(lead.length / 2)] ?? null, per_year_n: +(xs.length / Math.max(1, ys.length)).toFixed(1) } }
out.playbooks = {}
for (const book of ['A-fade', 'B-break']) { const all = trades.filter((x) => x.book === book); const byComp = {}; for (const x of all) { (byComp[x.comp] = byComp[x.comp] || []).push(x) } const rows2 = Object.entries(byComp).filter(([, xs]) => xs.length >= 150).map(([comp, xs]) => ({ comp, ...tstat(xs) })).sort((a, b) => b.net_lb - a.net_lb); out.playbooks[book] = { all: tstat(all), cells: rows2 }
  console.log(`\n── PLAYBOOK ${book} · ALL reached levels: ` + JSON.stringify(out.playbooks[book].all)); console.log(`── PLAYBOOK ${book} · top composite cells by net LB (n ≥ 150) ──`); for (const r of rows2.slice(0, 12)) console.log(`  ${r.comp.padEnd(52)} n=${String(r.n).padStart(5)} (${r.per_year_n}/yr) WR ${r.wr} (LB ${r.wilson_lb}) · net $${String(r.net_per_trade).padStart(7)}/t [${r.net_lb},${r.net_ub}] · avgR ${r.avgR} · years+ ${r.years_positive}/${r.years} · lead ${r.median_lead_15m_bars} bars`); console.log(`── PLAYBOOK ${book} · worst cells ──`); for (const r of rows2.slice(-4)) console.log(`  ${r.comp.padEnd(52)} n=${String(r.n).padStart(5)} WR ${r.wr} · net $${r.net_per_trade}/t [${r.net_lb},${r.net_ub}] · years+ ${r.years_positive}/${r.years}`) }
// Holm over the A-fade composite cells (one-sided bootstrap p of net ≤ 0) — the family is every cell with n ≥ 150
{ const cellsA = out.playbooks['A-fade'].cells; const byComp = {}; for (const x of trades.filter((x) => x.book === 'A-fade')) (byComp[x.comp] = byComp[x.comp] || []).push(x)
  for (const c of cellsA) { const xs = byComp[c.comp]; let seed = 777; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }; let le = 0; const D = 2000; for (let b = 0; b < D; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[(rnd() * xs.length) | 0].net; if (s <= 0) le++ } c.p_net_le_0 = Math.max(1 / D, le / D) }
  const sorted = cellsA.map((c, i) => ({ i, p: c.p_net_le_0 })).sort((a, b) => a.p - b.p); let alive = true; sorted.forEach((s, rank) => { const thr = 0.05 / (sorted.length - rank); const pass = alive && s.p <= thr; if (!pass) alive = false; cellsA[s.i].holm = { rank: rank + 1, threshold: +thr.toFixed(5), pass } })
  out.playbooks['A-fade'].holm_family_size = cellsA.length; out.playbooks['A-fade'].holm_survivors = cellsA.filter((c) => c.holm.pass).map((c) => ({ comp: c.comp, n: c.n, net: c.net_per_trade, lb: c.net_lb, avgR: c.avgR, years: `${c.years_positive}/${c.years}` }))
  console.log(`\nHOLM over ${cellsA.length} A-fade cells: ${out.playbooks['A-fade'].holm_survivors.length} survive`); for (const s of out.playbooks['A-fade'].holm_survivors) console.log('  ' + JSON.stringify(s)) }
fs.writeFileSync(path.join(TURBO.master, 'level_radar_fade_candidates.jsonl'), fadeCandidates.map((c) => JSON.stringify(c)).join('\n') + '\n')
out.fade_candidates_file = 'level_radar_fade_candidates.jsonl'; out.fade_candidates = fadeCandidates.length
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
const show = (prefix, min = 200) => { console.log(`\n── ${prefix} ──`); for (const r of rows.filter((r) => r.key.startsWith(prefix) && r.n >= min)) console.log(`  ${r.key.padEnd(64)} n=${String(r.n).padStart(6)}  ${(100 * r.rate).toFixed(1).padStart(5)}%  [${(100 * r.lb).toFixed(1)}–${(100 * r.ub).toFixed(1)}]`) }
console.log(`\ndecision points ${points} (skipped ${skipped}) in ${Math.round((Date.now() - t0) / 1000)}s`)
show('REACH|4h|dist'); show('REACH|24h|dist'); show('REACH|24h|WITH'); show('REACH|24h|AGAINST'); show('FIRST24h'); show('BOUNCE|4h'); show('BOUNCE|24h|strength'); show('BOUNCE|24h|status'); show('BOUNCE|24h|fib'); show('BOUNCE|24h|gann'); show('BOUNCE|24h|touch'); show('BOUNCE|24h|session'); show('BOUNCE|24h|WITH'); show('BOUNCE|24h|AGAINST')
console.log('-> ' + OUT)
