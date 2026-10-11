// tierStats.js — Ferrari Twin Turbo: the ONE book's record. Every number cites its artifact (source) and smoke_twin_roster
// re-derives it field for field; smoke_impulse_frozen reproduces the artifact from the twin's own tape.
//
// 2026-10-08 (rev f) — RE-MEASURED ON THE TWIN'S OWN DATA, and SHADOWED. The carried-over record (Turbo2's
// impulse_cont_seq1m_gate.json: WR 73.59%, +$0.3527/t, SHIP — archived in data/master/_turbo2_frozen/) was measured on the
// 23y Dukascopy 15m tape with the shipped 'level' lock rule and an ASSUMED session spread. Under Ashraf's 1m-only Polygon
// history (R0) the same pre-registered gate gives, on the MONEY PATH (every bar sequenced on 1m · the EA's lock rule · BID bars
// with ask-side orders clearing the MEASURED Polygon spread): OOS −$0.065/t [−0.47, +0.31], TRAIN −$0.196/t, 1/8 folds
// positive ⇒ SHADOW (C2, C3, C4 fail). Attribution and the source diagnostic live in data/master/impulse_cont_twin_gate.json.
// A shadow book is still RECORDED (forward evidence) but never alerted, never promoted: the route back is a re-validation that
// PASSES, never a paper streak.
export const TIER_STATS = Object.freeze({
  IMPULSE_CONT: { tf: '15m', mark: 'Impulse Continuation',
    targetUsd: 3.97, rr: 0.5, avgStopUsd: 7.94, wr: 0.4706, wrLb: 0.3932, n: 153, perDay: 0.3087, perYear: 112.7,
    managed: true, netPerTradeUsd: -0.0653, netPerTradeLbUsd: -0.4748, netPerTradeTrainUsd: -0.1964,
    outcomes: Object.freeze({ win: 0.1129, scratch: 0.7602, loss: 0.127 }),
    // the money path IS the trial's semantics (traded lock, bid/ask, every bar on 1m — paper ≡ resolver, property-tested), so the
    // on-track reference distribution is the same artifact block.
    outcomesTraded: Object.freeze({ win: 0.1129, scratch: 0.7602, loss: 0.127, n: 638, netPerTradeUsd: -0.0653, netPerTradeLbUsd: -0.4748,
      fillThroughToleranceUsd: null,   // the Turbo2 study's 0.10 tolerance was derived on the superseded tape — not carried
      source: 'data/master/impulse_cont_twin_gate.json#shipped (money path)' }),
    slAtr: 1.5, tgtR: 0.5, beTriggerR: 0.05, beLockR: 0.10, tradeable: false, shadow: true, paperOnly: true,
    seqVerdict: 'SHADOW', seqTrainUsd: -0.1964,
    shadowWhy: 'TWIN GATE 2026-10-08: money path on the twin Polygon 1m tape — OOS -$0.065/t, TRAIN -$0.196/t, 1/8 folds (C2+C3+C4 fail)',
    source: 'data/master/impulse_cont_twin_gate.json#shipped',
    exec: 'fresh 2h impulse ≥4×ATR then a confirmed direction-matched 15m setup · ALL-HOURS · maker limit · stop 1.5·ATR · target 0.5R · BE +0.05R/+0.10R · SHADOW: recorded, never traded',
    flagship: false,
    note: 'SHADOW on the twin\'s own data. Same window/folds/code on Turbo2\'s Dukascopy tape passes (OOS +$0.548/t [0.24, 0.83]); on the Polygon feed the twin trades from it does not (+$0.163/t [−0.19, 0.49] even at the old assumed cost) — the edge is FEED-SENSITIVE at the scale of its break-even geometry (feeds differ by $0.02-0.12 per bar; 15m ranges $0.12-0.21 narrower on Polygon since 2023). At the measured spread it is negative. diagnose_revalidation_source.json + impulse_cont_twin_gate.json#attribution.' },
})
/** The books that trade (paper) — none since the 2026-10-08 re-measurement on the twin's own data. */
export function shippingLabel() {
  const live = Object.entries(TIER_STATS).filter(([, t]) => t.tradeable === true)
  return live.length ? live.map(([k, t]) => k + (t.paperOnly ? ' (paper)' : '')).join(' / ') : 'no book ships'
}
