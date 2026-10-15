// ════════════════════════════════════════════════════════════════════════════════
// study_matrix_sell.mjs — the Matrix SCALP SELL side: 3 triggers × 2 exits, WR red line ≥ 85 % + money (2026-10-16).
// Pre-registered: docs/MATRIX_SELL_SPEC.md. Output: data/master/matrix_sell_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixSignals, resolveMatrixTrade, MATRIX } from '../src/master/ferrariMatrix.js'
import { wti1m } from './lib/matrix_trades.mjs'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), WTI_FROM = Date.parse('2024-10-10T00:00:00Z'), F13 = HISTORY_CONTINUOUS_FROM + 7 * 86400000
const RULES = ['choch', 'red', 'prevlow'], EXITS = ['native', 'highwr'], K = RULES.length * EXITS.length, ALPHA = 0.05 / K, Z = zOf(K), HZ = MATRIX.horizonMin * 60000
const spreadAt = makeSpreadAt()
async function window(from, useWti) {
  const B = (await loadBars('XAUUSD', '3m', { from: from - 3 * 86400000, to: TO })).bars, D = (await loadDxyBars('3m', { from: from - 3 * 86400000, to: TO })).bars
  const M = (await loadBars('XAUUSD', '1m', { from, to: TO })).bars, MT = Float64Array.from(M.map((b) => b.t))
  const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
  const startI = B.findIndex((b) => b.t >= from), W = useWti ? wti1m(TO) : [], SPLIT = from + 0.6 * (TO - from), out = {}
  for (const rule of RULES) {
    const sigs = matrixSignals(B, D, W, { from: startI, useWti, sellRule: rule }).filter((s) => s.side === 'SELL')
    for (const ex of EXITS) { const tr = []; let busy = -Infinity
      for (const s of sigs) { if (s.decisionT <= busy || s.decisionT + HZ > TO) continue
        let res
        if (ex === 'native') { const k = lb(s.decisionT), r = resolveMatrixTrade(s, M.slice(k, k + MATRIX.horizonMin + 5), spreadAt); if (!r.done) continue
          res = { net: r.pnl, exitT: r.exitT, cls: r.outcome === 'TP1+TP2' ? 'W' : r.outcome === 'TP1+BE' ? 'S' : r.outcome === 'SL' ? 'L' : r.pnl > 0 ? 'W' : 'L' } }
        else { const r = s.risk, fill = s.entry, sl = fill + 3 * r, tgt = fill - 0.25 * r, slip = Math.min(0.3, 0.05 * (s.atr || r)); let j = lb(s.decisionT)   // same as study_matrix_85wr (SELL side)
          for (; j < M.length && M[j].t < s.decisionT + 86400000; j++) { const b = M[j], sp = spreadAt(b.t)
            if (b.h + sp >= sl) { res = { net: -(3 * r + slip), exitT: b.t, cls: 'L' }; break }
            if (b.l + sp <= tgt) { res = { net: 0.25 * r, exitT: b.t, cls: 'W' }; break } }
          if (!res) { const z = M[Math.min(j, M.length) - 1]; const net = fill - (z.c + spreadAt(z.t)); res = { net, exitT: z.t, cls: net > 0 ? 'W' : 'L' } } }
        busy = res.exitT + 60000; tr.push({ t: s.decisionT, ...res }) }
      let sd = 23; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
      const S = (xs) => { const n = xs.length, w = xs.filter((x) => x.cls === 'W').length, l = xs.filter((x) => x.cls === 'L').length, mn = n ? xs.reduce((a, x) => a + x.net, 0) / n : null, bs = []
        for (let q = 0; q < 4000 && n; q++) { let t = 0; for (let i = 0; i < n; i++) t += xs[(rnd() * n) | 0].net; bs.push(t / n) } bs.sort((a, b) => a - b)
        return { n, wins: w, losses: l, scratches: n - w - l, wr: w + l ? +(w / (w + l)).toFixed(4) : null, wr_lb: w + l ? +wilsonLB(w, w + l, Z).toFixed(4) : null, net: mn == null ? null : +mn.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null } }
      const T = S(tr.filter((x) => x.t < SPLIT)), O = S(tr.filter((x) => x.t >= SPLIT)), days = ((TO - SPLIT) / 86400000) * 5 / 7
      out[`${rule}|${ex}`] = { signals: sigs.length, train: T, oos: { ...O, per_day: +(O.n / days).toFixed(2) } }
      console.log(`  ${rule.padEnd(7)} ${ex.padEnd(6)}: ${sigs.length} SELL signals · OOS n ${O.n} (${(O.n / days).toFixed(2)}/d) WR ${O.wr} (LB ${O.wr_lb}) $/t ${O.net} [LB ${O.net_lb}] · TRAIN WR ${T.wr} $/t ${T.net}`) } }
  return out }
console.log('PRIMARY — with WTI, 2 y'); const P = await window(WTI_FROM, true)
console.log('ROBUSTNESS — no WTI, 13 y'); const R = await window(F13, false)
const cells = {}
for (const key of Object.keys(P)) { const p = P[key], r = R[key]
  const ok = p.oos.n >= 100 && p.oos.wr >= 0.85 && p.oos.wr_lb >= 0.83 && p.oos.net > 0 && p.oos.net_lb > 0 && p.train.net > 0 && r.oos.net >= 0
  cells[key] = { primary: p, robust_noWTI_13y: r, verdict: ok ? 'PASS' : p.oos.n < 100 ? 'UNDERPOWERED' : 'FAIL' } }
const pass = Object.entries(cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
const res = { at: new Date().toISOString(), spec: 'docs/MATRIX_SELL_SPEC.md', red_line: 'WR >= 85 % (SCALP)', cells, passing: pass, verdict: pass.length ? 'SOME_PASS' : 'NO_PASS' }
fs.writeFileSync(path.join(TURBO.master, 'matrix_sell_study.json'), JSON.stringify(res, null, 1))
console.log('\n' + Object.entries(cells).map(([k, c]) => `  ${k}: ${c.verdict}`).join('\n') + `\n=> MATRIX SELL (WR ≥ 85 % + money): ${res.verdict}${pass.length ? ' ' + pass.join(', ') : ''}`)
