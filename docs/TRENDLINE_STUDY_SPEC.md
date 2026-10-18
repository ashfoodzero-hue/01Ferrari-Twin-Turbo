# Trendlines on 1W / 1D / 4H / 1H: which are respected (6 years), how they match the last 3 years, and an Extra tab in the app

Written 2026-10-18. Status: **WRITTEN, NOT RUN.** Method: Claude skill `trendline-study` (added 2026-10-18).

## Request (Ashraf, 2026-10-18)

> "we need to make a trend line from both sides for weekly, daily, 4H, 1H, and we need to check if the trend lines are respected on which trendline most and that to be done for last 6 years, please this charts for each time frame we need it in Extra Tab on the App and we need to see this for charts for each asset and after that we need to see how those are matching the on going price action for the last 3 years and do a real study research using the best method"

## 1. Data

| Asset | Candles | History available |
|---|---|---|
| XAU, Silver | Gold session, TradingView-exact | 6 years: 2020-10-16 → 2026-10-16 (plus warm-up) |
| DXY | TradingView ICE session | 6 years |
| WTI | CME session | **only 2024-10 → now.** Polygon keeps ≈ 2 years of futures on our plan. See the decision in §8. |

Timeframes: 1W, 1D, 4H, 1H. All sizes are in ATR(14) of that timeframe.

## 2. The lines (objective, never hand-drawn)

- **Both sides:** support lines through two pivot LOWS, resistance lines through two pivot HIGHS.
- **Two pivot scales:**
  - **major:** ZigZag 3 × ATR, the same rule as our swing tables;
  - **minor:** a fractal pivot, 5 candles on each side.
- **A line through pivots P1 → P2 is drawn only if no candle between them closes beyond it.** It is born at P2's confirmation candle (ZigZag: the confirming bar; fractal: P2 + 5).
- **Candidate lines:** each new pivot P2 is paired with each of its previous 3 same-type pivots that pass the validity rule.
- **Slope classes:**
  - rising support and falling resistance = **trend lines**;
  - falling support and rising resistance = **channel / counter lines**.

## 3. Touch and outcome (identical for real and placebo lines)

- **Touch:** a candle comes within 0.25 ATR of the line, after price was ≥ 1 ATR away from the line since its birth or since the last touch.
- **RESPECTED:** price moves 1 ATR away from the line in the bounce direction before any candle closes 0.25 ATR beyond it.
- **BROKEN:** the reverse. If one candle does both, it counts as broken (conservative).
- **A line ends at its first break.** Touches are numbered: the 1st test is the first touch after the two anchors (the "3rd point"), then the 2nd test, and so on.

## 4. The control

- **Placebo lines:** every real line copied parallel at +0.75, −0.75, +1.5 and −1.5 ATR. Same slope, same time and same market, but not anchored to pivots.
- Placebo lines go through exactly the same touch and outcome rules.
- **A trendline is "respected" only by its LIFT:** real respect % minus placebo respect %, with:
  - a week-block bootstrap lower bound;
  - Holm correction across all cells.

## 5. Which trendline is respected most

- **Cells:** asset × TF × side (support / resistance) × slope class × pivot scale (major / minor) × test number (1st / 2nd+) × steepness (terciles of ATR per candle).
- **Ranking:** by lift lower bound. Cells with fewer than 30 touches are described only.

## 6. The last 3 years (does it match the ongoing price action?)

- **Split:** TRAIN 2020-10 → 2023-10, TEST 2023-10 → 2026-10 (the last 3 years).
- **A cell counts only if:** its lift is positive in BOTH halves, and the TEST lower bound is > 0.
- Also shown per year (stability) and per asset ("act the same?" with two-proportion tests and Holm).

## 7. The Extra tab in the app

- **Page:** new "Trendlines" page on the app's chart server (http://127.0.0.1:7444/trendlines), with a button from the main chart. It has an asset selector (XAU, Silver, DXY, WTI) and a timeframe selector (1W, 1D, 4H, 1H).
- **On the chart:**
  - candles;
  - active (unbroken) lines, bright;
  - past lines, faded;
  - every touch marked green (respected) or red (broken).
- **Next to the chart:** the measured lift vs placebo for each kind of line, with n, in the TRAIN and the last 3 years.
- **Source of the numbers:**
  - Every number comes from the study JSON.
  - Current active lines are computed by the same code from closed candles only.
  - Nothing on the page is a trade signal.

## 8. Decision needed: WTI history

Polygon has about 2 years of WTI. Options:

1. **WTI on its 2 years only (recommended).** Keeps the Polygon-only rule. WTI gets no 6-year view and no TRAIN/TEST split; it is described only.
2. **Use TradingView's CL1! history for WTI in this study.** That breaks the rule that results come from Polygon data, so it needs Ashraf's explicit OK.
3. **Use USO (oil ETF, Polygon, long history) as a 6-year proxy.** USO's roll costs and its 2020 restructuring make its chart differ from CL.

## 9. Honest limits

- **Few weekly candles:** 6 years of 1W is about 310 candles, so few lines. Weekly results will be thin, and we will say so.
- **Fixed rule, not taste:** a trendline drawn by eye is subjective. This study tests one fixed, pre-registered rule; other drawing rules could give other answers.
- **No trade rule:** none is proposed. A trade rule would need its own money test.
