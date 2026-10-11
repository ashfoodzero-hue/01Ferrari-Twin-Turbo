// ════════════════════════════════════════════════════════════════════════════════
// diagnose_revalidation_source.mjs — WHY does IMPULSE_CONT fail C2 on the twin's Polygon-1m tape? MEASURE, don't infer.
// ────────────────────────────────────────────────────────────────────────────────
// Re-validation A (2026-10-08, revalidate_A_polygon1m_oldcost.json): SHADOW, OOS CI LB −$0.14. Three candidate causes:
//   (1) the DATA SOURCE  — twin 15m = resampled Polygon 1m; Turbo2 15m = Dukascopy (to 2026-06) + Polygon appends
//   (2) the WINDOW       — 2013-07 → 2026-10 instead of 2003 → 2026: the 8 regime folds move, OOS shrinks
//   (3) a PIPELINE BUG   — resampler / candidate builder
// Arms (all with the validator's selection loop VERBATIM, the 1m-sequenced resolver on the twin's 1m, the shipped cost):
//   CONTROL   twin bars + twin candidates                        → must reproduce re-validation A exactly
//   T2_SAME   Turbo2 15m bars + Turbo2 candidates, cut to the SAME window [2013-07-14, 2026-10-08 15:45] (READ-ONLY)
//   T2_FULL   Turbo2's own shipped artifact (23y) for reference — read from _turbo2_frozen
// Plus: bar-level agreement (twin 15m vs Turbo2 15m per year) and candidate overlap (t, setup, direction).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO, REF, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollars } from '../src/master/execution.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { buildRegimeSpannedFolds, assignFold } from '../src/core/regimeSplitter.js'
import { normalizeBar } from '../src/data/bars.js'

const VAL_TO = Date.parse('2026-10-08T15:45:00Z')
const GEO = { slAtr: 1.5, tgtR: 0.5, beR: 0.05, beLockR: 0.10 }
const SETUP = new Set(['sweep_reclaim', 'fvg_continuation', 'ob_discount_tap', 'trend_pullback'])
const IMPULSE = { lookBars: 8, minAtrMult: 4 }, FOLDS = 8, TRAIN_FOLDS = 5
const m1 = (await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM - 86400000, to: VAL_TO })).bars
const subBarsOf = makeSubBarIndex(m1)
const readJsonl = async (f, keep) => { const o = []; for await (const l of readline.createInterface({ input: fs.createReadStream(f) })) { if (!l) continue; const x = JSON.parse(l); if (!keep || keep(x)) o.push(x) } return o }

/** The validator's loop, verbatim (validate_impulse_cont_ship.mjs), parameterised only by its inputs. */
function run(bars, cands) {
  const idxByT = new Map(bars.map((b, k) => [b.t, k]))
  const { folds } = buildRegimeSpannedFolds(bars, { folds: FOLDS })
  const fires = []; const nextFree = new Array(FOLDS).fill(-1)
  for (const c of cands) {
    if (c.atr <= 0 || !SETUP.has(c.setup) || c.i == null || c.i < IMPULSE.lookBars + 1) continue
    const fold = assignFold(folds, c.i); if (fold < 0) continue
    const move = bars[c.i].c - bars[c.i - IMPULSE.lookBars].c
    if (Math.abs(move) < IMPULSE.minAtrMult * c.atr) continue
    if ((move > 0) !== (c.direction === 'UP')) continue
    if (c.i < nextFree[fold]) continue
    const up = c.direction === 'UP', risk = GEO.slAtr * c.atr
    const plan = { entry: c.entry, sl: up ? c.entry - risk : c.entry + risk, tp: up ? c.entry + GEO.tgtR * risk : c.entry - GEO.tgtR * risk }
    const r = resolveManagedLimitSeq({ direction: c.direction, plan, ts_utc: new Date(c.t).toISOString() }, bars, idxByT, subBarsOf, { fillWindow: 8, horizon: 64, beTriggerR: GEO.beR, beLockR: GEO.beLockR, tfMs: 900000 })
    if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') continue
    nextFree[fold] = c.i + (r.fill_bars || 0) + (r.resolve_bars || 0) + 1
    fires.push({ fold, outcome: r.outcome, net: netDollars({ grossMove: r.grossMove, entryHourUtc: r.entryHourUtc, atr: c.atr, exitType: r.exitType }), t: c.t, risk })
  }
  const oos = fires.filter((x) => x.fold >= TRAIN_FOLDS), tr = fires.filter((x) => x.fold < TRAIN_FOLDS)
  const W = oos.filter((x) => x.outcome === 'WIN').length, L = oos.filter((x) => x.outcome === 'LOSS').length
  let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const boots = []; for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < oos.length; i++) s += oos[(rnd() * oos.length) | 0].net; boots.push(s / oos.length) }
  boots.sort((a, b) => a - b)
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x.net, 0) / a.length : 0)
  const byYear = {}; for (const f of fires) { const y = new Date(f.t).getUTCFullYear(); (byYear[y] ??= []).push(f) }
  return { fires: fires.length, oos_n: oos.length, dec: W + L, wr: +(W / (W + L)).toFixed(4), lb: +wilsonLowerBound(W, W + L).toFixed(4), oos_net: +mean(oos).toFixed(4), ci: [+boots[50].toFixed(4), +boots[1949].toFixed(4)], train_net: +mean(tr).toFixed(4),
    fold_edges: folds.map((f) => new Date(bars[f.start ?? f[0] ?? 0]?.t ?? 0).toISOString?.().slice(0, 10)),
    oos_from: oos.length ? new Date(Math.min(...oos.map((x) => x.t))).toISOString().slice(0, 10) : null,
    by_year: Object.fromEntries(Object.entries(byYear).map(([y, a]) => [y, { n: a.length, net: +mean(a).toFixed(3) }])) }
}

// Turbo2's candidate cache was last built 2026-07-17 → the like-for-like arms share END = its last candidate bar
const END = Date.parse('2026-07-17T20:15:00Z')
// CONTROL — the twin's own inputs
const twinBars = (await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })).bars
const twinCands = await readJsonl(path.join(TURBO.master, 'candidates_15m_full.jsonl'))
const control = run(twinBars, twinCands)
console.log('CONTROL (twin, to 10-08)', JSON.stringify({ ...control, by_year: undefined, fold_edges: undefined }))
const twinBarsE = twinBars.filter((b) => b.t <= END), twinCandsE = twinCands.filter((c) => c.t <= END)
const twinSame = run(twinBarsE, twinCandsE)
console.log('TWIN_SAME_END (to 07-17) ', JSON.stringify({ ...twinSame, by_year: undefined, fold_edges: undefined }))

// T2_SAME — Turbo2's 15m + candidates, same window (read-only); candidate indices remapped by time
const t2All = (await readJsonl(path.join(REF.turbo2History('XAUUSD'), '15m_dukascopy_23y.jsonl'))).map(normalizeBar).filter(Boolean)
const t2Bars = t2All.filter((b) => b.t >= HISTORY_CONTINUOUS_FROM && b.t <= END).map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }))
const t2Idx = new Map(t2Bars.map((b, k) => [b.t, k]))
const t2Cands = (await readJsonl(path.join(REF.turbo2Master, 'candidates_15m_full.jsonl'), (c) => c.t >= HISTORY_CONTINUOUS_FROM && c.t <= END)).map((c) => ({ ...c, i: t2Idx.get(c.t) })).filter((c) => c.i != null)
const t2same = run(t2Bars, t2Cands)
console.log('T2_SAME_END (turbo2, to 07-17)', JSON.stringify({ ...t2same, by_year: undefined, fold_edges: undefined }))

// bar agreement per year (twin resampled 15m vs Turbo2 15m)
const tw = new Map(twinBarsE.map((b) => [b.t, b])); const agree = {}
for (const b of t2Bars) { const y = new Date(b.t).getUTCFullYear(); const a = (agree[y] ??= { both: 0, same: 0, onlyT2: 0, maxD: 0 }); const x = tw.get(b.t); if (!x) { a.onlyT2++; continue } a.both++; const d = Math.max(...['o', 'h', 'l', 'c'].map((k) => Math.abs(x[k] - b[k]))); if (d < 0.005) a.same++; a.maxD = Math.max(a.maxD, d) }
for (const a of Object.values(agree)) { a.samePct = +(100 * a.same / a.both).toFixed(1); a.maxD = +a.maxD.toFixed(2) }
console.log('bar agreement (|Δ|<$0.005) per year:', Object.entries(agree).map(([y, a]) => `${y}:${a.samePct}%`).join(' '))
// candidate overlap
const key = (c) => `${c.t}|${c.setup}|${c.direction}`; const tk = new Set(twinCandsE.map(key)); const t2k = new Set(t2Cands.map(key))
const inter = [...tk].filter((k) => t2k.has(k)).length
console.log('candidate overlap:', { twin: tk.size, turbo2_same_window: t2k.size, both: inter, jaccard: +(inter / (tk.size + t2k.size - inter)).toFixed(3) })
const t2Full = JSON.parse(fs.readFileSync(path.join(TURBO.master, '_turbo2_frozen', 'impulse_cont_seq1m_gate.json'), 'utf8'))
const out = { generated_utc: new Date().toISOString(), tape_to: new Date(VAL_TO).toISOString(), same_end: new Date(END).toISOString(), control, twin_same_end: twinSame, t2_same_window: t2same, t2_full_23y_artifact: t2Full.shipped, bar_agreement: agree, candidate_overlap: { twin: tk.size, turbo2: t2k.size, both: inter } }
fs.writeFileSync(path.join(TURBO.master, 'diagnose_revalidation_source.json'), JSON.stringify(out, null, 1))
console.log('by-year net/t  twin:', Object.entries(twinSame.by_year).map(([y, s]) => `${y}:${s.net}(${s.n})`).join(' '))
console.log('by-year net/t  t2  :', Object.entries(t2same.by_year).map(([y, s]) => `${y}:${s.net}(${s.n})`).join(' '))
