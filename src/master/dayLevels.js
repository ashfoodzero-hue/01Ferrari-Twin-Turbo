// ════════════════════════════════════════════════════════════════════════════════
// dayLevels.js — PREVIOUS-2-DAYS and TODAY's high / low (2026-10-09; TOOL 3 of Ashraf's one-by-one plan). ONE module for the studies
// (study_day_levels.mjs, study_day_matrix_filter.mjs) and the chart.
// ────────────────────────────────────────────────────────────────────────────────
// DAY = UTC day (the same grid as the app's 1d candles). A "previous day" must have ≥ 600 minutes of data (10 h) — gold's Sunday stub
// (~2 h after the 22:00 UTC reopen) and holidays never become PDH/PDL. Levels in force during day D:
//   PDH / PDL   = the last full day before D       P2DH / P2DL = the full day before that
//   H48 / L48   = max(PDH, P2DH) / min(PDL, P2DL)
//   TDH / TDL   = today's high / low as of the last CLOSED hour (moves during the day)
// ════════════════════════════════════════════════════════════════════════════════
export const DAY_MS = 86400000, MIN_DAY_MINUTES = 600

/** Daily summaries from ascending 1m bars: Map(dayStart → { h, l, o, c, minutes, firstK, lastK }) + the ordered list. */
export function dailyStats(M) {
  const map = new Map(), list = []
  for (let k = 0; k < M.length; k++) { const b = M[k], d = Math.floor(b.t / DAY_MS) * DAY_MS
    let s = map.get(d); if (!s) { s = { day: d, h: b.h, l: b.l, o: b.o, c: b.c, minutes: 0, firstK: k, lastK: k }; map.set(d, s); list.push(s) }
    if (b.h > s.h) s.h = b.h; if (b.l < s.l) s.l = b.l; s.c = b.c; s.minutes++; s.lastK = k }
  return { map, list }
}

/** The previous two FULL days before day `d` (list ascending) → { pd, p2d } or null. */
export function prevDays(list, d) {
  const out = []
  for (let j = list.length - 1; j >= 0 && out.length < 2; j--) { const s = list[j]; if (s.day >= d) continue; if (s.minutes >= MIN_DAY_MINUTES) out.push(s) }
  return out.length === 2 ? { pd: out[0], p2d: out[1] } : null
}

/** Levels in force at time T (needs `list` covering T's day; TDH/TDL from the 1m bars of today up to the last closed hour). */
export function dayLevelsAt(M, list, T) {
  const d = Math.floor(T / DAY_MS) * DAY_MS
  let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].day < d) lo = m + 1; else hi = m }
  const P = prevDays(list.slice(Math.max(0, lo - 10), lo), d); if (!P) return null
  const hourCut = Math.floor(T / 3600000) * 3600000; let tdh = -Infinity, tdl = Infinity
  if (lo < list.length && list[lo].day === d) for (let k = list[lo].firstK; k <= list[lo].lastK && M[k].t + 60000 <= hourCut; k++) { if (M[k].h > tdh) tdh = M[k].h; if (M[k].l < tdl) tdl = M[k].l }
  return { PDH: P.pd.h, PDL: P.pd.l, P2DH: P.p2d.h, P2DL: P.p2d.l, H48: Math.max(P.pd.h, P.p2d.h), L48: Math.min(P.pd.l, P.p2d.l),
    TDH: Number.isFinite(tdh) ? tdh : null, TDL: Number.isFinite(tdl) ? tdl : null, pdDay: P.pd.day, p2dDay: P.p2d.day }
}
