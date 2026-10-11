// ════════════════════════════════════════════════════════════════════════════════
// liveReadiness.js — the live BIG-MOVE READINESS provider for the cockpit (Phase 4b, 2026-08-09).
// ────────────────────────────────────────────────────────────────────────────────
// Computes QUIET/WARM/HOT from live closed bars via the SAME shipping code the 23y replay validated
// (src/master/bigmoveReadiness.js → bigmove_readiness_live_parity.json PASS: 281 fires · 97.9% LB 95.4 ·
// era-A 96.5 / era-B 100). DISPLAY LAW: this provider never states the probability itself — the measured
// block is READ from the parity artifact at serve time; if the artifact is missing or failed, the panel
// shows the state with NO probability. OCCURRENCE ONLY — never direction, never a gate, never a trade.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { loadBarsLive } from '../data/liveBars.js'
import { computeReadiness } from './bigmoveReadiness.js'
import { TURBO } from '../core/paths.js'

// 🔥 RELATIVE DENSITY (2026-09-26, study_density_gate_relative): the absolute dens30 scales with the price level (0% of 2017-18
// trades were "dense ≥ 6", 100% of 2026's — dens30 reads 54 today), so the record-only dense sub-book is defined against the
// gauge's OWN trailing-365-day median. Causal like the gauge: a leg counts from the first bar it already meets the size.
import { loadBars } from '../data/backfillReader.js'
import { zigzagLegs, BM_CFG } from './bigmoveReadiness.js'
const DAY = 86400000
export const DENSE_REL = 1.5                 // the pre-registered era-neutral cell: dens30 ≥ 1.5 × its trailing-1y median
let _relCache = null, _relAt = 0
export async function liveDensityRelative(nowT = Date.now()) {
  if (_relCache && nowT - _relAt < 10 * 60000) return _relCache
  const { bars } = await loadBars('XAUUSD', '15m', { from: nowT - 470 * DAY })
  if (!Array.isArray(bars) || bars.length < 300 * 96) return { ok: false, why: 'insufficient bars for a 1y median' }
  const { legs, open } = zigzagLegs(bars); if (open) legs.push(open)
  const ev = []
  for (const L of legs) { const a = bars[L.from]; const px0 = L.dir === 'UP' ? a.l : a.h; for (let i = L.from; i <= L.to; i++) { const px = L.dir === 'UP' ? bars[i].h : bars[i].l; const usd = Math.abs(px - px0); if (usd >= BM_CFG.ABS_USD || usd / px0 >= BM_CFG.REL) { ev.push({ startT: a.t, metT: bars[i].t }); break } } }
  ev.sort((a, b) => a.startT - b.startT)
  const densAt = (t) => { let n = 0; for (const e of ev) { if (e.startT > t) break; if (e.startT > t - BM_CFG.DENS_DAYS * DAY && e.metT <= t) n++ } return n }
  const today = Math.floor(nowT / DAY) * DAY; const hist = []; for (let j = 1; j <= 365; j++) hist.push(densAt(today - j * DAY))
  const sorted = hist.slice().sort((a, b) => a - b); const median = sorted[Math.floor(sorted.length / 2)]
  const dens30 = densAt(bars.at(-1).t)
  const out = { ok: true, dens30, dens_med1y: median, dens_rel: median > 0 ? +(dens30 / median).toFixed(3) : null, dense: median > 0 && dens30 >= DENSE_REL * median, threshold: DENSE_REL, as_of: new Date(bars.at(-1).t).toISOString() }
  _relCache = out; _relAt = nowT
  return out
}

const WINDOW_MS = 100 * 86400000            // same order as the validated replay's 90d trailing window (+ margin)
const CACHE_MS = 10 * 60000                 // regime features move on daily scales; 10min is generous
let _cache = null, _cacheAt = 0, _computing = null

export async function liveReadiness() {
  if (_cache && Date.now() - _cacheAt < CACHE_MS) return _cache
  // stale-while-revalidate — same OFFLINE-banner physics as liveWalls: a cold 100d bar load must never hang a
  // request; serve the last state and refresh in the background. Only the very first call ever waits.
  if (_cache) {
    if (!_computing) _computing = _recompute().catch(() => {}).finally(() => { _computing = null })
    return { ..._cache, refreshing: true }
  }
  return _recompute()
}

async function _recompute() {
  const { bars } = await loadBarsLive('XAUUSD', '15m', { from: Date.now() - WINDOW_MS })
  const r = computeReadiness(bars)
  let measured = null
  try {
    const p = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'bigmove_readiness_live_parity.json'), 'utf8'))
    if (p.pass) measured = { precision: p.precision, lb: p.lb, k_days: p.K, fires_23y: p.hot_fires, eraA: p.eraA, eraB: p.eraB, source: 'bigmove_readiness_live_parity.json' }
  } catch { /* no artifact → state ships without a probability, never with an unsourced one */ }
  const out = {
    available: r.ok === true, ...r, measured,
    note: r.ok
      ? 'OCCURRENCE gauge — HOT = the measured cell (probability shown only from the artifact). Direction is NOT predictable in advance (measured); it comes from structure confirmation at event time. Never a gate, never a trade.'
      : (r.why || 'unavailable'),
  }
  _cache = out; _cacheAt = Date.now()
  return out
}
