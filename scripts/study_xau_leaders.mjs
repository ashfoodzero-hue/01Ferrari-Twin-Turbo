// ════════════════════════════════════════════════════════════════════════════════
// study_xau_leaders.mjs — which markets move WITH gold, and which give an EARLY indication of gold's direction? (2026-10-09)
// Ashraf: "find also others that have similar direction on XAU so we use them and give % for each on XAU direction … real data with
// zero guessing … if DXY trend is reversing so we know that XAU is about to reverse". Every % shown on the chart comes from HERE.
// ────────────────────────────────────────────────────────────────────────────────
// DATA: the twin's Polygon 1m stores (bid), 15m resampled, HISTORY_CONTINUOUS_FROM → TURBO_VAL_TO; DXY = rebuilt (src/data/dxy.js).
// WTI is excluded (10 min delayed live; history too short). Split: TRAIN = first 70 % of the time span, OOS = the last 30 %.
//
// PRE-REGISTERED (written before the first run, never re-tuned):
//  (1) DIRECTION SIGN s ∈ {+1, −1}: the sign of the 15m-return correlation with gold on TRAIN.
//  (2) AGREEMENT % (OOS): share of 15m bars (both moved) where sign(asset return)·s = sign(gold return). "Moves together" — NOT a lead.
//  (3) LEAD (the early indication): an EVENT = the asset's 15m close confirms a break of its own structure — beyond its prior 48-bar
//      range ± 0.3·ATR(14), the geometry of marketState.marketStateGeometry (cross-checked in-run) — first bar of each break, NO volume
//      condition (DXY, an index, has none; applied to every asset alike) — AT A BAR WHERE GOLD HAS NOT ALREADY BROKEN in the implied
//      direction d = s · break direction. OUTCOME: gold's close h ∈ {1, 4, 16} bars later (15 min / 1 h / 4 h, contiguous bars only).
//      HIT = gold moved in direction d. BASE = gold's unconditional P(move in d) over the same horizon in the same split.
//  (4) SIGNIFICANCE (OOS): one-sided binomial z of hits vs base; HOLM across all assets × 3 horizons at α = 0.05.
//  (5) A market is a USEFUL LEADER ⇔ OOS lead at 1 h passes Holm AND lift ≥ +2.0 pp AND its TRAIN lift at 1 h is also > 0.
//      Useful leaders are listed in display_extra (shown on the chart's drivers table) and become live-stream candidates.
// Output: data/master/xau_leaders.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { marketStateGeometry } from '../src/master/marketState.js'

const VAL_TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z')
const ASSETS = ['XAGUSD', 'DXY', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCAD', 'USDSEK', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCNH', 'USDZAR', 'USDMXN', 'USDINR', 'USDTRY', 'BTCUSD', 'ETHUSD']
const M15 = 900000, H = [1, 4, 16], LOOK = 48, BRK = 0.3
const load15 = async (s) => s === 'DXY' ? (await loadDxyBars('15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars : (await loadBars(s, '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars

/** Per bar: break state (+1 up / −1 down / 0) on the marketState geometry: prior 48-bar range ± 0.3·ATR(14), current bar excluded. */
function breaks(bars) {
  const A = atrArr(bars, 14), out = new Int8Array(bars.length), hiQ = [], loQ = []   // monotonic deques over the prior LOOK bars
  for (let i = 0; i < bars.length; i++) {
    while (hiQ.length && hiQ[0] < i - LOOK) hiQ.shift(); while (loQ.length && loQ[0] < i - LOOK) loQ.shift()
    if (i >= LOOK + 20 && A[i]) { const hi = bars[hiQ[0]].h, lo = bars[loQ[0]].l, a = A[i]; out[i] = bars[i].c > hi + BRK * a ? 1 : bars[i].c < lo - BRK * a ? -1 : 0 }
    while (hiQ.length && bars[hiQ.at(-1)].h <= bars[i].h) hiQ.pop(); hiQ.push(i)
    while (loQ.length && bars[loQ.at(-1)].l >= bars[i].l) loQ.pop(); loQ.push(i)
  }
  return out
}
const corr = (xs, ys) => { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null }
const normSf = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? p : 1 - p }

console.log(`\n████ XAU LEADERS — agreement + lead of ${ASSETS.length} markets vs gold, ${new Date(HISTORY_CONTINUOUS_FROM).toISOString().slice(0, 10)} → ${new Date(VAL_TO).toISOString().slice(0, 16)} ████`)
const X = await load15('XAUUSD'), XI = new Map(X.map((b, i) => [b.t, i])), XB = breaks(X)
const SPLIT = X[0].t + 0.7 * (X.at(-1).t - X[0].t)
// cross-check the rolling geometry against marketStateGeometry itself on 200 sampled bars (one rule — this is a faithful mirror)
{ const A = atrArr(X, 14); let bad = 0
  for (let k = 0; k < 200; k++) { const i = 2000 + Math.floor(k * (X.length - 2100) / 200); const g = marketStateGeometry(X.slice(0, i + 1)); const want = X[i].c > g.rangeHigh + BRK * A[i] ? 1 : X[i].c < g.rangeLow - BRK * A[i] ? -1 : 0; if (want !== XB[i]) bad++ }
  if (bad) throw new Error(`rolling geometry disagrees with marketStateGeometry on ${bad}/200 bars`); console.log('geometry cross-check vs marketStateGeometry: 200/200 identical') }
// gold's base rates: P(gold up over h bars), per split, contiguous bars only
const base = {}; for (const h of H) for (const part of ['train', 'oos']) { let up = 0, dn = 0
  for (let i = 0; i + h < X.length; i++) { if (X[i + h].t !== X[i].t + h * M15) continue; if ((X[i].t < SPLIT) !== (part === 'train')) continue; const m = X[i + h].c - X[i].c; if (m > 0) up++; else if (m < 0) dn++ }
  base[`${part}|${h}`] = { up: up / (up + dn), down: dn / (up + dn) } }

const res = {}, tests = []
for (const s of ASSETS) {
  let B; try { B = await load15(s) } catch (e) { console.log(`  ${s}: no data (${String(e.message).slice(0, 60)})`); continue }
  if (B.length < 50000) { console.log(`  ${s}: only ${B.length} bars — skipped`); continue }
  // (1)+(2) returns on bars present in BOTH with the previous 15m bar present in both
  const BI = new Map(B.map((b, i) => [b.t, i])), tr = { a: [], g: [] }, oo = { a: [], g: [] }
  for (const b of B) { const j = XI.get(b.t), jp = XI.get(b.t - M15), ip = BI.get(b.t - M15); if (j == null || jp == null || ip == null) continue
    const ra = Math.log(b.c / B[ip].c), rg = Math.log(X[j].c / X[jp].c); const tgt = b.t < SPLIT ? tr : oo; tgt.a.push(ra); tgt.g.push(rg) }
  const cTr = corr(tr.a, tr.g), sgn = cTr >= 0 ? 1 : -1, cOos = corr(oo.a, oo.g)
  let ag = 0, an = 0; for (let k = 0; k < oo.a.length; k++) { if (!oo.a[k] || !oo.g[k]) continue; an++; if (Math.sign(oo.a[k]) * sgn === Math.sign(oo.g[k])) ag++ }
  // (3) lead events
  const BB = breaks(B), lead = { train: {}, oos: {} }
  for (const part of ['train', 'oos']) for (const h of H) lead[part][h] = { n: 0, hit: 0, baseSum: 0, moveAtr: 0 }
  const XA = atrArr(X, 14)
  for (let i = 1; i < B.length; i++) {
    if (!BB[i] || BB[i - 1] === BB[i]) continue                                  // first bar of each break
    const j = XI.get(B[i].t); if (j == null) continue
    const d = sgn * BB[i]; if (XB[j] === d) continue                             // gold has already broken that way — not a lead
    const part = B[i].t < SPLIT ? 'train' : 'oos'
    for (const h of H) { if (j + h >= X.length || X[j + h].t !== X[j].t + h * M15) continue
      const m = X[j + h].c - X[j].c; if (m === 0) continue
      const L = lead[part][h]; L.n++; if (Math.sign(m) === d) L.hit++; L.baseSum += d > 0 ? base[`${part}|${h}`].up : base[`${part}|${h}`].down; L.moveAtr += (d * m) / (XA[j] || 1) }
  }
  const fin = (L) => { const p = L.n ? L.hit / L.n : null, b = L.n ? L.baseSum / L.n : null, z = L.n ? (L.hit - L.n * b) / Math.sqrt(L.n * b * (1 - b)) : null
    return { n: L.n, hit: p && +p.toFixed(4), base: b && +b.toFixed(4), lift_pp: p != null ? +(100 * (p - b)).toFixed(2) : null, z: z && +z.toFixed(2), p: z != null ? +normSf(z).toExponential(3) : null, mean_move_atr: L.n ? +(L.moveAtr / L.n).toFixed(4) : null } }
  res[s] = { bars: B.length, sign: sgn, corr_train: cTr && +cTr.toFixed(4), corr_oos: cOos && +cOos.toFixed(4), agreement_oos: an ? +(ag / an).toFixed(4) : null, agreement_n: an, lead: { train: {}, oos: {} } }
  for (const part of ['train', 'oos']) for (const h of H) res[s].lead[part][h] = fin(lead[part][h])
  for (const h of H) tests.push({ s, h, p: res[s].lead.oos[h].p ?? 1 })
  console.log(`  ${s.padEnd(7)} corr TRAIN ${res[s].corr_train} OOS ${res[s].corr_oos} · agree OOS ${(100 * res[s].agreement_oos).toFixed(1)}% · lead OOS 15m/1h/4h: ${H.map((h) => { const x = res[s].lead.oos[h]; return `${(100 * x.hit).toFixed(1)}% vs ${(100 * x.base).toFixed(1)}% (n ${x.n})` }).join(' · ')}`)
}
// (4) Holm over assets × horizons (OOS)
tests.sort((a, b) => a.p - b.p); let alive = true
tests.forEach((t, r) => { const thr = 0.05 / (tests.length - r); const pass = alive && t.p <= thr; if (!pass) alive = false; res[t.s].lead.oos[t.h].holm = pass })
// (5) useful leaders
const useful = Object.entries(res).filter(([, r]) => r.lead.oos[4].holm && r.lead.oos[4].lift_pp >= 2 && r.lead.train[4].lift_pp > 0).map(([s]) => s)
const assets = Object.fromEntries(Object.entries(res).map(([s, r]) => [s, { ...r, agreement_oos: r.agreement_oos, lead60: { hit: r.lead.oos[4].hit, base: r.lead.oos[4].base, lift_pp: r.lead.oos[4].lift_pp, n: r.lead.oos[4].n, holm: r.lead.oos[4].holm }, useful_leader: useful.includes(s) }]))
const out = { generated_utc: new Date().toISOString(), window: `${new Date(HISTORY_CONTINUOUS_FROM).toISOString().slice(0, 10)} → ${new Date(VAL_TO).toISOString().slice(0, 10)}, OOS from ${new Date(SPLIT).toISOString().slice(0, 10)}`,
  method_short: 'agreement = same-direction 15m bars (OOS); lead = after the market confirms a 15m structure break while gold has not, gold moves the implied way within 1 h (OOS, Holm over all markets × horizons)',
  definitions: 'see the header of scripts/study_xau_leaders.mjs', base, useful_leaders: useful, display_extra: useful.filter((s) => !['XAGUSD', 'DXY'].includes(s)), assets }
fs.writeFileSync(path.join(TURBO.master, 'xau_leaders.json'), JSON.stringify(out, null, 1))
console.log(`\nUSEFUL LEADERS (pre-registered rule): ${useful.length ? useful.join(', ') : 'NONE'}\nwrote data/master/xau_leaders.json`)
