// ════════════════════════════════════════════════════════════════════════════════
// study_structure_3m.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> — 3m structure confirmation at the LAST-YEAR swing tips (spec
// docs/STRUCTURE_3M_CONFIRMATION_SPEC.md; Ashraf 2026-10-18: "Yes, run it as written").
// ────────────────────────────────────────────────────────────────────────────────
// Anchor swings = the SAME swings as docs/swing_book/<short>_1y_swings/ (ZigZag 3 × ATR(14) on full history, rebuilt here and checked equal to the
// CSV, candle by candle). Controls = FAILED extremes of the same anchor TF (pullback ≥ 1 anchor ATR, then exceeded).
// Everything is written for a LOW tip; a HIGH tip is the mirror (prices negated), so one code path serves both.
// Exact operational choices (fixed before any number was seen; the spec words are in brackets):
//   • 3m pivot high: h[i] > h of the 3 candles before and ≥ h of the 3 after (mirror for lows). Known at the close of candle i + 3.
//   • tip on 3m: the first 3m candle inside the anchor candle whose low equals the anchor low.
//   • leg into the tip: from the anchor candle of the previous confirmed swing (any type) up to the tip.
//   • confirmation level: the last 3m pivot high in that leg with index < tip ["last lower high"]. None → "no 3m level".
//   • confirmation: first 3m CLOSE above the level after the tip, before any 3m low goes BELOW the tip, within 20 anchor candles.
//   • wick first: a 3m high above the level without a close above it, before the confirming close.
//   • sweep: the previous 3m pivot low of the leg is taken by the tip and the TIP 3m candle closes back above that pivot low.
//   • higher-low turn: a 3m pivot low strictly between tip and confirmation; V-turn = none.
//   • double tip: after the first 3m pivot high following the tip, a 3m low comes back within 0.25 anchor ATR of the tip before confirmation.
//   • retest: after the confirming candle, a 3m low ≤ level + 0.1 × ATR3 before price reaches level + (level − tip) [the 1:1 extension] or breaks
//     the tip; HOLDS = no 3m close below the level from the retest until that end.
//   • strong confirming candle: body / range ≥ 0.6 in the turn direction AND close in the top 25 % of its range.
//   • second confirmation: the first 3m pivot high formed after the confirming candle is closed above, before the tip breaks.
// AUDIT CHECK (2026-10-18, added after the first run, before its numbers): the pullback ≥ 1 ATR control filter is known only afterwards, so EVERY
// failed extreme is also measured (group 'failed_small' = pullback < 1 ATR) and the report adds precision against all of them (main rows unchanged: 0 diffs).
// Output: data/master/structure_3m_<short>.json + docs/swing_book/structure3m/<short>_<tf>.csv (every tip, real + control).
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { zigzag } from '../src/master/swings.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeStructure } from './lib/structure3m.mjs'

const SYM = process.argv[2] || 'XAUUSD', SH = SHORT[SYM], ANCH = ['15m', '1H', '4H', '1D'], K = 3, CTRL_PULL = 1, HORIZON = 20
const MIN = 60000, DAY = 86400000, DUR = { '15m': 15 * MIN, '1H': 60 * MIN, '4H': 240 * MIN, '1D': DAY }
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')
const KIT = kit(SYM), M = await clean1m(SYM), holes = findHoles(M), LAST = M.at(-1).t, FROM = LAST - 365 * DAY

// ── 3m candles, ATR, the structure rules (ONE implementation: scripts/lib/structure3m.mjs, proved by smoke_structure_3m) ──
const C3 = KIT.build(M, '3m').filter((c) => c.t >= FROM - 400 * DAY); markIncomplete(C3, holes)
const { measure } = makeStructure(C3, atrArr(C3, 14), LAST)

// ── anchors ───────────────────────────────────────────────────────────────────
const out = { at: new Date().toISOString(), symbol: SYM, session: KIT.session, spec: 'docs/STRUCTURE_3M_CONFIRMATION_SPEC.md', window: [iso(FROM), iso(LAST)], tf: {} }
const csvDir = path.join(TURBO.root, 'docs', 'swing_book', 'structure3m'); fs.mkdirSync(csvDir, { recursive: true })
for (const tf of ANCH) {
  const C = KIT.build(M, tf); markIncomplete(C, holes)
  const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0))
  const { swings, failed } = zigzag(C, { k: K, breaks })
  // regression: the swing set must equal the published table
  const csv = fs.readFileSync(path.join(TURBO.root, 'docs', 'swing_book', `${SH}_1y_swings`, `${tf}.csv`), 'utf8').trim().split('\n').slice(1).map((l) => l.split(',').slice(0, 2).join('|'))
  const mine = swings.filter((s) => s.t >= FROM).map((s) => `${s.type === 'H' ? 'HIGH' : 'LOW'}|${iso(C[s.i].t)}`)
  const same = csv.length === mine.length && csv.every((x, k) => x === mine[k])
  const prevSwing = (i) => { let a = 0, b = swings.length; while (a < b) { const m = (a + b) >> 1; if (swings[m].i < i) a = m + 1; else b = m } return swings[a - 1] ?? null }
  const rows = []
  for (const sw of swings) { if (sw.t < FROM) continue; const pv = prevSwing(sw.i)
    rows.push({ group: 'real', type: sw.type === 'H' ? 'HIGH' : 'LOW', candle: iso(C[sw.i].t), price: sw.px, anchor_atr: +sw.atr.toFixed(4),
      ...measure({ type: sw.type, c: C[sw.i], px: sw.px, aAtr: sw.atr, legStartT: pv ? C[pv.i].t : C[sw.i].t - 30 * DUR[tf], endT: C[sw.i].t + HORIZON * DUR[tf] }) }) }
  for (const f of failed) { if (f.t < FROM) continue; const pv = prevSwing(f.i)
    rows.push({ group: f.pullback_atr >= CTRL_PULL ? 'failed' : 'failed_small', type: f.type === 'H' ? 'HIGH' : 'LOW', candle: iso(C[f.i].t), price: f.px, anchor_atr: +f.atr.toFixed(4), pullback_atr: +f.pullback_atr.toFixed(2),
      ...measure({ type: f.type, c: C[f.i], px: f.px, aAtr: f.atr, legStartT: pv ? C[pv.i].t : C[f.i].t - 30 * DUR[tf], endT: C[f.i].t + HORIZON * DUR[tf] }) }) }
  rows.sort((a, b) => (a.candle < b.candle ? -1 : 1))
  const H = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  fs.writeFileSync(path.join(csvDir, `${SH}_${tf}.csv`), [H.join(',')].concat(rows.map((r) => H.map((k) => r[k] ?? '').join(','))).join('\n') + '\n')
  out.tf[tf] = { regression_same_swings_as_table: same, table_swings: csv.length, rows }
  const n = (g) => rows.filter((r) => r.group === g).length, bad = rows.filter((r) => r.status !== 'ok').length
  console.log(`  ${tf.padEnd(3)} real ${n('real')} · failed controls ${n('failed')} · swings = table: ${same} · no 3m tip: ${bad}`)
}
fs.writeFileSync(path.join(TURBO.master, `structure_3m_${SH}.json`), JSON.stringify(out))
console.log(`written data/master/structure_3m_${SH}.json + docs/swing_book/structure3m/${SH}_*.csv`)
