// ════════════════════════════════════════════════════════════════════════════════
// study_wall_context.mjs — does the trend context KNOWN BEFORE the touch (4H Macro, approach speed, 15m RSI exhaustion) change whether a swing
// wall holds, and does a held wall start a real swing? (2026-10-16). Pre-registered: docs/WALL_CONTEXT_SPEC.md → data/master/wall_context_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { swingWallEvents, holdLabel } from '../src/master/wallDefense.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'
import { bubbleEvents } from '../src/master/macroBubbles.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM), Y2020 = Date.UTC(2020, 0, 1)
const HR = 3600000, H4 = 4 * HR, M15 = 900000
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
console.log('1m bars', M.length.toLocaleString())
const resample = (ms) => { const out = []; let c = null; for (const b of M) { const t = Math.floor(b.t / ms) * ms; if (!c || c.t !== t) { if (c) out.push(c); c = { t, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } return out }
const B3 = resample(180000), P3 = confirmedPivots(B3, 5), kk = (x) => ({ knownT: B3[x.knownAt].t + 180000, px: x.px })
const ev = swingWallEvents(M, { highs: P3.highs.map(kk), lows: P3.lows.map(kk) }, { from: FROM }).filter((e) => e.decisionT <= TO)
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, S4 = magnetScores(G4)
const G1 = resample(HR), A1 = atrArr(G1, 14), G15 = resample(M15), RB = bubbleEvents(G15, undefined, M15).events
const lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
const rbTimes = { BEAR: RB.filter((b) => b.side === 'BEAR').map((b) => b.knownT), BULL: RB.filter((b) => b.side === 'BULL').map((b) => b.knownT) }
const recent = (arr, lo, hi) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m] < lo) a = m + 1; else b = m } return a < arr.length && arr[a] <= hi }
for (const e of ev) { e.hold = holdLabel(M, e); const up = e.type === 'floor', T = e.t   // context at the TOUCH minute's open (known before)
  const i4 = lastClosed(G4, H4, T), s = i4 >= 0 ? S4[i4] : null
  e.against = !!s && (up ? s.short >= 65 : s.long >= 65); e.withM = !!s && (up ? s.long >= 65 : s.short >= 65)
  const i1 = lastClosed(G1, HR, T), a1 = i1 >= 0 ? A1[i1] : null, k0 = lb(T), kb = lb(T - 60 * 60000)
  const mv = k0 > 0 && kb < k0 ? (M[k0 - 1].c - M[kb].c) * (up ? -1 : 1) : null              // movement TOWARD the wall over the last hour
  e.app = a1 > 0 && mv != null ? mv / a1 : null; e.weak = e.app != null && e.app < 0.5; e.strongApp = e.app != null && e.app >= 1.5
  e.exhaust = recent(rbTimes[up ? 'BULL' : 'BEAR'], T - 8 * M15, T)
  // swing follow-through within 4 h after the decision
  const c0 = M[e.di].c; let best = 0; for (let j = e.di + 1; j < M.length && M[j].t <= e.decisionT + 4 * HR; j++) best = Math.max(best, up ? M[j].h - c0 : c0 - M[j].l)
  e.ft10 = best >= 10; e.ft20 = best >= 20; e.split = e.decisionT < SPLIT ? 'train' : 'oos' }
const lab = ev.filter((e) => e.hold != null), oos = lab.filter((e) => e.split === 'oos'), trn = lab.filter((e) => e.split === 'train')
const rate = (xs, k) => xs.length ? xs.filter((e) => e[k]).length / xs.length : null, f4 = (x) => x == null ? null : +x.toFixed(4)
let seed = 2718; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const weeks = (xs) => { const m = new Map(); for (const e of xs) { const w = Math.floor((e.decisionT + 4 * 86400000) / (7 * 86400000)); if (!m.has(w)) m.set(w, []); m.get(w).push(e) } return [...m.values()] }
const bootQ = (xs, stat, a) => { const B = weeks(xs), n = B.length, v = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < n; i++) s.push(...B[(rnd() * n) | 0]); const x = stat(s); if (x != null && Number.isFinite(x)) v.push(x) } v.sort((p, q) => p - q); return [v[Math.floor(a * v.length)], v[Math.floor((1 - a) * v.length)]] }
const res = { at: new Date().toISOString(), spec: 'docs/WALL_CONTEXT_SPEC.md', tests: ev.length, labelled: lab.length, base_hold: { oos: f4(rate(oos, 'hold')), train: f4(rate(trn, 'hold')) }, pre_touch: {}, on_bubble: {}, swing: {} }
console.log(`${ev.length} swing-wall tests · OOS base hold ${res.base_hold.oos} · TRAIN ${res.base_hold.train}`)
// ── pre-touch cells (K = 3) + reported contexts ──
const CTX = { 'AGAINST-MACRO': (e) => e.against, 'WEAK-APPROACH': (e) => e.weak, 'RSI-EXHAUST': (e) => e.exhaust, 'WITH-MACRO': (e) => e.withM, 'STRONG-APPROACH': (e) => e.strongApp }
for (const [k, f] of Object.entries(CTX)) { const d = (s) => { const a = rate(s.filter(f), 'hold'), b = rate(s, 'hold'); return a == null ? null : a - b }, O = oos.filter(f)
  const [lo, hi] = bootQ(oos, d, 0.05 / 3), dO = d(oos), dT = d(trn), pre = ['AGAINST-MACRO', 'WEAK-APPROACH', 'RSI-EXHAUST'].includes(k)
  const r = { oos_n: O.length, oos_hold: f4(rate(O, 'hold')), oos_diff: f4(dO), ci: [f4(lo), f4(hi)], train_diff: f4(dT), era: { pre2020: f4(d(lab.filter((e) => e.decisionT < Y2020))), post2020: f4(d(lab.filter((e) => e.decisionT >= Y2020))) },
    by_side: { ceiling: f4(rate(O.filter((e) => e.type === 'ceiling'), 'hold')), floor: f4(rate(O.filter((e) => e.type === 'floor'), 'hold')) } }
  if (pre) r.verdict = O.length >= 300 && Math.abs(dO) >= 0.05 && ((dO > 0 && lo > 0) || (dO < 0 && hi < 0)) && Math.sign(dT) === Math.sign(dO) ? 'INFORMATIVE' : 'NO_EFFECT'
  res.pre_touch[k] = r
  console.log(`  pre-touch ${k.padEnd(15)} OOS n ${String(O.length).padStart(5)} hold ${r.oos_hold} diff ${(dO * 100).toFixed(1)}pp [${(lo * 100).toFixed(1)}, ${(hi * 100).toFixed(1)}] · TRAIN ${(dT * 100).toFixed(1)}pp · pre/post ${(r.era.pre2020 * 100).toFixed(1)}/${(r.era.post2020 * 100).toFixed(1)}${r.verdict ? ' → ' + r.verdict : ''}`)
  // context ON TOP of the bubbles (reported)
  for (const [bk, bf] of [['DEFENSE', (e) => e.defense], ['DEF>PUSH', (e) => e.defStronger]]) { const a = rate(oos.filter((e) => bf(e) && f(e)), 'hold'), b = rate(oos.filter(bf), 'hold'), at = rate(trn.filter((e) => bf(e) && f(e)), 'hold'), bt = rate(trn.filter(bf), 'hold')
    res.on_bubble[`${bk}+${k}`] = { oos_n: oos.filter((e) => bf(e) && f(e)).length, oos_hold: f4(a), bubble_alone: f4(b), diff: f4(a - b), train_diff: f4(at - bt) } } }
console.log('  on top of the bubble (reported): ' + Object.entries(res.on_bubble).map(([k, v]) => `${k} ${v.oos_hold} vs ${v.bubble_alone} (${v.diff == null ? '—' : (v.diff * 100).toFixed(1)}pp, TRAIN ${(v.train_diff * 100).toFixed(1)}, n ${v.oos_n})`).join(' · '))
// ── swing follow-through ──
const SW3 = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_walls_study.json'), 'utf8')).variants['3m'].strong_threshold_train_p66   // the SWING 3m STRONG cut-off (study (bc), TRAIN-only)
const held = (s) => s.filter((e) => e.hold), strongDef = (e) => e.defStronger || (e.defense && e.mag > SW3)
for (const k of ['ft10', 'ft20']) { const allH = held(oos), sh = allH.filter(strongDef), d = (s) => { const H = held(s), a = rate(H.filter(strongDef), k), b = rate(H, k); return a == null ? null : a - b }, [lo] = bootQ(oos, d, 0.05 / 2), dT = d(trn)
  res.swing[k] = { held_all: { n: allH.length, rate: f4(rate(allH, k)) }, held_defended: { n: held(oos).filter((e) => e.defense).length, rate: f4(rate(held(oos).filter((e) => e.defense), k)) }, held_strong_or_defpush: { n: sh.length, rate: f4(rate(sh, k)) },
    all_tests: f4(rate(oos, k)), diff: f4(d(oos)), lb: f4(lo), train_diff: f4(dT), against_macro_held_defended: f4(rate(held(oos).filter((e) => e.defense && e.against), k)),
    verdict: k === 'ft20' ? (sh.length >= 300 && d(oos) >= 0.05 && lo > 0 && dT > 0 ? 'INFORMATIVE' : 'NO_EFFECT') : 'REPORTED' }
  const r = res.swing[k]; console.log(`  swing ${k.toUpperCase()} within 4 h: all tests ${r.all_tests} · held ${r.held_all.rate} · held+defended ${r.held_defended.rate} · held+DEF>PUSH/STRONG ${r.held_strong_or_defpush.rate} (n ${r.held_strong_or_defpush.n}) diff ${(r.diff * 100).toFixed(1)}pp LB ${(r.lb * 100).toFixed(1)} TRAIN ${(r.train_diff * 100).toFixed(1)} · against-macro held+defended ${r.against_macro_held_defended} → ${r.verdict}`) }
res.informative = [...Object.entries(res.pre_touch).filter(([, v]) => v.verdict === 'INFORMATIVE').map(([k]) => k), ...Object.entries(res.swing).filter(([, v]) => v.verdict === 'INFORMATIVE').map(([k]) => 'swing ' + k)]
fs.writeFileSync(path.join(TURBO.master, 'wall_context_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> INFORMATIVE: ${res.informative.join(', ') || 'none'}`)
