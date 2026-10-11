// ════════════════════════════════════════════════════════════════════════════════
// validate_bigmove_readiness_live.mjs — Phase 4b R14: the LIVE gauge, replayed causally over 23y (2026-08-09).
// ────────────────────────────────────────────────────────────────────────────────
// Phase 4a measured the cell on catalog-derived features. This validates the SHIPPING CODE: for every eligible
// day t, call src/master/bigmoveReadiness.js computeReadiness() on ONLY the trailing 90d of bars (exactly what
// the live endpoint feeds it — trailing window, open-leg rule, completed-day rv10), then score the HOT state
// against the truth label "a cataloged big move STARTS within K=5 days after t".
// PASS REQUIRES (pre-registered): HOT precision Wilson-LB ≥ 95% AND both eras ≥ 95% raw AND fires within ±20%
// of Phase 4a's 275 (same phenomenon, not a different rule). Day grid identical to Phase 4a (skip Sat, 30d
// warmup, t ≤ end − K days). Writes bigmove_readiness_live_parity.json (the artifact the cockpit panel cites).
// Usage: node --max-old-space-size=8192 scripts/validate_bigmove_readiness_live.mjs
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import { loadBars } from '../src/data/backfillReader.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own Polygon 1m tape (resampled), from 2013-07-14
import { computeReadiness } from '../src/master/bigmoveReadiness.js'
import { wilsonLowerBound } from '../src/core/stats.js'

const K = 5, WINDOW_D = 90, DAY = 86400000
const cat = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'bigmove_catalog.json'), 'utf8'))
const starts = cat.events.map((e) => Date.parse(e.start)).sort((a, b) => a - b)
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })
console.log(`\n████ Phase 4b R14 — LIVE readiness gauge replayed causally (23y, trailing ${WINDOW_D}d inputs) ████\n`)

const d0 = Math.ceil(bars[0].t / DAY) * DAY, d1 = Math.floor(bars.at(-1).t / DAY) * DAY
// index bars by day for fast window slicing
let loIdx = 0
const days = []
let hot = 0, hotHit = 0, warm = 0, quiet = 0
const eras = { A: { n: 0, hit: 0 }, B: { n: 0, hit: 0 } }
const hotDays = []
for (let t = d0 + WINDOW_D * DAY; t <= d1 - K * DAY; t += DAY) {
  const dow = new Date(t).getUTCDay(); if (dow === 6) continue
  while (loIdx < bars.length && bars[loIdx].t < t - WINDOW_D * DAY) loIdx++
  let hiIdx = loIdx
  // advance hiIdx to last bar strictly before t (binary search would be nicer; linear amortizes fine)
  // NOTE: we re-scan forward each day from the previous hi; cache it on the loop
  hiIdx = days.length ? days[days.length - 1]._hi : loIdx
  while (hiIdx < bars.length && bars[hiIdx].t < t) hiIdx++
  const win = bars.slice(loIdx, hiIdx)
  if (win.length < 2000) { days.push({ t, _hi: hiIdx, skip: true }); continue }
  const r = computeReadiness(win, t)
  days.push({ t, _hi: hiIdx })
  if (!r.ok) continue
  // truth label from the catalog (the same label Phase 4a scored against)
  let lo = 0, hi2 = starts.length - 1, nxt = null
  while (lo <= hi2) { const m = (lo + hi2) >> 1; if (starts[m] > t) { nxt = starts[m]; hi2 = m - 1 } else lo = m + 1 }
  const label = nxt != null && nxt <= t + K * DAY
  if (r.state === 'HOT') {
    hot++; if (label) hotHit++
    const era = t < Date.parse('2020-01-01T00:00:00Z') ? 'A' : 'B'   /* twin: halves of 2013-07→2026 (Turbo2 split 2015 = halves of 23y) */
    eras[era].n++; if (label) eras[era].hit++
    hotDays.push({ t: new Date(t).toISOString().slice(0, 10), dens30: r.dens30, rv10: r.rv10, label })
  } else if (r.state === 'WARM') warm++; else quiet++
}

const prec = hot ? hotHit / hot : 0, lb = wilsonLowerBound(hotHit, hot)
const pA = eras.A.n >= 30 ? eras.A.hit / eras.A.n : null, pB = eras.B.n >= 30 ? eras.B.hit / eras.B.n : null
const REF = 275
const firesOk = hot >= REF * 0.8 && hot <= REF * 1.2
const pass = lb >= 0.95 && (pA == null || pA >= 0.95) && (pB == null || pB >= 0.95) && firesOk
console.log(`HOT fires ${hot} (Phase 4a: ${REF}; within ±20%: ${firesOk ? '✓' : '✗'}) · WARM ${warm} · QUIET ${quiet}`)
console.log(`HOT precision ${(100 * prec).toFixed(1)}% (Wilson LB ${(100 * lb).toFixed(1)}%) · era-A ${pA != null ? (100 * pA).toFixed(1) + '%' : '—'} · era-B ${pB != null ? (100 * pB).toFixed(1) + '%' : '—'}`)
console.log(`VERDICT: ${pass ? '✅ PASS — the shipping code reproduces the measured cell' : '❌ FAIL — do NOT wire the gauge; diagnose the divergence'}`)

fs.writeFileSync(path.join(TURBO.master, 'bigmove_readiness_live_parity.json'), JSON.stringify({
  at: new Date().toISOString(), K, window_days: WINDOW_D,
  pass, hot_fires: hot, warm_days: warm, quiet_days: quiet,
  precision: +(100 * prec).toFixed(1), lb: +(100 * lb).toFixed(1),
  eraA: pA != null ? +(100 * pA).toFixed(1) : null, eraB: pB != null ? +(100 * pB).toFixed(1) : null,
  phase4a_ref: { fires: REF, precision: 97.8, lb: 95.3, source: 'bigmove_readiness.json' },
  fires_within_20pct_of_ref: firesOk,
  last_hot_days: hotDays.slice(-10),
  source_scripts: ['src/master/bigmoveReadiness.js (the shipping code)', 'validate_bigmove_readiness_live.mjs (this replay)'],
}, null, 1))
console.log('wrote data/master/bigmove_readiness_live_parity.json\n')
