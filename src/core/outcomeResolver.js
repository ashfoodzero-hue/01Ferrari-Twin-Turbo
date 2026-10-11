// ════════════════════════════════════════════════════════════════════════════════
// outcomeResolver.js — score a past signal on a FILLABLE, causal basis (R3 / §4.1).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.5 core framework (2026-06-24).
//
// The §4.1 lesson: never score from a look-ahead EXTREME. So entry = the CLOSE at the
// signal's own bar (what you could realistically act on once the signal is known), and the
// outcome is read forward from there:
//   target = entry ± targetAtr·ATR, stop = entry ∓ stopAtr·ATR (ATR as of the entry bar)
//   WIN  = target touched before stop within `horizon` bars
//   LOSS = stop touched first — AND if BOTH are touched in the same bar we call it LOSS
//          (intrabar order is unknown → conservative, never optimistic)
//   NEUTRAL = neither within horizon · NOTRADE = NEUTRAL signal or unresolvable
// Using future bars to SCORE a past prediction is correct; the look-ahead sin would be
// using them to MAKE it — which the World-Model already prevents.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} signal  contract signal (ts_utc anchors the entry bar)
 * @param {Bar[]} bars     ascending
 * @param {Map<number,number>} idxByT  bar time → index
 * @param {{horizon?:number,targetAtr?:number,stopAtr?:number,atrArr:(number|null)[]}} opts
 */
export function resolveSignal(signal, bars, idxByT, { horizon = 16, targetAtr = 1.0, stopAtr = 1.0, atrArr } = {}) {
  if (signal.direction === 'NEUTRAL') return { outcome: 'NOTRADE', reason: 'neutral_signal' }
  const t = Date.parse(signal.ts_utc)
  const i = idxByT.get(t)
  if (i == null) return { outcome: 'NOTRADE', reason: 'entry_bar_not_found' }
  const a = atrArr[i]
  if (!a || a <= 0) return { outcome: 'NOTRADE', reason: 'no_atr' }
  if (i + 1 >= bars.length) return { outcome: 'NOTRADE', reason: 'no_forward_bars' }

  const entry = bars[i].c                      // FILLABLE reference (signal-time close), not an extreme
  const up = signal.direction === 'UP'
  const target = up ? entry + targetAtr * a : entry - targetAtr * a
  const stop = up ? entry - stopAtr * a : entry + stopAtr * a

  const end = Math.min(bars.length - 1, i + horizon)
  for (let j = i + 1; j <= end; j++) {
    const b = bars[j]
    const hitT = up ? b.h >= target : b.l <= target
    const hitS = up ? b.l <= stop : b.h >= stop
    if (hitT && hitS) return { outcome: 'LOSS', entry, target, stop, resolve_bars: j - i, ambiguous: true }
    if (hitT) return { outcome: 'WIN', entry, target, stop, resolve_bars: j - i }
    if (hitS) return { outcome: 'LOSS', entry, target, stop, resolve_bars: j - i }
  }
  return { outcome: 'NEUTRAL', entry, target, stop, resolve_bars: end - i }
}

/**
 * AHEAD-OF-TIME / FILLABLE resolution (R4). The signal carries a PLAN { entry, sl, tp } — a
 * limit pre-placed at a level price has NOT yet reached. We fill ONLY if price comes to the
 * limit within `fillWindow` bars (else NOFILL — no trade, not a loss); then race SL vs TP
 * from the fill bar within `horizon`. Same-bar SL+TP = LOSS (intrabar order unknown →
 * conservative). NOFILL is reported separately so we never flatter the win rate.
 * @param {object} signal  must have signal.plan = { entry, sl, tp } and direction UP|DOWN
 */
export function resolveLimitSignal(signal, bars, idxByT, { fillWindow = 8, horizon = 32, cost = 0 } = {}) {
  const plan = signal.plan
  if (signal.direction === 'NEUTRAL' || !plan || plan.entry == null || plan.sl == null || plan.tp == null) {
    return { outcome: 'NOTRADE', reason: 'no_plan' }
  }
  const t = Date.parse(signal.ts_utc)
  const i = idxByT.get(t)
  if (i == null) return { outcome: 'NOTRADE', reason: 'entry_bar_not_found' }
  const up = signal.direction === 'UP'
  const { entry, sl, tp } = plan

  // sanity: for a BUY the limit must sit below trigger price with sl<entry<tp (mirror for SELL)
  if (up && !(sl < entry && entry < tp)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }
  if (!up && !(tp < entry && entry < sl)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }

  // 1) limit fill within the fill window
  let fillIdx = -1
  const fillEnd = Math.min(bars.length - 1, i + fillWindow)
  for (let j = i + 1; j <= fillEnd; j++) {
    if (up ? bars[j].l <= entry : bars[j].h >= entry) { fillIdx = j; break }
  }
  if (fillIdx < 0) return { outcome: 'NOFILL', entry, sl, tp, fill_bars: null }

  // 2) SL vs TP race from the fill bar (inclusive). `cost` (price units, e.g. spread) makes the
  //    take-profit HARDER to reach — a realistic-cost WR (never optimistic). Loss-side slippage
  //    is accounted as $ in the expectancy, not here.
  const end = Math.min(bars.length - 1, fillIdx + horizon)
  for (let j = fillIdx; j <= end; j++) {
    const b = bars[j]
    // fill-bar sequence rule (2026-08-14): tp is never creditable on the fill bar — OHLC cannot prove the
    // favorable touch happened AFTER the fill. Stop stays checked (pessimistic on both sides).
    const hitTp = j !== fillIdx && (up ? b.h >= tp + cost : b.l <= tp - cost)
    const hitSl = up ? b.l <= sl : b.h >= sl
    if (hitTp && hitSl) return { outcome: 'LOSS', entry, sl, tp, fill_bars: fillIdx - i, resolve_bars: j - fillIdx, ambiguous: true }
    if (hitTp) return { outcome: 'WIN', entry, sl, tp, fill_bars: fillIdx - i, resolve_bars: j - fillIdx }
    if (hitSl) return { outcome: 'LOSS', entry, sl, tp, fill_bars: fillIdx - i, resolve_bars: j - fillIdx }
  }
  return { outcome: 'NEUTRAL', entry, sl, tp, fill_bars: fillIdx - i, resolve_bars: end - fillIdx }
}

/**
 * P4.6 — FILLABLE limit + BREAK-EVEN / SCRATCH management (the prior app's proven 97% mechanism,
 * now on a look-ahead-free ahead-of-time entry). Same fillable limit as resolveLimitSignal, but once
 * price moves in favor by `beTriggerR × risk`, the stop is moved to break-even (entry ± beLockR×risk).
 * A trade that then reverses exits at BE = SCRATCH (≈ flat), NOT a loss — this converts would-be
 * losers into scratches and lifts the DECISIVE win rate (WIN / (WIN+LOSS)). Honest accounting:
 * SCRATCH and TIME are reported separately and EXCLUDED from the decisive denominator; the caller must
 * also weigh scratch-rate + NET expectancy so a high WR can never hide a bleed of scratch/time costs.
 *
 * Outcomes: WIN (tp) · LOSS (original sl, never armed) · SCRATCH (BE stop after arming) · TIME (horizon)
 *           · NOFILL · NOTRADE. Conservative intrabar: adverse-before-arm = LOSS; same-bar tp+BE = SCRATCH.
 * Returns grossMove (signed USD, favorable +) + exitType so the caller applies the P4.5 cost model.
 * @param {{fillWindow?:number,horizon?:number,beTriggerR?:number,beLockR?:number}} opts
 */
export function resolveManagedLimit(signal, bars, idxByT, { fillWindow = 8, horizon = 64, beTriggerR = 1.0, beLockR = 0 } = {}) {
  const plan = signal.plan
  if (signal.direction === 'NEUTRAL' || !plan || plan.entry == null || plan.sl == null || plan.tp == null) {
    return { outcome: 'NOTRADE', reason: 'no_plan' }
  }
  const t = Date.parse(signal.ts_utc)
  const i = idxByT.get(t)
  if (i == null) return { outcome: 'NOTRADE', reason: 'entry_bar_not_found' }
  const up = signal.direction === 'UP'
  const { entry, sl, tp } = plan
  if (up && !(sl < entry && entry < tp)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }
  if (!up && !(tp < entry && entry < sl)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }

  // 1) limit fill within the fill window
  let fillIdx = -1
  const fillEnd = Math.min(bars.length - 1, i + fillWindow)
  for (let j = i + 1; j <= fillEnd; j++) {
    if (up ? bars[j].l <= entry : bars[j].h >= entry) { fillIdx = j; break }
  }
  if (fillIdx < 0) return { outcome: 'NOFILL', entry, sl, tp, fill_bars: null }

  const risk = Math.abs(entry - sl)
  const beArm = up ? entry + beTriggerR * risk : entry - beTriggerR * risk      // favorable level that arms BE
  const beStop = up ? entry + beLockR * risk : entry - beLockR * risk           // where the stop moves to once armed
  const entryHourUtc = new Date(bars[fillIdx].t).getUTCHours()
  let armed = false
  const mk = (outcome, exitType, grossMove, j) => ({ outcome, exitType, grossMove: +grossMove.toFixed(4), entry, sl, tp, beArmed: armed, entryHourUtc, fill_bars: fillIdx - i, resolve_bars: j - fillIdx })

  const end = Math.min(bars.length - 1, fillIdx + horizon)
  for (let j = fillIdx; j <= end; j++) {
    const b = bars[j]
    // 🚨 FILL-BAR SEQUENCE (caught live 2026-08-14: SELL filled at 4380.92 on a bar that OPENED AT ITS LOW below
    // the tp — the "target touch" traded BEFORE the fill, and this resolver credited a WIN that never existed).
    // OHLC cannot order intrabar prices, so on the fill bar the favorable side (tp, BE-arm) is NOT creditable —
    // only the adverse side (stop) is, which stays checked. Pessimistic on BOTH sides, like the paper journal.
    const fillBar = j === fillIdx
    const curStop = armed ? beStop : sl
    const hitTp = !fillBar && (up ? b.h >= tp : b.l <= tp)
    const hitStop = up ? b.l <= curStop : b.h >= curStop
    if (hitStop) {                                  // stop-first conservative (covers same-bar tp+stop)
      if (armed) return mk('SCRATCH', 'scratch', up ? beStop - entry : entry - beStop, j)
      return mk('LOSS', 'stop', -risk, j)
    }
    if (hitTp) return mk('WIN', 'target', up ? tp - entry : entry - tp, j)
    if (!armed && !fillBar) {                       // arm AFTER resolving this bar's stop/tp (no same-bar arm+exit; never on the fill bar)
      // ⚠ beTriggerR <= 0 DISABLES break-even management (2026-07-18). Before this guard, beTriggerR: 0 meant
      // "arm break-even AT THE ENTRY, immediately" — beArm = entry + 0·risk — so from the bar after the fill,
      // any retest of the entry price exited as a $0 SCRATCH. Two sweeps passed 0 MEANING "no management, fixed
      // TP/SL" (their comments say so) and silently measured an instant-BE strategy instead: the WR-frontier
      // sweep (42.6% of trades scratch-censored out of its "99.8% WR") and the tight-stop/big-target sweep
      // (whose 0-of-100 verdict therefore described the wrong trade). Caught by arithmetic: 30k "timeouts" with
      // median hold 2 bars cannot be horizon exhaustion. Zero now means what every caller meant by it.
      const hitArm = beTriggerR > 0 && (up ? b.h >= beArm : b.l <= beArm)
      if (hitArm) armed = true
    }
  }
  // time exit at horizon
  const last = bars[end].c
  return mk('TIME', 'time', up ? last - entry : entry - last, end)
}
