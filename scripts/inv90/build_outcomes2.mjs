// inv90/build_outcomes2.mjs — Part 4 outcomes (docs/INVESTIGATION_90WR_2026-10-11.md, pre-registered): for every dataset row, BUY and SELL in
// I1 (0.25 H / 2.5 H, intraday, forced exit 20:55 UTC, entries < 18:00), I2 (0.15 H / 1.5 H, same), D1 (0.2 D / 2 D, 7 d), D2 (0.3 D / 3 D, 7 d).
// H = ATR14 of the closed 4h bars, D = ATR14 of the closed 1d bars. Per (side, bracket): net, net at spread × 1.5, duration (min), nights held
// (21:00 UTC crossings). Chunked: node build_outcomes2.mjs <chunk> <chunks>  → data/inv90/outcomes2_<chunk>.bin (+ merge with --merge).
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { atr } from '../../src/core/indicators.js'
import { makeSpreadAt } from '../../src/master/spreadModel.js'
import { loadDataset, DIR } from './gate.mjs'

const BRK = [['I1', 0.25, 2.5, 'H'], ['I2', 0.15, 1.5, 'H'], ['D1', 0.2, 2, 'D'], ['D2', 0.3, 3, 'D']], SIDES = ['BUY', 'SELL'], STATS = ['net', 'net15', 'dur', 'nights']
const COLS = SIDES.flatMap((s) => BRK.flatMap(([b]) => STATS.map((x) => `${s}_${b}_${x}`))), WC = COLS.length
if (process.argv[2] === '--merge') {
  const chunks = +process.argv[3], parts = []; for (let i = 0; i < chunks; i++) parts.push(fs.readFileSync(path.join(DIR, `outcomes2_${i}.bin`)))
  fs.writeFileSync(path.join(DIR, 'outcomes2.bin'), Buffer.concat(parts)); fs.writeFileSync(path.join(DIR, 'outcomes2_meta.json'), JSON.stringify({ at: new Date().toISOString(), cols: COLS, width: WC, brackets: BRK }, null, 1))
  console.log('merged', chunks); process.exit(0)
}
const chunk = +process.argv[2], chunks = +process.argv[3], ds = loadDataset(), DAY = 86400000, HR = 3600000
const r0 = Math.floor((chunk * ds.n) / chunks), r1 = Math.floor(((chunk + 1) * ds.n) / chunks)
const M = (await loadBars('XAUUSD', '1m', { from: Date.UTC(2013, 6, 14), to: Date.parse('2026-10-09T06:00:00Z') })).bars, N = M.length
const mt = new Float64Array(N), mh = new Float64Array(N), ml = new Float64Array(N), mc = new Float64Array(N); for (let i = 0; i < N; i++) { mt[i] = M[i].t; mh[i] = M[i].h; ml[i] = M[i].l; mc[i] = M[i].c }
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const spreadFn = makeSpreadAt(), h0 = Math.floor(mt[0] / HR), SPH = new Float32Array(Math.floor(mt[N - 1] / HR) - h0 + 2); for (let h = 0; h < SPH.length; h++) SPH[h] = spreadFn((h0 + h) * HR)
const spread = (t) => SPH[Math.floor(t / HR) - h0]
const atrOf = async (tf, ms) => { const B = (await loadBars('XAUUSD', tf, { from: Date.UTC(2013, 6, 14), to: Date.parse('2026-10-09T06:00:00Z') })).bars, a = atr(B, 14); return { close: Float64Array.from(B.map((b) => b.t + ms)), a } }
const A4 = await atrOf('4h', 4 * HR), A1d = await atrOf('1d', DAY)
const atAt = (X, T) => { const i = lb(X.close, T + 1) - 1; return i >= 0 ? X.a[i] : null }
const out = new Float32Array((r1 - r0) * WC).fill(NaN)
const nights = (a, b) => { let n = 0; for (let d = Math.floor(a / DAY) * DAY + 21 * HR; d < b; d += DAY) if (d > a) n++; return n }
for (let r = r0; r < r1; r++) {
  const T = ds.T[r], k0 = lb(mt, T); if (k0 <= 0) continue; const c = mc[k0 - 1], H = atAt(A4, T), D = atAt(A1d, T); if (!(H > 0) || !(D > 0)) continue
  const hour = (T % DAY) / HR, intraEnd = Math.floor(T / DAY) * DAY + 20 * HR + 55 * 60000
  for (let si = 0; si < 2; si++) { const up = si === 0
    for (const mult of [1, 1.5]) {
      const s0 = mult * spread(T), entry = up ? c + s0 : c
      const Bs = BRK.map(([, t, s, u], bi) => { const U = u === 'H' ? H : D, ok = u === 'H' ? hour < 18 : T + 7 * DAY <= mt[N - 1]
        return { bi, ok, end: u === 'H' ? intraEnd : T + 7 * DAY, tg: up ? entry + t * U : entry - t * U, st: up ? entry - s * U : entry + s * U, win: t * U, slip: Math.min(0.3, 0.05 * U), done: !ok } })
      let left = Bs.filter((b) => !b.done).length, k = k0
      const put = (b, net, tExit) => { const o = (r - r0) * WC + (si * 4 + b.bi) * 4; if (mult === 1) { out[o] = net; out[o + 2] = (tExit - T) / 60000; out[o + 3] = nights(T, tExit) } else out[o + 1] = net }
      for (; k < N && left; k++) { const t = mt[k], s = mult * spread(t)
        for (const b of Bs) { if (b.done) continue
          if (t >= b.end) { const j = k - 1, px = up ? mc[j] : mc[j] + mult * spread(mt[j]); put(b, up ? px - entry : entry - px, mt[j] + 60000); b.done = true; left--; continue }
          if (up ? ml[k] <= b.st : mh[k] + s >= b.st) { put(b, -(Math.abs(entry - b.st) + b.slip), t + 60000); b.done = true; left--; continue }
          if (up ? mh[k] >= b.tg : ml[k] + s <= b.tg) { put(b, b.win, t + 60000); b.done = true; left-- } } }
      for (const b of Bs) if (!b.done) { const j = Math.min(k, N) - 1, px = up ? mc[j] : mc[j] + mult * spread(mt[j]); put(b, up ? px - entry : entry - px, mt[j] + 60000) }
    } }
  if ((r - r0) % 20000 === 0) console.log(`chunk ${chunk}: row ${r - r0}/${r1 - r0}`)
}
fs.writeFileSync(path.join(DIR, `outcomes2_${chunk}.bin`), Buffer.from(out.buffer)); console.log(`chunk ${chunk} done`)
