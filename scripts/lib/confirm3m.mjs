// confirm3m.mjs — the ONE implementation of the 3m-confirmation entries at 15m swing tips + their trade simulation (spec docs/CONFIRM3M_MONEY_SPEC.md,
// Ashraf 2026-10-19 "Yes, run it as written"). Strictly causal, built for the study, the last-week review and the proofs:
//   • the 15m leg = direction after the last CONFIRMED 15m ZigZag 3×ATR swing (close of its confirming candle ≤ now); its running extreme is the TIP
//     (lowest low / highest high since that swing's candle, on 3m candles); every new extreme replaces the tip.
//   • confirmation level = the last 3m pivot (3 left strict / 3 right ≥) of the leg AGAINST the tip, placed before the tip and already CONFIRMED
//     (pivot + 3 closed) at the moment it is used; trigger = first 3m CLOSE beyond it while the tip is unbroken. Low tip → BUY, high tip → SELL.
//     One trade per tip.
//   • trade (ADDENDUM A 2026-10-19, before any number: our minutes are BID → a round trip pays the FULL spread — buys fill at the ask, sells close
//     at the ask; the spec's "half spread" was too kind): entry = open of the minute after the confirming 3m close; stop = tip ∓ 0.1 × ATR(15m)
//     (ATR of the last closed 15m candle); targets 1R / 2R / 1 ATR / 2 ATR; time stop 300 min (20 × 15m) at the minute close; 1m resolution, stop
//     first when stop and target share a minute.
import { atr as atrArr } from '../../src/core/indicators.js'
import { zigzag } from '../../src/master/swings.js'

export const C3M = Object.freeze({ PIV: 3, STOP_ATR: 0.1, TIME_MIN: 300, TARGETS: [['1R', 'R', 1], ['2R', 'R', 2], ['1ATR', 'A', 1], ['2ATR', 'A', 2]] })
const lb = (arr, t, key = (x) => x.t) => { let a = 0, b = arr.length; while (a < b) { const m = (a + b) >> 1; if (key(arr[m]) < t) a = m + 1; else b = m } return a }

/** Triggers from 3m + 15m candles (15m `breaks` = incomplete candles). → [{ side, tipT, tipPx, level, levelT, trigT (3m close), legSwingT, atr15, hl }] */
export function findTriggers(C3, C15, breaks15 = new Set(), { piv = C3M.PIV, from = -Infinity } = {}) {
  const A15 = atrArr(C15, 14), sw = zigzag(C15, { k: 3, breaks: breaks15 }).swings.map((s) => ({ type: s.type, t: C15[s.i].t, knownClose: C15[s.knownI].close_t })).sort((a, b) => a.knownClose - b.knownClose)
  const N = C3.length, isPH = new Uint8Array(N), isPL = new Uint8Array(N)
  for (let i = piv; i < N - piv; i++) { let h = true, l = true
    for (let j = 1; j <= piv; j++) { if (!(C3[i].h > C3[i - j].h) || !(C3[i].h >= C3[i + j].h)) h = false; if (!(C3[i].l < C3[i - j].l) || !(C3[i].l <= C3[i + j].l)) l = false }
    isPH[i] = h ? 1 : 0; isPL[i] = l ? 1 : 0 }
  const out = []; let si = -1, dir = 0, legJ = 0, tipJ = -1, used = false
  for (let j = 0; j < N; j++) { const c = C3[j], closeT = c.close_t
    while (si + 1 < sw.length && sw[si + 1].knownClose <= closeT) { si++; const s = sw[si]; dir = s.type === 'H' ? -1 : 1; legJ = lb(C3, s.t); tipJ = -1; used = false
      for (let k = legJ; k <= j; k++) if (tipJ < 0 || (dir < 0 ? C3[k].l < C3[tipJ].l : C3[k].h > C3[tipJ].h)) tipJ = k }
    if (!dir) continue
    if (tipJ < 0 || (dir < 0 ? c.l < C3[tipJ].l : c.h > C3[tipJ].h)) { tipJ = j; used = false; continue }   // new extreme → new tip (cannot confirm itself)
    if (used || tipJ === j || closeT < from) continue
    // last CONFIRMED pivot against the tip, placed before the tip, inside the leg: pivot p with p + piv ≤ j
    let p = -1; for (let k = Math.min(tipJ - 1, j - piv); k >= legJ; k--) if (dir < 0 ? isPH[k] : isPL[k]) { p = k; break }
    if (p < 0) continue
    const lvl = dir < 0 ? C3[p].h : C3[p].l
    if (dir < 0 ? c.c > lvl : c.c < lvl) { used = true
      const k15 = lb(C15, closeT, (x) => x.close_t) - 1, a15 = k15 >= 0 ? A15[k15] : null; if (!(a15 > 0)) continue
      let hl = false; for (let k = tipJ + 1; k <= j - piv; k++) if (dir < 0 ? isPL[k] : isPH[k]) { hl = true; break }
      out.push({ side: dir < 0 ? 'BUY' : 'SELL', tipT: C3[tipJ].t, tipPx: dir < 0 ? C3[tipJ].l : C3[tipJ].h, level: lvl, levelT: C3[p].t, trigT: closeT, legSwingT: sw[si].t, atr15: a15, hl, tipJ, trigJ: j }) } }
  return out
}

/** Simulate one trade on 1m BID bars. spreadAt(t) → full spread (0 = R before costs). target = ['1R','R',1] etc. */
export function simulate(M, tr, target, spreadAt) {
  const buy = tr.side === 'BUY', k0 = lb(M, tr.trigT); if (k0 >= M.length) return null
  const e = M[k0], sp0 = spreadAt(e.t), entry = buy ? e.o + sp0 : e.o, stop = buy ? tr.tipPx - C3M.STOP_ATR * tr.atr15 : tr.tipPx + C3M.STOP_ATR * tr.atr15
  const R = buy ? entry - stop : stop - entry; if (!(R > 0)) return { skipped: 'entry beyond stop' }
  const dist = target[1] === 'R' ? target[2] * R : target[2] * tr.atr15, tp = buy ? entry + dist : entry - dist, end = e.t + C3M.TIME_MIN * 60000
  for (let k = k0; k < M.length && M[k].t < end; k++) { const b = M[k], sp = spreadAt(b.t)
    const lo = buy ? b.l : b.l + sp, hi = buy ? b.h : b.h + sp   // the side we exit on: buys sell at the BID, sells buy back at the ASK
    const hitStop = buy ? lo <= stop : hi >= stop, hitTp = buy ? hi >= tp : lo <= tp
    if (hitStop) return { exitT: b.t, exit: stop, pnl: buy ? stop - entry : entry - stop, r: -1, how: 'stop', entry, stop, tp, R }
    if (hitTp) { const pnl = buy ? tp - entry : entry - tp; return { exitT: b.t, exit: tp, pnl, r: pnl / R, how: 'target', entry, stop, tp, R } } }
  const kl = lb(M, end) - 1; if (kl < k0) return null
  const b = M[kl], x = buy ? b.c : b.c + spreadAt(b.t), pnl = buy ? x - entry : entry - x
  return kl === M.length - 1 && M.at(-1).t < end - 60000 ? { open: true } : { exitT: b.t, exit: x, pnl, r: pnl / R, how: 'time', entry, stop, tp, R }
}
