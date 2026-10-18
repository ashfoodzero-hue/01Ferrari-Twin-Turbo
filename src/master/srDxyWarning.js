// srDxyWarning.js — the LIVE "DXY warning" for XAU S/R levels (2026-10-19; Ashraf: "add the DXY warning to the S/R tab"). ONE pure rule, the measured
// condition of docs/XAU_DXY_SR_ATLAS.md Part 1 applied to the FORMING candle of 1H / 4H (gold grid = identical candle times for XAU and DXY):
//   XAU forming candle touches an ARMED alive XAU level (within 0.25 × ATR of that timeframe — the S/R touch rule) AND the DXY forming candle touches an
//   ARMED alive DXY level of the OPPOSITE side (gold support ↔ DXY resistance) → WARNING: measured, XAU levels hold LESS then (1H 42 % vs 58 %,
//   4H 47 % vs 56 %) — but placebo copies drop the same, so it marks "both markets moving hard", not a level effect. Information only.
//   Inputs: sr_live_<xau|dxy>.json (sr_refresh.mjs, gold-grid DXY), forming candle highs / lows per timeframe, the study numbers (xau_dxy_sr.json).
//   Fail-closed: a live file one candle behind (refresh not yet run) → 'waiting'; no forming candle → 'no forming candle'.
export const WARN_TFS = ['1H', '4H']
const near = (side, px, atr, c) => (side === 'support' ? c.l <= px + 0.25 * atr : c.h >= px - 0.25 * atr)

/** @param o { xau, dxy: sr_live json, formX / formD: { tf: { t, h, l } }, prevOpen: { tf: open time of the candle before the forming one }, study: xau_dxy_sr.json } */
export function dxyWarning({ xau, dxy, formX = {}, formD = {}, prevOpen = {}, study = null }) {
  const out = {}
  for (const tf of WARN_TFS) {
    const TX = xau?.tf?.[tf], TD = dxy?.tf?.[tf], fx = formX[tf], fd = formD[tf], S = study?.part1?.[tf]?.cond
    const measured = S ? { opposite: { held: S.OPPOSITE.all.real, placebo: S.OPPOSITE.all.placebo, n: S.OPPOSITE.all.n_real }, none: { held: S.NONE.all.real, placebo: S.NONE.all.placebo, n: S.NONE.all.n_real } } : null
    if (!TX || !TD) { out[tf] = { state: 'no data', measured }; continue }
    if (!fx || !fd) { out[tf] = { state: 'no forming candle', measured }; continue }
    if (prevOpen[tf] != null && (TX.last_closed !== prevOpen[tf] || TD.last_closed !== prevOpen[tf])) { out[tf] = { state: 'waiting for the hourly level refresh', measured }; continue }
    const xHit = TX.levels.filter((l) => l.armed && near(l.side_now, l.px, TX.atr, fx))
    if (!xHit.length) { out[tf] = { state: 'XAU not at a level', measured }; continue }
    const rows = xHit.map((l) => { const opp = l.side_now === 'support' ? 'resistance' : 'support'
      const d = TD.levels.filter((m) => m.armed && m.side_now === opp && near(opp, m.px, TD.atr, fd))
      const same = TD.levels.filter((m) => m.armed && m.side_now === l.side_now && near(l.side_now, m.px, TD.atr, fd))
      return { xau_level: l.px, xau_side: l.side_now, dxy_level: d[0]?.px ?? same[0]?.px ?? null, dxy_side: d.length ? opp : same.length ? l.side_now : null, cond: d.length ? 'OPPOSITE' : same.length ? 'SAME SIDE' : 'NONE' } })
    const w = rows.find((r) => r.cond === 'OPPOSITE')
    out[tf] = { state: w ? 'WARNING' : 'XAU at a level, DXY not opposite', rows, measured, forming: fx.t }
  }
  return out
}
