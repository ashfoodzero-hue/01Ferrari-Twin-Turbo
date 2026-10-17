# Swing-candle study, Phase 1: the candle atlas at swing points on 16 timeframes

Pre-registered 2026-10-17. Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "We need to understand candles at all time frames at the swing points … (1Month, 1W, 3 days, 2days, 1day, 9H, 6H, 4H, 3H, 2H, 1H, 30M, 15m, 5m, 3m, 1m) those only at swing levels from both sides … full comprehensive analysis first … then we list our clear understanding and only after covering 100% understanding we make Table for each time frame … describe what happened at those levels … with zero guessing … then … read the footprint … compare … other time frames … find out how Bear become a Bull and when Bull become a bear."

His choice: **each timeframe gets its own swings**.

## Phases (each starts only after the previous one is complete and audited)

| Phase | What | Spec |
|---|---|---|
| **1 (this document)** | Candle atlas: anatomy of the candles at every swing high / low on each of the 16 timeframes, against controls. Same-time context: USD events, news, DXY, silver, and real volume where it exists. | this file |
| 2 | Footprint read at the swing extremes (CME, 1m → 4H, 2024-10 → 2026-10) | addendum, written before its numbers |
| 3 | Flip ladder: after a swing on a higher timeframe, in what order and how fast each lower timeframe flips (how Bear becomes Bull) | addendum, written before its numbers |
| 4 | Written understanding + final tables. Only then candidate rules, each pre-registered and tested separately. | — |

## 1. Data (`docs/DATA_CONTRACT.md`, verified 2026-10-17 by `verify_database.mjs`)

- **Price:** spot XAUUSD 1m, 2013-07-14 → **2026-10-09 06:00 UTC** (the study cut-off; later data stays unseen).
  - Read with `loadBars` → `cleanForTv`, which strips the fake spot `v`.
  - Candles come from `nyCandles.buildCandles`, TradingView-exact on all 16 timeframes.
- **Holes:** candles overlapping a data hole (`dataHoles.markIncomplete`) are ZigZag **breaks**. No swing, control or window may touch them.
- **Context at the same time** (built on the same gold candle times):
  - DXY: rebuilt from 6 pairs, 2013+.
  - Silver: XAGUSD, 2013+.
  - USD calendar: Forex Factory actual / forecast, official times, 2013+.
  - News: Polygon, **2020-03+ only**.
  - Macro known at the candle open: `marketContext`.
  - Real volume: GOLD_FUT, **2024-10+ only**.

## 2. Swings (one rule, `src/master/swings.js`)

**Swing.** A ZigZag on each timeframe's candles.
- A swing high / low is confirmed when price moves **k = 3 × ATR(14)** of that timeframe away from the running extreme.
- The swing point is the extreme candle (offset 0).
- `knownI` is the candle that confirmed it. The confirmation lag is reported.

**Robustness only (not separate claims).** Every headline table is re-run with k = 2 and k = 5. A finding must keep its sign at both.

**Controls on the same timeframe and side** (both are reported):
- **C1, failed extreme:** a candle that was the running extreme of its leg, saw a pullback of **≥ 1 ATR** ("looked like the turn"), then was exceeded before any reversal confirmed. Same leg, same context, but not the swing.
- **C2, random candle:** same timeframe, same NY hour, same calendar year, not within ±3 candles of a swing. Seeded, 3 per swing.

## 3. Measures (definitions fixed in `src/master/candleFeatures.js`)

**Window.** For every swing and control: candles at **offsets −3 … +3** around the extreme.
- **Offsets ≤ 0 are KNOWABLE at the extreme candle's close.** Whether it is the swing is not known yet, which is exactly the question.
- **Offsets +1 … +3** are knowable at their own close. Each is reported with whether the swing had already been confirmed by then.

**Per candle, sizes in that timeframe's ATR (previous closed candle):**
- range, body;
- body / upper wick / lower wick as a fraction of range, close location (0 = on the low, 1 = on the high);
- direction (bull / bear / doji: body ≤ 10 % of range);
- inside bar, outside bar, bullish / bearish engulfing;
- sweep-and-reclaim of the previous low (for lows) or high (for highs);
- gap;
- the labelled shapes hammer, shooting star, marubozu.

**Leg context (offset 0):**
- leg length (bars since the previous swing);
- leg size in ATR;
- the position of the extreme vs the previous swing of the same side (higher low / lower low, higher high / lower high).

**Same-time context of the extreme candle:**
1. a HIGH-impact USD event inside the candle, or inside offsets −3 … 0;
2. its surprise sign (actual vs forecast, FF "better / worse"), when present;
3. the DXY candle direction at the same times (offset 0, and offsets −3 … 0 net);
4. the silver candle direction at offset 0;
5. 2020+ only: Polygon gold-news count inside the candle;
6. 2024-10+ only: real CME volume of the extreme candle vs the median of its 20 previous candles.

Items 5-6 are **sub-period cells**, reported with their own n. They never mix with 13-year cells.

## 4. Statistics (`src/core/studyStats.js`)

**Split.** TRAIN = the first 60 % of the window (2013-07-14 → ≈ 2021-08). OOS = the last 40 %.

**Boolean measures.** Prevalence at swings vs C1 (and vs C2): ratio, difference, two-sided two-proportion test.

**Continuous measures.** Tercile bins with cut-offs from **TRAIN controls only**. Each bin is tested as a boolean.

**Family and Holm.** One family per **timeframe × side**: every measure × offset × bin vs C1. Holm at α = 0.05 on the OOS p-values.

**A FINDING (✅)** must meet all of these:
- passes OOS Holm;
- TRAIN difference has the same sign;
- the difference vs C2 has the same sign;
- keeps its sign at k = 2 and k = 5.

**Labels for everything else:**
- **DESCRIBED ONLY:** fewer than **30 swings** of that side in OOS. This is expected for 1M and probably 1W, maybe 3D. The numbers are shown and never called proven.
- **Inconsistent:** a sign that flips between TRAIN and OOS. It is shown and marked.

## 5. What is reported (output `data/master/swing_candle_atlas.json` + `docs/SWING_CANDLE_ATLAS.md`)

**Per timeframe:**
- swing counts (TRAIN / OOS, highs / lows);
- median amplitude in ATR;
- median confirmation lag;
- a table per side listing every measure × offset: swing % vs failed-extreme % vs random %, the ratio, OOS Holm p, TRAIN sign, k = 2 / 5 sign and the verdict.

**Plain-words summary per timeframe**, using ✅ findings only: "at a swing low on 4H, the extreme candle …". Then a list of what does NOT differ from the controls.

**Cross-timeframe overview:** which findings hold on which timeframes. This is descriptive, and Phase 3 does the timing.

**Not in Phase 1:** trading rules, win rates, footprints, the flip ladder.

## 6. Guards

- Built only from the tools above, all smoke-tested. The study script gets its own smoke on a synthetic series with planted swings, checking that the atlas recovers the planted pattern.
- Look-ahead audit: every context value carries its known time ≤ the candle's close. Asserted per row.
- Seeded randomness; the run is reproducible.

Study script: `scripts/study_swing_candle_atlas.mjs`.

## CLARIFICATIONS, 2026-10-17 (written before any number was computed)

- **Real-volume context (§3 item 6), as two booleans:**
  - "heavy" = the extreme candle's CME volume ≥ 1.5 × the median of its 20 previous candles;
  - "light" = ≤ 0.67 ×.

  Candles that span a contract roll are skipped.
- **Sub-period cells use their own 60/40 split by time:**
  - news: 2020-03-31 → cut-off;
  - real volume: 2024-10-09 → cut-off.

  Otherwise the real-volume cells would have no TRAIN at all.
- **Surprise field (measured):** Forex Factory `better` 1 = the surprise was good for the USD (e.g. NFP 115K vs 65K), 2 = bad for the USD (e.g. CPI −0.4 % vs −0.1 %), 0 = in line.
- **Candle span for context:** [candle open, the end of its last minute]. The window is [open of offset −3, the end of offset 0].

## ADDENDUM A, 2026-10-17: selection bias in offsets +1 … +3 (found by auditing a 1D + 4H trial run, before the full run)

**The problem.** In the trial, all 10 4H "findings" sat at offsets +1 … +3. A swing extreme is, by definition, never exceeded afterwards. A failed extreme (C1) is exceeded later, often by the very next candle. Comparing post-extreme candles of the two groups therefore partly restates the definition.

**The fix, for all timeframes:**
- For offset +k, a C1 event counts only if it was **still unbroken at the close of candle +k** (its superseding candle comes after i + k).
- Both groups then share "the extreme held for k candles". The question becomes: given the low held for k candles, what tells the real swing from the failed one?
- Offsets ≤ 0, leg context and same-time context are unchanged.
- The trial numbers are discarded; the full run uses this rule.

## ADDENDUM B, 2026-10-17: effect-size labels (presentation only; no verdict changes)

On 1m-5m there are 9 k-51 k OOS swings, so differences of 1-3 points pass Holm. Each FINDING is therefore labelled by its OOS gap vs failed extremes:
- **tiny** < 5 points;
- **moderate** 5-10 points;
- **clear** ≥ 10 points.

The report leads with findings that repeat on ≥ 5 timeframes and are at least moderate.
