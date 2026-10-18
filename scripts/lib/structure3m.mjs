// structure3m.mjs — the ONE implementation of the 3m structure-confirmation rules (spec docs/STRUCTURE_3M_CONFIRMATION_SPEC.md; the exact
// operational choices are listed in scripts/study_structure_3m.mjs). Written for a LOW tip; a HIGH tip is the mirror (prices negated).
// Proof: scripts/smoke_structure_3m.mjs (hand-built candles, every rule).
const MIN = 60000
export const PIV = 3
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z')
const lb = (arr, x) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (arr[m] < x) a = m + 1; else b = m } return a }

/** @param C3 ascending 3m candles {t,o,h,l,c}; A3 their ATR(14) array; lastT data end (ms) */
export function makeStructure(C3, A3, lastT = Infinity) {
  const T3 = C3.map((c) => c.t), N3 = C3.length, pivH = [], pivL = []
  for (let i = PIV; i < N3 - PIV; i++) { let isH = true, isL = true
    for (let j = 1; j <= PIV; j++) { if (!(C3[i].h > C3[i - j].h) || !(C3[i].h >= C3[i + j].h)) isH = false; if (!(C3[i].l < C3[i - j].l) || !(C3[i].l <= C3[i + j].l)) isL = false }
    if (isH) pivH.push(i); if (isL) pivL.push(i) }
  const lastBefore = (P, idx, minIdx) => { const k = lb(P, idx) - 1; return k >= 0 && P[k] >= minIdx ? P[k] : null }
  const between = (P, a, b) => { const k = lb(P, a + 1); return k < P.length && P[k] < b ? P[k] : null }   // first pivot strictly inside (a, b)

  /** { type 'L'|'H', c: anchor candle {t, close_t}, px tip price, aAtr anchor ATR, legStartT, endT } */
  function measure({ type, c, px, aAtr, legStartT, endT }) {
    const s = type === 'L' ? 1 : -1, LP = type === 'L' ? pivH : pivL, SP = type === 'L' ? pivL : pivH
    const up = (j) => (s > 0 ? C3[j].h : -C3[j].l), dn = (j) => (s > 0 ? C3[j].l : -C3[j].h), cl = (j) => s * C3[j].c, op = (j) => s * C3[j].o
    const i0 = lb(T3, c.t), i1 = lb(T3, c.close_t), tipPx = s * px
    let tipJ = -1; for (let j = i0; j < i1; j++) if (Math.abs(dn(j) - tipPx) < 1e-9) { tipJ = j; break }
    if (tipJ < 0) return { status: 'no_3m_tip' }
    const r = { status: 'ok', tip_3m: iso(T3[tipJ]) }, legJ = lb(T3, legStartT), horizonT = Math.min(endT, lastT)
    const p = lastBefore(LP, tipJ, legJ)
    if (p == null) return { ...r, has_level: false }
    const lvl = up(p), A = A3[tipJ] || null
    Object.assign(r, { has_level: true, level: +(s * lvl).toFixed(5), level_at: iso(T3[p]), level_known_at_tip: p + PIV <= tipJ,
      level_dist_anchor_atr: +((lvl - tipPx) / aAtr).toFixed(3), level_dist_atr3: A ? +((lvl - tipPx) / A).toFixed(3) : null, level_dist_pct: +(100 * (lvl - tipPx) / Math.abs(px)).toFixed(4) })
    const q = lastBefore(SP, tipJ, legJ)
    r.sweep = q != null && dn(tipJ) <= dn(q) && cl(tipJ) > dn(q)
    let conf = -1, wick = false, broken = -1
    for (let j = tipJ + 1; j < N3 && T3[j] < horizonT; j++) {
      if (dn(j) < tipPx) { broken = j; break }
      if (cl(j) > lvl) { conf = j; break }
      if (up(j) > lvl) wick = true }
    r.confirmed = conf > 0; r.tip_broken_before_conf = broken > 0
    if (conf < 0) return r
    const rg = up(conf) - dn(conf)
    Object.assign(r, { conf_at: iso(T3[conf] + 3 * MIN), candles_to_conf: conf - tipJ, minutes_to_conf: (T3[conf] + 3 * MIN - T3[tipJ]) / MIN, wick_first: wick,
      close_beyond_atr3: A3[conf] ? +((cl(conf) - lvl) / A3[conf]).toFixed(3) : null, body_frac: rg > 0 ? +((cl(conf) - op(conf)) / rg).toFixed(3) : null, close_loc: rg > 0 ? +((cl(conf) - dn(conf)) / rg).toFixed(3) : null })
    r.strong_conf_candle = r.body_frac != null && r.body_frac >= 0.6 && r.close_loc >= 0.75
    r.hl_turn = between(SP, tipJ, conf) != null; r.v_turn = !r.hl_turn
    const b = between(LP, tipJ, conf); r.double_tip = false
    if (b != null) for (let j = b + 1; j < conf; j++) if (dn(j) <= tipPx + 0.25 * aAtr) { r.double_tip = true; break }
    const target = lvl + (lvl - tipPx); let retest = false, fail = false, outcome = 'open'
    for (let j = conf + 1; j < N3 && T3[j] < horizonT; j++) {
      if (dn(j) < tipPx) { outcome = 'tip_broken'; break }
      if (up(j) >= target) { outcome = 'extension'; break }
      if (!retest && dn(j) <= lvl + 0.1 * (A3[j] || 0)) retest = true
      if (retest && cl(j) < lvl) fail = true }
    Object.assign(r, { retest, retest_held: retest ? !fail : null, after_conf: outcome })
    const p2 = lb(LP, conf); let second = false
    if (p2 < LP.length) for (let j = LP[p2] + 1; j < N3 && T3[j] < horizonT; j++) { if (dn(j) < tipPx) break; if (cl(j) > up(LP[p2])) { second = true; break } }
    r.second_conf = second
    return r
  }
  return { measure, pivH, pivL, T3 }
}
