// audit_scalp_v2.mjs — the audit SCALP_ENTRY_V2_SPEC fixed before any number (2026-10-23):
//   1. the independent resolver re-prices 200 random trades of the study's cells → 0 differences against the live resolver;
//   2. NO LOOK-AHEAD: every entry rebuilt on a tape cut at 50 random times equals the full-tape entries decided by the cut (F1k3, F1k5, F2);
//   3. positive control: an ORACLE entry (knows its target is hit before its stop) through the same pipeline → large positive $/t.
import '../src/core/bootEnv.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { matrixTrades } from './lib/matrix_trades.mjs'
import { ENTRIES, EXITS, hourAtr } from './lib/scalp_v2.mjs'
import { resolveIndependent } from './lib/independent_resolver.mjs'
import { MATRIX } from '../src/master/ferrariMatrix.js'
import { rng } from '../src/core/studyStats.js'

const FROM = Date.parse('2013-07-21T00:00:00Z'), TO = Date.parse('2026-10-22T21:00:00Z'), spreadAt = makeSpreadAt(), R = rng(23)
let fail = 0; const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fail++ }
const first = await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, signals: () => [] }), data = { B: first.B, D: first.D, m1: first.m1 }
const m1 = data.m1.filter((b) => b.t + 60000 <= TO), ha = hourAtr(m1), T1 = m1.map((b) => b.t)
const at = (t) => { let lo = 0, hi = T1.length; while (lo < hi) { const m = (lo + hi) >> 1; if (T1[m] < t) lo = m + 1; else hi = m } return lo }
const price = async (sigs) => (await matrixTrades({ from: FROM, to: TO, useWti: false, spreadAt, data, signals: () => sigs })).fires

// 1. independent resolver on 200 random trades from all three entries (both sides, exits X1-X3)
const pool = []; for (const [e, g] of Object.entries(ENTRIES)) for (const x of Object.keys(EXITS)) pool.push(...(await price(g(m1, data.B, { exit: x, ha }))).map((f) => ({ ...f, cell: `${e}|${x}` })))
let diff = 0; const pick = Array.from({ length: 200 }, () => pool[Math.floor(R() * pool.length)])
for (const f of pick) { const k = at(f.sig.decisionT), v = resolveIndependent(f.sig, m1.slice(k, k + MATRIX.horizonMin + 5), spreadAt); if (v == null || Math.abs(v - f.net) > 1e-3) { diff++; if (diff <= 3) console.log('   diff', f.cell, f.side, f.t, f.net, v) } }
ok(diff === 0, `independent resolver: 200 random trades (${pick.filter((f) => f.side === 'BUY').length} BUY / ${pick.filter((f) => f.side === 'SELL').length} SELL) of ${pool.length}, ${diff} differences`)

// 2. no look-ahead: entries rebuilt from the tape cut at T (bars closed by T only) = full-tape entries with decisionT ≤ T
const key = (s) => `${s.decisionT}|${s.side}|${s.entry}|${s.sl.toFixed(6)}|${s.tp1.toFixed(6)}`
for (const [e, g] of Object.entries(ENTRIES)) { const full = g(m1, data.B, { exit: 'X1', ha }); let d2 = 0
  for (let k = 0; k < 50; k++) { const T = Math.floor((Date.parse('2014-01-01') + R() * (TO - 30 * 86400000 - Date.parse('2014-01-01'))) / 60000) * 60000
    const mc = m1.filter((b) => b.t + 60000 <= T), Bc = data.B.filter((b) => b.t + 3 * 60000 <= T), cut = g(mc, Bc, { exit: 'X1', ha: hourAtr(mc) }), win = (s) => s.decisionT <= T && s.decisionT > T - 3 * 86400000
    const a = full.filter(win).map(key).join(','), b = cut.filter(win).map(key).join(','); if (a !== b) { d2++; if (d2 <= 2) console.log('   cut diff', e, new Date(T).toISOString()) } }
  ok(d2 === 0, `${e}: entries on a tape cut at 50 random times = full-tape entries (last 3 days before each cut) — ${d2} differences`) }

// 3. positive control: oracle BUY/SELL at random minutes whose own target is hit before the stop (look-ahead on purpose)
const O = []; for (let k = 0; k < 4000; k++) { const j = 20 + Math.floor(R() * (m1.length - 2000)), b = m1[j], h = ha.at(b.t + 60000); if (!h) continue
  const side = R() < 0.5 ? 'BUY' : 'SELL', up = side === 'BUY', x = EXITS.X1, tp = up ? b.c + x.tgt * h.A : b.c - x.tgt * h.A, sl = up ? b.c - x.stop * h.A : b.c + x.stop * h.A
  let good = false; for (let q = j + 1; q < Math.min(m1.length, j + 1440); q++) { const m = m1[q]; if (up ? m.l <= sl : m.h + 1 >= sl) break; if (up ? m.h >= tp + 1 : m.l <= tp - 0.1) { good = true; break } }
  if (good) O.push({ i: 0, t: b.t, decisionT: b.t + 60000, side, entry: b.c, sl, tp1: tp, tp2: tp, risk: x.stop * h.A, reward: x.tgt * h.A, atr: h.A, ctx: { oracle: true } }) }
const OF = await price(O.sort((a, b) => a.decisionT - b.decisionT)), ou = OF.reduce((s, f) => s + f.net, 0) / (OF.length || 1), ow = OF.filter((f) => f.net > 0).length / (OF.length || 1)
ok(OF.length >= 100 && ou > 1 && ow > 0.95, `positive control: oracle n ${OF.length}, WR ${(100 * ow).toFixed(1)} %, $/t ${ou.toFixed(2)} (the pipeline credits a real edge)`)
console.log(fail ? `✗ AUDIT SCALP V2: ${fail} failed` : '✅ AUDIT SCALP V2: clean'); process.exit(fail ? 1 : 0)
