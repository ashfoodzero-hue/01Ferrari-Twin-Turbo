// audit_matrix_aligned.mjs — the audit MATRIX_ALIGNED_SPEC fixed before any number (2026-10-22):
//   1. an INDEPENDENT second resolver (written from the rules, not calling resolveMatrixTrade) re-prices 200 random trades → 0 differences;
//   2. the full-history structure state the study uses = the live 45-day structureStateAt at 50 random decision times per TF → 0 differences;
//   3. positive control: an ORACLE SELL (knows TP2 is hit before the stop) through the same pipeline → large positive $/t.
import '../src/core/bootEnv.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { findChochs, structureStateAt } from './lib/choch4h.mjs'
import { MATRIX, matrixSignals, matrixLevelsAt } from '../src/master/ferrariMatrix.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { rng } from '../src/core/studyStats.js'
import { resolveIndependent } from './lib/independent_resolver.mjs'

const TO = Date.parse('2026-10-21T21:00:00Z'), FROM = Date.parse('2024-10-10T00:00:00Z'), spreadAt = makeSpreadAt(), R = rng(22)
let fail = 0; const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fail++ }

// 1. independent resolver (ONE copy: scripts/lib/independent_resolver.mjs, moved 2026-10-23 — same text)
const resolve2 = (s, m1) => resolveIndependent(s, m1, spreadAt)
const buyBook = await matrixTrades({ from: FROM, to: TO, useWti: true, spreadAt })
const sellBook = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: (B, D, s0) => matrixSignals(B, D, [], { from: s0, useWti: false, sellRule: 'red' }).filter((x) => x.side === 'SELL') })
const pool = [...buyBook.fires, ...sellBook.fires], m1 = buyBook.m1, T1 = m1.map((b) => b.t)
const at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
let diff = 0; const pick = Array.from({ length: 200 }, () => pool[Math.floor(R() * pool.length)])
for (const f of pick) { const k = at(f.sig.decisionT), v = resolve2(f.sig, m1.slice(k, k + MATRIX.horizonMin + 5)); if (v == null || Math.abs(v - f.net) > 1e-3) { diff++; if (diff <= 3) console.log('   diff', f.side, f.t, f.net, v) } }
ok(diff === 0, `independent resolver: 200 random trades (${pick.filter((f) => f.side === 'BUY').length} BUY / ${pick.filter((f) => f.side === 'SELL').length} SELL), ${diff} differences`)

// 2. structure state: full history (the study) vs the live 45-day window (structureStateAt)
const M = (await clean1m('XAUUSD', { reopenClamp: false })).filter((b) => b.t < TO), holes = findHoles(M), K = kit('XAUUSD', { reopenClamp: false })
for (const [tf, ms] of [['1H', 3600000], ['4H', 4 * 3600000]]) {
  const C = K.build(M, tf); markIncomplete(C, holes); const S = findChochs(C, M, {}).state, T = C.map((c) => Math.max(c.close_t, c.t + ms)); let d2 = 0
  for (let k = 0; k < 50; k++) { const t = Math.floor((Date.parse('2015-01-01') + R() * (TO - Date.parse('2015-01-01'))) / 180000) * 180000
    let a = 0, b = T.length; while (a < b) { const m = (a + b) >> 1; if (T[m] <= t) a = m + 1; else b = m }; const full = a ? S[a - 1] : 0
    let lo = 0, hi = M.length; while (lo < hi) { const m = (lo + hi) >> 1; if (M[m].t < t - 45 * 86400000) lo = m + 1; else hi = m }; let e = lo; while (e < M.length && M[e].t + 60000 <= t) e++
    const Mw = M.slice(lo, e), Cw = K.build(Mw, tf); markIncomplete(Cw, findHoles(Mw)); const live = structureStateAt(Cw, Mw, t, ms); if (!live || live.state !== full) d2++ }
  ok(d2 === 0, `${tf} structure: 50 random decision times, full-history state vs live 45-day window — ${d2} differences`) }

// 3. positive control: the oracle SELL at SELL-wall bars whose future 1m path hits TP2 before the stop
const oracle = (B, D, s0) => { const A = atrArr(B, 14), out = []
  for (let i = Math.max(s0, MATRIX.look + 20); i < B.length; i += 1) { const b = B[i], a = A[i]; if (!a) continue; const L = matrixLevelsAt(B, a, i); if (!L || !(b.h >= L.ceiling - L.cushion)) continue
    let hi5 = -Infinity; for (let k = i - 4; k <= i; k++) hi5 = Math.max(hi5, B[k].h); const entry = b.c, sl = hi5 + MATRIX.slPad, risk = sl - entry, reward = Math.max(MATRIX.minReward, MATRIX.rr * risk), tp2 = entry - MATRIX.tp2Mult * reward
    const k0 = at(b.t + MATRIX.tfMs); let good = false; for (let k = k0; k < Math.min(m1.length, k0 + 240); k++) { if (m1[k].h + 0.6 >= sl) break; if (m1[k].l <= tp2) { good = true; break } }
    if (good) out.push({ i, t: b.t, decisionT: b.t + MATRIX.tfMs, side: 'SELL', entry, sl, tp1: entry - reward, tp2, risk, reward, atr: a, ctx: {} }) }
  return out }
const O = (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: oracle })).fires, oUsd = O.reduce((s, f) => s + f.net, 0) / (O.length || 1)
ok(O.length >= 30 && oUsd > 5, `positive control: oracle SELL n ${O.length}, $/t ${oUsd.toFixed(2)} (the pipeline credits a real edge)`)
console.log(fail ? `✗ AUDIT MATRIX ALIGNED: ${fail} failed` : '✅ AUDIT MATRIX ALIGNED: clean'); process.exit(fail ? 1 : 0)
