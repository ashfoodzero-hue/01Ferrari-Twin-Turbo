// ════════════════════════════════════════════════════════════════════════════════
// liveBars.js — THE canonical live bar provider. One function. Every live path calls it.
// ────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (2026-07-17). The app had THREE live paths loading bars three different ways, and only one
// was right:
//   • run_signal_engine.mjs → loadBars() + a hand-rolled live Polygon tail  ← correct, and duplicated nowhere
//   • paper_tick.mjs        → loadBars() ONLY                               ← blind for up to 10 minutes
//   • emit_signal_tiers.mjs → loadBars() ONLY                               ← blind for up to 10 minutes
// The recorded history file is refreshed by the engine's historyCycle every 10 MINUTES. computeForecast, by
// contrast, fires from LIVE Polygon every 60 SECONDS. So the forecast could see a signal that the recorder
// physically could not — two code paths, two datasets, one of them stale. That is not a hypothetical: a
// ★VALIDATED signal was tracked to target while the paper journal held NO record of it, because the recorder
// was reading a file that did not yet contain the bar the signal fired on.
//
// A forward test you cannot trust is worse than none — it tells you an edge is real when it never recorded it.
// So: ONE provider, used by ALL of them. If the bars are wrong, they are wrong everywhere, visibly, at once.
//
// THE CAUSALITY RULE THIS ENFORCES (inherited from run_signal_engine's filter, now the only copy):
//   NEVER return the forming bar. A bar is admissible only once `b.t + tfMs <= now` — i.e. it has CLOSED.
//   Reading the current, still-moving bar is look-ahead of the worst kind: its high/low have not happened yet.
//   This is the same class of bug that killed SWEEP_DIVERGENCE (89.34% of fills landed inside the bar that
//   qualified the signal). One rule, one place, no second copy to forget.
// ════════════════════════════════════════════════════════════════════════════════
import { loadBars } from './backfillReader.js'
import { streamStatus } from './tickStream.js'
import { pidAlive } from '../core/pidAlive.js'

const TF_MS = { '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }

/**
 * 🟥 TICKS ONLY (Ashraf 2026-10-08: "during reading market it is reading ticks for all"). The live read is the twin's
 * own 1m store, which the tick streamer (src/data/tickStream.js) fills from Polygon's real-time forex ticks, verified
 * minute by minute against Polygon's aggregate. There is NO REST tail any more: a second live path would be a second
 * dataset (the 2026-07-17 lesson above). Every timeframe is resampled from 1m with closed buckets only.
 *
 * LIVE means: the stream heartbeat is fresh, its pid alive, connected, and `symbol` is settled through the last minute
 * of the most recent closed `tf` bucket. Anything else → `live:false` with the reason. The caller must FAIL CLOSED on
 * a not-live read (R0.6: no signal from missing, stale or unverifiable data). Never throws on a stale feed.
 *
 * @returns {Promise<{bars:Bar[], liveTail:0, lastT:number|null, source:string, live:boolean, why:string|null}>}
 */
export async function loadBarsLive(symbol, tf, { from, now = Date.now(), status = null } = {}) {
  const tfMs = TF_MS[tf]
  if (!tfMs) throw new Error(`loadBarsLive: unsupported timeframe "${tf}"`)
  const needMinute = Math.floor(now / tfMs) * tfMs - 60000          // the last minute of the latest closed bucket
  const st = status ?? streamStatus({ now, needMinute, symbols: [symbol], pidAlive })
  const { bars: all } = await loadBars(symbol, tf, from == null ? {} : { from })
  const bars = all.filter((b) => b.t + tfMs <= now)                  // THE CAUSALITY RULE — never the forming bar
  const lastT = bars.length ? bars.at(-1).t : null
  return { bars, liveTail: 0, lastT, live: st.live, why: st.why, source: st.live ? 'ticks (stream live, settled)' : `STALE — ${st.why}` }
}

/** Ascending resample to a coarser timeframe. Shared so no caller hand-rolls its own (they all used to). */
export function resampleBars(bars, ms) {
  const out = []; let cur = null
  for (const b of bars) {
    const k = Math.floor(b.t / ms) * ms
    if (!cur || cur.t !== k) { if (cur) out.push(cur); cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 } }
    else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v || 0 }
  }
  if (cur) out.push(cur)
  return out
}

// ── THE ROSTER WINDOW. One constant, imported by every path that builds the roster. ─────────────────────────
// emit_signal_tiers.mjs loaded 120 days and paper_tick.mjs loaded 400 days. That is not a harmless difference:
// measure_swing_slice_equivalence.mjs PROVED that a different bar window yields different candidates (no slice
// reproduced the full answer, not even 4,000 bars). So the cockpit could show a Swing Trade the paper recorder
// never logs, or log one the cockpit never showed — the same "two paths, two datasets" defect that made the
// recorder blind in the first place, wearing a different hat. They must be byte-identical inputs.
//
// 400 days, not 120: more history is strictly closer to the candidate cache the tier was VALIDATED on (which was
// built from a full-history scan). Cost is ~229s per call, which is why the engine budgets these children at 280s.
//
// ⚠ KNOWN, UNMEASURED: the backtest generated candidates over the FULL 23y array; live uses 400 days. The cooldown
// key includes the ROUNDED ENTRY PRICE, so keys are price-local and a 2003 lattice ($400 gold) cannot collide with
// 2026 ($4,000) — which is why 400d is very likely sufficient. "Very likely" is not measured. Tracked, not hidden.
export const ROSTER_WINDOW_MS = 400 * 86400000
