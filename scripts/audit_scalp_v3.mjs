// audit_scalp_v3.mjs — the audit SCALP_ENTRY_V3_SPEC fixed before any v3 number (2026-10-24): independent resolver 200 trades (0 diff); every v3 entry
// rebuilt on 50 tape cuts (gold AND silver cut) = the full-tape entries (no look-ahead); oracle control positive through the same pipeline.
import '../src/core/bootEnv.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { loadBars } from '../src/data/backfillReader.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { EXITS, hourAtr, costFloorBuy, confirmBuy, twoBarExhaustion, goldOnlySpike } from './lib/scalp_v2.mjs'
import { resolveIndependent } from './lib/independent_resolver.mjs'
import { MATRIX } from '../src/master/ferrariMatrix.js'
import { rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), spreadAt = makeSpreadAt(), R = rng(24)
let fail = 0; const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fail++ }
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1), T1 = m1.map((b) => b.t)
const silver1m = (await loadBars('XAGUSD', '1m', { from: FROM - 86400000, to: TO })).bars.filter((b) => b.t + 60000 <= TO)
const at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
const price = async (sigs) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => sigs })).fires
const GEN = { P1: (g, B, s, h) => costFloorBuy(g, B, { exit: 'X3', spreadAt, ha: h }), P2: (g, B, s, h) => confirmBuy(g, B, { exit: 'X3', ha: h }),
  N1: (g, B, s, h) => twoBarExhaustion(g, B, { exit: 'X1', ha: h }), N2: (g, B, s, h) => goldOnlySpike(g, B, { exit: 'X1', silver1m: s, ha: h }) }

// 1. independent resolver on 200 random v3 trades
const pool = []; for (const [e, g] of Object.entries(GEN)) pool.push(...(await price(g(m1, data.B, silver1m, ha))).map((f) => ({ ...f, cell: e })))
let diff = 0; const pick = Array.from({ length: 200 }, () => pool[Math.floor(R() * pool.length)])
for (const f of pick) { const k = at(f.sig.decisionT), v = resolveIndependent(f.sig, m1.slice(k, k + MATRIX.horizonMin + 5), spreadAt); if (v == null || Math.abs(v - f.net) > 1e-3) { diff++; if (diff <= 3) console.log('   diff', f.cell, f.side, f.t, f.net, v) } }
ok(diff === 0, `independent resolver: 200 random v3 trades (${pick.filter((f) => f.side === 'BUY').length} BUY / ${pick.filter((f) => f.side === 'SELL').length} SELL) of ${pool.length}, ${diff} differences`)

// 2. no look-ahead: entries from the tape (gold + silver) cut at T = full-tape entries decided by T
const key = (s) => `${s.decisionT}|${s.side}|${s.entry}|${s.sl.toFixed(6)}|${s.tp1.toFixed(6)}`
for (const [e, g] of Object.entries(GEN)) { const full = g(m1, data.B, silver1m, ha); let d2 = 0
  for (let k = 0; k < 50; k++) { const T = Math.floor((Date.parse('2014-01-01') + R() * (TO - 30 * 86400000 - Date.parse('2014-01-01'))) / 60000) * 60000
    const mc = m1.filter((b) => b.t + 60000 <= T), Bc = data.B.filter((b) => b.t + 3 * 60000 <= T), sc = silver1m.filter((b) => b.t + 60000 <= T), win = (s) => s.decisionT <= T && s.decisionT > T - 3 * 86400000
    const a = full.filter(win).map(key).join(','), b = g(mc, Bc, sc, hourAtr(mc)).filter(win).map(key).join(','); if (a !== b) { d2++; if (d2 <= 2) console.log('   cut diff', e, new Date(T).toISOString()) } }
  ok(d2 === 0, `${e}: entries on a tape cut at 50 random times = full-tape entries — ${d2} differences`) }

// 3. positive control (look-ahead on purpose): target hit before the stop, X3 geometry
const O = []; for (let k = 0; k < 4000; k++) { const j = 20 + Math.floor(R() * (m1.length - 2000)), b = m1[j], h = ha.at(b.t + 60000); if (!h) continue
  const side = R() < 0.5 ? 'BUY' : 'SELL', up = side === 'BUY', x = EXITS.X3, tp = up ? b.c + x.tgt * h.A : b.c - x.tgt * h.A, sl = up ? b.c - x.stop * h.A : b.c + x.stop * h.A
  let good = false; for (let q = j + 1; q < Math.min(m1.length, j + 1440); q++) { const m = m1[q]; if (up ? m.l <= sl : m.h + 1 >= sl) break; if (up ? m.h >= tp + 1 : m.l <= tp - 0.1) { good = true; break } }
  if (good) O.push({ i: 0, t: b.t, decisionT: b.t + 60000, side, entry: b.c, sl, tp1: tp, tp2: tp, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { oracle: true } }) }
const OF = await price(O.sort((a, b) => a.decisionT - b.decisionT)), ou = OF.reduce((s, f) => s + f.net, 0) / (OF.length || 1), ow = OF.filter((f) => f.net > 0).length / (OF.length || 1)
ok(OF.length >= 100 && ou > 1 && ow > 0.95, `positive control: oracle n ${OF.length}, WR ${(100 * ow).toFixed(1)} %, $/t ${ou.toFixed(2)}`)
console.log(fail ? `✗ AUDIT SCALP V3: ${fail} failed` : '✅ AUDIT SCALP V3: clean'); process.exit(fail ? 1 : 0)
