// ════════════════════════════════════════════════════════════════════════════════
// study_trendlines.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> — objective trendlines on 1W / 1D / 4H / 1H: every touch of every real line and of its 4
// placebo copies (spec docs/TRENDLINE_STUDY_SPEC.md; Ashraf 2026-10-18: "Yes, run it as written, WTI on 2 years only"). Rules: src/master/trendlines.js.
// Window: the last 6 years (TRAIN = first 3, TEST = last 3); WTI: its whole Polygon history (≈ 2 years, described only). Lines may be born before
// the window (warm history); only touches inside the window are counted.
// Output: data/master/trendlines_<short>.json (events) + data/master/trendlines_display_<short>_<tf>.json (candles + real lines, for the app page).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { TL, fractalPivots, majorPivots, buildLines, evaluateLine, lineAt } from '../src/master/trendlines.js'

const SYM = process.argv[2] || 'XAUUSD', SH = SHORT[SYM], TFS = ['1W', '1D', '4H', '1H']
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z'), yearsBack = (t, y) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime() }
const KIT = kit(SYM), M = await clean1m(SYM), holes = findHoles(M), LAST = M.at(-1).t
const SHORT_HISTORY = SYM === 'WTI', FROM = SHORT_HISTORY ? M[0].t : yearsBack(LAST, 6), SPLIT = SHORT_HISTORY ? null : yearsBack(LAST, 3)
const SCALES = ['major', 'minor'], SIDES = ['support', 'resistance'], CLS = ['trend', 'counter'], OUT = ['respect', 'break', 'open'], OFFS = [0, ...TL.PLACEBO]
const dp = SYM.startsWith('DXY') ? 4 : SYM === 'XAGUSD' ? 3 : 2, r = (x) => +x.toFixed(dp)
const out = { at: new Date().toISOString(), symbol: SYM, session: KIT.session, spec: 'docs/TRENDLINE_STUDY_SPEC.md', rules: TL, window: [iso(FROM), iso(LAST)], split: SPLIT ? iso(SPLIT) : null,
  short_history: SHORT_HISTORY, event_columns: ['scale', 'side', 'cls', 'steep_tercile', 'test', 'outcome', 't', 'offset_index (0 = real line)'], codes: { scale: SCALES, side: SIDES, cls: CLS, outcome: OUT, offsets: OFFS }, tf: {} }
for (const tf of TFS) {
  const C = KIT.build(M, tf); markIncomplete(C, holes)
  const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14)
  const piv = { major: majorPivots(C, breaks), minor: fractalPivots(C) }, all = []
  for (const sc of SCALES) for (const ln of buildLines(C, piv[sc], A)) { ln.scale = sc; all.push(ln) }
  const evs = all.map((ln) => OFFS.map((d) => evaluateLine(C, A, ln, d * ln.atrBirth)))
  const steep = all.filter((ln, k) => evs[k][0].born).map((ln) => Math.abs(ln.slope_atr)).sort((a, b) => a - b)
  const q1 = steep[Math.floor(steep.length / 3)], q2 = steep[Math.floor((2 * steep.length) / 3)], terc = (x) => (Math.abs(x) <= q1 ? 0 : Math.abs(x) <= q2 ? 1 : 2)
  const events = [], cnt = { lines: all.length, born_real: steep.length, touches_real: 0, touches_placebo: 0 }
  all.forEach((ln, k) => OFFS.forEach((d, oi) => { const e = evs[k][oi]; if (!e.born) return
    for (const t of e.touches) { if (C[t.i].t < FROM) continue
      events.push([SCALES.indexOf(ln.scale), SIDES.indexOf(ln.side), CLS.indexOf(ln.cls), terc(ln.slope_atr), t.test, OUT.indexOf(t.outcome), C[t.i].t, oi]); oi ? cnt.touches_placebo++ : cnt.touches_real++ } }))
  out.tf[tf] = { candles_in_window: C.filter((c) => c.t >= FROM).length, pivots: { major: piv.major.length, minor: piv.minor.length }, ...cnt, steep_terciles_atr_per_candle: [q1, q2], events }
  // display: candles in the window + every real line alive inside it (drawn from P1 to its end), with its touches
  const lines = []
  all.forEach((ln, k) => { const e = evs[k][0]; if (!e.born || C[e.endI].t < FROM) return
    lines.push({ s: ln.scale[0], sd: ln.side[0], c: ln.cls[0], t1: C[ln.i1].t, p1: r(ln.p1), t2: C[ln.i2].t, p2: r(ln.p2), tb: C[ln.birth].t, te: C[e.endI].t, pe: r(lineAt(ln, e.endI)), end: e.end,
      st: terc(ln.slope_atr), tch: e.touches.map((t) => [C[t.i].t, r(lineAt(ln, t.i)), t.outcome[0], t.test]) }) })
  fs.writeFileSync(path.join(TURBO.master, `trendlines_display_${SH}_${tf}.json`), JSON.stringify({ at: out.at, symbol: SYM, tf, session: KIT.session, window: out.window, split: out.split,
    candles: C.filter((c) => c.t >= FROM).map((c) => [c.t, r(c.o), r(c.h), r(c.l), r(c.c)]), lines }))
  console.log(`  ${tf.padEnd(3)} candles ${out.tf[tf].candles_in_window} · pivots ${piv.major.length} major / ${piv.minor.length} minor · lines ${all.length} (born ${steep.length}) · touches real ${cnt.touches_real} / placebo ${cnt.touches_placebo} · display lines ${lines.length}`)
}
fs.writeFileSync(path.join(TURBO.master, `trendlines_${SH}.json`), JSON.stringify(out))
console.log(`written data/master/trendlines_${SH}.json + trendlines_display_${SH}_<tf>.json · window ${out.window.join(' → ')}${SPLIT ? ` · split ${out.split}` : ' · short history: described only'}`)
