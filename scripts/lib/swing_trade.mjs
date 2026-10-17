// swing_trade.mjs — Phase 4B core (docs/SWING_TRADE_SPEC.md, 2026-10-17): the LIVE ladder trigger (causal) and the trade simulator. Pure functions.

/** Block min/max over 1m lows / highs for fast "nothing below P since time a" checks. */
export function rangeIndex(M, B = 1024) {
  const nb = Math.ceil(M.length / B), lo = new Float64Array(nb).fill(Infinity), hi = new Float64Array(nb).fill(-Infinity)
  for (let i = 0; i < M.length; i++) { const k = (i / B) | 0; if (M[i].l < lo[k]) lo[k] = M[i].l; if (M[i].h > hi[k]) hi[k] = M[i].h }
  const at = (t) => { let a = 0, b = M.length; while (a < b) { const m = (a + b) >> 1; if (M[m].t < t) a = m + 1; else b = m } return a }   // first index with t ≥ time
  const minLow = (i0, i1) => { let m = Infinity, i = i0; while (i < i1 && i % B) { if (M[i].l < m) m = M[i].l; i++ } while (i + B <= i1) { if (lo[i / B] < m) m = lo[i / B]; i += B } while (i < i1) { if (M[i].l < m) m = M[i].l; i++ } return m }
  const maxHigh = (i0, i1) => { let m = -Infinity, i = i0; while (i < i1 && i % B) { if (M[i].h > m) m = M[i].h; i++ } while (i + B <= i1) { if (hi[i / B] > m) m = hi[i / B]; i += B } while (i < i1) { if (M[i].h > m) m = M[i].h; i++ } return m }
  return { at, minLow, maxHigh }
}
/**
 * LIVE ladder signals for one anchor (spec §1). X swings = the one-step-below ZigZag (confirmed at the CLOSE of its knownI candle).
 * Anchor state at time t is taken from anchor swings CONFIRMED by t (close of their knownI candle ≤ t). A LONG fires when X confirms a swing low
 * at P, the last confirmed anchor swing is a HIGH (down-leg), and P is the lowest 1m low since that anchor high's extreme candle opened.
 */
export function liveSignals({ M, R, CA, swA, CX, swX }) {
  const conf = swA.map((s) => ({ t: CA[s.knownI].close_t, type: s.type, t0: CA[s.i].t })).sort((a, b) => a.t - b.t), out = []
  const lastConf = (t) => { let a = 0, b = conf.length; while (a < b) { const m = (a + b) >> 1; if (conf[m].t <= t) a = m + 1; else b = m } return a ? conf[a - 1] : null }
  for (const s of swX) { const tX = CX[s.knownI]?.close_t; if (tX == null) continue
    const st = lastConf(tX); if (!st) continue
    const wantType = s.type === 'L' ? 'H' : 'L'; if (st.type !== wantType) continue   // a low needs a down-leg (last anchor swing = HIGH)
    const i0 = R.at(st.t0), i1 = R.at(tX)
    const ext = s.type === 'L' ? R.minLow(i0, i1) : R.maxHigh(i0, i1)
    if (Math.abs(ext - s.px) > 1e-9) continue   // P must be the anchor's current running extreme
    out.push({ t: tX, side: s.type === 'L' ? 'long' : 'short', P: s.px, tP: CX[s.i].t }) }   // tP = the extreme candle open (Phase 4C structure lookup)
  return out.sort((a, b) => a.t - b.t)
}
/**
 * Simulate one trade on 1m BID bars from index k (the entry bar = first bar with t ≥ signal time). Long: entry ask = open + spread; exits at bid.
 * Short: entry bid = open; exits at ask = bid + spread. Stop first on a shared bar; a gap through the stop fills at the open. Time stop at tEnd (bar close).
 * @returns { entry, exit, how: 'stop'|'target'|'time'|'end', exitT, R, usd }
 */
export function simulate(M, k, { side, stop, target, tEnd, spreadAt }) {
  const b0 = M[k]; if (!b0) return null
  const long = side === 'long', entry = long ? b0.o + spreadAt(b0.t) : b0.o, risk = long ? entry - stop : stop - entry
  if (!(risk > 0)) return null
  for (let j = k; j < M.length; j++) { const b = M[j], sp = spreadAt(b.t)
    if (long) { if (b.l <= stop) return fin(Math.min(stop, b.o), 'stop', b.t); if (b.h >= target) return fin(target, 'target', b.t) }   // conservative: a gap beyond the target fills AT the target
    else { const ah = b.h + sp, al = b.l + sp, ao = b.o + sp; if (ah >= stop) return fin(Math.max(stop, ao), 'stop', b.t); if (al <= target) return fin(target, 'target', b.t) }
    if (b.t + 60000 >= tEnd) return fin(long ? b.c : b.c + sp, 'time', b.t) }
  const last = M[M.length - 1]; return fin(long ? last.c : last.c + spreadAt(last.t), 'end', last.t)
  function fin(exit, how, exitT) { const usd = long ? exit - entry : entry - exit; return { entry, exit, how, exitT, R: usd / risk, usd, risk } }
}
