// ════════════════════════════════════════════════════════════════════════════════
// study_confirm3m.mjs <XAUUSD|XAGUSD|DXY_ICE|WTI> — the money test of entering on the 3m confirmation at 15m swing tips, overall and AT S/R levels
// (spec docs/CONFIRM3M_MONEY_SPEC.md; Ashraf 2026-10-19 "Yes, run it as written"). Entries / trades: scripts/lib/confirm3m.mjs (ADDENDUM A: full spread).
// ADDENDUM B (2026-10-19, before any number): the minutes are used RAW (reopenClamp off) — the TradingView reopen clamp looks 10 minutes ahead,
// which a money test must not do. Levels: src/master/srLevels.js on the same raw candles.
// S/R tags at the trigger (level born before the tip, alive and on the matching side at the tip, within 0.25 ATR(tf) of the tip):
//   at_tf = highest timeframe present (−1 none) · confluence = distinct timeframes with such a level within 0.25 × ATR(1D) of the tip ·
//   held = most earlier holds (current phase) among the matching levels · usual-strong = at_tf ≥ 1D OR confluence ≥ 3 (≥ 2 others) OR held ≥ 2.
// Second arm: entry on the first 3m close back beyond the level after a retest (low ≤ level + 0.1 × ATR3), within 20 × 3m, tip unbroken.
// Costs: XAU measured spread table; XAG its measured table (spread_table_XAGUSD.json); DXY (not tradable) and WTI (no measured spread) = R BEFORE costs.
// Output: data/master/confirm3m_<short>.json.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt, loadSpreadTable } from '../src/master/spreadModel.js'
import { SR, SR_TFS, swingLevels, evaluateLevel } from '../src/master/srLevels.js'
import { findTriggers, simulate, C3M } from './lib/confirm3m.mjs'

const GROSS = process.argv.includes('--gross')   // diagnostic: the same trades with spread 0 (measures whether the loss is the spread or the entry)
const SYM = process.argv[2] || 'XAUUSD', SH = SHORT[SYM] + (GROSS ? '_gross' : ''), K = kit(SYM, { reopenClamp: false }), M = await clean1m(SYM, { reopenClamp: false }), holes = findHoles(M)
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }
const COST = GROSS ? 'GROSS diagnostic: spread 0' : SYM === 'XAUUSD' ? 'measured spread table (Polygon quotes)' : SYM === 'XAGUSD' ? 'measured spread table XAGUSD (Polygon quotes)' : 'R BEFORE costs (no tradable / measured spread)'
const spreadAt = GROSS ? () => 0 : SYM === 'XAUUSD' ? makeSpreadAt() : SYM === 'XAGUSD' ? makeSpreadAt({ table: loadSpreadTable(path.join(TURBO.master, 'spread_table_XAGUSD.json')) }) : () => 0
const C = {}; for (const tf of ['3m', '15m', ...SR_TFS]) { C[tf] = K.build(M, tf); markIncomplete(C[tf], holes) }
const breaks15 = new Set(C['15m'].map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0))
const FROM = M[0].t + 30 * 86400000, LAST = M.at(-1).t, FOLD = (LAST - FROM) / 8
const trig = findTriggers(C['3m'], C['15m'], breaks15, { from: FROM })
// ── S/R level timelines per timeframe ──
const LV = {}, ATR = {}
for (const tf of SR_TFS) { const Ct = C[tf], A = atrArr(Ct, 14); ATR[tf] = { C: Ct, A }
  const breaks = new Set(Ct.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0))
  LV[tf] = swingLevels(Ct, breaks).map((lv) => { const e = evaluateLevel(Ct, A, lv)
    return { px: lv.px, side0: lv.side, born: Ct[lv.birth].close_t, flipT: e.flips[0] != null ? Ct[e.flips[0]].close_t : Infinity, endT: e.end === 'retired' ? Ct[e.endI].close_t : Infinity,
      held: e.touches.filter((t) => t.outcome === 'held').map((t) => [Ct[t.resolvedI].close_t, t.phase]) } }).sort((a, b) => a.px - b.px) }
const atrAt = (tf, t) => { const { C: Ct, A } = ATR[tf], k = lb(Ct, t, (c) => c.close_t) - 1; return k >= 0 ? A[k] : null }
function srTag(tr) { const want = tr.side === 'BUY' ? 'support' : 'resistance', T = tr.tipT, a1 = atrAt('1D', T); let atTf = -1, held = 0; const conf = new Set()
  SR_TFS.forEach((tf, ti) => { const a = atrAt(tf, T); if (!a) return; const L = LV[tf], band = Math.max(SR.TOUCH * a, a1 ? SR.CONFLUENCE_ATR1D * a1 : 0)
    for (let k = lb(L, tr.tipPx - band, (l) => l.px); k < L.length && L[k].px <= tr.tipPx + band; k++) { const l = L[k]; if (!(l.born <= T && l.endT > T)) continue
      const phase = T >= l.flipT ? 1 : 0, side = phase ? (l.side0 === 'support' ? 'resistance' : 'support') : l.side0; if (side !== want) continue
      const d = Math.abs(l.px - tr.tipPx); if (a1 && d <= SR.CONFLUENCE_ATR1D * a1) conf.add(tf)
      if (d <= SR.TOUCH * a) { atTf = Math.max(atTf, ti); held = Math.max(held, l.held.filter(([rt, ph]) => rt <= T && ph === phase).length) } } })
  return { atTf, conf: conf.size, held, strong: atTf >= 2 || conf.size >= 3 || held >= 2 } }
// ── retest arm ──
const A3 = atrArr(C['3m'], 14)
function retestOf(tr) { const C3 = C['3m'], buy = tr.side === 'BUY'
  for (let k = tr.trigJ + 1; k < Math.min(C3.length, tr.trigJ + 21); k++) { const c = C3[k]; if (buy ? c.l < tr.tipPx : c.h > tr.tipPx) return null
    const a3 = A3[k - 1] || 0, touched = buy ? c.l <= tr.level + 0.1 * a3 : c.h >= tr.level - 0.1 * a3
    if (touched && (buy ? c.c > tr.level : c.c < tr.level)) return { ...tr, trigT: c.close_t } }
  return null }
const rows = []
for (const tr of trig) { const tag = srTag(tr), rt = retestOf(tr), res = C3M.TARGETS.map((tg) => simulate(M, tr, tg, spreadAt)), rr = rt ? C3M.TARGETS.map((tg) => simulate(M, rt, tg, spreadAt)) : null
  const pack = (x) => (x && !x.open && !x.skipped && x.r != null ? [+x.r.toFixed(4), +x.pnl.toFixed(5)] : null)
  rows.push([tr.trigT, tr.side === 'BUY' ? 0 : 1, Math.min(7, Math.floor((tr.trigT - FROM) / FOLD)), tr.hl ? 1 : 0, tag.atTf, tag.conf, tag.held, tag.strong ? 1 : 0, res.map(pack), rr ? rr.map(pack) : null, +tr.atr15.toFixed(5)]) }
const out = { at: new Date().toISOString(), symbol: SYM, spec: 'docs/CONFIRM3M_MONEY_SPEC.md', addenda: ['A: full spread per round trip (bid minutes)', 'B: raw minutes (no reopen clamp)'], cost: COST, rules: C3M,
  window: [new Date(FROM).toISOString(), new Date(LAST).toISOString()], folds: Array.from({ length: 8 }, (_, f) => new Date(FROM + f * FOLD).toISOString()), days: (LAST - FROM) / 86400000,
  columns: ['trigT', 'side (0 BUY, 1 SELL)', 'fold', 'hl', 'at_tf (-1 none, 0 1H … 4 1M)', 'confluence', 'held', 'usual_strong', 'confirm arm [r, pnl] per target', 'retest arm [r, pnl] per target', 'atr15'], targets: C3M.TARGETS.map((x) => x[0]), trades: rows }
fs.writeFileSync(path.join(TURBO.master, `confirm3m_${SH}.json`), JSON.stringify(out))
const at = rows.filter((r) => r[4] >= 0).length
console.log(`  ${SYM}: ${rows.length} triggers in ${out.days.toFixed(0)} days (${(rows.length / out.days).toFixed(1)}/day) · at an S/R level ${at} · usual-strong ${rows.filter((r) => r[7]).length} · retest entries ${rows.filter((r) => r[9]).length} · cost: ${COST}`)
