// ════════════════════════════════════════════════════════════════════════════════
// marketState.js — the WAIT / CONFIRM / FIRE gate. 23y of our own data says the EDGE lives at the range
// EXTREMES (premium/discount), and that the MIDDLE (equilibrium) is where direction is genuinely undecided —
// the single worst place to pick a side. (Proved live 2026-07-08: a pro bought the $4118 equilibrium; price
// waterfalled $40 to $4080 on a volume spike. Our engine was short from the $4130 premium and hit target.)
//
// States:
//   EQUILIBRIUM  → 🚫 do NOT pick a side. Show the exact levels to WAIT for.
//   PREMIUM      → edge on the SELL side (react to rejections there)
//   DISCOUNT     → edge on the BUY side
//   BREAKOUT_UP / BREAKOUT_DOWN → direction CONFIRMED (closed beyond the range + volume expansion) → FIRE that side
// `allowedSide` is the gate the signal roster obeys: only fire trades whose side matches.
// Dependency-free, look-ahead-free (uses only bars ≤ now).
// ════════════════════════════════════════════════════════════════════════════════
import { atr as atrArr } from '../core/indicators.js'

/**
 * @param {Bar[]} bars ascending
 * @param {{lookback?:number, breakAtr?:number, volMult?:number}} opts
 * @returns {{state, rangeHigh, rangeLow, mid, pos, allowedSide, canTrade, message, waitFor}}
 */
/**
 * The state's GEOMETRY — the one place the range and the confirmation triggers are computed (readMarketState uses it; the live
 * chart draws it, 2026-10-09). Range = the `lookback` bars BEFORE the last one (causal); a confirmed break = a close beyond
 * range ± breakAtr·ATR(14) (+ volume ≥ volMult × the range average only when volMult > 0 — default 0 since the 2026-10-17 volume audit).
 */
export function marketStateGeometry(bars, { lookback = 48, breakAtr = 0.3, volMult = 0 } = {}) {   // volMult 0 = no volume condition (2026-10-17 volume audit, DROP)
  if (!Array.isArray(bars) || bars.length < lookback + 20) return null
  const A = atrArr(bars, 14)
  const i = bars.length - 1, a = A[i] || 1, last = bars[i]
  const win = bars.slice(i - lookback, i)                       // range EXCLUDES the current bar (causal)
  const rangeHigh = Math.max(...win.map(b => b.h))
  const rangeLow = Math.min(...win.map(b => b.l))
  const avgVol = win.reduce((s, b) => s + (b.v || 0), 0) / win.length
  const f = n => +n.toFixed(2)
  return { A, i, last, a, rangeHigh, rangeLow, avgVol, volMult, upTrigger: f(rangeHigh + breakAtr * a), dnTrigger: f(rangeLow - breakAtr * a), sinceT: win[0].t }
}

export function readMarketState(bars, { lookback = 48, breakAtr = 0.3, volMult = 0 } = {}) {   // volMult 0 = no volume condition (DROP)
  const g = marketStateGeometry(bars, { lookback, breakAtr, volMult })
  if (!g) return null
  const { A, i, last, a, rangeHigh, rangeLow, avgVol, upTrigger, dnTrigger } = g
  const px = last.c
  const span = rangeHigh - rangeLow || 1
  const mid = (rangeHigh + rangeLow) / 2
  const pos = (px - rangeLow) / span                            // 0 = range low, 1 = range high

  const volSurge = volMult <= 0 || (avgVol > 0 && (last.v || 0) >= volMult * avgVol)   // DROP: spot v is a quote count → no volume condition
  const brokeDown = last.c < rangeLow - breakAtr * a
  const brokeUp = last.c > rangeHigh + breakAtr * a

  const f = n => +n.toFixed(2)

  // ── CONFIRMED BREAK (direction known) → fire that side ──
  if (brokeDown && volSurge) return { state: 'BREAKOUT_DOWN', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'SELL', canTrade: true,
    message: `✅ DIRECTION CONFIRMED: DOWN — closed $${f(px)} below $${dnTrigger} · SELL side is live`, waitFor: null }
  if (brokeUp && volSurge) return { state: 'BREAKOUT_UP', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'BUY', canTrade: true,
    message: `✅ DIRECTION CONFIRMED: UP — closed $${f(px)} above $${upTrigger} · BUY side is live`, waitFor: null }
  // broke but WITHOUT volume = unconfirmed → still wait
  if (brokeDown || brokeUp) return { state: 'EQUILIBRIUM', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: null, canTrade: false,
    message: `⏸ BREAK NOT CONFIRMED — price left the range but volume is thin (${avgVol ? (last.v / avgVol).toFixed(1) : '?'}×). WAIT for a volume close.`,
    waitFor: { sell: dnTrigger, buy: upTrigger, needVolume: volMult > 0 ? `${volMult}× average` : 'none (spot v is not volume)' } }

  // ── POST-BREAKOUT HYSTERESIS: after a CONFIRMED break, the direction stays locked until price RECLAIMS the
  // broken level. Never buy the falling knife (or short the rip) one bar after a volume break. ──
  for (let k = i - 1; k >= Math.max(lookback + 2, i - 12); k--) {
    const w = bars.slice(k - lookback, k)
    const rl = Math.min(...w.map(b => b.l)), rh = Math.max(...w.map(b => b.h))
    const av = w.reduce((s, b) => s + (b.v || 0), 0) / w.length
    const surge = volMult <= 0 || (av > 0 && (bars[k].v || 0) >= volMult * av)
    const ak = A[k] || a
    if (surge && bars[k].c < rl - breakAtr * ak) {                       // confirmed break DOWN at bar k
      const brokeLvl = f(rl - breakAtr * ak)
      const reclaimed = bars.slice(k + 1).some(b => b.c > brokeLvl)
      if (!reclaimed) return { state: 'TREND_DOWN', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'SELL', canTrade: true,
        message: `🔻 DOWNTREND CONFIRMED (broke $${brokeLvl} on a close) — SELL side only. Do NOT buy the falling knife.`,
        waitFor: { plain: `Only consider BUY once price closes back above $${brokeLvl} (reclaim).` } }
    }
    if (surge && bars[k].c > rh + breakAtr * ak) {                       // confirmed break UP at bar k
      const brokeLvl = f(rh + breakAtr * ak)
      const reclaimed = bars.slice(k + 1).some(b => b.c < brokeLvl)
      if (!reclaimed) return { state: 'TREND_UP', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'BUY', canTrade: true,
        message: `🔺 UPTREND CONFIRMED (broke $${brokeLvl} on a close) — BUY side only. Do NOT short the rip.`,
        waitFor: { plain: `Only consider SELL once price closes back below $${brokeLvl} (reclaim).` } }
    }
  }

  // ── EXTREMES: the edge lives here ──
  if (pos >= 0.75) return { state: 'PREMIUM', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'SELL', canTrade: true,
    message: `📈 PREMIUM (${Math.round(pos * 100)}% of range) — edge is on the SELL side. React to rejections here.`, waitFor: null }
  if (pos <= 0.25) return { state: 'DISCOUNT', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: 'BUY', canTrade: true,
    message: `📉 DISCOUNT (${Math.round(pos * 100)}% of range) — edge is on the BUY side. React to rejections here.`, waitFor: null }

  // ── THE MIDDLE: do not guess ──
  return { state: 'EQUILIBRIUM', rangeHigh: f(rangeHigh), rangeLow: f(rangeLow), mid: f(mid), pos: +pos.toFixed(2), allowedSide: null, canTrade: false,
    // wording (2026-10-16): the old "EQUILIBRIUM $<mid> (72% of range)" read as if the price were the mid. EQUILIBRIUM = 25-75 % of the range.
    message: `🚫 EQUILIBRIUM — price $${f(px)} at ${Math.round(pos * 100)}% of the range (middle zone 25-75 %, mid $${f(mid)}) — direction is UNDECIDED. Do NOT pick a side here. WAIT FOR CONFIRMATION.`,
    waitFor: { sell: dnTrigger, buy: upTrigger, needVolume: volMult > 0 ? `${volMult}× average` : 'none (spot v is not volume)', plain: `Wait for a close below $${dnTrigger} (then SELL) or above $${upTrigger} (then BUY).` } }
}

/** Gate a signal against the market state: only fire when the state allows that side. */
export function stateAllows(sig, st) {
  if (!sig) return { allow: false, why: 'no signal' }
  if (!st) return { allow: true, why: 'no state read' }
  if (!st.canTrade) return { allow: false, why: st.state === 'EQUILIBRIUM' ? 'equilibrium — waiting for confirmation' : 'state blocks trading' }
  if (st.allowedSide && sig.side !== st.allowedSide) return { allow: false, why: `state favours ${st.allowedSide}, signal is ${sig.side}` }
  return { allow: true, why: `${st.state} allows ${sig.side}` }
}
