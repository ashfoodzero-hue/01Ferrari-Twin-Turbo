// ════════════════════════════════════════════════════════════════════════════════
// study_topdown_system.mjs [XAUUSD|XAGUSD] — the TOP-DOWN SYSTEM (spec docs/TOPDOWN_SYSTEM_SPEC.md, written before any number; Ashraf 2026-10-20
// "Yes, run it as written"): HTF CHoCH sets the regime → S-REV (OB retest + 15m CHoCH) and S-CONT (1H CHoCH back in the regime) swing entries →
// SC scalps (15m CHoCH back in the regime during a 1H pullback, TP = the last 1H pivot extreme). Controls: no-regime, drift. K = 28.
// Rules + trades: scripts/lib/choch4h.mjs (findChochs, obChochSetups, pivots, trade). Output: data/master/topdown_system_study[_xag].json (+ trades).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, kit, SHORT } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { makeSpreadAt, loadSpreadTable } from '../src/master/spreadModel.js'
import { wilson, rng } from '../src/core/studyStats.js'
import { CH, findChochs, obChochSetups, pivots, trade } from './lib/choch4h.mjs'

const SYM = process.argv[2] || 'XAUUSD', SH = SYM === 'XAUUSD' ? '' : '_' + SHORT[SYM], K_CELLS = 28, ALPHA = 0.05 / K_CELLS
const SPLIT = Date.parse('2021-07-01T00:00:00Z'), END = Date.parse('2026-10-16T21:00:00Z'), WEEK = 7 * 86400000, H = 3600000
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a)
const lb = (arr, t, key = (x) => x) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
const M = (await clean1m(SYM, { reopenClamp: false })).filter((b) => b.t < END), holes = findHoles(M), KIT = kit(SYM, { reopenClamp: false })
const MT = M.map((b) => b.t)
const spreadAt = SYM === 'XAUUSD' ? makeSpreadAt() : makeSpreadAt({ table: loadSpreadTable(path.join(TURBO.master, 'spread_table_XAGUSD.json')) })
const FROM = M[0].t + 60 * 86400000, C = {}, EV = {}
for (const tf of ['15m', '1H', '4H', '1D']) { C[tf] = KIT.build(M, tf); markIncomplete(C[tf], holes); EV[tf] = findChochs(C[tf], M, { from: FROM }).events }
log(SYM, 'CHoCH events', Object.fromEntries(Object.entries(EV).map(([k, v]) => [k, v.length])))
const P1 = pivots(C['1H']), knownAt = (P, hi, t) => { const Cc = C['1H']; let best = null; for (const p of P) { if (Cc[p + CH.PIV]?.close_t <= t) best = p; else break } return best == null ? null : (hi ? Cc[best].h : Cc[best].l) }
const regimeAt = (htf, t) => { const E = EV[htf]; let a = 0, b = E.length; while (a < b) { const m = (a + b) >> 1; if (E[m].decisionT <= t) a = m + 1; else b = m } return a ? E[a - 1].side : null }
const nextOpp = (htf, side, t) => { const o = EV[htf].find((e) => e.side !== side && e.decisionT > t); return o ? o.decisionT + 60000 : Infinity }
const capT = (tf, t, n) => { const Cc = C[tf], i = lb(Cc, t, (c) => c.t); return (Cc[Math.min(Cc.length - 1, i + n)] ?? Cc.at(-1)).t }
const entryPx = (side, t) => { const k = lb(MT, t); if (k >= M.length) return null; return side === 'BUY' ? M[k].o + spreadAt(M[k].t) : M[k].o }

// ── candidate entries per layer ──
function sRev(htf) { const Cc = C[htf], { A, X } = findChochs(Cc, M, { from: FROM }); return obChochSetups(Cc, A, X, EV[htf], C['15m'], M).setups.map((x) => ({ ...x, layer: 'S-REV', htf })) }
const sCont = (htf, useRegime) => EV['1H'].filter((e) => !useRegime || regimeAt(htf, e.decisionT) === e.side).map((e) => ({ ...e, layer: 'S-CONT', htf }))
function sc(htf, useRegime) {   // a 1H pullback = a 1H CHoCH against the direction; then the FIRST 15m CHoCH back in the direction before the next 1H CHoCH
  const out = [], E1 = EV['1H'], E15 = EV['15m']
  for (let k = 0; k < E1.length; k++) { const pb = E1[k], dir = pb.side === 'BUY' ? 'SELL' : 'BUY'
    if (useRegime && regimeAt(htf, pb.decisionT) !== dir) continue
    const until = E1[k + 1]?.decisionT ?? Infinity, j0 = lb(E15, pb.decisionT + 1, (e) => e.decisionT)
    const e = E15.slice(j0).find((x) => x.decisionT < until && x.side === dir); if (!e) continue
    if (useRegime && regimeAt(htf, e.decisionT) !== dir) continue
    const tp = knownAt(dir === 'BUY' ? P1.H : P1.L, dir === 'BUY', e.decisionT), en = entryPx(dir, e.decisionT); if (tp == null || en == null) continue
    const stop = e.tip - (dir === 'BUY' ? 1 : -1) * CH.STOP_ATR * e.atr, R = (dir === 'BUY' ? 1 : -1) * (en - stop)
    if (!(R > 0) || (dir === 'BUY' ? tp - en : en - tp) < R) continue   // TP less than 1R away → no trade
    out.push({ ...e, layer: 'SC', htf, tp }) }
  return out
}
function run(cands, exit, htf) { const T = []; let busy = -Infinity
  for (const x of cands.sort((a, b) => a.decisionT - b.decisionT)) { if (x.decisionT <= busy) continue
    let tg, endT
    if (x.layer === 'SC') { tg = ['SC', 'P', x.tp]; endT = x.decisionT + 48 * H }
    else { tg = exit === 'X-2R' ? ['X', 'R', 2] : exit === 'X-3R' ? ['X', 'R', 3] : ['X', 'R', 1e9]; endT = capT(htf, x.decisionT, 120); if (exit === 'X-HOLD') endT = Math.min(endT, nextOpp(htf, x.side, x.decisionT)) }
    const r = trade(M, x, 'E1', tg, spreadAt, endT, 0); if (!r || r.open || r.skipped) continue
    busy = r.exitT; T.push({ ...r, side: x.side, layer: x.layer, decisionT: x.decisionT, atr: x.atr, tpDist: x.tp != null ? Math.abs(x.tp - r.entry) : null }) }
  return T }
function boot(items, { B = 10000, seed = 11, alpha = ALPHA } = {}) { if (!items.length) return { mean: null, lo: null }
  const g = new Map(); for (const it of items) { const k = Math.floor(it.t / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(it.x) }
  const bl = [...g.values()], r = rng(seed), v = new Float64Array(B)
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let k = 0; k < bl.length; k++) for (const x of bl[(r() * bl.length) | 0]) { s += x; n++ } v[b] = n ? s / n : 0 }
  v.sort(); return { mean: items.reduce((s, it) => s + it.x, 0) / items.length, lo: v[Math.floor(alpha * B)] } }
function summ(T) { const n = T.length; if (!n) return { n: 0 }
  const w = T.filter((x) => x.pnl > 0).length, bs = boot(T.map((x) => ({ t: x.entryT, x: x.pnl }))), byY = {}
  for (const x of T) (byY[new Date(x.entryT).getUTCFullYear()] ??= []).push(x.pnl)
  const yrs = Object.entries(byY).filter(([, v]) => v.length >= 5).map(([y, v]) => ({ y: +y, n: v.length, usd: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) }))
  const span = (Math.max(...T.map((x) => x.entryT)) - Math.min(...T.map((x) => x.entryT))) / WEEK
  return { n, per_week: +(n / Math.max(1, span)).toFixed(3), wr: +(w / n).toFixed(4), wr_lo: +wilson(w, n).lo.toFixed(4), usd: +bs.mean.toFixed(3), usd_lo: +bs.lo.toFixed(3), R: +(T.reduce((s, x) => s + x.r, 0) / n).toFixed(4), years_pos: yrs.length ? +(yrs.filter((y) => y.usd > 0).length / yrs.length).toFixed(3) : null, years: yrs } }
const split = (T) => ({ TRAIN: summ(T.filter((x) => x.entryT < SPLIT)), OOS: summ(T.filter((x) => x.entryT >= SPLIT)) })
// drift control: 5 random 15m-candle entries of the same year, same direction, same stop distance (R / atr in the trade's ATR units), same exit rule
const r0 = rng(4040), byY = {}; for (let i = 20; i < C['15m'].length - 2; i++) if (!C['15m'][i].incomplete && C['15m'][i].t >= FROM) (byY[new Date(C['15m'][i].t).getUTCFullYear()] ??= []).push(i)
function drift(T, exit, htf) { const out = []
  for (const t of T) { const P = byY[new Date(t.entryT).getUTCFullYear()]; if (!P) continue; const s = t.side === 'BUY' ? 1 : -1, d = t.R / t.atr
    for (let k = 0; k < 5; k++) { const i = P[(r0() * P.length) | 0], dt = C['15m'][i + 1].t, en = entryPx(t.side, dt); if (en == null) continue
      const stop = en - s * d * t.atr, ev = { side: t.side, decisionT: dt, tip: stop + s * CH.STOP_ATR * t.atr, atr: t.atr }
      let tg, endT
      if (t.layer === 'SC') { tg = ['SC', 'P', en + s * t.tpDist]; endT = dt + 48 * H } else { tg = exit === 'X-2R' ? ['X', 'R', 2] : exit === 'X-3R' ? ['X', 'R', 3] : ['X', 'R', 1e9]; endT = capT(htf, dt, 120); if (exit === 'X-HOLD') endT = Math.min(endT, nextOpp(htf, t.side, dt)) }
      const z = trade(M, ev, 'E1', tg, spreadAt, endT, 0); if (z && !z.open && !z.skipped) out.push(z) } }
  return out }
function diffCI(a, b) { if (!a.length || !b.length) return null; const blocks = (Z) => { const g = new Map(); for (const z of Z) { const k = Math.floor(z.entryT / WEEK); if (!g.has(k)) g.set(k, []); g.get(k).push(z.pnl) } return [...g.values()] }
  const ba = blocks(a), bb = blocks(b), r = rng(9), mean = (bs) => { let s = 0, n = 0; for (let k = 0; k < bs.length; k++) for (const v of bs[(r() * bs.length) | 0]) { s += v; n++ } return n ? s / n : 0 }, d = []
  for (let k = 0; k < 4000; k++) d.push(mean(ba) - mean(bb)); d.sort((p, q) => p - q); return [+d[100].toFixed(3), +d[3899].toFixed(3)] }

const cells = [], tradesOut = {}, controls = {}
// no-regime controls (independent of HTF): S-CONT all 1H CHoCH (3 exits, HTF only sets the HOLD/cap) and SC without the regime
for (const htf of ['4H', '1D']) {
  const REV = sRev(htf), CONT = sCont(htf, true), SCs = sc(htf, true), CONT0 = sCont(htf, false), SC0 = sc(htf, false)
  log(htf, 'candidates S-REV', REV.length, 'S-CONT', CONT.length, '(no regime', CONT0.length + ')', 'SC', SCs.length, '(no regime', SC0.length + ')')
  for (const side of ['BUY', 'SELL']) for (const [layer, cand, cand0, exits] of [['S-REV', REV, null, ['X-2R', 'X-3R', 'X-HOLD']], ['S-CONT', CONT, CONT0, ['X-2R', 'X-3R', 'X-HOLD']], ['SC', SCs, SC0, ['TP-1H']]]) for (const exit of exits) {
    const key = `${htf}|${side === 'BUY' ? 'LONG' : 'SHORT'}|${layer}|${exit}`, T = run(cand.filter((x) => x.side === side), exit, htf), c = { key, htf, side, layer, exit, ...split(T) }
    if (cand0) { const T0 = run(cand0.filter((x) => x.side === side), exit, htf); c.no_regime = split(T0) }
    const D = drift(T, exit, htf); c.drift = { TRAIN: { setup: c.TRAIN.usd ?? null, random: D.filter((z) => z.entryT < SPLIT).length ? +(D.filter((z) => z.entryT < SPLIT).reduce((s, z) => s + z.pnl, 0) / D.filter((z) => z.entryT < SPLIT).length).toFixed(3) : null, ci95: diffCI(T.filter((x) => x.entryT < SPLIT), D.filter((z) => z.entryT < SPLIT)) },
      OOS: { setup: c.OOS.usd ?? null, random: D.filter((z) => z.entryT >= SPLIT).length ? +(D.filter((z) => z.entryT >= SPLIT).reduce((s, z) => s + z.pnl, 0) / D.filter((z) => z.entryT >= SPLIT).length).toFixed(3) : null, ci95: diffCI(T.filter((x) => x.entryT >= SPLIT), D.filter((z) => z.entryT >= SPLIT)) } }
    c.checks = { n30: (c.OOS.n ?? 0) >= 30, money_oos: c.OOS.n > 0 && c.OOS.usd > 0 && c.OOS.usd_lo > 0, money_train: c.TRAIN.n > 0 && c.TRAIN.usd > 0, years60: (c.OOS.years_pos ?? 0) >= 0.6,
      beats_no_regime: c.no_regime ? (c.TRAIN.usd > (c.no_regime.TRAIN.usd ?? Infinity) && c.OOS.usd > (c.no_regime.OOS.usd ?? Infinity)) : true, beats_drift: !!(c.drift.TRAIN.ci95 && c.drift.OOS.ci95 && c.drift.TRAIN.ci95[0] > 0 && c.drift.OOS.ci95[0] > 0) }
    c.pass = Object.values(c.checks).every(Boolean); cells.push(c); tradesOut[key] = T
    log(key.padEnd(26), 'TRAIN', c.TRAIN.n, c.TRAIN.wr, c.TRAIN.usd, '| OOS', c.OOS.n, '/wk', c.OOS.per_week, 'WR', c.OOS.wr, '$', c.OOS.usd, 'lo', c.OOS.usd_lo, '| noReg OOS', c.no_regime?.OOS.usd ?? '-', '| drift OOS', c.drift.OOS.random, JSON.stringify(c.drift.OOS.ci95), c.pass ? 'PASS' : '') } }
const out = { spec: 'docs/TOPDOWN_SYSTEM_SPEC.md', symbol: SYM, built_at: new Date().toISOString(), split: new Date(SPLIT).toISOString(), K: K_CELLS, alpha_per_cell: ALPHA, passes: cells.filter((c) => c.pass).map((c) => c.key), cells }
fs.writeFileSync(path.join(TURBO.master, `topdown_system_study${SH}.json`), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(TURBO.master, `topdown_system_trades${SH}.json`), JSON.stringify(tradesOut))
log('PASSES', out.passes.length, out.passes)
