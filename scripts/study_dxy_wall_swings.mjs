// ════════════════════════════════════════════════════════════════════════════════
// study_dxy_wall_swings.mjs — when DXY swings off a CONFIRMED STRONG WALL in a short time, does gold move 100 pips ($10) the other way?
// Ashraf (2026-10-09): "check when there is a confirm strong Walls on DXY and makes it swing on short time that would effect XAU with
// 100 pips should be considered". MEASUREMENT ONLY — no trade, no signal.
// ────────────────────────────────────────────────────────────────────────────────
// DATA: DXY rebuilt from its six Polygon pairs (src/data/dxy.js, validated vs the official daily close), 15m; gold Polygon 1m (bid) for
// the outcome race. HISTORY_CONTINUOUS_FROM → TURBO_VAL_TO. TRAIN = first 70 % of time, OOS = last 30 %.
// PRE-REGISTERED (written before the first run, never re-tuned):
//  WALL      at every closed 4H decision, the radar's causal level map on DXY (src/master/levelRadar.js, default causal mode): the nearest
//            level above (R) and below (S); STRONG = tested ≥ 2 times since it formed (radar strength '+tested').
//  SWING     within the next 16 × 15m bars, DXY TOUCHES the wall (within 0.10·ATR4h) and then, within 4 bars of the touch, moves ≥ 0.50·ATR4h
//            AWAY with no 15m close beyond it by > 0.10·ATR4h (the radar's bounce definition). The event is CONFIRMED at the close of the
//            bar that completes the move away — known only then (causal). One event per wall per decision; ≥ 4 h between events per side.
//  GOLD      implied direction d = +1 (gold UP) when DXY is rejected at RESISTANCE, −1 when rejected at SUPPORT.
//  OUTCOME   from the confirmation close, on gold's 1m path within 240 min: HIT = gold reaches +$10 in direction d BEFORE −$10 against it.
//            (100 pips = $10 at a $0.10 pip.) Timeouts are not hits. Both sides of a 1m bar touched → counted as a LOSS (pessimistic).
//  BASE      the same race from EVERY 15m close in the same split, same direction d.
//  TEST      OOS one-sided binomial z of the hit rate vs base (α = 0.05; ONE primary test). Secondary (reported, not the verdict): the
//            subset where gold had NOT already moved ≥ $10 in direction d between the touch and the confirmation (the "early" part).
//  ADDED AFTER THE FIRST RUN (diagnostic, flagged as such): the primary metric did not control for VOLATILITY — events cluster in active
//            markets, raising the chance of a $10 move in EITHER direction. DIRECTION is measured by the RESOLVED WIN SHARE = wins / (wins +
//            losses), against the base's resolved share for the same direction (≈ 50 %). This, not the primary, answers "does gold go the
//            implied way".
// Output: data/master/dxy_wall_swings.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { buildRadar, decisionAt, closedH4Count, RADAR } from '../src/master/levelRadar.js'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z')
const M15 = 900000, MOVE = 10, H_MIN = 240, TOUCH = 0.10, AWAY = 0.50, BRK = 0.10, BOUNCE_BARS = 4, WINDOW = 16
const normSf = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? p : 1 - p }

console.log('\n████ DXY WALL SWINGS → gold 100 pips ($10) — measurement ████')
const D = (await loadDxyBars('15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
const G1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO + 300 * 60000 })).bars
const GT = G1.map((b) => b.t)
const lb = (t) => { let lo = 0, hi = GT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (GT[m] < t) lo = m + 1; else hi = m } return lo }
const SPLIT = D[0].t + 0.7 * (D.at(-1).t - D[0].t)
console.log(`DXY 15m bars ${D.length} · gold 1m bars ${G1.length} · OOS from ${new Date(SPLIT).toISOString().slice(0, 10)}`)

/** gold race from time t (exclusive): +MOVE in direction d first → 1, −MOVE first → 0, neither within H_MIN → null. Pessimistic on a two-sided bar. */
function race(t, d) {
  let i = lb(t); if (i >= G1.length || G1[i].t - t > 10 * 60000) return { r: null, gap: true }
  const ref = G1[i - 1]?.t === t - 60000 ? G1[i - 1].c : G1[i].o, up = ref + d * MOVE, dn = ref - d * MOVE
  for (; i < G1.length && G1[i].t < t + H_MIN * 60000; i++) {
    const b = G1[i], hitWin = d > 0 ? b.h >= up : b.l <= up, hitLoss = d > 0 ? b.l <= dn : b.h >= dn
    if (hitLoss) return { r: 0, ref }; if (hitWin) return { r: 1, ref }
  }
  return { r: null, ref }
}

// ── events ──
const R = buildRadar(D), nH4 = closedH4Count(R, VAL_TO + M15), DI = new Map(D.map((b, i) => [b.t, i])), lastEv = { R: -Infinity, S: -Infinity }
const events = []
for (let i = RADAR.minH4; i < nH4; i++) {
  const dec = decisionAt(R, i); if (!dec) continue
  const i0 = DI.get(dec.decisionT - M15); if (i0 == null) continue
  for (const o of dec.orders) {
    if (!/\+tested/.test(o.label)) continue                                  // STRONG wall only
    const side = o.side, a = dec.atr4, L = o.level
    let touch = -1; for (let j = i0 + 1; j <= Math.min(D.length - 1, i0 + WINDOW); j++) { const b = D[j]; if (side === 'R' ? b.h >= L - TOUCH * a : b.l <= L + TOUCH * a) { touch = j; break } }
    if (touch < 0) continue
    let conf = -1
    for (let m = touch; m < Math.min(D.length, touch + BOUNCE_BARS); m++) { const x = D[m]; const beyond = side === 'R' ? x.c > L + BRK * a : x.c < L - BRK * a; if (beyond) break; const away = side === 'R' ? x.l <= L - AWAY * a : x.h >= L + AWAY * a; if (away) { conf = m; break } }
    if (conf < 0) continue
    const tConf = D[conf].t + M15                                            // confirmed at that bar's CLOSE
    if (tConf - lastEv[side] < 4 * 3600000) continue
    lastEv[side] = tConf
    const d = side === 'R' ? 1 : -1                                          // DXY rejected at resistance → gold up
    const g0 = G1[lb(D[touch].t)], gc = G1[lb(tConf) - 1]
    const alreadyMoved = g0 && gc ? d * (gc.c - g0.o) >= MOVE : false
    const out = race(tConf, d); if (out.gap) continue
    events.push({ t: tConf, side, d, r: out.r, alreadyMoved, part: tConf < SPLIT ? 'train' : 'oos', year: new Date(tConf).getUTCFullYear() })
  }
}
// ── base: the same race from every 15m close, per split and direction ──
const base = {}
for (const part of ['train', 'oos']) for (const d of [1, -1]) base[`${part}|${d}`] = { n: 0, hit: 0, timeout: 0 }
for (let k = 0; k < D.length; k += 1) { const t = D[k].t + M15, part = t < SPLIT ? 'train' : 'oos'
  for (const d of [1, -1]) { const o = race(t, d); if (o.gap) continue; const B = base[`${part}|${d}`]; B.n++; if (o.r === 1) B.hit++; if (o.r === null) B.timeout++ } }
const rate = (B) => B.hit / B.n
const summarise = (xs, part) => {
  const n = xs.length, hit = xs.filter((x) => x.r === 1).length, to = xs.filter((x) => x.r === null).length, loss = n - hit - to
  const b = n ? xs.reduce((s, x) => s + rate(base[`${part}|${x.d}`]), 0) / n : null
  const z = n ? (hit - n * b) / Math.sqrt(n * b * (1 - b)) : null
  // direction (volatility-controlled): resolved win share vs the base's resolved share for the same direction
  const bRes = n ? xs.reduce((sm, x) => { const w = base[`${part}|${x.d}`], l = base[`${part}|${-x.d}`]; return sm + w.hit / (w.hit + l.hit) }, 0) / n : null
  const res = hit + loss, zr = res ? (hit - res * bRes) / Math.sqrt(res * bRes * (1 - bRes)) : null
  return { n, wins: hit, losses: loss, resolved_win_share: res ? +(hit / res).toFixed(4) : null, base_resolved_share: bRes && +bRes.toFixed(4), direction_lift_pp: res ? +(100 * (hit / res - bRes)).toFixed(2) : null, direction_p: zr != null ? +normSf(zr).toExponential(3) : null, hit_rate: n ? +(hit / n).toFixed(4) : null, base: b && +b.toFixed(4), lift_pp: n ? +(100 * (hit / n - b)).toFixed(2) : null, timeouts: to, z: z && +z.toFixed(2), p: z != null ? +normSf(z).toExponential(3) : null }
}
const out = { generated_utc: new Date().toISOString(), window: `${new Date(HISTORY_CONTINUOUS_FROM).toISOString().slice(0, 10)} → ${new Date(VAL_TO).toISOString().slice(0, 10)}, OOS from ${new Date(SPLIT).toISOString().slice(0, 10)}`,
  definition: 'see the header of scripts/study_dxy_wall_swings.mjs', base: Object.fromEntries(Object.entries(base).map(([k, B]) => [k, { n: B.n, hit_rate: +rate(B).toFixed(4), timeout_share: +(B.timeout / B.n).toFixed(4) }])), results: {} }
for (const part of ['train', 'oos']) {
  const xs = events.filter((e) => e.part === part)
  out.results[part] = { all: summarise(xs, part), not_yet_moved: summarise(xs.filter((e) => !e.alreadyMoved), part), dxy_rejected_at_resistance_gold_up: summarise(xs.filter((e) => e.d > 0), part), dxy_rejected_at_support_gold_down: summarise(xs.filter((e) => e.d < 0), part) }
}
const yr = {}; for (const e of events) { const y = (yr[e.year] ??= { n: 0, hit: 0 }); y.n++; if (e.r === 1) y.hit++ } out.by_year = Object.fromEntries(Object.entries(yr).map(([y, v]) => [y, { n: v.n, hit_rate: +(v.hit / v.n).toFixed(3) }]))
const P = out.results.oos.all; out.verdict = P.n >= 100 && P.p != null && P.p < 0.05 && P.lift_pp > 0 ? 'SIGNIFICANT LIFT (OOS)' : P.n < 100 ? 'UNPOWERED (n < 100 OOS)' : 'NO LIFT (OOS)'
out.direction_verdict = P.direction_p != null && P.direction_p < 0.05 && P.direction_lift_pp > 0 ? 'DIRECTIONAL EDGE (OOS)' : 'NO DIRECTIONAL EDGE (OOS) — the primary lift is VOLATILITY (a $10 move in either direction becomes likelier), not direction'
fs.writeFileSync(path.join(TURBO.master, 'dxy_wall_swings.json'), JSON.stringify(out, null, 1))
console.log('base (gold $10-first within 4h from any 15m close):', JSON.stringify(out.base))
for (const part of ['train', 'oos']) for (const [k, v] of Object.entries(out.results[part])) console.log(`  ${part.padEnd(5)} ${k.padEnd(36)} n=${String(v.n).padStart(4)} hit ${v.hit_rate != null ? (100 * v.hit_rate).toFixed(1) : '—'}% vs base ${v.base != null ? (100 * v.base).toFixed(1) : '—'}% · lift ${v.lift_pp} pp · timeouts ${v.timeouts} · p ${v.p}`)
console.log('by year:', Object.entries(out.by_year).map(([y, v]) => `${y}:${(100 * v.hit_rate).toFixed(0)}%(${v.n})`).join(' '))
for (const part of ['train', 'oos']) for (const [k, v] of Object.entries(out.results[part])) console.log(`  DIRECTION ${part.padEnd(5)} ${k.padEnd(36)} wins ${v.wins} · losses ${v.losses} · resolved win share ${v.resolved_win_share != null ? (100 * v.resolved_win_share).toFixed(1) : '—'}% vs base ${v.base_resolved_share != null ? (100 * v.base_resolved_share).toFixed(1) : '—'}% · p ${v.direction_p}`)
console.log(`\nVERDICT (pre-registered primary test): ${out.verdict}\nDIRECTION (added diagnostic): ${out.direction_verdict}\nwrote data/master/dxy_wall_swings.json`)
