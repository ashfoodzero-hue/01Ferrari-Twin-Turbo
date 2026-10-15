// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_85wr.mjs — the Ferrari Matrix entries with high-WR exit geometries (2026-10-15). Pre-registered: docs/MATRIX_85WR_SPEC.md.
// Output: data/master/matrix_85wr_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixSignals } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), F13 = HISTORY_CONTINUOUS_FROM + 7 * 86400000, WTI_FROM = Date.parse('2024-10-10T00:00:00Z')
const K = 6, ALPHA = 0.05 / K, Z = zOf(K), HZ = 86400000, spreadAt = makeSpreadAt()
async function run(from, useWti) {
  const B = (await loadBars('XAUUSD', '3m', { from: from - 3 * 86400000, to: TO })).bars, D = (await loadDxyBars('3m', { from: from - 3 * 86400000, to: TO })).bars
  const M = (await loadBars('XAUUSD', '1m', { from, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
  const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
  const startI = B.findIndex((b) => b.t >= from), sigs = matrixSignals(B, D, useWti ? wti1m(TO) : [], { from: startI, useWti })
  const SPLIT = from + 0.6 * (TO - from), out = {}
  console.log(`${useWti ? 'WTI 2y' : 'no-WTI 13y'}: ${sigs.length} Matrix signals`)
  for (const m of [1, 2, 3]) for (const k of [0.25, 0.5]) { const tr = []; let busy = -Infinity
    for (const s of sigs) { if (s.decisionT <= busy || s.decisionT + HZ > TO) continue
      const up = s.side === 'BUY', r = s.risk, s0 = spreadAt(s.decisionT), fill = up ? s.entry + s0 : s.entry, sl = up ? fill - m * r : fill + m * r, tgt = up ? fill + k * r : fill - k * r
      const slip = Math.min(0.3, 0.05 * (s.atr || r)); let j = lb(s.decisionT), res = null
      for (; j < M.length && M[j].t < s.decisionT + HZ; j++) { const b = M[j], sp = spreadAt(b.t)
        if (up ? b.l <= sl : b.h + sp >= sl) { res = { net: -(m * r + slip), exitT: b.t }; break }
        if (up ? b.h >= tgt : b.l + sp <= tgt) { res = { net: k * r, exitT: b.t }; break } }
      if (!res) { const z = M[Math.min(j, M.length) - 1]; res = { net: up ? z.c - fill : fill - (z.c + spreadAt(z.t)), exitT: z.t } }
      busy = res.exitT + 60000; tr.push({ t: s.decisionT, ...res }) }
    let sd = 17; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
    const S = (xs) => { const n = xs.length, w = xs.filter((x) => x.net > 0).length, mn = n ? xs.reduce((a, x) => a + x.net, 0) / n : 0, bs = []
      for (let q = 0; q < 4000 && n; q++) { let t = 0; for (let i = 0; i < n; i++) t += xs[(rnd() * n) | 0].net; bs.push(t / n) } bs.sort((a, b) => a - b)
      return { n, wr: n ? +(w / n).toFixed(4) : null, wr_lb: +wilsonLB(w, n, Z).toFixed(4), net: +mn.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null } }
    const TR = S(tr.filter((x) => x.t < SPLIT)), OOS = S(tr.filter((x) => x.t >= SPLIT)), days = ((TO - SPLIT) / 86400000) * 5 / 7
    const verdict = OOS.n >= 100 && OOS.wr >= 0.85 && OOS.wr_lb >= 0.83 && OOS.net_lb > 0 && TR.net > 0 ? 'PASS' : OOS.n < 100 ? 'UNDERPOWERED' : 'FAIL'
    out[`stop${m}r|tp${k}r`] = { train: TR, oos: { ...OOS, per_day: +(OOS.n / days).toFixed(2) }, verdict }
    console.log(`  stop ${m}r / target ${k}r: OOS n ${OOS.n} (${(OOS.n / days).toFixed(2)}/d) WR ${OOS.wr} (LB ${OOS.wr_lb}) $/t ${OOS.net} [LB ${OOS.net_lb}] · TRAIN WR ${TR.wr} $/t ${TR.net} → ${verdict}`) }
  return out }
const res = { at: new Date().toISOString(), spec: 'docs/MATRIX_85WR_SPEC.md', primary_noWTI_13y: await run(F13, false), report_WTI_2y: await run(WTI_FROM, true) }
const pass = Object.entries(res.primary_noWTI_13y).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k); res.passing = pass; res.verdict = pass.length ? 'SOME_PASS' : 'NO_PASS'
fs.writeFileSync(path.join(TURBO.master, 'matrix_85wr_study.json'), JSON.stringify(res, null, 1)); console.log(`\n=> MATRIX ≥85% WR: ${res.verdict}${pass.length ? ' ' + pass.join(', ') : ''}`)
