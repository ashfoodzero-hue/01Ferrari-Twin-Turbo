// ════════════════════════════════════════════════════════════════════════════════
// wallDefense.js — WALL-PRESSURE engine (Turbo 2 validate_wall_defense.mjs logic, as replicated in the Twin's study (an): hold 60.4 / 71.4 / 51.2).
// ONE place for the wall-bubble study and the live chart (2026-10-16, docs/WALL_BUBBLES_SPEC.md).
// ────────────────────────────────────────────────────────────────────────────────
// Profile: trailing 24 h volume-by-price on gold 1m (Polygon TICK volume). Bin = 0.025 % of price (rebased when price drifts 50 %).
// Wall: bin ≥ 2.5 × median bin AND local max (±2 bins), on the map BEFORE the bar. Test: price enters [wall ∓ 1.5 bins] from outside,
// 120-min cooldown per wall. Decision at the close of the 3rd 1m bar (touch + 2); already beyond wall ± 2 bins → skipped.
// Delta proxy per 1m bar: v × (2·close-position − 1). zone = Σ the 3 decision bars; push = Σ the 5 bars before the touch (Ashraf's
// "trend strength toward the wall"). DEFENSE ⇔ zone opposes the attack. DEF>PUSH ⇔ DEFENSE and |zone| > |push|.
// count = defended tests of the SAME wall (type + bin) so far — the "bubbles stack" claim (measured, not assumed).
// ════════════════════════════════════════════════════════════════════════════════
export const WALL = Object.freeze({ profileMin: 1440, binFrac: 0.00025, wallRatio: 2.5, band: 1.5, brk: 2, bounce: 4, feat: 3, approach: 5, horizon: 60, coolMs: 120 * 60000 })
// VOLUME DROPPED 2026-10-17 (Ashraf approved the volume audit, docs/VOLUME_AUDIT_RESULTS.md §5): spot `v` is a quote count, not volume, so every
// minute weighs 1 — walls = TIME-at-price, delta = close position (2·pos − 1). This is exactly the audit's DROP mode (v := 1), measured on 13 y.
export const WEIGHT = () => 1
export const barDelta = (b) => { const r = b.h - b.l, pos = r > 0 ? (b.c - b.l) / r : 0.5; return WEIGHT(b) * (2 * pos - 1) }

/** Wall tests on ascending 1m bars M. Events are kept from `from` on (the profile warms up before). */
export function wallEvents(M, { from = -Infinity, P = WALL } = {}) {
  const events = [], bins = new Map(), win = [], active = [], lastFire = new Map(), defCount = new Map()
  let binW = 0, med = 0, medAt = -1
  const median = () => { const vs = [...bins.values()].map((x) => x.v).filter((v) => v > 0).sort((a, b) => a - b); return vs.length ? vs[Math.floor(vs.length / 2)] : 0 }
  for (let i = 0; i < M.length; i++) { const b = M[i]
    if (!binW || Math.abs(b.c * P.binFrac / binW - 1) > 0.5) { binW = Math.max(0.1, +(b.c * P.binFrac).toFixed(2)); bins.clear(); win.length = 0 }
    const binOf = (px) => Math.round(px / binW)
    for (const ev of active) { if (ev.state !== 'feature') continue
      ev.zone += barDelta(b); ev.fb++
      if (ev.fb >= P.feat) { ev.state = 'done'; ev.di = i; ev.decisionT = b.t + 60000
        const beyond = ev.type === 'ceiling' ? b.c >= ev.wall + P.brk * ev.binW : b.c <= ev.wall - P.brk * ev.binW
        if (!beyond && b.t >= from) { const attack = ev.type === 'ceiling' ? 1 : -1
          ev.defense = Math.sign(ev.zone) === -attack; ev.mag = ev.flowScale > 0 ? Math.abs(ev.zone) / ev.flowScale : 0
          ev.defStronger = ev.defense && Math.abs(ev.zone) > Math.abs(ev.push)
          const key = ev.type + ':' + ev.wb + ':' + ev.binW; if (ev.defense) defCount.set(key, (defCount.get(key) ?? 0) + 1); ev.count = ev.defense ? defCount.get(key) : 0
          events.push(ev) } } }
    for (let k = active.length - 1; k >= 0; k--) if (active[k].state === 'done') active.splice(k, 1)
    if (win.length >= P.profileMin * 0.8 && i >= P.approach) {
      if (i - medAt >= 64) { med = median(); medAt = i }
      if (med > 0) { const prev = M[i - 1]
        for (const type of ['ceiling', 'floor']) { if (active.some((e) => e.type === type)) continue
          const dir = type === 'ceiling' ? 1 : -1, start = binOf(prev.c) + dir * Math.ceil(P.band + 0.5); let wb = null
          for (let s = 0; s <= 40; s++) { const c = start + dir * s, cell = bins.get(c); if (!cell || cell.v < P.wallRatio * med) continue
            const n1 = [c - 1, c + 1, c - 2, c + 2].map((q) => bins.get(q)?.v ?? 0); if (n1.every((v) => cell.v >= v)) { wb = c; break } }
          if (wb == null) continue
          const wall = wb * binW, touched = type === 'ceiling' ? b.h >= wall - P.band * binW : b.l <= wall + P.band * binW, wasOut = type === 'ceiling' ? prev.c < wall - P.band * binW : prev.c > wall + P.band * binW
          if (touched && wasOut && b.t - (lastFire.get(type + ':' + wb) ?? -Infinity) > P.coolMs) { lastFire.set(type + ':' + wb, b.t)
            let absSum = 0; for (const w of win) absSum += Math.abs(w.d)
            let push = 0; for (let q = i - P.approach; q < i; q++) push += barDelta(M[q])
            active.push({ type, wall, wb, binW, t: b.t, touchI: i, flowScale: win.length ? 3 * absSum / win.length : 0, zone: barDelta(b), push, fb: 1, state: 'feature' }) } } } }
    const k = binOf(b.c), cell = bins.get(k) ?? { v: 0, d: 0 }; cell.v += WEIGHT(b); cell.d += barDelta(b); bins.set(k, cell)
    win.push({ t: b.t, k, v: WEIGHT(b), d: barDelta(b) }); const cut = b.t - P.profileMin * 60000
    while (win.length && win[0].t < cut) { const o = win.shift(), c2 = bins.get(o.k); if (c2) { c2.v -= o.v; c2.d -= o.d; if (c2.v <= 0) bins.delete(o.k) } }
  }
  return events
}
/**
 * SWING-LEVEL walls (2026-10-16, docs/SWING_WALLS_SPEC.md — Ashraf: "bubbles at the reversal points"): the SAME test mechanics as wallEvents
 * (band, touch from outside, cooldown, touch + 2 decision, zone / push / flow scale, DEFENSE / DEF>PUSH), but the walls are prior CONFIRMED swing
 * highs (ceilings) / lows (floors): usable from their known time, removed once a 1m close goes beyond them; the nearest active one is tested.
 * @param levels { highs:[{knownT, px}], lows:[{knownT, px}] } ascending by knownT
 */
export function swingWallEvents(M, levels, { from = -Infinity, P = WALL } = {}) {
  const events = [], active = { ceiling: [], floor: [] }, feats = [], lastFire = new Map(), defCount = new Map(), dq = []
  let hi = 0, lo = 0, binW = 0, absSum = 0
  for (let i = 0; i < M.length; i++) { const b = M[i]
    if (!binW || Math.abs(b.c * P.binFrac / binW - 1) > 0.5) binW = Math.max(0.1, +(b.c * P.binFrac).toFixed(2))
    while (hi < levels.highs.length && levels.highs[hi].knownT <= b.t) active.ceiling.push(levels.highs[hi++].px)
    while (lo < levels.lows.length && levels.lows[lo].knownT <= b.t) active.floor.push(levels.lows[lo++].px)
    for (const ev of feats) { if (ev.state !== 'feature') continue
      ev.zone += barDelta(b); ev.fb++
      if (ev.fb >= P.feat) { ev.state = 'done'; ev.di = i; ev.decisionT = b.t + 60000
        const beyond = ev.type === 'ceiling' ? b.c >= ev.wall + P.brk * ev.binW : b.c <= ev.wall - P.brk * ev.binW
        if (!beyond && b.t >= from) { const attack = ev.type === 'ceiling' ? 1 : -1
          ev.defense = Math.sign(ev.zone) === -attack; ev.mag = ev.flowScale > 0 ? Math.abs(ev.zone) / ev.flowScale : 0; ev.defStronger = ev.defense && Math.abs(ev.zone) > Math.abs(ev.push)
          const key = ev.type + ':' + ev.wall; if (ev.defense) defCount.set(key, (defCount.get(key) ?? 0) + 1); ev.count = ev.defense ? defCount.get(key) : 0
          events.push(ev) } } }
    for (let k = feats.length - 1; k >= 0; k--) if (feats[k].state === 'done') feats.splice(k, 1)
    if (dq.length >= P.profileMin * 0.8 && i >= P.approach) { const prev = M[i - 1], band = P.band * binW
      for (const type of ['ceiling', 'floor']) { if (feats.some((e) => e.type === type)) continue
        let wall = null; for (const px of active[type]) if (type === 'ceiling' ? px - band > prev.c && (wall == null || px < wall) : px + band < prev.c && (wall == null || px > wall)) wall = px
        if (wall == null) continue
        const touched = type === 'ceiling' ? b.h >= wall - band : b.l <= wall + band
        if (touched && b.t - (lastFire.get(type + ':' + wall) ?? -Infinity) > P.coolMs) { lastFire.set(type + ':' + wall, b.t)
          let push = 0; for (let q = i - P.approach; q < i; q++) push += barDelta(M[q])
          feats.push({ type, wall, binW, t: b.t, touchI: i, flowScale: 3 * absSum / dq.length, zone: barDelta(b), push, fb: 1, state: 'feature', swing: true }) } } }
    active.ceiling = active.ceiling.filter((px) => !(b.c > px)); active.floor = active.floor.filter((px) => !(b.c < px))   // broken by a close beyond
    const d = Math.abs(barDelta(b)); dq.push({ t: b.t, d }); absSum += d; const cut = b.t - P.profileMin * 60000
    while (dq.length && dq[0].t < cut) absSum -= dq.shift().d
  }
  return events
}
/** Turbo 2 hold label: close retreating `bounce` bins = HOLD, close beyond wall ± `brk` bins = BREAK, within `horizon` bars; null = timeout. */
export function holdLabel(M, e, P = WALL) {
  for (let j = e.di + 1; j < M.length && j <= e.di + P.horizon; j++) { const c = M[j].c
    if (e.type === 'ceiling' ? c >= e.wall + P.brk * e.binW : c <= e.wall - P.brk * e.binW) return false
    if (e.type === 'ceiling' ? c <= e.wall - P.bounce * e.binW : c >= e.wall + P.bounce * e.binW) return true }
  return null
}
