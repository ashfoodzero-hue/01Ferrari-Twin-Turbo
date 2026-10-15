// ════════════════════════════════════════════════════════════════════════════════
// study_trigger_breakout.mjs — the chart's BUY / SELL TRIGGER (marketState.js confirmed break: close beyond range ± 0.3·ATR on ≥ 1.4×
// volume, 15m) traded in the break direction (2026-10-15). Rules pre-registered in docs/TRIGGER_BREAKOUT_SPEC.md.
// Output: data/master/trigger_breakout_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { emaSeries } from '../src/master/ferrariMatrix.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const LOOK = 48, BRK = 0.3, VOL = 1.4, MS = 900000, HZ = 86400000, K = 8, ALPHA = 0.05 / K, spreadAt = makeSpreadAt(), L = { from: FROM - 5 * 86400000, to: TO }
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const D3 = (await loadDxyBars('3m', L)).bars, S3 = (await loadBars('XAGUSD', '3m', L)).bars, dE = emaSeries(D3, 10), sE = emaSeries(S3, 10)
const D3t = Float64Array.from(D3.map((b) => b.t)), S3t = Float64Array.from(S3.map((b) => b.t)), lc = (T, arr) => lb(arr, T - 180000 + 1) - 1
const agree = (T, up) => { const di = lc(T, D3t), si = lc(T, S3t); if (di < 0 || si < 0) return false; const dB = D3[di].c > dE.get(D3[di].t), sB = S3[si].c > sE.get(S3[si].t); return up ? !dB && sB : dB && !sB }
const B = (await loadBars('XAUUSD', '15m', L)).bars.filter((b) => b.t + MS <= TO), A = atrArr(B, 14), EV = []
for (let i = LOOK; i < B.length; i++) { const b = B[i], a = A[i]; if (b.t < FROM || !(a > 0)) continue
  let rh = -Infinity, rl = Infinity, v = 0; for (let k = i - LOOK; k < i; k++) { rh = Math.max(rh, B[k].h); rl = Math.min(rl, B[k].l); v += B[k].v || 0 }
  const surge = v > 0 && (b.v || 0) >= VOL * (v / LOOK), T = b.t + MS
  if (surge && b.c > rh + BRK * a) EV.push({ T, up: true, c: b.c, a, edge: rh })
  else if (surge && b.c < rl - BRK * a) EV.push({ T, up: false, c: b.c, a, edge: rl }) }
console.log(`trigger events ${EV.length} (BUY ${EV.filter((e) => e.up).length}, SELL ${EV.filter((e) => !e.up).length}) · 15m bars ${B.length}`)
function trade(e, slMode, k) { const s0 = spreadAt(e.T), fill = e.up ? e.c + s0 : e.c
  const sl = slMode === 'S1' ? (e.up ? fill - e.a : fill + e.a) : (e.up ? e.edge - 0.25 * e.a : e.edge + 0.25 * e.a), R = e.up ? fill - sl : sl - fill; if (!(R > 0)) return null
  const tgt = e.up ? fill + k * R : fill - k * R, slip = Math.min(0.3, 0.05 * e.a); let j = lb(MT, e.T)
  for (; j < M.length && M[j].t < e.T + HZ; j++) { const b = M[j], s = spreadAt(b.t)
    if (e.up ? b.l <= sl : b.h + s >= sl) return { net: -(R + slip), R, exitT: b.t }
    if (e.up ? b.h >= tgt : b.l + s <= tgt) return { net: k * R, R, exitT: b.t } }
  const z = M[Math.min(j, M.length) - 1]; return { net: e.up ? z.c - fill : fill - (z.c + spreadAt(z.t)), R, exitT: z.t } }
let sd = 13; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((s, x) => s + x.net, 0) / n : null, bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let j = 0; j < n; j++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_R: n ? +(tr.reduce((s, x) => s + x.R, 0) / n).toFixed(2) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7, cells = {}
for (const slMode of ['S1', 'S2']) for (const k of [1, 2]) for (const filt of ['base', 'D+S']) { const tr = []; let busy = -Infinity
  for (const e of EV) { if (e.T < busy || (filt === 'D+S' && !agree(e.T, e.up))) continue; const r = trade(e, slMode, k); if (!r) continue; busy = r.exitT + 60000; tr.push({ t: e.T, side: e.up ? 'BUY' : 'SELL', ...r }) }
  const TR = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), OOS = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO)), side = Object.fromEntries(['BUY', 'SELL'].map((s) => [s, summ(tr.filter((x) => x.t >= SPLIT && x.side === s))]))
  const verdict = OOS.n >= 100 && OOS.net_lb > 0 && TR.net > 0 ? 'PASS' : OOS.n < 100 ? 'UNDERPOWERED' : 'FAIL'
  cells[`${slMode}|${k}R|${filt}`] = { train: TR, oos: OOS, oos_by_side: side, verdict }
  console.log(`${(slMode + ' ' + k + 'R ' + filt).padEnd(12)} OOS n ${String(OOS.n).padStart(4)} (${OOS.per_day}/d) WR ${OOS.wr} $/t ${OOS.net} [LB ${OOS.net_lb}] SL$ ${OOS.avg_R} · TRAIN WR ${TR.wr} $/t ${TR.net} · BUY ${side.BUY.wr}/${side.BUY.net} SELL ${side.SELL.wr}/${side.SELL.net} → ${verdict}`) }
const pass = Object.entries(cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k), best = Object.entries(cells).sort((a, b) => b[1].oos.net - a[1].oos.net)[0]
fs.writeFileSync(path.join(TURBO.master, 'trigger_breakout_study.json'), JSON.stringify({ at: new Date().toISOString(), spec: 'docs/TRIGGER_BREAKOUT_SPEC.md', events: EV.length, k: K, cells, passing: pass, best_oos: best[0], verdict: pass.length ? 'SOME_PASS' : 'NO_PASS' }, null, 1))
console.log(`\n=> TRIGGER BREAKOUT: ${pass.length ? 'PASS ' + pass.join(', ') : 'NO_PASS'} · best OOS cell ${best[0]}`)
