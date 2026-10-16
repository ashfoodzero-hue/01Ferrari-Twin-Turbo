// ════════════════════════════════════════════════════════════════════════════════
// study_c4h_levels.mjs — the measured numbers behind the 4H-LEVEL Telegram notices (2026-10-16; Ashraf: "send this msg about 5 m before it
// reaches the defended level price"). Levels = every closed NY 4H candle's high / low, kept until a 1m close goes beyond (study (be) C4H).
//   (1) APPROACH: the first minute price comes within ONE 5m-ATR of an active level (≈ one 5-minute candle away) with no touch of that level in
//       the previous 2 h → does it touch within 15 min? if it touches, does the level hold (hold rule of wallDefense.holdLabel)?
//   (2) TOUCH classes (swingWallEvents on the same levels): all / defended / strong (TRAIN p66, saved) / attacked hold, + ≥ $10 within 4 h.
// OOS = last 40 % (the numbers shown); TRAIN reported. Output: data/master/c4h_level_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { swingWallEvents, holdLabel, WALL } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM), H4 = 4 * 3600000
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 60 * 86400000, to: TO + 86400000 })).bars
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'])).ny, LV = { highs: G4.map((b) => ({ knownT: b.t + H4, px: b.h })), lows: G4.map((b) => ({ knownT: b.t + H4, px: b.l })) }
// 5m ATR14 (Wilder) aligned per minute: the ATR of the last CLOSED 5m bar
const atr5 = new Float64Array(M.length); { let a = null, cur = null, prevC = null
  for (let i = 0; i < M.length; i++) { const b = M[i], k = Math.floor(b.t / 300000)
    if (!cur || cur.k !== k) { if (cur) { const tr = prevC == null ? cur.h - cur.l : Math.max(cur.h - cur.l, Math.abs(cur.h - prevC), Math.abs(cur.l - prevC)); a = a == null ? tr : (a * 13 + tr) / 14; prevC = cur.c } cur = { k, h: b.h, l: b.l, c: b.c } }
    else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c } atr5[i] = a ?? 0 } }
// (1) APPROACH events
const act = { ceiling: [], floor: [] }; let hi = 0, lo = 0; const lastNear = new Map(), lastTouch = new Map(), app = []
for (let i = 1; i < M.length; i++) { const b = M[i]; if (b.t > TO) break
  while (hi < LV.highs.length && LV.highs[hi].knownT <= b.t) act.ceiling.push(LV.highs[hi++].px)
  while (lo < LV.lows.length && LV.lows[lo].knownT <= b.t) act.floor.push(LV.lows[lo++].px)
  const a = atr5[i]; if (b.t >= FROM && a > 0) {
    const ce = act.ceiling.filter((px) => px > b.c).reduce((m, px) => (m == null || px < m ? px : m), null), fl = act.floor.filter((px) => px < b.c).reduce((m, px) => (m == null || px > m ? px : m), null)
    for (const [type, px] of [['ceiling', ce], ['floor', fl]]) { if (px == null) continue; const key = type + px, dist = Math.abs(px - b.c)
      if (dist <= a && dist > 0.25 && b.t - (lastTouch.get(key) ?? -Infinity) > 2 * 3600000 && b.t - (lastNear.get(key) ?? -Infinity) > 2 * 3600000) { lastNear.set(key, b.t)
        let ti = null; for (let j = i + 1; j < M.length && M[j].t <= b.t + 15 * 60000; j++) if (type === 'ceiling' ? M[j].h >= px : M[j].l <= px) { ti = j; break }
        const binW = Math.max(0.1, +(b.c * WALL.binFrac).toFixed(2)), hold = ti == null ? null : holdLabel(M, { type, wall: px, binW, di: ti })
        app.push({ t: b.t, type, dist, atr: a, touched: ti != null, mins: ti == null ? null : (M[ti].t - b.t) / 60000, hold }) } } }
  for (const type of ['ceiling', 'floor']) for (const px of act[type]) if (type === 'ceiling' ? b.h >= px : b.l <= px) lastTouch.set(type + px, b.t)
  act.ceiling = act.ceiling.filter((px) => !(b.c > px)); act.floor = act.floor.filter((px) => !(b.c < px)) }
const r = (xs, f) => xs.length ? +(xs.filter(f).length / xs.length).toFixed(4) : null, med = (v) => v.length ? v.sort((a, b) => a - b)[v.length >> 1] : null
const appStats = (xs) => { const t = xs.filter((e) => e.touched), h = t.filter((e) => e.hold != null)
  return { n: xs.length, touch_within_15m: r(xs, (e) => e.touched), median_minutes_to_touch: med(t.map((e) => e.mins)), hold_if_touched: r(h, (e) => e.hold), n_touched_labelled: h.length,
    by_side: { ceiling: r(xs.filter((e) => e.type === 'ceiling'), (e) => e.touched), floor: r(xs.filter((e) => e.type === 'floor'), (e) => e.touched) } } }
// (2) TOUCH classes
const ev = swingWallEvents(M, LV, { from: FROM }).filter((e) => e.decisionT <= TO)
for (const e of ev) { e.hold = holdLabel(M, e); const c0 = M[e.di].c, up = e.type === 'floor'; let best = 0
  for (let j = e.di + 1; j < M.length && M[j].t <= e.decisionT + 4 * 3600000; j++) best = Math.max(best, up ? M[j].h - c0 : c0 - M[j].l); e.ft10 = best >= 10 }
const lab = ev.filter((e) => e.hold != null), trn = lab.filter((e) => e.decisionT < SPLIT), oos = lab.filter((e) => e.decisionT >= SPLIT)
const m66 = (() => { const v = trn.filter((e) => e.defense).map((e) => e.mag).sort((a, b) => a - b); return v[Math.floor(v.length * 2 / 3)] })()
const C = { all: () => true, defended: (e) => e.defense, strong: (e) => e.defStronger || (e.defense && e.mag > m66), attacked: (e) => !e.defense }
const cls = (xs) => Object.fromEntries(Object.entries(C).map(([k, f]) => [k, { n: xs.filter(f).length, hold: r(xs.filter(f), (e) => e.hold) }]))
const res = { at: new Date().toISOString(), levels: 'closed NY 4H candle highs / lows, kept until a 1m close beyond', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], oos_from: new Date(SPLIT).toISOString(),
  approach: { definition: 'first minute within one 5m-ATR14 of an active 4H level (no touch / approach of it in the prior 2 h)', oos: appStats(app.filter((e) => e.t >= SPLIT)), train: appStats(app.filter((e) => e.t < SPLIT)) },
  touch: { strong_threshold_train_p66: m66, oos: cls(oos), train: cls(trn), oos_after_hold_ft10: r(oos.filter((e) => e.hold), (e) => e.ft10) },
  scalp_reference: 'study (be) wall_scalp_study.json C4H: WR 43.5 %, −$0.50/t — NOT a trade' }
fs.writeFileSync(path.join(TURBO.master, 'c4h_level_study.json'), JSON.stringify(res, null, 1))
console.log('APPROACH (OOS):', JSON.stringify(res.approach.oos)); console.log('APPROACH (TRAIN):', JSON.stringify(res.approach.train))
console.log('TOUCH (OOS):', JSON.stringify(res.touch.oos), '· after hold ≥$10 in 4h', res.touch.oos_after_hold_ft10, '· strong p66', m66.toFixed(3)); console.log('TOUCH (TRAIN):', JSON.stringify(res.touch.train))
