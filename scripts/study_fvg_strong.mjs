// ════════════════════════════════════════════════════════════════════════════════
// study_fvg_strong.mjs — the "VALID STRONG FVG" question (2026-10-09; Ashraf: "100% mark the Valid Strong FVG that 95% … with calculated
// strength in a certain move would bounce from that level"). study_fvg.mjs measured ALL / BIG gaps; this adds STRENGTH and the 95 % frontier.
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (before the first run). XAU spot 1m BID, FROZEN TAPE, 2013-07-21 → TURBO_VAL_TO. tf 3m, 15m, 1h. FVG as study_fvg.mjs
// (3-candle gap, known at the close of bar i; bullish zone [high(i−2), low(i)], bearish mirrored).
//   STRONG ⇔ ALL of: BIG zone ≥ 0.5·ATR14(tf) · S1 displacement: middle candle body ≥ 1.5·ATR14 · S2 activity: middle candle tick volume
//            ≥ 1.5 × the mean of the 20 bars before it · S3 trend: the 1h AND 4h EMA 20/50/200 stacks (emaLevels, closed bars at the FVG's
//            known time) both BULL for a bullish FVG (BEAR for bearish) · S4 fresh: the first 1m retest comes within 20 tf-bars
//   FRONTIER: stop line = zone far edge ∓ 0.1·ATR; target = the near edge ± X·ATR, X ∈ {0.1, 0.25, 0.5, 1.0} → bounce share (bounceTest.race,
//            touch-minute stop = fail), random-level control with the same distances, and money (bounceTest.limitTrade: limit at the near
//            edge, the same stop and target, measured spread). Horizon 24 h. Split TRAIN 60 % / OOS 40 %.
//   cells = 3 tf × 4 X for STRONG (z 2.64 = one-sided α 0.05/12): HOLDS ⇔ study_stats.levelVerdict (OOS ≥ 100, Wilson LB > control,
//            TRAIN > control, OOS money LB > 0). "95 %" is answered by the measured OOS bounce share at each X — never assumed.
//   Each strength factor alone (with BIG) is reported for X = 0.25, descriptively.
// Output: data/master/fvg_strong_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars, RESAMPLE_TF_MS } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { race, seeded, limitTrade } from '../src/master/bounceTest.js'
import { emaStack } from '../src/master/emaLevels.js'
import { levelStat, levelVerdict } from './lib/study_stats.mjs'
import { fvgAt } from '../src/master/fvg.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const XS = [0.1, 0.25, 0.5, 1.0], Z = 2.64, MIN_N = 100, FRESH = 20, HZ = 86400000, TFS = ['3m', '15m', '1h']
const spreadAt = makeSpreadAt(), rnd = seeded(95959595)
const M = (await loadBars('XAUUSD', '1m', { from: FROM, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
const trendOf = {}
for (const tf of ['1h', '4h']) { const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars, tr = emaStack(B).trend, CT = Float64Array.from(B.map((b) => b.t + ms))
  trendOf[tf] = (T) => { let lo = 0, hi = CT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (CT[m] <= T) lo = m + 1; else hi = m } return lo ? tr[lo - 1] : null } }
const stat = (E) => levelStat(E, rnd, Z)
console.log(`1m bars ${M.length.toLocaleString()}`)

const cells = {}, factors = {}
for (const tf of TFS) {
  const ms = RESAMPLE_TF_MS[tf], B = (await loadBars('XAUUSD', tf, { from: FROM - 3 * 86400000, to: TO })).bars, A = atrArr(B, 14)
  const EV = Object.fromEntries(XS.map((x) => [x, []])), FAC = { BIG: [], S1: [], S2: [], S3: [], S4: [], STRONG: [] }
  for (let i = 22; i < B.length; i++) { if (!(A[i] > 0) || B[i].t < FROM) continue
    const known = B[i].t + ms, F = fvgAt(B, A, i, known, (tf2, T) => trendOf[tf2](T)); if (!F || !F.big) continue   // src/master/fvg.js (one rule)
    const a = F.atr, up = F.up, top = F.top, bot = F.bot, s1 = F.s1, s2 = F.s2, s3 = F.s3
    let kT = -1; for (let k = lb(known); k < M.length && M[k].t < known + FRESH * ms; k++) { if (up ? M[k].l <= top : M[k].h >= bot) { kT = k; break } }
    const s4 = kT >= 0; if (!s4) continue   // no retest within the fresh window → nothing to test (S4 is part of the event definition)
    const tEnd = M[kT].t + HZ; if (tEnd > TO) continue
    const near = up ? top : bot, stopLine = up ? bot - 0.1 * a : top + 0.1 * a, part = M[kT].t < SPLIT ? 'TRAIN' : 'OOS'
    const pierced = up ? M[kT].l <= stopLine : M[kT].h >= stopLine
    const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
    const ev = (x) => { const tgt = up ? near + x * a : near - x * a, D = Math.abs(near - stopLine)
      const bounce = pierced ? false : race(M, kT + 1, up, tgt, stopLine, tEnd)
      const ctrl = race(M, kc + 1, up, up ? c0 + x * a : c0 - x * a, up ? c0 - D : c0 + D, M[kc].t + HZ)
      return { t: M[kT].t, part, bounce, ctrl, net: limitTrade(M, kT, up, near, stopLine, tgt, spreadAt, Math.min(0.3, 0.05 * a), tEnd), D } }
    const e25 = ev(0.25)
    FAC.BIG.push(e25); if (s1) FAC.S1.push(e25); if (s2) FAC.S2.push(e25); if (s3) FAC.S3.push(e25); FAC.S4.push(e25)
    // the shared rule (fvg.js) — volume s2 dropped 2026-10-17, the S2 factor row is kept as a descriptive record only
    if (F.strong) { FAC.STRONG.push(e25); for (const x of XS) EV[x].push(x === 0.25 ? e25 : ev(x)) }
  }
  for (const x of XS) { const TR = stat(EV[x].filter((e) => e.part === 'TRAIN')), OOS = stat(EV[x].filter((e) => e.part === 'OOS')); cells[`${tf}|${x}`] = { tf, x, train: TR, oos: OOS, verdict: levelVerdict(TR, OOS, MIN_N) } }
  factors[tf] = Object.fromEntries(Object.entries(FAC).map(([k, E]) => [k, stat(E.filter((e) => e.part === 'OOS'))]))
  console.log(`${tf.padEnd(3)} STRONG: ` + XS.map((x) => { const c = cells[`${tf}|${x}`]; return `X${x}: bounce ${c.oos.bounce}/${c.oos.control} $${c.oos.net} n${c.oos.resolved} ${c.verdict[0]}` }).join(' · '))
  console.log(`${tf.padEnd(3)} factors (X0.25, OOS bounce/control n): ` + Object.entries(factors[tf]).map(([k, s]) => `${k} ${s.bounce}/${s.control} n${s.resolved}`).join(' · '))
}
const holds = Object.values(cells).filter((c) => c.verdict === 'HOLDS').map((c) => `${c.tf} X${c.x}`)
const best = Object.values(cells).filter((c) => c.oos.resolved >= MIN_N).sort((a, b) => b.oos.bounce - a.oos.bounce)[0]
const out = { at: new Date().toISOString(), window: new Date(FROM).toISOString().slice(0, 10) + ' → ' + new Date(TO).toISOString().slice(0, 16), split: new Date(SPLIT).toISOString().slice(0, 10),
  rules: { strong: 'BIG ≥0.5ATR + body ≥1.5ATR + 1h & 4h EMA stack agree + first retest ≤20 bars (volume activity dropped 2026-10-17: spot v is a quote count)', xs: XS, z: Z, min_n: MIN_N }, cells, factors,
  holding: holds, best_oos_bounce: best ? { cell: `${best.tf} X${best.x}`, bounce: best.oos.bounce, control: best.oos.control, net: best.oos.net } : null,
  reached_95: Object.values(cells).some((c) => c.oos.resolved >= MIN_N && c.oos.bounce_lb >= 0.95), verdict: holds.length ? 'SOME_STRONG_FVG_HOLDS' : 'STRONG_FVG_DOES_NOT_HOLD' }
fs.writeFileSync(path.join(TURBO.master, 'fvg_strong_study.json'), JSON.stringify(out, null, 1))
console.log(`\n=> STRONG FVG: ${out.verdict}${holds.length ? ' (' + holds.join(', ') + ')' : ''} · best OOS bounce ${JSON.stringify(out.best_oos_bounce)} · any cell ≥ 95 % (Wilson LB): ${out.reached_95}`)
