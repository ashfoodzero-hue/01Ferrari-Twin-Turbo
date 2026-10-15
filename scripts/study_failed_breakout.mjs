// ════════════════════════════════════════════════════════════════════════════════
// study_failed_breakout.mjs — FAILED BREAKOUT / BREAKDOWN (sweep the 45-bar range edge, close back inside) on 3m and 15m (2026-10-15).
// Rules pre-registered in docs/FAILED_BREAKOUT_SPEC.md. Output: data/master/failed_breakout_study.json
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
const LOOK = 45, POKE = 0.1, PAD = 0.5, K = 8, ALPHA = 0.05 / K, spreadAt = makeSpreadAt(), L = { from: FROM - 5 * 86400000, to: TO }
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const D3 = (await loadDxyBars('3m', L)).bars, S3 = (await loadBars('XAGUSD', '3m', L)).bars, dE = emaSeries(D3, 10), sE = emaSeries(S3, 10)
const D3t = Float64Array.from(D3.map((b) => b.t)), S3t = Float64Array.from(S3.map((b) => b.t))
const lastClosed3 = (T, arr) => lb(arr, T - 180000 + 1) - 1   // the 3m bar whose close ≤ T
function agree(T, sell) { const di = lastClosed3(T, D3t), si = lastClosed3(T, S3t); if (di < 0 || si < 0) return false
  const dBull = D3[di].c > dE.get(D3[di].t), sBull = S3[si].c > sE.get(S3[si].t); return sell ? dBull && !sBull : !dBull && sBull }
function trade(T, up, entryBid, sl, k, a, hz) { const s0 = spreadAt(T), fill = up ? entryBid + s0 : entryBid, R = up ? fill - sl : sl - fill; if (!(R > 0)) return null
  const tgt = up ? fill + k * R : fill - k * R, slip = Math.min(0.3, 0.05 * a); let j = lb(MT, T)
  for (; j < M.length && M[j].t < T + hz; j++) { const b = M[j], s = spreadAt(b.t)
    if (up ? b.l <= sl : b.h + s >= sl) return { net: -(R + slip), R, exitT: b.t }
    if (up ? b.h >= tgt : b.l + s <= tgt) return { net: k * R, R, exitT: b.t } }
  const z = M[Math.min(j, M.length) - 1]; return { net: up ? z.c - fill : fill - (z.c + spreadAt(z.t)), R, exitT: z.t } }
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((s, x) => s + x.net, 0) / n : null, rnd = seeded(9), bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let j = 0; j < n; j++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_R: n ? +(tr.reduce((s, x) => s + x.R, 0) / n).toFixed(2) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7, cells = {}
for (const [tf, ms, hz] of [['3m', 180000, 4 * 3600000], ['15m', 900000, 12 * 3600000]]) {
  const B = (await loadBars('XAUUSD', tf, L)).bars.filter((b) => b.t + ms <= TO), A = atrArr(B, 14), EV = []
  for (let i = LOOK; i < B.length; i++) { const b = B[i], a = A[i]; if (b.t < FROM || !(a > 0)) continue
    let H = -Infinity, Lo = Infinity; for (let k = i - LOOK; k < i; k++) { if (B[k].h > H) H = B[k].h; if (B[k].l < Lo) Lo = B[k].l }
    const T = b.t + ms
    if (b.h > H + POKE * a && b.c < H && b.c < b.o) EV.push({ T, side: 'SELL', entry: b.c, sl: b.h + PAD, a })
    else if (b.l < Lo - POKE * a && b.c > Lo && b.c > b.o) EV.push({ T, side: 'BUY', entry: b.c, sl: b.l - PAD, a }) }
  console.log(`${tf}: setups ${EV.length} (SELL ${EV.filter((e) => e.side === 'SELL').length}, BUY ${EV.filter((e) => e.side === 'BUY').length})`)
  for (const filt of ['base', 'D+S']) for (const k of [1, 2]) { const tr = []; let busy = -Infinity
    for (const e of EV) { if (e.T < busy) continue; if (filt === 'D+S' && !agree(e.T, e.side === 'SELL')) continue
      const r = trade(e.T, e.side === 'BUY', e.entry, e.sl, k, e.a, hz); if (!r) continue; busy = r.exitT + 60000; tr.push({ t: e.T, side: e.side, ...r }) }
    const TR = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), OOS = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO))
    const side = Object.fromEntries(['SELL', 'BUY'].map((s) => [s, summ(tr.filter((x) => x.t >= SPLIT && x.side === s))]))
    const verdict = OOS.n >= 100 && OOS.net_lb > 0 && TR.net > 0 ? 'PASS' : OOS.n < 100 ? 'UNDERPOWERED' : 'FAIL'
    cells[`${tf}|${filt}|${k}R`] = { train: TR, oos: OOS, oos_by_side: side, verdict }
    console.log(`${(tf + ' ' + filt + ' ' + k + 'R').padEnd(14)} OOS n ${String(OOS.n).padStart(5)} (${OOS.per_day}/d) WR ${OOS.wr} $/t ${OOS.net} [LB ${OOS.net_lb}] SL$ ${OOS.avg_R} · TRAIN WR ${TR.wr} $/t ${TR.net} · SELL ${side.SELL.wr}/${side.SELL.net} BUY ${side.BUY.wr}/${side.BUY.net} → ${verdict}`) } }
const pass = Object.entries(cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'failed_breakout_study.json'), JSON.stringify({ at: new Date().toISOString(), spec: 'docs/FAILED_BREAKOUT_SPEC.md', k: K, cells, passing: pass, verdict: pass.length ? 'SOME_PASS' : 'NO_PASS' }, null, 1))
console.log(`\n=> FAILED BREAKOUT: ${pass.length ? 'PASS ' + pass.join(', ') : 'NO_PASS'}`)
