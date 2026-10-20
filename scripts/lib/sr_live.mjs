// sr_live.mjs — the ONE implementation of the LIVE S/R levels (2026-10-18; Ashraf: "keep updating the strength of those level from the correct source
// make sure we have no stales during feeding"). Shared by scripts/sr_refresh.mjs (after every closed 1H candle, per asset) and
// scripts/replay_sr_levels.mjs (the proof: levels / records computed live on a history prefix must equal the full-history truth cut at that time).
// Rules = src/master/srLevels.js. Each level carries its OWN live record (tests held / broke, flips) and the MEASURED hold % of its classes from
// data/master/sr_levels_study.json — never the word "strong" unless the study's STRONG flag is set for that class (none on 2026-10-18).
import { findHoles, markIncomplete } from '../../src/core/dataHoles.js'
import { atr as atrArr } from '../../src/core/indicators.js'
import { SR, SR_TFS, swingLevels, evaluateLevel } from '../../src/master/srLevels.js'
import { kit } from './series_1m.mjs'
import { openOf } from './trendline_live.mjs'

const lbT = (C, t) => { let a = 0, b = C.length; while (a < b) { const m = (a + b) >> 1; if (C[m].t < t) a = m + 1; else b = m } return a }

/** Closed candles per timeframe at `now` (prebuilt `candles` = replay: closed candles never change). */
export function closedCandles(sym, M, now, { candles = null, holes = null } = {}) {
  const K = kit(sym), out = {}, H = candles ? null : (holes ?? findHoles(M))   // once, not per timeframe (2026-10-20: 3.5 s × 5 on the full history)
  for (const tf of SR_TFS) { const fo = openOf(sym, now, tf)
    if (candles) out[tf] = candles[tf].slice(0, lbT(candles[tf], fo))
    else { const C = K.build(M, tf).filter((c) => c.t < fo); markIncomplete(C, H); out[tf] = C } }
  return out
}

/** Every level of every timeframe with its state at the end of the closed candles. study = sr_levels_<short>.json (terciles), S = sr_levels_study.json. */
export function srLevelsAt(sym, CC, { study = null, S = null, nearAtr = 10 } = {}) {
  const res = { tf: {} }, all = []
  for (const tf of SR_TFS) { const C = CC[tf]; if (!C?.length) { res.tf[tf] = { levels: [], last_closed: null }; continue }
    const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14), L = C.length - 1
    const q = study?.terciles?.[tf]?.react, rt = (x) => (x == null || !q || q[0] == null ? -1 : x <= q[0] ? 0 : x <= q[1] ? 1 : 2)
    const levels = swingLevels(C, breaks).map((lv) => { const e = evaluateLevel(C, A, lv)
      return { id: `${sym}|${tf}|${C[lv.i].t}`, tf, px: lv.px, side0: lv.side, side_now: e.side, phase: e.phase, born: C[lv.birth].close_t, swing_t: C[lv.i].t, reaction_atr: lv.reaction_atr, reaction_tercile: rt(lv.reaction_atr),
        end: e.end, ended: e.end === 'retired' ? C[e.endI].close_t : null, flips: e.flips.map((i) => C[i].close_t),
        record: { tests: e.touches.filter((t) => t.outcome !== 'open').length, held: e.touches.filter((t) => t.outcome === 'held').length, broke: e.touches.filter((t) => t.outcome === 'broke').length },
        held_before: e.touches.filter((t) => t.phase === e.phase && t.outcome === 'held').length, armed: e.armed, pending: e.pending ? C[e.pending.i].t : null,
        touches: e.touches.map((t) => [C[t.i].t, t.outcome, t.phase, t.resolvedI == null ? null : C[t.resolvedI].close_t]) } })
    res.tf[tf] = { last_closed: C[L].t, last_close: C[L].c, atr: A[L], levels }; all.push(...levels.filter((l) => l.end === 'open').map((l) => ({ ...l, atr: A[L], last_close: C[L].c }))) }
  // confluence now: other timeframes with an alive level within 0.25 × ATR(1D) (last closed 1D ATR)
  const a1 = res.tf['1D']?.atr
  for (const tf of SR_TFS) for (const l of res.tf[tf].levels) { if (l.end !== 'open') continue
    l.confluence = a1 ? new Set(all.filter((o) => o.tf !== tf && Math.abs(o.px - l.px) <= SR.CONFLUENCE_ATR1D * a1).map((o) => o.tf)).size : 0
    const T = res.tf[tf]; l.dist_atr = +((T.last_close - l.px) / T.atr).toFixed(2); l.near = Math.abs(l.dist_atr) <= nearAtr
    const bc = S?.by_class?.[`${sym}|${tf}`], pick = (k) => (bc?.[k] ? { cls: k, held: bc[k].all.real, placebo: bc[k].all.placebo, n: bc[k].all.n_real, described_only: bc[k].described_only } : null)
    const strongKeys = new Set(S?.summary?.strong ?? [])
    l.measured = [pick('all levels'), pick(l.confluence >= 2 ? 'confluence 2+' : `confluence ${l.confluence}`), pick(l.held_before >= 3 ? 'held before 3+' : `held before ${l.held_before}`), pick(l.phase ? 'flipped level' : 'first-phase level')].filter(Boolean)
    l.strong = l.measured.some((m) => strongKeys.has(`${sym}|${tf}|${m.cls}`)) }
  return res
}
