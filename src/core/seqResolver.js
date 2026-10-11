// ════════════════════════════════════════════════════════════════════════════════
// seqResolver.js — managed-limit resolution with the fill bar SEQUENCED on sub-bars (the true resolution).
// ────────────────────────────────────────────────────────────────────────────────
// WHY (2026-08-14, caught LIVE on SWING_TRADE@1786709700000): OHLC cannot order intrabar prices. The old resolver
// credited a SELL's target from range that traded BEFORE the fill (the bar opened at its low). The fixed core
// resolver is PESSIMISTIC (no favorable credit on the fill bar) — correct as a floor, but it also denies GENUINE
// V-reversal wins. This resolver measures the TRUTH: the fill bar is replayed on its sub-bars (1m for 15m books,
// also 1m for 1H/4H books) so entry/stop/target/BE touches are ORDERED, not guessed.
//   • fill sub-bar: stop chargeable (pessimistic at the residual granularity), target/BE-arm NOT
//   • later sub-bars inside the fill bar: stop first, then target, then BE arm — true sequence
//   • bars after the fill bar: the standard pessimistic rule (identical to core resolveManagedLimit)
//   • fill bars with NO sub-bar coverage: pessimistic fallback, flagged seq:'pessimistic' — callers MUST report
//     the sequenced share, never hide it (measured 2026-08-14: 1m covers 2013-07 →, ~56% of 23y candidates,
//     but 100% of the OOS folds 5-7).
// Same return contract as core resolveManagedLimit (+ field `seq`), so netDollars/callers work unchanged.
// ════════════════════════════════════════════════════════════════════════════════

/** Build a fast sub-bar accessor over ascending sub-bars: subBarsOf(t, spanMs) → bars in [t, t+spanMs). */
export function makeSubBarIndex(subBars) {
  const T = subBars.map((b) => b.t)
  const lowerBound = (t) => { let lo = 0, hi = T.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < t) lo = mid + 1; else hi = mid } return lo }
  return (t, spanMs) => { const a = lowerBound(t); const out = []; for (let k = a; k < subBars.length && subBars[k].t < t + spanMs; k++) out.push(subBars[k]); return out }
}

/**
 * resolveManagedLimit with the fill bar sequenced on sub-bars.
 * @param {object} signal { direction:'UP'|'DOWN', plan:{entry,sl,tp}, ts_utc }
 * @param {Bar[]} bars entry-timeframe bars (ascending)
 * @param {Map} idxByT bar time → index
 * @param {function} subBarsOf (t, spanMs) → sub-bars inside the entry bar (from makeSubBarIndex)
 * @param {{fillWindow?:number,horizon?:number,beTriggerR?:number,beLockR?:number,tfMs?:number}} opts
 */
// ── LOCK MODE (2026-09-14) — how the break-even stop is paid once armed. Found on the live IMPULSE_CONT@1789378200000
// (10:18Z fill, armed 10:19Z, next minute opened 1.83 beyond the lock): the shipped geometry arms at +0.05R and locks at
// +0.10R — the lock is DEEPER in profit than the trigger, so at the moment of arming the "stop" sits beyond the price.
//   'level'  (default, the shipped artifacts): once armed, the first bar whose adverse side reaches the lock level pays
//            the lock — even when the market never traded there (h ≥ level is true while price sits above it).
//   'traded' (the EA's real behaviour): MT5 rejects a SELL's SL below the ask / a BUY's SL above the bid, and the EA
//            retries every tick, so the lock RESTS only after the market has traded through it in the favourable
//            direction; until then the original stop and target apply. Once resting: paid at the lock when the adverse
//            side returns to it; if the bar that activates it already CLOSED back through it, the exit is in that bar.
//   'arm'    (a close-at-market EA): exit at the arm level the moment the trigger prints.
// Default behaviour is byte-identical to before (the frozen-artifact smoke proves it); the other modes are for the
// study that measures the shipped numbers under the money path's real semantics (study_be_lock_semantics.mjs).
// lockRestMarginUsd (2026-09-15, 'traded' only): MT5 accepts the stop only once price is past the lock by the broker's minimum
// stop distance (SYMBOL_TRADE_STOPS_LEVEL); 0 = a touch is enough (the study's base case). The EA logs the broker's value on
// install day (ferrari_spread_log.csv stops_level_usd) and the study's sensitivity table says what it costs.
// fillThroughUsd (2026-09-15): a resting limit is FILLED here when a bar touches it (l ≤ entry for a BUY). A real limit at the
// back of the queue may need price to trade THROUGH it; this margin requires the touch to extend that far beyond the limit
// before a fill is credited (the fill price stays the limit). 0 = touch (every shipped artifact); the study measures the
// book's sensitivity to it — the EA's live fill ratio is the measurement that will replace the assumption.
// spreadAt (Ferrari Twin Turbo 2026-10-08 — BID/ASK): the twin's bars are BID bars (tick parity 35/35). With spreadAt(t) → full
// spread (USD) supplied, every order that fills against the ASK is compared with bid + spread: a BUY's entry limit; a SELL's
// stop, target, BE trigger, lock and time exit. Fill prices are then the broker's own, so grossMove is ALREADY net of spread
// (cost = stop slippage only — execution.roundTripCostBidAsk). spreadAt null (default) = byte-identical to before.
// seqAll (twin 2026-10-08): EVERY bar after the fill bar is also replayed on its sub-bars when they exist (stop → target → BE arm →
// lock, minute by minute) — exactly what the live paper trader has done since 2026-09-06. Without it the validator judged later bars
// whole (stop first), so a dip that armed BE and recovered inside one 15m bar was a LOSS here and a SCRATCH in the trial (measured by
// the seeded property test in smoke_paper_trader: backtest ≠ trial). Default false = byte-identical to the shipped artifacts.
export function resolveManagedLimitSeq(signal, bars, idxByT, subBarsOf, { fillWindow = 8, horizon = 64, beTriggerR = 1.0, beLockR = 0, tfMs = 900000, lockMode = 'level', lockRestMarginUsd = 0, fillThroughUsd = 0, spreadAt = null, seqAll = false } = {}) {
  if (!['level', 'traded', 'arm'].includes(lockMode)) throw new Error('resolveManagedLimitSeq: unknown lockMode ' + lockMode)
  if (!(lockRestMarginUsd >= 0)) throw new Error('resolveManagedLimitSeq: lockRestMarginUsd must be ≥ 0')
  if (!(fillThroughUsd >= 0)) throw new Error('resolveManagedLimitSeq: fillThroughUsd must be ≥ 0')
  const plan = signal.plan
  if (signal.direction === 'NEUTRAL' || !plan || plan.entry == null || plan.sl == null || plan.tp == null) return { outcome: 'NOTRADE', reason: 'no_plan' }
  const t = Date.parse(signal.ts_utc)
  const i = idxByT.get(t)
  if (i == null) return { outcome: 'NOTRADE', reason: 'entry_bar_not_found' }
  const up = signal.direction === 'UP'
  const { entry, sl, tp } = plan
  if (up && !(sl < entry && entry < tp)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }
  if (!up && !(tp < entry && entry < sl)) return { outcome: 'NOTRADE', reason: 'bad_plan_geometry' }

  const S = spreadAt ? (b) => { const x = spreadAt(b.t); if (!(x >= 0)) throw new Error('resolveManagedLimitSeq: spreadAt must return a spread ≥ 0'); return x } : () => 0
  let fillIdx = -1
  const fillEnd = Math.min(bars.length - 1, i + fillWindow)
  const fillAt = up ? entry - fillThroughUsd : entry + fillThroughUsd        // the price the touch must reach for the limit to be credited
  for (let j = i + 1; j <= fillEnd; j++) { if (up ? bars[j].l + S(bars[j]) <= fillAt : bars[j].h >= fillAt) { fillIdx = j; break } }
  if (fillIdx < 0) return { outcome: 'NOFILL', entry, sl, tp, fill_bars: null }

  const risk = Math.abs(entry - sl)
  const beArm = up ? entry + beTriggerR * risk : entry - beTriggerR * risk
  const beStop = up ? entry + beLockR * risk : entry - beLockR * risk
  const entryHourUtc = new Date(bars[fillIdx].t).getUTCHours()
  let armed = false, lockActive = false, seq = 'pessimistic'
  const mk = (outcome, exitType, grossMove, j) => ({ outcome, exitType, grossMove: +grossMove.toFixed(4), entry, sl, tp, beArmed: armed, lockMode, lockActive, entryHourUtc, fill_bars: fillIdx - i, resolve_bars: j - fillIdx, seq, ...(spreadAt ? { bidAsk: true } : {}) })
  const lockPay = up ? beStop - entry : entry - beStop
  const lockOn = () => lockMode === 'level' ? armed : (armed && lockActive)     // is the lock stop resting right now?
  // ONE step rule for a bar or a sub-bar (same order as always: stop → target → arm); fillSub = the limit's own fill
  // sub-bar, where nothing favourable is creditable. Returns a result or null.
  const step = (b, fillSub, j) => {
    const curStop = lockOn() ? beStop : sl
    const s = up ? 0 : S(b)                                                    // a SELL's exits are BUY orders → the ask side
    if (up ? b.l <= curStop : b.h + s >= curStop) return lockOn() ? mk('SCRATCH', 'scratch', lockPay, j) : mk('LOSS', 'stop', -risk, j)
    if (!fillSub && (up ? b.h >= tp : b.l + s <= tp)) return mk('WIN', 'target', up ? tp - entry : entry - tp, j)
    if (!fillSub && !armed && beTriggerR > 0 && (up ? b.h >= beArm : b.l + s <= beArm)) {
      armed = true
      if (lockMode === 'arm') return mk('SCRATCH', 'scratch', up ? beArm - entry : entry - beArm, j)
    }
    if (lockMode === 'traded' && armed && !lockActive && !fillSub && (up ? b.h >= beStop + lockRestMarginUsd : b.l + s <= beStop - lockRestMarginUsd)) {
      lockActive = true                                                        // the market traded through the lock: it can rest there from now
      if (up ? b.c <= beStop : b.c + s >= beStop) return mk('SCRATCH', 'scratch', lockPay, j)   // …and this bar already closed back through it (the close is the last print)
    }
    return null
  }

  // ── the fill bar, sequenced on its sub-bars ──
  const subs = subBarsOf(bars[fillIdx].t, tfMs)
  let k = 0
  if (subs.length) { while (k < subs.length && !(up ? subs[k].l + S(subs[k]) <= fillAt : subs[k].h >= fillAt)) k++ }
  if (subs.length && k < subs.length) {
    seq = 'seq'
    const fillK = k
    for (; k < subs.length; k++) {
      const r = step(subs[k], k === fillK, fillIdx)   // the sub-bar the limit fills on: stop chargeable, tp/BE not
      if (r) return r
    }
  } else if (up ? bars[fillIdx].l <= sl : bars[fillIdx].h + S(bars[fillIdx]) >= sl) {
    // no sub-bar coverage (or aggregation missed the touch): pessimistic fallback — stop chargeable, tp never
    return mk('LOSS', 'stop', -risk, fillIdx)
  }

  // ── bars after the fill bar: the standard pessimistic rule ──
  const end = Math.min(bars.length - 1, fillIdx + horizon)
  for (let j = fillIdx + 1; j <= end; j++) {
    if (seqAll) { const ms = subBarsOf(bars[j].t, tfMs); if (ms.length) { for (const m of ms) { const r = step(m, false, j); if (r) return r } continue } }
    const r = step(bars[j], false, j)
    if (r) return r
  }
  return mk('TIME', 'time', up ? bars[end].c - entry : entry - (bars[end].c + S(bars[end])), end)
}
