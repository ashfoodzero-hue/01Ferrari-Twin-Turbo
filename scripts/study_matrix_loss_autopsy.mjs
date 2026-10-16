// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_loss_autopsy.mjs — Matrix SCALP BUY loss autopsy: 15 pre-trigger facts, TRAIN-only selection, ONE OOS test (2026-10-16).
// Pre-registered: docs/MATRIX_LOSS_AUTOPSY_SPEC.md. Output: data/master/matrix_loss_autopsy.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr, ema } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { emaSeries, wtiHourAt, matrixLevelsAt, MATRIX } from '../src/master/ferrariMatrix.js'
import { readMarketState } from '../src/master/marketState.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'
import { matrixTrades, wti1m } from './lib/matrix_trades.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.parse('2024-10-10T00:00:00Z'), K = 4, ALPHA = 0.05 / K, spreadAt = makeSpreadAt()
const { fires, B, m1 } = await matrixTrades({ from: FROM, to: TO, useWti: true, spreadAt })
const pre = FROM - 6 * 86400000, W = wti1m(TO)
const D3 = (await loadDxyBars('3m', { from: pre, to: TO })).bars, D15 = (await loadDxyBars('15m', { from: pre, to: TO })).bars, D1h = (await loadDxyBars('1h', { from: pre, to: TO })).bars
const S3 = (await loadBars('XAGUSD', '3m', { from: pre, to: TO })).bars, S15 = (await loadBars('XAGUSD', '15m', { from: pre, to: TO })).bars
const G15 = (await loadBars('XAUUSD', '15m', { from: pre - 10 * 86400000, to: TO })).bars, G1h = (await loadBars('XAUUSD', '1h', { from: pre - 20 * 86400000, to: TO })).bars
async function* it() { for (const b of m1) yield b }
const G4 = (await resample4h((async function* () { for (const b of (await loadBars('XAUUSD', '1m', { from: FROM - 200 * 86400000, to: TO })).bars) yield b })(), ['ny'])).ny, S4 = magnetScores(G4)
const emaMap = (bars, n) => emaSeries(bars, n), lastClosed = (bars, ms, T) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t + ms <= T) lo = m + 1; else hi = m } return lo - 1 }
const eD3 = emaMap(D3, 10), eD15 = emaMap(D15, 10), eD1h = emaMap(D1h, 10), eS3 = emaMap(S3, 10), eS15 = emaMap(S15, 10), eG15 = emaMap(G15, 20), eG1h = emaMap(G1h, 20)
const aD3 = atrArr(D3, 14), aB = atrArr(B, 14), d3i = new Map(D3.map((b, i) => [b.t, i]))
const side = (bars, e, ms, T) => { const j = lastClosed(bars, ms, T); return j >= 0 && e.get(bars[j].t) != null ? (bars[j].c > e.get(bars[j].t) ? 'up' : 'down') : null }
const buys = fires.filter((f) => f.side === 'BUY' && f.fold >= 0)
for (const f of buys) { const s = f.sig, i = s.i, T = s.decisionT, b = B[i], x = {}
  const di = d3i.get(b.t); x.f1 = di != null && aD3[di] > 0 ? (D3[di].c - eD3.get(b.t)) / aD3[di] : null
  const dp = d3i.get(B[i - 1]?.t); x.f2 = dp != null ? (D3[dp].c >= eD3.get(B[i - 1].t) ? 'yes' : 'no') : null
  x.f3 = side(D15, eD15, 900000, T); x.f4 = side(D1h, eD1h, 3600000, T)
  const wp = wtiHourAt(W, B[i - 1].t + MATRIX.tfMs); x.f5 = wp ? (wp.bullish ? 'yes' : 'no') : null
  x.f6 = side(S3, eS3, 180000, T); x.f7 = side(S15, eS15, 900000, T); x.f8 = side(G15, eG15, 900000, T); x.f9 = side(G1h, eG1h, 3600000, T)
  const L = matrixLevelsAt(B, aB[i], i); x.f10 = L ? (b.l - L.buyLine) / aB[i] : null
  const win = aB.slice(Math.max(0, i - 2400), i).filter((v) => v > 0); x.f11 = win.length ? win.filter((v) => v < aB[i]).length / win.length : null
  const h = new Date(T).getUTCHours(); x.f12 = h >= 22 || h < 7 ? 'Asia' : h < 12 ? 'London' : h < 17 ? 'NY' : 'late'
  const j15 = lastClosed(G15, 900000, T), ms = j15 >= 150 ? readMarketState(G15.slice(j15 - 149, j15 + 1)) : null; x.f13 = ms ? (['DISCOUNT', 'EQUILIBRIUM', 'PREMIUM'].includes(ms.state) ? ms.state : 'TREND/BREAKOUT') : null
  const j4 = lastClosed(G4, 4 * 3600000, T), mg = j4 >= 0 ? S4[j4] : null; x.f14 = mg ? (mg.long >= 65 ? '>=65' : mg.long <= 34 ? '<=34' : '35-64') : null
  x.f15 = aB[i] > 0 ? Math.abs(b.c - b.o) / aB[i] : null
  f.x = x }
const NUM = ['f1', 'f10', 'f11', 'f15'], NAMES = { f1: 'DXY 3m dist from EMA (ATR)', f2: 'DXY flipped on the signal bar', f3: 'DXY 15m trend', f4: 'DXY 1h trend', f5: 'WTI flipped on the signal bar', f6: 'Silver 3m trend', f7: 'Silver 15m trend', f8: 'Gold 15m trend', f9: 'Gold 1h trend', f10: 'Depth below wall (ATR)', f11: '3m ATR percentile', f12: 'Session', f13: 'Market state', f14: '4H Macro long score', f15: 'Trigger candle body (ATR)' }
const T_ = buys.filter((f) => f.fold < 5), O_ = buys.filter((f) => f.fold >= 5)
const cut = {}; for (const k of NUM) { const v = T_.map((f) => f.x[k]).filter((z) => z != null).sort((a, b) => a - b); cut[k] = [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]] }
const bin = (f, k) => { const v = f.x[k]; if (v == null) return null; if (!NUM.includes(k)) return v; return v < cut[k][0] ? 'low' : v < cut[k][1] ? 'mid' : 'high' }
const mean = (xs) => xs.length ? xs.reduce((a, f) => a + f.net, 0) / xs.length : null, wr = (xs) => xs.length ? xs.filter((f) => f.net > 0).length / xs.length : null
const f3 = (v) => v == null ? null : +v.toFixed(3)
const tAll = mean(T_), oAll = mean(O_), facts = {}
for (const k of Object.keys(NAMES)) { const bins = [...new Set(buys.map((f) => bin(f, k)).filter((z) => z != null))]
  const table = Object.fromEntries(bins.map((bv) => { const t = T_.filter((f) => bin(f, k) === bv), o = O_.filter((f) => bin(f, k) === bv); return [bv, { train_n: t.length, train_net: f3(mean(t)), train_wr: f3(wr(t)), oos_n: o.length, oos_net: f3(mean(o)), oos_wr: f3(wr(o)) }] }))
  const keepBins = bins.filter((bv) => table[bv].train_net != null && table[bv].train_net > tAll), keep = (f) => keepBins.includes(bin(f, k))
  const kt = T_.filter(keep), share = kt.length / T_.length
  facts[k] = { name: NAMES[k], table, keep_bins: keepBins, train_gain: keepBins.length && keepBins.length < bins.length && share >= 0.3 ? f3(mean(kt) - tAll) : null, keep } }
const ranked = Object.entries(facts).filter(([, v]) => v.train_gain != null).sort((a, b) => b[1].train_gain - a[1].train_gain).slice(0, 3)
let seed = 77; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const boot = (xs, keep) => { const g = [], m = []; for (let b = 0; b < 4000; b++) { const s = []; for (let i = 0; i < xs.length; i++) s.push(xs[(rnd() * xs.length) | 0]); const kk = s.filter(keep); if (!kk.length) continue; g.push(mean(kk) - mean(s)); m.push(mean(kk)) } g.sort((a, b) => a - b); m.sort((a, b) => a - b); return { gain_lb: f3(g[Math.floor(ALPHA * g.length)]), kept_lb: f3(m[Math.floor(ALPHA * m.length)]) } }
const CELLS = {}; ranked.forEach(([k, v], idx) => { CELLS[`top${idx + 1}: ${v.name} keep ${v.keep_bins.join('/')}`] = v.keep })
if (ranked.length >= 2) CELLS[`top1 AND top2`] = (f) => ranked[0][1].keep(f) && ranked[1][1].keep(f)
const res = { at: new Date().toISOString(), spec: 'docs/MATRIX_LOSS_AUTOPSY_SPEC.md', buys: { train: T_.length, oos: O_.length }, all: { train_net: f3(tAll), oos_net: f3(oAll), train_wr: f3(wr(T_)), oos_wr: f3(wr(O_)) }, cuts: cut, facts: Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, { name: v.name, table: v.table, keep_bins: v.keep_bins, train_gain: v.train_gain }])), tests: {} }
console.log(`BUY trades TRAIN ${T_.length} (mean ${f3(tAll)}, WR ${f3(wr(T_))}) · OOS ${O_.length} (mean ${f3(oAll)}, WR ${f3(wr(O_))})`)
for (const [k, v] of Object.entries(facts)) console.log(`  ${v.name.padEnd(30)} TRAIN gain ${v.train_gain ?? '—'} keep [${v.keep_bins.join(', ')}] · ` + Object.entries(v.table).map(([b, t]) => `${b}: T ${t.train_net}/${t.train_n} O ${t.oos_net}/${t.oos_n}`).join(' | '))
console.log('\nTRAIN-selected top 3: ' + ranked.map(([k, v]) => `${v.name} (+${v.train_gain})`).join(', '))
for (const [name, keep] of Object.entries(CELLS)) { const kept = O_.filter(keep), b = boot(O_, keep), gain = mean(kept) - oAll
  const avoids = kept.length >= 100 && gain >= 0.5 && b.gain_lb > 0, profitable = avoids && mean(kept) > 0 && b.kept_lb > 0
  res.tests[name] = { oos_kept_n: kept.length, oos_kept_net: f3(mean(kept)), oos_kept_wr: f3(wr(kept)), oos_gain: f3(gain), ...b, verdict: profitable ? 'PROFITABLE' : avoids ? 'AVOIDS_LOSERS' : 'NO' }
  console.log(`OOS ${name}: kept ${kept.length} mean ${f3(mean(kept))} WR ${f3(wr(kept))} · gain ${f3(gain)} LB ${b.gain_lb} · kept LB ${b.kept_lb} → ${res.tests[name].verdict}`) }
fs.writeFileSync(path.join(TURBO.master, 'matrix_loss_autopsy.json'), JSON.stringify(res, null, 1))
