// ════════════════════════════════════════════════════════════════════════════════
// study_sr_levels.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> — S/R levels on 1H / 4H / 1D / 1W / 1M: every touch of every real level and of its 4 placebo copies,
// with the pre-registered strength features (spec docs/SR_LEVELS_SPEC.md; Ashraf 2026-10-18: "Yes, run it as written"). Rules: src/master/srLevels.js.
// Operational choices (fixed before any number):
//   • each level is tested on its OWN timeframe's candles (tf rank = that timeframe). The spec's merged "zone" is measured as CONFLUENCE: at the touch
//     time, the number of OTHER timeframes holding an alive real level within 0.25 × ATR(1D) of this level's price (ATR(1D) of the last closed 1D candle).
//   • a placebo copy carries its parent's features (tf, reaction, volume, confluence at the copy's touch time around the PARENT price); `touches`
//     (held_before) and `flipped` are the copy's own (the identical rule applied to the copy).
//   • reaction = the swing leg into the level, in ATR(tf); terciles per timeframe over the real levels.
//   • volume (XAU → GOLD_FUT, XAG → SILVER_FUT, WTI → its own CME series; DXY none): share of real CME volume traded within 0.1 × ATR(1D) of the level
//     price (futures closes shifted by the minute's basis = futures − spot close) over the swing leg; terciles per timeframe; ≈ 2 years only.
// Window: last 6 years (TRAIN = first 3, TEST = last 3); WTI: its Polygon history (≈ 2 years, described only).
// Output: data/master/sr_levels_<short>.json (events) + data/master/sr_display_<short>_<tf>.json (candles + real levels, for the app).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { loadBars } from '../src/data/backfillReader.js'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { SR, SR_TFS, swingLevels, evaluateLevel } from '../src/master/srLevels.js'

const SYM = process.argv[2] || 'XAUUSD', SH = SHORT[SYM], OFFS = [0, ...SR.PLACEBO], OUT = ['held', 'broke', 'open']
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z'), yearsBack = (t, y) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime() }
const KIT = kit(SYM), M = await clean1m(SYM), holes = findHoles(M), LAST = M.at(-1).t
const SHORTH = SYM === 'WTI', FROM = SHORTH ? M[0].t : yearsBack(LAST, 6), SPLIT = SHORTH ? null : yearsBack(LAST, 3)
const dp = SYM.startsWith('DXY') ? 4 : SYM === 'XAGUSD' ? 3 : 2, r = (x) => +x.toFixed(dp)
const lbT = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
// ── candles, ATR, levels per timeframe ──
const T = {}
for (const tf of SR_TFS) { const C = KIT.build(M, tf); markIncomplete(C, holes); const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)); T[tf] = { C, A: atrArr(C, 14), L: swingLevels(C, breaks) } }
const D1 = T['1D'], atr1dAt = (t) => { const k = lbT(D1.C, t, (c) => c.close_t) - 1; return k >= 0 ? D1.A[k] : null }   // last 1D candle closed by t
// ── volume share at each level (2 years of real CME volume) ──
const VOLSYM = { XAUUSD: 'GOLD_FUT', XAGUSD: 'SILVER_FUT', WTI: 'WTI' }[SYM]
let FUT = null, SPOT = null
if (VOLSYM) { FUT = (await loadBars(VOLSYM, '1m', { from: Date.UTC(2024, 8, 1) })).bars.filter((b) => b.v > 0); if (SYM !== 'WTI') { SPOT = new Map(); for (const b of M) if (b.t >= FUT[0]?.t) SPOT.set(b.t, b.c) } }
function volShare(px, t0, t1, band) {
  if (!FUT || !FUT.length || t0 < FUT[0].t) return null
  let tot = 0, near = 0
  for (let k = lbT(FUT, t0); k < FUT.length && FUT[k].t < t1; k++) { const b = FUT[k], basis = SPOT ? (SPOT.has(b.t) ? b.c - SPOT.get(b.t) : null) : 0; if (basis == null) continue; tot += b.v; if (Math.abs(b.c - basis - px) <= band) near += b.v }
  return tot > 0 ? near / tot : null
}
// ── evaluate every level (real + placebo) ──
const real = {}
for (const tf of SR_TFS) { const { C, A, L } = T[tf]
  L.forEach((lv, n) => { const prev = L[n - 1], a1 = atr1dAt(C[lv.birth].close_t)
    lv.tf = tf; lv.bornT = C[lv.birth].close_t; lv.vol = a1 ? volShare(lv.px, prev ? C[prev.i].t : C[lv.i].t, C[lv.birth].close_t, 0.1 * a1) : null
    lv.ev = OFFS.map((d) => evaluateLevel(C, A, lv, d * lv.atr)); lv.endT = lv.ev[0].end === 'retired' ? C[lv.ev[0].endI].close_t : Infinity })
  real[tf] = L.filter((lv) => lv.endT >= FROM).slice().sort((a, b) => a.px - b.px) }
const terc = (vals) => { const s = vals.filter((x) => x != null).sort((a, b) => a - b); return [s[Math.floor(s.length / 3)], s[Math.floor((2 * s.length) / 3)]] }
const tcut = Object.fromEntries(SR_TFS.map((tf) => [tf, { react: terc(T[tf].L.map((l) => l.reaction_atr)), vol: terc(T[tf].L.map((l) => l.vol)) }]))
const tOf = (x, q) => (x == null || q[0] == null ? -1 : x <= q[0] ? 0 : x <= q[1] ? 1 : 2)
function confluence(tf, px, t) { const a1 = atr1dAt(t); if (!a1) return 0; let n = 0
  for (const o of SR_TFS) { if (o === tf) continue; const R = real[o], band = SR.CONFLUENCE_ATR1D * a1
    for (let k = lbT(R, px - band, (l) => l.px); k < R.length && R[k].px <= px + band; k++) if (R[k].bornT <= t && R[k].endT > t) { n++; break } }
  return n }
const out = { at: new Date().toISOString(), symbol: SYM, session: KIT.session, spec: 'docs/SR_LEVELS_SPEC.md', rules: SR, window: [iso(FROM), iso(LAST)], split: SPLIT ? iso(SPLIT) : null, short_history: SHORTH,
  volume_source: VOLSYM ?? null, event_columns: ['tf', 'side', 'phase', 'held_before', 'outcome', 't', 'offset_index (0 = real)', 'confluence', 'reaction_tercile', 'volume_tercile (-1 none)', 'age_candles'],
  codes: { tf: SR_TFS, side: ['support', 'resistance'], outcome: OUT, offsets: OFFS }, terciles: tcut, tf: {} }
for (const tf of SR_TFS) { const { C, L } = T[tf], events = []
  for (const lv of L) { const rt = tOf(lv.reaction_atr, tcut[tf].react), vt = tOf(lv.vol, tcut[tf].vol)
    lv.ev.forEach((e, oi) => { for (const t of e.touches) { const tt = C[t.i].t; if (tt < FROM) continue
      events.push([SR_TFS.indexOf(tf), t.side === 'support' ? 0 : 1, t.phase, t.held_before, OUT.indexOf(t.outcome), tt, oi, confluence(tf, lv.px, tt), rt, vt, t.i - lv.birth]) } }) }
  out.tf[tf] = { candles_in_window: C.filter((c) => c.t >= FROM).length, levels: L.length, levels_alive_in_window: real[tf].length, touches_real: events.filter((e) => e[6] === 0).length, touches_placebo: events.filter((e) => e[6] > 0).length, events }
  const disp = L.filter((lv) => lv.endT >= FROM).map((lv) => { const e = lv.ev[0]
    return { sd: lv.side[0], px: r(lv.px), ts: C[lv.i].t, tb: C[lv.birth].t, te: e.end === 'retired' ? C[e.endI].t : null, end: e.end, side_now: e.side[0], flips: e.flips.map((i) => C[i].t), react: lv.reaction_atr == null ? null : +lv.reaction_atr.toFixed(2), rt: tOf(lv.reaction_atr, tcut[tf].react), vt: tOf(lv.vol, tcut[tf].vol),
      tch: e.touches.map((t) => [C[t.i].t, t.outcome[0], t.phase]) } })
  fs.writeFileSync(path.join(TURBO.master, `sr_display_${SH}_${tf}.json`), JSON.stringify({ at: out.at, symbol: SYM, tf, session: KIT.session, window: out.window, split: out.split, delayed: SYM === 'WTI',
    candles: C.filter((c) => c.t >= FROM).map((c) => [c.t, r(c.o), r(c.h), r(c.l), r(c.c)]), levels: disp }))
  console.log(`  ${tf.padEnd(3)} candles ${out.tf[tf].candles_in_window} · levels ${L.length} (alive in window ${real[tf].length}) · touches real ${out.tf[tf].touches_real} / placebo ${out.tf[tf].touches_placebo}`) }
fs.writeFileSync(path.join(TURBO.master, `sr_levels_${SH}.json`), JSON.stringify(out))
console.log(`written data/master/sr_levels_${SH}.json + sr_display_${SH}_<tf>.json · window ${out.window.join(' → ')}${SPLIT ? ' · split ' + out.split : ' · short history'}`)
