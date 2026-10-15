// ════════════════════════════════════════════════════════════════════════════════
// study_fwd_choch_entry.mjs — FWD / FWD1 signal + 3m bullish CHoCH → retest entry with the MINIMUM SL (2026-10-15).
// Rules pre-registered in docs/FWD_CHOCH_ENTRY_SPEC.md. Research only. Output: data/master/fwd_choch_entry.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { confirmedPivots } from '../src/master/ferrariMatrix.js'
import { loadDataset } from './inv90/gate.mjs'

const DIR = path.join(TURBO.root, 'data', 'inv90'), DAY = 86400000, TF = 180000, WIN = 10, TOL = 0.1, PAD = 0.5, ENTRY_WINDOW = DAY, HZ = 7 * DAY, K = process.argv.includes('--mtf') ? 12 : 6, ALPHA = 0.05 / K
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], spreadAt = makeSpreadAt()
const ds = loadDataset(), O = JSON.parse(fs.readFileSync(path.join(DIR, 'outcomes2_meta.json'), 'utf8')), OD = new Float32Array(fs.readFileSync(path.join(DIR, 'outcomes2.bin')).buffer.slice(0))
const oc = (r, k) => OD[r * O.width + O.cols.indexOf('BUY_D1_' + k)], f32 = (f) => new Float32Array(fs.readFileSync(path.join(DIR, f)).buffer.slice(0))
const byYear = {}; for (let r = 0; r < ds.n; r++) (byYear[new Date(ds.T[r]).getUTCFullYear()] ||= []).push(r)
// base signals with the D1 policy (positions from the original outcomes — exactly part4_select / part7_freq)
function baseSignals(S, thrOf) { const out = [], open = []; let day = -1, nd = 0, last = -Infinity
  for (const Y of YEARS) { const thr = thrOf(Y); if (thr == null) continue
    for (const r of byYear[Y]) { const t = ds.T[r], d = Math.floor(t / DAY); if (d !== day) { day = d; nd = 0 }
      const net = oc(r, 'net'); if (!Number.isFinite(net) || !(S[r] >= thr)) continue
      while (open.length && open[0] <= t) open.shift(); if (nd >= 5 || open.length >= 5 || t - last < 3600000) continue
      open.push(t + oc(r, 'dur') * 60000); open.sort((a, b) => a - b); nd++; last = t; out.push({ r, t, baseNet: net }) } }
  return out }
const P4 = JSON.parse(fs.readFileSync(path.join(DIR, 'part4_pooled_x_results.json'), 'utf8')).candidates.BUY_D1.picks
const P7 = JSON.parse(fs.readFileSync(path.join(DIR, 'part7_results.json'), 'utf8')).books['BUY_D1-xs'].picks
const ARMS = { 'FWD (92%)': baseSignals(f32('scores_BUY_D1_x.bin'), (Y) => P4[Y]?.thr ?? null), 'FWD1 (~1/day)': baseSignals(f32('scores_BUY_D1_xs.bin'), (Y) => P7[Y]?.BUY?.thr ?? null) }
for (const [k, v] of Object.entries(ARMS)) console.log(`${k}: ${v.length} base signals (published: ${k.startsWith('FWD1') ? 3416 : 980})`)

// market data
const L = { from: Date.UTC(2016, 11, 1), to: Date.parse('2026-10-15T00:00:00Z') }
const B = (await loadBars('XAUUSD', '3m', L)).bars, A3 = atrArr(B, 14), PV = confirmedPivots(B), BT = Float64Array.from(B.map((b) => b.t))
const M = (await loadBars('XAUUSD', '1m', L)).bars, MT = Float64Array.from(M.map((b) => b.t))
const D1 = (await loadBars('XAUUSD', '1d', { from: Date.UTC(2016, 6, 1), to: L.to })).bars, AD = atrArr(D1, 14), D1c = Float64Array.from(D1.map((b) => b.t + DAY))
const lb = (A, t) => { let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < t) lo = m + 1; else hi = m } return lo }
const atrD = (t) => { const i = lb(D1c, t + 1) - 1; return i >= 0 ? AD[i] : null }
console.log(`3m ${B.length.toLocaleString()} · 1m ${M.length.toLocaleString()}`)

// --mtf (v2): a 15m bullish CHoCH (15m close above the last confirmed 15m swing high) must come first; the 3m entry search starts at its close
const MTF = process.argv.includes('--mtf')
const B15 = MTF ? (await loadBars('XAUUSD', '15m', L)).bars : [], PV15 = MTF ? confirmedPivots(B15) : null, B15T = Float64Array.from(B15.map((b) => b.t))
function choch15(T) { for (let i = lb(B15T, T); i < B15.length && B15[i].t < T + ENTRY_WINDOW; i++) { const H = PV15.lastHighAt[i]; if (Number.isFinite(H) && B15[i].c > H && !(i > 0 && B15[i - 1].c > H)) return B15[i].t + 900000 } return null }
// refined entry: first CHoCH → retest → green close above H within 24 h of the signal (v2: of the 15m confirmation)
function refinedEntry(T0) {
  const T = MTF ? choch15(T0) : T0; if (T == null) return null
  let i = lb(BT, T); let st = null   // first 3m bar starting at/after the signal (its close is after T)
  for (; i < B.length && B[i].t < T + ENTRY_WINDOW; i++) { const b = B[i], a = A3[i]; if (!(a > 0)) continue
    if (st) { if (i - st.i0 > WIN) st = null
      else if (b.c < st.H) st = null
      else if (b.l <= st.H + TOL * a && b.c > b.o && b.c > st.H) return { i, t: b.t + TF, closeBid: b.c, low: b.l, a } }
    if (!st) { const H = PV.lastHighAt[i]; if (Number.isFinite(H) && b.c > H && !(i > 0 && B[i - 1].c > H)) st = { H, i0: i } } }
  return null }
function trade(e, tgtPrice) { const s0 = spreadAt(e.t), entry = e.closeBid + s0, sl = e.low - PAD, R = entry - sl, slip = Math.min(0.3, 0.05 * e.a); if (!(R > 0) || tgtPrice <= entry) return null
  let j = lb(MT, e.t); for (; j < M.length && M[j].t < e.t + HZ; j++) { const b = M[j]; if (b.l <= sl) return { net: -(R + slip), R }; if (b.h >= tgtPrice) return { net: tgtPrice - entry, R } }
  const z = M[Math.min(j, M.length) - 1]; return { net: z.c - entry, R } }
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const summ = (xs) => { const n = xs.length, w = xs.filter((x) => x.net > 0).length, m = n ? xs.reduce((s, x) => s + x.net, 0) / n : null, rnd = seeded(5), bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let j = 0; j < n; j++) s += xs[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null, avg_sl: n ? +(xs.reduce((s, x) => s + x.R, 0) / n).toFixed(2) : null,
    net_per_R: n ? +(xs.reduce((s, x) => s + x.net / x.R, 0) / n).toFixed(3) : null } }
const out = { at: new Date().toISOString(), spec: 'docs/FWD_CHOCH_ENTRY_SPEC.md', arms: {} }
for (const [arm, sigs] of Object.entries(ARMS)) {
  const base = sigs.map((s) => { const Dv = atrD(s.t); return { t: s.t, net: s.baseNet, R: Dv ? 2 * Dv : 1 } }), res = { base: summ(base), cells: {} }
  const ent = sigs.map((s) => { const e = refinedEntry(s.t); if (!e) return null; const k0 = lb(MT, s.t), c = M[k0 - 1]?.c, Dv = atrD(s.t); return { ...e, sigT: s.t, origTarget: c != null && Dv ? c + spreadAt(s.t) + 0.2 * Dv : null } })
  res.fill_rate = +(ent.filter(Boolean).length / sigs.length).toFixed(4)
  for (const [name, tf] of [['orig_target', (e) => e.origTarget], ['2R', (e) => e.closeBid + spreadAt(e.t) + 2 * (e.closeBid + spreadAt(e.t) - (e.low - PAD))], ['3R', (e) => e.closeBid + spreadAt(e.t) + 3 * (e.closeBid + spreadAt(e.t) - (e.low - PAD))]]) {
    const tr = []; for (const e of ent) { if (!e) continue; const tg = tf(e); if (tg == null) continue; const r = trade(e, tg); if (r) tr.push({ t: e.t, ...r }) }
    const s = summ(tr), yr = {}; for (const x of tr) { const y = new Date(x.t).getUTCFullYear(); (yr[y] ||= []).push(x) }
    const yq = Object.values(yr).filter((v) => v.length >= 20), posY = yq.filter((v) => v.reduce((a, x) => a + x.net, 0) > 0).length
    const perSignal = +(tr.reduce((a, x) => a + x.net, 0) / sigs.length).toFixed(3)
    const verdict = s.n >= 100 && s.wr >= 0.9 && s.net_lb > 0 && posY >= Math.ceil(0.8 * yq.length) ? 'PASS' : 'FAIL'
    res.cells[name] = { ...s, per_signal: perSignal, positive_years: `${posY}/${yq.length}`, by_year: Object.fromEntries(Object.entries(yr).map(([y, v]) => [y, `${v.length} t ${(100 * v.filter((x) => x.net > 0).length / v.length).toFixed(1)}% $${(v.reduce((a, x) => a + x.net, 0) / v.length).toFixed(2)}`])), verdict } }
  out.arms[arm] = res
  console.log(`\n${arm}: base WR ${res.base.wr} $/t ${res.base.net} (SL ~$${res.base.avg_sl}) · refined fill ${(100 * res.fill_rate).toFixed(1)}%`)
  for (const [k, c] of Object.entries(res.cells)) console.log(`  ${k.padEnd(12)} n ${c.n} WR ${c.wr} $/t ${c.net} [LB ${c.net_lb}] avg SL $${c.avg_sl} netR ${c.net_per_R} · $/signal ${c.per_signal} · years+ ${c.positive_years} → ${c.verdict}`) }
fs.writeFileSync(path.join(TURBO.master, process.argv.includes('--mtf') ? 'fwd_choch_entry_mtf.json' : 'fwd_choch_entry.json'), JSON.stringify(out, null, 1))
