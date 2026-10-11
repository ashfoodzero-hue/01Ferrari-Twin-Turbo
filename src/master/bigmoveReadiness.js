// ════════════════════════════════════════════════════════════════════════════════
// bigmoveReadiness.js — EXTREME TRIGGER · Phase 4b: the LIVE readiness gauge (2026-08-09).
// ────────────────────────────────────────────────────────────────────────────────
// Provenance chain (every number traces):
//   Phase 1  build_bigmove_catalog.mjs   — causal zigzag (REV 1.0%), event = leg ≥ $50 OR ≥ 2.5% (2,492 events/23y)
//   Phase 4a measure_bigmove_readiness.mjs → bigmove_readiness.json — ONE PRE-REGISTERED cell at K=5:
//            dens30 ≥ 10 AND rv10 ≥ 2.5%  ⇒  P(a new big move STARTS within 5 days) = 97.8% (Wilson LB 95.3%),
//            era-A 96.4% / era-B 100%, n=275 fire-days. Base rate at K=5 = 60.8%.
//   Phase 4b validate_bigmove_readiness_live.mjs → bigmove_readiness_live_parity.json — THIS module's computation
//            replayed causally over the same 23y (trailing-window inputs, open-leg rule included) and re-scored.
// WHAT THIS IS: an OCCURRENCE gauge — "conditions are hot, a big move is coming, be at the screen with alarms armed."
// WHAT THIS IS NOT: direction. Direction-in-advance measured dead at every link (macro AUC ≈ 0.5); direction comes
// from gold's own structure confirmation at event time. The gauge never gates a tier and never fires a trade.
// States: HOT  = dens30 ≥ 10 AND rv10 ≥ 2.5  (the measured cell — the ONLY state that carries a probability)
//         WARM = exactly one of the two conditions true (context only — deliberately NO probability: unmeasured)
//         QUIET = neither.
// ════════════════════════════════════════════════════════════════════════════════

// zigzag + event thresholds — byte-identical to build_bigmove_catalog.mjs (Phase 1). Never fork these.
export const BM_CFG = Object.freeze({ REV: 0.010, ABS_USD: 50, REL: 0.025, DENS_DAYS: 30, RV_DAYS: 10, DENS_MIN: 10, RV_MIN: 2.5 })
const DAY = 86400000

/** Causal zigzag legs over 15m bars — the catalog's exact algorithm. Returns closed legs + the open leg. */
export function zigzagLegs(bars) {
  const legs = []
  let dir = 0, extI = 0, startI = 0
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]
    if (dir >= 0) {
      if (b.h > bars[extI].h || dir === 0) { if (b.h > bars[extI].h) extI = i; if (dir === 0 && b.h > bars[startI].h) dir = 1 }
      if (bars[extI].h - b.l >= BM_CFG.REV * bars[extI].h) {
        if (dir === 1) legs.push({ from: startI, to: extI, dir: 'UP' })
        dir = -1; startI = extI; extI = i
      }
    }
    if (dir <= 0) {
      if (b.l < bars[extI].l) extI = i
      if (b.h - bars[extI].l >= BM_CFG.REV * bars[extI].l) {
        if (dir === -1) legs.push({ from: startI, to: extI, dir: 'DOWN' })
        dir = 1; startI = extI; extI = i
      }
    }
  }
  return { legs, open: dir !== 0 ? { from: startI, to: extI, dir: dir === 1 ? 'UP' : 'DOWN' } : null }
}

const legSize = (bars, L) => {
  const a = bars[L.from], b = bars[L.to]
  const px0 = L.dir === 'UP' ? a.l : a.h, px1 = L.dir === 'UP' ? b.h : b.l
  const usd = Math.abs(px1 - px0)
  return { usd, rel: usd / px0, startT: a.t, extT: b.t, from: px0, to: px1 }
}
const isBig = (s) => s.usd >= BM_CFG.ABS_USD || s.rel >= BM_CFG.REL

/**
 * The live readiness computation. `bars` = ascending CLOSED 15m bars (loadBarsLive never returns the forming bar);
 * needs ≥ ~45 days of history (zigzag warmup + 30d density + 10d realized vol). `nowT` defaults to the last bar.
 *
 * dens30 rule (parity with Phase 4a): the measurement counted every cataloged event whose START fell in the
 * trailing 30d — including legs that only CLOSED (became catalog-visible) later. Live can't see the future close,
 * so the causal equivalent counts (a) closed big legs with start in-window and (b) the OPEN leg once it ALREADY
 * meets the size threshold — at that moment history will record its start in this window, and we know it now.
 */
export function computeReadiness(bars, nowT = null) {
  if (!Array.isArray(bars) || bars.length < 45 * 24 * 4 / 2) return { ok: false, why: 'insufficient bars (need ~45d of 15m)' }
  const t = nowT ?? bars.at(-1).t
  const { legs, open } = zigzagLegs(bars)
  let dens30 = 0
  const recent = []
  for (const L of legs) {
    const s = legSize(bars, L)
    if (!isBig(s)) continue
    if (s.startT > t - BM_CFG.DENS_DAYS * DAY && s.startT <= t) { dens30++; recent.push({ dir: L.dir, usd: +s.usd.toFixed(1), pct: +(100 * s.rel).toFixed(2), start: new Date(s.startT).toISOString(), open: false }) }
  }
  let openBig = null
  if (open) {
    const s = legSize(bars, open)
    if (isBig(s) && s.startT > t - BM_CFG.DENS_DAYS * DAY) { dens30++; openBig = { dir: open.dir, usd: +s.usd.toFixed(1), pct: +(100 * s.rel).toFixed(2), start: new Date(s.startT).toISOString(), open: true }; recent.push(openBig) }
  }
  // rv10: mean daily range% over the prior 10 COMPLETED UTC days with data (same aggregate as Phase 4a)
  const dayAgg = new Map()
  for (const b of bars) { const k = Math.floor(b.t / DAY) * DAY; const e = dayAgg.get(k) || { hi: -Infinity, lo: Infinity, c: b.c }
    e.hi = Math.max(e.hi, b.h); e.lo = Math.min(e.lo, b.l); e.c = b.c; dayAgg.set(k, e) }
  const today = Math.floor(t / DAY) * DAY
  let rv = 0, n = 0
  for (let j = 1; j <= 21 && n < BM_CFG.RV_DAYS; j++) {   // walk back far enough to find 10 traded days
    const d = dayAgg.get(today - j * DAY)
    if (d && d.hi > -Infinity && d.c > 0) { rv += (d.hi - d.lo) / d.c; n++ }
  }
  const rv10 = n >= BM_CFG.RV_DAYS ? +((rv / n) * 100).toFixed(3) : null
  const hotDens = dens30 >= BM_CFG.DENS_MIN, hotRv = rv10 != null && rv10 >= BM_CFG.RV_MIN
  const state = hotDens && hotRv ? 'HOT' : (hotDens || hotRv) ? 'WARM' : 'QUIET'
  return { ok: true, at: t, state, dens30, rv10, hotDens, hotRv, openBig, recentEvents: recent.slice(-8),
    thresholds: { dens30: BM_CFG.DENS_MIN, rv10: BM_CFG.RV_MIN },
    meaning: state === 'HOT' ? 'measured cell — see bigmove_readiness.json for the probability (display reads the artifact)'
      : state === 'WARM' ? 'one condition met — context only, NO measured probability attached'
      : 'neither condition met', isGate: false }
}
